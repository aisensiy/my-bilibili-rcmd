import type { Action, PlayAction, UserProfile } from '../extension/lib/storage'
import { callProvider } from '../lib/providers'
import { buildAnalysisInput, renderAnalysisPrompt } from './analysis/prompt'

// Intentionally a local copy — service worker shouldn't import extension-only modules.
// Keep `analysis` in sync with src/extension/lib/storage.ts:DEFAULT_PROFILE.
const DEFAULT_PROFILE: UserProfile = {
  interests: [],
  disinterests: [],
  disinterestKeywords: [],
  dismissedKeywords: [],
  blockedUps: [],
  analysis: '尚未分析。',
  lastUpdated: 0,
}

// 分析进度状态。常驻在 SW 内存里——MV3 service worker 在 fetch 流式读取期间
// 不会被回收，所以即使弹窗关闭，分析也会继续跑到底；弹窗重开时通过
// query_analysis_state 把这个对象拉回来还原 UI。
export type AnalysisPhase = 'idle' | 'requesting' | 'reasoning' | 'streaming' | 'done' | 'error'

export interface AnalysisState {
  running: boolean
  startedAt: number
  phase: AnalysisPhase
  reasoningChars: number
  contentChars: number
  previewTail: string
  errorMessage?: string
}

let currentAnalysis: AnalysisState = {
  running: false,
  startedAt: 0,
  phase: 'idle',
  reasoningChars: 0,
  contentChars: 0,
  previewTail: '',
}

function broadcastProgress(): void {
  chrome.runtime.sendMessage({ type: 'profile_progress', state: currentAnalysis }).catch(() => {
    // Popup 没开，正常
  })
}

// 累积式合并：旧的生效词 ∪ 本轮候选 − 黑名单，去重，上限 50（超出丢最旧）。
const KEYWORD_CAP = 50
// 每轮最多并入 10 个新候选（代码层强制，不只靠 prompt）。
const MAX_NEW_CANDIDATES = 10
function mergeKeywords(active: string[], candidates: unknown, dismissed: string[]): string[] {
  const cand = (Array.isArray(candidates) ? candidates : []).slice(0, MAX_NEW_CANDIDATES)
  const deny = new Set(dismissed)
  const seen = new Set<string>()
  const out: string[] = []
  for (const kw of [...active, ...cand]) {
    if (typeof kw !== 'string') continue
    const v = kw.trim()
    if (!v || deny.has(v) || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out.length > KEYWORD_CAP ? out.slice(out.length - KEYWORD_CAP) : out
}

// 来源感知的候选过滤（确定性，不靠 LLM 自觉）。优先级：
//  - 出现在「不想看（主动屏蔽过）」标题里 → 留（最高置信，哪怕只一条、哪怕也看过）
//  - 命中你「看过的」标题（任意完播率、且非主动屏蔽）→ 丢（防误伤：看过 ≈ 不想被关键词自动藏掉）
//  - 只在「刷到过（被动曝光）」里出现 → 必须 ≥2 条不同标题复现，才算套路
const IMPRESSION_RECUR_MIN = 2
function filterCandidates(
  candidates: unknown,
  dislikedTitles: string[],
  impressionTitles: string[],
  watchedTitles: string[],
): string[] {
  const cand = Array.isArray(candidates) ? candidates : []
  const blocked = dislikedTitles.map(t => t.toLowerCase())
  const watched = watchedTitles.map(t => t.toLowerCase())
  const seen = impressionTitles.map(t => t.toLowerCase())
  const out: string[] = []
  for (const kw of cand) {
    if (typeof kw !== 'string') continue
    const low = kw.trim().toLowerCase()
    if (!low) continue
    if (blocked.some(t => t.includes(low))) { out.push(kw.trim()); continue }  // 主动屏蔽过 → 留
    if (watched.some(t => t.includes(low))) continue                            // 看过（非屏蔽）→ 丢，防误伤
    let hits = 0
    for (const t of seen) { if (t.includes(low)) hits++ }
    if (hits >= IMPRESSION_RECUR_MIN) out.push(kw.trim())                       // 曝光复现 ≥2 → 留
  }
  return out
}

// 自我清理：每次分析重新校验整列表。优先级同上：
//  - 主动屏蔽过的 → 留；命中「看过」的（非屏蔽）→ 剔除（误伤）；
//  - 否则只在仍命中「刷到过」时保留，都不命中则剔除（历史残留/已滚出窗口）。
function pruneGrounded(
  keywords: string[],
  dislikedTitles: string[],
  impressionTitles: string[],
  watchedTitles: string[],
): string[] {
  const blocked = dislikedTitles.map(t => t.toLowerCase())
  const watched = watchedTitles.map(t => t.toLowerCase())
  const seen = impressionTitles.map(t => t.toLowerCase())
  return keywords.filter(kw => {
    const low = kw.trim().toLowerCase()
    if (!low) return false
    if (blocked.some(t => t.includes(low))) return true    // 主动屏蔽过 → 留
    if (watched.some(t => t.includes(low))) return false   // 看过（非屏蔽）→ 剔除，防误伤
    return seen.some(t => t.includes(low))                 // 仍刷到 → 留，否则剔除
  })
}

function storageGet(keys: string[]): Promise<Record<string, any>> {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve))
}

