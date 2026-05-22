// src/promo/scenes/filter-recommendations.tsx
// Second promo: filter + block unwanted recommendations.
// Narrative: left = bilibili feed with 3 card states (normal / filtered / hover-to-act);
//            right = 兴趣画像 popup showing the profile that drives filtering.
import Stage from '../components/layout/Stage'
import BrowserChrome from '../components/layout/BrowserChrome'
import BiliPage from '../components/bilibili/BiliPage'
import VideoCard, { type VideoCardData } from '../components/bilibili/VideoCard'
import FilteredCard from '../components/bilibili/FilteredCard'
import HoverActions from '../components/bilibili/HoverActions'

import PopupShell from '@/ui/PopupShell'
import ProfileView from '@/ui/ProfileView'
import { demoProfile } from '@/ui/fixtures/profile'

// Card 1: Normal — a healthy positive recommendation
const NORMAL_CARD: VideoCardData = {
  title: '深度科普：量子计算的边界',
  upName: '理论物理君',
  cover: 'blue-tech',
  plays: '23.7万',
  duration: '24:55',
  timeAgo: '4 天前',
}

// Card 2: Filtered — marketing bait that hits the user's keyword rule
const FILTERED_CARD: VideoCardData = {
  title: '震惊！明星xxx的家庭真相曝光',
  upName: '今日热搜君',
  cover: 'gray-tech',
  plays: '92.5万',
  duration: '03:18',
  timeAgo: '2 小时前',
}

// Card 3: Hover state — normal card with action callout visible
const HOVER_CARD: VideoCardData = {
  title: 'iPhone 18 上手体验 · 真实评测',
  upName: '数码档案室',
  cover: 'purple-tech',
  plays: '15.2万',
  duration: '12:44',
  timeAgo: '1 天前',
}

export default function FilterRecommendationsScene() {
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
          屏蔽不想看的<span style={{ color: '#ff4f86' }}>推荐内容</span>
        </h1>
        <p style={{ marginTop: 16, fontSize: 20, lineHeight: 1.4, fontWeight: 600, color: '#5e6677' }}>
          按兴趣画像和关键词，自动过滤垃圾信息
        </p>
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 800, lineHeight: 1,
            background: '#1b1d24',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>不感兴趣</div>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 800, lineHeight: 1,
            background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>不看TA</div>
        </div>
      </section>

      {/* 左下：浏览器外框 + B 站推荐流（3 种卡片状态） */}
      <BrowserChrome
        url="bilibili.com"
        tabTitle="哔哩哔哩"
        style={{ left: 43, bottom: 56, width: 740, height: 380 }}
      >
        <BiliPage>
          <VideoCard data={NORMAL_CARD} />
          <FilteredCard data={FILTERED_CARD} reason="营销号" />
          <HoverActions>
            <VideoCard data={HOVER_CARD} />
          </HoverActions>
        </BiliPage>
      </BrowserChrome>

      {/* 右浮：兴趣画像 popup */}
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
        <PopupShell active="profile" variant="popup">
          <ProfileView profile={demoProfile} />
        </PopupShell>
      </aside>
    </Stage>
  )
}
