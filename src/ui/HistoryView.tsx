// src/ui/HistoryView.tsx
import { useEffect, useRef } from 'react'
import type { Action, Stats } from './types'
import StatCard from './StatCard'
import HistoryRow from './HistoryRow'

interface HistoryViewProps {
  actions: Action[]
  stats: Stats
  hasMore?: boolean
  onLoadMore?: () => void
}

export default function HistoryView({ actions, stats, hasMore, onLoadMore }: HistoryViewProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // 滚到底自动触发 onLoadMore；缺少 callback 则不挂监听（promo 场景静态展示）
  useEffect(() => {
    if (!hasMore || !onLoadMore) return
    const node = sentinelRef.current
    if (!node) return
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) onLoadMore()
    })
    io.observe(node)
    return () => io.disconnect()
  }, [hasMore, onLoadMore])

  return (
    <div className="p-4 overflow-y-auto h-full">
      <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
        AI 以这些行为为依据生成你的画像
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="观看视频" value={stats.playCount} />
        <StatCard label="屏蔽操作" value={stats.blockedCount} />
        <StatCard label="平均完播" value={`${Math.round(stats.avgWatchRatio * 100)}%`} />
      </div>

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
        {actions.map((action, i) => <HistoryRow key={i} action={action} />)}
        {hasMore && (
          <div ref={sentinelRef} className="text-[10px] text-gray-400 text-center py-2">
            加载中…
          </div>
        )}
      </div>
    </div>
  )
}
