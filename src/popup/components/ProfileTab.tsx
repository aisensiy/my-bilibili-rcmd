import { useEffect, useState } from 'react'
import { storage, type UserProfile } from '../lib/storage'

function TagList({
  label,
  hint,
  color,
  tags,
  onAdd,
  onRemove,
}: {
  label: string
  hint: string
  color: string
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) { onAdd(v); setInput('') }
  }

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">{hint}</p>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {tags.length === 0 && (
          <span className="text-xs text-gray-400 italic">暂无</span>
        )}
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
            style={{ background: color }}
          >
            {tag}
            <button
              onClick={() => onRemove(tag)}
              className="ml-0.5 opacity-70 hover:opacity-100 leading-none"
            >×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="输入标签回车添加"
          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-gray-400"
        />
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-1 rounded text-white"
          style={{ background: color }}
        >+</button>
      </div>
    </div>
  )
}

export default function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [msg, setMsg] = useState('')
  const [progress, setProgress] = useState<{ since: number; threshold: number }>({ since: 0, threshold: 5 })

  useEffect(() => {
    storage.getProfile().then(setProfile)

    // Listen for profile updates from background
    const handler = (message: any) => {
      if (message.type === 'profile_updated') setProfile(message.profile)
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  useEffect(() => {
    const load = async () => {
      const [since, settings] = await Promise.all([
        storage.getActionsSinceLastAnalysis(),
        storage.getSettings(),
      ])
      setProgress({ since, threshold: settings.triggerThreshold })
    }
    load()
  }, [profile])

  const save = async (updated: UserProfile) => {
    setProfile(updated)
    await storage.setProfile(updated)
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setMsg('')
    try {
      const res = await chrome.runtime.sendMessage({ type: 'analyze_profile' })
      if (res?.ok) {
        const p = await storage.getProfile()
        setProfile(p)
        setMsg('分析完成！')
      } else {
        setMsg('分析失败，请检查 API Key 和网络')
      }
    } catch {
      setMsg('分析失败，请检查设置')
    } finally {
      setAnalyzing(false)
    }
  }

  if (!profile) return <div className="p-4 text-xs text-gray-400">加载中...</div>

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 pb-2">
      {/* Analysis summary */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 leading-relaxed">
        {profile.lastUpdated === 0 ? (
          <>
            <div className="font-medium text-gray-700 mb-1">AI 还不认识你</div>
            <div>
              已记录 {progress.since} 条行为，再看 {Math.max(progress.threshold - progress.since, 0)} 个视频就会自动生成你的画像。
            </div>
          </>
        ) : (
          <>
            {profile.analysis || '尚未分析。'}
            <div className="mt-1 text-gray-400">
              更新于 {new Date(profile.lastUpdated).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        )}
      </div>

      <TagList
        label="喜欢的内容"
        hint="AI 看到的你（仅供你判断 AI 理解是否对齐，不影响过滤）"
        color="#00a1d6"
        tags={profile.interests}
        onAdd={tag => save({ ...profile, interests: [...profile.interests, tag] })}
        onRemove={tag => save({ ...profile, interests: profile.interests.filter(t => t !== tag) })}
      />

      <TagList
        label="不感兴趣（自动屏蔽匹配标题）"
        hint="AI 生成的标签，匹配标题会自动隐藏。你可以增删"
        color="#fb7299"
        tags={profile.disinterests}
        onAdd={tag => save({ ...profile, disinterests: [...profile.disinterests, tag] })}
        onRemove={tag => save({ ...profile, disinterests: profile.disinterests.filter(t => t !== tag) })}
      />

      <TagList
        label="屏蔽的 UP 主"
        hint="AI 从你的行为里提取，你也可以手动加"
        color="#9e9e9e"
        tags={profile.blockedUps}
        onAdd={tag => save({ ...profile, blockedUps: [...profile.blockedUps, tag] })}
        onRemove={tag => save({ ...profile, blockedUps: profile.blockedUps.filter(t => t !== tag) })}
      />

      </div>

      {/* 固定底部操作栏，跟 SettingsTab 保持一致——常驻可见，
          画像页内容较长时无需滚动找按钮。 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ background: '#fb7299' }}
        >
          {analyzing ? '分析中...' : (profile.lastUpdated === 0 ? '立即分析' : '立即重新分析')}
        </button>
        {msg && <div className="mt-1.5 text-xs text-center text-gray-500">{msg}</div>}
      </div>
    </div>
  )
}
