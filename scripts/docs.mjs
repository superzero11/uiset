// Docs that follow the registry, so they never drift from what installs: the docs index
// (docs/README.md), llms.txt and llms-full.txt for coding agents, the docs served by the
// site (public/docs/*.md), and the uiset agent skill's catalog.
// Run after scripts/registry.mjs (it reads registry.json): `pnpm docs:build`.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"

const config = JSON.parse(readFileSync("uiset.config.json", "utf8"))
const registry = JSON.parse(readFileSync("registry.json", "utf8"))
const site = config.homepage
const namespace = config.namespace
const add = (names) => `npx shadcn@latest add ${names.map((n) => `${namespace}/${n}`).join(" ")}`

// UI SDK's own components: UISet styles them and adds small defaults; their API and keys are UI SDK's.
const sdkComponents = new Set(readdirSync("node_modules/@ui-sdk/react/docs/components").map((f) => f.replace(/\.md$/, "")))

const groups = [
  { title: "Root", names: ["uiset"], doc: "theming.md" },
  {
    title: "App frame and data display",
    names: ["app-shell", "breadcrumbs", "page-header", "card", "badge", "stat", "empty-state", "skeleton", "description-list", "item-list", "alert", "kbd", "spinner", "stepper", "search-field", "copy-button", "table", "avatar-group", "code-block"],
    doc: "app-shell.md",
  },
  { title: "Forms", names: ["schema-form", "inline-edit", "tag-input", "phone-input", "input-mask", "upload"], doc: "forms.md" },
  { title: "Lists and trees", names: ["sortable-list", "sortable-tree"], doc: "lists.md" },
  { title: "Payments", names: ["payments"], doc: "payments.md" },
  { title: "Motion", names: ["number-ticker", "text-reveal", "thinking", "crossfade"], doc: "motion.md" },
  { title: "Rich text", names: ["rich-text"], doc: "rich-text.md" },
  { title: "Chat", names: ["chat", "chat-response", "chat-parts", "chat-message-parts", "chat-composer", "chat-sidebar"], doc: "chat.md" },
  { title: "Data grid", names: ["data-grid"], doc: "data-grid.md" },
  { title: "Charts", names: ["chart", "line-chart", "bar-chart", "scatter-chart", "heatmap", "segmented-bar", "sparkline"], doc: "charts.md" },
  { title: "Board", names: ["board"], doc: "board.md" },
  { title: "Scheduler", names: ["scheduler"], doc: "scheduler.md" },
  { title: "Canvas", names: ["canvas"], doc: "canvas.md" },
  { title: "IDE", names: ["ide"], doc: "ide.md" },
  { title: "Mobile", names: ["mobile"], doc: "mobile.md" },
  { title: "Terminal", names: ["terminal"], doc: "terminal.md" },
  { title: "Studio", names: ["knob", "patch-bay", "fader", "level-meter", "step-sequencer"], doc: "studio-kit.md" },
  { title: "Agent Console", names: ["agent-console"], doc: "agent-console.md" },
  { title: "Agent readiness", names: ["agent-check"], doc: "agent-check.md", tool: true },
]

const items = new Map(registry.items.map((item) => [item.name, item]))
const byName = (name) => items.get(name)
const placed = new Set(groups.flatMap((g) => g.names))
const base = registry.items.filter((item) => sdkComponents.has(item.name) && !placed.has(item.name))
const templates = registry.items.filter((item) => item.type === "registry:block")
const unplaced = registry.items.filter((item) => !placed.has(item.name) && !sdkComponents.has(item.name) && item.type !== "registry:block")
if (unplaced.length) throw new Error(`Items with no docs group: ${unplaced.map((i) => i.name).join(", ")}. Add them to scripts/docs.mjs.`)
for (const group of groups) {
  for (const name of group.names) if (!items.has(name)) throw new Error(`${name} is in a docs group but not in the registry.`)
  if (!existsSync(`docs/${group.doc}`)) throw new Error(`docs/${group.doc} is missing (for ${group.title}).`)
}

