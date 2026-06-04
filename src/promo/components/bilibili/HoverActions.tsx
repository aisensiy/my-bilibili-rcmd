import type { ReactNode } from 'react'

export default function HoverActions({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {/* Floating action buttons at thumbnail bottom-right corner.
          Thumbnail height = 128 from VideoCard; two ~26px buttons + 6px gap
          = ~58px stack, anchored 8px above thumbnail bottom edge → top: 62.
          Labels match the real extension UI ("不感兴趣" + "不看TA"). */}
      <div style={{
        position: 'absolute',
        top: 62, right: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 3,
      }}>
        <button style={{
          padding: '5px 10px',
          borderRadius: 6,
          background: '#1b1d24',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 600,
          border: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
        }}>不感兴趣</button>
        <button style={{
          padding: '5px 10px',
          borderRadius: 6,
          background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 600,
          border: 'none',
          boxShadow: '0 4px 10px rgba(251, 79, 134, 0.35)',
          whiteSpace: 'nowrap',
        }}>不看TA</button>
      </div>
    </div>
  )
}
