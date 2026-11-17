import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

// The built files, loaded as another site would load them (`pnpm check` builds first).
test("the built module and stylesheet register UISet's elements and skin UI SDK's", async ({ page }) => {
  await page.goto("/built.html")
  const root = page.locator("uiset-root")
  await expect(root).toHaveAttribute("data-skin", "studio")
  const knob = page.getByRole("slider", { name: "Cutoff" })
  await expect(knob).toHaveAttribute("aria-valuenow", "25")
  await expect(page.locator("uiset-knob-value")).toHaveText("25")
  // Studio's caps on buttons come from the built stylesheet.
  await expect(page.getByRole("button", { name: "Save" })).toHaveCSS("text-transform", "uppercase")
})

// The rest read the built files themselves, from Node, as a server or a type checker would.
const dist = new URL("../../../web/dist/", import.meta.url)
const read = (file: string) => readFileSync(new URL(file, dist), "utf8")

test("the stylesheet carries only what the elements need, not the demo pages' rules", () => {
  const css = read("uiset.css")
  expect(css.length).toBeGreaterThan(100_000)
  // The demo pages' layout classes, their body rule, their full-height root and their font.
  expect([...new Set(css.match(/\.web-[a-z-]+/g) ?? [])]).toEqual([])
  expect(/(^|[}\s,])body\s*[{,]/.test(css)).toBe(false)
  expect(/uiset-root\s*\{[^}]*100dvh/.test(css)).toBe(false)
  expect(css).not.toContain("Instrument Sans")
  // And it still has the elements' own rules.
  expect(css).toMatch(/uiset-data-grid\s*\{[^}]*display:\s*block/)
  expect(css).toContain(".data-grid-editor")
})

test("the module can be imported where there is no browser, and defines nothing there", async () => {
  expect(typeof (globalThis as { HTMLElement?: unknown }).HTMLElement).toBe("undefined")
  const module = (await import(new URL("uiset.js", dist).href)) as { skins: readonly string[]; iconPaths: Record<string, string> }
  expect(module.skins).toEqual(["base", "blueprint", "studio", "phosphor", "ink"])
  expect(module.iconPaths.check).toBeTruthy()
})

test("the package ships type declarations that name every element", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../../web/package.json", import.meta.url), "utf8")) as { types: string; exports: Record<string, { types?: string } | string> }
  expect(manifest.types).toBe("./dist/types/web/src/uiset.d.ts")
  expect((manifest.exports["."] as { types: string }).types).toBe(manifest.types)
  const entry = read("types/web/src/uiset.d.ts")
  for (const tag of ["uiset-root", "uiset-data-grid", "uiset-chat", "uiset-rich-text", "uiset-search-field", "uiset-stepper", "uiset-sparkline", "uiset-app-shell"])
    expect(entry, tag).toContain(`"${tag}":`)
  // The kits made from UI SDK primitives and the charts, by what a page sets and calls on them.
  for (const tag of ["uiset-board", "uiset-schedule", "uiset-canvas", "uiset-terminal", "uiset-swipe-list", "uiset-patch-bay", "uiset-knob", "uiset-line-chart", "uiset-heatmap"])
    expect(entry, tag).toContain(`"${tag}":`)
  expect(read("types/web/src/board.d.ts")).toMatch(/openCard\(card: string\): boolean/)
  expect(read("types/web/src/schedule.d.ts")).toMatch(/addEvent\(track: string, start: string, end: string, title: string\): string/)
  // No declaration imports a primitive: those are left out of the package.
  for (const file of ["board", "schedule", "canvas", "terminal", "mobile", "studio", "chart"])
    expect(read(`types/web/src/${file}.d.ts`), file).not.toMatch(/import \{[^}]*\b(boardPrimitive|schedulePrimitive|canvasPrimitive|terminalPrimitive|swipeList|patchBay|knob|chartPoints)\b/)
  expect(entry).toContain("export { iconElement, iconPaths }")
  // Nothing in them points back into this repo.
  const grid = read("types/web/src/data-grid.d.ts")
  expect(grid).not.toContain('"@/')
  expect(grid).toMatch(/set label\(value: string \| null\)/)
  expect(grid).toMatch(/set editable\(value: boolean\)/)
  // Each element's events are typed, and their maps are exported for templates' listeners.
  expect(grid).toMatch(/addEventListener<K extends keyof UISetDataGridEvents<Datum>>/)
  expect(read("types/web/src/studio.d.ts")).toMatch(/type KnobElement = UiElement<UISetKnobEvents>/)
  for (const map of ["UISetDataGridEvents", "UISetKnobEvents", "UISetBoardEvents", "UISetChatEvents", "UISetFileTreeEvents", "UISetSearchFieldEvents"])
    expect(entry, map).toContain(map)
})
