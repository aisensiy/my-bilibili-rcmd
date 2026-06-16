// src/ui/ProfileView.tsx
import { useEffect, useState } from 'react'
import type { UserProfile, AnalysisState } from './types'
import TagList from './TagList'

interface ProfileViewProps {
  profile: UserProfile
  counter?: { since: number; threshold: number }
  analysis?: AnalysisState | null
  /** Latest user-visible status message (e.g. "分析完成！" / "启动分析失败"). */
  msg?: string
  /** 设置里"采集推荐流标题"是否开启——关时在 AI 屏蔽词下提示可开启增强。 */
  harvestOn?: boolean
  onAnalyze?: () => void
  onEditProfile?: (next: UserProfile) => void
}

export default function ProfileView({
  profile, counter, analysis, msg, harvestOn, onAnalyze, onEditProfile,
}: ProfileViewProps) {
  const analyzing = analysis?.running ?? false
  // 分析中每秒触发一次重渲染显示已用秒数
  const [, tick] = useState(0)

  useEffect(() => {
    if (!analyzing) return
    const id = setInterval(() => tick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [analyzing])

  const elapsedSec = analyzing && analysis?.startedAt
    ? Math.max(0, Math.floor((Date.now() - analysis.startedAt) / 1000))
    : 0

  const save = (next: UserProfile) => onEditProfile?.(next)

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 pb-2">
        {/* AI profile — read-only mirror; AI derives all of this from your behavior */}
        <div className="flex items-center gap-1.5 mb-1">
          <svg className="w-4 h-4 text-bili-blue shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-sm font-bold text-gray-800">画像 · AI 看到的你</span>
          {profile.lastUpdated !== 0 && (
            <span className="ml-auto shrink-0 text-[10px] font-normal text-gray-400">
              更新于 {new Date(profile.lastUpdated).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed mb-2.5">
          由你的观看与屏蔽行为自动生成；想调整就多看或主动屏蔽相应内容，下次分析会更新。
        </p>

        <div className="text-xs text-gray-600 leading-relaxed mb-3">
          {profile.lastUpdated === 0 ? (
            <>
              <div className="font-medium text-gray-700 mb-1">AI 还不认识你</div>
              {counter && (
                <div>
                  已记录 {counter.since} 条行为，再看 {Math.max(counter.threshold - counter.since, 0)} 个视频就会自动生成你的画像。
                </div>
              )}
            </>
          ) : (
            profile.analysis || '尚未分析。'
          )}
        </div>

        <TagList
          label="喜欢的内容"
          hint="AI 推断你喜欢的方向，不参与过滤"
          color="#00a1d6"
          tags={profile.interests}
        />

        <TagList
          label="不感兴趣"
          hint="AI 推断你不喜欢的方向，不参与过滤"
          color="#fb7299"
          tags={profile.disinterests}
        />

        {/* Your block controls (editable) — flat section, divider above, matching other tabs */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5 mb-2.5">
            <svg className="w-4 h-4 text-bili-pink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-sm font-bold text-gray-800">你的屏蔽（可编辑）</span>
          </div>

          <TagList
            label="AI 自动屏蔽词（匹配标题）"
            hint="AI 从你不想看的内容里提取的字面词，匹配标题即隐藏。可增删"
            color="#fb7299"
            tags={profile.disinterestKeywords}
            onAdd={onEditProfile && (tag => save({
              ...profile,
              disinterestKeywords: [...profile.disinterestKeywords, tag],
              dismissedKeywords: profile.dismissedKeywords.filter(t => t !== tag),
            }))}
            onRemove={onEditProfile && (tag => save({
              ...profile,
              disinterestKeywords: profile.disinterestKeywords.filter(t => t !== tag),
              dismissedKeywords: profile.dismissedKeywords.includes(tag)
                ? profile.dismissedKeywords
                : [...profile.dismissedKeywords, tag],
            }))}
          />
          {onEditProfile && profile.disinterestKeywords.length > 0 && (
            <button
              onClick={() => {
                if (confirm('清空当前「AI 自动屏蔽词」列表？黑名单保留，下次分析会重新生成。')) {
                  save({ ...profile, disinterestKeywords: [] })
                }
              }}
              className="block text-[11px] text-gray-500 hover:text-bili-pink underline decoration-dotted underline-offset-2 mb-3"
            >
              ↺ 重置 AI 屏蔽词（清空，保留黑名单）
            </button>
          )}
          {onEditProfile && harvestOn === false && (
            <p className="text-[10px] text-gray-400 -mt-2 mb-4 leading-relaxed">
              开启「采集推荐流标题」可让它更准（设置里）。
            </p>
          )}

          {onEditProfile && profile.dismissedKeywords.length > 0 && (
            <TagList
              label="AI 黑名单（删过的词，不再被提）"
              hint="你删掉的 AI 屏蔽词会进这里，分析不再提它们。× 移出可让它重新被提取；也能手动加词预先拉黑"
              color="#9e9e9e"
              tags={profile.dismissedKeywords}
              onAdd={tag => save({
                ...profile,
                dismissedKeywords: [...profile.dismissedKeywords, tag],
                disinterestKeywords: profile.disinterestKeywords.filter(t => t !== tag),
              })}
              onRemove={tag => save({
                ...profile,
                dismissedKeywords: profile.dismissedKeywords.filter(t => t !== tag),
              })}
            />
          )}

          <TagList
            label="屏蔽的 UP 主"
            hint="AI 从你的行为里提取，你也可以手动加"
            color="#9e9e9e"
            tags={profile.blockedUps}
            onAdd={onEditProfile && (tag => save({ ...profile, blockedUps: [...profile.blockedUps, tag] }))}
            onRemove={onEditProfile && (tag => save({ ...profile, blockedUps: profile.blockedUps.filter(t => t !== tag) }))}
          />
        </div>
      </div>

      {/* 固定底部操作栏，跟 SettingsTab 一致——常驻可见，内容较长时无需滚动找按钮 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        {analyzing && analysis && (
          <div className="mb-2 text-[11px] text-gray-600 leading-relaxed">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-bili-pink animate-pulse shrink-0" />
              {analysis.phase === 'requesting' && <span>正在连接模型... · {elapsedSec}s</span>}
              {analysis.phase === 'reasoning' && (
                <span>模型思考中 · {analysis.reasoningChars} 字 · {elapsedSec}s</span>
              )}
              {analysis.phase === 'streaming' && (
                <span>正在生成画像 · {analysis.contentChars} 字 · {elapsedSec}s</span>
              )}
            </div>
            {analysis.previewTail && (
              <div className="mt-1 px-1 font-mono text-[10px] text-gray-400 truncate" title={analysis.previewTail}>
                … {analysis.previewTail}
              </div>
            )}
            <div className="mt-1 text-[10px] text-gray-400">关闭弹窗也不会中断，分析在后台继续。</div>
          </div>
        )}
        {!analyzing && analysis?.phase === 'error' && analysis.errorMessage && (
          <div className="mb-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-sm px-2 py-1.5 leading-relaxed break-all">
            分析失败：{analysis.errorMessage}
          </div>
        )}
        <button
          onClick={onAnalyze}
          disabled={analyzing || !onAnalyze}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ background: '#fb7299' }}
        >
          {analyzing ? '分析中...' : (profile.lastUpdated === 0 ? '立即分析' : '立即重新分析')}
        </button>
        {!analyzing && analysis?.phase !== 'error' && msg && (
          <div className="mt-1.5 text-xs text-center text-gray-500">{msg}</div>
        )}
      </div>
    </div>
  )
}
