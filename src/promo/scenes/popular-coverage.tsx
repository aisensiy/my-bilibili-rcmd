// src/promo/scenes/popular-coverage.tsx
// Promo: the extension's filtering + 不感兴趣 / 不看TA now cover the bilibili
// 热门 page (/v/popular/all), not just the homepage.
// Left  = real popular page: one filtered card (hit a profile rule) + one card
//         with the corner action buttons shown.
// Right = real 观看记录 popup, whose top two rows are exactly those two
//         popular-page taps — the "tap on 热门 → logged as behavior" chain.
import Stage from '../components/layout/Stage'
import BrowserChrome from '../components/layout/BrowserChrome'
import PopularPage from '../components/bilibili/PopularPage'
import PopularCard, { type PopularCardData } from '../components/bilibili/PopularCard'
import FilteredPopularCard from '../components/bilibili/FilteredPopularCard'
import PopularHoverActions from '../components/bilibili/PopularHoverActions'

import PopupShell from '@/ui/PopupShell'
import HistoryView from '@/ui/HistoryView'
import type { Action } from '@/ui/types'
import { recentActions } from '@/ui/fixtures/actions'
import { demoStats } from '@/ui/fixtures/stats'

const MIN = 60 * 1000

// Left popular-page cards (fictional titles/UPs, gradient covers — no real covers)
const NORMAL_CARD: PopularCardData = {
  title: '深度科普：量子计算的边界', upName: '理论物理君', cover: 'blue-tech',
  reason: '人气飙升', plays: '23.7万', danmaku: '2.1万', duration: '24:55',
}
const FILTERED_CARD: PopularCardData = {
  title: '震惊！明星xxx的家庭真相曝光', upName: '今日热搜君', cover: 'gray-tech',
  reason: '百万播放', plays: '92.5万', danmaku: '3147', duration: '03:18',
}
const HOVER_CARD: PopularCardData = {
  title: 'macOS 15 实际用了一个月', upName: '数码档案室', cover: 'purple-tech',
  reason: '百万播放', plays: '15.2万', danmaku: '510', duration: '12:44',
}
const NORMAL_CARD_2: PopularCardData = {
  title: '挪威自驾八日记 · 上集', upName: '远行手记', cover: 'green-life',
  reason: '6万点赞', plays: '8.1万', danmaku: '1024', duration: '18:30',
}

// Right popup history: first two rows are the popular-page taps above; the rest
// are real play actions from the fixture (indices chosen for varied titles that
// fill the visible popup rows — reselect by intent if the fixture order changes).
const HISTORY_ACTIONS: Action[] = [
  { type: 'disinterested', bvid: 'BV1placeholder00', title: '震惊！明星xxx的家庭真相曝光', upName: '今日热搜君', timestamp: Date.now() - 1 * MIN },
  { type: 'blockUp', upName: '数码档案室', timestamp: Date.now() - 2 * MIN },
  recentActions[0],
  recentActions[2],
  recentActions[6],
]

export default function PopularCoverageScene() {
  return (
    <Stage>
      {/* 顶部品牌区 + 右上隐私徽章 (copied from filter-recommendations) */}
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
            fontSize: 25, fontWeight: 800,
            boxShadow: '0 10px 24px rgba(251, 79, 134, 0.28)',
          }}>B</div>
          <div>
            <div style={{ fontSize: 27, lineHeight: 1.05, fontWeight: 700, color: '#171b26' }}>
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
          color: '#ffffff', fontSize: 17, fontWeight: 400,
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
        <h1 style={{ width: 700, fontSize: 56, lineHeight: 1.18, fontWeight: 400, color: '#171b26' }}>
          热门页，也帮你<span style={{ color: '#ff4f86' }}>筛一遍</span>
        </h1>
        <p style={{ marginTop: 16, fontSize: 20, lineHeight: 1.4, fontWeight: 500, color: '#5e6677' }}>
          过滤和「不感兴趣 / 不看TA」现在覆盖热门、排行榜
        </p>
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 700, lineHeight: 1,
            background: '#1b1d24',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>不感兴趣</div>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 700, lineHeight: 1,
            background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>不看TA</div>
        </div>
      </section>

      {/* 左下：浏览器外框 + 热门页（综合热门，4 张横向卡片） */}
      <BrowserChrome
        url="bilibili.com/v/popular/all"
        tabTitle="哔哩哔哩热门"
        style={{ left: 43, bottom: 48, width: 740, height: 404 }}
      >
        <PopularPage>
          <PopularCard data={NORMAL_CARD} />
          <FilteredPopularCard data={FILTERED_CARD} reason="营销号" />
          <PopularHoverActions>
            <PopularCard data={HOVER_CARD} />
          </PopularHoverActions>
          <PopularCard data={NORMAL_CARD_2} />
        </PopularPage>
      </BrowserChrome>

      {/* 右浮：真实 popup（观看记录，含热门页刚点的两条行为） */}
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
        <PopupShell active="history" variant="popup">
          <HistoryView actions={HISTORY_ACTIONS} stats={demoStats} />
        </PopupShell>
      </aside>
    </Stage>
  )
}
