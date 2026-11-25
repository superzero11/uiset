import registry from "@/registry.json"
import sdkComponents from "./sdk-components.json"

// Every docs page, in sidebar order. Markdown pages name their file in docs/; component pages
// are drawn from the registry. Search, the sitemap and the prerender all read this list.

type DocPage = {
  path: string
  title: string
  section: string
  description: string
  /** A Markdown file in docs/, for guide and kit pages. */
  file?: string
  /** A registry item, for component pages. */
  item?: string
  /** A UISet part (app frame, data display, forms), not a UI SDK component: no API reference
   *  from UI SDK, and a link to its section in its kit's guide instead. */
  part?: { guide: string }
  keywords?: string[]
}

type Item = { name: string; title?: string; description?: string; type: string }

// The app frame's, data display's and forms' parts, each with its section in its kit's guide.
const appParts: Record<string, string> = {
  "app-shell": "/docs/kits/app-shell#the-shell",
  breadcrumbs: "/docs/kits/app-shell#page-parts",
  "page-header": "/docs/kits/app-shell#page-parts",
  card: "/docs/kits/app-shell#page-parts",
  stepper: "/docs/kits/app-shell#page-parts",
  "search-field": "/docs/kits/app-shell#page-parts",
  badge: "/docs/kits/app-shell#data-display",
  stat: "/docs/kits/app-shell#data-display",
  "empty-state": "/docs/kits/app-shell#data-display",
  skeleton: "/docs/kits/app-shell#data-display",
  "description-list": "/docs/kits/app-shell#data-display",
  "item-list": "/docs/kits/app-shell#data-display",
  alert: "/docs/kits/app-shell#data-display",
  kbd: "/docs/kits/app-shell#data-display",
  spinner: "/docs/kits/app-shell#data-display",
  "avatar-group": "/docs/kits/app-shell#data-display",
  table: "/docs/kits/app-shell#table",
  "code-block": "/docs/kits/app-shell#code",
  "copy-button": "/docs/kits/app-shell#code",
  "schema-form": "/docs/kits/forms#schema-form",
  "inline-edit": "/docs/kits/forms#inline-edit",
  "tag-input": "/docs/kits/forms#tag-input",
  "phone-input": "/docs/kits/forms#phone-input",
  "input-mask": "/docs/kits/forms#input-mask",
  upload: "/docs/kits/forms#upload",
  "sortable-list": "/docs/kits/lists#sortable-list",
  "sortable-tree": "/docs/kits/lists#sortable-tree",
  "chat-message-parts": "/docs/kits/chat#agent-parts",
  "number-ticker": "/docs/kits/motion#number-ticker",
  "text-reveal": "/docs/kits/motion#text-reveal",
  thinking: "/docs/kits/motion#thinking",
  crossfade: "/docs/kits/motion#crossfade",
}
const items = (registry as { items: Item[] }).items
const describe = (name: string) => items.find((i) => i.name === name)?.description ?? ""

const guides: DocPage[] = [
  { path: "/docs", title: "Introduction", file: "introduction.md", description: "What UISet is, how it relates to UI SDK and shadcn/ui, and what's in it." },
  { path: "/docs/installation", title: "Installation", file: "installation.md", description: "Add UISet with the shadcn CLI or by hand, load each skin's fonts, or use the Web Components build." },
  { path: "/docs/quick-start", title: "Quick start", file: "quick-start.md", description: "Build a settings screen with a form, a toast and a data grid in a few minutes." },
  { path: "/docs/looking-for", title: "Looking for a component?", file: "looking-for.md", description: "Where the components people ask for most are in UISet: a full calendar, time picker, multi-select, dropzone, table, code block and more." },
  { path: "/docs/theming", title: "Theming", file: "theming.md", description: "Skins, the key color, dark mode, nesting, CSS variables, sound and haptics, and writing your own skin." },
  { path: "/docs/ai", title: "Building with AI agents", file: "ai.md", description: "The UISet skills and llms.txt for coding agents, and UI SDK's agent bridge for agents that use your app." },
  { path: "/docs/agent-check", title: "Agent readiness check", file: "agent-check.md", description: "Check whether an agent can use a page: every control named, each name finding one control, none it can't see, with a score. In a test, in Playwright, or from the command line." },
  { path: "/docs/web-components", title: "Web Components", file: "web-components.md", description: "Every kit and template as custom elements, for Vue, Svelte, Solid, Angular and plain HTML." },
  { path: "/docs/vue", title: "Vue", file: "vue.md", description: "UISet in a Vue 3 app: setup, passing data, events, two-way binding, skins, UI SDK's Vue components and server rendering." },
  { path: "/docs/solid", title: "Solid", file: "solid.md", description: "UISet written in Solid 2, as @uiset/solid: install, the root, the components, agents and server rendering. A preview, not on npm yet." },
  { path: "/docs/svelte", title: "Svelte", file: "svelte.md", description: "UISet in a Svelte 5 app: setup, passing data with runes, events, skins, UI SDK's Svelte components and server rendering." },
  { path: "/docs/migrate", title: "Coming from shadcn/ui", file: "migrate-from-shadcn.md", description: "What maps to what, the API differences, and how to move a shadcn/ui app over one component at a time." },
  { path: "/docs/agent-migration", title: "Agent migration recipe", file: "agent-migration.md", description: "Steps a coding agent follows to move a shadcn/ui app to UISet one component at a time, with a check after each step and an agent-readiness score at the end." },
  { path: "/docs/roadmap", title: "Roadmap", file: "roadmap.md", description: "What's shipped, what's next, and how UISet follows UI SDK to 1.0." },
].map((p) => ({ ...p, section: "Get started" }))

