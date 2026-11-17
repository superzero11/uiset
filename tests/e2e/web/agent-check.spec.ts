import { expect, test } from "@playwright/test"
import { checkPage } from "@/registry/uiset/ui/agent-check/playwright"

// The check on a Web Components page whose bridge is a global, through Playwright.

test("reaches a global bridge, and finds names that find several components and controls agents can't see", async ({ page }) => {
  await page.goto("/content.html")
  await page.waitForFunction(() => !!document.querySelector("#invoices [role=region]"))
  await page.evaluate(() => {
    const probe = document.createElement("section")
    probe.id = "probe"
    probe.innerHTML = `
      <h2>Probe</h2>
      <ui-button><button type="button">Twin</button></ui-button>
      <ui-button><button type="button">Twin</button></ui-button>
      <button type="button">Plain</button>
      <div data-agent-hidden><button type="button">Hidden</button></div>`
    document.querySelector("main")!.append(probe)
    // Outside the part checked, and the bridge under a name of the page's own.
    const outside = document.createElement("button")
    outside.textContent = "Outside"
    document.querySelector("main")!.prepend(outside)
    const w = window as unknown as Record<string, unknown>
    w.contentAgent = w.agent
    delete w.agent
  })
  await expect.poll(() => page.evaluate(() => (window as unknown as { contentAgent: { snapshot(): { label?: string }[] } }).contentAgent.snapshot().filter((entry) => entry.label === "Twin").length)).toBe(2)
  const report = await checkPage(page, { agent: "contentAgent", root: "#probe" })
  expect(report.problems.filter((problem) => problem.kind === "ambiguous" && problem.label === "Twin")).toHaveLength(1)
  expect(report.problems.filter((problem) => problem.kind === "unseen").map((problem) => problem.kind === "unseen" && problem.control)).toEqual(['button "Plain"'])
  expect(report.score).toBeLessThan(100)
})
