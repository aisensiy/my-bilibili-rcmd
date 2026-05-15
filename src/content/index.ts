// Bilibili 推荐优化 - Content Script
// Vanilla TS: avoids React instance conflicts with Bilibili's own Vue/React

interface CardInfo {
  bvid: string
  title: string
  upName: string
  uid: string
  element: HTMLElement
}

interface FilterData {
  profile: {
    interests: string[]
    disinterests: string[]
    blockedUps: string[]
  }
  keywords: string[]
  disinterestedBvids: Set<string>
  debugMode: boolean
}

interface PlayRecordPayload {
  type: 'play'
  bvid: string
  title: string
  upName: string
  uid: string
  watchRatio: number
  watchedSeconds: number
  durationSeconds: number
  timestamp: number
  sessionId: string
}

// ==================== State ====================
let filterData: FilterData = {
  profile: { interests: [], disinterests: [], blockedUps: [] },
  keywords: [],
  disinterestedBvids: new Set(),
  debugMode: false,
}

// ==================== Storage helpers ====================
function storageGet(keys: string[]): Promise<Record<string, any>> {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve))
}

function storageSet(data: Record<string, any>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(data, resolve))
}

async function loadFilterData(): Promise<void> {
  const { userProfile = {}, blockedKeywords = [], actions = [], settings = {} } = await storageGet([
    'userProfile', 'blockedKeywords', 'actions', 'settings',
  ])

  const disinterestedBvids = new Set<string>(
    actions
      .filter((a: any) => a.type === 'disinterested' && a.bvid)
      .map((a: any) => a.bvid as string)
  )

  const blockedUpsFromActions = actions
    .filter((a: any) => a.type === 'blockUp' && a.upName)
    .map((a: any) => a.upName as string)
  const mergedBlockedUps = Array.from(
    new Set<string>([...(userProfile.blockedUps ?? []), ...blockedUpsFromActions])
  )

  filterData = {
    profile: {
      interests: userProfile.interests ?? [],
      disinterests: userProfile.disinterests ?? [],
      blockedUps: mergedBlockedUps,
    },
    keywords: blockedKeywords,
    disinterestedBvids,
    debugMode: settings.debugMode ?? false,
  }
}

async function saveAction(action: Record<string, any>): Promise<void> {
  const { actions = [], actionsSinceLastAnalysis = 0 } = await storageGet([
    'actions', 'actionsSinceLastAnalysis',
  ])
  actions.unshift(action)
  if (actions.length > 500) actions.length = 500
  const newCount = actionsSinceLastAnalysis + 1

  await storageSet({ actions, actionsSinceLastAnalysis: newCount })

  // Ask background to check if analysis should be triggered
  chrome.runtime.sendMessage({ type: 'check_trigger' }).catch(() => {})

  // Update local state immediately for disinterested
  if (action.type === 'disinterested' && action.bvid) {
    filterData.disinterestedBvids.add(action.bvid)
  }
  if (action.type === 'blockUp' && action.upName) {
    if (!filterData.profile.blockedUps.includes(action.upName)) {
      filterData.profile.blockedUps.push(action.upName)
    }
  }
}

async function upsertPlayAction(action: PlayRecordPayload): Promise<void> {
  const { actions = [], actionsSinceLastAnalysis = 0 } = await storageGet([
    'actions', 'actionsSinceLastAnalysis',
  ])
  const nextActions = [...actions]
  const existingIndex = nextActions.findIndex((item: any) =>
    item.type === 'play' && item.sessionId === action.sessionId
  )

  if (existingIndex >= 0) nextActions[existingIndex] = action
  else nextActions.unshift(action)

  if (nextActions.length > 500) nextActions.length = 500

  await storageSet({
    actions: nextActions,
    actionsSinceLastAnalysis: existingIndex >= 0 ? actionsSinceLastAnalysis : actionsSinceLastAnalysis + 1,
  })

  if (existingIndex < 0) {
    chrome.runtime.sendMessage({ type: 'check_trigger' }).catch(() => {})
  }
}

