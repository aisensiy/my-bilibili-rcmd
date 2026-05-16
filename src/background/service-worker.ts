import type { Action, UserProfile } from '../popup/lib/storage'
import { callProvider } from '../lib/providers'

// Intentionally a local copy — service worker shouldn't import popup-only modules.
// Keep `analysis` in sync with src/popup/lib/storage.ts:DEFAULT_PROFILE.
const DEFAULT_PROFILE: UserProfile = {
  interests: [],
  disinterests: [],
  blockedUps: [],
  analysis: '尚未分析。',
  lastUpdated: 0,
}

function storageGet(keys: string[]): Promise<Record<string, any>> {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve))
}

function storageSet(data: Record<string, any>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(data, resolve))
}

async function buildProfile(): Promise<void> {
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
- disinterests 是用户明确不感兴趣的类型（来自 disinterested 行为）
- blockedUps 来自 blockUp 行为，直接取 upName
- 标签要具体，方便后续关键词匹配（比如"军事"而不是"严肃内容"）`

  const result = await callProvider({
    provider: activeProvider,
    apiKey: providerCfg.apiKey,
    model: providerCfg.model,
    messages: [{ role: 'user', content: prompt }],
    responseFormat: 'json_object',
    temperature: 0.3,
  })

  if (!result.ok) {
    console.error('[BiliFilter] Provider error:', result.errorStatus, result.errorMessage)
    return
  }

  try {
    const parsed = JSON.parse(result.content)
    const newProfile: UserProfile = {
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
      disinterests: Array.isArray(parsed.disinterests) ? parsed.disinterests : [],
      blockedUps: Array.isArray(parsed.blockedUps) ? parsed.blockedUps : [],
      analysis: typeof parsed.analysis === 'string' ? parsed.analysis : '',
      lastUpdated: Date.now(),
    }
    await storageSet({ userProfile: newProfile, actionsSinceLastAnalysis: 0 })
    console.log('[BiliFilter] Profile updated:', newProfile)

    try {
      chrome.runtime.sendMessage({ type: 'profile_updated', profile: newProfile })
    } catch {
      // Popup may not be open
    }
  } catch (e) {
    console.error('[BiliFilter] Failed to parse profile response:', e)
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'analyze_profile') {
    buildProfile().then(() => sendResponse({ ok: true })).catch(err => {
      console.error(err)
      sendResponse({ ok: false, error: String(err) })
    })
    return true
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
