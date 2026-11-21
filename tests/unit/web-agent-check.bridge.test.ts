import { waitFor } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/button"
import { checkPage, type PageLike } from "@/registry/uiset/ui/agent-check/playwright"
import { openWebPage } from "./web-page"

// The check on a Web Components page (web/content.html) whose bridge is a global, through
// checkPage. The page is jsdom's own window: what checkPage sends into the page runs here.
// Moved from tests/e2e/web/agent-check.spec.ts.

const page: PageLike = {
  evaluate: async (fn, arg) => fn(arg),
  addInitScript: async () => undefined,
  waitForFunction: async () => undefined,
}

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("reaches a global bridge, and finds names that find several components and controls agents can't see", async () => {
  await openWebPage("content.html", "content-demo.ts")
  await waitFor(() => expect(document.querySelector("#invoices [role=region]")).not.toBeNull())
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
  const contentAgent = w.contentAgent as { snapshot(): { label?: string }[] }
  await waitFor(() => expect(contentAgent.snapshot().filter((entry) => entry.label === "Twin")).toHaveLength(2))
  const report = await checkPage(page, { mode: "bridge", agent: "contentAgent", root: "#probe" })
  expect(report.problems.filter((problem) => problem.kind === "ambiguous" && problem.label === "Twin")).toHaveLength(1)
  expect(report.problems.filter((problem) => problem.kind === "unseen").map((problem) => problem.kind === "unseen" && problem.control)).toEqual(['button "Plain"'])
  expect(report.score).toBeLessThan(100)
})
