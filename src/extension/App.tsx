import { useEffect, useState } from 'react'
import ProfileTab from './components/ProfileTab'
import HistoryTab from './components/HistoryTab'
import KeywordsTab from './components/KeywordsTab'
import SettingsTab from './components/SettingsTab'
import OnboardingScreen from './components/OnboardingScreen'
import { storage } from './lib/storage'

type Tab = 'profile' | 'history' | 'keywords' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: '兴趣画像' },
  { id: 'history', label: '观看记录' },
  { id: 'keywords', label: '关键词' },
  { id: 'settings', label: '设置' },
]

export default function App() {
  const [active, setActive] = useState<Tab>('profile')
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  // Chrome popup 失焦自动关闭，配置长字段时极不友好。检测当前是否在独立标签页里渲染，
  // 在 popup 模式下显示一个"↗ 在新标签页打开"按钮；在 tab 模式下给 body 加 class
  // 让 index.css 把应用渲染成居中卡片。
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

  const headerLauncher = !isInTab && (
    <button
      onClick={openInTab}
      title="在新标签页打开（弹窗失焦会自动关闭，标签页不会）"
      className="ml-auto text-gray-400 hover:text-bili-pink text-base leading-none px-1.5 py-0.5 rounded transition-colors"
    >
      ↗
    </button>
  )

  // popup 模式靠 h-full + flex-1 overflow-hidden 把内容钉成"头-tab-内容-保存栏"
  // 的固定高度盒子，但在 tab 模式下这会让保存栏粘到视口底部、跟内容之间出现大片空白。
  // tab 模式直接走 natural flow：去掉外层 h-full、内容包裹去掉 flex-1/overflow-hidden，
  // 内部组件的 h-full 因父层无固定高度而退化成 auto，保存栏自然跟在内容之后。
  const outerCls = isInTab
    ? 'flex flex-col bg-white'
    : 'flex flex-col h-full bg-white'
  const paneCls = isInTab ? '' : 'flex-1 overflow-hidden'

  if (!onboardingDone) {
    return (
      <div className={outerCls}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: '#fb7299' }}>B</div>
          <span className="text-sm font-semibold text-gray-800">我的 Bilibili 推荐</span>
          {headerLauncher}
        </div>
        <div className={paneCls}>
          <OnboardingScreen onDone={() => setOnboardingDone(true)} />
        </div>
      </div>
    )
  }

  return (
    <div className={outerCls}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
          style={{ background: '#fb7299' }}>B</div>
        <span className="text-sm font-semibold text-gray-800">我的 Bilibili 推荐</span>
        {headerLauncher}
      </div>

      <div className="flex border-b border-gray-100">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              active === tab.id
                ? 'text-bili-pink border-b-2 border-bili-pink'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={paneCls}>
        {active === 'profile' && <ProfileTab />}
        {active === 'history' && <HistoryTab />}
        {active === 'keywords' && <KeywordsTab />}
        {active === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
