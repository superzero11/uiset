import AxeBuilder from "../axe"
import { expect, test } from "@playwright/test"

// The Address kit as a web element (web/address.html): axe in each skin with problems
// showing. Behavior is in tests/unit/web-address.bridge.test.ts.

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Address page passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.goto("/address.html")
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await page.waitForFunction(() => !!document.querySelector("#address [data-address-field='postalCode'] input"))
      // Plain DOM queries before the scan, as the other web pages do for Firefox.
      await page.evaluate(() => (document.getElementById("address") as HTMLElement & { check(): boolean }).check())
      await page.waitForFunction(() => !!document.querySelector("#address ui-field-error"))
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("a press on Save from a short ZIP code checks the address: the field's own problem waits for the press to end", { tag: "@engine" }, async ({ page }) => {
  await page.goto("/address.html")
  await page.waitForFunction(() => !!document.querySelector("#address [data-address-field='postalCode'] input"))
  await page.locator("#address [data-address-field='postalCode'] input").fill("941")
  await page.locator("button.address-demo-save").click()
  await expect(page.locator("#address [data-address-field='city'] ui-field-error")).toHaveText("City is required.")
  await expect(page.locator("#address [data-address-field='postalCode'] ui-field-error")).toHaveText("ZIP code should look like 95014.")
})
