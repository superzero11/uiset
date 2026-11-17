import { expect, test, type Page } from "@playwright/test"

// The components gallery draws its first examples with the page and the rest as they come
// into view or the browser is idle (src/site/components-page.tsx), so opening it doesn't wait
// for all of them.

const exampleModule = /\/src\/site\/examples\/([\w-]+)\.tsx/
const firstSix = ["button", "toggle", "toolbar", "field", "textarea", "inline-edit"]

async function trackExamples(page: Page, hold: (slug: string) => boolean = () => false) {
  const requested = new Set<string>()
  await page.route(exampleModule, async (route) => {
    const slug = exampleModule.exec(route.request().url())![1]!
    requested.add(slug)
    if (hold(slug)) return // never answered
    await route.continue()
  })
  return requested
}

test("opening the page loads its first examples, not all of them, and they draw with it", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 })
  // Only the first examples are answered, so the page can't have waited for the rest.
  const requested = await trackExamples(page, (slug) => !firstSix.includes(slug))
  // What the page holds the moment its heading appears: whether the first card drew with it.
  await page.evaluate(() => {
    const w = window as unknown as { firstDraw?: boolean }
    new MutationObserver((_, observer) => {
      if (document.querySelector("main h1")?.textContent !== "Components") return
      w.firstDraw = document.querySelector("section.example")?.hasAttribute("data-ready") ?? false
      observer.disconnect()
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  await page.locator("header.site-top nav[aria-label=Site]").getByRole("link", { name: "Components", exact: true }).click()
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Components", null, { timeout: 20_000 })
  expect(await page.evaluate(() => (window as unknown as { firstDraw?: boolean }).firstDraw)).toBe(true)
  expect(requested.size).toBeLessThan(30)
  // Every card's heading is there from the start, for links and find in page.
  await expect(page.getByRole("heading", { level: 3, name: "Timeline", exact: true })).toBeAttached()
})

test("a card coming into view loads even while others are still loading", async ({ page }) => {
  // The background fill is stuck on held examples; scrolling to the last card loads it anyway.
  const requested = await trackExamples(page, (slug) => slug === "select" || slug === "combobox")
  await page.goto("/components")
  await expect(page.locator("main h1")).toHaveText("Components", { timeout: 20_000 })
  const last = page.locator("section.example").last()
  await last.scrollIntoViewIfNeeded()
  await expect(last).toHaveAttribute("data-ready", "", { timeout: 20_000 })
  await expect(page.locator(".gallery")).not.toHaveAttribute("data-ready")
  expect(requested.size).toBeGreaterThan(firstSix.length)
})

test("a link to an example far down the page lands on it, without scroll anchoring too", async ({ page }) => {
  // Browsers keep a link's target in view as content above it loads, scroll anchoring or not
  // (Safari has had overflow-anchor only since 27).
  await page.addInitScript(() => {
    const style = document.createElement("style")
    style.textContent = "* { overflow-anchor: none }"
    document.documentElement.append(style)
  })
  // The examples above it arrive after the page has drawn and scrolled, and change its place.
  await page.route(exampleModule, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    await route.continue()
  })
  await page.goto("/components#example-timeline")
  await page.locator(".gallery[data-ready]").waitFor({ timeout: 60_000 })
  await page.waitForTimeout(300)
  const top = await page.locator("#example-timeline").evaluate((el) => el.getBoundingClientRect().top)
  // Just under the sticky header.
  expect(top).toBeGreaterThan(0)
  expect(top).toBeLessThan(200)
})