// ==================== Card parsing ====================
const BV_RE = /\/video\/(BV\w+)/
const UID_RE = /space\.bilibili\.com\/(\d+)/
const HOMEPAGE_CARD_SELECTOR = '.bili-video-card'
const VIDEO_PAGE_CARD_SELECTOR = '.next-play .video-page-card-small, .rec-list .video-page-card-small'
const STYLE_ID = 'bf-ext-content-style'
const CONTENT_STYLE = `
.bf-ext-actions {
  position: absolute;
  bottom: 6px;
  right: 6px;
  display: flex;
  flex-direction: row;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 999;
  pointer-events: none;
}
.bili-video-card:hover .bf-ext-actions,
.video-page-card-small:hover .bf-ext-actions {
  opacity: 1;
  pointer-events: all;
}
.bf-ext-btn {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
  transition: transform 0.1s ease, opacity 0.1s ease;
  backdrop-filter: blur(4px);
}
.bf-ext-btn:hover {
  transform: scale(1.05);
  opacity: 1 !important;
}
.bf-ext-btn:active {
  transform: scale(0.97);
}
.bf-ext-btn--disinterest {
  background: rgba(30, 30, 30, 0.82);
  color: #ffffff;
}
.bf-ext-btn--blockup {
  background: rgba(251, 114, 153, 0.88);
  color: #ffffff;
}
.bf-ext-hidden-card {
  display: none !important;
}
/* Hide bilibili's native "..." trigger; our buttons proxy the same actions
 * and also forward to bilibili's feedback via the no-interest panel. */
.bili-video-card__info--no-interest {
  display: none !important;
}
.video-page-card-small {
  position: relative;
}
.video-page-card-small .bf-ext-actions {
  bottom: 4px;
  right: 4px;
}
.bf-ext-debug-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 998;
  pointer-events: none;
}
.bf-ext-debug-reason {
  color: #fff;
  font-size: 12px;
  padding: 4px 10px;
  background: rgba(251, 114, 153, 0.85);
  border-radius: 4px;
  pointer-events: none;
}
`

function parseHomepageCard(el: HTMLElement): CardInfo | null {
  const linkEl = el.querySelector<HTMLAnchorElement>('a.bili-video-card__image--link')
  const titleEl = el.querySelector<HTMLElement>('.bili-video-card__info--tit')
  const authorEl = el.querySelector<HTMLElement>('.bili-video-card__info--author')
  const ownerEl = el.querySelector<HTMLAnchorElement>('a.bili-video-card__info--owner')

  if (!linkEl || !titleEl) return null

  const bvidMatch = linkEl.href.match(BV_RE)
  const uidMatch = ownerEl?.href?.match(UID_RE)

  return {
    bvid: bvidMatch?.[1] ?? '',
    title: titleEl.textContent?.trim() ?? '',
    upName: authorEl?.textContent?.trim() ?? '',
    uid: uidMatch?.[1] ?? '',
    element: el,
  }
}

function parseSidebarCard(el: HTMLElement): CardInfo | null {
  const linkEl = el.querySelector<HTMLAnchorElement>('.framepreview-box a[href*="/video/"]')
  const titleEl = el.querySelector<HTMLElement>('.info p.title')
  const nameEl = el.querySelector<HTMLElement>('.upname span.name')
  const upLinkEl = el.querySelector<HTMLAnchorElement>('.upname a[href*="space.bilibili.com"]')

  if (!linkEl || !titleEl) return null

  const bvidMatch = linkEl.getAttribute('href')?.match(BV_RE)
  const uidMatch = upLinkEl?.href?.match(UID_RE)

  return {
    bvid: bvidMatch?.[1] ?? '',
    title: titleEl.textContent?.trim() ?? '',
    upName: nameEl?.textContent?.trim() ?? '',
    uid: uidMatch?.[1] ?? '',
    element: el,
  }
}

function isVideoPageCard(el: HTMLElement): boolean {
  return el.matches('.video-page-card-small') && !!el.closest('.next-play, .rec-list')
}

function isVideoPage(): boolean {
  return /^\/video\/BV\w+/.test(location.pathname)
}

function ensureContentStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CONTENT_STYLE
  document.head.appendChild(style)
}

function removeContentStyles(): void {
  document.getElementById(STYLE_ID)?.remove()
}

// ==================== Logging ====================
const LOG = (...args: any[]) => console.log('%c[BiliFilter]', 'color:#fb7299;font-weight:bold', ...args)

