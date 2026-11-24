import AxeBuilder from "../axe"
import { expect, test, type Locator, type Page } from "@playwright/test"
import { clippedRings } from "../rings"

// The chat kit's demo in Solid (solid/chat.html), as the web Chat page and React's kit page
// are checked: axe in every look with code colors showing, the thread following at its end,
// Stop, the chat list, an answer streaming past an open tool call and Wrap, the composer's
// menu, focus rings, and every control pressed. Behavior is in tests/unit/solid-chat*.test.tsx.

const composer = (page: Page) => page.getByRole("textbox", { name: "Message" })
const threads = (page: Page) => page.getByRole("navigation", { name: "Chats" })
const lastAnswer = (page: Page) => page.locator(".chat-message[data-from=assistant]").last()
const pr = (page: Page) => page.locator(".chat-tool").filter({ hasText: "Open a pull request" })

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

async function open(page: Page, query = "") {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`/chat.html${query}`)
  await expect(pr(page)).toHaveAttribute("data-status", "approval")
}

async function ask(page: Page, text: string) {
  await composer(page).fill(text)
  await composer(page).press("Enter")
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 20_000 })
}

for (const [skin, theme] of [
  ["base", "light"],
  ["base", "dark"],
  ["blueprint", "dark"],
  ["studio", "dark"],
  ["phosphor", "dark"],
  ["ink", "light"],
] as const) {
  test(`the Solid chat page passes axe in ${skin}, ${theme}, code colors included`, { tag: "@engine" }, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
    await open(page, `?skin=${skin}&theme=${theme}`)
    await page.locator(".chat-thread-scroller").evaluate((el) => (el.scrollTop = 0))
    await expect(page.locator(".chat-code-line").first()).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
  })
}

