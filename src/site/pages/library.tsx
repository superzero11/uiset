import { components, kits, templateCards, themeCards, type Card } from "../library"
import { LibraryCard, previewOf } from "../library-card"
import { usePageMeta } from "../shell/meta"
import { useLocation } from "../shell/router"
import { useSkin } from "../shell/skin-picker"

// The library: Components, Kits, Templates and Themes as tabs (each its own address), each a
// grid of cards (library-card.tsx).

const tabs = [
  {
    href: "/components",
    title: "Components",
    cards: components,
    meta: {
      title: "UI SDK components, styled",
      description:
        "All 55 of Vercel's UI SDK components, styled by UISet and installable one by one with the shadcn CLI. Keyboard, focus and screen reader support come from UI SDK.",
    },
  },
  {
    href: "/kits",
    title: "Kits",
    cards: kits,
    meta: {
      title: "UI SDK kits: chat, rich text, data grid, charts and more",
      description:
        "Large, complete components built on Vercel's UI SDK: a chat kit, a rich text editor, a data grid, charts, a kanban board, a scheduler, a node canvas, an IDE, mobile patterns, a terminal, a synth studio and an agent console.",
    },
  },
  {
    href: "/templates",
    title: "Templates",
    cards: templateCards,
    meta: {
      title: "UI SDK page templates",
      description:
        "Ten whole pages built only from UISet items on Vercel's UI SDK: auth, dashboard, settings, admin, inbox, chat app, project board, calendar, pricing and an IDE.",
    },
  },
  {
    href: "/themes",
    title: "Themes",
    cards: themeCards,
    meta: {
      title: "Themes for UI SDK: five skins and a generator",
      description: "Five skins for Vercel's UI SDK components (Base, Blueprint, Studio, Phosphor and Ink), each checked for contrast in every component, and a generator that turns one color into a theme.",
    },
  },
] as const

function LibraryPage() {
  const { pathname } = useLocation()
  const tab = tabs.find((t) => t.href === pathname) ?? tabs[0]
  const [skin] = useSkin()
  usePageMeta({ ...tab.meta, path: tab.href })
  return (
    <div className="lib">
      <h1 className="lib-title">
        Components, kits, templates and themes for UI&nbsp;SDK &ndash;{" "}
        <br />
        install any piece with the shadcn CLI.
      </h1>
      <nav className="lib-tabs" aria-label="Library">
        {tabs.map((t) => (
          <a key={t.href} href={t.href} className="lib-tab" aria-current={t === tab ? "page" : undefined}>
            {t.title}
            <span className="site-count">{t.cards.length}</span>
          </a>
        ))}
        {tab.href === "/components" && (
          <a className="lib-tabs-end" href="/gallery">
            Try them all live
          </a>
        )}
        {tab.href === "/themes" && (
          <a className="lib-tabs-end" href="/themes/generator">
            Make a theme from one color
          </a>
        )}
      </nav>
      <div className="lib-grid">
        {(tab.cards as readonly Card[]).map((card) => (
          <LibraryCard key={card.id} card={card} skin={tab.href === "/themes" ? (card as (typeof themeCards)[number]).skin : skin} preview={previewOf(tab.href === "/components" ? "component" : tab.href === "/kits" ? "kit" : tab.href === "/templates" ? "template" : "theme", card)} />
        ))}
      </div>
    </div>
  )
}

export default LibraryPage