// ==================== Filter ====================
function shouldHide(info: CardInfo): string | null {
  const { profile, keywords, disinterestedBvids } = filterData

  if (info.upName && profile.blockedUps.some(up => up === info.upName))
    return `屏蔽UP主「${info.upName}」`

  if (info.bvid && disinterestedBvids.has(info.bvid))
    return `已标记不感兴趣`

  const matchedTag = profile.disinterests.find(tag =>
    info.title.toLowerCase().includes(tag.toLowerCase())
  )
  if (matchedTag) return `兴趣画像命中「${matchedTag}」`

  const matchedKw = keywords.find(kw =>
    info.title.toLowerCase().includes(kw.toLowerCase())
  )
  if (matchedKw) return `关键词命中「${matchedKw}」`

  return null
}

// ==================== Native feedback bridge ====================
// Click bilibili's own "..." menu item so the platform also receives the signal.

// Exact match only — fuzzy `[class*="no-interest"]` would catch the post-feedback
// overlay `.bili-video-card__no-interest` (display:none until feedback is sent),
// which is a sibling of the real trigger and appears earlier in DOM order.
const NATIVE_TRIGGER_SELECTOR = '.bili-video-card__info--no-interest'

function findNativeTrigger(cardEl: HTMLElement): HTMLElement | null {
  return cardEl.querySelector<HTMLElement>(NATIVE_TRIGGER_SELECTOR)
}

function isVisibleElement(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

const PANEL_SELECTOR = '.bili-video-card__info--no-interest-panel'
const PANEL_ITEM_SELECTOR = '.bili-video-card__info--no-interest-panel--item'

function snapshotPanels(): Set<Element> {
  return new Set(document.querySelectorAll(PANEL_SELECTOR))
}

function findMenuItemIn(panel: Element, menuText: string): HTMLElement | null {
  const items = panel.querySelectorAll<HTMLElement>(PANEL_ITEM_SELECTOR)
  for (const item of items) {
    if (item.textContent?.trim().includes(menuText)) return item
  }
  return null
}

// Prefer a panel that didn't exist before our dispatch (it belongs to the
// currently-triggered card). Fall back to any visible panel — covers the case
// where the panel already exists and is just being re-shown.
function findMenuItem(menuText: string, existingPanels: Set<Element>): HTMLElement | null {
  const allPanels = document.querySelectorAll<HTMLElement>(PANEL_SELECTOR)
  for (const panel of allPanels) {
    if (existingPanels.has(panel)) continue
    const item = findMenuItemIn(panel, menuText)
    if (item && isVisibleElement(item)) return item
  }
  for (const panel of allPanels) {
    const item = findMenuItemIn(panel, menuText)
    if (item && isVisibleElement(item)) return item
  }
  return null
}

const HOVER_IN_EVENTS = ['pointerover', 'pointerenter', 'mouseover', 'mouseenter']
const HOVER_OUT_EVENTS = ['pointerleave', 'pointerout', 'mouseleave', 'mouseout']
const MAIN_WORLD_DISPATCH_ATTR = 'data-bf-ext-mw-target'

let mwTokenCounter = 0

// Content scripts run in an isolated world. Bilibili's Vue listeners only respond
// to events fired from the page's main world, so we ask the main-world helper
// (registered as a separate content script with world: "MAIN") to dispatch them.
function dispatchHoverInMainWorld(el: HTMLElement, types: string[]): void {
  const token = `${Date.now()}-${++mwTokenCounter}`
  el.setAttribute(MAIN_WORLD_DISPATCH_ATTR, token)
  window.postMessage({
    source: 'bf-ext',
    kind: 'dispatch-events',
    token,
    attr: MAIN_WORLD_DISPATCH_ATTR,
    types,
  }, '*')
  // Helper consumes the request synchronously on the next microtask;
  // clean up shortly after so subsequent dispatches don't collide.
  setTimeout(() => el.removeAttribute(MAIN_WORLD_DISPATCH_ATTR), 50)
}

function countVisiblePanelItems(): number {
  let n = 0
  document.querySelectorAll<HTMLElement>('.bili-video-card__info--no-interest-panel--item').forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) n++
  })
  return n
}

