import { describe, expect, test } from "vitest"
import { lint, type FileRule, type RepoContext, type RepoRule } from "../../scripts/lint/core.ts"
import { axeWaits, exampleFrames, hooksAtTopLevel, internalPrimitives, noDeferredFocus, noDialogInForm, seriesMixHue, skinScope, solidChildrenOnce, noHandRolledRoles, noImportant, noOnly, pinUiSdk, relativeImports, shellStyles, toastsVisible } from "../../scripts/lint/rules/code.ts"
import { rules } from "../../scripts/lint/rules/index.ts"
import { rulesOfHooks } from "../../scripts/lint/hooks.ts"
import { facts } from "../../src/site/facts.ts"
import pkg from "../../package.json"

const pinned = pkg.dependencies["@ui-sdk/react"]
import { currentUiSdk, installVersions, kitInstall, kitLive, skinSchemes, statedCounts, whatsNewCurrent } from "../../scripts/lint/rules/facts.ts"
import { landingRecorded, roadmapFresh, roadmapShape, singlePlan } from "../../scripts/lint/rules/plan.ts"
import { docsAheadOfNpm } from "../../scripts/lint/rules/release.ts"
import { solidParity } from "../../scripts/lint/rules/solid.ts"

// Each rule gets a sample it must catch and one it must let through, so no rule goes quiet.

const repo = (files: Record<string, string>, opts: { staged?: boolean; added?: Record<string, string[]> } = {}): RepoContext => ({
  paths: Object.keys(files),
  read: (path) => files[path],
  staged: Boolean(opts.staged),
  added: (path) => opts.added?.[path] ?? [],
})

const fileRule = (rule: FileRule, path: string, bad: string, good: string) =>
  test(`${rule.id} catches a slip and lets the fix through`, () => {
    expect(rule.appliesTo(path)).toBe(true)
    expect(rule.check(bad, path).length).toBeGreaterThan(0)
    expect(rule.check(good, path)).toEqual([])
  })

