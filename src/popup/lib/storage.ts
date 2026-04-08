// Shared types and storage utilities

export interface PlayAction {
  type: 'play'
  bvid: string
  title: string
  upName: string
  uid?: string
  watchRatio: number // 0-1
  watchedSeconds?: number
  durationSeconds?: number
  timestamp: number
  sessionId?: string
}

export interface DisinterestedAction {
  type: 'disinterested'
  bvid: string
  title: string
  upName: string
  timestamp: number
}

export interface BlockUpAction {
  type: 'blockUp'
  upName: string
  uid?: string
  timestamp: number
}

export type Action = PlayAction | DisinterestedAction | BlockUpAction

export interface UserProfile {
  interests: string[]
  disinterests: string[]
  blockedUps: string[]
  analysis: string
  lastUpdated: number
}

export interface Settings {
  openrouterKey: string
  model: string
  triggerThreshold: number
  debugMode: boolean
}

export interface StorageData {
  actions: Action[]
  userProfile: UserProfile
  blockedKeywords: string[]
  settings: Settings
  actionsSinceLastAnalysis: number
}

export const DEFAULT_PROFILE: UserProfile = {
  interests: [],
  disinterests: [],
  blockedUps: [],
  analysis: '尚未分析。请在设置中填入 OpenRouter API Key，然后点击「立即分析」。',
  lastUpdated: 0,
}

export const DEFAULT_SETTINGS: Settings = {
  openrouterKey: '',
  model: 'google/gemini-2.0-flash-exp:free',
  triggerThreshold: 10,
  debugMode: false,
}

function get<K extends keyof StorageData>(keys: K[]): Promise<Pick<StorageData, K>> {
  return new Promise(resolve => chrome.storage.local.get(keys as string[], resolve as any))
}

function set(data: Partial<StorageData>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(data, resolve))
}

export const storage = {
  async getActions(): Promise<Action[]> {
    const { actions = [] } = await get(['actions'])
    return actions
  },

  async addAction(action: Action): Promise<number> {
    const { actions = [], actionsSinceLastAnalysis = 0 } = await get(['actions', 'actionsSinceLastAnalysis'])
    actions.unshift(action)
    if (actions.length > 500) actions.length = 500
    const newCount = actionsSinceLastAnalysis + 1
    await set({ actions, actionsSinceLastAnalysis: newCount })
    return newCount
  },

  async getProfile(): Promise<UserProfile> {
    const { userProfile = DEFAULT_PROFILE } = await get(['userProfile'])
    return userProfile
  },

  async setProfile(profile: UserProfile): Promise<void> {
    await set({ userProfile: profile, actionsSinceLastAnalysis: 0 })
  },

  async getSettings(): Promise<Settings> {
    const { settings = DEFAULT_SETTINGS } = await get(['settings'])
    return { ...DEFAULT_SETTINGS, ...settings }
  },

  async setSettings(settings: Settings): Promise<void> {
    await set({ settings })
  },

  async getBlockedKeywords(): Promise<string[]> {
    const { blockedKeywords = [] } = await get(['blockedKeywords'])
    return blockedKeywords
  },

  async setBlockedKeywords(keywords: string[]): Promise<void> {
    await set({ blockedKeywords: keywords })
  },

  async getFilterData(): Promise<{ profile: UserProfile; keywords: string[] }> {
    const { userProfile = DEFAULT_PROFILE, blockedKeywords = [] } = await get(['userProfile', 'blockedKeywords'])
    return { profile: userProfile, keywords: blockedKeywords }
  },

  async getActionsSinceLastAnalysis(): Promise<number> {
    const { actionsSinceLastAnalysis = 0 } = await get(['actionsSinceLastAnalysis'])
    return actionsSinceLastAnalysis
  },

  async getStats(): Promise<{ totalActions: number; playCount: number; blockedCount: number; avgWatchRatio: number }> {
    const actions = await this.getActions()
    const plays = actions.filter((a): a is PlayAction => a.type === 'play')
    const blocked = actions.filter(a => a.type === 'disinterested' || a.type === 'blockUp')
    const avgWatchRatio = plays.length > 0
      ? plays.reduce((sum, p) => sum + p.watchRatio, 0) / plays.length
      : 0
    return {
      totalActions: actions.length,
      playCount: plays.length,
      blockedCount: blocked.length,
      avgWatchRatio,
    }
  },
}
