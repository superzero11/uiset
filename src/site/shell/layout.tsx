import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, type CommandData } from "@/registry/uiset/ui/command"
import { Dialog, DialogBackdrop, DialogContent, DialogShortcut, DialogTitle, DialogTrigger } from "@/registry/uiset/ui/dialog"
import { Drawer, DrawerBackdrop, DrawerContent, DrawerTitle, DrawerTrigger } from "@/registry/uiset/ui/drawer"
import { SegmentedControl, SegmentedControlItem } from "@/registry/uiset/ui/segmented-control"
import { UISet } from "@/registry/uiset/ui/uiset"
import { Logo } from "./logo"
import { followLink, navigate, useLocation } from "./router"
import type { SearchEntry } from "./search-data"
import "./shell.css"

/* ------------------------------------------------------------------ the site's theme */

type SiteTheme = "system" | "light" | "dark"
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

/* ------------------------------------------------------------------ navigation */

const sections = [
  { href: "/docs", label: "Docs" },
  { href: "/components", label: "Components" },
  { href: "/kits", label: "Kits" },
  { href: "/templates", label: "Templates" },
  { href: "/themes", label: "Themes" },
  { href: "/agents", label: "Agents" },
]

const current = (pathname: string, href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined)

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  )
}

function ThemeIcon({ theme }: { theme: SiteTheme }) {
  const paths: Record<SiteTheme, ReactNode> = {
    system: <path d="M3 4.5h14v9H3zM7.5 16.5h5M10 13.5v3" />,
    light: <path d="M10 6.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" />,
    dark: <path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z" />,
  }
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[theme]}
    </svg>
  )
}

