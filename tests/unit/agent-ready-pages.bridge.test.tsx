import { cleanup, render, waitFor } from "@testing-library/react"
import { Suspense, type ComponentType } from "react"
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest"
import { checkAgentReadiness, formatAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import HomePage from "@/src/site/pages/home"
import LibraryPage from "@/src/site/pages/library"
import TemplatePage from "@/src/site/pages/template"
import { SiteLayout } from "@/src/site/shell/layout"
import { createBridge, settle } from "./bridge"

// UISet holds its own pages to its agent-readiness check: on every template, an agent finds
// every control by name, site header included. Each page draws in the site's layout at its
// address, and the check reads the bridge as an agent does. Moved from
// tests/e2e/agent-ready-pages.spec.ts.

const bridge = createBridge()

// The unit tests turn every UI SDK warning into an error, which would stop a page drawing; here
// they're collected, and any one fails the test. (A template page once warned that Mod+B was
// registered twice, by the site's AppShell and the template's: 2026-11-21.)
let warnings: string[] = []
const checkVisibility = Element.prototype.checkVisibility
beforeAll(() => {
  // What's in a closed tab (a `hidden` panel kept mounted) isn't visible, as in a browser.
  Element.prototype.checkVisibility = function (this: Element) {
    return !this.closest("[hidden]")
  }
  // jsdom has no matchMedia; the site and some demos ask about the screen. A wide one, here.
  window.matchMedia ??= ((media: string) => ({ matches: false, media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia
  globalThis.__UI_SDK_STRICT__ = false
  const warn = console.warn
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const text = String(args[0])
    if (text.startsWith("[ui-sdk]")) warnings.push(text)
    else warn(...args)
  })
})
afterEach(async () => {
  cleanup()
  await settle()
  const seen = warnings
  warnings = []
  expect(seen).toEqual([])
})
afterAll(() => {
  Element.prototype.checkVisibility = checkVisibility
  globalThis.__UI_SDK_STRICT__ = true
  vi.restoreAllMocks()
  window.history.replaceState(null, "", "/")
})

/** Draws `Page` in the site's layout at `path`, once `ready` finds what it waits for. */
async function open(path: string, Page: ComponentType, ready: (root: HTMLElement) => boolean) {
  window.history.replaceState(null, "", path)
  const { container } = render(
    <SiteLayout>
      <Suspense>
        <Page />
      </Suspense>
    </SiteLayout>,
  )
  await waitFor(() => expect(ready(container)).toBe(true), { timeout: 20_000 })
  // Components join the bridge as they mount.
  await settle(500)
  return container
}

/** The page's report, or null when it scores 100. */
async function problems(name: string) {
  const report = await checkAgentReadiness(bridge.agent)
  expect(report.controls, `${name}: the check found no controls`).toBeGreaterThan(0)
  return report.score === 100 ? null : formatAgentReadiness(report, name)
}

// The calendar stays in the browser test: on a wide screen its stylesheet hides the toolbar's
// New event beside the sidebar's, and jsdom draws no styles.
const templates = ["auth", "dashboard", "settings", "admin", "inbox", "chat-app", "project-board", "pricing", "checkout", "invoice", "ide-app"]

for (const template of templates) {
  test(`the ${template} template scores 100`, { timeout: 60_000 }, async () => {
    await open(`/templates/${template}`, TemplatePage, (root) => {
      const frame = root.querySelector("#main .template-frame")
      return !!frame && frame.children.length > 0 && !frame.querySelector(":scope > .example-note")
    })
    expect(await problems(template)).toBeNull()
  })
}

// The home page puts the hero form, a kit demo and the install steps side by side, so a short
// name like "Sound" or "Output" meets the same word in another control or a step's text.
test("the home page scores 100 with each kit demo open", { timeout: 120_000 }, async () => {
  const root = await open("/", HomePage, (el) => !!el.querySelector("[role=tablist][aria-label='Kit demos'] [role=tab]"))
  const names = [...root.querySelectorAll("[role=tablist][aria-label='Kit demos'] [role=tab]")].map((tab) => tab.textContent!)
  expect(names.length).toBeGreaterThan(1)
  const found: string[] = []
  for (const name of names) {
    const chosen = await bridge.run("Kit demos", "setValue", name)
    expect(chosen.ok, chosen.error?.message).toBe(true)
    // The demos load when their tab opens, and their components join the bridge as they mount.
    await waitFor(() => expect(root.querySelector(".home-kit-panel .grid-stage > :not(.home-kit-loading)")).toBeTruthy(), { timeout: 20_000 })
    await settle(500)
    const report = await problems(`home with the ${name} demo`)
    if (report) found.push(report)
  }
  expect(found).toEqual([])
})

// The library's tabs: each card is a picture of its piece (hidden from agents) with a link and
// a copy button named for it, so every name on the page is its own.
for (const path of ["/components", "/kits", "/templates", "/themes"]) {
  test(`the library's ${path.slice(1)} tab scores 100`, { timeout: 60_000 }, async () => {
    await open(path, LibraryPage, (root) => !!root.querySelector(".lib-card"))
    expect(await problems(path)).toBeNull()
  })
}
