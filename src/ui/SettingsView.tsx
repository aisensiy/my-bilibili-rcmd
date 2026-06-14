// src/ui/SettingsView.tsx
import { useState } from 'react'
import type { ProviderId, ProviderSpec, Settings } from './types'

export interface SettingsViewProps {
  // pure data
  providers: Record<ProviderId, ProviderSpec>
  providerIds: ProviderId[]
  settings: Settings
  /** dirty = current settings differ from last saved snapshot (computed in container) */
  isDirty: boolean
  /** transient "✓ 已保存" pulse after a successful save (container manages timer) */
  savedFlash: boolean
  /** Whether the popup is rendered in a full tab (vs Chrome popup). Drives the
   *  "粘贴 URL/Key 时弹窗会关闭" banner — hidden in tab mode. */
  isInTab: boolean
  /** Test-connection state. Container manages the async flow + status transitions. */
  testStatus: 'idle' | 'testing' | 'ok' | 'fail'
  testMsg: string

  // optional callbacks — when missing, controls are disabled (per ui/ discipline)
  onSwitchProvider?: (id: ProviderId) => void
  onUpdateProviderCfg?: (patch: { apiKey?: string; model?: string; baseUrl?: string }) => void
  onUpdateThreshold?: (n: number) => void
  onToggleDebug?: () => void
  onToggleHarvest?: () => void
  onTestConnection?: () => void
  onSave?: () => void
  onOpenInTab?: () => void
  onReopenOnboarding?: () => void
  onClearAll?: () => void
  /** AboutSection slot — extension passes its own AboutSection component;
   *  promo can pass null. Keeps SettingsView free of extension-specific imports. */
  aboutSlot?: React.ReactNode
}

