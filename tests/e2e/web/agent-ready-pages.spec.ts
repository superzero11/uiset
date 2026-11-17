import { expect, test } from "@playwright/test"
import { formatAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import { checkPage, waitForAgent } from "@/registry/uiset/ui/agent-check/playwright"

// UISet holds its own Web Components pages to its agent-readiness check: on every template and
// kit page, an agent finds every control by name. The pages keep their bridge in `window.agent`.

const pages = [
  ...["auth", "dashboard", "settings", "admin", "inbox", "chat-app", "project-board", "calendar-app", "pricing"].map((name) => `/templates/${name}.html`),
  ...["index", "content", "data-grid", "charts", "board", "schedule", "canvas", "ide", "chat", "mobile", "terminal", "rich-text", "agent"].map((name) => `/${name}.html`),
]

for (const path of pages) {
  test(`${path} scores 100`, async ({ page }) => {
    await page.goto(path)
    await waitForAgent(page, { agent: "agent" })
    // Elements join the bridge as they're defined and drawn.
    await page.waitForTimeout(500)
    const report = await checkPage(page, { agent: "agent" })
    expect(report.score, formatAgentReadiness(report, path)).toBe(100)
  })
}
