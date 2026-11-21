import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"
import { clippedRings } from "./rings"

// Agent parts in the chat kit's own demo (src/site/chat-demo.tsx): an agent's turn drawn from
// AI SDK parts, a tool waiting for approval, a checkpoint to go back to, and messages queued
// while an answer runs.

const chat = (page: Page) => page.locator(".item-frame")
const box = (page: Page) => chat(page).getByRole("textbox", { name: "Message" })
const pr = (page: Page) => chat(page).locator(".chat-tool").filter({ hasText: "Open a pull request" })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/docs/kits/chat")
  await expect(pr(page)).toHaveAttribute("data-status", "approval", { timeout: 20_000 })
})

test("the agent's pull request runs once allowed, and an agent must ask a person first", async ({ page }) => {
  await expect(chat(page).getByRole("button", { name: /^Tester\s*, Type fast on a slow network\s*, Done in 9s$/ })).toBeVisible()
  const allow = pr(page).getByRole("button", { name: "Allow" })
  await expect(allow).toHaveAttribute("data-agent-confirm", "Runs Open a pull request")
  await allow.click()
  await expect(pr(page)).toHaveAttribute("data-status", "done")
  await expect(chat(page)).toContainText("Opened pull request #482")
})

test("denied, it says so; Restore puts the turn back to the checkpoint, waiting again", async ({ page }) => {
  await pr(page).getByRole("button", { name: "Deny" }).click()
  await expect(pr(page)).toHaveAttribute("data-status", "denied")
  await expect(chat(page)).toContainText("Okay, I won't open it.")
  const restore = chat(page).getByRole("button", { name: /^Restore Before the rollout/ })
  await expect(restore).toHaveAttribute("data-agent-confirm", "Puts the conversation back to this checkpoint")
  await restore.click()
  await expect(pr(page)).toHaveAttribute("data-status", "approval")
  await expect(chat(page)).not.toContainText("Okay, I won't open it.")
})

test("what's written while an answer runs is queued, and sent when it's done", async ({ page }) => {
  await box(page).fill("Add a test for the abort")
  await box(page).press("Enter")
  const composer = chat(page).locator(".chat-composer")
  await expect(composer.getByRole("button", { name: "Stop" })).toBeVisible()
  await box(page).fill("Then update the changelog")
  await composer.getByRole("button", { name: "Queue" }).click()
  const queue = chat(page).getByRole("region", { name: "Queued messages" })
  await expect(queue).toContainText("1 queued")
  await expect(queue).toContainText("Then update the changelog")
  // The first answer finishes, then the queued message goes on its own.
  await expect(queue).toHaveCount(0, { timeout: 15_000 })
  await expect(chat(page).locator(".chat-message[data-from='user']").last()).toContainText("Then update the changelog")
})

test("Stop holds the queue; Send now sends the first", async ({ page }) => {
  await box(page).fill("Add a test for the abort")
  await box(page).press("Enter")
  await box(page).fill("Then update the changelog")
  await box(page).press("Enter")
  const queue = chat(page).getByRole("region", { name: "Queued messages" })
  await expect(queue).toContainText("1 queued")
  await chat(page).locator(".chat-composer").getByRole("button", { name: "Stop" }).click()
  await expect(chat(page).locator(".chat-composer").getByRole("button", { name: "Send" })).toBeVisible()
  await page.waitForTimeout(300)
  await expect(queue).toContainText("1 queued")
  await queue.getByRole("button", { name: "Send now: Then update the changelog" }).click()
  await expect(queue).toHaveCount(0)
  await expect(chat(page).locator(".chat-message[data-from='user']").last()).toContainText("Then update the changelog")
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
