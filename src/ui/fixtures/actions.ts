// src/ui/fixtures/actions.ts
// Demo data. ONLY promo (and future remotion) may import this; extension/
// imports would defeat tree-shaking and inflate the extension bundle.
//
// Design rules (see spec §4):
// - Fictional titles + UP names (no real Bilibili videos)
// - bvid uses BV1placeholder0X format (never real BV/AV IDs)
// - timestamps are relative to now() so promo screenshots always look fresh
// - watchRatio distribution covers all 3 legend colors: ≥80% (7 entries),
//   40-79% (3 entries), <40% (1 entry)
import type { Action } from '../types'

const HOUR = 60 * 60 * 1000
const now = () => Date.now()

let counter = 0
const bvid = () => `BV1placeholder0${String(++counter).padStart(2, '0')}`

export const recentActions: Action[] = [
  { type: 'play', bvid: bvid(), title: 'Rust 异步原理，这一次彻底搞懂', upName: '编程胡说',     watchRatio: 0.93, watchedSeconds: 1458, durationSeconds: 1562, timestamp: now() - 3   * HOUR },
  { type: 'play', bvid: bvid(), title: '京都拍了三天 vlog · 一个人',       upName: '小南行旅',    watchRatio: 0.87, watchedSeconds: 702,  durationSeconds: 808,  timestamp: now() - 5   * HOUR },
  { type: 'play', bvid: bvid(), title: '前端 2026 还能学点什么',           upName: '野生程序员',  watchRatio: 0.65, watchedSeconds: 415,  durationSeconds: 634,  timestamp: now() - 6   * HOUR },
  { type: 'disinterested', bvid: bvid(), title: '营销号又开始编新闻了',   upName: '热点观察',    timestamp: now() - 8   * HOUR },
  { type: 'play', bvid: bvid(), title: '深度解读 RISC-V 在 2026',         upName: '硬核电子',    watchRatio: 0.34, watchedSeconds: 198,  durationSeconds: 578,  timestamp: now() - 22  * HOUR },
  { type: 'blockUp',                                                       upName: '热点观察',    timestamp: now() - 25  * HOUR },
  { type: 'play', bvid: bvid(), title: '我把家里厨房翻新了',               upName: '木墨工作室',  watchRatio: 0.91, watchedSeconds: 1102, durationSeconds: 1210, timestamp: now() - 32  * HOUR },
  { type: 'play', bvid: bvid(), title: '用 Zig 写一个小型解释器',           upName: '玩具语言实验室', watchRatio: 0.78, watchedSeconds: 880, durationSeconds: 1128, timestamp: now() - 48  * HOUR },
  { type: 'play', bvid: bvid(), title: '挪威自驾八日记 · 上集',            upName: '远行手记',    watchRatio: 0.95, watchedSeconds: 1620, durationSeconds: 1705, timestamp: now() - 56  * HOUR },
  { type: 'disinterested', bvid: bvid(), title: '震惊！xxx 居然...',       upName: '今日热搜君',  timestamp: now() - 64  * HOUR },
  { type: 'play', bvid: bvid(), title: '从零写一个 Markdown 编辑器',       upName: '小白学前端',  watchRatio: 0.42, watchedSeconds: 410,  durationSeconds: 976,  timestamp: now() - 72  * HOUR },
  { type: 'play', bvid: bvid(), title: '深度科普：量子计算的边界',           upName: '理论物理君',  watchRatio: 0.88, watchedSeconds: 1320, durationSeconds: 1500, timestamp: now() - 96  * HOUR },
  { type: 'blockUp',                                                       upName: '今日热搜君',  timestamp: now() - 104 * HOUR },
  { type: 'play', bvid: bvid(), title: '一个人去看了首尔的书店',             upName: '小南行旅',    watchRatio: 0.81, watchedSeconds: 612,  durationSeconds: 756,  timestamp: now() - 120 * HOUR },
  { type: 'play', bvid: bvid(), title: 'macOS 15 实际用了一个月',           upName: '数码档案室',  watchRatio: 0.55, watchedSeconds: 540,  durationSeconds: 982,  timestamp: now() - 144 * HOUR },
]
