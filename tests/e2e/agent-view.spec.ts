import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"

// Agent view: beside a live example, what UI SDK's agent bridge reads, its agent-check score,
// and its actions, run through the bridge (src/site/agent-view.tsx). What needs a browser stays
// here: a demo loading after the panel, axe and the phone layout. Its behavior is in
// tests/unit/agent-view.bridge.test.tsx.

const turnOn = async (page: Page) => {
  const toggle = page.getByRole("switch", { name: "Agent view" })
  await toggle.click()
  await expect(toggle).toBeChecked()
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
})

test("a kit whose demo loads after the panel still lists its controls", { tag: "@engine" }, async ({ page }) => {
  // Agent view starts on, so the panel reads before the demo's code arrives; the bridge's
  // subscribe doesn't report components arriving, so the panel must notice the stage grow.
  await page.addInitScript(() => localStorage.setItem("uiset-agent-view", "on"))
  await page.goto("/docs/kits/chat")
  const panel = page.getByRole("region", { name: "Agent view of Chat" })
  await panel.scrollIntoViewIfNeeded()
  await expect(panel.locator(".agent-view-name", { hasText: /^Send$/ })).toBeVisible({ timeout: 15_000 })
  await expect(panel).not.toContainText("No controls here")
})

for (const [skin, theme] of [
  ["base", "light"],
  ["base", "dark"],
  ["phosphor", "dark"],
  ["ink", "light"],
] as const) {
  test(`the panel passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
    await page.goto(`/docs/components/select?skin=${skin}&theme=${theme}`)
    await expect(page.getByRole("combobox", { name: "Role" })).toBeVisible({ timeout: 20_000 })
    await turnOn(page)
    const panel = page.getByRole("region", { name: "Agent view of Select" })
    await expect(panel.getByText("100/100")).toBeVisible()
    await panel.getByRole("listitem").first().getByRole("button").first().focus()
    const results = await new AxeBuilder({ page }).include(".agent-view").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
  })
}

test("on a phone the panel goes under the example, and the page doesn't scroll sideways", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/docs/components/select")
  await expect(page.getByRole("combobox", { name: "Role" })).toBeVisible({ timeout: 20_000 })
  await turnOn(page)
  const panel = page.getByRole("region", { name: "Agent view of Select" })
  await expect(panel).toBeVisible()
  const preview = (await page.locator(".docs-preview").boundingBox())!
  const box = (await panel.boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(preview.y + preview.height - 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
