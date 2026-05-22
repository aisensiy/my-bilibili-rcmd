// 1280×800 fixed-size promo stage with pink/blue brand decoration arcs and dot pattern.
// Children use absolute positioning to place themselves into the stage.
import type { ReactNode } from 'react'

export default function Stage({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      width: 1280,
      height: 800,
      overflow: 'hidden',
      background: '#ffffff',
    }}>
      {/* 左上粉色弧 */}
      <div style={{
        position: 'absolute',
        width: 470, height: 390,
        left: -34, top: -30,
        borderRadius: '0 0 52% 0',
        background: '#ffe4ee',
        zIndex: 0,
      }} />
      {/* 右下蓝色弧 */}
      <div style={{
        position: 'absolute',
        width: 360, height: 330,
        right: -88, bottom: -94,
        borderRadius: '56% 0 0 0',
        background: '#d7f1ff',
        zIndex: 0,
      }} />
      {/* 左侧点阵 */}
      <div style={{
        position: 'absolute',
        left: -4, top: 348,
        width: 144, height: 168,
        opacity: 0.6,
        backgroundImage: 'radial-gradient(rgba(251, 114, 153, 0.24) 1.4px, transparent 1.4px)',
        backgroundSize: '14px 14px',
        zIndex: 1,
      }} />
      {children}
    </div>
  )
}
