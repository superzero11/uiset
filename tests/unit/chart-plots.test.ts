// The shared chart geometry, without a frame: a pinned or active key the data no longer
// has draws nothing (no crosshair off the edge, no chart dimmed around nothing).
import { expect, test } from "vitest"
import { focusKey, type ChartPlotContext } from "@/registry/uiset/ui/chart/plot"
import { barPlot } from "@/registry/uiset/ui/chart/plots/bar"
import { heatmapPlot } from "@/registry/uiset/ui/chart/plots/heatmap"
import { linePlot } from "@/registry/uiset/ui/chart/plots/line"
import { scatterPlot } from "@/registry/uiset/ui/chart/plots/scatter"
import { segmentedBarPlot } from "@/registry/uiset/ui/chart/plots/segmented-bar"
import type { VChild } from "@/registry/uiset/ui/chart/vnode"

type Node = { tag: string; attrs: Record<string, unknown>; children?: VChild[] }
function nodes(children: readonly VChild[] | undefined): Node[] {
  const out: Node[] = []
  for (const child of children ?? []) {
    if (!child || typeof child !== "object") continue
    const node = child as unknown as Node
    out.push(node, ...nodes(node.children))
  }
  return out
}
const has = (children: readonly VChild[], attr: string, value?: unknown) =>
  nodes(children).some((n) => (value === undefined ? n.attrs[attr] !== undefined && n.attrs[attr] !== null : n.attrs[attr] === value))
const context = (selected: string | null, active: string | null = null): ChartPlotContext => ({ width: 400, height: 200, shown: () => true, active, selected })

const months = [
  { m: "Jan", v: 1 },
  { m: "Feb", v: 2 },
  { m: "Mar", v: 3 },
]
const series = [{ key: "v", label: "V", value: (d: (typeof months)[number]) => d.v }]

test("focusKey prefers the active key, then the pinned one, and never a key that's gone", () => {
  const known = (key: string) => ["a", "b"].includes(key)
  expect(focusKey("a", "b", known)).toBe("a")
  expect(focusKey("gone", "b", known)).toBe("b")
  expect(focusKey("gone", "also gone", known)).toBe(null)
  expect(focusKey(null, null, known)).toBe(null)
})

test("a line chart pinned past its data draws no crosshair", () => {
  const svg = linePlot({ data: months, x: (d) => d.m, series }, context("9")).svg
  expect(nodes(svg).some((n) => String(n.attrs.className ?? "").includes("chart-crosshair"))).toBe(false)
  const pinned = linePlot({ data: months, x: (d) => d.m, series }, context("2")).svg
  expect(nodes(pinned).some((n) => String(n.attrs.className ?? "").includes("chart-crosshair"))).toBe(true)
})

test("bars, points, cells and parts aren't dimmed around a key that's gone", () => {
  expect(has(barPlot({ data: months, x: (d) => d.m, series }, context("9")).svg, "data-dim", "")).toBe(false)
  expect(has(barPlot({ data: months, x: (d) => d.m, series }, context("1")).svg, "data-dim", "")).toBe(true)
  const scatter = { data: months, label: (d: (typeof months)[number]) => d.m, x: (d: (typeof months)[number]) => d.v, y: (d: (typeof months)[number]) => d.v, xLabel: "X", yLabel: "Y" }
  expect(has(scatterPlot(scatter, context("9")).svg, "data-dim", "")).toBe(false)
  expect(has(scatterPlot(scatter, context("1")).svg, "data-dim", "")).toBe(true)
  const heat = { data: months, rows: ["r"], columns: ["Jan", "Feb", "Mar"], row: () => "r", column: (d: (typeof months)[number]) => d.m, value: (d: (typeof months)[number]) => d.v, measure: "V" }
  expect(has(heatmapPlot(heat, context("4:4")).svg, "data-active", "")).toBe(false)
  expect(has(heatmapPlot(heat, context("0:1")).svg, "data-active", "")).toBe(true)
  const parts = { parts: [{ key: "a", label: "A", value: 1 }, { key: "b", label: "B", value: 2 }] }
  expect(has(segmentedBarPlot(parts, context("gone")).svg, "data-dim", "")).toBe(false)
  expect(has(segmentedBarPlot(parts, context("a")).svg, "data-dim", "")).toBe(true)
})
