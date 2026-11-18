import { expect, test } from "@playwright/test"
import { formatAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import { captureAgentTools, checkPage } from "@/registry/uiset/ui/agent-check/playwright"

// UISet holds its own pages to its agent-readiness check: on every template, an agent finds
// every control by name, site header included. The check reaches the bridge as the browser's
// agent does, through the tools the site registers with WebMCP.

const templates = ["auth", "dashboard", "settings", "admin", "inbox", "chat-app", "project-board", "calendar-app", "pricing", "ide-app"]

for (const template of templates) {
  test(`the ${template} template scores 100`, async ({ page }) => {
    await captureAgentTools(page)
    await page.goto(`/templates?template=${template}`)
    await page.locator("#main .template-panel").first().waitFor()
    // Components join the bridge as they mount.
    await page.waitForTimeout(500)
    const report = await checkPage(page)
    expect(report.score, formatAgentReadiness(report, template)).toBe(100)
  })
}

// The home page puts the hero form, a kit demo and the install steps side by side, so a short
// name like "Sound" or "Output" meets the same word in another control or a step's text.
test("the home page scores 100 with each kit demo open", async ({ page }) => {
  await captureAgentTools(page)
  await page.goto("/")
  const kits = page.getByRole("tablist", { name: "Kit demos" })
  await kits.getByRole("tab").first().waitFor()
  const names = await kits.getByRole("tab").allTextContents()
  expect(names.length).toBeGreaterThan(1)
  const found: string[] = []
  for (const name of names) {
    await kits.getByRole("tab", { name, exact: true }).click()
    // The demos load when their tab opens, and their components join the bridge as they mount.
    await page.locator(".home-kit-panel .grid-stage > :not(.home-kit-loading)").waitFor()
    await page.waitForTimeout(500)
    const report = await checkPage(page, { mode: "bridge" })
    if (report.score < 100) found.push(formatAgentReadiness(report, `home with the ${name} demo`))
  }
  expect(found).toEqual([])
})

// The Kits page shows every kit at once, so a one-word name in one kit, like the grid's "View"
// menu, can't be a word of another kit's names, like a scheduler's or a canvas's.
test("the Kits page scores 100 with every kit on it", async ({ page }) => {
  await captureAgentTools(page)
  await page.goto("/kits")
  await page.locator("#studio .studio-stage").waitFor()
  await page.locator("#terminal").getByRole("textbox").waitFor()
  await page.locator("#canvas .canvas-controls").waitFor()
  await page.waitForTimeout(500)
  const report = await checkPage(page, { mode: "bridge" })
  expect(report.controls).toBeGreaterThan(100)
  expect(report.score, formatAgentReadiness(report, "kits")).toBe(100)
})

// Agents pick a control by its name alone, so on every page each control has a name of its
// own: two links that share one open the same page, a section's link says it's a section, the
// sidebar says which Studio is the kit, a code block's copy button names the heading it's under,
// and a chat message's actions carry its first words. Links in the docs to the site stay on the
// site.
test("on every page, an agent can tell every control apart, and docs links stay on the site", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Names come from the markup, the same in every browser; one walk of every page is enough")
  test.setTimeout(300_000)
  await page.goto("/")
  const paths = await page.evaluate(() => (window as unknown as { __sitePaths: () => string[] }).__sitePaths())
  expect(paths.length).toBeGreaterThan(50)
  const found: string[] = []
  for (const path of paths) {
    await page.goto(path)
    await page.waitForFunction(() => !document.querySelector(".page-loading, .docs-loading"))
    const report = await checkPage(page, { mode: "page" })
    for (const problem of report.problems) found.push(`${path}: ${problem.message}`)
    const broken = await page.locator('a[href*="/blob/main//"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")))
    for (const href of broken) found.push(`${path}: a site link sent to GitHub, ${href}`)
  }
  expect(found).toEqual([])
})
