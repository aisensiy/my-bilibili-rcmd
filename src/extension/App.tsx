import { useEffect, useState } from 'react'
import ProfileTab from './components/ProfileTab'
import HistoryTab from './components/HistoryTab'
import KeywordsTab from './components/KeywordsTab'
import SettingsTab from './components/SettingsTab'
import OnboardingScreen from './components/OnboardingScreen'
import PopupShell, { type TabId } from '@/ui/PopupShell'
import { storage } from './lib/storage'

export default function App() {
  const [active, setActive] = useState<TabId>('profile')
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  // Chrome popup 失焦自动关闭，配置长字段时极不友好。检测是否在独立 tab 里渲染：
  // - popup 模式：让 PopupShell 显示 ↗ 按钮
  // - tab 模式：给 body 加 class 让 index.css 把应用渲染成居中卡片
  const [isInTab, setIsInTab] = useState(false)

  useEffect(() => {
    storage.getSettings().then(s => setOnboardingDone(s.onboardingComplete))
    chrome.tabs.getCurrent(tab => {
      const inTab = !!tab
      setIsInTab(inTab)
      if (inTab) document.body.classList.add('tab-mode')
    })
  }, [])

  const openInTab = () => chrome.runtime.openOptionsPage()

  if (onboardingDone === null) {
    return <div className="flex items-center justify-center h-full text-xs text-gray-400">加载中...</div>
  }

  // Onboarding 不显示 4-tab 切换栏，所以不用 PopupShell。
  // 复制其顶部条样式（B logo + 名字 + ↗ 按钮）保持视觉一致。
  if (!onboardingDone) {
    return (
      <div className={isInTab ? 'flex flex-col bg-white' : 'flex flex-col h-full bg-white'}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: '#fb7299' }}>B</div>
          <span className="text-sm font-semibold text-gray-800">我的 Bilibili 推荐</span>
          {!isInTab && (
            <button onClick={openInTab} title="在新标签页打开"
              className="ml-auto text-gray-400 hover:text-bili-pink text-base leading-none px-1.5 py-0.5 rounded transition-colors">↗</button>
          )}
        </div>
        <div className={isInTab ? '' : 'flex-1 overflow-hidden'}>
          <OnboardingScreen onDone={() => setOnboardingDone(true)} />
        </div>
      </div>
    )
  }

  return (
    <PopupShell
      active={active}
      onChange={setActive}
      onOpenInTab={!isInTab ? openInTab : undefined}
      variant={isInTab ? 'tab' : 'popup'}
    >
      {active === 'profile'  && <ProfileTab />}
      {active === 'history'  && <HistoryTab />}
      {active === 'keywords' && <KeywordsTab />}
      {active === 'settings' && <SettingsTab />}
    </PopupShell>
  )
}
