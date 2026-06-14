// src/extension/components/ProfileTab.tsx
import { useEffect, useState } from 'react'
import { storage } from '../lib/storage'
import type { UserProfile, AnalysisState, Action, ImpressionRecord, PlayAction } from '@/ui/types'
import ProfileView from '@/ui/ProfileView'

function computeKeywordSources(
  keywords: string[],
  actions: Action[],
  impressions: ImpressionRecord[],
): Record<string, { text: string; kind: 'blocked' | 'seen' }[]> {
  const blocked: string[] = []
  for (const a of actions) {
    if (a.type === 'disinterested' && a.title) blocked.push(a.title)
    else if (a.type === 'blockTopic' && a.phrase) blocked.push(a.phrase)
  }
  const seen = impressions.map(i => i.title).filter(Boolean)
  const map: Record<string, { text: string; kind: 'blocked' | 'seen' }[]> = {}
  for (const kw of keywords) {
    const low = kw.toLowerCase()
    const hits: { text: string; kind: 'blocked' | 'seen' }[] = []
    for (const t of blocked) if (t.toLowerCase().includes(low)) hits.push({ text: t, kind: 'blocked' })
    for (const t of seen) if (t.toLowerCase().includes(low)) hits.push({ text: t, kind: 'seen' })
    map[kw] = hits
  }
  return map
}

export default function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [msg, setMsg] = useState('')
  const [counter, setCounter] = useState({ since: 0, threshold: 5 })
  const [harvestOn, setHarvestOn] = useState<boolean | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)
  const [keywordSources, setKeywordSources] = useState<Record<string, { text: string; kind: 'blocked' | 'seen' }[]> | undefined>(undefined)

  useEffect(() => {
    storage.getProfile().then(setProfile)

    // 打开弹窗时拉一次后台分析状态，恢复"分析中"UI
    chrome.runtime.sendMessage({ type: 'query_analysis_state' })
      .then(res => { if (res?.state) setAnalysis(res.state) })
      .catch(() => {})

    const handler = (message: any) => {
      if (message.type === 'profile_progress') {
        setAnalysis(message.state)
      }
      if (message.type === 'profile_updated') {
        setProfile(message.profile)
        setMsg('分析完成！')
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  useEffect(() => {
    const load = async () => {
      const [since, settings] = await Promise.all([
        storage.getActionsSinceLastAnalysis(),
        storage.getSettings(),
      ])
      setCounter({ since, threshold: settings.triggerThreshold })
      setHarvestOn(settings.harvestImpressions)
      if (settings.debugMode && profile) {
        const [actions, impressions] = await Promise.all([storage.getActions(), storage.getImpressions()])
        setKeywordSources(computeKeywordSources(profile.disinterestKeywords, actions, impressions))
      } else {
        setKeywordSources(undefined)
      }
    }
    load()
  }, [profile])

  const save = async (updated: UserProfile) => {
    setProfile(updated)
    await storage.setProfile(updated)
  }

  const handleExport = async () => {
    try {
      const [prof, actions, impressions] = await Promise.all([
        storage.getProfile(),
        storage.getActions(),
        storage.getImpressions(),
      ])
      const blocked = actions
        .filter(a => a.type === 'disinterested' || a.type === 'blockUp' || a.type === 'blockTopic')
        .map(a =>
          a.type === 'disinterested' ? { type: a.type, title: a.title, upName: a.upName }
          : a.type === 'blockUp' ? { type: a.type, upName: a.upName }
          : { type: a.type, phrase: a.phrase })
      const liked = actions
        .filter((a): a is PlayAction => a.type === 'play' && a.watchRatio > 0.5)
        .map(a => ({ title: a.title, upName: a.upName, watchRatio: a.watchRatio }))
      const snapshot = {
        exportedAt: new Date().toISOString(),
        profile: {
          interests: prof.interests,
          disinterests: prof.disinterests,
          disinterestKeywords: prof.disinterestKeywords,
          dismissedKeywords: prof.dismissedKeywords,
          analysis: prof.analysis,
        },
        blocked,
        liked,
        impressions: impressions.map(i => ({ title: i.title, upName: i.upName })),
      }
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
      setMsg('已复制分析数据到剪贴板')
    } catch (e) {
      setMsg('导出失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const handleAnalyze = async () => {
    setMsg('')
    // 触发即返回——进度通过 profile_progress 广播驱动 UI
    await chrome.runtime.sendMessage({ type: 'analyze_profile' }).catch(() => {
      setMsg('启动分析失败')
    })
  }

  if (!profile) return <div className="p-4 text-xs text-gray-400">加载中...</div>

  return (
    <ProfileView
      profile={profile}
      counter={counter}
      analysis={analysis}
      msg={msg}
      harvestOn={harvestOn ?? undefined}
      keywordSources={keywordSources}
      onAnalyze={handleAnalyze}
      onEditProfile={save}
      onExport={handleExport}
    />
  )
}
