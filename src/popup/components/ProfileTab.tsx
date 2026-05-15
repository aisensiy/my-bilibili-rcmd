import { useEffect, useState } from 'react'
import { storage, type UserProfile } from '../lib/storage'

function TagList({
  label,
  color,
  tags,
  onAdd,
  onRemove,
}: {
  label: string
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
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</div>
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

  useEffect(() => {
    storage.getProfile().then(setProfile)

    // Listen for profile updates from background
    const handler = (message: any) => {
      if (message.type === 'profile_updated') setProfile(message.profile)
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

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
    <div className="p-4 overflow-y-auto h-full">
      {/* Analysis summary */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 leading-relaxed">
        {profile.analysis || '尚未分析。'}
        {profile.lastUpdated > 0 && (
          <div className="mt-1 text-gray-400">
            更新于 {new Date(profile.lastUpdated).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <TagList
        label="喜欢的内容"
        color="#00a1d6"
        tags={profile.interests}
        onAdd={tag => save({ ...profile, interests: [...profile.interests, tag] })}
        onRemove={tag => save({ ...profile, interests: profile.interests.filter(t => t !== tag) })}
      />

      <TagList
        label="不感兴趣（自动屏蔽匹配标题）"
        color="#fb7299"
        tags={profile.disinterests}
        onAdd={tag => save({ ...profile, disinterests: [...profile.disinterests, tag] })}
        onRemove={tag => save({ ...profile, disinterests: profile.disinterests.filter(t => t !== tag) })}
      />

      <TagList
        label="屏蔽的 UP 主"
        color="#9e9e9e"
        tags={profile.blockedUps}
        onAdd={tag => save({ ...profile, blockedUps: [...profile.blockedUps, tag] })}
        onRemove={tag => save({ ...profile, blockedUps: profile.blockedUps.filter(t => t !== tag) })}
      />

      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
        style={{ background: '#fb7299' }}
      >
        {analyzing ? '分析中...' : '立即重新分析'}
      </button>
      {msg && <div className="mt-2 text-xs text-center text-gray-500">{msg}</div>}
    </div>
  )
}
