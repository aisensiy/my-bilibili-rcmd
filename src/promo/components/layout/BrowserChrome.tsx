// Browser frame mock: traffic light + active tab + back/forward/reload + address bar.
// Used by scenes to wrap a B 站 page mock. The body region renders children.
import type { CSSProperties, ReactNode } from 'react'

interface BrowserChromeProps {
  url: string
  tabTitle: string
  children: ReactNode
  /** Outer positioning + sizing (left/right/top/bottom/width/height) */
  style?: CSSProperties
}

export default function BrowserChrome({ url, tabTitle, children, style }: BrowserChromeProps) {
  return (
    <section style={{
      position: 'absolute',
      borderRadius: 8,
      background: '#ffffff',
      border: '1px solid #e6eaf0',
      boxShadow: '0 16px 28px rgba(22, 26, 34, 0.18)',
      overflow: 'hidden',
      zIndex: 3,
      ...style,
    }}>
      {/* 顶栏：traffic + tab */}
      <div style={{
        height: 43,
        borderBottom: '1px solid #edf0f5',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 15px',
        background: '#fbfcfe',
      }}>
        <div style={{ display: 'flex', gap: 9 }}>
          <i style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f84', display: 'block' }} />
          <i style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffb14a', display: 'block' }} />
          <i style={{ width: 12, height: 12, borderRadius: '50%', background: '#68707d', display: 'block' }} />
        </div>
        <div style={{
          width: 238, height: 36,
          marginLeft: 18, marginBottom: -1,
          border: '1px solid #edf0f5',
          borderBottomColor: 'white',
          borderRadius: '8px 8px 0 0',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 13px',
          fontSize: 13,
          color: '#171b26',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <span style={{
              width: 20, height: 20, borderRadius: 5, color: 'white',
              background: '#fb7299',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800,
            }}>B</span>
            {tabTitle}
          </div>
          <span>×</span>
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          color: '#8a92a1', background: '#eef2f7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>+</div>
      </div>
      {/* 地址栏 */}
      <div style={{
        height: 46,
        borderBottom: '1px solid #edf0f5',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 18px',
        color: '#8b95a4',
      }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span>
        <span style={{ fontSize: 22, lineHeight: 1 }}>›</span>
        <span style={{ fontSize: 22, lineHeight: 1 }}>↻</span>
        <div style={{
          height: 29, flex: 1,
          borderRadius: 999,
          background: '#f5f7fa',
          border: '1px solid #e4e8ef',
          display: 'flex',
          alignItems: 'center',
          padding: '0 17px',
          gap: 8,
          fontSize: 13,
          color: '#222733',
        }}>
          <span>▣</span>
          <span>{url}</span>
        </div>
      </div>
      {/* Body */}
      <div>{children}</div>
    </section>
  )
}
