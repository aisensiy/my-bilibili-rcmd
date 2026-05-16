import { useState } from 'react'
import ProfileTab from './components/ProfileTab'
import HistoryTab from './components/HistoryTab'
import KeywordsTab from './components/KeywordsTab'
import SettingsTab from './components/SettingsTab'

type Tab = 'profile' | 'history' | 'keywords' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: '兴趣画像' },
  { id: 'history', label: '观看记录' },
  { id: 'keywords', label: '关键词' },
  { id: 'settings', label: '设置' },
]

export default function App() {
  const [active, setActive] = useState<Tab>('profile')

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
          style={{ background: '#fb7299' }}>
          B
        </div>
        <span className="text-sm font-semibold text-gray-800">我的 Bilibili 推荐</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              active === tab.id
                ? 'text-[#fb7299] border-b-2 border-[#fb7299]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {active === 'profile' && <ProfileTab />}
        {active === 'history' && <HistoryTab />}
        {active === 'keywords' && <KeywordsTab />}
        {active === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
