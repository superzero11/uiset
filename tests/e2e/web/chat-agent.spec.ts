import { expect, test, type Page } from "@playwright/test"
import { clippedRings } from "../rings"

// The Chat page's thread as web elements, with an agent's turn waiting for a person: no focus
// ring is cut at its edges. The agent's turn and the queue are tested through the bridge in
// tests/unit/web-chat-agent.bridge.test.ts.

const deploy = (page: Page) => page.locator("uiset-chat .chat-tool").filter({ hasText: "Deploy a preview" })

test("no focus ring in the Chat page's thread is clipped, in any skin", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/chat.html")
  await page.getByRole("button", { name: "Fix the date format and deploy a preview" }).click()
  await expect(deploy(page)).toHaveAttribute("data-status", "approval", { timeout: 15_000 })
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    await page.locator("uiset-root").evaluate((el, s) => el.setAttribute("skin", s), skin)
    const { controls, cut } = await clippedRings(page, "uiset-chat")
    expect(controls, skin).toBeGreaterThan(5)
    expect(cut, skin).toEqual([])
  }
})
