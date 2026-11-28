import { expect, test, type Locator, type Page } from "@playwright/test"

// The home page's What's new row (UI SDK's Timeline, laid out horizontally by base.css). Layout
// needs a real browser: jsdom has no boxes. The footer's link to the URL checker is tested in
// tests/unit/site.bridge.test.tsx.

const box = async (locator: Locator) => (await locator.boundingBox())!

async function home(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  const list = page.getByRole("list", { name: "What’s new" })
  await expect(list).toBeVisible({ timeout: 20_000 })
  return list
}

test("What's new puts the latest releases on one line, each linking to its page", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const list = await home(page)
  const items = list.getByRole("listitem")
  await expect(items).toHaveCount(3)
  await expect(list.getByRole("link", { name: "Tag, phone and masked inputs" })).toHaveAttribute("href", "/docs/kits/forms#tag-input")
  await expect(list.getByRole("link", { name: "Payments and addresses" })).toHaveAttribute("href", "/docs/kits/payments")
  await expect(list.getByRole("link", { name: "Checkout and invoice" })).toHaveAttribute("href", "/templates/checkout")

  // The markers share one line, and each connector runs from its marker to the next one.
  const markers = list.locator('[data-slot="timeline-marker"]')
  const connectors = list.locator('[data-slot="timeline-connector"]')
  const [a, b, c] = [await box(markers.nth(0)), await box(markers.nth(1)), await box(markers.nth(2))]
  expect(Math.abs(a.y - b.y)).toBeLessThan(1)
  expect(Math.abs(b.y - c.y)).toBeLessThan(1)
  expect(a.x).toBeLessThan(b.x)
  expect(b.x).toBeLessThan(c.x)
  const line = await box(connectors.nth(0))
  expect(line.x).toBeGreaterThan(a.x + a.width)
  expect(line.x + line.width).toBeLessThan(b.x)
  expect(line.x + line.width).toBeGreaterThan(b.x - 16)
  expect(Math.abs(line.y + line.height / 2 - (a.y + a.height / 2))).toBeLessThan(1.5)
  // The last event has nothing after it to connect to.
  await expect(items.last().locator('[data-slot="timeline-connector"]')).toBeHidden()

  // One tab stop; the arrow keys move along the row.
  await items.first().focus()
  await page.keyboard.press("ArrowRight")
  await expect(items.nth(1)).toBeFocused()
})

test("on a phone the row scrolls by itself, and the page doesn't", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const list = await home(page)
  expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  // Moving to the last event brings it into view.
  const items = list.getByRole("listitem")
  await items.first().focus()
  await page.keyboard.press("End")
  await expect(items.last()).toBeFocused()
  const view = await box(list)
  const last = await box(items.last())
  expect(last.x).toBeGreaterThanOrEqual(view.x - 1)
  expect(last.x + last.width).toBeLessThanOrEqual(view.x + view.width + 1)
})