async function triggerNativeFeedback(
  cardEl: HTMLElement,
  menuText: '内容不感兴趣' | '不想看此UP主'
): Promise<boolean> {
  const trigger = findNativeTrigger(cardEl)
  if (!trigger) {
    LOG(`原生反馈：未找到触发按钮 [${menuText}]`)
    return false
  }

  const existingPanels = snapshotPanels()
  LOG(`原生反馈：开始 [${menuText}] existingPanels=${existingPanels.size}`)

  // Fire hover events from main world to ensure Vue listeners receive them.
  dispatchHoverInMainWorld(cardEl, HOVER_IN_EVENTS)
  dispatchHoverInMainWorld(trigger, HOVER_IN_EVENTS)

  const deadline = Date.now() + 2000
  let lastReport = 0
  while (Date.now() < deadline) {
    const item = findMenuItem(menuText, existingPanels)
    if (item) {
      item.click()
      dispatchHoverInMainWorld(trigger, HOVER_OUT_EVENTS)
      dispatchHoverInMainWorld(cardEl, HOVER_OUT_EVENTS)
      LOG(`原生反馈：已点击 [${menuText}]`)
      return true
    }
    const now = Date.now()
    if (now - lastReport >= 300) {
      lastReport = now
      const panels = document.querySelectorAll(PANEL_SELECTOR).length
      const vis = countVisiblePanelItems()
      LOG(`原生反馈：poll panels=${panels} visibleItems=${vis} trigger.style="${trigger.getAttribute('style') ?? ''}"`)
    }
    await new Promise(r => setTimeout(r, 50))
  }

  const totalItems = document.querySelectorAll(PANEL_ITEM_SELECTOR).length
  LOG(`原生反馈：超时 [${menuText}] totalItems=${totalItems} visibleItems=${countVisiblePanelItems()}`)
  dispatchHoverInMainWorld(trigger, HOVER_OUT_EVENTS)
  dispatchHoverInMainWorld(cardEl, HOVER_OUT_EVENTS)
  return false
}

// ==================== Button injection ====================
function injectButtons(info: CardInfo, isHomepage: boolean): void {
  const wrap = isHomepage
    ? info.element.querySelector<HTMLElement>('.bili-video-card__info')
    : info.element.querySelector<HTMLElement>('.info')

  if (!wrap) return

  const container = document.createElement('div')
  container.className = 'bf-ext-actions'

  const disBtn = document.createElement('button')
  disBtn.className = 'bf-ext-btn bf-ext-btn--disinterest'
  disBtn.textContent = '不感兴趣'
  disBtn.title = '对这个内容不感兴趣'
  disBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!info.bvid) return
    LOG(`反馈：不感兴趣`, { bvid: info.bvid, title: info.title, upName: info.upName })
    // Forward to bilibili's native feedback so the platform also learns from this signal.
    await triggerNativeFeedback(info.element, '内容不感兴趣')
    await saveAction({
      type: 'disinterested',
      bvid: info.bvid,
      title: info.title,
      upName: info.upName,
      timestamp: Date.now(),
    })
    info.element.classList.add('bf-ext-hidden-card')
  })

  const upBtn = document.createElement('button')
  upBtn.className = 'bf-ext-btn bf-ext-btn--blockup'
  upBtn.textContent = '不看TA'
  upBtn.title = `屏蔽 ${info.upName} 的所有视频`
  upBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!info.upName) return
    LOG(`反馈：屏蔽UP主「${info.upName}」`, { uid: info.uid })
    await triggerNativeFeedback(info.element, '不想看此UP主')
    await saveAction({
      type: 'blockUp',
      upName: info.upName,
      uid: info.uid,
      timestamp: Date.now(),
    })
    // Hide all cards from this UP
    let hiddenCount = 0
    document.querySelectorAll<HTMLElement>('[data-bf-upname]').forEach(el => {
      if (el.dataset.bfUpname === info.upName) { el.classList.add('bf-ext-hidden-card'); hiddenCount++ }
    })
    LOG(`已隐藏「${info.upName}」的 ${hiddenCount} 个卡片`)
    info.element.classList.add('bf-ext-hidden-card')
  })

  container.appendChild(disBtn)
  container.appendChild(upBtn)

  // Make wrap relative for absolute positioning
  wrap.style.position = 'relative'
  wrap.appendChild(container)
}

function injectDebugOverlay(el: HTMLElement, reason: string): void {
  const overlay = document.createElement('div')
  overlay.className = 'bf-ext-debug-overlay'
  const reasonEl = document.createElement('span')
  reasonEl.className = 'bf-ext-debug-reason'
  reasonEl.textContent = reason
  overlay.appendChild(reasonEl)
  el.style.position = 'relative'
  el.appendChild(overlay)
}

