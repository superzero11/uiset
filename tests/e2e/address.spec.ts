import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"

// The Address kit's page in a real browser: axe in every skin and theme with problems
// showing and the country list open, and a row at a phone's width. Behavior is in
// tests/unit/address.test.tsx.

const axe = (page: Page) =>
  new AxeBuilder({ page }).include(".address-demo").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
const found = (results: Awaited<ReturnType<typeof axe>>) => results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    test(`the Address kit passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page, browserName }) => {
      test.fixme(browserName === "firefox", "Playwright's Firefox crashes (\"Page crashed\") while axe scans this page, in Docker, on every try; Chrome and WebKit pass this scan, and Firefox passes the parts' gallery scans and this page's other tests (HISTORY.md decision log, 2026-11-28)")
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.goto(`/docs/kits/address?skin=${skin}&theme=${theme}`)
      const address = page.getByRole("group", { name: "Delivery address" })
      await expect(address).toBeVisible({ timeout: 20_000 })
      // Problems showing: a short ZIP code, then Save with the rest missing.
      await address.getByRole("textbox", { name: "ZIP code" }).fill("941")
      await page.getByRole("button", { name: "Save address" }).click()
      await expect(address.getByText("ZIP code should look like 95014.")).toBeVisible()
      expect(found(await axe(page))).toEqual([])
      // The country list, open. It's a listbox the arrow keys move through from the input,
      // scrolling the highlighted country into view, which axe's scrolling rule can't see, so
      // that one rule is checked by keys instead.
      await address.getByRole("button", { name: "Show the list: Country or region" }).click()
      await expect(page.getByRole("option", { name: "Canada" })).toBeVisible()
      const open = await new AxeBuilder({ page }).include("[data-slot='combobox-content']").disableRules(["scrollable-region-focusable"]).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(found(open)).toEqual([])
      for (let step = 0; step < 30; step++) await page.keyboard.press("ArrowDown")
      await expect(page.locator("[data-slot='combobox-item'][data-highlighted]")).toBeInViewport()
    })
  }
}

test("at a phone's width a country's row stacks, and nothing runs past the page", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto("/docs/kits/address")
  const address = page.getByRole("group", { name: "Delivery address" })
  await expect(address).toBeVisible({ timeout: 20_000 })
  const city = await address.getByRole("textbox", { name: "City" }).boundingBox()
  const zip = await address.getByRole("textbox", { name: "ZIP code" }).boundingBox()
  expect(zip!.y).toBeGreaterThan(city!.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("at a desktop's width the city, state and ZIP code share a row", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/docs/kits/address")
  const address = page.getByRole("group", { name: "Delivery address" })
  await expect(address).toBeVisible({ timeout: 20_000 })
  const city = await address.getByRole("textbox", { name: "City" }).boundingBox()
  const zip = await address.getByRole("textbox", { name: "ZIP code" }).boundingBox()
  expect(Math.abs(zip!.y - city!.y)).toBeLessThan(2)
})

test("a press on Save from a short ZIP code saves: the field's own problem waits for the press to end", { tag: "@engine" }, async ({ page }) => {
  await page.goto("/docs/kits/address")
  const address = page.getByRole("group", { name: "Delivery address" })
  await expect(address).toBeVisible({ timeout: 20_000 })
  await address.getByRole("textbox", { name: "ZIP code" }).fill("941")
  // Shown as focus left, the problem pushed Save down mid-press and the click never came.
  await page.getByRole("button", { name: "Save address" }).click()
  await expect(address.getByText("City is required.")).toBeVisible()
  await expect(address.getByText("ZIP code should look like 95014.")).toBeVisible()
  await expect(address.getByRole("textbox", { name: "Full name" })).toBeFocused()
})
