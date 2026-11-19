import { describe, expect, test } from "vitest"
import { lint, type FileRule, type RepoContext, type RepoRule } from "../../scripts/lint/core.ts"
import { exampleFrames, internalPrimitives, noDeferredFocus, noHandRolledRoles, noImportant, noOnly, pinUiSdk, relativeImports } from "../../scripts/lint/rules/code.ts"
import { rules } from "../../scripts/lint/rules/index.ts"
import { facts } from "../../src/site/facts.ts"
import pkg from "../../package.json"

const pinned = pkg.dependencies["@ui-sdk/react"]
import { currentUiSdk, installVersions, statedCounts } from "../../scripts/lint/rules/facts.ts"
import { landingRecorded, roadmapFresh, roadmapShape, singlePlan } from "../../scripts/lint/rules/plan.ts"

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
  fileRule(noHandRolledRoles, "registry/uiset/ui/picker.tsx", `<div role="listbox" aria-label="Fruit">`, `<Listbox aria-label="Fruit">\nel.querySelector('[role="option"]')`)
  fileRule(relativeImports, "registry/uiset/ui/board.tsx", `import { Button } from "@/registry/uiset/ui/button"`, `import { Button } from "./button"`)
  fileRule(
    noImportant,
    "registry/uiset/ui/uiset/base.css",
    `.a { color: red !important; }`,
    `@media (prefers-reduced-motion: reduce) {\n  .a { animation: none !important; }\n}\n/* not !important here */\n.b { color: red; }`,
  )
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

  test("the baseline lets known problems stay, fails new ones, and says when it can shrink", () => {
    const files = { "registry/uiset/ui/a.css": ".a { color: red !important; }\n.b { color: blue !important; }" }
    expect(lint(repo(files), rules, { "css/no-important": { "registry/uiset/ui/a.css": 2 } }).problems).toEqual([])
    expect(lint(repo(files), rules, { "css/no-important": { "registry/uiset/ui/a.css": 1 } }).problems).toHaveLength(2)
    expect(lint(repo(files), rules, { "css/no-important": { "registry/uiset/ui/a.css": 3 } }).shrinkable).toEqual(["registry/uiset/ui/a.css: css/no-important 3 → 2"])
  })

  test("generated and private folders are out of scope", () => {
    expect(lint(repo({ "public/r/a.css": ".a { color: red !important; }", "research/PLAN.md": "" }), rules).problems).toEqual([])
  })

  test("every rule says why it exists", () => {
    for (const rule of rules as (FileRule | RepoRule)[]) expect(rule.why.length, rule.id).toBeGreaterThan(20)
  })
})
