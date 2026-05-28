// 我的 Bilibili 推荐 - Content Script
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
const TRENDING_CONTAINER_SELECTOR = '.bili-dyn-search-trendings'
const TRENDING_ITEM_SELECTOR = 'a.trending'

// 本次会话内被显式「屏蔽」过的热搜原句。即便 LLM 抽出的关键词不字面命中
// 原句，也保证该条在 storage.onChanged 重渲染后不会闪回。reload 后清空，
// 但常见情况下抽出的词会写入 blockedKeywords 并命中原句，跨刷新依然隐藏。
const blockedTrendingPhrases = new Set<string>()
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
.bili-video-card:hover .bf-ext-actions {
  opacity: 1;
  pointer-events: all;
}
/* Sidebar buttons live in a body-attached portal because appending a positioned
 * child to .info / .video-page-card-small triggers a layout watcher inside
 * bilibili's right-rail Vue 2 tree, which then re-renders the slot containing
 * #biliMainHeader and tears down the Vue 3 header app. */
#bf-ext-portal {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}
.bf-ext-actions-portal {
  position: absolute;
  display: flex;
  flex-direction: row;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}
.bf-ext-actions-portal--show {
  opacity: 1;
  pointer-events: auto;
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
.bf-ext-trending {
  position: relative;
}
.bf-ext-trending-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  background: rgba(251, 114, 153, 0.92);
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 5;
}
.bf-ext-trending:hover .bf-ext-trending-btn {
  opacity: 1;
}
.bf-ext-trending-btn:hover {
  background: rgba(251, 114, 153, 1);
}
.bf-ext-trending-hidden {
  display: none !important;
}
.bf-ext-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  background: rgba(30, 30, 30, 0.92);
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  z-index: 100000;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
  max-width: 80vw;
}
.bf-ext-toast--show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
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

function parseTrendingPhrase(item: HTMLElement): string {
  const fromText = item.querySelector<HTMLElement>('.text')?.textContent?.trim()
  if (fromText) return fromText
  const href = item.getAttribute('href') ?? ''
  try {
    return new URL(href, location.href).searchParams.get('keyword')?.trim() ?? ''
  } catch {
    return ''
  }
}

function shouldHideTrending(phrase: string): boolean {
  if (!phrase) return false
  if (blockedTrendingPhrases.has(phrase)) return true
  const lower = phrase.toLowerCase()
  const { keywords, profile } = filterData
  if (keywords.some(kw => lower.includes(kw.toLowerCase()))) return true
  if (profile.disinterests.some(tag => lower.includes(tag.toLowerCase()))) return true
  return false
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
const PORTAL_ID = 'bf-ext-portal'
const portalEntries = new Map<HTMLElement, HTMLElement>()

function ensurePortal(): HTMLElement {
  let portal = document.getElementById(PORTAL_ID)
  if (!portal) {
    portal = document.createElement('div')
    portal.id = PORTAL_ID
    document.body.appendChild(portal)
  }
  return portal
}

function buildActionButtons(info: CardInfo, container: HTMLElement): void {
  const disBtn = document.createElement('button')
  disBtn.className = 'bf-ext-btn bf-ext-btn--disinterest'
  disBtn.textContent = '不感兴趣'
  disBtn.title = '对这个内容不感兴趣'
  disBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!info.bvid) return
    LOG(`反馈：不感兴趣`, { bvid: info.bvid, title: info.title, upName: info.upName })
    await triggerNativeFeedback(info.element, '内容不感兴趣')
    await saveAction({
      type: 'disinterested',
      bvid: info.bvid,
      title: info.title,
      upName: info.upName,
      timestamp: Date.now(),
    })
    info.element.classList.add('bf-ext-hidden-card')
    removePortalEntry(info.element)
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
    let hiddenCount = 0
    document.querySelectorAll<HTMLElement>('[data-bf-upname]').forEach(el => {
      if (el.dataset.bfUpname === info.upName) {
        el.classList.add('bf-ext-hidden-card')
        removePortalEntry(el)
        hiddenCount++
      }
    })
    LOG(`已隐藏「${info.upName}」的 ${hiddenCount} 个卡片`)
    info.element.classList.add('bf-ext-hidden-card')
    removePortalEntry(info.element)
  })

  container.appendChild(disBtn)
  container.appendChild(upBtn)
}

