// src/ui/fixtures/settings.ts
// Demo Settings for the multi-provider promo scene.
// activeProvider deliberately set to 'custom' so SettingsView renders the
// Base URL field — reinforces the "OpenAI 兼容自部署" pitch in the scene hero.
import type { Settings } from '../types'

export const demoSettings: Settings = {
  activeProvider: 'custom',
  providers: {
    openrouter: { apiKey: 'sk-or-demo-1234567890abcdef', model: 'openai/gpt-4o-mini' },
    glm: { apiKey: '', model: '' },
    deepseek: { apiKey: '', model: '' },
    custom: {
      apiKey: 'sk-lc-demo-abcdef1234567890',
      model: 'LongCat-Flash-Chat',
      baseUrl: 'https://api.longcat.chat/openai/v1',
    },
  },
  triggerThreshold: 5,
  debugMode: false,
  onboardingComplete: true,
}
