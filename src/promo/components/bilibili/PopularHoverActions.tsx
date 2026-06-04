// src/promo/components/bilibili/PopularHoverActions.tsx
// Corner-anchored 不感兴趣 / 不看TA buttons over a popular card, matching where
// the real extension injects them (injectPopularButtons appends .bf-ext-actions
// to the card's bottom-right corner — NOT the homepage portal). Labels are
// verbatim from buildActionButtons in src/content/index.ts.
import type { ReactNode } from 'react'

export default function PopularHoverActions({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <div style={{
        position: 'absolute', right: 0, bottom: 0,
        display: 'flex', gap: 6, zIndex: 3,
      }}>
        <button style={{
          padding: '5px 10px', borderRadius: 6,
          background: '#1b1d24', color: '#ffffff',
          fontSize: 11, fontWeight: 700, border: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
        }}>不感兴趣</button>
        <button style={{
          padding: '5px 10px', borderRadius: 6,
          background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
          color: '#ffffff', fontSize: 11, fontWeight: 700, border: 'none',
          boxShadow: '0 4px 10px rgba(251, 79, 134, 0.35)', whiteSpace: 'nowrap',
        }}>不看TA</button>
      </div>
    </div>
  )
}
