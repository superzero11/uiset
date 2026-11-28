import { lazy, Suspense, useEffect, useState, type ComponentType } from "react"
import { flushSync } from "react-dom"
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from "@/registry/uiset/ui/accordion"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"
import { Timeline, TimelineConnector, TimelineDescription, TimelineItem, TimelineMarker, TimelineTime, TimelineTitle } from "@/registry/uiset/ui/timeline"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { benchmark } from "../benchmark-results"
import { ChatDemo } from "../chat-demo"
import { examples } from "../examples"
import { facts } from "../facts"
import { components, kits, type Card } from "../library"
import { LibraryCard, previewOf, type Kind } from "../library-card"
import { CodeBlock, CommandLine, InstallCommand } from "../shell/code"
import { useSiteTheme } from "../shell/layout"
import { SITE, usePageMeta } from "../shell/meta"
import { ArrowIcon } from "../shell/site-icons"
import { SkinPicker, skinValues, useSkin, useUrlState } from "../shell/skin-picker"
import { Specimen } from "../specimen"

/* ------------------------------------------------------------------ content */

// Three, oldest first: the row reads left to right in time and has room for three before
// it scrolls. A release that adds something adds its entry here (lint: content/whats-new).
const whatsNew = [
  {
    date: "2026-11-28",
    title: "Tag, phone and masked inputs",
    href: "/docs/kits/forms#tag-input",
    what: "Tags people type, paste or pick; a phone number with its country, formatted as it's typed and kept as E.164; and fields that format cards, expiry dates, IBANs and amounts. Each checks itself, and agents fill them in any format.",
  },
  {
    date: "2026-11-28",
    title: "Payments and addresses",
    href: "/docs/kits/payments",
    what: "Ways to pay as radio cards, a card that names its brand, a bank account with its mandate, an order summary with discount codes, and addresses whose fields follow their country, for 252 countries. Card numbers stay secret to agents.",
  },
  {
    date: "2026-11-28",
    title: "Checkout and invoice",
    href: "/templates/checkout",
    what: "A checkout an agent fills and a person pays, and an invoice that writes each address as its country does, says when it's due and prints without its buttons. React and Web Components.",
  },
]

const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })

const faq = [
  {
    q: "What is UISet?",
    a: "UISet is an open-source set of components, kits, page templates and themes for Vercel’s UI SDK, installed with the shadcn CLI. UI SDK provides the behavior (keyboard, focus, ARIA, agent access) and unstyled components; UISet provides how they look, the larger components apps need, and whole pages.",
  },
  {
    q: "How is it different from shadcn/ui?",
    a: "shadcn/ui styles Radix UI. UISet styles UI SDK, so it inherits UI SDK’s behaviors and its agent bridge, and it adds kits shadcn/ui doesn’t have: a data grid, chat, a rich text editor, a scheduler, a board, a node canvas, an IDE and a terminal. It installs with the same CLI and picks up your shadcn theme.",
  },
  {
    q: "Do I have to use React?",
    a: "No. Every kit and template also ships as Web Components, which work in Vue, Svelte, Solid, Angular and plain HTML. The React and web versions share the same styles and behavior.",
  },
  {
    q: "Do I need Tailwind?",
    a: "No. UISet is plain CSS in cascade layers, with no Tailwind dependency. Tailwind keeps working beside it: your utilities aren’t in UISet’s layers, so they win.",
  },
  {
    q: "Can AI agents use what I build with it?",
    a: "Yes. Every control is named for UI SDK’s agent bridge, so an agent reads the page and works the controls directly instead of reading screenshots. Risky actions can wait for a person’s approval in the Agent Console. The Agents page has our benchmark.",
  },
  {
    q: "Can my coding agent build with it?",
    a: "Yes. Install the UISet skill (npx skills add superzero11/uiset) and your agent learns the items, the skins and the rules, or point it at llms.txt. Every docs page is Markdown.",
  },
  {
    q: "Is it free, and who owns the code?",
    a: "It’s free and MIT licensed. The shadcn CLI copies each item’s source into your project, so the code is yours to change.",
  },
  {
    q: "Is it ready for production?",
    a: "UI SDK is in public beta, and UISet pins its exact version. Every item is tested for accessibility in every skin and theme, for keyboard use, and for a clean install into a new app. Expect API changes until UI SDK reaches 1.0.",
  },
  {
    q: "Is UISet made by Vercel?",
    a: "No. UISet is a community project built on UI SDK. It isn’t affiliated with Vercel.",
  },
]

