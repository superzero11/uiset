import { cleanup, render, waitFor } from "@testing-library/react"
import { afterAll, beforeAll, expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import { ComponentsGallery } from "@/src/site/components-page"
import { groups } from "@/src/site/examples/meta"
import { createBridge, settle } from "./bridge"

// The gallery's examples (src/site/components-page.tsx), read through the agent bridge. The
// gallery draws a group at a time (?group=), as the axe scans do, so jsdom never holds every
// example and each group's snapshot holds all of its components. Moved from
// tests/e2e/components.spec.ts.

const bridge = createBridge()

// jsdom has no matchMedia; some examples ask whether the screen is narrow. A wide one, here.
beforeAll(() => {
  window.matchMedia ??= ((media: string) => ({ matches: false, media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia
})
afterAll(() => window.history.replaceState(null, "", "/"))

test("no component on the page is nameless to agents", { timeout: 120_000 }, async () => {
  const unnamed: string[] = []
  for (const [group] of groups) {
    window.history.replaceState(null, "", `/gallery?group=${encodeURIComponent(group)}`)
    const { container } = render(
      <UISet className="components-surface">
        <ComponentsGallery />
      </UISet>,
    )
    await waitFor(() => expect(container.querySelector(".gallery[data-ready]")).toBeTruthy(), { timeout: 20_000 })
    await settle()
    const listed = bridge.agent.snapshot()
    // A group past the snapshot's 100 components would need query for the rest.
    expect(listed.some((e) => e.component === "more"), `${group} has more than 100 components`).toBe(false)
    for (const entry of listed) if (!entry.offPage && !entry.label) unnamed.push(`${group}: ${entry.component} ${entry.ref}`)
    cleanup()
    await settle()
  }
  expect(unnamed).toEqual([])
})
