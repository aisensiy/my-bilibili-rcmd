// B 站推荐流模拟：顶部 nav + 卡片网格（children 驱动）。
// 各 scene 自行组合 VideoCard / FilteredCard / HoverActions 等子节点传入。
import type { ReactNode } from 'react'

export default function BiliPage({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '20px 18px 18px', background: '#ffffff' }}>
      {/* 模拟 bilibili nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, height: 28, marginBottom: 16 }}>
        <div style={{ fontSize: 27, lineHeight: 1, fontWeight: 900, color: '#fb7299', marginRight: 10 }}>bilibili</div>
        {['首页', '番剧', '直播', '游戏中心', '会员购'].map(t => (
          <span key={t} style={{ fontSize: 13, fontWeight: 700, color: '#333845' }}>{t}</span>
        ))}
        <div style={{ marginLeft: 'auto', width: 220, height: 28, borderRadius: 7, background: '#f5f7fa', border: '1px solid #e9edf3', color: '#a0a8b5', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12 }}>搜索视频、UP主或番剧</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}
