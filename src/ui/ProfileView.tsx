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
  onAnalyze?: () => void
  onEditProfile?: (next: UserProfile) => void
}

export default function ProfileView({
  profile, counter, analysis, msg, onAnalyze, onEditProfile,
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5">
          <div className="text-sm font-bold text-gray-800 mb-2.5">画像 · AI 看到的你</div>

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
              <>
                {profile.analysis || '尚未分析。'}
                <div className="mt-1 text-gray-400">
                  更新于 {new Date(profile.lastUpdated).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </>
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
        </div>

        <div className="text-sm font-bold text-gray-800 mb-2.5 pb-1.5 border-b border-gray-200">你的屏蔽（可编辑）</div>

        <TagList
          label="AI 自动屏蔽词（匹配标题）"
          hint="AI 从你不想看的内容里提取的字面词，匹配标题即隐藏。可增删"
          color="#fb7299"
          tags={profile.disinterestKeywords}
          onAdd={onEditProfile && (tag => save({ ...profile, disinterestKeywords: [...profile.disinterestKeywords, tag] }))}
          onRemove={onEditProfile && (tag => save({ ...profile, disinterestKeywords: profile.disinterestKeywords.filter(t => t !== tag) }))}
        />

        <TagList
          label="屏蔽的 UP 主"
          hint="AI 从你的行为里提取，你也可以手动加"
          color="#9e9e9e"
          tags={profile.blockedUps}
          onAdd={onEditProfile && (tag => save({ ...profile, blockedUps: [...profile.blockedUps, tag] }))}
          onRemove={onEditProfile && (tag => save({ ...profile, blockedUps: profile.blockedUps.filter(t => t !== tag) }))}
        />
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
