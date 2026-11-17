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

// Agents pick a control by its name alone, so on every page each control has a name of its
// own: two links that share one open the same page, a section's link says it's a section, the
// sidebar says which Studio is the kit, and a code block's copy button names the heading it's
// under. Links in the docs to the site stay on the site.
// Open, in the kits (ROADMAP): the chat kit names every message's actions alike, File input and
// Upload both say "Choose files", and the rich text kit's task checks are images to agents.
const knownOpen = (path: string, problem: { kind: string; name?: string; control?: string }) =>
  (["/", "/kits"].includes(path) && problem.kind === "ambiguous" && /^(Copy message|Retry message|Good response|Bad response)$/.test(problem.name ?? "")) ||
  (path === "/components" && problem.kind === "ambiguous" && problem.name === "Choose files") ||
  (path === "/kits" && problem.kind === "unseen" && /^span "(Not done|Done)"$/.test(problem.control ?? ""))

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
    for (const problem of report.problems) if (!knownOpen(path, problem)) found.push(`${path}: ${problem.message}`)
    const broken = await page.locator('a[href*="/blob/main//"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")))
    for (const href of broken) found.push(`${path}: a site link sent to GitHub, ${href}`)
  }
  expect(found).toEqual([])
})
