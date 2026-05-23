// src/ui/OnboardingView.tsx
import type { ProviderId, ProviderSpec } from './types'

interface OnboardingViewProps {
  providers: Record<ProviderId, ProviderSpec>
  providerIds: ProviderId[]
  provider: ProviderId
  apiKey: string
  model: string
  baseUrl: string
  canFinishConfigured: boolean
  onProviderChange?: (p: ProviderId) => void
  onApiKeyChange?: (k: string) => void
  onModelChange?: (m: string) => void
  onBaseUrlChange?: (b: string) => void
  onFinish?: () => void
}

export default function OnboardingView({
  providers,
  providerIds,
  provider,
  apiKey,
  model,
  baseUrl,
  canFinishConfigured,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onBaseUrlChange,
  onFinish,
}: OnboardingViewProps) {
  const spec = providers[provider]
  const readonly = !onProviderChange

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
            {providerIds.map(pid => (
              <button
                key={pid}
                onClick={() => onProviderChange?.(pid)}
                disabled={readonly}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  provider === pid
                    ? 'border-bili-pink text-bili-pink bg-[#fff5f8]'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {providers[pid].label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">{spec.blurb}</p>
        </div>

        {/* Base URL (仅 custom) */}
        {provider === 'custom' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => onBaseUrlChange?.(e.target.value)}
              disabled={readonly}
              placeholder={spec.baseUrlPlaceholder}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-bili-pink font-mono"
            />
          </div>
        )}

        {/* API Key */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {spec.label} API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => onApiKeyChange?.(e.target.value)}
            disabled={readonly}
            placeholder="填入你的 API Key"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-bili-pink font-mono"
          />
          <a href={spec.keyUrl} target="_blank" rel="noreferrer"
            className="text-[10px] text-bili-blue mt-1 inline-block">
            {provider === 'custom' ? '没 Key？去 longcat 申请 →' : `去 ${spec.label} 拿 Key →`}
          </a>
        </div>

        {/* 模型 */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            分析模型
          </label>
          <input
            type="text"
            value={model}
            onChange={e => onModelChange?.(e.target.value)}
            disabled={readonly}
            placeholder={spec.modelPlaceholder}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-bili-pink font-mono"
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

      {/* 固定底部操作栏 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <button
          onClick={onFinish}
          disabled={readonly}
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
