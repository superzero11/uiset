import { screen, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/button"
import "@ui-sdk/web/switch"
import "@ui-sdk/web/checkbox"
import "@ui-sdk/web/slider"
import "@ui-sdk/web/select"
import "@ui-sdk/web/tabs"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/segmented-control"
import "@ui-sdk/web/progress"
import "@ui-sdk/web/field"
import "@ui-sdk/web/radio"
import "@ui-sdk/web/textarea"
import "@ui-sdk/web/password-input"
import "@ui-sdk/web/meter"
import "@ui-sdk/web/toggle"
import { openWebPage } from "./web-page"

// The stepper as a web element, on the plain HTML index (web/index.html): the same parts and
// behavior as its React twin, driven through the web agent bridge. Moved from
// tests/e2e/web/shell-parts.spec.ts.

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("the stepper: the current step is marked, later steps wait, earlier ones can be chosen", async () => {
  const bridge = await openWebPage("index.html", "demo.ts")
  const step = (name: RegExp) => within(screen.getByRole("navigation", { name: "Setup progress" })).getByRole("button", { name }) as HTMLButtonElement
  expect(step(/Details/).getAttribute("aria-current")).toBe("step")
  expect(step(/Review/).disabled).toBe(true)
  expect(step(/Account/).textContent).toContain("(done)")
  await bridge.press("Account (done)")
  expect(step(/Account/).getAttribute("aria-current")).toBe("step")
  expect(document.getElementById("stepper")!.getAttribute("value")).toBe("account")
  expect(step(/Details/).disabled).toBe(true)
})
