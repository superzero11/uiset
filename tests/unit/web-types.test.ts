// @uiset/web's types. Two things keep them honest:
// 1. Every element the build defines is in the tag map TypeScript reads, or is listed here as
//    a part that only holds markup. A new element can't ship untyped by accident. Every event
//    an element fires is named in its event map, so a listener's `detail` is typed.
// 2. The script APIs written out for the kits made from UI SDK primitives match the
//    primitives. That check is in the types below, so `pnpm typecheck` is what runs it.
import { readdirSync, readFileSync } from "node:fs"
import type { TypesOf } from "@ui-sdk/core"
import { expect, test } from "vitest"
import type { boardPrimitive } from "@/registry/uiset/ui/board/board"
import type { canvasPrimitive } from "@/registry/uiset/ui/canvas/canvas"
import type { swipeList } from "@/registry/uiset/ui/mobile/swipe-list"
import type { schedulePrimitive } from "@/registry/uiset/ui/scheduler/schedule"
import type { patchBay } from "@/registry/uiset/ui/studio/patch-bay"
import type { terminalPrimitive } from "@/registry/uiset/ui/terminal/session"
import type { schemaForm } from "@/registry/uiset/ui/schema-form/form"
import type { UISetSchemaForm } from "@/web/src/uiset"
import type { UISetBoard, UISetCanvas, UISetDataGrid, UISetDataGridColumn, UISetKnob, UISetKnobEvents, UISetLineChart, UISetPatchBay, UISetScatterChart, UISetSchedule, UISetSearchField, UISetSwipeList, UISetTerminal } from "@/web/src/uiset"

// What a primitive's API must be assignable to: the type a page sees on the element.
type Shown<Element extends { api?: unknown }> = NonNullable<Element["api"]>
const unchecked = null as unknown
// Each line fails to compile when a written-out API names a method the primitive doesn't
// have, or gets its arguments or result wrong.
export const board: Shown<UISetBoard> = unchecked as TypesOf<typeof boardPrimitive>["api"]
export const schedule: Shown<UISetSchedule> = unchecked as TypesOf<typeof schedulePrimitive>["api"]
export const canvas: Shown<UISetCanvas> = unchecked as TypesOf<typeof canvasPrimitive>["api"]
export const swipes: Shown<UISetSwipeList> = unchecked as TypesOf<typeof swipeList>["api"]
export const bay: Shown<UISetPatchBay> = unchecked as TypesOf<typeof patchBay>["api"]
export const terminal: Shown<UISetTerminal> = unchecked as TypesOf<typeof terminalPrimitive>["api"]
export const form: Shown<UISetSchemaForm> = unchecked as TypesOf<typeof schemaForm>["api"]

// A chart's accessors are checked against the datum a page names.
type Month = { month: string; revenue: number }
export const line = (chart: UISetLineChart<Month>) => {
  chart.x = (d) => d.month
  chart.series = [{ key: "revenue", label: "Revenue", value: (d) => d.revenue }]
  // @ts-expect-error A month has no `costs`.
  chart.x = (d) => d.costs
  chart.label = "Revenue"
}
export const scatter = (chart: UISetScatterChart<Month>) => {
  chart.pointLabel = (d) => d.month
  // `label` is the title on every chart, never the accessor.
  chart.label = "Months"
  // @ts-expect-error The title is text.
  chart.label = (d: Month) => d.month
}

// The grid takes a row type the same way; without one, any row's accessors are accepted.
type Order = { id: string; total: number }
export const typedGrid = (grid: UISetDataGrid<Order>) => {
  const total: UISetDataGridColumn<Order> = { id: "total", header: "Total", type: "number", value: (order) => order.total }
  grid.columns = [total, { id: "id", header: "Order", value: (order) => order.id, render: (order) => order.id.toUpperCase() }]
  grid.getRowId = (order) => order.id
  grid.rows = [{ id: "a", total: 1 }]
  // @ts-expect-error An order has no `name`.
  grid.getRowId = (order) => order.name
}
export const looseGrid = (grid: HTMLElementTagNameMap["uiset-data-grid"]) => {
  grid.getRowId = (order: Order) => order.id
  grid.columns = [{ id: "total", header: "Total", value: (order: Order) => order.total }]
  grid.rows = [{ id: "a", total: 1 }]
}

// Listeners know each element's own events, and the DOM's keep their types.
export const listeners = (grid: UISetDataGrid<Order>, knob: UISetKnob, board: UISetBoard, field: UISetSearchField, chart: UISetLineChart<Month>) => {
  grid.addEventListener("celledit", (event) => {
    const total: number = event.detail.row.total
    if (total < 0) event.preventDefault()
  })
  // @ts-expect-error An order has no `name`.
  grid.addEventListener("rowaction", (event) => event.detail.row.name)
  knob.addEventListener("valuechange", (event) => {
    const value: number = event.detail.value
    return [value, event.detail.source, event.detail.reason]
  })
  board.addEventListener("laneschange", (event) => [event.detail.from, event.detail.to, event.detail.value])
  field.addEventListener("valuechange", (event) => event.detail.value.trim())
  chart.addEventListener("select", (event) => event.detail.value ?? event.detail.reason)
  field.addEventListener("click", (event) => event.clientX)
  document.querySelector("uiset-file-tree")?.addEventListener("rename", (event) => event.detail.refuse("Not here"))
  document.querySelector("uiset-schedule")?.addEventListener("eventschange", (event) => event.detail.action)
  // @ts-expect-error A search field's value is text.
  field.addEventListener("valuechange", (event) => event.detail.value.toFixed())
  // A framework template's listener names its event by the map.
  const turned: (event: UISetKnobEvents["valuechange"]) => number = (event) => event.detail.value
  return turned
}