function injectHomepageButtons(info: CardInfo): void {
  const wrap = info.element.querySelector<HTMLElement>('.bili-video-card__info')
  if (!wrap) return
  const container = document.createElement('div')
  container.className = 'bf-ext-actions'
  buildActionButtons(info, container)
  wrap.appendChild(container)
}

// Bilibili's right-rail Vue 2 tree has a layout watcher that fires when any
// visible positioned child is appended into a card's subtree. The reaction
// later re-renders the slot containing #biliMainHeader, which destroys the
// Vue 3 header app. Mounting the sidebar buttons in a body-attached portal
// keeps the card subtree untouched.
function injectSidebarButtons(info: CardInfo): void {
  const portal = ensurePortal()
  const container = document.createElement('div')
  container.className = 'bf-ext-actions-portal'
  buildActionButtons(info, container)
  portal.appendChild(container)

  // Event listeners on the card don't mutate the DOM, so they don't trip the
  // sidebar watcher.
  const show = () => container.classList.add('bf-ext-actions-portal--show')
  const hide = () => container.classList.remove('bf-ext-actions-portal--show')
  info.element.addEventListener('mouseenter', show)
  info.element.addEventListener('mouseleave', hide)
  // Keep the buttons interactive even when the cursor crosses onto them.
  container.addEventListener('mouseenter', show)
  container.addEventListener('mouseleave', hide)

  portalEntries.set(info.element, container)
  positionPortalEntry(info.element, container)
  schedulePortalSync()
}

function positionPortalEntry(card: HTMLElement, container: HTMLElement): void {
  const rect = card.getBoundingClientRect()
  if (rect.bottom < 0 || rect.top > window.innerHeight ||
      rect.right < 0 || rect.left > window.innerWidth) {
    container.style.visibility = 'hidden'
    return
  }
  container.style.visibility = ''
  container.style.left = `${rect.right - container.offsetWidth - 4}px`
  container.style.top = `${rect.bottom - container.offsetHeight - 4}px`
}

function removePortalEntry(card: HTMLElement): void {
  const container = portalEntries.get(card)
  if (!container) return
  container.remove()
  portalEntries.delete(card)
}

let portalSyncRaf = 0
function schedulePortalSync(): void {
  if (portalSyncRaf) return
  portalSyncRaf = requestAnimationFrame(() => {
    portalSyncRaf = 0
    for (const [card, container] of portalEntries) {
      if (!document.contains(card)) {
        container.remove()
        portalEntries.delete(card)
        continue
      }
      positionPortalEntry(card, container)
    }
  })
}

function setupPortalListeners(): void {
  window.addEventListener('scroll', schedulePortalSync, { passive: true, capture: true })
  window.addEventListener('resize', schedulePortalSync, { passive: true })
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

let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(message: string): void {
  let toast = document.getElementById('bf-ext-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'bf-ext-toast'
    toast.className = 'bf-ext-toast'
    document.body.appendChild(toast)
  }
  toast.textContent = message
  requestAnimationFrame(() => toast!.classList.add('bf-ext-toast--show'))
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast!.classList.remove('bf-ext-toast--show'), 3500)
}

function buildTrendingButton(item: HTMLElement, phrase: string): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'bf-ext-trending-btn'
  btn.textContent = '屏蔽'
  btn.title = `屏蔽话题「${phrase}」`
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!phrase) return
    LOG('屏蔽话题（占位，未接 LLM）', { phrase })
    blockedTrendingPhrases.add(phrase)
    item.classList.add('bf-ext-trending-hidden')
    showToast(`已隐藏「${phrase}」`)
  })
  return btn
}