// Chat shows first; the other demos load when their tab opens.
const EditorDemo = lazy(() => import("../editor-demo").then((m) => ({ default: m.EditorDemo })))
const GridDemo = lazy(() => import("../grid-demo").then((m) => ({ default: m.GridDemo })))
const ChartsDemo = lazy(() => import("../charts-demo").then((m) => ({ default: m.ChartsDemo })))
const SchedulerDemo = lazy(() => import("../scheduler-demo").then((m) => ({ default: m.SchedulerDemo })))

const kitTabs = [
  { id: "chat", name: "Chat", items: ["chat", "chat-composer"], docs: "/docs/kits/chat", demo: <ChatDemo /> },
  { id: "rich-text", name: "Rich text", items: ["rich-text"], docs: "/docs/kits/rich-text", demo: <EditorDemo /> },
  { id: "data-grid", name: "Data grid", items: ["data-grid"], docs: "/docs/kits/data-grid", demo: <GridDemo /> },
  { id: "charts", name: "Charts", items: ["line-chart", "bar-chart"], docs: "/docs/kits/charts", demo: <ChartsDemo /> },
  { id: "scheduler", name: "Scheduler", items: ["scheduler"], docs: "/docs/kits/scheduler", demo: <SchedulerDemo /> },
]

/* ------------------------------------------------------------------ the hero's skin switch */

