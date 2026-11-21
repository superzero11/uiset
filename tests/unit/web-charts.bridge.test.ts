import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Charts page as web elements (web/charts.html), driven through the web agent bridge.
// Moved from tests/e2e/web/charts.spec.ts. The legend and the Chart/Table switch are hidden from
// agents while the chart shows, so a person's press on them is a click here.

type ChartEl = HTMLElement & Record<string, unknown>
const chartOf = (id: string) => document.getElementById(id) as ChartEl
const listbox = (name: string) => screen.getByRole("listbox", { name })
const options = (name: string) => within(listbox(name)).getAllByRole("option")
const shown = (el: Element | null) => !!el && !(el as HTMLElement).closest("[hidden]") && (el as HTMLElement).style.display !== "none"
const legendButton = (id: string, name: string) => within(chartOf(id).querySelector(".chart-legend") as HTMLElement).getByRole("button", { name })

// The elements' modules load once per file, and the first load can take a while.
beforeAll(() => import("../../web/src/uiset"), 60_000)

afterEach(() => {
  document.body.innerHTML = ""
})

test("the legend isolates a series; single-series charts have no legend", async () => {
  await openWebPage("charts.html", "charts-demo.ts")
  const chart = chartOf("revenue")
  expect(chart.querySelectorAll(".chart-line")).toHaveLength(2)
  legendButton("revenue", "Costs").click()
  await settle()
  expect(legendButton("revenue", "Costs").getAttribute("aria-pressed")).toBe("true")
  expect(chart.querySelectorAll(".chart-line")).toHaveLength(1)
  expect(options("Revenue")[0]).toBe(within(listbox("Revenue")).getByRole("option", { name: "Jan: Costs $9.1k" }))
  legendButton("revenue", "Costs").click()
  await settle()
  expect(chart.querySelectorAll(".chart-line")).toHaveLength(2)
  expect(shown(document.querySelector("uiset-bar-chart .chart-legend"))).toBe(false)
  expect(shown(document.querySelector("uiset-line-chart .chart-tooltip"))).toBe(false)
})

test("Chart and Table switch to the table twin and back", async () => {
  await openWebPage("charts.html", "charts-demo.ts")
  const chart = chartOf("regions")
  within(chart).getByRole("radio", { name: "Table" }).click()
  await settle()
  const table = within(chart).getByRole("group", { name: "Data table" })
  within(table).getByRole("row", { name: "North America 4,210" })
  expect(shown(table)).toBe(true)
  expect(shown(chart.querySelector(".chart-plot"))).toBe(false)
  within(chart).getByRole("radio", { name: "Chart" }).click()
  await settle()
  expect(shown(chart.querySelector(".chart-plot"))).toBe(true)
  expect(shown(table)).toBe(false)
})

test("new data from script redraws the chart", async () => {
  await openWebPage("charts.html", "charts-demo.ts")
  const chart = chartOf("revenue") as ChartEl & { data: { month: string; revenue: number; costs: number }[] }
  chart.data = [...chart.data, { month: "Jul", revenue: 21000, costs: 12100 }]
  await waitFor(() => expect(options("Revenue")).toHaveLength(7))
  expect(options("Revenue").at(-1)).toBe(within(listbox("Revenue")).getByRole("option", { name: "Jul: Revenue $21k, Costs $12.1k" }))
})

test("agents select by reading, isolate a series, show the table, and read the data", async () => {
  const bridge = await openWebPage("charts.html", "charts-demo.ts")
  const selected = await bridge.run("Revenue", "select", "Mar")
  expect(selected.ok, selected.error?.message).toBe(true)
  expect(within(listbox("Revenue")).getByRole("option", { name: /^Mar:/ }).getAttribute("aria-selected")).toBe("true")
  const isolated = await bridge.run("Revenue", "isolate", "Costs")
  expect(isolated.ok, isolated.error?.message).toBe(true)
  expect(document.querySelectorAll("uiset-line-chart .chart-line")).toHaveLength(1)
  const missing = await bridge.run("Revenue", "isolate", "Profit")
  expect(missing.error?.message).toContain("Its series: Revenue, Costs")
  const table = await bridge.run("Plans", "showTable", true)
  expect(table.ok, table.error?.message).toBe(true)
  expect(shown(within(chartOf("plans")).getByRole("group", { name: "Data table" }))).toBe(true)
  const found = await bridge.agent.query({ within: "Revenue" })
  if ("error" in found) throw new Error(found.error)
  expect(found.find((c) => c.label === "Revenue")?.items?.map((i) => i.label)).toContain("Jan (Revenue: $12.4k, Costs: $9.1k)")
})

