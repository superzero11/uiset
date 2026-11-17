import { lazy, Suspense } from "react"
import { flushSync } from "react-dom"
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from "@/registry/uiset/ui/accordion"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"
import { Timeline, TimelineConnector, TimelineDescription, TimelineItem, TimelineMarker, TimelineTime, TimelineTitle } from "@/registry/uiset/ui/timeline"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { benchmark } from "../benchmark-results"
import { ChatDemo } from "../chat-demo"
import { facts } from "../facts"
import { CodeBlock, CommandLine, InstallCommand } from "../shell/code"
import { useSiteTheme } from "../shell/layout"
import { SITE, usePageMeta } from "../shell/meta"
import { SkinPicker, skinValues, useUrlState } from "../shell/skin-picker"
import { SkinsDemo } from "../skins-demo"
import { Specimen } from "../specimen"

/* ------------------------------------------------------------------ content */

// Newest first. Keep three: the row has room for three before it scrolls.
const whatsNew = [
  {
    date: "2026-11-17",
    title: "Agent readiness check",
    href: "/agents#agent-check",
    what: "See whether an agent can find every control on a page by name: a score, and what to fix. Run it in tests, from a bookmarklet, or on any public link.",
  },
  {
    date: "2026-11-17",
    title: "Schema form",
    href: "/docs/kits/forms",
    what: "A form drawn from a JSON Schema that registers itself as a tool agents can call. In React and as a Web Component.",
  },
  {
    date: "2026-11-17",
    title: "Listed in shadcn’s directory",
    href: "/docs/installation",
    what: "Install any item by its name, like @uiset/chat, with the shadcn CLI.",
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

const offerings = [
  { href: "/components", name: "Components", count: `${facts.sdkComponents} + ${facts.appParts}`, what: "Every UI SDK component, styled, plus the app frame, data display and form parts: sidebar layout, page header, cards, tables, badges, stats, alerts, code blocks, uploads." },
  { href: "/kits", name: "Kits", count: String(facts.kits.length), what: "The big pieces apps need and UI SDK leaves to you: chat, rich text, a data grid, charts, a board, a scheduler, a canvas, an IDE, a terminal." },
  { href: "/templates", name: "Templates", count: String(facts.templates), what: "Whole pages to start from: auth, dashboard, settings, admin, inbox, chat app, project board, calendar, pricing, IDE." },
  { href: "/themes", name: "Themes", count: String(facts.skins), what: "Five skins you can switch live and nest, and a generator that turns one color into a complete, checked theme." },
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

const checks = [
  ["Accessibility", "Every component, kit and template is checked with axe in every skin and theme: text contrast, control edges, names and roles."],
  ["Keyboard", "Each kit is driven by keyboard in its tests: moving cards, editing cells, drawing events, writing rich text."],
  ["Agents", "Each kit has a test where an agent reads it and acts through UI SDK’s bridge, by the names people see."],
  ["Mutation tests", "Each new behavior is broken on purpose to prove a test notices, then restored."],
  ["Installs", "Every item is installed on its own and all together into a fresh app, then type-checked and built."],
  ["The rest", "Right-to-left, Windows high contrast, reduced motion, phone widths, and React and web versions side by side."],
]

const roadmap = [
  ["More skins", "Cockpit (guarded switches and gauges), Paper (cards and tape) and Print (brutalist type), each with its own sound."],
  ["Framework guides", "Step-by-step setups for Angular and Solid with the Web Components build, after the Vue and Svelte ones."],
  ["More templates", "Onboarding, a settings console wired for agents, and a docs site."],
  ["Following UI SDK", "UISet tracks UI SDK’s releases, and reports the issues it finds upstream, until UI SDK 1.0."],
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
        <SkinPicker value={skin} onChange={change} />
      </div>
      <UISet skin={skin} theme={theme} sound className="stage-surface hero-surface">
        <Specimen />
      </UISet>
      <p className="hero-stage-note">The same live form in every skin. Tab through it: keyboard, focus and screen reader behavior never change.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ the page */

function HomePage() {
  const { theme } = useSiteTheme()
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
      <section className="whats-new" aria-labelledby="whats-new-title">
        <div className="whats-new-head">
          <h2 id="whats-new-title">What&rsquo;s new</h2>
          <a href="https://github.com/superzero11/uiset/blob/main/CHANGELOG.md">Changelog</a>
        </div>
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
      </section>

      {/* 1. What it is */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">Build the whole interface on UI&nbsp;SDK.</h1>
          <p className="hero-lede">
            UISet is the components, kits, templates and themes for Vercel&rsquo;s UI SDK. UI SDK handles keyboard, focus, screen readers and agents; UISet adds how it looks, the big
            components real apps need, and whole pages. Install any piece with the shadcn CLI. It&rsquo;s plain CSS, so it needs no Tailwind and works beside it.
          </p>
          <div className="hero-actions">
            <a className="button-link" data-variant="solid" href="/docs">
              Get started
            </a>
            <a className="button-link" href="/components">
              Browse components
            </a>
          </div>
          <InstallCommand items={["uiset"]} label="Install UISet" />
        </div>
        <HeroStage />
      </section>

      {/* 2. Why it exists */}
      <section className="band" aria-labelledby="layers-title">
        <div className="band-intro">
          <h2 id="layers-title">UI SDK gives you behavior. UISet gives you everything else.</h2>
          <p>
            UI SDK moved the hard part of UI into reusable behaviors: arrow keys, focus, selection, popups, drag and drop, and the ARIA that goes with them, plus a bridge that lets agents
            work the controls. It ships its components unstyled, and it leaves the large ones to you. That&rsquo;s where UISet starts.
          </p>
        </div>
        <div className="layers" role="group" aria-label="What each layer provides">
          <div className="layer layer-uiset">
            <h3>UISet</h3>
            <dl>
              <div>
                <dt>Looks</dt>
                <dd>five skins, a theme generator, sound and haptics</dd>
              </div>
              <div>
                <dt>{facts.sdkComponents} styled components</dt>
                <dd>and {facts.appParts} app parts</dd>
              </div>
              <div>
                <dt>{facts.kits.length} kits</dt>
                <dd>chat, rich text, data grid, charts, scheduler and more</dd>
              </div>
              <div>
                <dt>{facts.templates} page templates</dt>
                <dd>to start from</dd>
              </div>
              <div>
                <dt>Web Components</dt>
                <dd>for Vue, Svelte, Solid and HTML</dd>
              </div>
              <div>
                <dt>A skill and llms.txt</dt>
                <dd>for coding agents</dd>
              </div>
            </dl>
          </div>
          <div className="layer layer-sdk">
            <h3>UI SDK</h3>
            <dl>
              <div>
                <dt>Behaviors</dt>
                <dd>keyboard, focus, selection, popups, drag and drop</dd>
              </div>
              <div>
                <dt>{facts.sdkComponents} components</dt>
                <dd>unstyled</dd>
              </div>
              <div>
                <dt>Agent bridge</dt>
                <dd>and WebMCP</dd>
              </div>
              <div>
                <dt>Five frameworks</dt>
                <dd>React, Vue, Svelte, Solid, Web Components</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* 3. What's inside */}
      <section className="band" aria-labelledby="inside-title">
        <div className="band-intro">
          <h2 id="inside-title">Everything a product needs, in one set</h2>
          <p>Pick what you need; each item installs on its own and brings only what it uses. You never mix in a second UI library.</p>
        </div>
        <ul className="offerings">
          {offerings.map((o) => (
            <li key={o.href}>
              <a href={o.href} className="offering">
                <span className="offering-count">{o.count}</span>
                <span className="offering-name">{o.name}</span>
                <span className="offering-what">{o.what}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="band-more">
          Looking for a full calendar, a time picker, multi-select or a dropzone? <a href="/docs/looking-for">Find where each one is</a>.
        </p>
      </section>

      {/* 4. Kits, live */}
      <section className="band" aria-labelledby="kits-title">
        <div className="band-intro">
          <h2 id="kits-title">Kits you&rsquo;d otherwise build yourself</h2>
          <p>These are the real components, running. Each is keyboard-first, readable by screen readers and agents, and styled by the skin around it.</p>
        </div>
        <Tabs value={kit} onValueChange={(v) => v && setKit(v as string)} className="home-kits">
          <TabsList aria-label="Kit" className="home-kit-tabs">
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
                  <UISet skin="base" theme={theme} className="grid-stage">
                    <Suspense fallback={<p className="home-kit-loading">Loading the {k.name.toLowerCase()} demo…</p>}>{k.demo}</Suspense>
                  </UISet>
                  <div className="kit-actions">
                    <InstallCommand items={k.items} label={`Install the ${k.name} kit`} />
                    <a className="kit-docs" href={k.docs}>
                      {k.name} docs
                    </a>
                  </div>
                </>
              )}
            </TabsPanel>
          ))}
        </Tabs>
        <p className="band-more">
          <a href="/kits">All {facts.kits.length} kits</a>, including the board, canvas, IDE, mobile patterns, terminal and the Studio synth.
        </p>
      </section>

      {/* 5. Agents */}
      <section className="band" aria-labelledby="agents-title">
        <div className="band-intro">
          <h2 id="agents-title">Agents can use it, not just look at it</h2>
          <p>
            Every control is named for UI SDK&rsquo;s agent bridge, so an agent reads the page as data and works the controls directly, with no screenshots. Risky steps wait for a
            person in the Agent Console, and every change can be undone.
          </p>
        </div>
        {benchmark && (
          <div className="bench-summary">
            <p>{benchmark.headline}</p>
            <dl className="bench-figures">
              {benchmark.summary.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <p className="band-more">
          <a href="/agents">The benchmark, the method and a live demo</a>
        </p>
      </section>

      {/* 6. Themes */}
      <section className="band" id="skins" aria-labelledby="skins-title">
        <div className="band-intro">
          <h2 id="skins-title">Five skins, one set of components</h2>
          <p>
            A skin is pure CSS: colors, type, edges, sound and motion. Keyboard, focus, screen reader and agent behavior stay the same in every one, and each is checked for contrast in
            every component. Skins nest, so one page can mix them, and the generator makes your own.
          </p>
        </div>
        <SkinsDemo theme={theme} />
        <p className="band-more">
          <a href="/themes/generator">Make your own theme from one color</a>
        </p>
      </section>

      {/* 7. Quality */}
      <section className="band" aria-labelledby="quality-title">
        <div className="band-intro">
          <h2 id="quality-title">Tested like the infrastructure it is</h2>
          <p>A UI library is only as good as its worst state. These run on every change.</p>
        </div>
        <dl className="checks">
          {checks.map(([name, what]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 8. Start */}
      <section className="band" aria-labelledby="start-title">
        <div className="band-intro">
          <h2 id="start-title">Start in three steps</h2>
        </div>
        <ol className="steps">
          <li>
            <h3>Add the root</h3>
            <p>It brings the tokens, the skins and the sound, into your project&rsquo;s components folder.</p>
            <InstallCommand items={["uiset"]} label="Add the root" />
          </li>
          <li>
            <h3>Wrap your app</h3>
            <p>Every UISet and UI SDK component inside takes the skin. With a shadcn theme on the page, the base skin uses it.</p>
            <CodeBlock language="tsx" title="app.tsx" code={'import { UISet } from "@/components/ui/uiset"\n\nexport function App() {\n  return <UISet skin="base">{/* your app */}</UISet>\n}'} />
          </li>
          <li>
            <h3>Add what you need</h3>
            <p>Components, kits or a whole page, each with one command.</p>
            <InstallCommand items={["button", "field", "data-grid"]} label="Add components and a kit" />
          </li>
        </ol>
        <p className="band-more">
          <a href="/docs/installation">Installation</a> covers manual setup, fonts and Web Components.
        </p>
      </section>

      {/* 9. Frameworks */}
      <section className="band" aria-labelledby="frameworks-title">
        <div className="band-intro">
          <h2 id="frameworks-title">React, or anything that renders HTML</h2>
          <p>
            Every kit and template also ships as Web Components with the same styles and behavior, for Vue, Svelte, Solid, Angular and plain HTML. There are guides for <a href="/docs/vue">Vue</a> and{" "}
            <a href="/docs/svelte">Svelte</a>.
          </p>
        </div>
        <Tabs defaultValue="react" className="framework-tabs">
          <TabsList aria-label="Framework">
            <TabsTab value="react">React</TabsTab>
            <TabsTab value="web">Web Components</TabsTab>
          </TabsList>
          <TabsPanel value="react">
            <CodeBlock
              language="tsx"
              title="notes.tsx"
              code={'import { RichTextEditor } from "@/components/ui/rich-text"\nimport { UISet } from "@/components/ui/uiset"\n\n<UISet skin="ink">\n  <RichTextEditor label="Release notes" defaultValue="## Release 2.4" />\n</UISet>'}
            />
          </TabsPanel>
          <TabsPanel value="web">
            <CommandLine command="npm install @uiset/web @ui-sdk/web" />
            <CodeBlock
              language="html"
              title="index.html"
              code={'<script type="module">\n  import "@uiset/web"\n</script>\n\n<uiset-root skin="ink">\n  <uiset-rich-text label="Release notes" value="## Release 2.4"></uiset-rich-text>\n</uiset-root>'}
            />
          </TabsPanel>
        </Tabs>
      </section>

      {/* 10. Questions */}
      <section className="band" aria-labelledby="faq-title">
        <div className="band-intro">
          <h2 id="faq-title">Questions</h2>
        </div>
        <Accordion aria-label="Questions" className="faq">
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

      {/* 11. Where it's going */}
      <section className="band" aria-labelledby="next-title">
        <div className="band-intro">
          <h2 id="next-title">Where it&rsquo;s going</h2>
          <p>UISet grows with UI SDK. What&rsquo;s next, in the open:</p>
        </div>
        <dl className="checks">
          {roadmap.map(([name, what]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <p className="band-more">
          <a href="/docs/roadmap">The full roadmap</a>
        </p>
      </section>
    </div>
  )
}

export { faq }
export default HomePage
