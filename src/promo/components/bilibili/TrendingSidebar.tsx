// Mock of bilibili 动态页右侧「bilibili热搜」卡片（.bili-dyn-search-trendings）。
// Promo-only presentational component: 一条热搜正处于「屏蔽中」状态（淡出 + 粉色
// 「屏蔽」按钮），底部浮一个 toast，演示动态页热搜「屏蔽话题」这个动作。
interface TrendingItem {
  text: string
  blocking?: boolean
}

// 第 1 条是正在被屏蔽的话题（与右侧观看记录顶部的「屏蔽话题」行对应）；
// 其余为中性填充热搜（不在观看记录里 —— 已屏蔽的话题本就会从列表消失）。
const TRENDINGS: TrendingItem[] = [
  { text: '卡厄思梦境柯洁TVC', blocking: true },
  { text: '城市夜骑路线攻略' },
  { text: '期末复习计划表' },
  { text: '国产单机新作实测' },
  { text: '周末露营装备清单' },
]

const RANK_COLORS = ['#fb7299', '#ff7a45', '#faad14']

export default function TrendingSidebar() {
  return (
    <div style={{
      position: 'relative',
      width: 300,
      background: '#ffffff',
      border: '1px solid #eef1f5',
      borderRadius: 10,
      padding: '16px 16px 18px',
      boxShadow: '0 8px 22px rgba(24, 30, 42, 0.08)',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#18191c', marginBottom: 12 }}>
        bilibili热搜
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {TRENDINGS.map((item, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: item.blocking ? 0.45 : 1,
            }}
          >
            <span style={{
              width: 18,
              flexShrink: 0,
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 800,
              color: i < 3 ? RANK_COLORS[i] : '#9499a0',
            }}>{i + 1}</span>
            <span style={{
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              color: '#3a3f47',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{item.text}</span>
            {item.blocking && (
              <button style={{
                flexShrink: 0,
                padding: '3px 11px',
                border: 'none',
                borderRadius: 5,
                background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.3,
                boxShadow: '0 4px 10px rgba(251, 79, 134, 0.32)',
              }}>屏蔽</button>
            )}
          </div>
        ))}
      </div>

      {/* 底部 toast：屏蔽完成反馈 */}
      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: -18,
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        background: 'rgba(27, 29, 36, 0.92)',
        color: '#ffffff',
        fontSize: 12.5,
        fontWeight: 600,
        padding: '8px 14px',
        borderRadius: 8,
        boxShadow: '0 10px 22px rgba(24, 30, 42, 0.24)',
      }}>
        已屏蔽话题「卡厄思梦境柯洁TVC」
      </div>
    </div>
  )
}
