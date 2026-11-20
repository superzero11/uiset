import { expect, test, type Page } from "@playwright/test"

// The chat-app template as an agent (registry/uiset/ui/templates/chat-app.tsx): asked to fix
// something, its sample assistant sets a checkpoint, hands research to a subagent, edits, and
// waits for a person before deploying. What's written meanwhile is queued.

const frame = (page: Page) => page.locator(".template-frame")
const box = (page: Page) => frame(page).getByRole("textbox", { name: "Message" })
const deploy = (page: Page) => frame(page).locator(".chat-tool").filter({ hasText: "Deploy a preview" })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/templates/chat-app")
  await frame(page).getByRole("button", { name: "Fix the date format and deploy a preview" }).click()
  await expect(deploy(page)).toHaveAttribute("data-status", "approval", { timeout: 15_000 })
})

test("the agent's run shows its checkpoint and subagent, and deploys once allowed", async ({ page }) => {
  // Waiting for a person isn't writing: no caret under the approval.
  await expect(frame(page).locator(".chat-message[data-streaming]")).toHaveCount(0)
  await expect(frame(page).getByRole("button", { name: /^Restore Before the fix/ })).toBeVisible()
  await expect(frame(page).getByRole("button", { name: /^Researcher\s*, Find where the date format comes from\s*, Done in 4s$/ })).toBeVisible()
  await expect(frame(page).locator(".chat-tool").filter({ hasText: "Edited src/date.ts" })).toHaveAttribute("data-status", "done")
  await deploy(page).getByRole("button", { name: "Allow" }).click()
  await expect(deploy(page)).toHaveAttribute("data-status", "done", { timeout: 10_000 })
  await expect(frame(page).getByRole("region", { name: "Conversation" })).toContainText("The preview is up")
})

test("denied, the deploy doesn't run and the answer says so", async ({ page }) => {
  await deploy(page).getByRole("button", { name: "Deny" }).click()
  await expect(deploy(page)).toHaveAttribute("data-status", "denied")
  await expect(frame(page).getByRole("region", { name: "Conversation" })).toContainText("Okay, no preview.")
  await expect(frame(page).getByRole("button", { name: "Send" })).toBeVisible()
})

test("a message written while it waits is queued, and goes once the answer is done", async ({ page }) => {
  await box(page).fill("Then open a pull request")
  await box(page).press("Enter")
  const queue = frame(page).getByRole("region", { name: "Queued messages" })
  await expect(queue).toContainText("1 queued")
  await deploy(page).getByRole("button", { name: "Allow" }).click()
  await expect(queue).toHaveCount(0, { timeout: 10_000 })
  await expect(frame(page).locator(".chat-message[data-from='user']").last()).toContainText("Then open a pull request")
})

test("Restore cuts the answer back to its checkpoint and stops it", async ({ page }) => {
  await frame(page).getByRole("button", { name: /^Restore Before the fix/ }).click()
  await expect(deploy(page)).toHaveCount(0)
  await expect(frame(page).getByRole("button", { name: /^Restore Before the fix/ })).toBeVisible()
  await expect(frame(page).getByRole("button", { name: "Send" })).toBeVisible()
})
