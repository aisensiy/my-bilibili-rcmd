import type { Action, PlayAction, UserProfile } from '../extension/lib/storage'
import { callProvider } from '../lib/providers'

// Intentionally a local copy — service worker shouldn't import extension-only modules.
// Keep `analysis` in sync with src/extension/lib/storage.ts:DEFAULT_PROFILE.
const DEFAULT_PROFILE: UserProfile = {
  interests: [],
  disinterests: [],
  disinterestKeywords: [],
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

  const { actions = [], userProfile = DEFAULT_PROFILE, settings } = await storageGet([
    'actions', 'userProfile', 'settings',
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

  const prompt = `你是一个分析用户 Bilibili 观看行为的助手。根据正负样本更新画像，并提取可用于"标题子串匹配"的具体屏蔽词。只返回严格的 JSON，不要任何其他文字。

【爱看】（完播率较高，代表用户真的喜欢，共 ${liked.length} 条）：
${JSON.stringify(liked, null, 2)}

【不想看】（用户点了"不感兴趣"/"不看TA"或主动屏蔽的话题，共 ${disliked.length} 条）：
${JSON.stringify(disliked, null, 2)}

当前画像（参考，用户可能手动改过，请尊重其编辑）：
${JSON.stringify(userProfile, null, 2)}

返回以下 JSON 格式：
{
  "interests": ["标签1", ...],
  "disinterests": ["概念标签1", ...],
  "blockedUps": ["UP主名1", ...],
  "disinterestKeywords": ["可匹配标题的具体词1", ...],
  "analysis": "用中文简要描述用户偏好和行为模式（2-3句话）"
}

注意：
- interests / disinterests 是给用户看的"画像镜子"：概念化的喜欢/不喜欢类型（如"科技"、"营销号内容"），不要求能匹配标题。
- blockedUps 来自"不看TA"行为，直接取 upName。
- disinterestKeywords 是真正用于过滤的词，要求"保守优先、宁漏不误"：
  - 只从【不想看】的标题里提取"字面上真实出现、且会在其他同类标题里复现"的具体词、标题党话术、或反复出现的 UP 名（如"速看"、"震惊"、"X分钟看完"、某个营销号名）。
  - 绝对不要输出会命中任何一条【爱看】标题的词（先用【爱看】做校验，会误伤就丢弃）。
  - 不要宽泛类别词（不要"游戏"、"科技"这种会误伤的大词）。
  - 最多 15 个；没有足够把握时宁可少给或给空数组。`

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
        disinterestKeywords: Array.isArray(parsed.disinterestKeywords) ? parsed.disinterestKeywords : [],
        blockedUps: Array.isArray(parsed.blockedUps) ? parsed.blockedUps : [],
        analysis: typeof parsed.analysis === 'string' ? parsed.analysis : '',
        lastUpdated: Date.now(),
      }
      await storageSet({ userProfile: newProfile, actionsSinceLastAnalysis: 0 })
      console.log('[BiliFilter] Profile updated:', newProfile)
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
