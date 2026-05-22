// src/extension/components/HistoryTab.tsx
import { useEffect, useState } from 'react'
import { storage } from '../lib/storage'
import type { Action, Stats } from '@/ui/types'
import HistoryView from '@/ui/HistoryView'

const PAGE_SIZE = 30
const DEFAULT_STATS: Stats = { totalActions: 0, playCount: 0, blockedCount: 0, avgWatchRatio: 0 }

export default function HistoryTab() {
  const [actions, setActions] = useState<Action[]>([])
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const load = async () => {
      const [all, s] = await Promise.all([storage.getActions(), storage.getStats()])
      setActions(all)
      setStats(s)
    }
    load()
  }, [])

  const visible = actions.slice(0, visibleCount)
  const hasMore = visibleCount < actions.length

  return (
    <HistoryView
      actions={visible}
      stats={stats}
      hasMore={hasMore}
      onLoadMore={() => setVisibleCount(c => Math.min(c + PAGE_SIZE, actions.length))}
    />
  )
}
