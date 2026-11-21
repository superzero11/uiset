import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// Charts as web elements, on a page with no React: the same geometry as the React charts.
const listbox = (page: Page, name: string) => page.getByRole("listbox", { name, exact: true })
type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]>
}
const act = (page: Page, steps: unknown[]) =>
  page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/charts.html")
  await expect(listbox(page, "Revenue").getByRole("option")).toHaveCount(6)
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Charts page passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("a line chart is a listbox of its x positions: arrows move, the tooltip follows, Enter pins", async ({ page }) => {
  const chart = page.locator("uiset-line-chart")
  await listbox(page, "Revenue").getByRole("option").first().focus()
  await page.keyboard.press("ArrowRight")
  const feb = listbox(page, "Revenue").getByRole("option", { name: "Feb: Revenue $13.9k, Costs $9.4k" })
  await expect(feb).toBeFocused()
  await expect(chart.locator(".chart-tooltip")).toContainText("Feb")
  await expect(chart.locator(".chart-crosshair")).toHaveCount(1)
  await chart.evaluate((el) => el.addEventListener("select", (e) => ((window as unknown as { picked: unknown }).picked = (e as CustomEvent).detail.value)))
  await page.keyboard.press("Enter")
  await expect(feb).toHaveAttribute("aria-selected", "true")
  expect(await page.evaluate(() => (window as unknown as { picked: unknown }).picked)).toBe("1")
  expect(await chart.evaluate((el) => (el as unknown as { selected: string }).selected)).toBe("1")
})

test("the legend isolates a series; single-series charts have no legend", async ({ page }) => {
  const chart = page.locator("uiset-line-chart")
  await expect(chart.locator(".chart-line")).toHaveCount(2)
  await chart.getByRole("button", { name: "Costs" }).click()
  await expect(chart.getByRole("button", { name: "Costs" })).toHaveAttribute("aria-pressed", "true")
  await expect(chart.locator(".chart-line")).toHaveCount(1)
  await expect(listbox(page, "Revenue").getByRole("option").first()).toHaveAccessibleName("Jan: Costs $9.1k")
  await chart.getByRole("button", { name: "Costs" }).click()
  await expect(chart.locator(".chart-line")).toHaveCount(2)
  await expect(page.locator("uiset-bar-chart .chart-legend")).toBeHidden()
  await expect(page.locator("uiset-line-chart .chart-tooltip")).toBeHidden()
})

test("Chart and Table switch to the table twin and back", async ({ page }) => {
  const chart = page.locator("uiset-bar-chart")
  await chart.getByRole("radio", { name: "Table" }).click()
  const table = chart.getByRole("group", { name: "Data table" })
  await expect(table.getByRole("row", { name: "North America 4,210" })).toBeVisible()
  await expect(chart.locator(".chart-plot")).toBeHidden()
  await chart.getByRole("radio", { name: "Chart" }).click()
  await expect(chart.locator(".chart-plot")).toBeVisible()
  await expect(table).toBeHidden()
})

test("horizontal bars move with Up and Down; a heatmap's Up and Down move by a row", async ({ page }) => {
  const bars = listbox(page, "Signups by region")
  await expect(bars).toHaveAttribute("aria-orientation", "vertical")
  await bars.getByRole("option").first().focus()
  await page.keyboard.press("ArrowDown")
  await expect(bars.getByRole("option", { name: "Europe: 3,880" })).toBeFocused()
  const cells = listbox(page, "Sessions by hour")
  await cells.getByRole("option", { name: /^Mon, 9:/ }).focus()
  await page.keyboard.press("ArrowDown")
  await expect(cells.getByRole("option", { name: /^Tue, 9:/ })).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(cells.getByRole("option", { name: /^Tue, 10:/ })).toBeFocused()
})

