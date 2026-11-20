import { expect, test, type Page } from "@playwright/test"

// Agent parts (design/agent-parts-plan.md) drawn from AI SDK message parts by
// ChatMessageParts: a tool waiting for approval, a subagent's run, a checkpoint, and the
// messages queued meanwhile.

async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/docs/components/chat-message-parts")
  const example = page.locator(".example").first()
  await expect(example.getByRole("button", { name: /Deploy preview/ })).toBeVisible()
  return example
}

test("a tool waiting for approval runs once allowed, and an agent must ask a person first", async ({ page }) => {
  const example = await open(page)
  const tool = example.locator(".chat-tool").filter({ hasText: "Deploy preview" })
  await expect(tool).toHaveAttribute("data-status", "approval")
  const allow = tool.getByRole("button", { name: "Allow" })
  await expect(allow).toHaveAttribute("data-agent-confirm", "Runs Deploy preview")
  await allow.click()
  await expect(tool).toHaveAttribute("data-status", "done")
  await expect(tool.getByRole("button", { name: /Deploy preview/ })).toContainText("Done")
  await expect(example.getByRole("status")).toHaveText("Allowed: deploying the preview.")
})

test("a denied tool says so and doesn't run", async ({ page }) => {
  const example = await open(page)
  const tool = example.locator(".chat-tool").filter({ hasText: "Deploy preview" })
  await tool.getByRole("button", { name: "Deny" }).click()
  await expect(tool).toHaveAttribute("data-status", "denied")
  await expect(tool.getByRole("button", { name: /Deploy preview/ })).toContainText("Not allowed")
})

test("a subagent's run shows its task and time, and opens to its own steps", async ({ page }) => {
  const example = await open(page)
  const run = example.getByRole("button", { name: /Researcher/ })
  await expect(run).toHaveAccessibleName(/^Researcher\s*, Find where the date format comes from\s*, Done in 12s$/)
  await expect(run).toHaveAttribute("aria-expanded", "false")
  await run.click()
  const panel = example.locator(".chat-subagent-panel")
  await expect(panel.getByRole("button", { name: /Search code/ })).toBeVisible()
  await expect(panel).toContainText("which ignores the locale")
})

test("a checkpoint restores, after an agent asks a person", async ({ page }) => {
  const example = await open(page)
  await example.locator(".chat-tool").filter({ hasText: "Deploy preview" }).getByRole("button", { name: "Deny" }).click()
  const restore = example.getByRole("button", { name: /^Restore Checkpoint/ })
  await expect(restore).toHaveAttribute("data-agent-confirm", "Puts the conversation back to this checkpoint")
  await restore.click()
  await expect(example.getByRole("status")).toHaveText("Restored to the checkpoint.")
  await expect(example.locator(".chat-tool").filter({ hasText: "Deploy preview" })).toHaveAttribute("data-status", "approval")
})

test("queued messages can be removed, and the first sent now", async ({ page }) => {
  const example = await open(page)
  const queue = example.getByRole("region", { name: "Queued messages" })
  await expect(queue).toContainText("2 queued")
  await queue.getByRole("button", { name: "Remove from queue: Then open a pull request" }).click()
  await expect(queue).toContainText("1 queued")
  await queue.getByRole("button", { name: "Send now: Also check the French locale" }).click()
  await expect(queue).toHaveCount(0)
  await expect(example.getByRole("status")).toHaveText("Sent now.")
})
