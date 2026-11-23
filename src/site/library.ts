import type { Skin } from "@/registry/uiset/ui/uiset"
import { docPages } from "./docs/nav"
import { exampleMetas, exampleSlugByItem, groups } from "./examples/meta"
import { templates, type TemplateId } from "./template-list"

// The library's contents as data: what the Library tabs show as cards, the sidebar lists, and
// each kit's and template's page draws. The live demos themselves are in library-demos.tsx.

type Card = {
  id: string
  title: string
  description: string
  href: string
  /** The registry items its install command adds. */
  items: string[]
  /** A word for what kind of thing it is, shown on the card. */
  tag?: string
}

const groupOf = new Map(groups.flatMap(([group, metas]) => metas.map((m) => [m.slug, group] as const)))

/** Each UI SDK component and each of UISet's parts, with the example its page shows. */
const components: (Card & { example?: string })[] = docPages
  .filter((p) => p.section === "Components")
  .map((p) => {
    const example = exampleSlugByItem.get(p.item!)
    return { id: p.item!, title: p.title, description: p.description, href: p.path, items: [p.item!], example, tag: example ? groupOf.get(example) : undefined }
  })

type Kit = Card & {
  /** The headline on its page. */
  headline: string
  /** The demo's class on its page, for its height. */
  stage?: string
  /** Live examples drawn under a section of its page: the heading's id, and the item's example. */
  sections?: Record<string, string>
}

const kitText: Record<string, { headline: string; items: string[]; tag: string; stage?: string; description?: string; sections?: Record<string, string> }> = {
  "app-shell": { headline: "The frame of an app, and the parts that show data", items: ["app-shell", "page-header", "stat", "table"], tag: "Structure", sections: { table: "table" } },
  forms: {
    headline: "Forms from a schema, inline edits, tags, phone numbers, masks and uploads",
    items: ["schema-form", "inline-edit", "tag-input", "phone-input", "input-mask", "upload"],
    tag: "Inputs",
    sections: { "inline-edit": "inline-edit", "tag-input": "tag-input", "phone-input": "phone-input", "input-mask": "input-mask", upload: "upload" },
  },
  motion: {
    headline: "Numbers, text and content that move, each skin its own way",
    items: ["number-ticker", "text-reveal", "thinking", "crossfade"],
    tag: "Motion",
    description: "A number that rolls, counts or types to its new value, text that reveals as it streams, a wait, and content swapped in place. Reduced motion respected; people and agents read the real value.",
  },
  lists: {
    headline: "Lists and trees people put in order",
    items: ["sortable-list", "sortable-tree"],
    tag: "Inputs",
    description: "Drag an item or pick it up with Space, move a selection together, and nest rows in a tree by moving them sideways. Every move is read out.",
  },
  chat: {
    headline: "A complete chat kit",
    items: ["chat", "chat-response", "chat-parts", "chat-message-parts", "chat-composer", "chat-sidebar"],
    tag: "AI",
    stage: "chat-stage",
    sections: { "agent-parts": "chat-message-parts" },
    description:
      "Streaming Markdown and code, reasoning, tool calls with approvals, subagent runs, checkpoints, sources and citations, plans, versions, message actions, a composer with attachments, commands, mentions, a model picker and a queue, a list of chats, and Vercel AI SDK messages as they are.",
  },
  "rich-text": {
    headline: "A rich text editor agents can write in too",
    items: ["rich-text"],
    tag: "Editing",
    description: 'Headings, lists, to-dos, quotes, code and links, with a toolbar, Markdown as you type, "/" for blocks and "@" for people. It saves Markdown or HTML.',
  },
  "data-grid": {
    headline: "A data grid that works like a spreadsheet",
    items: ["data-grid"],
    tag: "Data",
    description: "Ten thousand orders, rendered as you scroll. Sort, filter, group, pin, resize and reorder columns; select cells, copy and paste, edit in place, and export.",
  },
  charts: {
    headline: "Charts you can read with the keyboard",
    items: ["line-chart", "bar-chart", "scatter-chart", "heatmap", "segmented-bar"],
    tag: "Data",
    description: "Lines, bars, areas, scatter, heatmaps and part-to-whole bars. Arrow through the data, pin a point, switch to a table, isolate a series.",
  },
  board: { headline: "A kanban board you can drive from the keyboard", items: ["board"], tag: "Planning", description: "Columns with limits, cards that move by drag or by keys, lanes, search, a card dialog and confirmed deletes." },
  scheduler: { headline: "Calendars that people and agents can edit", items: ["scheduler"], tag: "Planning", description: "A week, a day, a month or a timeline of rooms. Draw, move and resize events with the pointer or the arrow keys." },
  canvas: { headline: "A node editor with wires", items: ["canvas"], tag: "Editing", description: "Pan and zoom, drag nodes, connect ports, lasso a group, a minimap, and undo." },
  ide: {
    headline: "The parts of a code editor",
    items: ["ide", "ide-app"],
    tag: "Editing",
    stage: "ide-stage",
    description: "A file tree with version control marks, tabs, a code editor, a command palette, problems, an outline and a status bar, in resizable panes.",
  },
  mobile: { headline: "Phone patterns, done properly", items: ["mobile"], tag: "Mobile", description: "Rows that swipe aside to actions, wheel pickers, bottom sheets and action sheets, pull to refresh, an app bar and a tab bar." },
  terminal: { headline: "A terminal for the browser", items: ["terminal"], tag: "Developer", description: "ANSI colors kept readable in every skin, links, streaming output with progress lines, Tab completion, history, Ctrl+C and Ctrl+L." },
  studio: {
    headline: "A synth rack, with sound",
    items: ["knob", "patch-bay", "fader", "level-meter", "step-sequencer"],
    tag: "Audio",
    stage: "studio-stage",
    description: "Knobs, a fader, a level meter, a step sequencer and a patch bay. It plays real sound, and an agent can play it.",
  },
  "agent-console": { headline: "Watch and steer agents at work", items: ["agent-console"], tag: "AI" },
}

