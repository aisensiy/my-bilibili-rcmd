import type { Action, PlayAction, UserProfile } from '../extension/lib/storage'
import { callProvider } from '../lib/providers'

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

  const recentActions = (actions as Action[]).slice(0, 50)

  // 正样本：完播率高的 play，代表"真的爱看"。喂给 LLM 做校验，避免提词误伤爱看内容。
  const liked = recentActions
    .filter((a): a is PlayAction => a.type === 'play')
    .filter(a => a.watchRatio > 0.5)
    .slice(0, 30)
    .map(a => ({ title: a.title, upName: a.upName, watchRatio: a.watchRatio }))

  // 负样本：明确的"不想看"信号。只发匹配相关的精简字段。
  const disliked = recentActions
    .filter(a => a.type === 'disinterested' || a.type === 'blockUp' || a.type === 'blockTopic')
    .map(a => {
      if (a.type === 'blockTopic') return { phrase: a.phrase }
      if (a.type === 'blockUp') return { upName: a.upName }
      return { title: a.title, upName: a.upName }
    })

  // 曝光窗口：仅开关开时使用；已是去重、最新在前、上限 150 的滑动窗口。
  const harvestOn = settings?.harvestImpressions === true
  const impressionWindow = harvestOn && Array.isArray(impressions)
    ? (impressions as { title: string; upName: string }[])
        .slice(0, 500)
        .map(i => ({ title: i.title, upName: i.upName }))
    : []
  const impressionSection = impressionWindow.length > 0
    ? `\n【刷到的（推荐流采样，未必看过/屏蔽过，共 ${impressionWindow.length} 条）】：\n${JSON.stringify(impressionWindow, null, 2)}\n`
    : ''

  // 累积式输出所需上下文
  const activeKeywords = Array.isArray(userProfile.disinterestKeywords) ? userProfile.disinterestKeywords : []
  const dismissedKeywords = Array.isArray(userProfile.dismissedKeywords) ? userProfile.dismissedKeywords : []

  // 候选过滤所需的标题语料：主动屏蔽过的、被动刷到的、爱看的
  const dislikedTitles = (recentActions as Action[])
    .map(a => a.type === 'disinterested' ? a.title : a.type === 'blockTopic' ? a.phrase : '')
    .filter((t): t is string => !!t)
  const impressionTitles = impressionWindow.map(i => i.title).filter(Boolean)
  // 防误伤对照：你看过的所有标题（任意完播率，≥3s 才记录）——看过 ≈ 不想被关键词自动藏掉。
  const watchedTitles = (actions as Action[])
    .filter((a): a is PlayAction => a.type === 'play')
    .map(a => a.title)
    .filter((t): t is string => !!t)

  console.log(`[BiliFilter] 分析输入：曝光样本 ${impressionWindow.length} 条（采集${harvestOn ? '开' : '关'}）, 已生效屏蔽词 ${activeKeywords.length}, 黑名单 ${dismissedKeywords.length}`)

  const prompt = `你是一个分析用户 Bilibili 观看行为的助手。根据正负样本更新画像，并从中提取"本轮新发现"的、可用于"标题子串匹配"的具体屏蔽词。只返回严格的 JSON，不要任何其他文字。

【爱看】（完播率较高，代表用户真的喜欢，共 ${liked.length} 条）：
${JSON.stringify(liked, null, 2)}

【不想看】（用户点了"不感兴趣"/"不看TA"或主动屏蔽的话题，共 ${disliked.length} 条）：
${JSON.stringify(disliked, null, 2)}
${impressionSection}
当前画像（参考，用户可能手动改过，请尊重其编辑）：
${JSON.stringify(userProfile, null, 2)}

已生效的屏蔽词（已经在拦了，不要重复输出）：
${JSON.stringify(activeKeywords, null, 2)}

用户删过的词（黑名单，绝对不要再输出）：
${JSON.stringify(dismissedKeywords, null, 2)}

返回以下 JSON 格式：
{
  "interests": ["标签1", ...],
  "disinterests": ["概念标签1", ...],
  "blockedUps": ["UP主名1", ...],
  "disinterestKeywords": ["本轮新发现的候选词1", ...],
  "analysis": "用中文简要描述用户偏好和行为模式（2-3句话）"
}

注意：
- interests / disinterests 是给用户看的"画像镜子"：概念化的喜欢/不喜欢类型（如"科技"、"营销号内容"），不要求能匹配标题。
- blockedUps 来自"不看TA"行为，直接取 upName。
- disinterestKeywords 这次只输出"本轮新发现的候选词"（最多 10 个）。硬性规则：
  - 必须字面溯源：每个词都得是【不想看】或【刷到的】标题里"确实出现过的连续字面片段"。没在这两组真实标题里出现过的词，一律不要输出——哪怕它看起来像很典型的套路词。（这条是为了避免凭印象编出用户根本没刷到的词。）
  - 可泛化优先：在"确实出现过"的前提下，挑那些"换一条同类新视频、还很可能出现在标题里"的词（通用标题党/营销话术、反复出现的固定人设或桥段说法）；只命中单条视频的一次性专名（具体人名、事件名、独一无二的事物名）不要。
  - 不重复 / 不误伤：不要输出"已生效的屏蔽词"和"黑名单"里的词；绝对不要输出会命中任何一条【爱看】标题的词（先用【爱看】做校验）；不要"游戏""科技"这种宽泛大词。没把握就给空数组。
  - 不要通用网络流行语/弹幕梗/口头禅（如"破防""难绷""逆天""yyds""完蛋了""我愿称之为""绝绝子"这类）——它们在喜欢和不喜欢的内容里都出现，会误伤；只要与"垃圾/营销/标题党/短剧"内容强绑定的词。
  - 来自【刷到的】的词，优先选"在多条不同标题里反复出现"的（出现越多越可能是套路）；只在单条标题里出现的曝光片段不要（除非它来自【不想看】）。`

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
