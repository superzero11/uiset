"use client"

import { createLocalStorage, createPreference } from "@ui-sdk/core"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@ui-sdk/react/drawer"
import { Preferences, usePreference } from "@ui-sdk/react/preferences"
import { useShortcut, useShortcutHint } from "@ui-sdk/react/shortcuts"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui-sdk/react/tooltip"
import {
  createContext,
  useContext,
  useId,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { Button } from "./button"
import { Icon } from "./shell/icons"
import "./shell/shell.css"

const sidebar = createPreference({
  values: ["expanded", "collapsed"],
  defaultValue: "expanded",
  attribute: "data-sidebar",
  storage: createLocalStorage("uiset-sidebar"),
})

function useNarrow(query: string) {
  return useSyncExternalStore(
    (listener) => {
      const list = matchMedia(query)
      list.addEventListener("change", listener)
      return () => list.removeEventListener("change", listener)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

// An AppShell inside another (a template shown in an app's own shell) leaves Mod+B to the outer
// one: both toggle the same remembered sidebar, and UI SDK warns about a shortcut registered twice.
const InShell = createContext(false)

// A sidebar layout. On wide screens the sidebar collapses to icons (Mod+B, remembered);
// on narrow ones it moves into a drawer opened from the header.
function AppShell({
  brand,
  sidebar: navigation,
  header,
  children,
  label = "Navigation",
  narrowBelow = "48rem",
  contentElement = "main",
}: {
  brand?: ReactNode
  sidebar: ReactNode
  header?: ReactNode
  children: ReactNode
  label?: string
  narrowBelow?: string
  contentElement?: "main" | "div"
}) {
  const narrow = useNarrow(`(max-width: ${narrowBelow})`)
  const { value } = usePreference(sidebar)
  const toggle = () => sidebar.set(value === "expanded" ? "collapsed" : "expanded")
  const nested = useContext(InShell)
  useShortcut(narrow || nested ? null : "mod+b", toggle, {
    description: "Collapse or expand the sidebar",
  })
  const hint = useShortcutHint("mod+b")
  const Content = contentElement

  return (
    <InShell.Provider value={true}>
      <Preferences preferences={[sidebar]}>
        <div className="app-shell" data-narrow={narrow ? "" : undefined}>
          {!narrow && (
            <aside className="app-sidebar" aria-label={label}>
              <div className="app-sidebar-top">
                <div className="app-brand">{brand}</div>
                <Button
                  variant="ghost"
                  className="app-sidebar-toggle"
                  aria-label={
                    value === "expanded" ? "Collapse sidebar" : "Expand sidebar"
                  }
                  aria-keyshortcuts={hint.ariaKeyshortcuts}
                  onClick={toggle}
                >
                  <Icon name="sidebar" />
                </Button>
              </div>
              {navigation}
            </aside>
          )}
          <div className="app-main">
            {(header || narrow) && (
              <header className="app-header">
                {narrow && (
                  <Drawer side="start">
                    <DrawerTrigger
                      className="app-menu-button"
                      aria-label="Open navigation"
                    >
                      <Icon name="menu" />
                    </DrawerTrigger>
                    <DrawerBackdrop />
                    <DrawerContent className="app-drawer">
                      <div className="app-sidebar-top">
                        <DrawerTitle className="app-brand">{brand ?? label}</DrawerTitle>
                        <DrawerClose
                          aria-label="Close navigation"
                          className="app-sidebar-toggle"
                        >
                          <Icon name="close" />
                        </DrawerClose>
                      </div>
                      {navigation}
                    </DrawerContent>
                  </Drawer>
                )}
                {header}
              </header>
            )}
            <Content className="app-content">{children}</Content>
          </div>
        </div>
      </Preferences>
    </InShell.Provider>
  )
}

function SidebarNav({
  label = "Sections",
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <nav aria-label={label} className="sidebar-nav">
      {children}
    </nav>
  )
}

function SidebarGroup({ title, children }: { title?: string; children: ReactNode }) {
  const id = useId()
  return (
    <div className="sidebar-group">
      {title && (
        <p id={id} className="sidebar-group-title">
          {title}
        </p>
      )}
      <ul aria-labelledby={title ? id : undefined}>{children}</ul>
    </div>
  )
}

// The tooltip only shows while the sidebar is collapsed to icons.
function SidebarItem({
  href,
  icon,
  current = false,
  badge,
  children,
}: {
  href: string
  icon?: ReactNode
  current?: boolean
  badge?: ReactNode
  children: string
}) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href={href}
              className="sidebar-link"
              aria-current={current ? "page" : undefined}
            />
          }
        >
          {icon && <span className="sidebar-icon">{icon}</span>}
          <span className="sidebar-label">{children}</span>
          {badge && <span className="uiset-visually-hidden">, </span>}
          {badge && <span className="sidebar-badge">{badge}</span>}
        </TooltipTrigger>
        {/* It only repeats the link's name, and a closed tooltip takes its trigger's name for
            agents (vercel-labs/ui#604): hidden from them, so the name finds one component. */}
        <TooltipContent side="right" className="sidebar-tooltip" data-agent-hidden="">
          {children}
        </TooltipContent>
      </Tooltip>
    </li>
  )
}

export { AppShell, SidebarGroup, SidebarItem, SidebarNav }