function ThemeSwitch({ theme, setTheme }: { theme: SiteTheme; setTheme: (t: SiteTheme) => void }) {
  return (
    <SegmentedControl className="site-theme" aria-label="Theme" value={theme} onValueChange={(v) => v && setTheme(v as SiteTheme)}>
      {(["system", "light", "dark"] as const).map((t) => (
        <SegmentedControlItem key={t} value={t} aria-label={t === "system" ? "Auto" : t === "light" ? "Light" : "Dark"}>
          <ThemeIcon theme={t} />
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

/* ------------------------------------------------------------------ search */

function Search() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  // The index (every docs page and registry item) loads the first time search opens.
  const [entries, setEntries] = useState<SearchEntry[] | null>(null)
  useEffect(() => {
    if (open && !entries) import("./search-data").then((m) => setEntries(m.searchEntries()))
  }, [open, entries])
  const byPath = useMemo(() => new Map((entries ?? []).map((e) => [e.path, e])), [entries])
  const items = useMemo(() => (entries ?? []).map((e) => ({ value: e.path, label: e.title, keywords: [e.section, ...(e.keywords ?? [])] })), [entries])
  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (setOpen(next), next && setQuery(""))}>
      <DialogTrigger className="site-search" data-variant="outline" shortcut="mod+k" aria-label="Search docs">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" />
        </svg>
        <span className="site-search-label">Search docs</span>
        <DialogShortcut />
      </DialogTrigger>
      <DialogBackdrop />
      <DialogContent className="site-search-dialog" initialFocus="input">
        <DialogTitle className="uiset-visually-hidden">Search the docs</DialogTitle>
        <Command
          items={items}
          query={query}
          onQueryChange={(next: string, details: { reason?: string }) => (details?.reason === "escape-key" ? setOpen(false) : setQuery(next))}
          onAction={(path: string) => {
            setOpen(false)
            navigate(path)
          }}
        >
          <CommandInput aria-label="Search components, kits, templates and guides" placeholder="Search components, kits, templates…" />
          <CommandEmpty className="site-search-empty">{entries ? "Nothing matches. Try a component name, like \u201cselect\u201d or \u201cdata grid\u201d." : "Loading the index\u2026"}</CommandEmpty>
          <CommandList className="site-search-list">
            {(state: { items: CommandData }) =>
              (state.items as { value: string; label: string }[]).map((item) => (
                <CommandItem key={item.value} value={item.value} className="site-search-item">
                  <span className="site-search-title">{item.label}</span>
                  <span className="site-search-section">{byPath.get(item.value)?.section}</span>
                </CommandItem>
              ))
            }
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ header and footer */

function Header({ theme, setTheme }: { theme: SiteTheme; setTheme: (t: SiteTheme) => void }) {
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  useEffect(() => setMenu(false), [pathname])
  return (
    <header className="site-top">
      <div className="site-top-inner">
        <a className="site-logo" href="/" aria-label="UISet home">
          <Logo />
        </a>
        <nav className="site-nav" aria-label="Site">
          {sections.map((s) => (
            <a key={s.href} href={s.href} aria-current={current(pathname, s.href)}>
              {s.label}
            </a>
          ))}
        </nav>
        <div className="site-tools">
          <Search />
          <a className="site-icon-link" href="https://github.com/superzero11/uiset" aria-label="UISet on GitHub">
            <GithubIcon />
          </a>
          <ThemeSwitch theme={theme} setTheme={setTheme} />
          <Drawer open={menu} onOpenChange={setMenu}>
            <DrawerTrigger className="site-menu-button" data-variant="ghost" aria-label="Menu">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false">
                <path d="M3 6h14M3 10h14M3 14h14" />
              </svg>
            </DrawerTrigger>
            <DrawerBackdrop />
            <DrawerContent className="site-menu">
              <DrawerTitle className="uiset-visually-hidden">Menu</DrawerTitle>
              <nav aria-label="Site, on small screens">
                {[{ href: "/", label: "Home" }, ...sections].map((s) => (
                  <a key={s.href} href={s.href} aria-current={s.href === "/" ? (pathname === "/" ? "page" : undefined) : current(pathname, s.href)} onClick={() => setMenu(false)}>
                    {s.label}
                  </a>
                ))}
              </nav>
              <div className="site-menu-theme">
                <span>Theme</span>
                <ThemeSwitch theme={theme} setTheme={setTheme} />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  )
}

const footerColumns = [
  {
    title: "Build",
    links: [
      ["Components", "/components"],
      ["Kits", "/kits"],
      ["Templates", "/templates"],
      ["Themes", "/themes"],
      ["Theme generator", "/themes/generator"],
    ],
  },
  {
    title: "Learn",
    links: [
      ["Introduction", "/docs"],
      ["Installation", "/docs/installation"],
      ["Theming", "/docs/theming"],
      ["Building with AI agents", "/docs/ai"],
      ["Web Components", "/docs/web-components"],
      ["Coming from shadcn/ui", "/docs/migrate"],
    ],
  },
  {
    title: "More",
    links: [
      ["Agents and the benchmark", "/agents"],
      ["Agent readiness checker", "/check"],
      ["Roadmap", "/docs/roadmap"],
      ["GitHub", "https://github.com/superzero11/uiset"],
      ["llms.txt", "/llms.txt"],
      ["Registry", "/r/registry.json"],
    ],
  },
] as const

function Footer() {
  return (
    <footer className="site-bottom">
      <div className="site-bottom-inner">
        <div className="site-bottom-brand">
          <Logo />
          <p>Components, kits, templates and themes for Vercel&rsquo;s UI SDK.</p>
        </div>
        {footerColumns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="site-bottom-col">
            <h2>{col.title}</h2>
            <ul>
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="site-bottom-note">
        MIT licensed. Built on <a href="https://ui-sdk.dev">UI SDK</a>, which is in beta. UISet is a community project, not affiliated with Vercel.
      </p>
    </footer>
  )
}

/* ------------------------------------------------------------------ the layout */

function SiteLayout({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(initialTheme)
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
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
      meta.content = scheme === "dark" ? "#141519" : "#fcfcfe"
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
      <UISet skin="base" theme={theme} className="site" onClick={(event) => followLink(event)}>
        <a className="skip-link" href="#main" data-reload="">
          Skip to content
        </a>
        <Header theme={theme} setTheme={setTheme} />
        <main id="main" ref={main} tabIndex={-1} className="site-main">
          {children}
        </main>
        <Footer />
      </UISet>
    </ThemeContext.Provider>
  )
}

export { SiteLayout, useSiteTheme }
export type { SiteTheme }