// Parts that hold markup or belong to an element's inside: plain elements to TypeScript.
const parts = new Set([
  "uiset-board-card",
  "uiset-board-column",
  "uiset-canvas-grid",
  "uiset-canvas-lasso",
  "uiset-canvas-node",
  "uiset-canvas-nodes",
  "uiset-canvas-port",
  "uiset-canvas-world",
  "uiset-canvas-zoom",
  "uiset-chart-point",
  "uiset-chart-points",
  "uiset-data-grid-cell",
  "uiset-data-grid-editor",
  "uiset-data-grid-table",
  "uiset-inline-edit-cancel",
  "uiset-inline-edit-error",
  "uiset-inline-edit-input",
  "uiset-inline-edit-preview",
  "uiset-inline-edit-save",
  "uiset-knob-indicator",
  "uiset-knob-value",
  "uiset-patch-bay-jack",
  "uiset-rich-text-area",
  "uiset-schedule-event",
  "uiset-schedule-track",
  "uiset-sortable-list-item",
  "uiset-sortable-tree-row",
  "uiset-swipe-actions",
  "uiset-swipe-content",
  "uiset-swipe-row",
])

const sources = readdirSync("web/src")
  .filter((file) => file.endsWith(".ts") && !file.includes("demo"))
  .map((file) => readFileSync(`web/src/${file}`, "utf8"))

function definedTags() {
  const tags = new Set<string>()
  for (const source of sources) {
    for (const match of source.matchAll(/(?:customElements\.define|defineElement|defineChart)\("(uiset-[a-z-]+)"/g)) tags.add(match[1]!)
    // createParts: `root: "uiset-knob"` and `root: { tag: "uiset-board", … }`.
    for (const call of source.matchAll(/createParts\(\w+, \{[\s\S]*?\n {2}\}\)/g)) {
      for (const match of call[0].matchAll(/\b(?:tag|[a-zA-Z]+): "(uiset-[a-z-]+)"/g)) tags.add(match[1]!)
    }
  }
  return tags
}

function mappedTags() {
  const entry = readFileSync("web/src/uiset.ts", "utf8")
  const map = /interface HTMLElementTagNameMap \{([\s\S]*?)\n {2}\}/.exec(entry)?.[1] ?? ""
  return new Set([...map.matchAll(/"(uiset-[a-z-]+)":/g)].map((match) => match[1]!))
}

test("every element the build defines is typed, or listed as a plain part", () => {
  const defined = definedTags()
  const mapped = mappedTags()
  expect(defined.size).toBeGreaterThan(50)
  expect([...defined].filter((tag) => !mapped.has(tag) && !parts.has(tag))).toEqual([])
})

test("the tag map names no element the build doesn't define", () => {
  const defined = definedTags()
  expect([...mappedTags()].filter((tag) => !defined.has(tag))).toEqual([])
  expect([...parts].filter((tag) => !defined.has(tag))).toEqual([])
})

// What each element dispatches, by name, from its module.
function dispatched(source: string) {
  const names = new Set<string>()
  for (const match of source.matchAll(/new CustomEvent\(\s*"([a-z]+)"|this\.emit\("([a-z]+)"/g)) names.add((match[1] ?? match[2])!)
  // The grid names its state events from its state: `selected` fires `selectedchange`.
  const state = /const stateNames = \[([^\]]*)\]/.exec(source)
  if (state) for (const name of state[1]!.matchAll(/"(\w+)"/g)) names.add(`${name[1]!.toLowerCase()}change`)
  return names
}

function declared(source: string) {
  const names = new Set<string>()
  for (const map of source.matchAll(/\ntype UISet\w+Events(?:<[^>]*>)? = \{([\s\S]*?)\n?\}\n/g)) {
    for (const key of map[1]!.matchAll(/(?:^|[\n{;]) *([a-z]+): /g)) names.add(key[1]!)
  }
  return names
}

test("every event an element fires is in its event map", () => {
  const missing: string[] = []
  for (const file of readdirSync("web/src").filter((f) => f.endsWith(".ts") && !f.includes("demo"))) {
    const source = readFileSync(`web/src/${file}`, "utf8")
    const known = declared(source)
    for (const name of dispatched(source)) if (!known.has(name)) missing.push(`${file}: ${name}`)
  }
  expect(missing).toEqual([])
})
