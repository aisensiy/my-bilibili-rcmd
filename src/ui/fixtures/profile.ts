// src/ui/fixtures/profile.ts
import type { UserProfile } from '../types'

export const demoProfile: UserProfile = {
  interests:    ['编程教学', '深度科普', '数码评测', 'Vlog 旅行', '历史人文'],
  disinterests: ['营销号内容', '热点搬运', '标题党测评', '游戏直播切片'],
  blockedUps:   ['热点观察', '今日热搜君', '万能解说员'],
  analysis: '最近 50 条偏向技术教学和长视频旅拍，对热点搬运、营销号类标题点过多次"不感兴趣"。整体观看完播率较高，是个有明确偏好的用户。',
  lastUpdated: Date.now() - 8 * 60 * 60 * 1000,
}
