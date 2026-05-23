// src/promo/components/layout/Stage.tsx
// Promo billboard canvas. Default 1280×800 (Chrome Web Store screenshot).
// Pass width/height to render at other Chrome Web Store sizes:
//   440×280  — small promo tile
//   1400×560 — marquee banner
// Decorations (粉/蓝 arcs + dot pattern) are sized as a % of the canvas
// so they scale naturally instead of overflowing tiny canvases.
import type { ReactNode } from 'react'

interface StageProps {
  width?: number
  height?: number
  children: ReactNode
}

export default function Stage({ width = 1280, height = 800, children }: StageProps) {
  return (
    <div style={{
      position: 'relative',
      width,
      height,
      overflow: 'hidden',
      background: '#ffffff',
    }}>
      {/* 左上粉色弧 — 36% wide × 49% tall, anchored just outside top-left */}
      <div style={{
        position: 'absolute',
        width: '36%', height: '49%',
        left: '-2.7%', top: '-3.8%',
        borderRadius: '0 0 52% 0',
        background: '#ffe4ee',
        zIndex: 0,
      }} />
      {/* 右下蓝色弧 — 28% × 41%, anchored just outside bottom-right */}
      <div style={{
        position: 'absolute',
        width: '28%', height: '41%',
        right: '-6.9%', bottom: '-11.8%',
        borderRadius: '56% 0 0 0',
        background: '#d7f1ff',
        zIndex: 0,
      }} />
      {/* 左侧点阵 — absolute, but skip when canvas is too small */}
      {width >= 800 && (
        <div style={{
          position: 'absolute',
          left: -4, top: '43.5%',
          width: 144, height: 168,
          opacity: 0.6,
          backgroundImage: 'radial-gradient(rgba(251, 114, 153, 0.24) 1.4px, transparent 1.4px)',
          backgroundSize: '14px 14px',
          zIndex: 1,
        }} />
      )}
      {children}
    </div>
  )
}
