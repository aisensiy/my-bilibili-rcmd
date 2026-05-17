import { useEffect, useState } from 'react'
import { storage, type Settings, DEFAULT_SETTINGS } from '../lib/storage'
import { PROVIDERS, type ProviderId, callProvider } from '../../lib/providers'

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

const PROVIDER_IDS: ProviderId[] = ['openrouter', 'glm', 'deepseek']

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMsg, setTestMsg] = useState('')

  useEffect(() => {
    storage.getSettings().then(setSettings)
  }, [])

  const active = settings.activeProvider
  const spec = PROVIDERS[active]
  const cfg = settings.providers[active]

  const updateProviderCfg = (patch: Partial<typeof cfg>) => {
    setSettings(s => ({
      ...s,
      providers: { ...s.providers, [active]: { ...s.providers[active], ...patch } },
    }))
  }

  const switchProvider = (next: ProviderId) => {
    setSettings(s => ({ ...s, activeProvider: next }))
    setTestStatus('idle')
    setTestMsg('')
  }

  const testConnection = async () => {
    const key = cfg.apiKey.trim()
    if (!key) { setTestStatus('fail'); setTestMsg('请先填写 API Key'); return }
    if (!cfg.model.trim()) { setTestStatus('fail'); setTestMsg('请先填写模型 id'); return }

    setTestStatus('testing')
    setTestMsg('')

    const result = await callProvider({
      provider: active,
      apiKey: key,
      model: cfg.model.trim(),
      messages: [{ role: 'user', content: '用一句话说你好，不超过10个字。' }],
      // 测试只验证连通，关闭思考让响应又快又省 token。
      // *-thinking 变体可能拒绝；providers.ts 有 reasoning 回退 + 1024 预算兜底。
      reasoning: 'off',
      maxTokens: 1024,
    })

    if (!result.ok) {
      setTestStatus('fail')
      setTestMsg(result.errorMessage ?? `HTTP ${result.errorStatus ?? '???'}`)
    } else {
      setTestStatus('ok')
      setTestMsg(`模型回复：${result.content}`)
    }
  }

  const save = async () => {
    await storage.setSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reopenOnboarding = async () => {
    await storage.setSettings({ ...settings, onboardingComplete: false })
    window.close()
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* AI 提供商 */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          AI 提供商
        </label>
        <div className="flex gap-1.5 mb-2">
          {PROVIDER_IDS.map(pid => (
            <button
              key={pid}
              onClick={() => switchProvider(pid)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                active === pid
                  ? 'border-[#fb7299] text-[#fb7299] bg-[#fff5f8]'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700'
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
        <div className="flex gap-1.5">
          <input
            type={showKey ? 'text' : 'password'}
            value={cfg.apiKey}
            onChange={e => updateProviderCfg({ apiKey: e.target.value })}
            placeholder="填入你的 API Key"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#fb7299] font-mono"
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
          <a href={spec.keyUrl} target="_blank" rel="noreferrer"
            className="text-[#00a1d6] ml-1">去 {spec.label} 拿 Key →</a>
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
          onChange={e => updateProviderCfg({ model: e.target.value })}
          placeholder={spec.modelPlaceholder}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#fb7299] font-mono"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          手输 model id。可用清单见 {spec.label} 官方文档；下方"测试 API 连接"可验证。
        </p>
      </div>

      {/* 测试连接 */}
      <div className="mb-4">
        <button
          onClick={testConnection}
          disabled={testStatus === 'testing'}
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
          自动触发阈值：每 <span className="text-[#fb7299]">{settings.triggerThreshold}</span> 条新行为
        </label>
        <input
          type="range"
          min={3}
          max={50}
          step={1}
          value={settings.triggerThreshold}
          onChange={e => setSettings(s => ({ ...s, triggerThreshold: Number(e.target.value) }))}
          className="w-full accent-[#fb7299]"
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
          onClick={() => {
            const next = { ...settings, debugMode: !settings.debugMode }
            setSettings(next)
            storage.setSettings(next)
          }}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            settings.debugMode ? 'bg-[#fb7299]' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              settings.debugMode ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      <button
        onClick={save}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all"
        style={{ background: saved ? '#4caf50' : '#fb7299' }}
      >
        {saved ? '已保存 ✓' : '保存设置'}
      </button>

      {/* 引导 */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={reopenOnboarding}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          重新查看引导
        </button>
      </div>

      {/* 危险操作 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs font-semibold text-gray-400 mb-1">危险操作</div>
        <p className="text-[10px] text-gray-400 mb-2">所有数据只在本地。一键清除不可撤销。</p>
        <button
          onClick={async () => {
            if (confirm('确认清除所有记录和画像？此操作不可撤销。')) {
              await chrome.storage.local.clear()
              window.location.reload()
            }
          }}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          清除所有数据
        </button>
      </div>
    </div>
  )
}