test("a scatter chart's tooltip follows the nearest point to the pointer", { tag: "@engine" }, async ({ page }) => {
  const chart = page.locator("uiset-scatter-chart")
  await chart.scrollIntoViewIfNeeded()
  const dot = (await listbox(page, "Accounts").getByRole("option", { name: /^Umbrella/ }).boundingBox())!
  await page.mouse.move(dot.x + dot.width / 2 + 20, dot.y + dot.height / 2 + 20)
  await expect(chart.locator(".chart-tooltip")).toContainText("Umbrella")
})

test("new data from script redraws the chart", async ({ page }) => {
  await page.locator("uiset-line-chart").evaluate((el) => {
    const chart = el as unknown as { data: { month: string; revenue: number; costs: number }[] }
    chart.data = [...chart.data, { month: "Jul", revenue: 21000, costs: 12100 }]
  })
  await expect(listbox(page, "Revenue").getByRole("option")).toHaveCount(7)
  await expect(listbox(page, "Revenue").getByRole("option").last()).toHaveAccessibleName("Jul: Revenue $21k, Costs $12.1k")
})

test("agents select by reading, isolate a series, show the table, and read the data", async ({ page }) => {
  const selected = await act(page, [{ ref: "Revenue", action: "select", args: ["Mar"] }])
  expect(selected.ok, selected.error?.message).toBe(true)
  await expect(listbox(page, "Revenue").getByRole("option", { name: /^Mar:/ })).toHaveAttribute("aria-selected", "true")
  const isolated = await act(page, [{ ref: "Revenue", action: "isolate", args: ["Costs"] }])
  expect(isolated.ok, isolated.error?.message).toBe(true)
  await expect(page.locator("uiset-line-chart .chart-line")).toHaveCount(1)
  const missing = await act(page, [{ ref: "Revenue", action: "isolate", args: ["Profit"] }])
  expect(missing.error?.message).toContain("Its series: Revenue, Costs")
  const table = await act(page, [{ ref: "Plans", action: "showTable", args: [true] }])
  expect(table.ok, table.error?.message).toBe(true)
  await expect(page.getByRole("group", { name: "Data table" })).toBeVisible()
  const items = await page.evaluate(async () => {
    const found = await (window as unknown as { agent: Agent }).agent.query({ within: "Revenue" })
    return found.find((c) => c.label === "Revenue")?.items?.map((i) => i.label)
  })
  expect(items).toContain("Jan (Revenue: $12.4k, Costs: $9.1k)")
})

type ChartEl = HTMLElement & Record<string, unknown>
const chartOf = (page: Page, id: string) => page.locator(`#${id}`)

