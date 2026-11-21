import { screen, waitFor, within } from "@testing-library/react"
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

// UI SDK's elements and UISet's on the plain HTML index (web/index.html), with no React on the
// page, driven through the web agent bridge. Looks, motion and keys stay in the browser. Moved
// from tests/e2e/web/web-components.spec.ts.

const root = () => document.querySelector("uiset-root")!
const open = () => openWebPage("index.html", "demo.ts")

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("<uiset-root> carries the skin, theme and feedback settings", async () => {
  const bridge = await open()
  expect(root().getAttribute("data-uiset")).toBe("")
  expect(root().getAttribute("data-sound")).toBe("off")
  await bridge.run("Skin", "setValue", "studio")
  await bridge.run("Theme", "setValue", "dark")
  expect(root().getAttribute("data-skin")).toBe("studio")
  expect(root().getAttribute("data-theme")).toBe("dark")
})

test("password rules tick off as it's typed, and each change is said once", async () => {
  const bridge = await open()
  const rule = (name: string) => within(screen.getByRole("list", { name: "Password rules" })).getAllByRole("listitem").find((item) => item.textContent?.includes(name))!
  const spoken = () => Array.from(document.querySelectorAll("[aria-live]"), (el) => el.textContent ?? "").join(" | ")
  expect(rule("A number").textContent).toBe("To do: A number")
  await bridge.run("Create a password", "setValue", "hello1")
  expect(rule("A number").hasAttribute("data-met")).toBe(true)
  expect(rule("A number").textContent).toBe("Done: A number")
  await waitFor(() => expect(spoken()).toContain("Done: A number"))
  await bridge.run("Create a password", "setValue", "Hello1world!")
  await waitFor(() => expect(spoken()).toContain("Every rule is met"))
})

test("agents patch by the jacks' names, taken from the page", async () => {
  // The patch bay measures its jacks when a ResizeObserver first reports them, as browsers do
  // on observe; the setup's stand-in never reports, so this one does, with jsdom's zero sizes.
  const Quiet = globalThis.ResizeObserver
  globalThis.ResizeObserver = class {
    constructor(private report: ResizeObserverCallback) {}
    observe(target: Element) {
      queueMicrotask(() => this.report([{ target } as ResizeObserverEntry], this))
    }
    unobserve() {}
    disconnect() {}
  }
  try {
    const bridge = await open()
    const result = await bridge.run("Patch bay", "plug", "Oscillator out", "Output in")
    expect(result.ok, result.error?.message).toBe(true)
    expect(screen.getByRole("button", { name: "Output in" }).getAttribute("aria-description")).toBe("Patched to Oscillator out")
    expect(document.querySelectorAll("uiset-patch-bay svg .patch-bay-cable")).toHaveLength(1)
  } finally {
    globalThis.ResizeObserver = Quiet
  }
})