describe("code rules", () => {
  fileRule(
    noDeferredFocus,
    "registry/uiset/ui/board.tsx",
    `const undo = () => {\n  move(key)\n  requestAnimationFrame(() => requestAnimationFrame(() => board.focusCard(key)))\n}`,
    `const undo = () => {\n  move(key)\n  board.focusCard(key)\n  requestAnimationFrame(() => measure())\n}`,
  )
  test("focus/no-deferred-focus counts a double frame once, and reads past strings and comments", () => {
    const text = `requestAnimationFrame(() =>\n  requestAnimationFrame(() => {\n    // ")" in a comment\n    const s = ")"\n    el.focus()\n  }),\n)`
    expect(noDeferredFocus.check(text, "web/src/x.ts")).toEqual([expect.objectContaining({ line: 1 })])
    expect(noDeferredFocus.appliesTo("scripts/x.ts")).toBe(false)
  })
  fileRule(
    hooksAtTopLevel,
    "src/site/shell/code.tsx",
    `function useInstallText(items: string[]) {\n  const manager = managers.find((m) => m.id === useManager())!\n}`,
    `function useInstallText(items: string[]) {\n  const pm = useManager()\n  const manager = managers.find((m) => m.id === pm)!\n  return items.map((item) => <Row key={item} />)\n}\nfunction useMarkdown(load: () => string) {}`,
  )
  test("react/rules-of-hooks (oxlint's port of React's rule) catches a hook in a callback, a condition or a loop, and lets a top-level one through", () => {
    const files: Record<string, string> = {
      "src/site/shell/code.tsx": `function useInstallText(items: string[]) {\n  const manager = managers.find((m) => m.id === useManager())!\n  return <Row<string> key={manager} />\n}`,
      "registry/uiset/ui/card.tsx": `function Card({ open }: { open: boolean }) {\n  if (open) useEffect(() => {}, [])\n  for (const x of [1]) useMemo(() => x, [])\n  return null\n}`,
      "registry/uiset/ui/good.tsx": `function Good() {\n  const pm = useManager()\n  return [1].map((n) => <p key={n}>{pm}</p>)\n}`,
      "scripts/x.ts": `[1].map(() => useX())`,
    }
    const found = rulesOfHooks(Object.keys(files), (path) => files[path], process.cwd())
    expect(found.map((f) => `${f.path}:${f.line}`).sort()).toEqual(["registry/uiset/ui/card.tsx:2", "registry/uiset/ui/card.tsx:3", "src/site/shell/code.tsx:2"])
  })
  test("react/hooks-at-top-level catches a hook behind a condition, and reads past a call it can't close", () => {
    expect(hooksAtTopLevel.check(`const theme = open && useSiteTheme()`, "src/x.tsx")).toEqual([expect.objectContaining({ line: 1 })])
    expect(hooksAtTopLevel.check(`const x = a ? useA() : null`, "src/x.tsx")).toHaveLength(1)
    expect(hooksAtTopLevel.check(`items.map((i) => <p>Don't {i}</p>)\nfunction useX() {}`, "src/x.tsx")).toEqual([])
    expect(hooksAtTopLevel.appliesTo("scripts/x.ts")).toBe(false)
  })
  fileRule(noHandRolledRoles, "registry/uiset/ui/picker.tsx", `<div role="listbox" aria-label="Fruit">`, `<Listbox aria-label="Fruit">\nel.querySelector('[role="option"]')`)
  fileRule(relativeImports, "registry/uiset/ui/board.tsx", `import { Button } from "@/registry/uiset/ui/button"`, `import { Button } from "./button"`)
  fileRule(shellStyles, "registry/uiset/ui/rich-text.tsx", `import { Icon } from "./shell/icons"\nimport "./rich-text/rich-text.css"`, `import { Icon } from "./shell/icons"\nimport "./shell/shell.css"`)
  fileRule(shellStyles, "solid/src/rich-text.tsx", `<SelectLabel class="uiset-visually-hidden">Block type</SelectLabel>`, `import "../../registry/uiset/ui/shell/shell.css"\n<SelectLabel class="uiset-visually-hidden">Block type</SelectLabel>`)
  fileRule(
    seriesMixHue,
    "registry/uiset/ui/canvas/canvas.css",
    `.canvas-minimap-node {\n  fill: color-mix(in oklch, var(--series) 75%, var(--ui-foreground));\n}`,
    `.canvas-minimap-node {\n  fill: color-mix(in oklab, var(--series) 75%, var(--ui-foreground));\n}\n.event {\n  background: color-mix(in oklch, var(--series) 14%, transparent);\n}`,
  )
  fileRule(
    solidChildrenOnce,
    "solid/src/terminal.tsx",
    `return usePart(handle, "root", undefined, {\n  children: () => (\n    <>\n      <Show when={unseen()}>…</Show>\n    </>\n  ),\n})`,
    `return usePart(handle, "root", undefined, {\n  get children() {\n    return <Show when={unseen()}>…</Show>\n  },\n})\nusePart(handle, "root", undefined, { children: (state: { lanes: Lanes }) => <Lanes lanes={state.lanes} /> })`,
  )
  fileRule(
    noDialogInForm,
    "registry/uiset/ui/board.tsx",
    `<form onSubmit={save}>\n  <AlertDialog>\n    <AlertDialogTrigger>Delete card</AlertDialogTrigger>\n  </AlertDialog>\n</form>`,
    `<form onSubmit={save}>\n  <AlertDialog container={content}>\n    <AlertDialogTrigger>Delete card</AlertDialogTrigger>\n  </AlertDialog>\n</form>\n<Dialog open={open} onOpenChange={(next) => next && go()}>`,
  )
  fileRule(
    noImportant,
    "registry/uiset/ui/uiset/base.css",
    `.a { color: red !important; }`,
    `@media (prefers-reduced-motion: reduce) {\n  .a { animation: none !important; }\n}\n[data-uiset][data-motion="reduce"] * { animation-duration: 0s !important; }\n/* not !important here */\n.b { color: red; }`,
  )
  fileRule(
    skinScope,
    "registry/uiset/ui/uiset/skins/print.css",
    `@scope ([data-uiset][data-skin="print"]) to ([data-uiset]:not([data-skin="print"])) {\n  [data-uiset][data-skin="print"] {\n    --ui-background: white;\n  }\n}`,
    `@scope ([data-uiset][data-skin="print"]) to ([data-uiset]:not([data-skin="print"])) {\n  :where(:scope)[data-uiset][data-skin="print"] {\n    --ui-background: white;\n  }\n}`,
  )
  test("css/skin-scope wants the @scope wrapper", () => {
    expect(skinScope.check(`[data-uiset][data-skin="print"] {\n  --ui-background: white;\n}`, "registry/uiset/ui/uiset/skins/print.css")).toEqual([expect.objectContaining({ line: 1 })])
  })
  fileRule(
    internalPrimitives,
    "registry/uiset/ui/sortable-list/sortable-list.ts",
    `const sortableList = definePrimitive({\n  name: "sortable-list",\n})`,
    `/** @internal Left out of @uiset/web's declarations. */\nconst sortableList = definePrimitive({\n  name: "sortable-list",\n})`,
  )
  fileRule(
    exampleFrames,
    "src/site/site.css",
    `:is(.example, .lib-example) .stack {\n  display: grid;\n}`,
    `:is(.example, .lib-example, .item-frame) .stack {\n  display: grid;\n}\n.example-note { margin: 0; }`,
  )
  fileRule(
    pinUiSdk,
    "package.json",
    `{\n  "dependencies": {\n    "@ui-sdk/react": "^0.1.0-beta.9"\n  }\n}`,
    `{\n  "dependencies": {\n    "@ui-sdk/react": "0.1.0-beta.9",\n    "react": "^19.3.1"\n  }\n}`,
  )
  fileRule(axeWaits, "tests/e2e/board.spec.ts", `import AxeBuilder from "@axe-core/playwright"`, `import AxeBuilder from "./axe"`)
  // lint-ignore tests/no-only: the sample tests/no-only must catch
  fileRule(noOnly, "tests/e2e/board.spec.ts", `test.only("a card moves", async () => {})`, `test("a card moves", async () => {})`)
  // The samples follow the facts, so adding a part doesn't break this test (it did at 23).
  fileRule(
    statedCounts,
    "docs/introduction.md",
    `| Components | 55, plus ${facts.appParts - 1} app parts |`,
    `| Components | 55, plus ${facts.appParts} app parts | ${facts.skins} skins | 100 components on one page |`,
  )
  // The good sample follows package.json's pin, so moving the pin doesn't break this test (it did at beta.13).
  fileRule(
    installVersions,
    "docs/vue.md",
    "pnpm add @uiset/web @ui-sdk/web@0.1.0-beta.5 @ui-sdk/core@0.1.0-beta.5",
    `pnpm add @uiset/web @ui-sdk/web@${pinned} @ui-sdk/core@${pinned}\n\`@ui-sdk/vue\` 0.1.0-beta.5, on Node 24.21 (what was tested then)`,
  )
  test("content/current-ui-sdk catches a stale UI SDK version on the site and lets the pinned one through", () => {
    const pkg = `{ "dependencies": { "@ui-sdk/react": "0.1.0-beta.10" } }`
    const stale = repo({ "package.json": pkg, "src/site/pages/home.tsx": `title: "On UI SDK beta.9"` })
    expect(currentUiSdk.checkRepo(stale)).toEqual([expect.objectContaining({ path: "src/site/pages/home.tsx", line: 1 })])
    const fresh = repo({ "package.json": pkg, "src/site/pages/home.tsx": `title: "On UI SDK beta.10"`, "docs/installation.md": "@ui-sdk/web@0.1.0-beta.5" })
    expect(currentUiSdk.checkRepo(fresh)).toEqual([])
  })
  test("content/skin-schemes catches a blanket light-and-dark claim, a wrong Scheme cell and a theme doc that leaves a skin out", () => {
    const skins = {
      "registry/uiset/ui/uiset.tsx": `type Skin = "base" | "blueprint" | "ink" | (string & {})`,
      "registry/uiset/ui/uiset/skins/base.css": "[data-skin=base] { --x: 1; }",
      "registry/uiset/ui/uiset/skins/blueprint.css": "[data-skin=blueprint] { color-scheme: dark; }",
      "registry/uiset/ui/uiset/skins/ink.css": "[data-skin=ink] { color-scheme: light; }",
    }
    const bad = repo({
      ...skins,
      "src/site/pages/docs.tsx": "<li>Styles in five skins, each in light and dark, from CSS variables.</li>",
      "web/README.md": "them in five skins (base, blueprint and ink, light and dark), and adds",
      "docs/theming.md": "| `blueprint` | A technical drawing | both | Barlow |",
      "docs/vue.md": "| `theme` | `\"light\"` or `\"dark\"` |\n\nThe themed skins have one scheme each (Ink is light).",
      "skills/uiset/SKILL.md": "- `skin`: `blueprint` (dark only) or `ink` (light only).\n- `theme`: `light` or `dark`.",
    })
    expect(skinSchemes.checkRepo(bad).map((p) => p.path).sort()).toEqual(["docs/theming.md", "docs/vue.md", "skills/uiset/SKILL.md", "src/site/pages/docs.tsx", "web/README.md"])
    const good = repo({
      ...skins,
      "src/site/pages/docs.tsx": "<li>Styles in five skins, from CSS variables: Base in light and dark, the others in their one scheme.</li>",
      "web/README.md": "them in five skins (base has light and dark; blueprint is dark, and ink is light), and adds",
      "docs/theming.md": "| `base` | Yours | both | none |\n| `blueprint` | A technical drawing | dark | Barlow |",
      "docs/vue.md": "| `theme` | `\"light\"` or `\"dark\"` |\n\nWhatever `theme` says, Blueprint is dark, and Ink is light.",
      "skills/uiset/SKILL.md": "- `theme`: `light` or `dark`. Only Base follows it: Blueprint is dark, and Ink is light.",
      "docs/roadmap.md": "Light and dark in every skin, each in light and dark.",
    })
    expect(skinSchemes.checkRepo(good)).toEqual([])
  })
})

