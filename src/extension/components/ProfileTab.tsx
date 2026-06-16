// src/extension/components/ProfileTab.tsx
import { useEffect, useState } from 'react'
import { storage } from '../lib/storage'
import type { UserProfile, AnalysisState } from '@/ui/types'
import ProfileView from '@/ui/ProfileView'

export default function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [msg, setMsg] = useState('')
  const [counter, setCounter] = useState({ since: 0, threshold: 5 })
  const [harvestOn, setHarvestOn] = useState<boolean | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)

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
    }
    load()
  }, [profile])

  const save = async (updated: UserProfile) => {
    setProfile(updated)
    await storage.setProfile(updated)
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
      onAnalyze={handleAnalyze}
      onEditProfile={save}
    />
  )
}
