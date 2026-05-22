// One video card mimicking the structure of bilibili-video-card:
// thumbnail (color-coded gradient, not real covers) + plays/duration overlay
// + title + UP name and timeAgo.
export type CoverKind = 'blue-tech' | 'warm-sunset' | 'gray-tech' | 'purple-tech' | 'green-life' | 'orange-warm'

export interface VideoCardData {
  title: string
  upName: string
  cover: CoverKind
  plays: string      // e.g. '12.3万'
  duration: string   // e.g. '06:45'
  timeAgo: string    // e.g. '3 小时前'
}

const COVER_GRADIENTS: Record<CoverKind, string> = {
  'blue-tech':    'linear-gradient(135deg, #4d7dff 0%, #15bef0 100%)',
  'warm-sunset':  'linear-gradient(135deg, #ff917a 0%, #ff4f86 100%)',
  'gray-tech':    'linear-gradient(135deg, #dfe4ec 0%, #cfd5df 100%)',
  'purple-tech':  'linear-gradient(135deg, #8b5fbf 0%, #6a89cc 100%)',
  'green-life':   'linear-gradient(135deg, #74d4a8 0%, #2b9d6e 100%)',
  'orange-warm':  'linear-gradient(135deg, #f4a261 0%, #e76f51 100%)',
}

export default function VideoCard({ data }: { data: VideoCardData }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        position: 'relative',
        height: 128,
        borderRadius: 8,
        overflow: 'hidden',
        background: COVER_GRADIENTS[data.cover],
      }}>
        {/* Scrim for legibility of bottom-overlay text */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 52%, rgba(17, 24, 39, 0.45) 100%)',
        }} />
        <div style={{
          position: 'absolute',
          left: 8, right: 8, bottom: 7,
          zIndex: 2,
          display: 'flex',
          justifyContent: 'space-between',
          color: 'white',
          fontSize: 12,
          fontWeight: 700,
        }}>
          <span>▻ {data.plays}</span>
          <span>{data.duration}</span>
        </div>
      </div>
      <div style={{
        marginTop: 11,
        fontSize: 14,
        lineHeight: 1.28,
        fontWeight: 800,
        color: '#232936',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{data.title}</div>
      <div style={{
        marginTop: 8,
        fontSize: 12,
        color: '#9aa3b2',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>UP {data.upName} · {data.timeAgo}</div>
    </div>
  )
}
