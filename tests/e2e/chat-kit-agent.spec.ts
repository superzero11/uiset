import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"
import { clippedRings } from "./rings"

// Agent parts in the chat kit's own demo (src/site/chat-demo.tsx), as they look: axe and focus
// rings in every skin. Their behavior (Allow, Deny, Restore, the queue) is tested through the
// agent bridge in tests/unit/chat-kit.bridge.test.tsx.

const chat = (page: Page) => page.locator(".item-frame")
const pr = (page: Page) => chat(page).locator(".chat-tool").filter({ hasText: "Open a pull request" })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/docs/kits/chat")
  await expect(pr(page)).toHaveAttribute("data-status", "approval", { timeout: 20_000 })
})

for (const [skin, theme] of [
  ["base", "light"],
  ["base", "dark"],
  ["blueprint", "dark"],
  ["studio", "dark"],
  ["phosphor", "dark"],
  ["ink", "light"],
] as const) {
  test(`the demo with the agent's turn passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
    await page.evaluate((s) => localStorage.setItem("uiset-site-skin", s), skin)
    await page.goto(`/docs/kits/chat?theme=${theme}`)
    await expect(pr(page)).toHaveAttribute("data-status", "approval", { timeout: 20_000 })
    const results = await new AxeBuilder({ page }).include(".item-frame").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
  })
}

// A scroll area clips: a full-width row's focus ring needs room at the thread's sides. Ink's
// 3px ring was cut by 1px (2026-11-21, after shadcn-ui/ui#12788 reported the same in theirs).
test("no focus ring in the thread is clipped, in any skin", async ({ page }) => {
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    await page.evaluate((s) => localStorage.setItem("uiset-site-skin", s), skin)
    await page.goto("/docs/kits/chat")
    await expect(pr(page)).toHaveAttribute("data-status", "approval", { timeout: 20_000 })
    const { controls, cut } = await clippedRings(page, ".item-frame .chat-thread")
    expect(controls, skin).toBeGreaterThan(10)
    expect(cut, skin).toEqual([])
  }
})
