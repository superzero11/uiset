import { useSyncExternalStore } from "react"

// A small client router for the site: paths are pages, the History API moves between them,
// and plain <a href="/…"> links are followed without a reload (the layout catches them).

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// The page for a path loads before the address changes, so moving between pages never
// shows a loading state (main.tsx sets this to load the page's code and content).
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
    preload(window.location.pathname)
      .catch(() => {})
      .then(() => {
        notify()
        requestAnimationFrame(() => scrollToEntry(state))
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

/** Goes to a page on this site; anything else is a normal navigation. */
async function navigate(to: string, options: { replace?: boolean } = {}) {
  const url = new URL(to, window.location.href)
  if (url.origin !== window.location.origin) {
    window.location.href = to
    return
  }
  const samePage = url.pathname === window.location.pathname && url.search === window.location.search
  if (!samePage) {
    try {
      await preload(url.pathname)
    } catch {
      // The page's code didn't load (a new deploy, or offline): let the browser try.
      window.location.href = url.href
      return
    }
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

/** Follows a click on a same-site link without reloading; returns whether it did. */
function followLink(event: MouseEvent | React.MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
  if (!anchor || anchor.target || anchor.hasAttribute("download") || anchor.dataset.reload !== undefined) return false
  const raw = anchor.getAttribute("href") ?? ""
  // In-page anchors and files (llms.txt, the registry) are the browser's to handle.
  if (raw.startsWith("#") || /\.(txt|json|md|xml|svg|png)$/i.test(new URL(anchor.href).pathname)) return false
  const url = new URL(anchor.href)
  if (url.origin !== window.location.origin) return false
  event.preventDefault()
  navigate(url.pathname + url.search + url.hash)
  return true
}

export { followLink, navigate, setPreloader, useLocation }