test("properties set before the elements are defined draw once they are", async ({ page }) => {
  await page.route("**/early-charts.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root><main id="main"><uiset-line-chart id="early" label="Early"></uiset-line-chart></main></uiset-root>
        <script>
          const months = [{ m: "Jan", v: 1 }, { m: "Feb", v: 2 }, { m: "Mar", v: 3 }]
          Object.assign(document.getElementById("early"), { data: months, x: (d) => d.m, series: [{ key: "v", label: "Visits", value: (d) => d.v }], selected: "1" })
          const made = document.createElement("uiset-bar-chart")
          made.setAttribute("label", "Made early")
          Object.assign(made, { data: months, x: (d) => d.m, series: [{ key: "v", label: "Visits", value: (d) => d.v }] })
          document.getElementById("main").append(made)
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-charts.html")
  await expect(listbox(page, "Early").getByRole("option")).toHaveCount(3)
  await expect(listbox(page, "Early").getByRole("option", { name: /^Feb:/ })).toHaveAttribute("aria-selected", "true")
  await expect(listbox(page, "Made early").getByRole("option")).toHaveCount(3)
})

test("a scatter chart's title is `label`, set as a property too; its point names are `pointLabel`", async ({ page }) => {
  await chartOf(page, "accounts").evaluate((el) => ((el as ChartEl).label = "Customers"))
  await expect(listbox(page, "Customers").getByRole("option", { name: /^Initech: Seats 12/ })).toHaveCount(1)
  await expect(chartOf(page, "accounts").locator(".chart-title")).toHaveText("Customers")
  // Attributes reflect: a property set writes the attribute, and back.
  await chartOf(page, "regions").evaluate((el) => ((el as ChartEl).orientation = "vertical"))
  await expect(listbox(page, "Signups by region")).toHaveAttribute("aria-orientation", "horizontal")
  expect(await chartOf(page, "regions").getAttribute("orientation")).toBe("vertical")
})

test("the legend keeps focus on the button pressed, and hover leaves the legend alone", async ({ page }) => {
  const costs = chartOf(page, "revenue").getByRole("button", { name: "Costs" })
  await costs.focus()
  await page.keyboard.press("Enter")
  await expect(costs).toBeFocused()
  await expect(costs).toHaveAttribute("aria-pressed", "true")
  await chartOf(page, "revenue").evaluate((el) => ((window as unknown as { kept: Element }).kept = el.querySelector(".chart-legend-item")!))
  await listbox(page, "Revenue").getByRole("option").nth(2).hover()
  await expect(chartOf(page, "revenue").locator(".chart-tooltip")).toBeVisible()
  expect(await chartOf(page, "revenue").evaluate((el) => el.querySelector(".chart-legend-item") === (window as unknown as { kept: Element }).kept)).toBe(true)
  // A series that's gone isn't isolated any more.
  await chartOf(page, "revenue").evaluate((el) => {
    const chart = el as ChartEl
    chart.series = (chart.series as { key: string }[]).filter((s) => s.key !== "costs")
  })
  await expect(chartOf(page, "revenue").locator(".chart-line")).toHaveCount(1)
  await expect(listbox(page, "Revenue").getByRole("option").first()).toHaveAccessibleName(/^Jan: Revenue \$/)
})

test("a moved chart still follows its width", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 })
  const svg = chartOf(page, "revenue").locator("svg.chart-svg")
  const wide = Number(await svg.getAttribute("width"))
  await page.evaluate(() => document.querySelector("main")!.append(document.getElementById("revenue")!))
  await page.setViewportSize({ width: 480, height: 900 })
  await expect.poll(async () => Number(await svg.getAttribute("width"))).toBeLessThan(Math.min(wide, 480))
})

test("a chart waiting for data shows its title only, and passes axe", { tag: "@engine" }, async ({ page }) => {
  await page.evaluate(() => {
    const chart = document.createElement("uiset-line-chart")
    chart.id = "loading"
    chart.setAttribute("label", "Loading")
    document.querySelector("main")!.prepend(chart)
  })
  const chart = chartOf(page, "loading")
  await expect(chart.locator(".chart-title")).toHaveText("Loading")
  await expect(chart.locator("figure")).toHaveAttribute("aria-busy", "true")
  await expect(chart.locator(".chart-tooltip")).toBeHidden()
  await expect(chart.locator(".chart-legend")).toBeHidden()
  await expect(chart.locator(".chart-plot")).toBeHidden()
  const results = await new AxeBuilder({ page }).include("#loading").analyze()
  expect(results.violations.map((v) => v.id)).toEqual([])
})

test("with the table showing, agents can switch back and act on the chart again", async ({ page }) => {
  expect((await act(page, [{ ref: "Revenue", action: "showTable", args: [true] }])).ok).toBe(true)
  const back = await act(page, [{ ref: "Show Revenue as", action: "setValue", args: ["chart"] }])
  expect(back.ok, back.error?.message).toBe(true)
  const selected = await act(page, [{ ref: "Revenue", action: "select", args: ["Feb"] }])
  expect(selected.ok, selected.error?.message).toBe(true)
})

