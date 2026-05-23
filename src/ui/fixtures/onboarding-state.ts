// src/ui/fixtures/onboarding-state.ts
// Demo onboarding form state. Not used by the first promo;
// reserved for the future onboarding teaching video / introduction page.
import type { ProviderId } from '../types'

export interface OnboardingDemoState {
  provider: ProviderId
  apiKey: string
  model: string
  baseUrl: string
  canFinishConfigured: boolean
}

export const demoOnboardingFilled: OnboardingDemoState = {
  provider: 'openrouter',
  apiKey: 'sk-or-demo-•••••••',
  model: 'openai/gpt-4o-mini',
  baseUrl: '',
  canFinishConfigured: true,
}

export const demoOnboardingEmpty: OnboardingDemoState = {
  provider: 'openrouter',
  apiKey: '',
  model: '',
  baseUrl: '',
  canFinishConfigured: false,
}
