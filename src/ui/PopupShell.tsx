// src/ui/PopupShell.tsx
import type { ReactNode } from 'react'

export type TabId = 'profile' | 'history' | 'keywords' | 'settings'

export interface TabSpec {
  id: TabId
  label: string
}

export const DEFAULT_TABS: TabSpec[] = [
  { id: 'profile', label: '兴趣画像' },
  { id: 'history', label: '观看记录' },
  { id: 'keywords', label: '关键词' },
  { id: 'settings', label: '设置' },
]

interface PopupShellProps {
  active: TabId
  onChange?: (id: TabId) => void
  /** Right-side ↗ button (open in new tab). Only rendered when callback provided. */
  onOpenInTab?: () => void
  /** Layout variant: popup window (default) vs full-tab page. promo passes 'popup'. */
  variant?: 'popup' | 'tab'
  /** Override the default 4 tabs (e.g. promo rendering a single tab focus). */
  tabs?: TabSpec[]
  children: ReactNode
}

export default function PopupShell({
  active,
  onChange,
  onOpenInTab,
  variant = 'popup',
  tabs = DEFAULT_TABS,
  children,
}: PopupShellProps) {
  const outerCls = variant === 'tab'
    ? 'flex flex-col bg-white'
    : 'flex flex-col h-full bg-white'
  const paneCls = variant === 'tab' ? '' : 'flex-1 overflow-hidden'

  return (
    <div className={outerCls}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
          style={{ background: '#fb7299' }}
        >B</div>
        <span className="text-sm font-semibold text-gray-800">我的 Bilibili 推荐</span>
        {onOpenInTab && (
          <button
            onClick={onOpenInTab}
            title="在新标签页打开（弹窗失焦会自动关闭，标签页不会）"
            className="ml-auto text-gray-400 hover:text-bili-pink text-base leading-none px-1.5 py-0.5 rounded transition-colors"
          >↗</button>
        )}
      </div>

      <div className="flex border-b border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange?.(tab.id)}
            disabled={!onChange}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              active === tab.id
                ? 'text-bili-pink border-b-2 border-bili-pink'
                : 'text-gray-500 hover:text-gray-700 disabled:hover:text-gray-500'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      <div className={paneCls}>{children}</div>
    </div>
  )
}
