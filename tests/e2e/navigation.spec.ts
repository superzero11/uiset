import { expect, test, type Page } from "@playwright/test"

// Moving between the site's pages when one is slow to load: a progress bar shows, clicking
// again doesn't open the page twice, the latest click wins, and pointing at a link starts
// loading its page. The Kits page's code is held back to make it slow.

const kitsModule = /\/src\/site\/pages\/kits\.tsx|\/assets\/kits-[\w-]+\.js/

async function holdKits(page: Page) {
  let release!: () => void
  const released = new Promise<void>((resolve) => (release = resolve))
  let requested = false
  await page.route(kitsModule, async (route) => {
    requested = true
    await released
    await route.continue()
  })
  return { release, requested: () => requested }
}

const nav = (page: Page) => page.locator("header.site-top nav[aria-label=Site]")
const progressOpacity = (page: Page) => page.locator(".site-progress").evaluate((el) => Number(getComputedStyle(el).opacity))

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 })
})

test("a slow page shows a progress bar, and clicking again opens it once", async ({ page }) => {
  const kits = await holdKits(page)
  const before = await page.evaluate(() => history.length)
  const link = nav(page).getByRole("link", { name: "Kits", exact: true })
  await link.click()
  await link.click()
  await link.click()

  await expect(page.locator("html")).toHaveAttribute("data-navigating", "")
  await expect(page.locator("#main")).toHaveAttribute("aria-busy", "true")
  await expect.poll(() => progressOpacity(page)).toBe(1)
  expect(new URL(page.url()).pathname).toBe("/")

  kits.release()
  await expect(page).toHaveURL(/\/kits$/)
  await expect(page.locator("html")).not.toHaveAttribute("data-navigating")
  await expect(page.locator("#main")).not.toHaveAttribute("aria-busy")
  expect(await page.evaluate(() => history.length)).toBe(before + 1)
})

test("a click on another link while one loads wins", async ({ page }) => {
  const kits = await holdKits(page)
  const before = await page.evaluate(() => history.length)
  await nav(page).getByRole("link", { name: "Kits", exact: true }).click()
  await nav(page).getByRole("link", { name: "Themes", exact: true }).click()
  await expect(page).toHaveURL(/\/themes$/)

  kits.release()
  // The Kits page's code arriving late doesn't take the reader there.
  await page.waitForTimeout(500)
  await expect(page).toHaveURL(/\/themes$/)
  await expect(page.locator("html")).not.toHaveAttribute("data-navigating")
  expect(await page.evaluate(() => history.length)).toBe(before + 1)
})

test("pointing at a link starts loading its page before the click", async ({ page }) => {
  const kits = await holdKits(page)
  await nav(page).getByRole("link", { name: "Kits", exact: true }).hover()
  await expect.poll(kits.requested).toBe(true)
  expect(new URL(page.url()).pathname).toBe("/")
  kits.release()
})
