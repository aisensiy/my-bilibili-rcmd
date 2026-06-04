// src/promo/scenes/hot-search-block.tsx
// 动态页热搜「屏蔽话题」promo。
// 叙事：左 = 动态页右侧 bilibili热搜，一条热搜正被屏蔽（淡出 + 屏蔽按钮 + toast）；
//       右 = 真实 popup 观看记录，「屏蔽话题」作为一种行为和播放/不感兴趣/不看TA 并列。
// 左是动作（点屏蔽），右是结果（记成行为）——因果跨两栏阅读，不夸大即时过滤推荐流。
import Stage from '../components/layout/Stage'
import BrowserChrome from '../components/layout/BrowserChrome'
import TrendingSidebar from '../components/bilibili/TrendingSidebar'

import PopupShell from '@/ui/PopupShell'
import HistoryView from '@/ui/HistoryView'
import type { Action } from '@/ui/types'
import { recentActions } from '@/ui/fixtures/actions'
import { demoStats } from '@/ui/fixtures/stats'

const HOUR = 60 * 60 * 1000

// 顶部「屏蔽话题」对应左侧正在被屏蔽的热搜；第二条是更早屏蔽的话题（已从热搜列表
// 消失，所以不出现在左侧）。中间夹播放/不感兴趣/不看TA，体现它只是又一种行为。
const HISTORY_ACTIONS: Action[] = [
  { type: 'blockTopic', phrase: '卡厄思梦境柯洁TVC', timestamp: Date.now() - 1 * HOUR },
  recentActions[0],
  recentActions[3],
  { type: 'blockTopic', phrase: '新版本英雄强度榜', timestamp: Date.now() - 6 * HOUR },
  recentActions[5],
]

// 左侧动态信息流的淡化骨架（只为给热搜栏一个真实的页面语境，不抢焦点）。
function DynFeedSkeleton() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, opacity: 0.85 }}>
      {[0, 1].map(i => (
        <div key={i} style={{
          background: '#f7f9fc',
          border: '1px solid #e7ecf3',
          borderRadius: 10,
          padding: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#d8dee7' }} />
            <div>
              <div style={{ width: 90, height: 9, borderRadius: 5, background: '#d8dee7' }} />
              <div style={{ width: 56, height: 8, borderRadius: 5, background: '#e3e8ef', marginTop: 7 }} />
            </div>
          </div>
          <div style={{ width: '92%', height: 9, borderRadius: 5, background: '#d8dee7' }} />
          <div style={{ width: '74%', height: 9, borderRadius: 5, background: '#e3e8ef', marginTop: 9 }} />
          <div style={{ marginTop: 11, height: 40, borderRadius: 8, background: '#e3e8ef' }} />
        </div>
      ))}
    </div>
  )
}

export default function HotSearchBlockScene() {
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
        <h1 style={{ width: 720, fontSize: 56, lineHeight: 1.18, fontWeight: 400, color: '#171b26' }}>
          热搜点一下，<span style={{ color: '#ff4f86' }}>话题别再上榜</span>
        </h1>
        <p style={{ marginTop: 16, fontSize: 20, lineHeight: 1.4, fontWeight: 500, color: '#5e6677' }}>
          屏蔽的话题记成行为，喂给 AI 画像，顺带过滤同类推荐
        </p>
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 700, lineHeight: 1,
            background: '#1b1d24',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>一键屏蔽</div>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 700, lineHeight: 1,
            background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>记成行为</div>
        </div>
      </section>

      {/* 左下：浏览器外框 + 动态页（淡化信息流 + bilibili热搜） */}
      <BrowserChrome
        url="t.bilibili.com"
        tabTitle="哔哩哔哩 动态"
        style={{ left: 43, bottom: 56, width: 740, height: 392 }}
      >
        <div style={{
          display: 'flex',
          gap: 22,
          padding: '22px 24px 28px',
          alignItems: 'flex-start',
          background: '#ffffff',
        }}>
          <DynFeedSkeleton />
          <TrendingSidebar />
        </div>
      </BrowserChrome>

      {/* 右浮：真实 popup（观看记录，含「屏蔽话题」行） */}
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
