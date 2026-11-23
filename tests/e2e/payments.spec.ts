import AxeBuilder from "./axe"
import { expect, test } from "@playwright/test"

// The Payments kit's page in a real browser: axe in every skin and theme with problems
// showing, and the two columns at a phone's width. Behavior is in tests/unit/payments.test.tsx.

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    test(`the Payments kit passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.goto(`/docs/kits/payments?skin=${skin}&theme=${theme}`)
      const summary = page.getByRole("region", { name: "Order summary" })
      await expect(summary).toBeVisible({ timeout: 20_000 })
      // A refused code and a short card number, showing their problems.
      await summary.getByRole("textbox", { name: "Discount code" }).fill("SPRING")
      await summary.getByRole("button", { name: "Apply" }).click()
      await expect(summary.getByText(/isn't one we know/)).toBeVisible()
      await page.getByRole("textbox", { name: "Card number" }).fill("4242")
      await page.getByRole("textbox", { name: "Card number" }).blur()
      await expect(page.getByText("Not a whole card number yet.")).toBeVisible()
      const results = await new AxeBuilder({ page }).include(".payments-demo").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("at a phone's width the order sits under the payment, and nothing runs past the page", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto("/docs/kits/payments")
  const summary = page.getByRole("region", { name: "Order summary" })
  await expect(summary).toBeVisible({ timeout: 20_000 })
  const pay = page.getByRole("button", { name: /^Pay / })
  expect((await summary.boundingBox())!.y).toBeGreaterThan((await pay.boundingBox())!.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("a press on Pay from a short card number checks the payment: the field's own problem waits for the press to end", { tag: "@engine" }, async ({ page }) => {
  await page.goto("/docs/kits/payments")
  await expect(page.getByRole("region", { name: "Order summary" })).toBeVisible({ timeout: 20_000 })
  await page.getByRole("textbox", { name: "Card number" }).fill("4242")
  // Shown as focus left, the problem pushed Pay down mid-press and the click never came.
  await page.getByRole("button", { name: /^Pay / }).click()
  await expect(page.getByText("Expiry is required.")).toBeVisible()
  await expect(page.getByText("Not a whole card number yet.")).toBeVisible()
})
