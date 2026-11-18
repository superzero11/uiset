import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// Agent view: beside a live example, what UI SDK's agent bridge reads, its agent-check score,
// and its actions, run through the bridge (src/site/agent-view.tsx).

type Entry = { label?: string; component: string; value?: unknown; checked?: unknown }
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { agent: { snapshot(): Entry[] } }).agent.snapshot())
const turnOn = async (page: Page) => {
  const toggle = page.getByRole("switch", { name: "Agent view" })
  await toggle.click()
  await expect(toggle).toBeChecked()
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
})

test("on a component's page it lists what the bridge reads, scored, and runs its actions", async ({ page }) => {
  await page.goto("/docs/components/select")
  await expect(page.getByRole("combobox", { name: "Role" })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole("region", { name: /^Agent view/ })).toHaveCount(0)
  await turnOn(page)
  const panel = page.getByRole("region", { name: "Agent view of Select" })
  await expect(panel).toBeVisible()
  await expect(panel.getByText("100/100")).toBeVisible()
  const row = panel.getByRole("listitem").filter({ hasText: "Role" })
  await expect(row).toContainText("select")
  await expect(row).toContainText("“editor”")
  // A closed select's items aren't in the snapshot: as the bridge tells an agent, setValue
  // takes an item's label and opens the list to find it.
  await row.getByRole("button", { name: "setValue Role…" }).click()
  await expect(row).toContainText("The bridge says:")
  await row.getByRole("textbox", { name: "setValue for Role" }).fill("Admin")
  await row.getByRole("button", { name: "Run" }).click()
  await expect(row).toContainText("“admin”")
  expect((await snapshot(page)).find((e) => e.label === "Role")?.value).toBe("admin")
  await expect(panel.locator("output")).not.toBeEmpty()
})

test("setValue on a component whose items are in the snapshot is a choice of them", async ({ page }) => {
  await page.goto("/docs/components/segmented-control")
  await expect(page.locator(".docs-preview").getByRole("radiogroup", { name: "Layout" })).toBeVisible({ timeout: 20_000 })
  await turnOn(page)
  const row = page.getByRole("region", { name: /^Agent view of/ }).getByRole("listitem").filter({ hasText: "Layout" })
  await row.getByRole("button", { name: "setValue Layout…" }).click()
  await row.getByRole("combobox", { name: "setValue for Layout" }).click()
  await page.getByRole("option", { name: "Calendar" }).click()
  await expect(page.locator(".docs-preview").getByRole("radio", { name: "Calendar" })).toBeChecked()
  await expect(row).toContainText("“calendar”")
})

test("a yes-or-no setter is one button that flips it, and the switch's state carries to the next page", async ({ page }) => {
  await page.goto("/docs/components/switch")
  await expect(page.locator(".docs-preview").getByRole("switch").first()).toBeVisible({ timeout: 20_000 })
  await turnOn(page)
  const panel = page.getByRole("region", { name: /^Agent view of/ })
  const row = panel.getByRole("listitem").first()
  const name = (await row.locator(".agent-view-name").textContent())!
  const target = page.locator(".docs-preview").getByRole("switch", { name })
  const before = await target.getAttribute("aria-checked")
  const flip = before === "true" ? "false" : "true"
  await row.getByRole("button", { name: `setChecked ${flip} for ${name}` }).click()
  await expect(target).toHaveAttribute("aria-checked", flip)
  await expect(row.getByRole("button", { name: `setChecked ${before} for ${name}` })).toBeVisible()
  // Remembered: the next page opens with it on.
  await page.goto("/docs/components/slider")
  await expect(page.getByRole("switch", { name: "Agent view" })).toBeChecked({ timeout: 20_000 })
  await expect(page.getByRole("region", { name: /^Agent view of/ })).toBeVisible()
})

test("Agent view is hidden from agents, so turning it on changes nothing an agent sees", async ({ page }) => {
  await page.goto("/docs/components/select")
  await expect(page.getByRole("combobox", { name: "Role" })).toBeVisible({ timeout: 20_000 })
  const read = async () => (await snapshot(page)).map((e) => `${e.component}:${e.label}`).sort()
  const off = await read()
  // Its switch too: on Kits, "Agent view" made a step naming the IDE's "View" menu ambiguous.
  expect(off.filter((e) => /agent view/i.test(e))).toEqual([])
  await turnOn(page)
  await expect(page.getByRole("region", { name: "Agent view of Select" }).getByText("100/100")).toBeVisible()
  expect(await read()).toEqual(off)
})

test("a kit's page has its own view, and the library's cards stay out of agents' way", async ({ page }) => {
  await page.goto("/docs/kits/data-grid")
  await page.locator(".item-frame [role='grid']").first().waitFor({ timeout: 20_000 })
  await turnOn(page)
  const grid = page.getByRole("region", { name: "Agent view of Data grid" })
  await expect(grid.getByRole("listitem").filter({ hasText: "data-grid" }).first()).toBeVisible()
  await expect(grid.getByText(/\d+\/100/)).toBeVisible({ timeout: 10_000 })
  // The Kits tab draws every kit as a picture: none of them is in an agent's snapshot.
  await page.goto("/kits")
  await expect(page.locator(".lib-card").first()).toBeVisible()
  expect((await snapshot(page)).some((e) => e.component === "data-grid")).toBe(false)
})

for (const [skin, theme] of [
  ["base", "light"],
  ["base", "dark"],
  ["phosphor", "dark"],
  ["ink", "light"],
] as const) {
  test(`the panel passes axe in ${skin}, ${theme}`, async ({ page }) => {
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

test("on a phone the panel goes under the example, and the page doesn't scroll sideways", async ({ page }) => {
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

// The Agent Console's kit page shows the settings the agent works on, beside the console: it
// once showed the console alone, so every step failed with nothing to change.
test("on the Agent Console's page, a prompt changes the settings beside it", async ({ page }) => {
  await page.goto("/docs/kits/agent-console")
  const stage = page.locator(".item-stage")
  await stage.getByRole("button", { name: "Make it public and move it to Europe" }).click({ timeout: 20_000 })
  await expect(stage).toContainText("Done: 2 changes", { timeout: 15_000 })
  await expect(stage.getByRole("combobox", { name: "Region" })).toContainText("Europe")
})
