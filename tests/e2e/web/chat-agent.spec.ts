import { expect, test, type Page } from "@playwright/test"
import { clippedRings } from "../rings"

// The agent's turn and the queue as web elements: the Chat page's pretend model and the Chat
// app template's sample assistant, each asked to fix something.

const deploy = (page: Page) => page.locator("uiset-chat .chat-tool").filter({ hasText: "Deploy a preview" })
const box = (page: Page) => page.getByRole("textbox", { name: "Message" })

for (const [name, path] of [
  ["the Chat page", "/chat.html"],
  ["the Chat app template", "/templates/chat-app.html"],
] as const) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.goto(path)
      await page.getByRole("button", { name: "Fix the date format and deploy a preview" }).click()
      await expect(deploy(page)).toHaveAttribute("data-status", "approval", { timeout: 15_000 })
    })

    test("a checkpoint and a subagent's run show, and the deploy runs once allowed", async ({ page }) => {
      // Waiting for a person isn't writing: no caret under the approval.
      await expect(page.locator("uiset-chat .chat-message[data-streaming]")).toHaveCount(0)
      await expect(page.getByRole("button", { name: /^Restore Before the fix/ })).toBeVisible()
      await expect(page.getByRole("button", { name: /^Researcher\s*, Find where the date format comes from\s*, Done in 4s$/ })).toBeVisible()
      await deploy(page).getByRole("button", { name: "Allow" }).click()
      await expect(deploy(page)).toHaveAttribute("data-status", "done", { timeout: 10_000 })
      await expect(page.getByRole("log")).toContainText("The preview is up")
    })

    test("denied, it doesn't deploy", async ({ page }) => {
      await deploy(page).getByRole("button", { name: "Deny" }).click()
      await expect(deploy(page)).toHaveAttribute("data-status", "denied")
      await expect(page.getByRole("log")).toContainText("Okay, no preview.")
    })

    test("written while it waits, a message is queued and goes when the answer is done", async ({ page }) => {
      await box(page).fill("Then open a pull request")
      await box(page).press("Enter")
      const queue = page.getByRole("region", { name: "Queued messages" })
      await expect(queue).toContainText("1 queued")
      await deploy(page).getByRole("button", { name: "Allow" }).click()
      await expect(queue).toBeHidden({ timeout: 10_000 })
      await expect(page.locator("uiset-chat .chat-message[data-from='user']").last()).toContainText("Then open a pull request")
    })

    test("Restore cuts the answer back to its checkpoint", async ({ page }) => {
      await page.getByRole("button", { name: /^Restore Before the fix/ }).click()
      await expect(deploy(page)).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Send" })).toBeVisible()
    })
  })
}

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
