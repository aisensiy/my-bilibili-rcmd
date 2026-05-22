// src/extension/components/OnboardingScreen.tsx
import { useState } from 'react'
import { storage, type Settings } from '../lib/storage'
import { PROVIDERS, type ProviderId, ensureCustomHostPermission } from '../../lib/providers'
import OnboardingView from '@/ui/OnboardingView'

const PROVIDER_IDS: ProviderId[] = ['openrouter', 'glm', 'deepseek', 'custom']

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [provider, setProvider] = useState<ProviderId>('openrouter')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')

  // 切 provider 时清空 Key/model/baseUrl，避免上一家的值串进新家
  const switchProvider = (next: ProviderId) => {
    setProvider(next)
    setApiKey('')
    setModel('')
    setBaseUrl('')
  }

  const canFinishConfigured =
    apiKey.trim().length > 0
    && model.trim().length > 0
    && (provider !== 'custom' || baseUrl.trim().length > 0)

  const finish = async () => {
    const withConfig = canFinishConfigured
    // custom provider 需要先抢用户手势上下文请求 host_permission，否则 fetch 会被
    // MV3 拦截。await storage.getSettings 之前必须先发起 permissions.request，
    // 否则用户手势会被 await 吃掉，弹框会被 Chrome 拒绝。
    if (withConfig && provider === 'custom') {
      const perm = await ensureCustomHostPermission(baseUrl)
      if (!perm.ok) {
        alert(perm.reason === 'bad-url'
          ? 'Base URL 格式不正确'
          : '需要授予该域名访问权限才能使用 custom provider')
        return
      }
    }
    const existing = await storage.getSettings()
    const next: Settings = withConfig
      ? {
          ...existing,
          activeProvider: provider,
          providers: {
            ...existing.providers,
            [provider]: provider === 'custom'
              ? { apiKey: apiKey.trim(), model: model.trim(), baseUrl: baseUrl.trim() }
              : { apiKey: apiKey.trim(), model: model.trim() },
          },
          onboardingComplete: true,
        }
      : { ...existing, onboardingComplete: true }
    await storage.setSettings(next)
    onDone()
  }

  return (
    <OnboardingView
      providers={PROVIDERS}
      providerIds={PROVIDER_IDS}
      provider={provider}
      apiKey={apiKey}
      model={model}
      baseUrl={baseUrl}
      canFinishConfigured={canFinishConfigured}
      onProviderChange={switchProvider}
      onApiKeyChange={setApiKey}
      onModelChange={setModel}
      onBaseUrlChange={setBaseUrl}
      onFinish={finish}
    />
  )
}
