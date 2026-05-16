import { useEffect, useState } from 'react'
import { storage, type Settings, DEFAULT_SETTINGS } from '../lib/storage'

const PRESET_MODELS = [
  { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash（免费）' },
  { value: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'anthropic/claude-3-5-haiku', label: 'Claude 3.5 Haiku' },
  { value: 'custom', label: '自定义...' },
]

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [customModel, setCustomModel] = useState('')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMsg, setTestMsg] = useState('')

  const isCustom = !PRESET_MODELS.slice(0, -1).some(m => m.value === (settings as any).model)

  useEffect(() => {
    storage.getSettings().then(s => {
      setSettings(s)
      if (!PRESET_MODELS.slice(0, -1).some(m => m.value === (s as any).model)) {
        setCustomModel((s as any).model)
      }
    })
  }, [])

  const testConnection = async () => {
    const key = (settings as any).openrouterKey.trim()
    const model = (isCustom && customModel) ? customModel : (settings as any).model
    if (!key) { setTestStatus('fail'); setTestMsg('请先填写 API Key'); return }

    setTestStatus('testing')
    setTestMsg('')
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/bilibili-recommand',
          'X-Title': 'Bilibili Recommand',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: '用一句话说你好，不超过10个字。' }],
          max_tokens: 30,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTestStatus('fail')
        setTestMsg(data?.error?.message ?? `HTTP ${res.status}`)
      } else {
        const reply = data.choices?.[0]?.message?.content ?? '（无响应）'
        setTestStatus('ok')
        setTestMsg(`模型回复：${reply}`)
      }
    } catch (e) {
      setTestStatus('fail')
      setTestMsg(String(e))
    }
  }

  const save = async () => {
    const toSave = {
      ...settings,
      model: isCustom && customModel ? customModel : (settings as any).model,
    } as any
    await storage.setSettings(toSave)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* API Key */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          OpenRouter API Key
        </label>
        <div className="flex gap-1.5">
          <input
            type={showKey ? 'text' : 'password'}
            value={(settings as any).openrouterKey}
            onChange={e => setSettings(s => ({ ...s, openrouterKey: e.target.value } as any))}
            placeholder="sk-or-..."
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
          <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer"
            className="text-[#00a1d6] ml-1">获取 Key →</a>
        </p>
      </div>

      {/* Model */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          分析模型
        </label>
        <select
          value={isCustom ? 'custom' : (settings as any).model}
          onChange={e => {
            const v = e.target.value
            if (v === 'custom') {
              setSettings(s => ({ ...s, model: customModel || '' } as any))
            } else {
              setSettings(s => ({ ...s, model: v } as any))
            }
          }}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#fb7299] bg-white"
        >
          {PRESET_MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {isCustom && (
          <input
            type="text"
            value={customModel}
            onChange={e => { setCustomModel(e.target.value); setSettings(s => ({ ...s, model: e.target.value } as any)) }}
            placeholder="例：anthropic/claude-3-opus"
            className="mt-1.5 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#fb7299] font-mono"
          />
        )}
      </div>

      {/* Test connection */}
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

      {/* Threshold */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          自动触发阈值：每 <span className="text-[#fb7299]">{settings.triggerThreshold}</span> 条新行为
        </label>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={settings.triggerThreshold}
          onChange={e => setSettings(s => ({ ...s, triggerThreshold: Number(e.target.value) }))}
          className="w-full accent-[#fb7299]"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>5（更频繁）</span>
          <span>50（更节省）</span>
        </div>
      </div>

      {/* Debug mode */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">调试模式</div>
          <p className="text-[10px] text-gray-400 mt-0.5">被过滤的内容不隐藏，改为标记显示命中原因</p>
        </div>
        <button
          onClick={() => {
            const next = { ...settings, debugMode: !settings.debugMode }
            setSettings(next)
            storage.setSettings({ ...next, model: isCustom && customModel ? customModel : (next as any).model } as any)
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

      {/* Danger zone */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="text-xs font-semibold text-gray-400 mb-2">危险操作</div>
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
