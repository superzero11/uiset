import { useEffect, useState } from "react"
import { Badge } from "@/registry/uiset/ui/badge"
import { Drawer, DrawerBackdrop, DrawerContent, DrawerTitle, DrawerTrigger } from "@/registry/uiset/ui/drawer"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/registry/uiset/ui/navigation-menu"
import { facts } from "../facts"
import { GithubLink, SearchField, SkinSwitch, ThemeSwitch } from "./chrome"
import { Logo } from "./logo"
import { useLocation } from "./router"
import { ChevronIcon, type SiteTheme } from "./site-icons"

// The top nav of the home and Agent pages: the Library menu, Docs and Agent, then search, the
// skin, the theme and GitHub. On a phone the links move into a drawer.

const build = [
  { href: "/components", title: "Components", count: facts.sdkComponents + facts.appParts, what: "Every UI SDK component, styled, and the app's parts" },
  { href: "/kits", title: "Kits", count: facts.kitPages, what: "Chat, data grid, rich text, charts and more" },
  { href: "/themes", title: "Themes", count: facts.skins, what: "Five skins, and a generator for yours" },
  { href: "/templates", title: "Templates", count: facts.templates, what: "Whole pages, ready to wire up" },
]

const animate: { title: string; what: string; href?: string }[] = [
  { title: "Motion", what: "Numbers, text, waits and swaps", href: "/docs/kits/motion" },
  { title: "Illustrations", what: "Animated scenes for landing pages" },
]

const inLibrary = (pathname: string) => build.some((b) => pathname === b.href || pathname.startsWith(`${b.href}/`))

function LibraryMenu() {
  return (
    <div className="site-libmenu">
      <div className="site-libmenu-cols">
        <div>
          <p className="site-libmenu-head">Build</p>
          <ul>
            {build.map((b) => (
              <li key={b.href}>
                <NavigationMenuLink href={b.href} className="site-libmenu-link">
                  <span className="site-libmenu-title">
                    {b.title}
                    <span className="site-count">{b.count}</span>
                  </span>
                  <span className="site-libmenu-what">{b.what}</span>
                </NavigationMenuLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="site-libmenu-head">Animate</p>
          <ul>
            {animate.map((a) =>
              a.href ? (
                <li key={a.title}>
                  <NavigationMenuLink href={a.href} className="site-libmenu-link">
                    <span className="site-libmenu-title">{a.title}</span>
                    <span className="site-libmenu-what">{a.what}</span>
                  </NavigationMenuLink>
                </li>
              ) : (
                <li key={a.title} className="site-libmenu-soon">
                  <span className="site-libmenu-title">
                    {a.title}
                    <Badge>Coming soon</Badge>
                  </span>
                  <span className="site-libmenu-what">{a.what}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
      <div className="site-libmenu-foot">
        <span>On UI SDK 0.1.0-beta.16</span>
        <NavigationMenuLink href="https://github.com/superzero11/uiset/blob/main/CHANGELOG.md" className="site-libmenu-new">
          See what&rsquo;s new
        </NavigationMenuLink>
      </div>
    </div>
  )
}

function PhoneMenu({ theme, setTheme }: { theme: SiteTheme; setTheme: (t: SiteTheme) => void }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  const links = [{ href: "/", title: "Home" }, ...build, { href: "/docs", title: "Docs" }, { href: "/agents", title: "Agent" }]
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="site-menu-button" data-variant="ghost" aria-label="Menu">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false">
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      </DrawerTrigger>
      <DrawerBackdrop />
      <DrawerContent className="site-menu">
        <DrawerTitle className="uiset-visually-hidden">Menu</DrawerTitle>
        <nav aria-label="Site, on small screens">
          {links.map((l) => (
            <a key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
              {l.title}
            </a>
          ))}
        </nav>
        <div className="site-menu-theme">
          <SkinSwitch />
          <ThemeSwitch theme={theme} setTheme={setTheme} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function TopNav({ theme, setTheme }: { theme: SiteTheme; setTheme: (t: SiteTheme) => void }) {
  const { pathname } = useLocation()
  return (
    <header className="site-top">
      <div className="site-top-inner">
        <a className="site-logo" href="/" aria-label="UISet home">
          <Logo />
        </a>
        <NavigationMenu aria-label="Main" className="site-nav">
          <NavigationMenuList className="site-nav-list">
            <NavigationMenuItem value="library">
              <NavigationMenuTrigger className="site-nav-link" data-current={inLibrary(pathname) ? "" : undefined}>
                Library
                <ChevronIcon size={12} />
              </NavigationMenuTrigger>
              <NavigationMenuContent className="site-nav-panel">
                <LibraryMenu />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="docs">
              <NavigationMenuLink href="/docs" current={pathname === "/docs" || pathname.startsWith("/docs/")} className="site-nav-link">
                Docs
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem value="agent">
              <NavigationMenuLink href="/agents" current={pathname === "/agents"} className="site-nav-link">
                Agent
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
          <NavigationMenuViewport className="site-nav-viewport" />
        </NavigationMenu>
        <div className="site-tools">
          <SearchField />
          <SkinSwitch />
          <ThemeSwitch theme={theme} setTheme={setTheme} />
          <GithubLink />
          <PhoneMenu theme={theme} setTheme={setTheme} />
        </div>
      </div>
    </header>
  )
}

export { TopNav }
