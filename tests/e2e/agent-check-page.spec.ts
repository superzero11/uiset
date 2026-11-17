import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
import { checkPage } from "@/registry/uiset/ui/agent-check/playwright"
import bookmarklet from "@/src/site/generated/agent-check-bookmarklet"

// The check for any page, with no UI SDK bridge: through Playwright, and as the uiset.dev
// bookmarklet draws its report over the page.

const plain = `<!doctype html><html lang="en"><head><title>Shop</title></head><body><main>
  <h1>Orders</h1>
  <section><h2>Toolbar</h2><button type="button"><svg aria-hidden="true" width="12" height="12"></svg></button></section>
  <table><tr><td>Ada</td><td><button type="button">Edit</button></td></tr><tr><td>Grace</td><td><button type="button">Edit</button></td></tr></table>
  <div style="cursor: pointer">Open billing</div>
  <label>Search <input type="search"></label>
</main></body></html>`

test("on a page with no bridge, checkPage reads the page itself", async ({ page }) => {
  await page.setContent(plain)
  const report = await checkPage(page)
  expect(report.mode).toBe("page")
  expect(report.problems.map((problem) => problem.kind)).toEqual(["unnamed", "ambiguous", "unseen"])
  expect(report).toMatchObject({ controls: 5, ready: 1, score: 20 })
  // Accepted problems count as fine, as in the page.
  const accepted = await checkPage(page, { ignore: (problem) => problem.kind === "unseen" })
  expect(accepted).toMatchObject({ controls: 4, ready: 1, score: 25 })
  await expect(checkPage(page, { mode: "bridge" })).rejects.toThrow("No agent bridge on the page")
})

const panel = (page: Page) => page.getByRole("dialog", { name: "Agent readiness" })

test("the bookmarklet draws its report over the page, outlines a problem's elements, and goes on Escape", async ({ page }) => {
  await page.setContent(plain)
  await page.evaluate(bookmarklet)
  await expect(panel(page)).toContainText("20/100")
  await expect(panel(page)).toContainText("Read from the page's accessibility tree: no UI SDK bridge.")
  await expect(panel(page).getByRole("heading", { name: "Agent readiness" })).toBeFocused()
  const twins = panel(page).getByRole("button", { name: /2 buttons are named "Edit"/ })
  await twins.click()
  await expect(twins).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator("uiset-agent-check .outline")).toHaveCount(2)
  // The outlines sit on the two Edit buttons.
  const edit = await page.getByRole("button", { name: "Edit" }).first().boundingBox()
  const outline = await page.locator("uiset-agent-check .outline").first().boundingBox()
  expect(Math.abs(outline!.x + 3 - edit!.x)).toBeLessThan(2)
  await twins.click()
  await expect(page.locator("uiset-agent-check .outline")).toHaveCount(0)
  // Check again draws a new report; Escape takes it away.
  await page.evaluate(() => document.querySelector("main")!.insertAdjacentHTML("beforeend", "<button></button>"))
  await panel(page).getByRole("button", { name: "Check again" }).click()
  await expect(panel(page).getByRole("listitem")).toHaveCount(4)
  await page.keyboard.press("Escape")
  await expect(panel(page)).toHaveCount(0)
})

for (const scheme of ["light", "dark"] as const) {
  test(`the bookmarklet's report passes axe in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.setContent(plain)
    await page.evaluate(bookmarklet)
    await expect(panel(page)).toBeVisible()
    await panel(page).getByRole("button", { name: /has no name/ }).click()
    const results = await new AxeBuilder({ page }).include("uiset-agent-check").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
  })
}

test("the Agents page offers the bookmarklet, and tries it on itself through the page's bridge", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/agents#agent-check")
  const link = page.getByRole("link", { name: "Check agent readiness" })
  await expect(link).toHaveAttribute("href", /^javascript:\(function\(\)%7B/)
  await page.getByRole("button", { name: "Try it on this page" }).click()
  await expect(panel(page)).toContainText("Read through the page's UI SDK agent bridge.")
  await expect(panel(page)).toContainText("has no name")
})
