import type { ReactNode } from 'react'

export default function HoverActions({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {/* Floating action buttons over thumbnail top-right corner */}
      <div style={{
        position: 'absolute',
        top: 8, right: 8,
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
          fontWeight: 700,
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
          fontWeight: 700,
          border: 'none',
          boxShadow: '0 4px 10px rgba(251, 79, 134, 0.35)',
          whiteSpace: 'nowrap',
        }}>屏蔽TA</button>
      </div>
    </div>
  )
}
