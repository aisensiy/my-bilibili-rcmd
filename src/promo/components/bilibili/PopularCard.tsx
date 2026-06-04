// src/promo/components/bilibili/PopularCard.tsx
// One horizontal popular-page card, mirroring bilibili `.video-card` on
// /v/popular/all: gradient thumbnail (left) + title, orange recommend-reason
// pill, UP row, and play/danmaku stats (right). Reuses VideoCard's CoverKind
// gradients so covers stay consistent across scenes (no real covers used).
import { type CoverKind, COVER_GRADIENTS } from './VideoCard'

export interface PopularCardData {
  title: string
  upName: string
  cover: CoverKind
  reason: string    // recommend-reason pill text, e.g. '人气飙升'
  plays: string     // e.g. '23.7万'
  danmaku: string   // e.g. '2.1万'
  duration: string  // e.g. '24:55'
}

export default function PopularCard({ data }: { data: PopularCardData }) {
  return (
    <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
      {/* thumbnail */}
      <div style={{
        position: 'relative',
        width: 150, height: 94, flexShrink: 0,
        borderRadius: 8, overflow: 'hidden',
        background: COVER_GRADIENTS[data.cover],
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 55%, rgba(17,24,39,0.45) 100%)',
        }} />
        {/* thumbnail overlay shows duration only; play count lives in the stats row */}
        <div style={{
          position: 'absolute', left: 7, right: 7, bottom: 6, zIndex: 2,
          display: 'flex', justifyContent: 'flex-end',
          color: 'white', fontSize: 11, fontWeight: 600,
        }}>
          <span>{data.duration}</span>
        </div>
      </div>
      {/* right column */}
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontSize: 14, lineHeight: 1.3, fontWeight: 700, color: '#18191c',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{data.title}</div>
        <div style={{ marginTop: 6 }}>
          <span style={{
            display: 'inline-block',
            padding: '2px 7px', borderRadius: 4,
            background: '#fff1e8', color: '#ff7f24',
            fontSize: 11, fontWeight: 600,
          }}>{data.reason}</span>
        </div>
        <div style={{
          marginTop: 'auto', fontSize: 12, color: '#9499a0',
          display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
        }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: '#fff', background: '#9499a0',
            borderRadius: 3, padding: '1px 3px', flexShrink: 0,
          }}>UP</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.upName}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#9499a0', display: 'flex', gap: 14 }}>
          <span>▷ {data.plays}</span>
          <span>▤ {data.danmaku}</span>
        </div>
      </div>
    </div>
  )
}
