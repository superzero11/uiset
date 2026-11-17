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