function processTrendingItem(item: HTMLElement): void {
  if (item.dataset.bfTrendingDone) return
  item.dataset.bfTrendingDone = '1'
  const phrase = parseTrendingPhrase(item)
  if (!phrase) return
  if (shouldHideTrending(phrase)) {
    item.classList.add('bf-ext-trending-hidden')
    return
  }
  item.classList.add('bf-ext-trending')
  item.appendChild(buildTrendingButton(item, phrase))
}

function processTrendings(): void {
  if (location.hostname !== 't.bilibili.com') return
  document
    .querySelectorAll<HTMLElement>(`${TRENDING_CONTAINER_SELECTOR} ${TRENDING_ITEM_SELECTOR}`)
    .forEach(processTrendingItem)
}

function resetTrendings(): void {
  if (location.hostname !== 't.bilibili.com') return
  document
    .querySelectorAll<HTMLElement>(`${TRENDING_CONTAINER_SELECTOR} ${TRENDING_ITEM_SELECTOR}`)
    .forEach(item => {
      delete item.dataset.bfTrendingDone
      item.classList.remove('bf-ext-trending-hidden')
      item.querySelector('.bf-ext-trending-btn')?.remove()
    })
  processTrendings()
}

let trendingScanRaf = 0
function scheduleTrendingScan(): void {
  if (location.hostname !== 't.bilibili.com') return
  if (trendingScanRaf) return
  trendingScanRaf = requestAnimationFrame(() => {
    trendingScanRaf = 0
    processTrendings()
  })
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

  if (isHomepage) injectHomepageButtons(info)
  else injectSidebarButtons(info)
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
  for (const container of portalEntries.values()) container.remove()
  portalEntries.clear()
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
    let portalDirty = false
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
      if (!portalDirty && m.removedNodes.length > 0) portalDirty = true
    }
    if (needsScan) processAllCards()
    // Sidebar cards may have been moved or removed; reconcile portal positions.
    if (portalDirty || needsScan) schedulePortalSync()
    scheduleTrendingScan()
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
      scheduleTrendingScan()
    }, 500)
  }
}

// ==================== Init ====================
// Bilibili's bili-header (Vue 3) double-mounts on the video page: once via the
// router's onReady and once via a Vue component's mounted hook. Running our
// content-script work concurrently with that race shifts microtask timing
// enough that Vue's patch step hits a stale DOM reference (nextSibling of null)
// and tears down the header it had just rendered, leaving #biliMainHeader empty.
// Holding off until the header is rendered and the race window has settled
// avoids the trigger entirely.
async function waitForBiliHeaderReady(): Promise<void> {
  const deadlineAt = Date.now() + 5_000
  while (Date.now() < deadlineAt) {
    const mainHeader = document.getElementById('biliMainHeader')
    if (mainHeader && mainHeader.children.length > 0) break
    // Non-video pages don't have #biliMainHeader; .bili-header is enough.
    if (!mainHeader && document.querySelector('.bili-header')) break
    await new Promise(r => setTimeout(r, 100))
  }
  await new Promise(r => setTimeout(r, 500))
}

async function init(): Promise<void> {
  await loadFilterData()
  await waitForBiliHeaderReady()
  setupWatchTracker()
  ensureContentStyles()
  setupPortalListeners()
  processAllCards()
  processTrendings()
  startObserver()
  watchNavigation()

  // Re-filter when storage changes (e.g., popup updates profile/keywords)
  chrome.storage.onChanged.addListener(async (changes) => {
    if (changes.userProfile || changes.blockedKeywords || changes.actions || changes.settings) {
      await loadFilterData()
      resetAllCards()
      processAllCards()
      resetTrendings()
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

export {}
