import { useState } from 'react'
import { storage, type Settings } from '../lib/storage'
import { PROVIDERS, type ProviderId } from '../../lib/providers'

const PROVIDER_IDS: ProviderId[] = ['openrouter', 'glm', 'deepseek']

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [provider, setProvider] = useState<ProviderId>('openrouter')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')

  const spec = PROVIDERS[provider]

  const switchProvider = (next: ProviderId) => {
    setProvider(next)
    setApiKey('')
    setModel('')
  }

  const canFinishConfigured = apiKey.trim().length > 0 && model.trim().length > 0

  const finish = async (withConfig: boolean) => {
    const existing = await storage.getSettings()
    const next: Settings = withConfig
      ? {
          ...existing,
          activeProvider: provider,
          providers: {
            ...existing.providers,
            [provider]: { apiKey: apiKey.trim(), model: model.trim() },
          },
          onboardingComplete: true,
        }
      : { ...existing, onboardingComplete: true }
    await storage.setSettings(next)
    onDone()
  }

  return (
    <div className="h-full flex flex-col text-gray-700">
      <div className="flex-1 overflow-y-auto p-4 pb-2">
      {/* Hero */}
      <div className="mb-5">
        <div className="text-lg font-bold mb-1">欢迎用「我的 Bilibili 推荐」</div>
        <p className="text-xs text-gray-500 leading-relaxed">
          让 LLM 看你的 B 站观看行为，生成你的兴趣画像，自动过滤你不想看的推荐内容。
        </p>
      </div>

      {/* 隐私 */}
      <div className="mb-5 bg-gray-50 rounded-lg p-3">
        <div className="text-xs font-semibold text-gray-700 mb-1">🔒 隐私承诺</div>
        <ul className="text-[11px] text-gray-600 space-y-0.5 leading-relaxed">
          <li>• 观看记录、画像、设置全部只存在浏览器本地</li>
          <li>• 分析时只把最近 50 条行为摘要发给你选的 AI 提供商</li>
          <li>• 用你自己的 API Key；卸载扩展即彻底清除数据</li>
        </ul>
      </div>

      {/* Provider 选择 */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          选一个 AI 提供商
        </label>
        <div className="flex gap-1.5 mb-2">
          {PROVIDER_IDS.map(pid => (
            <button
              key={pid}
              onClick={() => switchProvider(pid)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                provider === pid
                  ? 'border-[#fb7299] text-[#fb7299] bg-[#fff5f8]'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {PROVIDERS[pid].label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400">{spec.blurb}</p>
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {spec.label} API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="填入你的 API Key"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#fb7299] font-mono"
        />
        <a href={spec.keyUrl} target="_blank" rel="noreferrer"
          className="text-[10px] text-[#00a1d6] mt-1 inline-block">去 {spec.label} 拿 Key →</a>
      </div>

      {/* 模型 */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          分析模型
        </label>
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={spec.modelPlaceholder}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#fb7299] font-mono"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          手输 model id。可用清单见 {spec.label} 官方文档；填完后到设置 tab 可"测试 API 连接"验证。
        </p>
      </div>

      {/* 慢热身说明 */}
      <div className="mb-5 bg-[#fff5f8] rounded-lg p-3">
        <div className="text-xs font-semibold text-gray-700 mb-1">⏳ 慢热身</div>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          填完 Key 和模型后去 B 站正常看视频。攒够 5 个视频，AI 就会自动生成你的画像。
          也可以在画像 tab 手动点"立即分析"。
        </p>
      </div>

      </div>

      {/* 固定底部操作栏，跟 SettingsTab / ProfileTab 一致——常驻可见，
          内容长时不必滚到底也能开始使用。 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <button
          onClick={() => finish(canFinishConfigured)}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all"
          style={{ background: '#fb7299' }}
        >
          {canFinishConfigured ? '开始使用' : '跳过，稍后在设置里填'}
        </button>
        {!canFinishConfigured && (
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            需要填 Key 和模型，AI 才会工作
          </p>
        )}
      </div>
    </div>
  )
}
