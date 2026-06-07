// Storage implementation + defaults. Type definitions moved to @/ui/types so the
// extension UI layer and the promo subapp can share them. The runtime `storage`
// object and DEFAULT_SETTINGS stay here because they touch chrome.storage.
import type {
  Action,
  PlayAction,
  Stats,
  StorageData,
  UserProfile,
  Settings,
} from '@/ui/types'
import { DEFAULT_PROFILE } from '@/ui/types'

// Re-export types so existing relative imports (`from '../lib/storage'`) inside
// extension/ keep working. Source-level callers don't need to know the types
// physically live in ui/types.ts.
export type {
  Action,
  PlayAction,
  DisinterestedAction,
  BlockUpAction,
  BlockTopicAction,
  UserProfile,
  Stats,
  ProviderConfig,
  Settings,
  StorageData,
} from '@/ui/types'

export { DEFAULT_PROFILE } from '@/ui/types'

export const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'openrouter',
  providers: {
    openrouter: { apiKey: '', model: '' },
    glm: { apiKey: '', model: '' },
    deepseek: { apiKey: '', model: '' },
    custom: { apiKey: '', model: '', baseUrl: '' },
  },
  triggerThreshold: 5,
  debugMode: false,
  onboardingComplete: false,
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
    const { userProfile } = await get(['userProfile'])
    // Spread DEFAULT_PROFILE so a profile stored before a field existed (e.g.
    // disinterestKeywords) gets the missing key filled in. A destructuring default
    // only fires when the key is wholly absent, not when the object lacks a field.
    return { ...DEFAULT_PROFILE, ...userProfile }
  },

  async setProfile(profile: UserProfile): Promise<void> {
    await set({ userProfile: profile, actionsSinceLastAnalysis: 0 })
  },

  async getSettings(): Promise<Settings> {
    const { settings } = await get(['settings'])
    if (!settings) return DEFAULT_SETTINGS

    // Detect legacy schema (had openrouterKey at the top level) → migrate.
    const legacy = settings as unknown as Record<string, unknown>
    if (!('providers' in legacy)) {
      const migrated: Settings = {
        ...DEFAULT_SETTINGS,
        activeProvider: 'openrouter',
        providers: {
          openrouter: {
            apiKey: typeof legacy.openrouterKey === 'string' ? legacy.openrouterKey : '',
            model: typeof legacy.model === 'string' ? legacy.model : '',
          },
          glm: { apiKey: '', model: '' },
          deepseek: { apiKey: '', model: '' },
          custom: { apiKey: '', model: '', baseUrl: '' },
        },
        triggerThreshold: typeof legacy.triggerThreshold === 'number' ? legacy.triggerThreshold : 5,
        debugMode: typeof legacy.debugMode === 'boolean' ? legacy.debugMode : false,
        onboardingComplete: true,  // legacy users already know what this is, don't re-onboard
      }
      await set({ settings: migrated })
      return migrated
    }

    // New schema: fill missing fields from defaults.
    return {
      ...DEFAULT_SETTINGS,
      ...(settings as Settings),
      providers: {
        ...DEFAULT_SETTINGS.providers,
        ...((settings as Settings).providers ?? {}),
      },
    }
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

  async getActionsSinceLastAnalysis(): Promise<number> {
    const { actionsSinceLastAnalysis = 0 } = await get(['actionsSinceLastAnalysis'])
    return actionsSinceLastAnalysis
  },

  async getStats(): Promise<Stats> {
    const actions = await this.getActions()
    const plays = actions.filter((a): a is PlayAction => a.type === 'play')
    const blocked = actions.filter(a => a.type === 'disinterested' || a.type === 'blockUp' || a.type === 'blockTopic')
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
