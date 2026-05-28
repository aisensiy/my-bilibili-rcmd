// src/ui/HistoryRow.tsx
import type { Action } from './types'

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

export default function HistoryRow({ action }: { action: Action }) {
  if (action.type === 'play') {
    const { pct, color } = ratio2bar(action.watchRatio)
    const watched = formatDuration(action.watchedSeconds)
    const duration = formatDuration(action.durationSeconds)
    return (
      <div className="bg-gray-50 rounded-lg p-2.5">
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
      <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
        <span className="text-[10px] bg-bili-pink text-white px-1.5 py-0.5 rounded-sm shrink-0">不感兴趣</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-700 truncate">{action.title}</div>
        </div>
      </div>
    )
  }

  if (action.type === 'blockUp') {
    return (
      <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
        <span className="text-[10px] bg-gray-500 text-white px-1.5 py-0.5 rounded-sm shrink-0">屏蔽UP</span>
        <div className="text-xs text-gray-700">{action.upName}</div>
      </div>
    )
  }

  if (action.type === 'blockTopic') {
    return (
      <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
        <span className="text-[10px] bg-bili-pink text-white px-1.5 py-0.5 rounded-sm shrink-0">屏蔽话题</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-700 truncate">{action.phrase}</div>
        </div>
      </div>
    )
  }

  return null
}
