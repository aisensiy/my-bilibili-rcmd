// src/promo/scenes/keywords-blocking.tsx
// Third promo: manual keyword blocking.
// Narrative: left = three cards that ALL got blocked, each one annotated with
//            the exact手输 keyword it matched;
//            right = popup KeywordsView showing the user's keyword list — the
//            popup's first three list items map 1:1 to the badges on the left
//            ("用户写了这三个词 → 这三张直接消失").
// Differentiation from filter-recommendations: that scene was AI 兴趣画像 with
// a mix of states; this scene is uniform "manual rules in action".
import Stage from '../components/layout/Stage'
import BrowserChrome from '../components/layout/BrowserChrome'
import BiliPage from '../components/bilibili/BiliPage'
import FilteredCard from '../components/bilibili/FilteredCard'
import type { VideoCardData } from '../components/bilibili/VideoCard'

import PopupShell from '@/ui/PopupShell'
import KeywordsView from '@/ui/KeywordsView'
import { demoKeywords } from '@/ui/fixtures/keywords'

// 3 keyword-blocked cards. The reasons (震惊体 / 塌房 / 搬运) are the first
// three entries of demoKeywords — promo viewer can trace 左→右 directly.
const BLOCKED_CARDS: { data: VideoCardData; reason: string }[] = [
  {
    data: { title: '震惊！xxx 居然在镜头前做了这个', upName: '今日热搜君', cover: 'warm-sunset', plays: '87.6万', duration: '03:22', timeAgo: '1 小时前' },
    reason: '震惊体',
  },
  {
    data: { title: '某明星塌房现场全程曝光', upName: '热点观察', cover: 'gray-tech', plays: '152.3万', duration: '04:18', timeAgo: '3 小时前' },
    reason: '塌房',
  },
  {
    data: { title: '国外热门解说 5 分钟搬运合集', upName: '万能解说员', cover: 'orange-warm', plays: '32.8万', duration: '05:00', timeAgo: '5 小时前' },
    reason: '搬运',
  },
]

export default function KeywordsBlockingScene() {
  return (
    <Stage>
      {/* 顶部品牌区 + 右上隐私徽章 */}
      <div style={{
        position: 'absolute',
        top: 48, left: 79, right: 79,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 25, fontWeight: 900,
            boxShadow: '0 10px 24px rgba(251, 79, 134, 0.28)',
          }}>B</div>
          <div>
            <div style={{ fontSize: 27, lineHeight: 1.05, fontWeight: 800, color: '#171b26' }}>
              我的 Bilibili 推荐
            </div>
            <div style={{ marginTop: 8, fontSize: 18, lineHeight: 1.1, color: '#748094' }}>
              Chrome 扩展程序
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 46, padding: '0 18px 0 14px',
          borderRadius: 999,
          background: 'linear-gradient(135deg, #09a9e7 0%, #0b93d7 100%)',
          color: '#ffffff', fontSize: 17, fontWeight: 800,
          boxShadow: '0 15px 28px rgba(0, 161, 214, 0.28)',
        }}>
          <svg width={28} height={28} viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 3.5 26 7.3v7.8c0 6.2-4.2 11.8-10 13.4C10.2 26.9 6 21.3 6 15.1V7.3l10-3.8Z" fill="rgba(255,255,255,.96)"/>
            <path d="m12.2 15.9 2.4 2.5 5.5-6" fill="none" stroke="#129bdd" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          本地隐私生效
        </div>
      </div>

      {/* Hero 文案 */}
      <section style={{ position: 'absolute', left: 79, top: 155, zIndex: 3 }}>
        <h1 style={{ width: 720, fontSize: 56, lineHeight: 1.18, fontWeight: 900, color: '#171b26' }}>
          手输关键词，<span style={{ color: '#ff4f86' }}>说屏蔽就屏蔽</span>
        </h1>
        <p style={{ marginTop: 16, fontSize: 20, lineHeight: 1.4, fontWeight: 600, color: '#5e6677' }}>
          比 AI 更直接：临时热点、不想刷到的话题，一次输入立即过滤
        </p>
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 800, lineHeight: 1,
            background: '#1b1d24',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>手输硬规则</div>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 800, lineHeight: 1,
            background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>立即生效</div>
        </div>
      </section>

      {/* 左下：浏览器外框 + 推荐流（全部被关键词命中） */}
      <BrowserChrome
        url="bilibili.com"
        tabTitle="哔哩哔哩"
        style={{ left: 43, bottom: 56, width: 740, height: 380 }}
      >
        <BiliPage>
          {BLOCKED_CARDS.map((card, i) => (
            <FilteredCard key={i} data={card.data} reason={card.reason} />
          ))}
        </BiliPage>
      </BrowserChrome>

      {/* 右浮：真实 popup（用 ui 组件渲染，KeywordsView 自动 read-only） */}
      <aside style={{
        position: 'absolute',
        right: 79, top: 130,
        width: 389, height: 670,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'white',
        border: '1px solid #e7ebf1',
        boxShadow: '0 18px 30px rgba(24, 30, 42, 0.18)',
        zIndex: 5,
      }}>
        <PopupShell active="keywords" variant="popup">
          <KeywordsView keywords={demoKeywords} />
        </PopupShell>
      </aside>
    </Stage>
  )
}
