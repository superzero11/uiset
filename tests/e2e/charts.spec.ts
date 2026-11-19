import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const section = (page: Page) => page.locator(".item-frame")
const chart = (page: Page, name: string) => section(page).getByRole("listbox", { name })
const tooltip = (page: Page) => section(page).locator(".chart-tooltip")

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/docs/kits/charts")
  await expect(chart(page, "Revenue and costs")).toBeVisible()
})

for (const scheme of ["light", "dark"] as const) {
  test(`passes axe in ${scheme} mode, with a tooltip up and a table open`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
    await chart(page, "Revenue and costs").locator('[tabindex="0"]').focus()
    await page.keyboard.press("ArrowRight")
    await expect(tooltip(page)).toBeVisible()
    await section(page)
      .getByRole("radiogroup", { name: "Show Revenue by region as" })
      .getByRole("radio", { name: "Table" })
      .click()
    const results = await new AxeBuilder({ page })
      .include(".item-frame")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])
  })
}

test("Tab reaches a chart once, arrows read each month, Enter pins it", async ({ page }) => {
  const listbox = chart(page, "Revenue and costs")
  // The view switch, then the legend, then the chart itself: one stop.
  await section(page)
    .getByRole("group", { name: "Revenue and costs series" })
    .getByRole("button", { name: "Costs" })
    .focus()
  await page.keyboard.press("Tab")
  await expect(listbox.getByRole("option").first()).toBeFocused()
  await page.keyboard.press("End")
  await expect(listbox.getByRole("option", { name: "Dec: Revenue $91,000, Costs $60,000" })).toBeFocused()
  await expect(tooltip(page)).toContainText("$91,000")
  await page.keyboard.press("Enter")
  await expect(listbox.getByRole("option", { name: /^Dec/ })).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("Tab")
  const inside = await page.evaluate(
    () => !!document.activeElement?.closest("[role=listbox][aria-label='Revenue and costs']"),
  )
  expect(inside).toBe(false)
})

test("hovering a line chart snaps to the nearest month and shows every series", async ({
  page,
}) => {
  // By name: the kit now opens with the Traffic sources bar, which has one row a part.
  const plot = section(page).locator("figure.line-chart").filter({ has: page.getByText("Revenue and costs", { exact: true }) }).locator(".chart-plot")
  await plot.scrollIntoViewIfNeeded()
  const box = (await plot.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(tooltip(page)).toBeVisible()
  await expect(tooltip(page).locator(".chart-tooltip-row")).toHaveCount(2)
  await page.mouse.move(box.x - 40, box.y - 40)
  await expect(tooltip(page)).toBeHidden()
})

test("the legend isolates a series, for pointer and keyboard alike", async ({ page }) => {
  const legend = section(page).getByRole("group", { name: "Revenue and costs series" })
  await legend.getByRole("button", { name: "Costs" }).click()
  await expect(legend.getByRole("button", { name: "Costs" })).toHaveAttribute("aria-pressed", "true")
  await expect(chart(page, "Revenue and costs").getByRole("option").first()).toHaveAttribute(
    "aria-label",
    "Jan: Costs $38,000",
  )
  await legend.getByRole("button", { name: "Costs" }).press("Enter")
  await expect(chart(page, "Revenue and costs").getByRole("option").first()).toHaveAttribute(
    "aria-label",
    "Jan: Revenue $42,000, Costs $38,000",
  )
})

test("in the heatmap, Down moves a row and the reading names the cell", async ({ page }) => {
  const heat = chart(page, "Sessions by day and hour")
  await heat.locator('[tabindex="0"]').focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowDown")
  await expect(heat.getByRole("option", { name: /^Tue, 2h: Sessions/ })).toBeFocused()
})

test("scatter hover finds the nearest point, even off its dot", async ({ page }) => {
  const plot = section(page).locator(".scatter-chart .chart-plot")
  await plot.scrollIntoViewIfNeeded()
  const option = chart(page, "Deal size and time to close").getByRole("option").last()
  const box = (await option.boundingBox())!
  // 18px off the point's center: outside its dot, still nearest to it.
  await page.mouse.move(box.x + box.width / 2 + 18, box.y + box.height / 2 + 10)
  await expect(tooltip(page)).toBeVisible()
  await expect(tooltip(page)).toContainText("Deal")
})

test("charts fit a phone without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.reload()
  await expect(chart(page, "Revenue and costs")).toBeVisible()
  const overflow = await section(page).evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const svgWidth = await section(page).locator(".chart-svg").first().evaluate((el) => el.getBoundingClientRect().width)
  expect(svgWidth).toBeLessThanOrEqual(375)
})

test("right-to-left pages keep axis labels outside the plot", async ({ page }) => {
  await page.evaluate(() => (document.documentElement.dir = "rtl"))
  const chartBox = section(page).locator(".line-chart").first()
  const label = (await chartBox.locator("[data-axis=y] text").first().boundingBox())!
  const grid = (await chartBox.locator(".chart-grid line").first().boundingBox())!
  expect(label.x + label.width).toBeLessThanOrEqual(grid.x + 1)
})

test("in scatter, a click pins the point the tooltip shows", async ({ page }) => {
  const listbox = chart(page, "Deal size and time to close")
  await listbox.scrollIntoViewIfNeeded()
  const option = listbox.getByRole("option").last()
  const box = (await option.boundingBox())!
  await page.mouse.click(box.x + box.width / 2 + 18, box.y + box.height / 2 + 10)
  await expect(option).toHaveAttribute("aria-selected", "true")
})

for (const scheme of ["light", "dark"] as const) {
  test(`shares printed inside the segmented bar clear 4.5:1 in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
    const ratios = await section(page).evaluate(() => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!
      const rgb = (color: string) => {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 1, 1)
        return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
      }
      const luminance = (c: number[]) => {
        const [r, g, b] = c.map((v) => {
          const s = v / 255
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
      }
      return [...document.querySelectorAll(".segmented-bar-label")].map((text) => {
        const rect = text.parentElement!.querySelector("rect")!
        const a = luminance(rgb(getComputedStyle(text).fill))
        const b = luminance(rgb(getComputedStyle(rect).fill))
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      })
    })
    expect(ratios.length).toBeGreaterThan(2)
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
}