// ==================== Process cards ====================
function processCard(el: HTMLElement, isHomepage: boolean): void {
  if (el.dataset.bfDone) return
  el.dataset.bfDone = '1'

  const info = isHomepage ? parseHomepageCard(el) : parseSidebarCard(el)
  if (!info) return

  // Store upname for bulk-hide on blockUp
  if (info.upName) el.dataset.bfUpname = info.upName

  const hideReason = shouldHide(info)
  if (hideReason) {
    LOG(`隐藏视频 [${hideReason}]`, `「${info.title}」- ${info.upName}`)
    if (filterData.debugMode) {
      injectDebugOverlay(el, hideReason)
    } else {
      el.classList.add('bf-ext-hidden-card')
      return
    }
  }

  injectButtons(info, isHomepage)
}

function processAllCards(): void {
  document.querySelectorAll<HTMLElement>(HOMEPAGE_CARD_SELECTOR).forEach(el => processCard(el, true))
  document.querySelectorAll<HTMLElement>(VIDEO_PAGE_CARD_SELECTOR).forEach(el => processCard(el, false))
}

function resetAllCards(): void {
  document.querySelectorAll<HTMLElement>('.bf-ext-hidden-card').forEach(el => {
    el.classList.remove('bf-ext-hidden-card')
  })
  document.querySelectorAll('.bf-ext-debug-overlay').forEach(el => el.remove())
  document.querySelectorAll<HTMLElement>('[data-bf-done]').forEach(el => {
    delete el.dataset.bfDone
  })
  document.querySelectorAll<HTMLElement>('.bf-ext-actions').forEach(el => el.remove())
}

// ==================== Video watch tracker ====================
// Exposed so SPA navigation can record-then-reset
let activeRecord: (() => void) | null = null
let trackerCleanup: (() => void) | null = null

function setupWatchTracker(): void {
  const bvidFromUrl = location.pathname.match(/\/video\/(BV\w+)/)?.[1]

  // Always save previous video before resetting (SPA navigation)
  activeRecord?.()
  trackerCleanup?.()
  activeRecord = null
  trackerCleanup = null

  if (!bvidFromUrl) return

  LOG('观看追踪：已启动', { bvid: bvidFromUrl })

  let watchedSeconds = 0
  let finalized = false
  let lastCurrentTime = 0
  let activeVideo: HTMLVideoElement | null = null
  let persistTimer: ReturnType<typeof window.setInterval> | null = null
  const sessionId = `${bvidFromUrl}:${Date.now()}`

  const buildPayload = (): PlayRecordPayload | null => {
    if (finalized) return null

    const state = window.__INITIAL_STATE__ as any
    const bvid: string = state?.bvid ?? bvidFromUrl
    const title: string = state?.videoData?.title
      ?? document.querySelector<HTMLElement>('.video-title')?.textContent?.trim()
      ?? document.title
    const upName: string = state?.videoData?.owner?.name
      ?? document.querySelector<HTMLElement>('.up-name')?.textContent?.trim()
      ?? ''
    const uid: string = String(state?.videoData?.owner?.mid ?? '')
    const videoEl = document.querySelector<HTMLVideoElement>('video')
    const totalDuration = state?.videoData?.duration ?? videoEl?.duration ?? 0
    const duration = Number.isFinite(totalDuration) && totalDuration > 0 ? totalDuration : 1
    const watchRatio = Math.min(watchedSeconds / duration, 1)

    if (watchedSeconds < 3) {
      LOG('观看记录：跳过（不足 3 秒）', { bvid, watchedSeconds })
      return null
    }

    const ratio = Math.round(watchRatio * 100) / 100
    return {
      type: 'play',
      bvid,
      title,
      upName,
      uid,
      watchRatio: ratio,
      watchedSeconds: Math.round(watchedSeconds),
      durationSeconds: Math.round(duration),
      timestamp: Date.now(),
      sessionId,
    }
  }

  const persist = (final = false) => {
    const payload = buildPayload()
    if (!payload) return
    if (final) finalized = true
    LOG(final ? '观看记录：最终保存' : '观看记录：进度更新', {
      bvid: payload.bvid,
      title: payload.title,
      watchRatio: `${Math.round(payload.watchRatio * 100)}%`,
    })
    upsertPlayAction(payload)
  }

  // Use document-level capture to catch timeupdate regardless of which video element B站 uses
  const onTimeUpdate = (e: Event) => {
    const v = e.target as HTMLVideoElement
    if (v.tagName !== 'VIDEO') return

    if (activeVideo !== v) {
      activeVideo = v
      lastCurrentTime = v.currentTime
      return
    }

    const delta = v.currentTime - lastCurrentTime
    lastCurrentTime = v.currentTime

    // Ignore seeks/jumps; only accumulate contiguous playback progress.
    if (delta > 0 && delta <= 1.5) watchedSeconds += delta
  }
  const onEnded = (e: Event) => {
    if ((e.target as HTMLElement).tagName !== 'VIDEO') return
    const v = e.target as HTMLVideoElement
    const totalDuration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : watchedSeconds
    watchedSeconds = Math.max(watchedSeconds, totalDuration)
    persist(true)
  }
  const onSeeking = (e: Event) => {
    const v = e.target as HTMLVideoElement
    if (v.tagName !== 'VIDEO') return
    activeVideo = v
    lastCurrentTime = v.currentTime
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') persist()
  }
  const onPageHide = () => persist(true)
  const onBeforeUnload = () => persist(true)

  document.addEventListener('timeupdate', onTimeUpdate, true)
  document.addEventListener('ended', onEnded, true)
  document.addEventListener('seeking', onSeeking, true)
  document.addEventListener('visibilitychange', onVisibilityChange, true)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('beforeunload', onBeforeUnload)
  persistTimer = window.setInterval(() => persist(), 15000)

  activeRecord = () => persist(true)
  trackerCleanup = () => {
    document.removeEventListener('timeupdate', onTimeUpdate, true)
    document.removeEventListener('ended', onEnded, true)
    document.removeEventListener('seeking', onSeeking, true)
    document.removeEventListener('visibilitychange', onVisibilityChange, true)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('beforeunload', onBeforeUnload)
    if (persistTimer) window.clearInterval(persistTimer)
  }
}

