import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// The page templates as web pages, with no React: the same screens and behavior as the
// React templates, built from UI SDK's elements and UISet's.
const templates = ["auth", "pricing", "dashboard", "admin", "settings", "inbox", "chat-app", "project-board", "calendar-app"]
const frame = (page: Page) => page.locator(".template-frame")

async function open(page: Page, template: string, hash = "") {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`/templates/${template}.html${hash}`)
  await expect(frame(page)).toBeVisible()
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).include(".template-frame").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
  return results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)
}

for (const template of templates) {
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    for (const theme of ["light", "dark"] as const) {
      if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
      test(`${template} passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
        await open(page, template)
        await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
        expect(await axe(page)).toEqual([])
      })
    }
  }
}

test("templates fit a phone without scrolling sideways", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  for (const template of templates) {
    await open(page, template)
    const overflow = await frame(page).evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(overflow, template).toBeLessThanOrEqual(1)
  }
})

test("auth: an empty sign-in shows field messages, a wrong password the server's", async ({ page, browserName }) => {
  // Safari's Tab skips links ("Forgot password?") unless set to reach every item; Option+Tab does.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab"
  await open(page, "auth")
  const form = frame(page).getByRole("form", { name: "Sign in" })
  await form.getByRole("button", { name: "Sign in" }).click()
  await expect(form.getByText("Enter your email address.")).toBeVisible()
  await expect(form.getByRole("textbox", { name: "Email" })).toBeFocused()
  await page.keyboard.type("ada@example.com")
  await page.keyboard.press(tab)
  await page.keyboard.press(tab)
  await page.keyboard.type("wrong")
  await page.keyboard.press("Enter")
  await expect(form.getByRole("alert")).toContainText("don't match")
})

test("auth: a partial code says what's missing", async ({ page }) => {
  await open(page, "auth", "#verify")
  const form = frame(page).getByRole("form", { name: "Enter your code" })
  await form.getByRole("textbox").first().focus()
  await page.keyboard.type("123")
  await form.getByRole("button", { name: "Verify" }).click()
  await expect(form.getByText("Enter all 6 digits.")).toBeVisible()
})

test("auth: a new password must be typed the same twice; a reset link is sent", async ({ page }) => {
  await open(page, "auth", "#reset-password")
  const form = frame(page).getByRole("form", { name: "Choose a new password" })
  await form.locator("input[autocomplete=new-password]").first().fill("Correct horse 42!")
  await form.getByLabel("Confirm new password").fill("Correct horse 43!")
  await form.getByRole("button", { name: "Save password" }).click()
  await expect(form.getByText("The passwords don't match.")).toBeVisible()
  await expect(form.getByLabel("Confirm new password")).toBeFocused()
  await page.evaluate(() => (window.location.hash = "forgot-password"))
  const reset = frame(page).getByRole("form", { name: "Reset your password" })
  await reset.getByRole("textbox", { name: "Email" }).fill("ada@example.com")
  await reset.getByRole("button", { name: "Send reset link" }).click()
  await expect(frame(page).getByRole("status").filter({ hasText: "Link sent" })).toBeVisible()
  await expect(frame(page).getByRole("heading", { name: "Check your email" })).toBeVisible()
})

test("dashboard: the date range rescopes the figures, the charts and the table", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "dashboard")
  const orders = frame(page).locator("uiset-stat").nth(1).locator(".stat-value")
  const before = await orders.textContent()
  await frame(page).getByRole("radiogroup", { name: "Date range" }).getByRole("radio", { name: "7 days" }).click()
  await expect(orders).not.toHaveText(before!)
  await expect(frame(page).getByText("Orders from the last 7 days, all channels.")).toBeVisible()
  await expect(frame(page).getByRole("listbox", { name: "Revenue" }).getByRole("option")).toHaveCount(7)
  // Agents change the range by its name too.
  const result = await page.evaluate(() => (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }> } }).agent.act({ steps: [{ ref: "Date range", action: "setValue", args: ["90"] }] }))
  expect(result.ok, result.error?.message).toBe(true)
  await expect(frame(page).getByRole("listbox", { name: "Revenue" }).getByRole("option")).toHaveCount(90)
})

test("the app shell collapses to icons with Mod+B and remembers it; narrow screens get a drawer", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "dashboard")
  const nav = frame(page).getByRole("navigation", { name: "Dashboard sections" })
  await frame(page).getByRole("button", { name: "Collapse sidebar" }).click()
  await expect(frame(page).getByRole("button", { name: "Expand sidebar" })).toBeVisible()
  // Labels go (they stay for screen readers); the sidebar narrows to its icons.
  await expect.poll(async () => (await frame(page).locator(".app-sidebar").boundingBox())!.width).toBeLessThan(80)
  await expect(nav.getByRole("link", { name: "Orders" })).toBeVisible()
  await page.reload()
  await expect(frame(page).getByRole("button", { name: "Expand sidebar" })).toBeVisible()
  await page.keyboard.press("ControlOrMeta+b")
  await expect(frame(page).getByRole("button", { name: "Collapse sidebar" })).toBeVisible()
  await page.setViewportSize({ width: 600, height: 900 })
  await frame(page).getByRole("button", { name: "Open navigation" }).click()
  await expect(page.getByRole("dialog").getByRole("link", { name: "Orders" })).toBeVisible()
})

test("admin: Enter on a row opens it for editing; selected rows delete after a confirm", async ({ page }) => {
  await open(page, "admin")
  const grid = frame(page).getByRole("grid", { name: "Customers" })
  // The rows come from the page's script.
  await expect(grid).toHaveAttribute("aria-rowcount", "9")
  await grid.locator('[tabindex="0"]').focus()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("form", { name: /^Edit / })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("form", { name: /^Edit / })).toBeHidden()
  await grid.getByRole("checkbox").nth(1).click()
  await frame(page).getByRole("button", { name: "Delete selected" }).click()
  const ask = page.getByRole("alertdialog", { name: /^Delete / })
  await ask.getByRole("button", { name: /^Delete / }).click()
  await expect(page.locator("[data-slot=toast-title]", { hasText: /^Deleted / })).toBeVisible()
  await expect(frame(page).locator(".data-grid-footer")).toContainText("7 rows")
  // Agents filter by the grid's name.
  const result = await page.evaluate(() => (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }> } }).agent.act({ steps: [{ ref: "Customers", action: "filter", args: ["hopper"] }] }))
  expect(result.ok, result.error?.message).toBe(true)
})

test("settings: tabs by keyboard, and a save says so", async ({ page }) => {
  await open(page, "settings")
  const tabs = frame(page).getByRole("tablist", { name: "Settings sections" })
  await tabs.getByRole("tab", { name: "Profile" }).focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await expect(tabs.getByRole("tab", { name: "Notifications" })).toHaveAttribute("aria-selected", "true")
  await frame(page).getByRole("button", { name: "Save notification settings" }).click()
  await expect(page.locator("[data-slot=toast-title]", { hasText: "Notification settings saved" })).toBeVisible()
})

test("settings: tabs keep what you did, and an existing teammate can't be invited twice", async ({ page }) => {
  await open(page, "settings")
  await frame(page).getByRole("tab", { name: "Security" }).click()
  await frame(page).getByRole("button", { name: "Sign out Safari on iPhone" }).click()
  await expect(frame(page).getByRole("button", { name: "Sign out Firefox on Windows" })).toBeFocused()
  await frame(page).getByRole("tab", { name: "Team" }).click()
  await frame(page).getByRole("tab", { name: "Security" }).click()
  await expect(frame(page).getByRole("button", { name: "Sign out Safari on iPhone" })).toHaveCount(0)

  await frame(page).getByRole("tab", { name: "Team" }).click()
  await frame(page).getByRole("button", { name: "Invite people" }).click()
  const invite = page.getByRole("form", { name: "Invite people" })
  await invite.getByRole("textbox", { name: "Email address" }).fill("grace@example.com")
  await invite.getByRole("button", { name: "Send invite" }).click()
  await expect(invite.getByText("grace@example.com is already on the team.")).toBeVisible()
  await invite.getByRole("textbox", { name: "Email address" }).fill("joan@example.com")
  await invite.getByRole("button", { name: "Send invite" }).click()
  await expect(page.locator("[data-slot=toast-title]", { hasText: "Invited joan@example.com" })).toBeVisible()
  await expect(frame(page).getByText("5 people in Acme Cloud.")).toBeVisible()
})

test("inbox: arrow through messages, open one, archive it, undo", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "inbox")
  const list = frame(page).getByRole("listbox", { name: "Inbox messages" })
  await list.getByRole("option").first().focus()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(frame(page).getByRole("heading", { level: 2, name: "Invoice INV-1042 is due" })).toBeVisible()
  await frame(page).getByRole("button", { name: "Archive message" }).click()
  await expect(list.getByRole("option", { name: /Invoice INV-1042/ })).toHaveCount(0)
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(list.getByRole("option", { name: /Invoice INV-1042/ })).toHaveCount(1)
  // Agents open a message by choosing it in the list.
  const result = await page.evaluate(() => (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }> } }).agent.act({ steps: [{ ref: "Inbox messages", action: "setValue", args: ["msg-4"] }] }))
  expect(result.ok, result.error?.message).toBe(true)
  await expect(frame(page).getByRole("heading", { level: 2, name: "Numbers for the board deck" })).toBeVisible()
})

test("inbox: folder links switch the list, and archived mail can come back", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "inbox")
  await frame(page).getByRole("button", { name: "Archive message" }).click()
  await frame(page).getByRole("link", { name: "Archive" }).click()
  const archived = frame(page).getByRole("listbox", { name: "Archive messages" })
  await expect(archived.getByRole("option")).toHaveCount(1)
  await archived.getByRole("option").first().click()
  await frame(page).getByRole("button", { name: "Move to Inbox" }).click()
  await expect(frame(page).getByText("Nothing here")).toBeVisible()
})

test("inbox on a phone: arrows browse, Enter opens and focuses the message, Back returns", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await open(page, "inbox")
  const list = frame(page).getByRole("listbox", { name: "Inbox messages" })
  await list.getByRole("option").first().focus()
  await page.keyboard.press("ArrowDown")
  await expect(list).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(frame(page).getByRole("heading", { level: 2, name: "Invoice INV-1042 is due" })).toBeFocused()
  await frame(page).getByRole("button", { name: "Back to messages" }).click()
  await expect(list.getByRole("option").first()).toBeFocused()
})

test("inbox: compose sends to Sent; / searches", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "inbox")
  await frame(page).getByRole("button", { name: "Compose" }).click()
  const form = page.getByRole("form", { name: "New message" })
  await form.getByRole("button", { name: "Send" }).click()
  await expect(form.getByText("Add someone to send to.")).toBeVisible()
  await form.getByRole("textbox", { name: "To" }).fill("grace@example.com")
  await form.getByRole("textbox", { name: "Message" }).fill("Thanks for the list.")
  await form.getByRole("button", { name: "Send" }).click()
  await expect(page.locator("[data-slot=toast-title]", { hasText: "Message sent" })).toBeVisible()
  await frame(page).getByRole("link", { name: "Sent" }).click()
  await expect(frame(page).getByRole("listbox", { name: "Sent messages" }).getByRole("option")).toHaveCount(1)
  await frame(page).getByRole("heading", { level: 1 }).click()
  await page.keyboard.press("/")
  await expect(frame(page).getByRole("searchbox", { name: "Search mail" })).toBeFocused()
})

test("chat app: Stop ends an answer, New chat starts an empty one, and deleting the last chat leaves one", async ({ page }) => {
  await open(page, "chat-app")
  const composer = frame(page).getByRole("textbox", { name: "Message" })
  await composer.fill("Draft release notes")
  await composer.press("Enter")
  await frame(page).getByRole("button", { name: "Stop" }).click()
  await expect(frame(page).getByRole("button", { name: "Send" })).toBeVisible()
  await expect(composer).toBeFocused()
  const chats = frame(page).getByRole("navigation", { name: "Chats" })
  await chats.getByRole("button", { name: "New chat" }).click()
  await expect(chats.getByRole("button", { name: "Open Untitled chat 2", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(frame(page).getByText("What are we working on?")).toBeVisible()
  await expect(composer).toBeFocused()
  // Back to the first chat: its question is still there.
  await chats.getByRole("button", { name: "Open Draft release notes", exact: true }).click()
  await expect(frame(page).getByRole("region", { name: "Conversation" })).toContainText("Draft release notes")
  for (const name of ["Draft release notes", "Untitled chat 2"]) {
    await chats.getByRole("button", { name: `More for ${name}` }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete chat" }).click()
    await expect(chats.getByRole("button", { name: `Open ${name}`, exact: true })).toHaveCount(0)
  }
  // A new chat takes the next number: none is ever reused.
  await expect(chats.getByRole("button", { name: "Open Untitled chat 3", exact: true })).toHaveAttribute("aria-current", "page")
})

/* ------------------------------------------------------------ project board */

type Act = { ok: boolean; error?: { message: string } }
const act = (page: Page, steps: unknown[]) =>
  page.evaluate((s) => (window as unknown as { agent: { act: (x: unknown) => Promise<Act> } }).agent.act({ steps: s }), steps)
const issueBoard = (page: Page) => frame(page).getByRole("group", { name: "Issue board", exact: true })
const issueColumn = (page: Page, name: string) => issueBoard(page).getByRole("listbox", { name })
const undoButton = (page: Page) => page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo", exact: true })

test("project board: at 1440 all four columns fit beside the sidebars", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page, "project-board")
  const done = (await issueBoard(page).getByRole("listbox", { name: "Done" }).boundingBox())!
  const board = (await issueBoard(page).boundingBox())!
  expect(done.x + done.width).toBeLessThanOrEqual(board.x + board.width + 1)
})

test("project board: a card moves by keyboard, the progress follows, and Undo puts it back", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "project-board")
  const progress = frame(page).getByRole("meter", { name: "Sprint progress" })
  await expect(progress).toHaveAttribute("aria-valuetext", "4 of 14 issues done")
  await issueColumn(page, "In review").getByRole("option", { name: "Search results layout" }).focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Space")
  await expect(issueColumn(page, "Done").getByRole("option", { name: "Search results layout" })).toBeFocused()
  await expect(progress).toHaveAttribute("aria-valuetext", "5 of 14 issues done")
  await undoButton(page).click()
  await expect(issueColumn(page, "In review").getByRole("option", { name: "Search results layout" })).toBeVisible()
  await expect(progress).toHaveAttribute("aria-valuetext", "4 of 14 issues done")
})

test("project board: Undo focuses the card in the same task as the press", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "project-board")
  const moved = issueColumn(page, "In review").getByRole("option", { name: "Search results layout" })
  await moved.focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Space")
  await issueColumn(page, "In review").getByRole("option").first().focus()
  // Where focus is once the press's task is done, before the next frame: a focus put off to
  // a later frame would still be on its way.
  const focused = await undoButton(page).evaluate((button) => {
    ;(button as HTMLElement).click()
    return new Promise<string | null>((done) => setTimeout(() => done(document.activeElement?.getAttribute("aria-label") ?? null)))
  })
  expect(focused).toBe("Search results layout")
})

test("project board: the list shows the same issues, and Enter opens one in the card dialog", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "project-board")
  await frame(page).getByRole("radiogroup", { name: "View" }).getByRole("radio", { name: "List" }).click()
  const grid = frame(page).getByRole("grid", { name: "Issue list" })
  await expect(grid).toHaveAttribute("aria-rowcount", "15")
  await expect(grid.getByRole("row", { name: /Fix the contact form on Safari/ })).toContainText("In progress")
  await grid.locator('[tabindex="0"]').focus()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Write the pricing page copy" })
  await dialog.getByRole("combobox", { name: "Column" }).click()
  await page.getByRole("option", { name: "In review" }).click()
  await dialog.getByRole("button", { name: "Save card" }).click()
  await expect(grid.getByRole("row", { name: /Write the pricing page copy/ })).toContainText("In review")
  await expect(grid.locator('[tabindex="0"]')).toBeFocused()
  // Deleting from the list keeps focus in the grid, on a row still there.
  await page.keyboard.press("Enter")
  await page.getByRole("dialog").getByRole("button", { name: "Delete card" }).click()
  await page.getByRole("button", { name: "Delete for good" }).click()
  await expect(grid).toHaveAttribute("aria-rowcount", "14")
  await expect(grid.locator('[tabindex="0"]')).toBeFocused()
  // One state: the board has it in its new column too.
  await frame(page).getByRole("radio", { name: "Board" }).click()
  await expect(issueColumn(page, "In review").getByRole("option", { name: "Write the pricing page copy" })).toBeVisible()
  await expect(issueBoard(page).getByRole("option")).toHaveCount(13)
})

test("project board: search and the person filter narrow the board and the list", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "project-board")
  const search = frame(page).getByRole("searchbox", { name: "Search issues" })
  await search.fill("safari")
  await expect(issueBoard(page).getByRole("option")).toHaveCount(1)
  await expect(issueBoard(page).getByRole("option", { name: "Fix the contact form on Safari" })).toBeVisible()
  await search.fill("")
  await frame(page).getByRole("combobox", { name: "Cards for" }).click()
  await page.getByRole("option", { name: "Ada Lovelace" }).click()
  await expect(issueBoard(page).getByRole("option")).toHaveCount(3)
  await frame(page).getByRole("radio", { name: "List" }).click()
  await expect(frame(page).getByRole("grid", { name: "Issue list" })).toHaveAttribute("aria-rowcount", "4")
})

test("project board: the card dialog edits a card, and New issue adds one", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "project-board")
  await issueBoard(page).getByRole("option", { name: "Cookie consent banner" }).focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Cookie consent banner" })
  await dialog.getByRole("textbox", { name: "Title" }).fill("Cookie banner with a reject button")
  await dialog.getByRole("combobox", { name: "Assignee" }).click()
  await page.getByRole("option", { name: "Grace Hopper" }).click()
  await dialog.getByRole("checkbox", { name: "Design" }).check()
  await dialog.getByRole("button", { name: "Save card" }).click()
  const card = issueBoard(page).getByRole("option", { name: "Cookie banner with a reject button" })
  await expect(card).toBeFocused()
  await expect(card).toHaveAccessibleDescription(/Grace Hopper\. Labels: Design, Frontend/)

  await frame(page).getByRole("button", { name: "New issue" }).click()
  const form = page.getByRole("form", { name: "New issue" })
  await form.getByRole("button", { name: "Add issue" }).click()
  await expect(form.getByText("An issue needs a title.")).toBeVisible()
  await form.getByRole("textbox", { name: "Title" }).fill("Press kit page")
  await form.getByRole("button", { name: "Add issue" }).click()
  await expect(page.locator("[data-slot=toast-title]", { hasText: "Added “Press kit page” to To do" })).toBeVisible()
  await expect(issueColumn(page, "To do").getByRole("option", { name: "Press kit page" })).toBeVisible()

  // Agents move issues by the titles people see.
  const result = await act(page, [{ ref: "Issue board", action: "moveCard", args: ["Search results layout", "Done"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(issueColumn(page, "Done").getByRole("option", { name: "Search results layout" })).toBeVisible()
  await expect(frame(page).getByRole("meter", { name: "Sprint progress" })).toHaveAttribute("aria-valuetext", "5 of 15 issues done")
})

/* ------------------------------------------------------------------ calendar */

const week = (page: Page) => frame(page).getByRole("group", { name: "My calendar", exact: true })

test("calendar: a phone starts on one day; at 1440 the week shows all seven days", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await open(page, "calendar-app")
  await expect(frame(page).getByRole("heading", { name: "Monday, November 16" })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page, "calendar-app")
  await expect(frame(page).getByRole("heading", { name: "Nov 16 – 22, 2026" })).toBeVisible()
  // Sunday's column ends inside the calendar, beside the site's and the template's sidebars.
  const sunday = (await week(page).getByText("Sun 22", { exact: true }).boundingBox())!
  const calendar = (await week(page).boundingBox())!
  expect(sunday.x + sunday.width).toBeLessThanOrEqual(calendar.x + calendar.width + 1)
})

test("calendar: unchecking a calendar hides its events, and checking it brings them back", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "calendar-app")
  const lunch = week(page).getByRole("button", { name: /^Lunch with Ada, Monday/ })
  await expect(lunch).toBeVisible()
  await frame(page).getByRole("checkbox", { name: "Personal" }).click()
  await expect(lunch).toHaveCount(0)
  await expect(week(page).getByRole("button", { name: /^Design review, Monday/ })).toBeVisible()
  await expect(frame(page).getByRole("list", { name: "Upcoming" })).not.toContainText("Lunch with Ada")
  await frame(page).getByRole("checkbox", { name: "Personal" }).click()
  await expect(lunch).toBeVisible()
})

test("calendar: the small month jumps the week to the day chosen", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "calendar-app")
  await frame(page).getByRole("grid", { name: "November 2026" }).getByRole("gridcell", { name: /November 25/ }).click()
  await expect(frame(page).getByRole("heading", { name: "Nov 23 – 29, 2026" })).toBeVisible()
  await expect(week(page).getByRole("button", { name: /^Design critique, Wednesday, November 25/ })).toBeVisible()
  await frame(page).getByRole("button", { name: "Today", exact: true }).click()
  await expect(frame(page).getByRole("heading", { name: "Nov 16 – 22, 2026" })).toBeVisible()
})

test("calendar: New event adds one to the week, and deleting it offers Undo", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "calendar-app")
  await frame(page).getByRole("button", { name: "New event" }).click()
  const form = page.getByRole("form", { name: "New event" })
  await form.getByRole("textbox", { name: "Title" }).fill("Focus time")
  await form.getByRole("button", { name: "Add event" }).click()
  await expect(page.locator("[data-slot=toast-title]", { hasText: "Added “Focus time”" })).toBeVisible()
  const event = week(page).getByRole("button", { name: /^Focus time, Monday, November 16, 2:00 PM to 3:00 PM/ })
  await expect(event).toBeFocused()
  await page.keyboard.press("Delete")
  await expect(event).toHaveCount(0)
  await undoButton(page).click()
  await expect(event).toBeVisible()
})

test("calendar: the month lists each day's events; choosing a day opens it", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, "calendar-app")
  await frame(page).getByRole("radiogroup", { name: "Calendar layout" }).getByRole("radio", { name: "Month" }).click()
  const month = frame(page).getByRole("grid", { name: "Month of events" })
  const day = month.getByRole("gridcell", { name: /November 18/ })
  await expect(day).toHaveAccessibleName(/3 events: Standup at 9:00 AM, 1:1 with Grace at 11:00 AM, Launch rehearsal at 3:00 PM/)
  await day.click()
  await expect(frame(page).getByRole("radio", { name: "Day" })).toBeChecked()
  await expect(frame(page).getByRole("heading", { name: "Wednesday, November 18" })).toBeVisible()
  await expect(week(page).getByRole("button", { name: /^Launch rehearsal, Wednesday/ })).toBeVisible()
  // Agents add events by day name and time.
  const result = await act(page, [{ ref: "My calendar", action: "addEvent", args: ["Wednesday", "13:00", "14:00", "Pairing"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(week(page).getByRole("button", { name: /^Pairing, Wednesday, November 18, 1:00 PM to 2:00 PM/ })).toBeVisible()
})
