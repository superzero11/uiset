import { useEffect, useSyncExternalStore, type ReactNode, type RefObject } from "react"
import { AppShell, SidebarGroup, SidebarNav } from "@/registry/uiset/ui/app-shell"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/registry/uiset/ui/collapsible"
import { docPages } from "../docs/nav"
import { components as componentCards, templates } from "../library"
import { Footer, GithubLink, SearchField, SkinSwitch, ThemeSwitch } from "./chrome"
import { Logo } from "./logo"
import { useLocation } from "./router"
import { AgentIcon, BookIcon, ChevronIcon, LibraryIcon, type SiteTheme } from "./site-icons"

// The frame of the docs and the library: AppShell's sidebar (search, the site's sections, the
// skin, then every page by kind) and the page in a panel beside it, with the theme and GitHub
// along its top. On narrow screens the sidebar moves into AppShell's drawer.

const NARROW = "56rem"

function useNarrow() {
  return useSyncExternalStore(
    (listener) => {
      const list = matchMedia(`(max-width: ${NARROW})`)
      list.addEventListener("change", listener)
      return () => list.removeEventListener("change", listener)
    },
    () => matchMedia(`(max-width: ${NARROW})`).matches,
    () => false,
  )
}

const library = ["/components", "/kits", "/templates", "/themes"]
const inLibrary = (pathname: string) => library.some((p) => pathname === p || pathname.startsWith(`${p}/`))

type Link = { href: string; title: string; label?: string }

/** A list of links in the sidebar. Under its group's heading a title is clear, but agents and
 *  screen readers find a link by name alone: Studio is a kit and a skin. */
function Links({ links, current }: { links: Link[]; current: string }) {
  return (
    <ul className="site-side-list">
      {links.map((l) => (
        <li key={`${l.href} ${l.title}`}>
          <a className="sidebar-link" href={l.href} aria-current={l.href === current ? "page" : undefined} aria-label={l.label}>
            <span className="sidebar-label">{l.title}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** A group of the sidebar that folds: open while you're on one of its pages. */
function Fold({ title, count, icon, links, current, open }: { title: string; count?: number; icon?: ReactNode; links: Link[]; current: string; open: boolean }) {
  return (
    // A group only shows or hides plain links, which agents follow by address: hidden from
    // them, so "Docs" or "Kits" stays the name of one thing on the page.
    <Collapsible defaultOpen={open} className="site-side-fold" data-agent-hidden="">
      <CollapsibleTrigger className="sidebar-link site-side-toggle">
        {icon && <span className="sidebar-icon">{icon}</span>}
        <span className="sidebar-label">
          {title}
          {count !== undefined && <span className="site-count">{count}</span>}
        </span>
        <ChevronIcon />
      </CollapsibleTrigger>
      <CollapsiblePanel className="site-side-panel">
        <Links links={links} current={current} />
      </CollapsiblePanel>
    </Collapsible>
  )
}

const pagesIn = (section: string) => docPages.filter((p) => p.section === section)

function Sidebar() {
  const { pathname } = useLocation()
  const guides = pagesIn("Get started").map((p) => ({ href: p.path, title: p.title }))
  const components = componentCards.map((c) => ({ href: c.href, title: c.title }))
  const kits = pagesIn("Kits").map((p) => ({ href: p.path, title: p.title, label: `${p.title} kit` }))
  const templateLinks = templates.map((t) => ({ href: `/templates/${t.id}`, title: t.name, label: `${t.name} template` }))
  const skinLinks = [{ href: "/docs/theming", title: "Base", label: "Base skin" }, ...pagesIn("Skins").map((p) => ({ href: p.path, title: p.title, label: `${p.title} skin` }))]
  const inDocs = guides.some((g) => g.href === pathname) || pathname === "/docs/templates"
  return (
    <div className="site-side">
      <SearchField />
      <SidebarNav label="Site">
        <ul className="site-side-main">
          <li>
            <a className="sidebar-link" href="/components" aria-current={inLibrary(pathname) && !pathname.includes("/", 1) ? "page" : undefined}>
              <span className="sidebar-icon">
                <LibraryIcon />
              </span>
              <span className="sidebar-label">Library</span>
            </a>
          </li>
          <li>
            <Fold title="Docs" icon={<BookIcon />} links={[...guides, { href: "/docs/templates", title: "Using templates" }]} current={pathname} open={inDocs} />
          </li>
          <li>
            <a className="sidebar-link" href="/agents">
              <span className="sidebar-icon">
                <AgentIcon />
              </span>
              <span className="sidebar-label">Agent</span>
            </a>
          </li>
        </ul>
      </SidebarNav>
      <SidebarNav label="Library pages">
        <SidebarGroup>
          <li>
            <Fold title="Components" count={components.length} links={components} current={pathname} open={pathname.startsWith("/docs/components/") || pathname === "/components" || pathname === "/gallery"} />
          </li>
          <li>
            <Fold title="Kits" count={kits.length} links={kits} current={pathname} open={pathname.startsWith("/docs/kits/") || pathname === "/kits"} />
          </li>
          <li>
            <Fold title="Templates" count={templateLinks.length} links={templateLinks} current={pathname} open={pathname.startsWith("/templates")} />
          </li>
          <li>
            <Fold title="Skins" count={skinLinks.length} links={skinLinks} current={pathname} open={pathname.startsWith("/docs/skins/") || pathname === "/themes"} />
          </li>
        </SidebarGroup>
      </SidebarNav>
    </div>
  )
}

function AppFrame({ theme, setTheme, main, children }: { theme: SiteTheme; setTheme: (t: SiteTheme) => void; main: RefObject<HTMLElement | null>; children: ReactNode }) {
  const narrow = useNarrow()
  // The site's collapse and menu buttons, hidden from agents: a template or kit on the page is
  // an AppShell too, with buttons of the same names (and the same remembered setting).
  useEffect(() => {
    const shell = main.current?.closest(".app-shell")
    for (const el of shell?.querySelectorAll(":scope > .app-sidebar > .app-sidebar-top, :scope > .app-main > .app-header .app-menu-button") ?? []) el.setAttribute("data-agent-hidden", "")
  })
  const brand = (
    <a className="site-logo" href="/" aria-label="UISet home">
      <Logo />
    </a>
  )
  return (
    <AppShell
      brand={brand}
      sidebar={<Sidebar />}
      label="Site"
      narrowBelow={NARROW}
      contentElement="div"
      header={
        narrow ? (
          <div className="site-phonebar">
            {brand}
            <SearchField compact />
            <SkinSwitch />
            <ThemeSwitch theme={theme} setTheme={setTheme} />
            <GithubLink />
          </div>
        ) : undefined
      }
    >
      <div className="site-panel">
        {!narrow && (
          <div className="site-panel-bar">
            <div className="site-panel-bar-inner">
              <SkinSwitch />
              <ThemeSwitch theme={theme} setTheme={setTheme} />
              <GithubLink />
            </div>
          </div>
        )}
        <main id="main" ref={main} tabIndex={-1} className="site-main">
          {children}
        </main>
      </div>
      <Footer />
    </AppShell>
  )
}

export default AppFrame
