import VideoCard, { type VideoCardData } from './VideoCard'

interface FilteredCardProps {
  data: VideoCardData
  reason: string
}

export default function FilteredCard({ data, reason }: FilteredCardProps) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Faded video card — grayscale + low opacity, line-through on title via overlay css */}
      <div style={{ opacity: 0.4, filter: 'grayscale(0.6)' }}>
        <VideoCard data={data} />
      </div>
      {/* Top-left badge: "命中: <reason>" */}
      <div style={{
        position: 'absolute',
        top: 8, left: 8,
        padding: '4px 10px',
        borderRadius: 4,
        background: 'rgba(17, 24, 39, 0.78)',
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 700,
        zIndex: 2,
      }}>
        命中：{reason}
      </div>
    </div>
  )
}
