import { useEffect, useState } from 'react'
import { storage, type Settings, DEFAULT_SETTINGS } from '../lib/storage'
import { PROVIDERS, type ProviderId, callProvider, ensureCustomHostPermission } from '../../lib/providers'
import type { PlayAction } from '@/ui/types'
import AboutSection from './AboutSection'
import SettingsView from '@/ui/SettingsView'

const PROVIDER_IDS: ProviderId[] = ['openrouter', 'glm', 'deepseek', 'custom']

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  // savedSnapshot 记录最近一次写入 storage 的 settings，用于判断"未保存修改"。
  // null 表示初次加载尚未完成。
  const [savedSnapshot, setSavedSnapshot] = useState<Settings | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [exportMsg, setExportMsg] = useState('')
  // 检测当前 SettingsTab 是否渲染在独立标签页里。popup 模式下要提示用户
  // 粘贴长 URL/Key 时弹窗会失焦关闭，建议切到标签页配置。
  const [isInTab, setIsInTab] = useState(false)

  useEffect(() => {
    storage.getSettings().then(s => {
      setSettings(s)
      setSavedSnapshot(s)
    })
    chrome.tabs.getCurrent(tab => setIsInTab(!!tab))
  }, [])

  const isDirty = savedSnapshot !== null
    && JSON.stringify(settings) !== JSON.stringify(savedSnapshot)

  const active = settings.activeProvider
  const cfg = settings.providers[active]

  const switchProvider = (next: ProviderId) => {
    setSettings(s => ({ ...s, activeProvider: next }))
    setTestStatus('idle')
    setTestMsg('')
  }

  const updateProviderCfg = (patch: { apiKey?: string; model?: string; baseUrl?: string }) => {
    setSettings(s => ({
      ...s,
      providers: { ...s.providers, [active]: { ...s.providers[active], ...patch } },
    }))
  }

  const updateThreshold = (n: number) => {
    setSettings(s => ({ ...s, triggerThreshold: n }))
  }

  const toggleDebug = () => {
    const next = { ...settings, debugMode: !settings.debugMode }
    setSettings(next)
    storage.setSettings(next)
    setSavedSnapshot(next)
  }

  const toggleHarvest = () => {
    const next = { ...settings, harvestImpressions: !settings.harvestImpressions }
    setSettings(next)
    storage.setSettings(next)
    setSavedSnapshot(next)
    // 关闭采集时清空已收集的曝光池（隐私上不留存）
    if (!next.harvestImpressions) storage.clearImpressions().catch(console.error)
  }

  // 导出「屏蔽相关数据」JSON 到剪贴板，供拿去外部 AI 分析提词（开发者/调试工具）。
  const exportData = async () => {
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
      setExportMsg('已复制分析数据到剪贴板')
      setTimeout(() => setExportMsg(''), 2000)
    } catch (e) {
      setExportMsg('导出失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const testConnection = async () => {
    const key = cfg.apiKey.trim()
    if (!key) { setTestStatus('fail'); setTestMsg('请先填写 API Key'); return }
    if (!cfg.model.trim()) { setTestStatus('fail'); setTestMsg('请先填写模型 id'); return }
    if (active === 'custom' && !(cfg.baseUrl ?? '').trim()) {
      setTestStatus('fail'); setTestMsg('请先填写 Base URL'); return
    }

    // MV3 下 custom baseUrl 不在 host_permissions 时 fetch 会被拦截。
    // 把权限请求放在 setState 之前，避免吃掉用户手势上下文。
    if (active === 'custom') {
      const perm = await ensureCustomHostPermission(cfg.baseUrl)
      if (!perm.ok) {
        setTestStatus('fail')
        setTestMsg(perm.reason === 'bad-url' ? 'Base URL 格式不正确' : '未授予该域名访问权限，无法连接')
        return
      }
    }

    setTestStatus('testing')
    setTestMsg('')

    const baseOpts = {
      provider: active,
      apiKey: key,
      model: cfg.model.trim(),
      baseUrl: cfg.baseUrl?.trim(),
      messages: [{ role: 'user' as const, content: '用一句话说你好，不超过10个字。' }],
    }

    // 先走"快路径"：关闭思考 + 1024 token 预算，连通验证又快又省。
    let result = await callProvider({ ...baseOpts, reasoning: 'off', maxTokens: 1024 })

    // 部分思考型模型不接受 thinking/reasoning 关闭参数（返回 4xx），
    // 或忽略后仍然思考把 1024 吃光（finish_reason=length，无 content）。
    // 退到"慢路径"：不传 reasoning，预算抬到 4096 给思考留空间。
    if (!result.ok) {
      result = await callProvider({ ...baseOpts, maxTokens: 4096 })
    }

    if (!result.ok) {
      setTestStatus('fail')
      setTestMsg(result.errorMessage ?? `HTTP ${result.errorStatus ?? '???'}`)
    } else {
      setTestStatus('ok')
      setTestMsg(`模型回复：${result.content}`)
    }
  }

  const save = async () => {
    // 保存设置时也提前请求 custom 域的权限。否则用户填完直接 Save 没点过 Test，
    // 后台自动分析触发时拿不到权限、又不在用户手势里没法弹框，分析会静默失败。
    if (settings.activeProvider === 'custom') {
      const cur = settings.providers.custom
      if ((cur.baseUrl ?? '').trim()) {
        const perm = await ensureCustomHostPermission(cur.baseUrl)
        if (!perm.ok) {
          setTestStatus('fail')
          setTestMsg(perm.reason === 'bad-url'
            ? 'Base URL 格式不正确，未保存'
            : '需要授予该域名访问权限才能使用 custom provider，未保存')
          return
        }
      }
    }
    await storage.setSettings(settings)
    setSavedSnapshot(settings)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const reopenOnboarding = async () => {
    await storage.setSettings({ ...settings, onboardingComplete: false })
    window.close()
  }

  const clearAll = async () => {
    if (confirm('确认清除所有记录和画像？此操作不可撤销。')) {
      await chrome.storage.local.clear()
      window.location.reload()
    }
  }

  return (
    <SettingsView
      providers={PROVIDERS}
      providerIds={PROVIDER_IDS}
      settings={settings}
      isDirty={isDirty}
      savedFlash={savedFlash}
      isInTab={isInTab}
      testStatus={testStatus}
      testMsg={testMsg}
      onSwitchProvider={switchProvider}
      onUpdateProviderCfg={updateProviderCfg}
      onUpdateThreshold={updateThreshold}
      onToggleDebug={toggleDebug}
      onExportData={exportData}
      exportMsg={exportMsg}
      onToggleHarvest={toggleHarvest}
      onTestConnection={testConnection}
      onSave={save}
      onOpenInTab={() => chrome.runtime.openOptionsPage()}
      onReopenOnboarding={reopenOnboarding}
      onClearAll={clearAll}
      aboutSlot={<AboutSection />}
    />
  )
}
