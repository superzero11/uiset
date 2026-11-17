import { expect, test } from "@playwright/test"
import { captureAgentTools, checkPage } from "@/registry/uiset/ui/agent-check/playwright"

// The check on a live page through the tools the app registers for the browser's agent
// (WebMCP), as that agent reaches them: the site registers its bridge with registerTools.

test("reaches the bridge through the page's WebMCP tools, and finds a control agents can't see", async ({ page }) => {
  await captureAgentTools(page)
  await page.goto("/templates?template=pricing")
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { __uisetAgentTools?: object }).__uisetAgentTools ?? {}).sort())).toEqual(["act", "query", "snapshot"])
  await page.locator("#main .template-panel").first().waitFor()
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
