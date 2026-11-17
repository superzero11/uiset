import { useSyncExternalStore } from "react"

// A small client router for the site: paths are pages, the History API moves between them,
// and plain <a href="/…"> links are followed without a reload (the layout catches them).

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// The page for a path loads before the address changes, so the old page stays until the new
// one can draw whole (main.tsx sets this to load the page's code and content).
let preload: (pathname: string) => Promise<unknown> = async () => {}
function setPreloader(load: typeof preload) {
  preload = load
}

// Where the reader is, kept in the history entry as they scroll, so Back and Forward return
// to the same place, including after a jump to a section of the same page.
type EntryState = { scrollY?: number } | null
// The page is the path: a skin or tab kept in the query (replaceState) stays on the same page.
let page = typeof window !== "undefined" ? window.location.pathname : ""

function scrollToEntry(state: EntryState) {
  if (typeof state?.scrollY === "number") window.scrollTo(0, state.scrollY)
  else if (window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
  else window.scrollTo(0, 0)
}

if (typeof window !== "undefined") {
  window.history.scrollRestoration = "manual"
  let saving = 0
  window.addEventListener(
    "scroll",
    () => {
      window.clearTimeout(saving)
      saving = window.setTimeout(() => window.history.replaceState({ ...(window.history.state as object | null), scrollY: window.scrollY }, ""), 150)
    },
    { passive: true },
  )
  window.addEventListener("popstate", (event) => {
    const state = event.state as EntryState
    const next = window.location.pathname
    if (next === page) {
      // A link to a section of this page (#scheduler), or Back and Forward between sections:
      // the browser has already scrolled to a new section; an entry with a saved place goes there.
      // Safari resets the page after the event, so the saved place is applied a frame later.
      notify()
      const y = state?.scrollY
      if (typeof y === "number") requestAnimationFrame(() => window.scrollTo(0, y))
      return
    }
    page = next
    // Back and Forward take over from a click still loading.
    const id = ++latest
    setNavigating(true)
    preload(window.location.pathname)
      .catch(() => {})
      .then(() => {
        if (id !== latest) return
        notify()
        requestAnimationFrame(() => scrollToEntry(state))
        afterPaint(() => id === latest && setNavigating(false))
      })
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => `${window.location.pathname}${window.location.search}${window.location.hash}`

// A page that takes a moment to load gets a progress bar (data-navigating on <html>, drawn by
// shell.css after a short delay). Only the latest click lands, so clicking a slow link again
// opens its page once, and a click on another link takes over.
let latest = 0
function setNavigating(on: boolean) {
  const main = document.getElementById("main")
  if (on) {
    document.documentElement.dataset.navigating = ""
    main?.setAttribute("aria-busy", "true")
  } else {
    delete document.documentElement.dataset.navigating
    main?.removeAttribute("aria-busy")
  }
}
// The bar stays until the new page has drawn: a large page (the components gallery) takes a
// while to render after its code has loaded.
const afterPaint = (then: () => void) => requestAnimationFrame(() => requestAnimationFrame(then))

/** Goes to a page on this site; anything else is a normal navigation. */
function navigate(to: string, options: { replace?: boolean } = {}): Promise<void> {
  const url = new URL(to, window.location.href)
  if (url.origin !== window.location.origin) {
    window.location.href = to
    return Promise.resolve()
  }
  const id = ++latest
  return go(url, options, id).finally(() => afterPaint(() => id === latest && setNavigating(false)))
}

async function go(url: URL, options: { replace?: boolean }, id: number) {
  const samePage = url.pathname === window.location.pathname && url.search === window.location.search
  if (!samePage) {
    setNavigating(true)
    try {
      await preload(url.pathname)
    } catch {
      // The page's code didn't load (a new deploy, or offline): let the browser try.
      if (id === latest) window.location.href = url.href
      return
    }
    if (id !== latest) return
  }
  window.history.replaceState({ ...(window.history.state as object | null), scrollY: window.scrollY }, "")
  window.history[options.replace ? "replaceState" : "pushState"](null, "", url)
  page = url.pathname
  notify()
  if (url.hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView())
  else if (!samePage) window.scrollTo(0, 0)
}

function useLocation() {
  const href = useSyncExternalStore(subscribe, snapshot, () => "/")
  const url = new URL(href, "https://uiset.local")
  return { pathname: url.pathname.replace(/\/+$/, "") || "/", search: url.search, hash: url.hash }
}

/** The site link an event happened on, or null for anything the browser handles itself. */
function siteLink(target: EventTarget | null): URL | null {
  const anchor = (target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
  if (!anchor || anchor.target || anchor.hasAttribute("download") || anchor.dataset.reload !== undefined) return null
  const raw = anchor.getAttribute("href") ?? ""
  // In-page anchors and files (llms.txt, the registry) are the browser's to handle.
  if (raw.startsWith("#") || /\.(txt|json|md|xml|svg|png)$/i.test(new URL(anchor.href).pathname)) return null
  const url = new URL(anchor.href)
  return url.origin === window.location.origin ? url : null
}

/** Follows a click on a same-site link without reloading; returns whether it did. */
function followLink(event: MouseEvent | React.MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  const url = siteLink(event.target)
  if (!url) return false
  event.preventDefault()
  navigate(url.pathname + url.search + url.hash)
  return true
}

// A page starts loading when its link is pointed at, focused or touched, so most of the
// wait is over by the click. A pointer resting for a moment counts; one passing over a row of
// links doesn't fetch each page.
const warmed = new Set<string>()
let resting = 0
function warm(url: URL | null) {
  if (!url || url.pathname === window.location.pathname || warmed.has(url.pathname)) return
  warmed.add(url.pathname)
  preload(url.pathname).catch(() => warmed.delete(url.pathname))
}
function warmLink(event: Event | React.SyntheticEvent) {
  const url = siteLink(event.target)
  window.clearTimeout(resting)
  if (event.type === "pointerover" || event.type === "mouseover") resting = window.setTimeout(() => warm(url), 80)
  else warm(url)
}

export { followLink, navigate, setPreloader, useLocation, warmLink }
