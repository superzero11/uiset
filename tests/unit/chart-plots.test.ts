// The shared chart geometry, without a frame: a pinned or active key the data no longer
// has draws nothing (no crosshair off the edge, no chart dimmed around nothing).
import { expect, test } from "vitest"
import { LABEL_CHAR_WIDTH, focusKey, type ChartPlotContext } from "@/registry/uiset/ui/chart/plot"
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

test("a narrow horizontal bar chart shows only the value labels that fit side by side", () => {
  const regions = [
    { r: "North America", v: 412000 },
    { r: "Europe", v: 318000 },
    { r: "Middle East and Africa", v: 64000 },
  ]
  const valueLabels = (width: number) => {
    const svg = barPlot(
      { data: regions, x: (d) => d.r, series: [{ key: "v", label: "Revenue", value: (d) => d.v }], orientation: "horizontal" },
      { width, height: 200, shown: () => true, active: null, selected: null },
    ).svg
    const axis = nodes(svg).find((n) => n.attrs["data-axis"] === "value")!
    return nodes(axis.children).map((n) => ({ x: Number(n.attrs.x), text: String(n.children?.[0] ?? "") }))
  }
  for (const width of [330, 520, 900]) {
    const labels = valueLabels(width)
    expect(labels.length).toBeGreaterThanOrEqual(2)
    // Each label's centre is at least its own width plus a gap from the next.
    for (let i = 1; i < labels.length; i++) {
      const room = Math.max(labels[i]!.text.length, labels[i - 1]!.text.length) * LABEL_CHAR_WIDTH + 8
      expect(labels[i]!.x - labels[i - 1]!.x).toBeGreaterThanOrEqual(room)
    }
  }
  expect(valueLabels(900).length).toBeGreaterThan(valueLabels(330).length)
})

test("a horizontal bar chart leaves room for its longest category in the widest skin's font", () => {
  const svg = barPlot(
    {
      data: [{ r: "Middle East and Africa", v: 64000 }],
      x: (d) => d.r,
      series: [{ key: "v", label: "Revenue", value: (d) => d.v }],
      orientation: "horizontal",
    },
    { width: 330, height: 120, shown: () => true, active: null, selected: null },
  ).svg
  const axis = nodes(svg).find((n) => n.attrs["data-axis"] === "category")!
  const label = nodes(axis.children).find((n) => n.tag === "text")!
  // Phosphor's monospace measures 6.9px a character at the axis size; the label ends at x.
  expect(Number(label.attrs.x)).toBeGreaterThanOrEqual("Middle East and Africa".length * 6.9)
})