function storageSet(data: Record<string, any>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(data, resolve))
}

async function buildProfile(): Promise<void> {
  // 防止并发触发：分析中再点也只会等当前的完成。
  if (currentAnalysis.running) {
    console.log('[BiliFilter] Analysis already running, skip')
    return
  }

  const { actions = [], userProfile = DEFAULT_PROFILE, settings, impressions = [] } = await storageGet([
    'actions', 'userProfile', 'settings', 'impressions',
  ])

  if (!settings || !settings.providers || !settings.activeProvider) {
    console.log('[BiliFilter] Settings not initialized, skipping analysis')
    return
  }

  const activeProvider = settings.activeProvider
  const providerCfg = settings.providers[activeProvider]
  if (!providerCfg?.apiKey) {
    console.log(`[BiliFilter] No API key for ${activeProvider}, skipping analysis`)
    return
  }
  if (!providerCfg?.model) {
    console.log(`[BiliFilter] No model id for ${activeProvider}, skipping analysis`)
    return
  }
  if (activeProvider === 'custom' && !providerCfg.baseUrl) {
    console.log('[BiliFilter] No base URL for custom provider, skipping analysis')
    return
  }

  const input = buildAnalysisInput(actions as Action[], userProfile, settings, impressions)
  const prompt = renderAnalysisPrompt(input)

  // 关键词流水线（LLM 之后、确定性过滤）所需的标题语料——本次重构范围外，逻辑不动。
  const recentActions = (actions as Action[]).slice(0, 50)
  const dislikedTitles = recentActions
    .map(a => a.type === 'disinterested' ? a.title : a.type === 'blockTopic' ? a.phrase : '')
    .filter((t): t is string => !!t)
  const impressionTitles = input.impressions.map(i => i.title).filter(Boolean)
  // 防误伤对照：你看过的所有标题（任意完播率，≥3s 才记录）——看过 ≈ 不想被关键词自动藏掉。
  const watchedTitles = (actions as Action[])
    .filter((a): a is PlayAction => a.type === 'play')
    .map(a => a.title)
    .filter((t): t is string => !!t)
  const activeKeywords = input.known.active
  const dismissedKeywords = input.known.dismissed

  console.log(`[BiliFilter] 分析输入：曝光样本 ${input.impressions.length} 条（采集${settings?.harvestImpressions === true ? '开' : '关'}）, 已生效屏蔽词 ${activeKeywords.length}, 黑名单 ${dismissedKeywords.length}`)

  currentAnalysis = {
    running: true,
    startedAt: Date.now(),
    phase: 'requesting',
    reasoningChars: 0,
    contentChars: 0,
    previewTail: '',
  }
  broadcastProgress()

  // 用 try/catch/finally 确保 running 一定会被重置——之前没兜底，一旦 callProvider
  // 内部 promise 走到 reject（onChunk 抛错、TextDecoder 异常等），running 就会卡在
  // true，后续点"立即重新分析"都被并发守卫静默 skip，呈现"profile 没变化"。
  let newProfile: UserProfile | null = null
  try {
    const result = await callProvider({
      provider: activeProvider,
      apiKey: providerCfg.apiKey,
      model: providerCfg.model,
      baseUrl: providerCfg.baseUrl,
      messages: [{ role: 'user', content: prompt }],
      responseFormat: 'json_object',
      temperature: 0.3,
      // 画像抽取任务不复杂，全推理太慢且耗 token；用 low 在速度和质量间取平衡。
      reasoning: 'low',
      stream: true,
      onChunk: ({ contentDelta, reasoningDelta, contentSoFar, reasoningSoFar }) => {
        if (contentDelta) {
          currentAnalysis.phase = 'streaming'
          currentAnalysis.contentChars = contentSoFar.length
          currentAnalysis.previewTail = contentSoFar.slice(-80)
        } else if (reasoningDelta) {
          currentAnalysis.phase = 'reasoning'
          currentAnalysis.reasoningChars = reasoningSoFar.length
          currentAnalysis.previewTail = reasoningSoFar.slice(-80)
        }
        broadcastProgress()
      },
    })

    if (!result.ok) {
      console.error('[BiliFilter] Provider error:', result.errorStatus, result.errorMessage)
      currentAnalysis.phase = 'error'
      currentAnalysis.errorMessage = result.errorMessage ?? `HTTP ${result.errorStatus ?? '???'}`
    } else {
      const parsed = JSON.parse(result.content)
      newProfile = {
        interests: Array.isArray(parsed.interests) ? parsed.interests : [],
        disinterests: Array.isArray(parsed.disinterests) ? parsed.disinterests : [],
        disinterestKeywords: pruneGrounded(
          mergeKeywords(
            activeKeywords,
            filterCandidates(parsed.disinterestKeywords, dislikedTitles, impressionTitles, watchedTitles),
            dismissedKeywords,
          ),
          dislikedTitles,
          impressionTitles,
          watchedTitles,
        ),
        // Carry forward user-curated dismissals from the stored profile — the LLM never owns these.
        dismissedKeywords: Array.isArray(userProfile.dismissedKeywords) ? userProfile.dismissedKeywords : [],
        blockedUps: Array.isArray(parsed.blockedUps) ? parsed.blockedUps : [],
        analysis: typeof parsed.analysis === 'string' ? parsed.analysis : '',
        lastUpdated: Date.now(),
      }
      await storageSet({ userProfile: newProfile, actionsSinceLastAnalysis: 0 })
      console.log('[BiliFilter] Profile updated:', newProfile)
      console.log(`[BiliFilter] 关键词：本轮候选 ${Array.isArray(parsed.disinterestKeywords) ? parsed.disinterestKeywords.length : 0} → 累积 ${newProfile.disinterestKeywords.length} 条`)
      currentAnalysis.phase = 'done'
    }
  } catch (e) {
    console.error('[BiliFilter] Analysis threw:', e)
    currentAnalysis.phase = 'error'
    currentAnalysis.errorMessage = e instanceof Error ? e.message : String(e)
    newProfile = null
  } finally {
    currentAnalysis.running = false
    broadcastProgress()
    if (newProfile) {
      chrome.runtime.sendMessage({ type: 'profile_updated', profile: newProfile }).catch(() => {
        // Popup may not be open
      })
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'analyze_profile') {
    // Fire-and-forget：popup 不需要等结果，进度通过 profile_progress 广播，
    // 完成通过 profile_updated 广播。即使弹窗关闭，分析继续跑到底。
    buildProfile().catch(err => console.error('[BiliFilter] buildProfile threw:', err))
    sendResponse({ ok: true, running: currentAnalysis.running })
    return false
  }

  if (message.type === 'query_analysis_state') {
    // 弹窗刚打开时拉一次，恢复"分析中"的进度 UI。
    sendResponse({ state: currentAnalysis })
    return false
  }

  if (message.type === 'check_trigger') {
    storageGet(['actionsSinceLastAnalysis', 'settings']).then(({ actionsSinceLastAnalysis = 0, settings = {} }) => {
      const threshold = settings.triggerThreshold ?? 5
      if (actionsSinceLastAnalysis >= threshold) {
        buildProfile()
      }
      sendResponse({ ok: true })
    })
    return true
  }

})

chrome.runtime.onInstalled.addListener(() => {
  console.log('[BiliFilter] Extension installed')
})
