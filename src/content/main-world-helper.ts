// Main-world helper. Bilibili's Vue listeners only respond to events from the
// page's main world; content-script (isolated-world) dispatches are ignored.
// This script is registered as a content script with world: "MAIN" so it runs
// in the page's JS context. The isolated-world content script communicates
// with it via window.postMessage.

interface DispatchRequest {
  source: 'bf-ext'
  kind: 'dispatch-events'
  token: string
  attr: string
  types: string[]
}

function isDispatchRequest(data: unknown): data is DispatchRequest {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return d.source === 'bf-ext' && d.kind === 'dispatch-events'
    && typeof d.token === 'string' && typeof d.attr === 'string'
    && Array.isArray(d.types)
}

const TAG = '%c[BiliFilter:MW]'
const STYLE = 'color:#00a1d6;font-weight:bold'

console.log(TAG, STYLE, 'helper loaded in main world')

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return
  if (!isDispatchRequest(event.data)) return

  const { token, attr, types } = event.data
  const el = document.querySelector(`[${attr}="${CSS.escape(token)}"]`)
  if (!el) {
    console.log(TAG, STYLE, 'no element for token', token)
    return
  }

  console.log(TAG, STYLE, 'dispatching', types.join(','), 'on', (el as Element).tagName, (el as Element).className)

  for (const type of types) {
    try {
      if (type.startsWith('pointer') && typeof PointerEvent === 'function') {
        el.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, view: window,
          pointerType: 'mouse', isPrimary: true,
        }))
      } else {
        el.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true, view: window,
        }))
      }
    } catch (e) {
      console.warn(TAG, STYLE, 'dispatch failed for', type, e)
    }
  }
})

window.postMessage({ source: 'bf-ext-helper', kind: 'ready' }, '*')
