import AxeBuilder from "./axe"
import { expect, test } from "@playwright/test"
import { captureAgentTools, checkPage } from "@/registry/uiset/ui/agent-check/playwright"

// The check on a live page through the tools the app registers for the browser's agent
// (WebMCP), as that agent reaches them: the site registers its bridge with registerTools.

test("reaches the bridge through the page's WebMCP tools, and finds a control agents can't see", async ({ page }) => {
  await captureAgentTools(page)
  await page.goto("/templates/pricing")
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { __uisetAgentTools?: object }).__uisetAgentTools ?? {}).sort())).toEqual(["act", "query", "snapshot"])
  await page.locator("#main .template-frame").first().waitFor()
  await page.evaluate(() => {
    const probe = document.createElement("section")
    probe.id = "probe"
    probe.innerHTML = `<h2>Probe</h2><button type="button">Plain</button>`
    document.getElementById("main")!.append(probe)
  })
  // Only through the tools: the global the site sets for its console is taken away.
  await page.evaluate(() => delete (window as unknown as { agent?: unknown }).agent)
  const report = await checkPage(page, { root: "#probe" })
  expect(report.controls).toBeGreaterThan(5)
  expect(report.problems.filter((problem) => problem.kind === "unseen")).toEqual([
    expect.objectContaining({ control: 'button "Plain"', near: "#probe" }),
  ])
})

// The Agents page's demo: the real check on the page it's on, with and without three planted
// mistakes. Without them the whole page scores 100, which also keeps the page's own names apart.
test.describe("the Agents page demo", () => {
  const demo = (page: import("@playwright/test").Page) => page.locator("#agent-check")

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/agents#agent-check")
    await demo(page).getByRole("button", { name: "Check this page" }).click()
  })

  test("finds the three mistakes in the form, and nothing once they're out", async ({ page }) => {
    const problems = demo(page).locator(".readiness-problems li")
    await expect(problems).toHaveCount(3)
    await expect(problems.nth(0)).toContainText(/^Error\s*avatar c\d+ has no name/)
    await expect(problems.nth(1)).toContainText('"Country" names 2 components')
    await expect(problems.nth(2)).toContainText('button "Export CSV" (in "Revenue report") isn\'t a UI SDK component')
    await demo(page).getByRole("switch", { name: "Put mistakes in the form" }).click()
    await expect(demo(page).locator(".readiness-number")).toHaveText("100")
    await expect(demo(page).locator(".readiness-result")).toContainText("Nothing to fix.")
    await expect(problems).toHaveCount(0)
  })

  for (const theme of ["light", "dark"] as const) {
    test(`passes axe in ${theme}, with the problems showing`, { tag: "@engine" }, async ({ page, browserName }) => {
      test.fixme(browserName === "firefox", "Playwright's Firefox crashes (signal 11) while automation inspects this page; normal use doesn't (HISTORY.md decision log, 2026-11-15)")
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await expect(demo(page).locator(".readiness-problems li")).toHaveCount(3)
      const results = await new AxeBuilder({ page }).include("#agent-check").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
})
