// src/promo/components/bilibili/FilteredPopularCard.tsx
// Horizontal "filtered out" popular card: a faded PopularCard with a centered
// 命中：{reason} badge over its thumbnail. Mirrors FilteredCard but for the
// popular-page horizontal layout. The badge is centered on the 150×94 thumb
// (left side of the card), so center ≈ (75, 47).
import PopularCard, { type PopularCardData } from './PopularCard'

interface FilteredPopularCardProps {
  data: PopularCardData
  reason: string
}

export default function FilteredPopularCard({ data, reason }: FilteredPopularCardProps) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ opacity: 0.4, filter: 'grayscale(0.6)' }}>
        <PopularCard data={data} />
      </div>
      <div style={{
        position: 'absolute',
        top: 47, left: 75,
        transform: 'translate(-50%, -50%)',
        padding: '5px 12px', borderRadius: 6,
        background: 'rgba(17, 24, 39, 0.85)', color: '#ffffff',
        fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', zIndex: 2,
      }}>
        命中：{reason}
      </div>
    </div>
  )
}