const extraDocs = [
  ["introduction.md", "Introduction", "What UISet is, how it relates to UI SDK and shadcn/ui, and what's in it"],
  ["installation.md", "Installation", "Add UISet with the shadcn CLI, load each skin's fonts, or use the Web Components build"],
  ["quick-start.md", "Quick start", "A working settings screen in a few minutes"],
  ["ai.md", "Building with AI agents", "The skills and llms.txt for coding agents, and UI SDK's agent bridge for agents that use your app"],
  ["looking-for.md", "Looking for a component?", "Where the components people ask for most are in UISet: calendar, time picker, multi-select, dropzone, table and more"],
  ["web-components.md", "Web Components", "Every kit and template as custom elements, for plain HTML, Vue, Svelte and Solid"],
  ["vue.md", "Vue", "UISet in a Vue 3 app, through the Web Components build"],
  ["svelte.md", "Svelte", "UISet in a Svelte 5 app, through the Web Components build"],
  ["templates.md", "Templates", "Whole pages built only from UISet items"],
  ["theming.md", "Theming", "Skins, the key color, dark mode, nesting, sound and haptics, and the theme builder"],
  ["migrate-from-shadcn.md", "Coming from shadcn/ui", "What maps to what, and how to move a shadcn/ui app over"],
  ["agent-migration.md", "Agent migration recipe", "Steps a coding agent follows to move a shadcn/ui app to UISet, with a check after each step"],
  ["roadmap.md", "Roadmap", "What's shipped, what's next, and how UISet follows UI SDK"],
  ["blueprint.md", "Blueprint skin", "The Blueprint skin's design and tokens"],
  ["studio.md", "Studio skin", "The Studio skin's design and tokens"],
  ["phosphor.md", "Phosphor skin", "The Phosphor skin's design and tokens"],
  ["ink.md", "Ink skin", "The Ink skin's design and tokens"],
]

const describe = (item) => (item.description ?? "").replace(/\s+/g, " ").trim()

/* -------------------------------------------------------------- docs/README.md */

const md = []
md.push("# UISet docs", "")
md.push("<!-- Generated by scripts/docs.mjs from the registry. Edit that script, not this file. -->", "")
md.push(`${config.name} is themes, components, kits and templates for Vercel's UI SDK. Every item installs with the shadcn CLI and is styled by the skin around it.`, "")
md.push("```bash", add(["uiset"]), "```", "")
md.push("## Guides", "")
for (const [file, title, what] of extraDocs) if (existsSync(`docs/${file}`)) md.push(`- [${title}](./${file}): ${what}.`)
md.push("")
md.push("## Kits and parts", "")
md.push("| Item | What it is | Docs |", "| --- | --- | --- |")
for (const group of groups) for (const name of group.names) md.push(`| \`${name}\` | ${describe(items.get(name))} | [${group.title}](./${group.doc}) |`)
md.push("")
md.push("## UI SDK components", "")
md.push(`Each of UI SDK's ${base.length} components as its own item, styled by the skin, with UISet's defaults. Their API, parts and keys are UI SDK's: the linked page applies as it is.`, "")
md.push("| Item | What UISet adds | API and keys |", "| --- | --- | --- |")
for (const item of base) md.push(`| \`${item.name}\` | ${describe(item)} | [UI SDK](https://ui-sdk.dev/docs/components/${item.name}) |`)
md.push("")
md.push("## Templates", "")
md.push("| Item | What it is |", "| --- | --- |")
for (const item of templates) md.push(`| \`${item.name}\` | ${describe(item)} |`)
md.push("", `See [Templates](./templates.md) for each one's props and sample data.`, "")
writeFileSync("docs/README.md", md.join("\n"))

/* -------------------------------------------------------------- llms.txt */

