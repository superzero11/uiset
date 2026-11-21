import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { AppShell } from "@/registry/uiset/ui/app-shell"
import { UISet } from "@/registry/uiset/ui/uiset"
import { settle } from "./bridge"

// Mod+B collapses the sidebar. An AppShell inside another (a template shown in an app's shell)
// leaves the shortcut to the outer one: two registrations made UI SDK warn, and the unit tests
// make every UI SDK warning throw (2026-11-21).

afterEach(cleanup)
// jsdom has no matchMedia: a wide screen, where the sidebar collapses rather than moving to a drawer.
beforeAll(() => {
  window.matchMedia ??= ((media: string) => ({ matches: false, media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia
})

const press = () =>
  act(() => {
    for (const ctrlKey of [true, false])
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "b", code: "KeyB", ctrlKey, metaKey: !ctrlKey, bubbles: true }))
  })
const collapse = () => screen.queryAllByRole("button", { name: /^(Collapse|Expand) sidebar$/ })[0]?.getAttribute("aria-label")

test("Mod+B collapses a lone shell's sidebar", async () => {
  render(
    <UISet>
      <AppShell sidebar={<p>Nav</p>}>Page</AppShell>
    </UISet>,
  )
  await settle()
  const before = collapse()
  await press()
  expect(collapse()).not.toBe(before)
})

test("a shell inside a shell registers Mod+B once, and it still works", async () => {
  render(
    <UISet>
      <AppShell sidebar={<p>Site</p>}>
        <AppShell sidebar={<p>Template</p>} contentElement="div">
          Page
        </AppShell>
      </AppShell>
    </UISet>,
  )
  await settle()
  const before = collapse()
  await press()
  expect(collapse()).not.toBe(before)
})
