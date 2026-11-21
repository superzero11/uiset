import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// The Agent Console as web elements, on a page with no React: axe, and the approval cards in
// the top layer above a modal. Its behavior is tested in tests/unit/web-agent-console.bridge.test.ts.
const agentConsole = (page: Page) => page.getByRole("region", { name: "Agent" })
const settings = (page: Page) => page.locator("#project-settings")
const suggestion = (page: Page, name: string) => page.getByRole("group", { name: "Suggestions" }).getByRole("button", { name })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/agent.html")
  await expect(agentConsole(page).getByRole("status").first()).toHaveText(/Idle/)
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Agent Console page passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await suggestion(page, "Make it public and move it to Europe").click()
      await expect(agentConsole(page).locator("uiset-agent-step[data-status=done]")).toHaveCount(2)
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("the cards stay usable above a modal the person opened", { tag: "@engine" }, async ({ page }) => {
  await settings(page).getByRole("button", { name: "Delete project" }).click()
  await expect(page.getByRole("alertdialog", { name: "Delete Apollo?" })).toBeVisible()
  // The agent asks while the modal covers the page.
  const asked = page.evaluate(() => (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean }> } }).agent.act({ steps: [{ ref: "Delete Apollo?", action: "press", args: ["Delete forever"] }] }))
  const card = page.getByRole("group", { name: "Agent requests" })
  await card.getByRole("button", { name: "Allow" }).first().click()
  await expect(page.locator("#notice")).toHaveText(/Deleted/)
  expect((await asked).ok).toBe(true)
})