const roadmap = (body: string, updated = "2026-11-18") =>
  `# Roadmap\n\nUpdated ${updated}. What we're building.\n\n## Now\n\nNothing.\n\n## Next, in order\n\n1. **A.** One line.\n\n${body}## Later\n\nB.\n\n## Following UI SDK\n\nC.\n\n## Waiting on others\n\n- D.\n`

describe("plan rules", () => {
  test("plan/roadmap-shape holds the sections, their order, the date and short items", () => {
    expect(roadmapShape.check(roadmap(""), "docs/roadmap.md")).toEqual([])
    const long = roadmap("- **Long.** One\n  two\n  three\n  four\n\n")
    expect(roadmapShape.check(long, "docs/roadmap.md").map((p) => p.message)).toEqual([expect.stringContaining("4 lines")])
    expect(roadmapShape.check(roadmap("").replace("## Later\n\nB.\n\n", ""), "docs/roadmap.md")[0]!.message).toContain('"Later"')
    const swapped = roadmap("").replace("## Later\n\nB.\n\n## Following UI SDK\n\nC.", "## Following UI SDK\n\nC.\n\n## Later\n\nB.")
    expect(roadmapShape.check(swapped, "docs/roadmap.md")[0]!.message).toContain("out of order")
    expect(roadmapShape.check(roadmap("").replace("Updated 2026-11-18.", ""), "docs/roadmap.md")[0]!.message).toContain("Updated")
    expect(roadmapShape.check(roadmap("") + "x\n".repeat(120), "docs/roadmap.md")[0]!.message).toContain("under 120")
  })

  test("plan/single-plan catches a second plan file, not research or the roadmap", () => {
    const found = singlePlan.checkRepo(repo({ "PLAN.md": "", "docs/ideas.md": "", "docs/roadmap.md": "", "research/ideas.md": "", "docs/board.md": "" }))
    expect(found.map((p) => p.path).sort()).toEqual(["PLAN.md", "docs/ideas.md"])
  })

  test("plan/roadmap-fresh wants the roadmap dated on or after the newest decision", () => {
    const history = (date: string) => `# History\n\n## Decision log\n\n- 2026-11-17 — **Old.**\n- ${date} — **New.**\n`
    expect(roadmapFresh.checkRepo(repo({ "docs/roadmap.md": roadmap(""), "HISTORY.md": history("2026-11-18") }))).toEqual([])
    expect(roadmapFresh.checkRepo(repo({ "docs/roadmap.md": roadmap(""), "HISTORY.md": history("2026-11-19") }))[0]!.message).toContain("2026-11-19")
    // In a commit that touches neither, it says nothing.
    expect(roadmapFresh.checkRepo(repo({ "src/a.ts": "" }, { staged: true }))).toEqual([])
  })

  test("plan/landing-recorded wants a decision-log entry with a changelog entry", () => {
    const changelog = { "CHANGELOG.md": ["- **Sortable list.** Drag a row."] }
    expect(landingRecorded.checkRepo(repo({ "CHANGELOG.md": "" }, { staged: true, added: changelog }))).toHaveLength(1)
    expect(
      landingRecorded.checkRepo(repo({ "CHANGELOG.md": "", "HISTORY.md": "" }, { staged: true, added: { ...changelog, "HISTORY.md": ["- 2026-11-19 — **Sortable list.**"] } })),
    ).toEqual([])
    // Outside a commit, and for a changelog edit that isn't an entry, it says nothing.
    expect(landingRecorded.checkRepo(repo({ "CHANGELOG.md": "" }, { added: changelog }))).toEqual([])
    expect(landingRecorded.checkRepo(repo({ "CHANGELOG.md": "" }, { staged: true, added: { "CHANGELOG.md": ["  wrapped line"] } }))).toEqual([])
  })
})