const kits: Kit[] = docPages
  .filter((p) => p.section === "Kits")
  .map((p) => {
    const slug = p.path.split("/").at(-1)!
    const text = kitText[slug]!
    return { id: slug, title: p.title, description: text.description ?? p.description, href: p.path, items: text.items, tag: text.tag, headline: text.headline, stage: text.stage, sections: text.sections }
  })

const templateCards: Card[] = templates.map((t) => ({ id: t.id, title: t.name, description: t.what, href: `/templates/${t.id}`, items: [t.id], tag: "Page" }))

const skinPages: { skin: Skin; href: string }[] = [
  { skin: "base", href: "/docs/theming" },
  { skin: "blueprint", href: "/docs/skins/blueprint" },
  { skin: "studio", href: "/docs/skins/studio" },
  { skin: "phosphor", href: "/docs/skins/phosphor" },
  { skin: "ink", href: "/docs/skins/ink" },
]
const themeCards: (Card & { skin: Skin })[] = skinPages.map(({ skin, href }) => {
  const what: Record<Skin, string> = {
    base: "Your shadcn theme, one built from a key color, or black and white.",
    blueprint: "A technical drawing: cyanotype paper, linework and hatching.",
    studio: "A synth rack: gunmetal panels, rubber pads and amber lamps.",
    phosphor: "A green-screen terminal: intensity, inverse video, scan lines.",
    ink: "E-paper: ink on grey, dotted greys, a reading serif, no motion.",
  }
  return { id: skin, skin, title: skin.charAt(0).toUpperCase() + skin.slice(1), description: what[skin] ?? "", href, items: ["uiset"], tag: "Skin" }
})

const exampleBySlug = new Map(exampleMetas.map((m) => [m.slug, m]))

export { components, exampleBySlug, kits, templateCards, templates, themeCards }
export type { Card, Kit, TemplateId }
