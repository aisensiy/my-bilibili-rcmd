// src/promo/scenes/history-insights.tsx
// First promo: history + completion ratio.
// Narrative: left = user browsing bilibili recommend stream;
//            right = extension silently records (with completion ratio)
// What this scene explicitly does NOT show (saved for filter-recommendations):
//   keyword-hit fading, blocked-UP empty slots, hover 不感兴趣/不看TA callouts.
import Stage from '../components/layout/Stage'
import BrowserChrome from '../components/layout/BrowserChrome'
import BiliPage from '../components/bilibili/BiliPage'
import VideoCard, { type VideoCardData } from '../components/bilibili/VideoCard'

import PopupShell from '@/ui/PopupShell'
import HistoryView from '@/ui/HistoryView'
import { recentActions } from '@/ui/fixtures/actions'
import { demoStats } from '@/ui/fixtures/stats'

// 3 recommend-stream cards matching recentActions[0..2] so the
// reader can visually trace "saw this video → it's the top history row".
const RECOMMEND_CARDS: VideoCardData[] = [
  { title: 'Rust 异步原理，这一次彻底搞懂', upName: '编程胡说',  cover: 'blue-tech',   plays: '12.3万', duration: '26:02', timeAgo: '3 小时前' },
  { title: '京都拍了三天 vlog · 一个人',     upName: '小南行旅',  cover: 'warm-sunset', plays: '8.6万',  duration: '13:28', timeAgo: '5 小时前' },
  { title: '前端 2026 还能学点什么',         upName: '野生程序员', cover: 'gray-tech',   plays: '2.1万',  duration: '10:34', timeAgo: '6 小时前' },
]

export default function HistoryInsightsScene() {
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
        <h1 style={{ width: 690, fontSize: 56, lineHeight: 1.18, fontWeight: 900, color: '#171b26' }}>
          AI <span style={{ color: '#ff4f86' }}>越来越懂你</span>
        </h1>
        <p style={{ marginTop: 16, fontSize: 20, lineHeight: 1.4, fontWeight: 600, color: '#5e6677' }}>
          完播率、标题、UP 全部本地留下 —— AI 拿来生成越来越准的兴趣画像
        </p>
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 800, lineHeight: 1,
            background: '#1b1d24',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>完播率</div>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 800, lineHeight: 1,
            background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>画像更准</div>
        </div>
      </section>

      {/* 左下：浏览器外框 + B 站推荐流 */}
      <BrowserChrome
        url="bilibili.com"
        tabTitle="哔哩哔哩"
        style={{ left: 43, bottom: 56, width: 740, height: 380 }}
      >
        <BiliPage>
          {RECOMMEND_CARDS.map((card, i) => <VideoCard key={i} data={card} />)}
        </BiliPage>
      </BrowserChrome>

      {/* 右浮：真实 popup（用 ui 组件渲染） */}
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
          <HistoryView actions={recentActions.slice(0, 5)} stats={demoStats} />
        </PopupShell>
      </aside>
    </Stage>
  )
}