const docUrl = (file) => `${site}/docs/${file}`
const llms = []
llms.push(`# ${config.name}`, "")
llms.push("> Themes, components, kits and templates for Vercel's UI SDK, installed with the shadcn CLI. Behavior (keyboard, focus, ARIA, agent access) comes from UI SDK; UISet adds the skins, sound and haptics, and the kits apps are made of. React, and Web Components for every other framework.", "")
llms.push("Rules for agents building with UISet:", "")
llms.push("- Wrap the app (or a part of it) in `<UISet skin=\"base\">` from `@/components/ui/uiset`. Every UISet and UI SDK component inside takes the skin.")
llms.push("- Install items with `npx shadcn@latest add " + namespace + "/<item>`; they land in `components/ui/` and import each other relatively.")
llms.push("- Don't hand-write keyboard handling, focus traps or ARIA roles that a UI SDK component or behavior covers. Read the installed UI SDK docs at `node_modules/@ui-sdk/react/docs/llms.txt`.")
llms.push("- Give every control a name (a label, `aria-label`, or `label` prop): UI SDK's agent bridge finds components by it.")
llms.push("- Skins set CSS variables; style your own parts with `var(--ui-foreground)`, `var(--ui-muted-foreground)`, `var(--ui-border)`, `var(--ui-primary)` and friends, so they follow every skin.", "")
llms.push("## Docs", "")
llms.push(`- [Overview and every item](${docUrl("README.md")}): what each item is and where its docs are`)
for (const [file, title, what] of extraDocs) if (existsSync(`docs/${file}`)) llms.push(`- [${title}](${docUrl(file)}): ${what}`)
for (const group of groups) llms.push(`- [${group.title}](${docUrl(group.doc)}): ${group.names.map((n) => `\`${n}\``).join(", ")}`)
llms.push("")
llms.push("## UI SDK components", "")
llms.push(`- [Every UI SDK component's API and keys](https://ui-sdk.dev/docs): UISet installs each as its own item (${base.map((i) => `\`${i.name}\``).join(", ")})`)
llms.push("")
llms.push("## Optional", "")
llms.push(`- [Everything in one file](${site}/llms-full.txt): every docs page above, concatenated`)
llms.push(`- [Registry](${site}/r/registry.json): the shadcn registry index`)
llms.push("")
mkdirSync("public/docs", { recursive: true })
writeFileSync("public/llms.txt", llms.join("\n"))

/* -------------------------------------------------------------- served docs + llms-full.txt */

const pages = ["README.md", ...extraDocs.map(([f]) => f), ...new Set(groups.map((g) => g.doc))].filter((f, i, all) => existsSync(`docs/${f}`) && all.indexOf(f) === i)
for (const file of readdirSync("docs").filter((f) => f.endsWith(".md"))) copyFileSync(`docs/${file}`, `public/docs/${file}`)
const full = [`# ${config.name}: every docs page`, "", `Generated from ${config.repository} for coding agents.`, ""]
for (const file of pages) full.push(`\n<!-- docs/${file} -->\n`, readFileSync(`docs/${file}`, "utf8"))
writeFileSync("public/llms-full.txt", full.join("\n"))

/* -------------------------------------------------------------- the skill's catalog */

const cat = []
cat.push("# UISet catalog", "")
cat.push("<!-- Generated by scripts/docs.mjs from the registry. -->", "")
cat.push(`Install any item with \`npx shadcn@latest add ${namespace}/<item>\`. Docs: ${site}/docs/README.md (or \`docs/\` in the repo).`, "")
for (const group of groups) {
  cat.push(`## ${group.title} (docs/${group.doc})`, "")
  for (const name of group.names) cat.push(`- \`${name}\`: ${describe(items.get(name))}`)
  cat.push("")
}
cat.push("## UI SDK components (API and keys: UI SDK's docs)", "")
for (const item of base) cat.push(`- \`${item.name}\`: ${describe(item)}`)
cat.push("", "## Templates (docs/templates.md)", "")
for (const item of templates) cat.push(`- \`${item.name}\`: ${describe(item)}`)
cat.push("")
mkdirSync("skills/uiset/references", { recursive: true })
writeFileSync("skills/uiset/references/catalog.md", cat.join("\n"))

/* -------------------------------------------------------------- a skill per kit */

// Each kit gets its own skill, carrying its docs, so an agent loads only what a task needs.
// The core skill (skills/uiset) is written by hand; these are generated from the docs.
const kitSkills = groups.filter((g) => g.title !== "Root")
for (const group of kitSkills) {
  const slug = group.doc.replace(/\.md$/, "").replace(/-kit$/, "")
  const name = `uiset-${slug}`
  const items = group.names.map((n) => `\`${n}\``).join(", ")
  const what = describe(byName(group.names[0])) ?? ""
  // A tool (no components) gets its own words: there's nothing to wrap, style or tab through.
  const description = group.tool
    ? `UISet's ${group.title} for Vercel's UI SDK (item ${group.names.join(", ")}): installing it with the shadcn CLI, and using it in a test, in Playwright or from the command line. ${what} Use when a task asks whether agents can use a UI SDK app's pages, or to keep them agent-ready.`
    : `Builds with UISet's ${group.title} on Vercel's UI SDK (items ${group.names.join(", ")}): installing it with the shadcn CLI, its parts and props, keyboard behavior, and the actions agents get. ${what} Use when a task needs ${group.title.toLowerCase()} in a project that uses UISet or UI SDK.`
  const steps = group.tool
    ? [
        `Read \`references/${group.doc}\` before writing code: it has the checks, what each problem means and how to fix it, and the test, Playwright and command-line uses. Then:`,
        "",
        "- Use the bridge the app already creates (`createAgent`), one per test file, after the components render.",
        "- Fix a problem at its source, with the fix the report names: a label, a name with a word of its own, the UI SDK part for a plain control. Use `ignore` only for one you've decided to keep, and say why.",
        "- Run it on every page an agent should use, and keep the score at 100 in CI.",
      ]
    : [
        `Read \`references/${group.doc}\` before writing code: it has the parts, a full example, the props that matter, the keys and what agents can do. Then:`,
        "",
        "- Wrap the app in `<UISet>` from `@/components/ui/uiset` once (see the `uiset` skill for skins and theming).",
        "- Use the kit's parts and props as documented; don't add keyboard handling or ARIA they already provide.",
        "- Give it a specific `label` (or `aria-label`): it's the name people and agents use.",
        "- Style your own markup around it with the skin's CSS variables (`--ui-foreground`, `--ui-muted-foreground`, `--ui-border`, `--ui-primary`), not fixed colors.",
        "- Check your work: tab through it, run axe, and look at it in light and dark.",
      ]
  mkdirSync(`skills/${name}/references`, { recursive: true })
  copyFileSync(`docs/${group.doc}`, `skills/${name}/references/${group.doc}`)
  writeFileSync(
    `skills/${name}/SKILL.md`,
    [
      "---",
      `name: ${name}`,
      `description: ${JSON.stringify(description.replace(/\s+/g, " "))}`,
      "---",
      "",
      `# UISet ${group.title}`,
      "",
      "<!-- Generated by scripts/docs.mjs from the docs. Edit the docs page, not this file. -->",
      "",
      `Items: ${items}. Install with \`npx shadcn@latest add ${namespace}/<item>\`; they land in \`components/ui/\`.`,
      "",
      ...steps,
      "",
    ].join("\n"),
  )
}

/* -------------------------------------------------------------- the site's list of UI SDK components */

mkdirSync("src/site/docs", { recursive: true })
writeFileSync("src/site/docs/sdk-components.json", `${JSON.stringify(base.map((i) => i.name), null, 2)}\n`)

/* -------------------------------------------------- each component's API and accessibility, from UI SDK */

// A UISet component is UI SDK's, so its props, parts, keyboard and tested behavior are UI SDK's.
// Its docs page shows them from UI SDK's own docs (Apache-2.0, shipped in @ui-sdk/react), with
// links rewritten: to our page for a component we document, otherwise to ui-sdk.dev.
const sdkVersion = JSON.parse(readFileSync("node_modules/@ui-sdk/react/package.json", "utf8")).version
const SDK_DOCS = "https://ui-sdk.dev/docs/react"
const documented = new Set(base.map((i) => i.name))
const sdkLink = (target) => {
  const [path, hash = ""] = target.split("#")
  const anchor = hash ? `#${hash}` : ""
  const component = /^\.\/([\w-]+)\.md$/.exec(path)?.[1]
  if (component) return documented.has(component) ? `/docs/components/${component}${anchor}` : `${SDK_DOCS}/components/${component}${anchor}`
  const guide = /^\.\.\/([\w/-]+)\.md$/.exec(path)?.[1]
  if (guide) return `${SDK_DOCS}/${guide}${anchor}`
  if (!path) return `${anchor}`
  return target
}
rmSync("src/site/docs/sdk", { recursive: true, force: true })
mkdirSync("src/site/docs/sdk", { recursive: true })
for (const item of base) {
  const text = readFileSync(`node_modules/@ui-sdk/react/docs/components/${item.name}.md`, "utf8")
  const start = text.indexOf("\n## API Reference")
  if (start < 0) continue
  const body = text
    .slice(start + 1)
    .replace(/\]\(([^)\s]+)\)/g, (_, target) => `](${sdkLink(target)})`)
    .replace(/^<[A-Z][^>]*\/>\s*$/gm, "")
  writeFileSync(
    `src/site/docs/sdk/${item.name}.md`,
    `<!-- From UI SDK's docs (@ui-sdk/react ${sdkVersion}, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->\n\n${body.trim()}\n`,
  )
}

console.log(`docs: ${registry.items.length} items; docs/README.md, public/llms.txt, public/llms-full.txt, ${pages.length} pages served, skill catalog`)