export default function SettingsView({
  providers,
  providerIds,
  settings,
  isDirty,
  savedFlash,
  isInTab,
  testStatus,
  testMsg,
  onSwitchProvider,
  onUpdateProviderCfg,
  onUpdateThreshold,
  onToggleDebug,
  onToggleHarvest,
  onTestConnection,
  onSave,
  onOpenInTab,
  onReopenOnboarding,
  onClearAll,
  aboutSlot,
}: SettingsViewProps) {
  const [showKey, setShowKey] = useState(false)

  const active = settings.activeProvider
  const spec = providers[active]
  const cfg = settings.providers[active]

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 pb-2">
      {/* 弹窗失焦提示。Chrome 弹窗在切窗口/切应用时会自动关闭——
          粘贴 URL/Key 几乎必断，所以在 popup 模式下显式提示并提供切换入口。 */}
      {!isInTab && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 leading-relaxed">
          💡 粘贴 URL / Key 时弹窗会自动关闭，建议
          <button
            onClick={() => onOpenInTab?.()}
            className="underline ml-0.5 font-medium hover:text-amber-900"
          >
            在新标签页打开配置
          </button>
          。
        </div>
      )}

      {/* AI 提供商 */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          AI 提供商
        </label>
        <div className="flex gap-1.5 mb-2">
          {providerIds.map(pid => (
            <button
              key={pid}
              onClick={() => onSwitchProvider?.(pid)}
              disabled={!onSwitchProvider}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                active === pid
                  ? 'border-bili-pink text-bili-pink bg-[#fff5f8]'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              {providers[pid].label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400">{spec.blurb}</p>
      </div>

      {/* Base URL (仅 custom) */}
      {active === 'custom' && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Base URL
          </label>
          <input
            type="text"
            value={cfg.baseUrl ?? ''}
            onChange={e => onUpdateProviderCfg?.({ baseUrl: e.target.value })}
            placeholder={spec.baseUrlPlaceholder}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-bili-pink font-mono"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            OpenAI 兼容的 chat/completions 服务地址，会拼上 /chat/completions。
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            如遇 CORS 错误：目标服务需允许 chrome-extension origin 访问。
            longcat / 大多商业 API 已默认开放；自建 ollama / vLLM 通常需要在服务端配置。
          </p>
        </div>
      )}

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {spec.label} API Key
        </label>
        <div className="flex gap-1.5">
          <input
            type={showKey ? 'text' : 'password'}
            value={cfg.apiKey}
            onChange={e => onUpdateProviderCfg?.({ apiKey: e.target.value })}
            placeholder="填入你的 API Key"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-bili-pink font-mono"
          />
          <button
            onClick={() => setShowKey(v => !v)}
            className="px-2 py-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg text-xs"
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          Key 仅存储在本地，不会上传任何服务器。
          {active === 'custom' ? (
            <a href={spec.keyUrl} target="_blank" rel="noreferrer"
              className="text-bili-blue ml-1">没 Key？去 longcat 申请 →</a>
          ) : (
            <a href={spec.keyUrl} target="_blank" rel="noreferrer"
              className="text-bili-blue ml-1">去 {spec.label} 拿 Key →</a>
          )}
        </p>
      </div>

      {/* 模型 */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          分析模型
        </label>
        <input
          type="text"
          value={cfg.model}
          onChange={e => onUpdateProviderCfg?.({ model: e.target.value })}
          placeholder={spec.modelPlaceholder}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-bili-pink font-mono"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          手输 model id。可用清单见 {spec.label} 官方文档；下方"测试 API 连接"可验证。
        </p>
      </div>

      {/* 测试连接 */}
      <div className="mb-4">
        <button
          onClick={() => onTestConnection?.()}
          disabled={testStatus === 'testing' || !onTestConnection}
          className="w-full py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60"
          style={{
            borderColor: testStatus === 'ok' ? '#4caf50' : testStatus === 'fail' ? '#f44336' : '#d9d9d9',
            color: testStatus === 'ok' ? '#4caf50' : testStatus === 'fail' ? '#f44336' : '#555',
            background: 'white',
          }}
        >
          {testStatus === 'testing' ? '测试中...' : '测试 API 连接'}
        </button>
        {testMsg && (
          <p className={`mt-1.5 text-[11px] leading-relaxed px-1 ${testStatus === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
            {testMsg}
          </p>
        )}
      </div>

      {/* 阈值 */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          自动触发阈值：每 <span className="text-bili-pink">{settings.triggerThreshold}</span> 条新行为
        </label>
        <input
          type="range"
          min={3}
          max={50}
          step={1}
          value={settings.triggerThreshold}
          onChange={e => onUpdateThreshold?.(Number(e.target.value))}
          className="w-full accent-bili-pink"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>3（更频繁）</span>
          <span>50（更节省）</span>
        </div>
      </div>

      {/* 调试模式 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">调试模式（开发者用）</div>
          <p className="text-[10px] text-gray-400 mt-0.5">被过滤的内容不隐藏，改为标记显示命中原因</p>
        </div>
        <button
          onClick={() => onToggleDebug?.()}
          disabled={!onToggleDebug}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            settings.debugMode ? 'bg-bili-pink' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              settings.debugMode ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* 采集推荐流标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1 pr-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">采集推荐流标题（增强 AI 屏蔽词）</div>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
            开启后，你刷到的视频标题（B 站的推荐结果，非你的行为）会被采样，分析时发给你自己的 LLM 以提取更准的屏蔽词。默认关、无作者服务器、可随时关。
          </p>
        </div>
        <button
          onClick={() => onToggleHarvest?.()}
          disabled={!onToggleHarvest}
          className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
            settings.harvestImpressions ? 'bg-bili-pink' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              settings.harvestImpressions ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* 引导 */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={() => onReopenOnboarding?.()}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          重新查看引导
        </button>
      </div>

      {aboutSlot}

      {/* 危险操作 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs font-semibold text-gray-400 mb-1">危险操作</div>
        <p className="text-[10px] text-gray-400 mb-2">所有数据只在本地。一键清除不可撤销。</p>
        <button
          onClick={() => onClearAll?.()}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          清除所有数据
        </button>
      </div>
      </div>

      {/* 固定底部保存栏。常驻可见，避免用户填完 key/model 后误以为已生效。 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <button
          onClick={() => onSave?.()}
          disabled={(!isDirty && !savedFlash) || !onSave}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: savedFlash ? '#4caf50' : isDirty ? '#fb7299' : '#9ca3af' }}
        >
          {savedFlash ? '已保存 ✓' : isDirty ? '保存设置（有未保存修改）' : '所有修改已保存'}
        </button>
      </div>
    </div>
  )
}
