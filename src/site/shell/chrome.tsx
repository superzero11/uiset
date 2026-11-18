import { useEffect, useMemo, useState } from "react"
import { useShortcut, useShortcutHint } from "@ui-sdk/react/shortcuts"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, type CommandData } from "@/registry/uiset/ui/command"
import { createDialogController, Dialog, DialogBackdrop, DialogContent, DialogTitle, DialogTrigger } from "@/registry/uiset/ui/dialog"
import { SegmentedControl, SegmentedControlItem } from "@/registry/uiset/ui/segmented-control"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "@/registry/uiset/ui/select"
import type { Skin } from "@/registry/uiset/ui/uiset"
import { Logo } from "./logo"
import { navigate } from "./router"
import type { SearchEntry } from "./search-data"
import { GithubIcon, SearchIcon, SkinIcon, ThemeIcon, XIcon, type SiteTheme } from "./site-icons"
import { skins, useSkin } from "./skin-picker"

// The parts both of the site's frames use: search, the theme switch, GitHub and the footer.

/* ------------------------------------------------------------------ search */

// One dialog for the page, opened by whichever search field the frame shows (the top nav's,
// the sidebar's, the phone header's) and by Mod+K. Focus goes back to what opened it.
const search = createDialogController()

function SearchField({ compact = false }: { compact?: boolean }) {
  const hint = useShortcutHint("mod+k")
  return (
    <DialogTrigger controller={search} className={compact ? "site-search site-search-compact" : "site-search"} aria-label="Search docs" aria-keyshortcuts={hint.ariaKeyshortcuts}>
      <SearchIcon />
      {!compact && (
        <>
          <span className="site-search-label">Search…</span>
          <kbd className="site-search-keys" aria-hidden="true">
            {hint.text}
          </kbd>
        </>
      )}
    </DialogTrigger>
  )
}

function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  useShortcut("mod+k", () => void search.open(), { description: "Search docs" })
  // The index (every docs page and registry item) loads the first time search opens.
  const [entries, setEntries] = useState<SearchEntry[] | null>(null)
  useEffect(() => {
    if (open && !entries) import("./search-data").then((m) => setEntries(m.searchEntries()))
  }, [open, entries])
  const byPath = useMemo(() => new Map((entries ?? []).map((e) => [e.path, e])), [entries])
  const items = useMemo(() => (entries ?? []).map((e) => ({ value: e.path, label: e.title, keywords: [e.section, ...(e.keywords ?? [])] })), [entries])
  return (
    <Dialog controller={search} onOpenChange={(next: boolean) => (setOpen(next), next && setQuery(""))}>
      <DialogBackdrop className="site-search-backdrop" />
      <DialogContent className="site-search-dialog" initialFocus="input">
        <DialogTitle className="uiset-visually-hidden">Search the docs</DialogTitle>
        <Command
          items={items}
          query={query}
          onQueryChange={(next: string, details: { reason?: string }) => (details?.reason === "escape-key" ? search.close() : setQuery(next))}
          onAction={(path: string) => {
            search.close()
            navigate(path)
          }}
        >
          <CommandInput aria-label="Search components, kits, templates and guides" placeholder="Search components, kits, templates…" />
          <CommandEmpty className="site-search-empty">{entries ? "Nothing matches. Try a component name, like “select” or “data grid”." : "Loading the index…"}</CommandEmpty>
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

/* ------------------------------------------------------------------ theme and GitHub */

function ThemeSwitch({ theme, setTheme }: { theme: SiteTheme; setTheme: (t: SiteTheme) => void }) {
  return (
    <SegmentedControl className="site-theme" aria-label="Theme" value={theme} onValueChange={(v) => v && setTheme(v as SiteTheme)}>
      {(["system", "light", "dark"] as const).map((t) => (
        <SegmentedControlItem key={t} value={t} aria-label={t === "system" ? "System" : t === "light" ? "Light" : "Dark"}>
          <ThemeIcon theme={t} />
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

/** The skin the whole site wears, beside the theme switch. */
function SkinSwitch() {
  const [skin, setSkin] = useSkin()
  return (
    <div className="site-skin">
      <Select value={skin} onValueChange={(v) => v && setSkin(v as Skin)}>
        {/* "Site skin": a page's own skin pickers ("Skin of the live form") must not share its words. */}
        <SelectLabel className="uiset-visually-hidden">Site skin</SelectLabel>
        <SelectTrigger>
          <SkinIcon />
          {skins.find((s) => s.value === skin)?.label}
        </SelectTrigger>
        <SelectContent>
          {skins.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function GithubLink() {
  return (
    <a className="site-github" href="https://github.com/superzero11/uiset" aria-label="UISet on GitHub">
      <GithubIcon />
    </a>
  )
}

/* ------------------------------------------------------------------ footer */

const footerColumns = [
  {
    title: "Library",
    links: [
      ["Components", "/components"],
      ["Kits", "/kits"],
      ["Templates", "/templates"],
      ["Themes", "/themes"],
      ["Theme generator", "/themes/generator"],
    ],
  },
  {
    title: "Docs",
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
      <div className="site-bottom-brand">
        <Logo />
        <p>Components, kits, templates and themes for Vercel&rsquo;s UI SDK.</p>
        <a className="site-icon-link" href="https://x.com/IAMSuperZero11" aria-label="@IAMSuperZero11 on X">
          <XIcon />
        </a>
      </div>
      <nav className="site-bottom-cols" aria-label="Footer">
        {footerColumns.map((col) => (
          <div key={col.title} className="site-bottom-col">
            <h2>{col.title}</h2>
            <ul>
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p className="site-bottom-note">
        MIT licensed. Built on <a href="https://ui-sdk.dev">UI SDK</a>, which is in beta. UISet is a community project, not affiliated with Vercel.
      </p>
    </footer>
  )
}

export { Footer, GithubLink, SearchDialog, SearchField, SkinSwitch, ThemeSwitch }
