// src/ui/types.ts
// Pure types shared between extension/ and promo/.
// NO side-effect imports here — no chrome.*, no storage, no fetch.

import type { ProviderId } from '@/lib/providers'

export type { ProviderId, ProviderSpec } from '@/lib/providers'

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

export interface BlockTopicAction {
  type: 'blockTopic'
  phrase: string
  timestamp: number
}

export type Action = PlayAction | DisinterestedAction | BlockUpAction | BlockTopicAction

export interface UserProfile {
  interests: string[]
  disinterests: string[]
  disinterestKeywords: string[]
  dismissedKeywords: string[]
  blockedUps: string[]
  analysis: string
  lastUpdated: number
}

export interface Stats {
  totalActions: number
  playCount: number
  blockedCount: number
  avgWatchRatio: number
}

export interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

export interface Settings {
  activeProvider: ProviderId
  providers: {
    openrouter: ProviderConfig
    glm: ProviderConfig
    deepseek: ProviderConfig
    custom: ProviderConfig
  }
  triggerThreshold: number
  debugMode: boolean
  harvestImpressions: boolean
  onboardingComplete: boolean
}

export interface ImpressionRecord {
  bvid: string
  title: string
  upName: string
}

export interface StorageData {
  actions: Action[]
  userProfile: UserProfile
  blockedKeywords: string[]
  settings: Settings
  actionsSinceLastAnalysis: number
  impressions: ImpressionRecord[]
}

export const DEFAULT_PROFILE: UserProfile = {
  interests: [],
  disinterests: [],
  disinterestKeywords: [],
  dismissedKeywords: [],
  blockedUps: [],
  analysis: '尚未分析。',
  lastUpdated: 0,
}

// AnalysisState mirrors the type currently defined inline in
// src/extension/components/ProfileTab.tsx so the future ProfileView can accept it.
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
