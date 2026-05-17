import { useEffect, useRef, useState } from 'react'
import { storage, type Action } from '../lib/storage'

const PAGE_SIZE = 30

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-lg py-3 px-2">
      <div className="text-base font-bold text-gray-800">{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function ratio2bar(ratio: number) {
  const pct = Math.round(ratio * 100)
  const color = pct >= 80 ? '#fb7299' : pct >= 40 ? '#00a1d6' : '#111111'
  return { pct, color }
}

function formatDuration(totalSeconds?: number) {
  if (!totalSeconds || totalSeconds <= 0) return null
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remain = seconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
  return `${minutes}:${String(remain).padStart(2, '0')}`
}

export default function HistoryTab() {
  const [actions, setActions] = useState<Action[]>([])
  const [stats, setStats] = useState({ playCount: 0, blockedCount: 0, avgWatchRatio: 0 })
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      const [all, s] = await Promise.all([storage.getActions(), storage.getStats()])
      setActions(all)
      setStats(s)
    }
    load()
  }, [])

  // 滚到底自动加载下一页。storage 全量最多 500 条，一次性放进内存没压力，
  // 这里只是控制 DOM 渲染量。
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    if (visibleCount >= actions.length) return
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setVisibleCount(c => Math.min(c + PAGE_SIZE, actions.length))
      }
    })
    io.observe(node)
    return () => io.disconnect()
  }, [visibleCount, actions.length])

  const visible = actions.slice(0, visibleCount)
  const hasMore = visibleCount < actions.length

  return (
    <div className="p-4 overflow-y-auto h-full">
      <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
        AI 以这些行为为依据生成你的画像
      </p>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="观看视频" value={stats.playCount} />
        <StatCard label="屏蔽操作" value={stats.blockedCount} />
        <StatCard label="平均完播" value={`${Math.round(stats.avgWatchRatio * 100)}%`} />
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">最近记录</div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:'#fb7299'}}/>≥80%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:'#00a1d6'}}/>40–79%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:'#111111'}}/>&lt;40%</span>
        </div>
      </div>
      {actions.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-8">暂无记录，去 Bilibili 看看吧</div>
      )}
      <div className="space-y-2">
        {visible.map((action, i) => {
          if (action.type === 'play') {
            const { pct, color } = ratio2bar(action.watchRatio)
            const watched = formatDuration(action.watchedSeconds)
            const duration = formatDuration(action.durationSeconds)
            return (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{action.title}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{action.upName}</div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(action.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {(watched || duration) && (
                  <div className="mt-1 text-[10px] text-gray-500">
                    {watched ? `观看 ${watched}` : '已观看'}
                    {duration ? ` / 全长 ${duration}` : ''}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-[10px] text-gray-400">{pct}%</span>
                </div>
              </div>
            )
          }

          if (action.type === 'disinterested') {
            return (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                <span className="text-[10px] bg-[#fb7299] text-white px-1.5 py-0.5 rounded shrink-0">不感兴趣</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-700 truncate">{action.title}</div>
                </div>
              </div>
            )
          }

          if (action.type === 'blockUp') {
            return (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                <span className="text-[10px] bg-gray-500 text-white px-1.5 py-0.5 rounded shrink-0">屏蔽UP</span>
                <div className="text-xs text-gray-700">{action.upName}</div>
              </div>
            )
          }

          return null
        })}
        {hasMore && (
          <div ref={sentinelRef} className="text-[10px] text-gray-400 text-center py-2">
            加载中…
          </div>
        )}
      </div>
    </div>
  )
}