const kits: DocPage[] = [
  { slug: "app-shell", title: "App frame and data display", file: "app-shell.md", item: "app-shell" },
  { slug: "forms", title: "Forms: schema form, inline edit, tag, phone and masked inputs, upload", file: "forms.md", item: "schema-form" },
  { slug: "lists", title: "Sortable lists and trees", file: "lists.md", item: "sortable-list" },
  { slug: "payments", title: "Payments", file: "payments.md", item: "payments" },
  { slug: "address", title: "Address", file: "address.md", item: "address" },
  { slug: "motion", title: "Motion", file: "motion.md", item: "number-ticker" },
  { slug: "chat", title: "Chat", file: "chat.md", item: "chat" },
  { slug: "rich-text", title: "Rich text", file: "rich-text.md", item: "rich-text" },
  { slug: "data-grid", title: "Data grid", file: "data-grid.md", item: "data-grid" },
  { slug: "charts", title: "Charts", file: "charts.md", item: "chart" },
  { slug: "board", title: "Board", file: "board.md", item: "board" },
  { slug: "scheduler", title: "Scheduler", file: "scheduler.md", item: "scheduler" },
  { slug: "canvas", title: "Canvas", file: "canvas.md", item: "canvas" },
  { slug: "ide", title: "IDE", file: "ide.md", item: "ide" },
  { slug: "mobile", title: "Mobile", file: "mobile.md", item: "mobile" },
  { slug: "terminal", title: "Terminal", file: "terminal.md", item: "terminal" },
  { slug: "studio", title: "Studio", file: "studio-kit.md", item: "knob" },
  { slug: "agent-console", title: "Agent Console", file: "agent-console.md", item: "agent-console" },
].map((k) => ({ path: `/docs/kits/${k.slug}`, title: k.title, file: k.file, section: "Kits", description: describe(k.item) || `The ${k.title} kit.` }))

const skins: DocPage[] = [
  { slug: "blueprint", title: "Blueprint", file: "blueprint.md" },
  { slug: "studio", title: "Studio", file: "studio.md" },
  { slug: "phosphor", title: "Phosphor", file: "phosphor.md" },
  { slug: "ink", title: "Ink", file: "ink.md" },
].map((s) => ({ path: `/docs/skins/${s.slug}`, title: s.title, file: s.file, section: "Skins", description: `The ${s.title} skin: its design, tokens, type and contrast.` }))

const templates: DocPage[] = [{ path: "/docs/templates", title: "Templates", file: "templates.md", section: "Templates", description: "Whole pages built only from UISet items: what each one takes, and how to connect your data." }]

// UI SDK's own components, each a UISet item with a page of its own.
const SDK = new Set<string>(sdkComponents)
const components: DocPage[] = [
  ...items
    .filter((i) => SDK.has(i.name))
    .map((i) => ({ path: `/docs/components/${i.name}`, title: i.title ?? i.name, item: i.name, section: "Components", description: i.description ?? "" })),
  ...items
    .filter((i) => appParts[i.name])
    .map((i) => ({ path: `/docs/components/${i.name}`, title: i.title ?? i.name, item: i.name, section: "Components", description: i.description ?? "", part: { guide: appParts[i.name]! } })),
].sort((a, b) => a.title.localeCompare(b.title))

const docPages: DocPage[] = [...guides, ...kits, ...skins, ...templates, ...components]
const docSections = ["Get started", "Kits", "Components", "Templates", "Skins"]

/** The docs path for a Markdown file in docs/, if it has a page. */
const pathOfFile = new Map(docPages.filter((p) => p.file).map((p) => [p.file!, p.path]))

export { docPages, docSections, pathOfFile }
export type { DocPage }
