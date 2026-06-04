// src/promo/components/bilibili/PopularPage.tsx
// Popular-page shell rendered inside BrowserChrome: a category tab row
// (综合热门 active + 每周必看 / 入站必刷 / 排行榜 muted, each with a colored
// category dot), a subhead line, and a 2-column grid of children (the cards).
// Mirrors BiliPage's "shell + children" contract. Tabs match the spec's set
// (the real page also has 全站音乐榜; omitted to match the approved design).
import type { ReactNode } from 'react'

const TABS = [
  { label: '综合热门', dot: '#fb7299', active: true },
  { label: '每周必看', dot: '#f5c84b', active: false },
  { label: '入站必刷', dot: '#ff8a3d', active: false },
  { label: '排行榜', dot: '#ff6699', active: false },
]

export default function PopularPage({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '18px 20px 20px', background: '#ffffff' }}>
      {/* category tab row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 26, marginBottom: 14 }}>
        {TABS.map(t => (
          <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: t.dot, opacity: t.active ? 1 : 0.9,
              }} />
              <span style={{
                fontSize: 15, fontWeight: t.active ? 800 : 600,
                color: t.active ? '#18191c' : '#61666d',
              }}>{t.label}</span>
            </div>
            <span style={{
              width: 22, height: 3, borderRadius: 2,
              background: t.active ? '#fb7299' : 'transparent',
            }} />
          </div>
        ))}
      </div>
      {/* subhead */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 18, fontSize: 12, color: '#9499a0',
      }}>
        <span>各个领域中新奇好玩的优质内容都在这里~</span>
        <span>热门规则</span>
      </div>
      {/* 2-column card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 28px' }}>
        {children}
      </div>
    </div>
  )
}