// ==================== MutationObserver ====================
let observer: MutationObserver | null = null

function startObserver(): void {
  observer?.disconnect()
  observer = new MutationObserver(mutations => {
    let needsScan = false
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue
        const el = node as HTMLElement
        if (el.matches(HOMEPAGE_CARD_SELECTOR) || isVideoPageCard(el)) {
          processCard(el, el.matches(HOMEPAGE_CARD_SELECTOR))
        } else {
          if (el.querySelector(HOMEPAGE_CARD_SELECTOR) || el.querySelector(VIDEO_PAGE_CARD_SELECTOR)) {
            needsScan = true
          }
        }
      }
    }
    if (needsScan) processAllCards()
  })
  const target = isVideoPage()
    ? document.querySelector('.right-container') ?? document.body
    : document.body
  observer.observe(target, { childList: true, subtree: true })
}

// ==================== SPA navigation detection ====================
function watchNavigation(): void {
  let lastUrl = location.href
  window.addEventListener('popstate', onUrlChange)
  window.addEventListener('hashchange', onUrlChange)
  window.setInterval(onUrlChange, 500)

  function onUrlChange() {
    if (location.href === lastUrl) return
    lastUrl = location.href
    LOG('页面跳转', { url: location.pathname })
    // Give the SPA a moment to render before re-scanning
    setTimeout(() => {
      setupWatchTracker()
      ensureContentStyles()
      processAllCards()
      startObserver()
    }, 500)
  }
}

// ==================== Init ====================
async function init(): Promise<void> {
  await loadFilterData()
  setupWatchTracker()
  ensureContentStyles()
  processAllCards()
  startObserver()
  watchNavigation()

  // Re-filter when storage changes (e.g., popup updates profile/keywords)
  chrome.storage.onChanged.addListener(async (changes) => {
    if (changes.userProfile || changes.blockedKeywords || changes.actions || changes.settings) {
      await loadFilterData()
      resetAllCards()
      processAllCards()
    }
  })
}

// Declare global type for Bilibili's initial state
declare global {
  interface Window {
    __INITIAL_STATE__?: unknown
  }
}

init()