test("properties set before the elements are defined draw once they are", async () => {
  await openWebPage("charts.html", "charts-demo.ts")
  // Elements in a template's content aren't upgraded: what a page's script sets on them then
  // is an own property, as before UISet's module loads, there when they upgrade on joining.
  const template = document.createElement("template")
  template.innerHTML = `<uiset-line-chart id="early" label="Early"></uiset-line-chart>`
  const months = [
    { m: "Jan", v: 1 },
    { m: "Feb", v: 2 },
    { m: "Mar", v: 3 },
  ]
  const series = [{ key: "v", label: "Visits", value: (d: { v: number }) => d.v }]
  const early = template.content.firstElementChild!
  Object.assign(early, { data: months, x: (d: { m: string }) => d.m, series, selected: "1" })
  const made = template.content.ownerDocument.createElement("uiset-bar-chart")
  made.setAttribute("label", "Made early")
  Object.assign(made, { data: months, x: (d: { m: string }) => d.m, series })
  document.querySelector("main")!.append(document.adoptNode(early), document.adoptNode(made))
  await waitFor(() => expect(options("Early")).toHaveLength(3))
  expect(within(listbox("Early")).getByRole("option", { name: /^Feb:/ }).getAttribute("aria-selected")).toBe("true")
  expect(options("Made early")).toHaveLength(3)
})

test("a scatter chart's title is `label`, set as a property too; its point names are `pointLabel`", async () => {
  await openWebPage("charts.html", "charts-demo.ts")
  chartOf("accounts").label = "Customers"
  await waitFor(() => expect(within(listbox("Customers")).getAllByRole("option", { name: /^Initech: Seats 12/ })).toHaveLength(1))
  expect(chartOf("accounts").querySelector(".chart-title")?.textContent).toBe("Customers")
  // Attributes reflect: a property set writes the attribute, and back.
  chartOf("regions").orientation = "vertical"
  await waitFor(() => expect(listbox("Signups by region").getAttribute("aria-orientation")).toBe("horizontal"))
  expect(chartOf("regions").getAttribute("orientation")).toBe("vertical")
})

test("with the table showing, agents can switch back and act on the chart again", async () => {
  const bridge = await openWebPage("charts.html", "charts-demo.ts")
  expect((await bridge.run("Revenue", "showTable", true)).ok).toBe(true)
  const back = await bridge.run("Show Revenue as", "setValue", "chart")
  expect(back.ok, back.error?.message).toBe(true)
  const selected = await bridge.run("Revenue", "select", "Feb")
  expect(selected.ok, selected.error?.message).toBe(true)
})

test("stats say their change in words; sparklines say where the values went", async () => {
  await openWebPage("charts.html", "charts-demo.ts")
  const stats = screen.getByRole("group", { name: "This month" })
  const stat = [...stats.querySelectorAll("uiset-stat")]
  expect(stat[0]!.querySelector(".stat-change")?.textContent).toMatch(/^Up 12% vs last month$/)
  // A rise in errors is bad, and says so in its tone as well as its words.
  expect(stat[1]!.querySelector(".stat-change")?.hasAttribute("data-bad")).toBe(true)
  within(stats).getByRole("img", { name: "Revenue trend: from 31 to 48, low 31, high 48" })
  // A gap stays a gap, and the name skips it.
  const inline = screen.getByRole("img", { name: /^Signups, last 7 days: from 12 to 31/ })
  expect(inline.querySelector("path.chart-area")?.getAttribute("d")).toMatch(/Z.*M/)
  // Values and a format set as properties redraw.
  Object.assign(document.querySelector(".web-inline-trend uiset-sparkline")!, { values: [1, 2, 3], format: (n: number) => `${n} people` })
  await waitFor(() => screen.getByRole("img", { name: "Signups, last 7 days: from 1 people to 3 people, low 1 people, high 3 people" }))
})
