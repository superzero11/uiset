import { Component, createContext, lazy, Suspense, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from "react"
import { UISet } from "@/registry/uiset/ui/uiset"
import { Footer, SearchDialog } from "./chrome"
import { followLink, useLocation, warmLink } from "./router"
import type { SiteTheme } from "./site-icons"
import { useSkin } from "./skin-picker"
import { TopNav } from "./top-nav"
import "./shell.css"
import "./frame.css"

/* ------------------------------------------------------------------ the site's theme */

const ThemeContext = createContext<{ theme: SiteTheme; setTheme: (t: SiteTheme) => void }>({ theme: "system", setTheme: () => {} })
/** The light or dark setting from the header, for the demos' own roots. */
const useSiteTheme = () => useContext(ThemeContext)

function initialTheme(): SiteTheme {
  const fromUrl = new URLSearchParams(window.location.search).get("theme")
  if (fromUrl === "light" || fromUrl === "dark" || fromUrl === "system") return fromUrl
  try {
    const kept = localStorage.getItem("uiset-site-theme")
    if (kept === "light" || kept === "dark") return kept
  } catch {
    /* no storage: follow the system */
  }
  return "system"
}

/* ------------------------------------------------------------------ frames */

// Docs and the library sit in the app frame: a sidebar and the page in a panel (app-frame.tsx,
// loaded with those pages, since its sidebar lists every docs page). The rest have the top nav.
const appPaths = ["/docs", "/components", "/gallery", "/kits", "/templates", "/themes"]
const isAppPath = (pathname: string) => appPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
type FrameProps = { theme: SiteTheme; setTheme: (t: SiteTheme) => void; main: RefObject<HTMLElement | null>; children: ReactNode }
// Loaded with a page's code (routes.tsx), so moving to the first docs page draws the frame at
// once rather than waiting a turn for the lazy one.
let LoadedFrame: ComponentType<FrameProps> | null = null
const loadAppFrame = () => import("./app-frame").then((m) => ((LoadedFrame = m.default), m))
const LazyFrame = lazy(loadAppFrame)

function MarketingFrame({ theme, setTheme, main, children }: FrameProps) {
  return (
    <>
      <TopNav theme={theme} setTheme={setTheme} />
      <main id="main" ref={main} tabIndex={-1} className="site-main">
        {children}
      </main>
      <Footer />
    </>
  )
}

/* ------------------------------------------------------------------ the layout */

/**
 * A page that throws while it draws shows this, inside the site's frame, instead of a blank
 * window: on 2026-11-23 a library card's copy button took the whole home page down. Keyed by the
 * path, so another page draws fresh.
 */
class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <section className="page-failed" role="alert">
        <h1>This page hit a problem</h1>
        <p>Part of it failed to draw. Reload the page to try again; the rest of the site still works.</p>
        <p>
          <a href={typeof location === "undefined" ? "/" : location.pathname} data-reload="">
            Reload the page
          </a>
        </p>
      </section>
    )
  }
}

function SiteLayout({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(initialTheme)
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const AppFrame = LoadedFrame ?? LazyFrame
  const [skin] = useSkin()
  // The page whose heading has focus, or was drawn first: moving focus waits for a new one.
  const shown = useRef(pathname)
  const setTheme = (t: SiteTheme) => {
    setThemeState(t)
    try {
      if (t === "system") localStorage.removeItem("uiset-site-theme")
      else localStorage.setItem("uiset-site-theme", t)
    } catch {
      /* no storage */
    }
  }
  // The page itself follows the choice too (its scrollbar, overscroll and the browser's
  // bar color). index.html applies a kept choice before the first paint.
  useEffect(() => {
    const root = document.documentElement
    if (theme === "system") delete root.dataset.siteTheme
    else root.dataset.siteTheme = theme
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      const scheme = theme === "system" ? (meta.media.includes("dark") ? "dark" : "light") : theme
      meta.content = scheme === "dark" ? "#0c0c0d" : "#f5f5f5"
    }
  }, [theme])
  // After moving to another page, focus goes to its heading, so a screen reader announces
  // the new page, as a page load would.
  useEffect(() => {
    if (shown.current === pathname) return
    shown.current = pathname
    const heading = main.current?.querySelector<HTMLElement>("h1")
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    } else main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <UISet
        skin={skin}
        theme={theme}
        className={isAppPath(pathname) ? "site" : "site site-home"}
        onClick={(event) => followLink(event)}
        onPointerOver={warmLink}
        onPointerDown={warmLink}
        onFocus={warmLink}
        onTouchStart={warmLink}
      >
        <div className="site-progress" aria-hidden="true" />
        <a className="skip-link" href="#main" data-reload="">
          Skip to content
        </a>
        {isAppPath(pathname) ? (
          <Suspense>
            <AppFrame theme={theme} setTheme={setTheme} main={main}>
              <PageBoundary key={pathname}>{children}</PageBoundary>
            </AppFrame>
          </Suspense>
        ) : (
          <MarketingFrame theme={theme} setTheme={setTheme} main={main}>
            <PageBoundary key={pathname}>{children}</PageBoundary>
          </MarketingFrame>
        )}
        <SearchDialog />
      </UISet>
    </ThemeContext.Provider>
  )
}

export { isAppPath, loadAppFrame, PageBoundary, SiteLayout, useSiteTheme }
export type { SiteTheme }
