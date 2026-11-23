import AxeBuilder from "../axe"
import { expect, test } from "@playwright/test"

// The Payments kit as web elements (web/payments.html): axe in each skin with problems
// showing. Behavior is in tests/unit/web-payments.bridge.test.ts.

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Payments page passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.goto("/payments.html")
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await page.waitForFunction(() => !!document.querySelector("#order .order-totals"))
      // Plain DOM queries before the scan, as the other web pages do for Firefox.
      await page.locator("#order .order-code input").fill("SPRING")
      await page.locator("#order .order-code input").press("Enter")
      await page.evaluate(() => (document.getElementById("payment") as HTMLElement & { check(): boolean }).check())
      await page.waitForFunction(() => !!document.querySelector("#order ui-field-error") && !!document.querySelector("#payment ui-field-error, #payment uiset-masked-input[error]"))
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}
