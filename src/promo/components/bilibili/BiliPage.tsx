// B 站推荐流模拟：顶部 nav + 3×2 视频网格。
// 本张 promo（history-insights）只展示"普通推荐流"——
// 不画命中关键词淡化、不画屏蔽 UP 空位、不画 hover callout。
// 那些是 filter-recommendations scene 的故事。
import VideoCard, { type VideoCardData } from './VideoCard'

export default function BiliPage({ cards }: { cards: VideoCardData[] }) {
  return (
    <div style={{
      padding: '20px 18px 18px',
      background: '#ffffff',
    }}>
      {/* 模拟 bilibili nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        height: 28,
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 27, lineHeight: 1, fontWeight: 900,
          color: '#fb7299', marginRight: 10,
        }}>bilibili</div>
        {['首页', '番剧', '直播', '游戏中心', '会员购'].map(t => (
          <span key={t} style={{ fontSize: 13, fontWeight: 700, color: '#333845' }}>{t}</span>
        ))}
        <div style={{
          marginLeft: 'auto',
          width: 220, height: 28,
          borderRadius: 7,
          background: '#f5f7fa',
          border: '1px solid #e9edf3',
          color: '#a0a8b5',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontSize: 12,
        }}>搜索视频、UP主或番剧</div>
      </div>

      {/* 卡片网格：1 行 × 3 列 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
      }}>
        {cards.slice(0, 3).map((card, i) => (
          <VideoCard key={i} data={card} />
        ))}
      </div>
    </div>
  )
}