function HeroStage() {
  const { theme } = useSiteTheme()
  const [skin, setSkin] = useUrlState<Skin>("skin", skinValues, "base")
  // The new skin wipes across the same live form: what changes is the surface, nothing else.
  const change = (next: Skin) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown }
    if (!doc.startViewTransition || reduce) return setSkin(next)
    doc.startViewTransition(() => flushSync(() => setSkin(next)))
  }
  return (
    <div className="hero-stage">
      <div className="hero-stage-controls">
        <SkinPicker value={skin} onChange={change} label="Skin of the live form" />
      </div>
      <UISet skin={skin} theme={theme} sound className="stage-surface hero-surface">
        <Specimen />
      </UISet>
      <p className="hero-stage-note">The same live form in every skin. Tab through it: keyboard, focus and screen reader behavior never change.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ the hero's sides */

// Live pieces at the hero's edges, faded out: pictures of what's inside, so inert and hidden
// from agents and screen readers (the library has the ones to use).
function HeroPiece({ slug, side }: { slug: string; side: "start" | "end" }) {
  const { theme } = useSiteTheme()
  const [skin] = useSkin()
  const [Component, setComponent] = useState<ComponentType | null>(null)
  useEffect(() => {
    let live = true
    examples
      .find((e) => e.slug === slug)
      ?.load()
      .then((loaded) => live && setComponent(() => loaded))
    return () => {
      live = false
    }
  }, [slug])
  return (
    <div className="home-piece" data-side={side} inert aria-hidden="true" data-agent-hidden="">
      {Component && (
        <UISet skin={skin} theme={theme} className="home-piece-skin">
          <Component />
        </UISet>
      )}
    </div>
  )
}

const featured: { kind: Kind; card: Card }[] = [
  ...["data-grid", "chat", "board"].map((id) => ({ kind: "kit" as const, card: kits.find((k) => k.id === id)! })),
  ...["calendar", "command", "select"].map((id) => ({ kind: "component" as const, card: components.find((c) => c.id === id)! })),
]

/* ------------------------------------------------------------------ the page */

function HomePage() {
  const { theme } = useSiteTheme()
  const [skin] = useSkin()
  const [kit, setKit] = useUrlState("kit", kitTabs.map((k) => k.id), "chat")
  usePageMeta({
    title: "UISet: components, kits, templates and themes for UI SDK",
    description:
      "Build the whole interface on Vercel's UI SDK. UISet styles all 55 UI SDK components and adds kits (chat, rich text, data grid, charts, scheduler, board, canvas, IDE), page templates and five themes. Accessible, agent-ready, installed with the shadcn CLI.",
    path: "/",
    structured: [
      { "@type": "WebSite", name: "UISet", url: SITE, description: "Components, kits, templates and themes for Vercel's UI SDK." },
      {
        "@type": "SoftwareSourceCode",
        name: "UISet",
        description: "Components, kits, page templates and themes for Vercel's UI SDK, distributed as a shadcn registry and as Web Components.",
        codeRepository: "https://github.com/superzero11/uiset",
        programmingLanguage: ["TypeScript", "CSS"],
        runtimePlatform: ["React", "Web Components"],
        license: "https://opensource.org/licenses/MIT",
        keywords: "UI SDK, UI SDK components, UI SDK UI kit, shadcn registry, React components, Web Components, accessible components, data grid, chat UI, rich text editor, agent-ready UI",
      },
      { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  })

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="hero-title">
        <HeroPiece slug="command" side="start" />
        <HeroPiece slug="item-list" side="end" />
        <a className="home-eyebrow" href="/components">
          <span className="home-eyebrow-chip">Free</span>
          {facts.registryItems} components, kits, templates and themes
          <ArrowIcon />
        </a>
        <h1 id="hero-title">Build the whole interface on UI&nbsp;SDK</h1>
        <p className="home-lede">
          Components, kits, templates and themes for Vercel&rsquo;s UI SDK, in plain CSS. UI SDK handles keyboard, focus, screen readers and agents; UISet adds the look and the
          big pieces.
        </p>
        <div className="home-actions">
          <a className="home-button" data-variant="primary" href="/components">
            Browse library
          </a>
          <a className="home-button" href="/docs/installation">
            Get started
          </a>
        </div>
      </section>

      <section className="home-section" aria-labelledby="library-title">
        <h2 id="library-title">
          Every piece styled,
          <br />
          ready to install
        </h2>
        <p className="home-sub">Each one installs on its own with the shadcn CLI and brings only what it uses.</p>
        <div className="lib-grid">
          {featured.map(({ kind, card }) => (
            <LibraryCard key={card.id} card={card} skin={skin} preview={previewOf(kind, card)} />
          ))}
        </div>
        <div className="home-more">
          <a className="home-button" href="/components">
            Explore the library
          </a>
        </div>
      </section>

      <section className="home-section" aria-labelledby="kits-title">
        <h2 id="kits-title">
          Kits you&rsquo;d otherwise
          <br />
          build yourself
        </h2>
        <p className="home-sub">The real components, running. Keyboard-first, readable by screen readers and agents, styled by the skin around them.</p>
        <Tabs value={kit} onValueChange={(v) => v && setKit(v as string)} className="home-kits">
          <TabsList aria-label="Kit demos" className="home-pills">
            {kitTabs.map((k) => (
              <TabsTab key={k.id} value={k.id}>
                {k.name}
              </TabsTab>
            ))}
          </TabsList>
          {kitTabs.map((k) => (
            <TabsPanel key={k.id} value={k.id} className="home-kit-panel">
              {kit === k.id && (
                <>
                  <UISet skin={skin} theme={theme} className="grid-stage home-frame">
                    <Suspense fallback={<p className="home-kit-loading">Loading the {k.name.toLowerCase()} demo…</p>}>{k.demo}</Suspense>
                  </UISet>
                  <div className="home-kit-foot">
                    <InstallCommand items={k.items} label={`Install the ${k.name} kit`} />
                    <a className="home-button" href={k.docs}>
                      {k.name} docs
                    </a>
                  </div>
                </>
              )}
            </TabsPanel>
          ))}
        </Tabs>
      </section>

      <section className="home-section" aria-labelledby="agents-title">
        <h2 id="agents-title">
          Built for agents,
          <br />
          not just for copy and paste
        </h2>
        <p className="home-sub">Agents work your app through UI SDK&rsquo;s bridge, by the names people see. Coding agents learn UISet from its skill.</p>
        <div className="home-duo">
          <div className="home-card">
            <h3>Agents use the page, not screenshots</h3>
            <p>Every control is named for the bridge, so an agent reads the page as data and works the controls directly. Risky steps wait for a person.</p>
            {benchmark && (
              <dl className="home-figures">
                {benchmark.summary.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <a className="home-button" href="/agents">
              The benchmark and a live demo
            </a>
          </div>
          <div className="home-card">
            <h3>Connect your coding agent in one line</h3>
            <p>The UISet skill teaches your agent the items, the skins and the rules. Prefer plain text? Every page is Markdown, and llms.txt lists them.</p>
            <CommandLine command="npx skills add superzero11/uiset" />
            <div className="home-card-links">
              <a className="home-button" href="/docs/ai">
                Set up your agent
              </a>
              <a href="/llms.txt">llms.txt</a>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section" id="skins" aria-labelledby="skins-title">
        <h2 id="skins-title">
          Five skins,
          <br />
          one set of components
        </h2>
        <p className="home-sub">A skin is plain CSS: colors, type, edges, sound and motion. Behavior never changes with it. Skins nest, and the generator makes yours.</p>
        <HeroStage />
        <div className="home-more">
          <a className="home-button" href="/themes">
            See the themes
          </a>
        </div>
      </section>

      <section className="home-section" aria-labelledby="start-title">
        <h2 id="start-title">
          One command per piece,
          <br />
          code you own
        </h2>
        <p className="home-sub">The shadcn CLI copies each item&rsquo;s source into your project. MIT licensed, no Tailwind needed, and it works beside Tailwind.</p>
        <ol className="home-steps">
          <li className="home-card">
            <h3>Add the root</h3>
            <p>The tokens, the skins and the sound, in your components folder.</p>
            <InstallCommand items={["uiset"]} label="Add the root" />
          </li>
          <li className="home-card">
            <h3>Wrap your app</h3>
            <p>Every UISet and UI SDK component inside takes the skin.</p>
            <CodeBlock language="tsx" title="app.tsx" code={'<UISet skin="base">\n  {/* your app */}\n</UISet>'} />
          </li>
          <li className="home-card">
            <h3>Add what you need</h3>
            <p>Components, kits or a whole page, each with one command.</p>
            <InstallCommand items={["button", "data-grid"]} label="Add components and a kit" />
          </li>
        </ol>
      </section>

      <section className="home-section" aria-labelledby="whats-new-title">
        <h2 id="whats-new-title">What&rsquo;s new</h2>
        <Timeline orientation="horizontal" loop={false} aria-labelledby="whats-new-title" className="whats-new-list">
          {whatsNew.map((entry) => (
            <TimelineItem key={entry.href}>
              <TimelineMarker />
              <TimelineConnector />
              <TimelineTitle>
                <a href={entry.href}>{entry.title}</a>
              </TimelineTitle>
              <TimelineTime dateTime={entry.date}>{shortDate(entry.date)}</TimelineTime>
              <TimelineDescription>{entry.what}</TimelineDescription>
            </TimelineItem>
          ))}
        </Timeline>
        <div className="home-more">
          <a className="home-button" href="https://github.com/superzero11/uiset/blob/main/CHANGELOG.md">
            Changelog
          </a>
        </div>
      </section>

      <section className="home-section" aria-labelledby="faq-title">
        <h2 id="faq-title">Questions</h2>
        <Accordion aria-label="Questions" className="home-faq">
          {faq.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionHeader>
                <AccordionTrigger>{f.q}</AccordionTrigger>
              </AccordionHeader>
              <AccordionPanel>
                <p>{f.a}</p>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}

export { faq }
export default HomePage
