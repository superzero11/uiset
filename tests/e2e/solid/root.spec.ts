import AxeBuilder from "../axe"
import { expect, test, type ConsoleMessage } from "@playwright/test"

// UISet for Solid: the root in every skin, and a page the server renders and the browser
// hydrates, as in SolidStart. Behavior is in tests/unit/solid-uiset.test.tsx.

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Solid home page passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.goto(`/?skin=${skin}&theme=${theme}`)
      await expect(page.locator(`[data-uiset][data-skin="${skin}"]`)).toBeVisible()
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("a server-rendered page hydrates with no errors or warnings, and works", async ({ page }) => {
  const said: string[] = []
  const keep = (message: ConsoleMessage) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  }
  page.on("console", keep)
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  const response = await page.goto("/ssr/root")
  // The server sent the page's markup, not an empty shell.
  expect(await response!.text()).toContain('<button _hk=')
  await expect(page.getByRole("status")).toHaveText("Not saved")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("status")).toHaveText("Saved 1 time")
  await page.getByRole("radio", { name: "Ink" }).click()
  await expect(page.locator("[data-uiset]")).toHaveAttribute("data-skin", "ink")
  await expect(page.locator("[data-uiset]")).toHaveCount(1)
  expect(said).toEqual([])
})
