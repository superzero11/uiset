import { render, screen, waitFor, within } from "@testing-library/react"
import { Suspense } from "react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { preloadRoute, route } from "@/src/site/routes"
import { SiteLayout } from "@/src/site/shell/layout"
import { createBridge } from "./bridge"

// Site pages in the site's frame, as src/main.tsx draws them, at the address the browser test
// opened: the skin picker and the footer, read and driven through the agent bridge. Moved from
// tests/e2e/site.spec.ts and tests/e2e/whats-new.spec.ts.

vi.setConfig({ testTimeout: 30_000 })

const bridge = createBridge()

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  localStorage.clear()
  window.history.replaceState(null, "", "/")
})

/** The page's contentinfo landmark. A footer inside an article or main isn't one, as browsers
 *  map it; jsdom's role queries don't know that, so the docs page's own footer is set aside. */
const contentinfo = () => {
  const landmarks = screen.queryAllByRole("contentinfo").filter((el) => !el.parentElement?.closest("article, aside, main, nav, section"))
  expect(landmarks).toHaveLength(1)
  return landmarks[0]!
}

async function openPage(path: string) {
  window.history.replaceState(null, "", path)
  await preloadRoute(path)
  const Page = route(path)
  render(
    <SiteLayout>
      <Suspense fallback={<p className="page-loading">Loading…</p>}>
        <Page />
      </Suspense>
    </SiteLayout>,
  )
  await waitFor(() => contentinfo(), { timeout: 10_000 })
}

// The Studio kit follows the page's skin like every other kit (it was once pinned to its own
// skin while the page showed Base), and its stage paints no Studio-only surface in other skins
// (it once left Blueprint, Phosphor and Ink text at about 1.1:1 on the page behind it).
test("the Studio rack and the whole site follow the skin picker", async () => {
  await openPage("/docs/kits/studio")
  await waitFor(() => expect(document.querySelector(".studio-stage")).toBeTruthy(), { timeout: 10_000 })
  const stage = () => document.querySelector(".studio-stage")!.getAttribute("data-skin")
  expect(stage()).toBe("base")
  await bridge.run("Site skin", "setValue", "ink")
  expect(stage()).toBe("ink")
  expect(document.querySelector(".site")?.getAttribute("data-skin")).toBe("ink")
  await bridge.run("Site skin", "setValue", "studio")
  expect(stage()).toBe("studio")
})

for (const path of ["/", "/docs/installation"]) {
  test(`the footer links to the URL checker on ${path}`, async () => {
    await openPage(path)
    const footer = contentinfo()
    expect(within(footer).getByRole("link", { name: "Agent readiness checker" }).getAttribute("href")).toBe("/check")
    // The owner's X account, under the tagline.
    expect(within(footer).getByRole("link", { name: "@IAMSuperZero11 on X" }).getAttribute("href")).toBe("https://x.com/IAMSuperZero11")
  })
}
