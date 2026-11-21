import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// Chat as web elements, on a page with no React: messages with parts in, events out. The
// page's pretend model thinks, calls a tool, streams markdown with code and a table, and
// cites a source.
const log = (page: Page) => page.getByRole("log")
const composer = (page: Page) => page.getByRole("textbox", { name: "Message" })

async function ask(page: Page, text: string) {
  await composer(page).fill(text)
  await composer(page).press("Enter")
  await expect(page.locator("uiset-chat .chat-message[data-from=assistant]:not([data-streaming])").last()).toContainText("Publish the changelog")
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/chat.html")
  await expect(page.getByText("How can I help?")).toBeVisible()
})

// The React chat lost following after a wheel at its end over a one-pixel rounding (2026-11-20,
// like shadcn-ui/ui#12766; site.spec.ts reproduces it). This build doesn't round that way here,
// so this guards that a wheel and End at the end keep following, with the same re-arm wired in.
test("the thread keeps following after a wheel or End at its end", { tag: "@engine" }, async ({ page }) => {
  await ask(page, "What's left?")
  await page.addStyleTag({ content: ".chat-thread-frame { max-height: 220px }" })
  const log = page.locator(".chat-thread-log").first()
  const height = await log.evaluate((el) => el.getBoundingClientRect().height)
  await page.addStyleTag({ content: `.chat-thread-log { padding-block-end: ${(1.6 - (height % 1)) % 1}px }` })
  const view = page.locator(".chat-thread-scroller")
  await view.evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
  await expect(view).toHaveAttribute("data-sticking", "")
  const area = (await view.boundingBox())!
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
  await page.mouse.wheel(0, 300)
  await view.focus()
  await page.keyboard.press("End")
  await page.waitForTimeout(600)
  await expect(view).toHaveAttribute("data-sticking", "")
  await ask(page, "And then?")
  expect(await view.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThanOrEqual(2)
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Chat page passes axe in ${skin}, ${theme}, with an answer showing`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await ask(page, "What's left?")
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("while it answers, the composer shows Stop, and Stop ends the answer", { tag: "@engine" }, async ({ page }) => {
  await page.locator("uiset-chat-composer").evaluate((el) => el.addEventListener("stop", () => ((window as unknown as { stops: number }).stops = ((window as unknown as { stops?: number }).stops ?? 0) + 1)))
  await composer(page).fill("Go")
  await composer(page).press("Enter")
  const stop = page.getByRole("button", { name: "Stop" })
  await expect(stop).toBeVisible()
  await stop.click()
  expect(await page.evaluate(() => (window as unknown as { stops?: number }).stops)).toBe(1)
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible()
  // Up brings back what was sent.
  await composer(page).press("ArrowUp")
  await expect(composer(page)).toHaveValue("Go")
})

test("the thread list selects, renames and deletes after asking", { tag: "@engine" }, async ({ page }) => {
  const threads = page.getByRole("navigation", { name: "Chats" })
  await threads.getByRole("button", { name: "Open Pricing page copy", exact: true }).click()
  await expect(threads.getByRole("button", { name: "Open Pricing page copy", exact: true })).toHaveAttribute("aria-current", "page")
  await threads.getByRole("button", { name: "More for Pricing page copy" }).click()
  await page.getByRole("menuitem", { name: "Rename" }).click()
  const rename = threads.getByRole("textbox", { name: "Rename Pricing page copy" })
  await rename.fill("Pricing copy v2")
  await rename.press("Enter")
  await expect(threads.getByRole("button", { name: "Open Pricing copy v2", exact: true })).toBeFocused()
  await threads.getByRole("button", { name: "More for Pricing copy v2" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete “Pricing copy v2”?" })
  await dialog.getByRole("button", { name: "Delete chat" }).click()
  await expect(threads.getByRole("button", { name: "Open Pricing copy v2", exact: true })).toHaveCount(0)
})

test("while an answer streams, an open tool call, Wrap and focus stay as they were", { tag: "@engine" }, async ({ page }) => {
  // The page's model is held mid-answer, as if tokens keep coming.
  await page.locator("uiset-chat").evaluate((el) => {
    const chat = el as unknown as { messages: unknown[]; status: string }
    chat.status = "streaming"
    chat.messages = [{ id: "a", role: "assistant", parts: [{ type: "tool-x", title: "Look up", state: "output-available", output: { n: 1 } }, { type: "text", text: "```ts\nconst a = 1\n```\nmore", state: "streaming" }] }]
  })
  const answer = log(page).locator(".chat-message").first()
  await answer.getByRole("button", { name: /^Look up/ }).click()
  await answer.getByRole("button", { name: "Wrap lines" }).click()
  await answer.getByRole("button", { name: "Wrap lines" }).focus()
  for (let i = 0; i < 5; i++)
    await page.locator("uiset-chat").evaluate((el, n) => {
      const chat = el as unknown as { messages: unknown[] }
      chat.messages = [{ id: "a", role: "assistant", parts: [{ type: "tool-x", title: "Look up", state: "output-available", output: { n: 1 } }, { type: "text", text: `\`\`\`ts\nconst a = 1\n\`\`\`\nmore ${"word ".repeat(n + 1)}`, state: "streaming" }] }]
    }, i)
  await expect(answer.getByRole("region", { name: /Look up output/ })).toBeVisible()
  await expect(answer.locator(".chat-code")).toHaveAttribute("data-wrap", "")
  await expect(answer.getByRole("button", { name: "Wrap lines" })).toBeFocused()
})

test("the composer sends a FileList, and Enter sends when the menu finds nothing", { tag: "@engine" }, async ({ page }) => {
  await page.locator("uiset-chat-composer").evaluate((el) =>
    el.addEventListener("send", (e) => ((window as unknown as { sent: unknown }).sent = { isList: (e as CustomEvent).detail.files instanceof FileList, text: (e as CustomEvent).detail.text })),
  )
  await composer(page).fill("/xyz")
  // The menu's own "No matches" (UI SDK's page announcer says it too).
  await expect(page.locator("uiset-chat-composer").getByText("No matches")).toBeVisible()
  await composer(page).press("Enter")
  expect(await page.evaluate(() => (window as unknown as { sent: unknown }).sent)).toEqual({ isList: true, text: "/xyz" })
  await expect(composer(page)).toBeFocused()
})

test("the chat list keeps focus on what you chose, and a rename finished elsewhere leaves focus there", { tag: "@engine" }, async ({ page }) => {
  const threads = page.getByRole("navigation", { name: "Chats" })
  await threads.getByRole("button", { name: "Open Pricing page copy", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(threads.getByRole("button", { name: "Open Pricing page copy", exact: true })).toBeFocused()
  await threads.getByRole("button", { name: "More for Pricing page copy" }).click()
  await page.getByRole("menuitem", { name: "Rename" }).click()
  await threads.getByRole("textbox", { name: /Rename/ }).fill("Copy v3")
  await composer(page).click()
  await page.keyboard.type("hello")
  await expect(composer(page)).toHaveValue("hello")
  await expect(threads.getByRole("button", { name: "Open Copy v3", exact: true })).toBeVisible()
  // An update to the list while the delete dialog is open leaves the dialog alone.
  await threads.getByRole("button", { name: "More for Copy v3" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete “Copy v3”?" })
  await expect(dialog).toBeVisible()
  await page.locator("uiset-chat-threads").evaluate((el) => {
    const t = el as unknown as { threads: unknown[] }
    t.threads = [...t.threads]
  })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Keep it" })).toBeVisible()
})
