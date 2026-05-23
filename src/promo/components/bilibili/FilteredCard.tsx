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
      {/* Center badge on the thumbnail (thumbnail height = 128 from VideoCard).
          Positioned absolutely at the visual center of the thumbnail area. */}
      <div style={{
        position: 'absolute',
        top: 64, left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '6px 14px',
        borderRadius: 6,
        background: 'rgba(17, 24, 39, 0.85)',
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        zIndex: 2,
      }}>
        命中：{reason}
      </div>
    </div>
  )
}
