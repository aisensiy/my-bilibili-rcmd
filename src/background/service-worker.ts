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

// 护栏只认「看够 15 秒」的播放才算「看过」（按绝对秒数，不按完播率——短视频看完也就十几秒，
// 长视频划走 5 秒不算数）。一次快速划走（如 5 秒）不再保护该词，避免「随手点开又退」反而护住垃圾词。
const WATCHED_PROTECT_MIN_SECONDS = 15

// 实际观看秒数：优先用记录的 watchedSeconds；老记录没有就用 完播率×时长 估算；都没有按 0。
function effectiveWatchedSeconds(a: PlayAction): number {
  return a.watchedSeconds ?? Math.round((a.watchRatio ?? 0) * (a.durationSeconds ?? 0))
}

// 结构性「炸裂半径」护栏：跟具体词无关，不写死任何词，只拦「短到/宽到屏了必然大面积误伤」的。
// 它只会否决候选，永不因「频率」去屏蔽——与「刷到多≠讨厌」不冲突。
const MIN_KEYWORD_LEN = 2        // 1 个字的词匹配面过大，一律不作屏蔽词
const BROAD_MATCH_RATIO = 0.15   // 命中曝光流标题超过此比例 → 太宽泛，屏了大面积误伤
const MIN_CORPUS_FOR_BROAD = 20  // 曝光样本太少时不做宽度判断（统计无意义）
function tooBroadOrShort(low: string, impressionsLower: string[]): boolean {
  if (low.length < MIN_KEYWORD_LEN) return true
  if (impressionsLower.length >= MIN_CORPUS_FOR_BROAD) {
    let hits = 0
    for (const t of impressionsLower) if (t.includes(low)) hits++
    if (hits / impressionsLower.length > BROAD_MATCH_RATIO) return true
  }
  return false
}

// 关键词有效性护栏（确定性，不靠 LLM 自觉）。普适原则，不写死任何「垃圾词」：
//   一个词成立 ⟺ 出现在你「不喜欢」的一侧、且不出现在你「喜欢」的一侧，且不过短/过宽。
//   - 结构护栏：太短或命中面过大的词直接丢（跟口味无关，屏了对谁都是灾难）；
//   - 字面溯源：必须在你主动屏蔽过的标题/话题、或你刷到过的标题里真实出现（防 LLM 造词）；
//   - 命中你看过的任何标题 → 丢（核心护栏：看过 ≈ 喜欢/不想被自动藏。按各人数据自动分流——
//     爱看剪辑的人「剪映」会被这条放行掉，讨厌的人才留得下；不预设任何人的口味）。
// 不靠频率——「刷到得多」不等于「讨厌」。生成（filterCandidates）与自清（pruneGrounded）共用这一条，
// 两者永不漂移。
function makeKeywordGuard(
  dislikedTitles: string[],
  impressionTitles: string[],
  watchedTitles: string[],
): (kw: string) => boolean {
  const impressions = impressionTitles.map(t => t.toLowerCase())
  const grounded = [...dislikedTitles.map(t => t.toLowerCase()), ...impressions]
  const watched = watchedTitles.map(t => t.toLowerCase())
  return (kw: string): boolean => {
    const low = kw.trim().toLowerCase()
    if (!low) return false
    if (tooBroadOrShort(low, impressions)) return false     // 结构护栏：太短/太宽
    if (!grounded.some(t => t.includes(low))) return false  // 没在任何真实标题里出现过 → 防造词
    return !watched.some(t => t.includes(low))              // 命中你看过的 → 防误伤
  }
}

// 本轮 LLM 候选词过滤（输出 trim 后的词）。
function filterCandidates(
  candidates: unknown,
  dislikedTitles: string[],
  impressionTitles: string[],
  watchedTitles: string[],
): string[] {
  const keep = makeKeywordGuard(dislikedTitles, impressionTitles, watchedTitles)
  const cand = Array.isArray(candidates) ? candidates : []
  const out: string[] = []
  for (const kw of cand) {
    if (typeof kw === 'string' && keep(kw)) out.push(kw.trim())
  }
  return out
}

// 自我清理：每轮按同一条护栏重校验整列表，剔除不再成立的词（内容已滚出窗口、或现在才发现命中你看过的）。
function pruneGrounded(
  keywords: string[],
  dislikedTitles: string[],
  impressionTitles: string[],
  watchedTitles: string[],
): string[] {
  return keywords.filter(makeKeywordGuard(dislikedTitles, impressionTitles, watchedTitles))
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

  // 关键词流水线（LLM 之后、确定性护栏）所需的标题语料。
  // 字面溯源语料：你主动屏蔽过的标题/话题 + 你刷到过的标题——候选词必须在这里真实出现。
  const recentActions = (actions as Action[]).slice(0, 50)
  const dislikedTitles = recentActions
    .map(a => a.type === 'disinterested' ? a.title : a.type === 'blockTopic' ? a.phrase : '')
    .filter((t): t is string => !!t)
  const impressionTitles = input.impressions.map(i => i.title).filter(Boolean)
  // 防误伤对照：你「真看了」（≥15s）的标题——看过 ≈ 不想被关键词自动藏掉。
  const watchedTitles = (actions as Action[])
    .filter((a): a is PlayAction => a.type === 'play')
    .filter(a => effectiveWatchedSeconds(a) >= WATCHED_PROTECT_MIN_SECONDS)
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
