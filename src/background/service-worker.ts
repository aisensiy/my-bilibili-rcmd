import type { Action, UserProfile } from '../extension/lib/storage'
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

  const recentActions: Action[] = (actions as Action[]).slice(0, 50)

  const prompt = `你是一个分析用户 Bilibili 观看行为的助手。根据以下行为数据，更新用户的兴趣画像。只返回严格的 JSON，不要有任何其他文字。

最近行为（最新 ${recentActions.length} 条）：
${JSON.stringify(recentActions, null, 2)}

当前画像（参考，可修改）：
${JSON.stringify(userProfile, null, 2)}

请分析用户的内容偏好，返回以下 JSON 格式：
{
  "interests": ["标签1", "标签2", ...],
  "disinterests": ["标签1", "标签2", ...],
  "blockedUps": ["UP主名1", ...],
  "analysis": "用中文简要描述用户的观看偏好和行为模式（2-3句话）"
}

注意：
- interests 是用户喜欢看的内容类型，从标题/行为推断（如"科技"、"编程"、"烹饪"等）
- disinterests 是用户明确不感兴趣的类型（来自 disinterested 行为，以及 blockTopic 行为——把用户主动屏蔽的热搜话题 phrase 归纳成具体的不感兴趣标签，便于关键词匹配）
- blockedUps 来自 blockUp 行为，直接取 upName
- 标签要具体，方便后续关键词匹配（比如"军事"而不是"严肃内容"）`

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