// The React chat lost following after a wheel at its end over a one-pixel rounding (2026-11-20,
// like shadcn-ui/ui#12766): forced here the same way, a thread whose content ends .6 past a pixel.
test("the thread keeps following after a wheel or End at its end", { tag: "@engine" }, async ({ page }) => {
  await open(page)
  await page.addStyleTag({ content: ".chat-thread-frame { max-height: 220px }" })
  const log = page.locator(".chat-thread-log").first()
  const height = await log.evaluate((el) => el.getBoundingClientRect().height)
  await page.addStyleTag({ content: `.chat-thread-log { padding-block-end: ${(1.6 - (height % 1)) % 1}px }` })
  const view = page.locator(".chat-thread-scroller")
  await view.scrollIntoViewIfNeeded()
  await view.evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
  await expect(view).toHaveAttribute("data-sticking", "")
  const area = (await view.boundingBox())!
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
  await page.mouse.wheel(0, 300)
  await view.focus()
  await page.keyboard.press("End")
  await page.waitForTimeout(600)
  await expect(view).toHaveAttribute("data-sticking", "")
  await ask(page, "Tell me more")
  expect(await view.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThanOrEqual(2)
})

test("away from the end, Jump to latest brings the thread back", async ({ page }) => {
  await open(page)
  const view = page.locator(".chat-thread-scroller")
  await view.evaluate((el) => el.scrollTo({ top: 0 }))
  const jump = page.getByRole("button", { name: "Jump to latest" })
  await expect(jump).toBeVisible()
  await jump.click()
  await expect.poll(() => view.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThanOrEqual(2)
  await expect(jump).toHaveCount(0)
})

test("while it answers, the composer shows Stop, and Stop ends the answer", { tag: "@engine" }, async ({ page }) => {
  await open(page)
  await composer(page).fill("Go")
  await composer(page).press("Enter")
  const stop = page.getByRole("button", { name: "Stop" })
  await expect(stop).toBeVisible()
  await stop.click()
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible()
  // Up brings back what was sent.
  await composer(page).press("ArrowUp")
  await expect(composer(page)).toHaveValue("Go")
})

test("the chat list selects, renames with focus back on the chat, and deletes after asking", { tag: "@engine" }, async ({ page }) => {
  await open(page)
  await threads(page).getByRole("button", { name: "Open Pricing page copy", exact: true }).click()
  await expect(threads(page).getByRole("button", { name: "Open Pricing page copy", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.getByText("What are we working on?")).toBeVisible()
  await threads(page).getByRole("button", { name: "More for Pricing page copy" }).click()
  await page.getByRole("menuitem", { name: "Rename" }).click()
  const rename = threads(page).getByRole("textbox", { name: "Rename Pricing page copy" })
  await expect(rename).toBeFocused()
  await rename.fill("Pricing copy v2")
  await rename.press("Enter")
  await expect(threads(page).getByRole("button", { name: "Open Pricing copy v2", exact: true })).toBeFocused()
  await threads(page).getByRole("button", { name: "More for Pricing copy v2" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete “Pricing copy v2”?" })
  await dialog.getByRole("button", { name: "Delete chat" }).click()
  await expect(threads(page).getByRole("button", { name: "Open Pricing copy v2", exact: true })).toHaveCount(0)
})

test("while an answer streams, an open tool call, Wrap and focus stay as they were", { tag: "@engine" }, async ({ page }) => {
  await open(page)
  await composer(page).fill("Show me the code")
  await composer(page).press("Enter")
  const answer = lastAnswer(page)
  // The code arrives mid-answer; more words follow it.
  await expect(answer.getByRole("button", { name: "Wrap lines" })).toBeVisible({ timeout: 10_000 })
  await answer.getByRole("button", { name: /^Searched the docs/ }).click()
  await answer.getByRole("button", { name: "Wrap lines" }).click()
  await answer.getByRole("button", { name: "Wrap lines" }).focus()
  await expect(answer).toContainText("Attach a file", { timeout: 10_000 })
  await expect(answer.getByRole("region", { name: "Searched the docs output" })).toBeVisible()
  await expect(answer.locator(".chat-code")).toHaveAttribute("data-wrap", "")
  await expect(answer.getByRole("button", { name: "Wrap lines" })).toBeFocused()
})

test("Enter sends when the composer's menu finds nothing, and picks from it when it finds something", { tag: "@engine" }, async ({ page }) => {
  await open(page)
  await composer(page).fill("/xyz")
  // Nothing matches, so no menu opens (as in React's), and Enter is the composer's.
  await expect(page.locator(".chat-menu")).toHaveCount(0)
  await composer(page).press("Enter")
  await expect(page.locator(".chat-message[data-from=user]").last()).toContainText("/xyz")
  await expect(composer(page)).toHaveValue("")
  await expect(composer(page)).toBeFocused()
  await page.getByRole("button", { name: "Stop" }).click()
  // Typed, a command's first letters find it, and Enter takes it into the box without sending.
  await composer(page).pressSequentially("/ex")
  await expect(page.getByRole("option", { name: /explain/ })).toBeVisible()
  await composer(page).press("Enter")
  await expect(composer(page)).toHaveValue(/^\/explain/)
  await expect(page.locator(".chat-message[data-from=user]").last()).toContainText("/xyz")
})

// A scroll area clips: a full-width row's focus ring needs room at the thread's sides (Ink's
// 3px ring was cut by 1px, 2026-11-21).
test("no focus ring in the thread is clipped, in any skin", async ({ page }) => {
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    await open(page, `?skin=${skin}`)
    const { controls, cut } = await clippedRings(page, ".chat-thread")
    expect(controls, skin).toBeGreaterThan(10)
    expect(cut, skin).toEqual([])
  }
})

async function pressable(control: Locator) {
  return control
    .evaluate((el) => {
      const box = el.getBoundingClientRect()
      const hidden = el.closest("[inert], [aria-hidden='true'], [hidden]")
      const disabled = el.matches(":disabled, [aria-disabled='true'], [data-disabled]")
      return !hidden && !disabled && box.width > 0 && box.height > 0
    })
    .catch(() => false)
}

async function sweep(page: Page, area: Locator, problems: string[], skip: RegExp) {
  let pressed = 0
  // Retry starts a new answer, which brings a Retry of its own: one press of it is enough.
  let retried = false
  // Switchable controls each way, then each button, closing what it opens.
  for (const role of ["tab", "radio", "switch", "checkbox", "button"] as const) {
    const controls = area.getByRole(role)
    for (let i = 0; i < (await controls.count()); i++) {
      const control = controls.nth(i)
      if (!(await pressable(control))) continue
      const name = ((await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "").trim()
      if (skip.test(name) || (retried && name.startsWith("Retry message"))) continue
      if (name.startsWith("Retry message")) retried = true
      await control.scrollIntoViewIfNeeded({ timeout: 2000 })
      await control.click({ timeout: 2000 })
      if (role === "switch" || role === "checkbox") await control.click({ timeout: 2000 })
      if (role === "button") await page.keyboard.press("Escape")
      pressed++
      expect(problems, `after ${role} "${name}"`).toEqual([])
    }
  }
  return pressed
}

test("every control on the Solid chat page can be pressed with no error or warning", async ({ page }) => {
  test.setTimeout(180_000)
  const problems = watch(page)
  await open(page)
  // The conversation and composer first; Deny, Allow and Restore change the agent's turn, so
  // they go after, in order.
  let pressed = await sweep(page, page.locator(".chat-main"), problems, /^Restore |^Allow$|^Deny$/)
  // The sweep closed the pull request's call along the way; open, it asks again.
  const call = pr(page).getByRole("button", { name: /^Open a pull request/ })
  if ((await call.getAttribute("aria-expanded")) !== "true") await call.click()
  for (const name of ["Deny", /^Restore Before the rollout/, "Allow"] as const) {
    await page.locator(".chat-main").getByRole("button", { name }).first().click()
    pressed++
    expect(problems, `after ${String(name)}`).toEqual([])
  }
  await expect(pr(page)).toHaveAttribute("data-status", "done", { timeout: 5000 })
  // Then the chat list, which moves to other chats.
  pressed += await sweep(page, threads(page), problems, /^$/)
  // 35 on 2026-11-24: a sweep that finds far fewer has stopped finding the controls.
  expect(pressed).toBeGreaterThanOrEqual(30)
})

test("the chat page, rendered on the server, hydrates with no errors or warnings, and works", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/chat")
  expect(await response!.text()).toContain('role="log"')
  await expect(pr(page)).toHaveAttribute("data-status", "approval")
  await page.getByRole("button", { name: "Deny" }).click()
  await expect(pr(page)).toHaveAttribute("data-status", "denied")
  await composer(page).fill("Hello")
  await composer(page).press("Enter")
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible()
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})