describe("the runner", () => {
  const css = (line: string) => ({ "registry/uiset/ui/a.css": `.a {\n  ${line}\n}` })

  test("an ignore with a reason waives the line below it; without one, it's a problem itself", () => {
    expect(lint(repo(css("/* lint-ignore css/no-important: hidden must win */ color: red !important;")), rules).problems).toEqual([])
    const files = { "registry/uiset/ui/a.css": ".a {\n  /* lint-ignore css/no-important */\n  color: red !important;\n}" }
    expect(lint(repo(files), rules).problems.map((p) => p.rule).sort()).toEqual(["css/no-important", "lint/ignore"])
    expect(lint(repo({ "src/a.ts": "// lint-ignore made/up: why" }), rules).problems[0]!.message).toContain('No lint rule "made/up"')
  })

  test("agent/toasts-visible refuses data-agent-hidden on a toast region", () => {
    expect(toastsVisible.check('<ToastRegion toaster={toast} data-agent-hidden="" {...props}>', "registry/uiset/ui/toast.tsx")).toEqual([
      expect.objectContaining({ line: 1, message: expect.stringContaining("#978") }),
    ])
    expect(toastsVisible.check('<ui-toast-region aria-label="Notifications" data-agent-hidden>', "web/board.html")).toHaveLength(1)
    expect(toastsVisible.check('<ToastRegion toaster={toast} {...props}>\n<div data-agent-hidden="">', "registry/uiset/ui/toast.tsx")).toEqual([])
  })

  test("content/kit-live wants every kit item live on its page: in the demo or under a section", () => {
    const demos = 'const kitDemos = {\n  chat: from(() => import("./chat-demo"), (m) => m.ChatDemo),\n}\nconst templateDemos = {}'
    const library = (sections: string) =>
      `const kitText = {\n  chat: {\n    headline: "Chat",\n    items: ["chat", "chat-parts", "chat-message-parts"],${sections}\n  },\n}`
    const files = {
      "src/site/library-demos.tsx": demos,
      "src/site/chat-demo.tsx": 'import { Chat } from "@/registry/uiset/ui/chat"\nimport { Thread } from "./thread"',
      "src/site/thread.tsx": 'import { ChatTool } from "@/registry/uiset/ui/chat-parts"',
      "registry/uiset/ui/chat.tsx": "",
      "registry/uiset/ui/chat-parts.tsx": 'import { Chat } from "./chat"',
    }
    // chat-parts counts though the demo only reaches it through ./thread.
    expect(kitLive.checkRepo(repo({ ...files, "src/site/library.ts": library("") }))).toEqual([
      expect.objectContaining({ path: "src/site/library.ts", line: 2, rule: "content/kit-live", message: expect.stringContaining("chat-message-parts") }),
    ])
    expect(kitLive.checkRepo(repo({ ...files, "src/site/library.ts": library('\n    sections: { "agent-parts": "chat-message-parts" },') }))).toEqual([])
  })

  test("content/kit-install wants every kit item in its install command, or brought by one", () => {
    const kits = 'const KITS = [\n  { title: "Chat", names: ["chat", "chat-parts", "chat-message-parts"], doc: "chat.md" },\n]'
    const doc = (items: string) => `# Chat\n\n\`\`\`bash\nnpx shadcn@latest add ${items}\n\`\`\`\n`
    const built = { "registry/uiset/ui/chat-parts.tsx": 'import { ChatTasks } from "./chat"\nimport { icon } from "./chat/icons"' }
    expect(kitInstall.checkRepo(repo({ "scripts/docs.mjs": kits, "docs/chat.md": doc("@uiset/chat @uiset/chat-parts"), ...built }))).toEqual([
      expect.objectContaining({ path: "docs/chat.md", line: 4, rule: "content/kit-install", message: expect.stringContaining("@uiset/chat-message-parts") }),
    ])
    // `chat` comes with chat-parts, as each chart brings `chart`; a command may wrap lines.
    expect(kitInstall.checkRepo(repo({ "scripts/docs.mjs": kits, "docs/chat.md": doc("@uiset/chat-parts \\\n  @uiset/chat-message-parts"), ...built }))).toEqual([])
  })

  test("content/whats-new wants an entry for a release that adds something", () => {
    const changelog = "# Changelog\n\n## 0.7.0 (unreleased)\n\n### Added\n\n## 0.6.0 (2026-11-20)\n\n### Added\n\n- **Motion.**\n\n## 0.5.1 (2026-11-19)\n\n### Fixed\n"
    const home = (date: string) => `const whatsNew = [\n  { date: "2026-11-18", title: "A" },\n  { date: "${date}", title: "B" },\n]`
    expect(whatsNewCurrent.checkRepo(repo({ "CHANGELOG.md": changelog, "src/site/pages/home.tsx": home("2026-11-19") }))).toEqual([
      expect.objectContaining({ path: "src/site/pages/home.tsx", line: 1, rule: "content/whats-new" }),
    ])
    expect(whatsNewCurrent.checkRepo(repo({ "CHANGELOG.md": changelog, "src/site/pages/home.tsx": home("2026-11-20") }))).toEqual([])
    // A patch release that only fixes things doesn't need an entry.
    const patch = "## 0.6.1 (2026-11-22)\n\n### Fixed\n\n" + changelog
    expect(whatsNewCurrent.checkRepo(repo({ "CHANGELOG.md": patch, "src/site/pages/home.tsx": home("2026-11-20") }))).toEqual([])
  })

  test("the baseline lets known problems stay, fails new ones, and says when it can shrink", () => {
    const files = { "registry/uiset/ui/a.css": ".a { color: red !important; }\n.b { color: blue !important; }" }
    expect(lint(repo(files), rules, { "css/no-important": { "registry/uiset/ui/a.css": 2 } }).problems).toEqual([])
    expect(lint(repo(files), rules, { "css/no-important": { "registry/uiset/ui/a.css": 1 } }).problems).toHaveLength(2)
    expect(lint(repo(files), rules, { "css/no-important": { "registry/uiset/ui/a.css": 3 } }).shrinkable).toEqual(["registry/uiset/ui/a.css: css/no-important 3 → 2"])
  })

  test("generated and private folders are out of scope", () => {
    expect(lint(repo({ "public/r/a.css": ".a { color: red !important; }", "research/PLAN.md": "" }), rules).problems).toEqual([])
  })

  test("release/docs-ahead-of-npm stops a push whose docs pin a UI SDK npm's @uiset/web doesn't take", () => {
    const published = (peer: string) => ({ version: "0.6.1", peerDependencies: { shiki: "^4.6.0", "@ui-sdk/web": peer, "@ui-sdk/core": peer } })
    // 2026-11-24: docs on beta.16, npm's @uiset/web 0.6.1 on beta.14.
    expect(docsAheadOfNpm.check("0.1.0-beta.16", published("0.1.0-beta.14"))).toContain("npm's @uiset/web 0.6.1 takes @ui-sdk/web 0.1.0-beta.14 and @ui-sdk/core 0.1.0-beta.14")
    expect(docsAheadOfNpm.check("0.1.0-beta.16", published("0.1.0-beta.16"))).toBeNull()
    expect(docsAheadOfNpm.check("0.1.0-beta.16", { version: "0.7.0", peerDependencies: { "@ui-sdk/web": "0.1.0-beta.16" } })).toContain("@ui-sdk/core (none)")
    expect(docsAheadOfNpm.check("0.1.0-beta.16", { version: "0.7.0" })).toContain("Publish @uiset/web first, then push.")
    // Solid's package, once the docs name it: missing from npm, then on another UI SDK.
    expect(docsAheadOfNpm.check("0.1.0-beta.16", null, "@uiset/solid", ["@ui-sdk/solid", "@ui-sdk/core"])).toContain("npm has no @uiset/solid")
    const solid = { version: "0.7.0", peerDependencies: { "@ui-sdk/solid": "0.1.0-beta.16", "@ui-sdk/core": "0.1.0-beta.16" } }
    expect(docsAheadOfNpm.check("0.1.0-beta.16", solid, "@uiset/solid", ["@ui-sdk/solid", "@ui-sdk/core"])).toBeNull()
    expect(docsAheadOfNpm.check("0.1.0-beta.17", solid, "@uiset/solid", ["@ui-sdk/solid", "@ui-sdk/core"])).toContain("npm's @uiset/solid 0.7.0 takes @ui-sdk/solid 0.1.0-beta.16")
    expect(docsAheadOfNpm.why.length).toBeGreaterThan(20)
  })

  test("content/solid-parity: every React view has a Solid one or waits on the list, and a release that publishes it waits for none", () => {
    const views = { "registry/uiset/ui/uiset.tsx": "", "registry/uiset/ui/button.tsx": "", "registry/uiset/ui/templates/auth.tsx": "", "solid/src/uiset.tsx": "" }
    const list = (...items: string[]) => JSON.stringify({ items })
    const messages = (files: Record<string, string>) => solidParity.checkRepo(repo(files)).map((p) => p.message)
    expect(messages({ ...views, "solid/to-port.json": list("button", "templates/auth") })).toEqual([])
    // Left off the list with no Solid view.
    expect(messages({ ...views, "solid/to-port.json": list("button") })).toEqual(['No Solid view: write solid/src/templates/auth.tsx, or name "templates/auth" in solid/to-port.json for now.'])
    // Ported but still listed; listed with nothing to port.
    expect(messages({ ...views, "solid/button.tsx": "", "solid/src/button.tsx": "", "solid/to-port.json": list("button", "templates/auth", "chart") })).toEqual([
      '"button" is in Solid now (solid/src/button.tsx): take it off the list.',
      '"chart" has no React view (registry/uiset/ui/chart.tsx) to port.',
    ])
    // A dated release with anything waiting.
    const changelog = (head: string) => ({ "CHANGELOG.md": `# Changelog\n\n## ${head}\n` })
    expect(messages({ ...views, ...changelog("0.7.0 (unreleased)"), "solid/to-port.json": list("button", "templates/auth") })).toEqual([])
    // A dated release that doesn't publish @uiset/solid (a preview, 0.7.0) lets it wait.
    expect(messages({ ...views, ...changelog("0.7.0 (2026-11-30)"), "solid/to-port.json": list("button", "templates/auth") })).toEqual([])
    expect(messages({ ...views, ...changelog("0.8.0 (2026-12-30)"), "solid/package.json": "{}", "solid/to-port.json": list("button", "templates/auth") })).toEqual([
      "0.8.0 is dated, and 2 React views aren't in Solid yet (button, templates/auth). Solid ships complete: port them, or ask the owner.",
    ])
    // The list itself: missing once Solid has files, or not a list.
    expect(messages(views)).toEqual(["Missing: it names the React views not yet in Solid."])
    expect(messages({ ...views, "solid/to-port.json": "[]" })).toEqual(['Not JSON with an "items" list of names.'])
  })

  test("every rule says why it exists", () => {
    for (const rule of rules as (FileRule | RepoRule)[]) expect(rule.why.length, rule.id).toBeGreaterThan(20)
  })
})
