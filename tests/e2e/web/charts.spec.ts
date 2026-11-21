import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// Charts as web elements, on a page with no React: the same geometry as the React charts.
const listbox = (page: Page, name: string) => page.getByRole("listbox", { name, exact: true })
type Agent = { act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }> }
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

type ChartEl = HTMLElement & Record<string, unknown>
const chartOf = (page: Page, id: string) => page.locator(`#${id}`)

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
