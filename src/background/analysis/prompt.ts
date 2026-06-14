// src/background/analysis/prompt.ts
//
// 「分析输入」领域模型 + 提示词渲染。原先 buildProfile 把样本塑形和一大坨模板
// 字符串揉在一起；这里拆成两步：
//   buildAnalysisInput  —— 从原始数据塑形出「这次 LLM 看到什么」（值对象）
//   renderAnalysisPrompt —— 把值对象拼成提示词（纯字符串，可脱离后台单独调参）
// LLM 之后的关键词流水线（filterCandidates/mergeKeywords/pruneGrounded）不在此文件，
// 仍在 service-worker.ts——它们是确定性过滤，不属于提示词构建。

import type { Action, PlayAction, UserProfile } from '../../extension/lib/storage'

// 采样策略常量（原先散落在 buildProfile 里的魔法数字）。
const MAX_RECENT_ACTIONS = 50
const MAX_LIKED = 30
const LIKED_WATCH_MIN = 0.5
const IMPRESSION_WINDOW = 500

/** 正样本：完播率高的一条 play，作为「爱看」护栏喂给 LLM。 */
export interface LikedSample {
  title: string
  upName: string
  watchRatio: number
}

/** 负样本信号：不感兴趣(标题+UP) / 不看TA(UP) / 屏蔽话题(短语)。 */
export type DislikedSignal =
  | { title: string; upName: string }
  | { upName: string }
  | { phrase: string }

/** 曝光样本：推荐流里真实刷到的一张卡。 */
export interface ImpressionSample {
  title: string
  upName: string
}

/** 已知关键词上下文：已生效(别重复提) + 黑名单(禁止再提)。 */
export interface KnownKeywords {
  active: string[]
  dismissed: string[]
}

/** 一次分析里 LLM 看到的全部输入——提示词的唯一数据源。 */
export interface AnalysisInput {
  liked: LikedSample[]
  disliked: DislikedSignal[]
  impressions: ImpressionSample[]
  known: KnownKeywords
  currentProfile: UserProfile
}

/**
 * 从原始 storage 数据塑形出 AnalysisInput——所有切片/过滤/采样策略集中在此。
 * 曝光仅在采集开关开时纳入（关时为空数组，行为与原先一致）。
 */
export function buildAnalysisInput(
  actions: Action[],
  userProfile: UserProfile,
  settings: { harvestImpressions?: boolean } | undefined,
  impressions: unknown,
): AnalysisInput {
  const recentActions = actions.slice(0, MAX_RECENT_ACTIONS)

  const liked = recentActions
    .filter((a): a is PlayAction => a.type === 'play')
    .filter(a => a.watchRatio > LIKED_WATCH_MIN)
    .slice(0, MAX_LIKED)
    .map(a => ({ title: a.title, upName: a.upName, watchRatio: a.watchRatio }))

  const disliked: DislikedSignal[] = recentActions
    .filter(a => a.type === 'disinterested' || a.type === 'blockUp' || a.type === 'blockTopic')
    .map(a => {
      if (a.type === 'blockTopic') return { phrase: a.phrase }
      if (a.type === 'blockUp') return { upName: a.upName }
      return { title: a.title, upName: a.upName }
    })

  const harvestOn = settings?.harvestImpressions === true
  const impressionList: ImpressionSample[] = harvestOn && Array.isArray(impressions)
    ? (impressions as ImpressionSample[])
        .slice(0, IMPRESSION_WINDOW)
        .map(i => ({ title: i.title, upName: i.upName }))
    : []

  const known: KnownKeywords = {
    active: Array.isArray(userProfile.disinterestKeywords) ? userProfile.disinterestKeywords : [],
    dismissed: Array.isArray(userProfile.dismissedKeywords) ? userProfile.dismissedKeywords : [],
  }

  return { liked, disliked, impressions: impressionList, known, currentProfile: userProfile }
}

/**
 * 把 AnalysisInput 渲染成发给 LLM 的提示词。纯函数：同输入同输出，可单独调参。
 * 指令与全部护栏规则就是下面这段模板。
 */
export function renderAnalysisPrompt(input: AnalysisInput): string {
  const { liked, disliked } = input
  const userProfile = input.currentProfile
  const activeKeywords = input.known.active
  const dismissedKeywords = input.known.dismissed
  const impressionSection = input.impressions.length > 0
    ? `\n【刷到的（推荐流采样，未必看过/屏蔽过，共 ${input.impressions.length} 条）】：\n${JSON.stringify(input.impressions, null, 2)}\n`
    : ''

  return `你是一个分析用户 Bilibili 观看行为的助手。根据正负样本更新画像，并从中提取"本轮新发现"的、可用于"标题子串匹配"的具体屏蔽词。只返回严格的 JSON，不要任何其他文字。

【爱看】（完播率较高，代表用户真的喜欢，共 ${liked.length} 条）：
${JSON.stringify(liked, null, 2)}

【不想看】（用户点了"不感兴趣"/"不看TA"或主动屏蔽的话题，共 ${disliked.length} 条）：
${JSON.stringify(disliked, null, 2)}
${impressionSection}
当前画像（参考，用户可能手动改过，请尊重其编辑）：
${JSON.stringify(userProfile, null, 2)}

已生效的屏蔽词（已经在拦了，不要重复输出）：
${JSON.stringify(activeKeywords, null, 2)}

用户删过的词（黑名单，绝对不要再输出）：
${JSON.stringify(dismissedKeywords, null, 2)}

返回以下 JSON 格式：
{
  "interests": ["标签1", ...],
  "disinterests": ["概念标签1", ...],
  "blockedUps": ["UP主名1", ...],
  "disinterestKeywords": ["本轮新发现的候选词1", ...],
  "analysis": "用中文简要描述用户偏好和行为模式（2-3句话）"
}

注意：
- interests / disinterests 是给用户看的"画像镜子"：概念化的喜欢/不喜欢类型（如"科技"、"营销号内容"），不要求能匹配标题。
- blockedUps 来自"不看TA"行为，直接取 upName。
- disinterestKeywords 这次只输出"本轮新发现的候选词"（最多 10 个）。硬性规则：
  - 必须字面溯源：每个词都得是【不想看】或【刷到的】标题里"确实出现过的连续字面片段"。没在这两组真实标题里出现过的词，一律不要输出——哪怕它看起来像很典型的套路词。（这条是为了避免凭印象编出用户根本没刷到的词。）
  - 可泛化优先：在"确实出现过"的前提下，挑那些"换一条同类新视频、还很可能出现在标题里"的词（通用标题党/营销话术、反复出现的固定人设或桥段说法）；只命中单条视频的一次性专名（具体人名、事件名、独一无二的事物名）不要。
  - 不重复 / 不误伤：不要输出"已生效的屏蔽词"和"黑名单"里的词；绝对不要输出会命中任何一条【爱看】标题的词（先用【爱看】做校验）；不要"游戏""科技"这种宽泛大词。没把握就给空数组。
  - 不要通用网络流行语/弹幕梗/口头禅（如"破防""难绷""逆天""yyds""完蛋了""我愿称之为""绝绝子"这类）——它们在喜欢和不喜欢的内容里都出现，会误伤；只要与"垃圾/营销/标题党/短剧"内容强绑定的词。
  - 来自【刷到的】的词，优先选"在多条不同标题里反复出现"的（出现越多越可能是套路）；只在单条标题里出现的曝光片段不要（除非它来自【不想看】）。`
}
