import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// The Agent Console as web elements, on a page with no React: project settings an agent
// changes through UI SDK's bridge, approvals before risky steps, Activity with undo, and
// what the agent can see.
const agentConsole = (page: Page) => page.getByRole("region", { name: "Agent" })
const settings = (page: Page) => page.locator("#project-settings")
const suggestion = (page: Page, name: string) => page.getByRole("group", { name: "Suggestions" }).getByRole("button", { name })
const view = (page: Page, name: string) => agentConsole(page).getByRole("tab", { name }).click()

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

test("the agent changes the settings step by step; Activity lists the changes and undoes them", async ({ page }) => {
  await suggestion(page, "Make it public and move it to Europe").click()
  const steps = agentConsole(page).locator("uiset-agent-step")
  await expect(steps).toHaveCount(2)
  await expect(steps.nth(0)).toContainText("Done")
  await expect(settings(page).getByRole("combobox", { name: "Visibility" })).toHaveText("Public")
  await expect(settings(page).getByRole("combobox", { name: "Region" })).toHaveText("Europe")
  // The changed controls are marked where they are.
  await expect(settings(page).locator("[data-agent-touched]").first()).toBeVisible()
  await view(page, "Activity")
  const activity = page.locator("uiset-agent-activity")
  await expect(activity.getByText("2 changes by the agent")).toBeVisible()
  await activity.getByRole("button", { name: "Undo agent changes" }).click()
  await expect(settings(page).getByRole("combobox", { name: "Visibility" })).toHaveText("Private")
  await expect(settings(page).getByRole("combobox", { name: "Region" })).toHaveText("North America")
  await expect(activity.getByText("Undone").first()).toBeVisible()
  await expect(activity.getByRole("button", { name: "Undo agent changes" })).toBeDisabled()
})

test("a risky step waits for the person: Don't allow refuses it, Allow lets it through", async ({ page }) => {
  await suggestion(page, "Delete the project").click()
  const card = page.getByRole("group", { name: "Agent requests" })
  await expect(card.getByText(/Deletes the Apollo project/)).toBeVisible()
  await expect(agentConsole(page).getByRole("status").first()).toHaveText(/Waiting for you/)
  await card.getByRole("button", { name: "Don’t allow" }).click()
  await expect(agentConsole(page).locator("uiset-agent-step").last()).toContainText("You said no")
  await expect(agentConsole(page).getByRole("status").first()).toHaveText(/Idle/)
  await expect(page.locator("#notice")).toHaveText("")
})

test("the cards stay usable above a modal the person opened", async ({ page }) => {
  await settings(page).getByRole("button", { name: "Delete project" }).click()
  await expect(page.getByRole("alertdialog", { name: "Delete Apollo?" })).toBeVisible()
  // The agent asks while the modal covers the page.
  const asked = page.evaluate(() => (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean }> } }).agent.act({ steps: [{ ref: "Delete Apollo?", action: "press", args: ["Delete forever"] }] }))
  const card = page.getByRole("group", { name: "Agent requests" })
  await card.getByRole("button", { name: "Allow" }).first().click()
  await expect(page.locator("#notice")).toHaveText(/Deleted/)
  expect((await asked).ok).toBe(true)
})

test("What it sees lists each control the agent can reach, with its state", async ({ page }) => {
  // The console's own controls (the message box, Send) never reach the agent.
  const seen = await page.evaluate(() => (window as unknown as { agent: { snapshot: () => { label?: string }[] } }).agent.snapshot().map((e) => e.label))
  expect(seen).toContain("Project name")
  expect(seen).not.toContain("Message the agent")
  expect(seen).not.toContain("Send")
  await view(page, "What it sees")
  const table = page.locator("uiset-agent-snapshot").getByRole("table", { name: "What the agent can see on this page" })
  await expect(table.getByRole("row", { name: /Project name/ })).toContainText("“Apollo”")
  await expect(table.getByRole("row", { name: /Delete Apollo\?/ })).toBeVisible()
  // The console itself stays out of the agent's view, whatever the table shows.
  await expect(table.getByRole("row", { name: /Undo agent changes/ })).toHaveCount(0)
  // `within` narrows it to part of the page: the form, without the buttons under it.
  await page.locator("uiset-agent-snapshot").evaluate((el) => el.setAttribute("within", "#project-form"))
  await expect(table.getByRole("row", { name: /Save project/ })).toHaveCount(0)
  await expect(table.getByRole("row", { name: /Project name/ })).toBeVisible()
})

test("properties set before the elements are defined are picked up", async ({ page }) => {
  await page.route("**/early-agent.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root><uiset-agent-console title="Early agent" status="working"><uiset-agent-step status="done">Looked around</uiset-agent-step><uiset-agent-activity id="a"></uiset-agent-activity></uiset-agent-console></uiset-root>
        <script>
          document.getElementById("a").history = { entries: () => [{ id: "1", source: "agent", label: "Name", ref: "x", reverted: false, from: "A", to: "B", component: "input" }], subscribe: () => () => {}, undoSource: async () => [] }
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-agent.html")
  const region = page.getByRole("region", { name: "Early agent" })
  await expect(region.getByRole("status")).toHaveText(/Working/)
  await expect(region.locator("uiset-agent-step")).toContainText("Looked aroundDone")
  await expect(region.getByText("1 change by the agent")).toBeVisible()
})