test("new data drops a pin and focus it no longer has, and says so once", async ({ page }) => {
  const chart = chartOf(page, "revenue")
  await chart.evaluate((el) => {
    const w = window as unknown as { events: unknown[] }
    w.events = []
    el.addEventListener("select", (e) => w.events.push((e as CustomEvent).detail))
    ;(el as ChartEl).selected = "5"
  })
  await expect(listbox(page, "Revenue").getByRole("option").last()).toHaveAttribute("aria-selected", "true")
  await listbox(page, "Revenue").getByRole("option").last().focus()
  await chart.evaluate((el) => ((el as ChartEl).data = ((el as ChartEl).data as unknown[]).slice(0, 3)))
  await expect(listbox(page, "Revenue").getByRole("option")).toHaveCount(3)
  await expect(listbox(page, "Revenue").getByRole("option").last()).toBeFocused()
  expect(await chart.evaluate((el) => (el as ChartEl).selected)).toBe(null)
  expect(await page.evaluate(() => (window as unknown as { events: unknown[] }).events)).toEqual([{ value: null, source: "data", reason: "removed" }])
  // Nothing is drawn off the edge for a position that's gone.
  const width = Number(await chart.locator("svg.chart-svg").getAttribute("width"))
  for (const x of await chart.locator(".chart-crosshair").evaluateAll((lines) => lines.map((l) => Number(l.getAttribute("x1")))))
    expect(x).toBeLessThanOrEqual(width)
})

test("agents select by reading before key; the page can refuse a pin", async ({ page }) => {
  await chartOf(page, "regions").evaluate((el) => {
    Object.assign(el, { data: [{ r: "1", n: 1 }, { r: "2", n: 3 }, { r: "3", n: 2 }], x: (d: { r: string }) => d.r, series: [{ key: "n", label: "Signups", value: (d: { n: number }) => d.n }] })
  })
  const picked = await act(page, [{ ref: "Signups by region", action: "select", args: ["1"] }])
  expect(picked.ok, picked.error?.message).toBe(true)
  await expect(listbox(page, "Signups by region").getByRole("option", { selected: true })).toHaveAccessibleName(/^1:/)
  // A listener that calls preventDefault() keeps the pin where it was.
  await chartOf(page, "revenue").evaluate((el) =>
    el.addEventListener("select", (e) => {
      ;(window as unknown as { detail: unknown }).detail = (e as CustomEvent).detail
      e.preventDefault()
    }),
  )
  await listbox(page, "Revenue").getByRole("option").first().focus()
  await page.keyboard.press("Enter")
  await expect(listbox(page, "Revenue").getByRole("option").first()).toHaveAttribute("aria-selected", "false")
  expect(await page.evaluate(() => (window as unknown as { detail: unknown }).detail)).toEqual({ value: "0", source: "keyboard", reason: "toggle" })
  const refused = await act(page, [{ ref: "Revenue", action: "select", args: ["Feb"] }])
  expect(refused.ok).toBe(false)
})

test("stats say their change in words; sparklines say where the values went", async ({ page }) => {
  const stats = page.getByRole("group", { name: "This month" })
  await expect(stats.locator("uiset-stat").first().locator(".stat-change")).toHaveText(/^Up 12% vs last month$/)
  // A rise in errors is bad, and says so in its tone as well as its words.
  await expect(stats.locator("uiset-stat").nth(1).locator(".stat-change")).toHaveAttribute("data-bad", "")
  await expect(stats.getByRole("img", { name: "Revenue trend: from 31 to 48, low 31, high 48" })).toBeVisible()
  // A gap stays a gap, and the name skips it.
  const inline = page.getByRole("img", { name: /^Signups, last 7 days: from 12 to 31/ })
  await expect(inline).toBeVisible()
  expect(await inline.locator("path.chart-area").getAttribute("d")).toMatch(/Z.*M/)
  // Values and a format set as properties redraw.
  await page.locator(".web-inline-trend uiset-sparkline").evaluate((el) => Object.assign(el, { values: [1, 2, 3], format: (n: number) => `${n} people` }))
  await expect(page.getByRole("img", { name: "Signups, last 7 days: from 1 people to 3 people, low 1 people, high 3 people" })).toBeVisible()
})
