import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const templates = ["auth", "dashboard", "settings", "admin", "inbox", "chat-app", "pricing", "ide-app", "project-board", "calendar-app"]
const frame = (page: Page) => page.locator(".template-frame")

async function open(page: Page, template: string, query = "") {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`/templates/${template}${query.replace(/^&/, "?")}`)
  // The template's code loads with its page; under a full parallel run that takes a while.
  await expect(frame(page)).toBeVisible({ timeout: 15000 })
  await expect(frame(page).getByText("Loading the demo…")).toHaveCount(0, { timeout: 15000 })
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .include(".template-frame")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
  return results.violations.map(
    (v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
  )
}

for (const template of templates) {
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    for (const theme of ["light", "dark"] as const) {
      // Blueprint, Studio and Phosphor are dark only; Ink is light only.
      if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue
      test(`${template} passes axe in ${skin}, ${theme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
        await open(page, template, `&skin=${skin}&theme=${theme}`)
        // The editor's syntax colors load a beat later; check them, not the plain text.
        if (template === "ide-app") await frame(page).locator(".ide-code-colors span[style]").first().waitFor()
        expect(await axe(page)).toEqual([])
      })
    }
  }
}

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

test("auth: links move between screens, and sign-up checks the password", async ({ page }) => {
  await open(page, "auth")
  await frame(page).getByRole("link", { name: "Create an account" }).click()
  const form = frame(page).getByRole("form", { name: "Create an account" })
  await form.getByRole("textbox", { name: "Full name" }).fill("Ada Lovelace")
  await form.getByRole("textbox", { name: "Work email" }).fill("ada@example.com")
  await form.locator("input[autocomplete=new-password]").fill("short")
  await expect(form.getByRole("meter", { name: "New password strength" })).toHaveAttribute(
    "aria-valuetext",
    "Weak",
  )
  await form.getByRole("button", { name: "Create account" }).click()
  await expect(form.getByText("Use at least 10 characters.")).toBeVisible()
})

test("dashboard: the date range rescopes the figures and the table", async ({ page }) => {
  await open(page, "dashboard")
  const range = frame(page).getByRole("radiogroup", { name: "Date range" })
  const orders = frame(page).locator(".stat").nth(1).locator(".stat-value")
  const thirty = await orders.textContent()
  await range.getByRole("radio", { name: "7 days" }).click()
  await expect(orders).not.toHaveText(thirty!)
  await expect(frame(page).getByRole("grid", { name: "Recent orders" })).toBeVisible()
  await expect(frame(page).getByRole("listbox", { name: "Revenue" }).getByRole("option")).toHaveCount(7)
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

test("settings: deleting the workspace waits for its name", async ({ page }) => {
  await open(page, "settings")
  await frame(page).getByRole("tab", { name: "Workspace" }).click()
  await frame(page).getByRole("button", { name: "Delete workspace" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete Acme Cloud?" })
  const confirm = dialog.getByRole("button", { name: "Delete forever" })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole("textbox", { name: "Workspace name to confirm" }).fill("Acme Cloud")
  await expect(confirm).toBeEnabled()
  await expect(confirm).toHaveAttribute("data-agent-confirm", /Deletes Acme Cloud/)
})

test("admin: create a customer in the drawer, then find them", async ({ page }) => {
  await open(page, "admin")
  await frame(page).getByRole("button", { name: "New customer" }).click()
  const form = page.getByRole("form", { name: "New customer" })
  await form.getByRole("button", { name: "Add customer" }).click()
  await expect(form.getByText("Enter a name.")).toBeVisible()
  await form.getByRole("textbox", { name: "Full name" }).fill("Joan Clarke")
  await form.getByRole("textbox", { name: "Email" }).fill("joan@example.com")
  await form.getByRole("textbox", { name: "Company" }).fill("Codebreak Ltd")
  await form.getByRole("button", { name: "Add customer" }).click()
  await expect(page.locator("[data-slot=toast-title]", { hasText: "Added Joan Clarke" })).toBeVisible()
  await frame(page).getByRole("searchbox", { name: "Search customers" }).fill("joan")
  await expect(frame(page).getByRole("grid", { name: "Customers" })).toContainText("Codebreak Ltd")
})

test("admin: Enter on a row opens it for editing", async ({ page }) => {
  await open(page, "admin")
  const grid = frame(page).getByRole("grid", { name: "Customers" })
  await grid.locator('[tabindex="0"]').focus()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("form", { name: /^Edit / })).toBeVisible()
})

test("inbox: arrow through messages, open one, archive it, undo", async ({ page }) => {
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
})

test("chat app: a suggestion streams an answer with reasoning, a tool and sources", async ({ page }) => {
  await open(page, "chat-app")
  await frame(page).getByRole("button", { name: "Explain AbortController" }).click()
  const thread = frame(page).getByRole("region", { name: "Conversation" })
  await expect(thread).toContainText("Here's a short answer", { timeout: 15000 })
  await expect(thread.getByText("Searched the docs")).toBeVisible()
  await expect(thread.getByText(/2 sources/i).first()).toBeVisible()
})

test("pricing: the billing switch changes every price", async ({ page }) => {
  await open(page, "pricing")
  const pro = frame(page).locator(".pricing-plan").nth(1)
  await expect(pro.locator(".pricing-amount")).toHaveText("$41")
  await frame(page).getByRole("radiogroup", { name: "Billing period" }).getByRole("radio", { name: "Monthly" }).click()
  await expect(pro.locator(".pricing-amount")).toHaveText("$49")
  await expect(frame(page).getByRole("link", { name: "Start a 14-day trial: Pro" })).toBeVisible()
})

test("templates fit a phone without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  for (const template of templates) {
    await open(page, template)
    const overflow = await frame(page).evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(overflow, template).toBeLessThanOrEqual(1)
  }
})

test("agents drive templates by the names people see", async ({ page }) => {
  type Act = { ok: boolean; error?: { message: string } }
  const act = (steps: unknown[]) =>
    page.evaluate((s) => (window as unknown as { agent: { act: (x: unknown) => Promise<Act> } }).agent.act({ steps: s }), steps)

  await open(page, "dashboard")
  const orders = frame(page).locator(".stat").nth(1).locator(".stat-value")
  const before = await orders.textContent()
  let result = await act([{ ref: "Date range", action: "setValue", args: ["7 days"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(orders).not.toHaveText(before!)

  await open(page, "admin")
  result = await act([{ ref: "Customers", action: "filter", args: ["hopper"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(frame(page).locator(".data-grid-footer")).toContainText("1 of 8 rows")

  await open(page, "inbox")
  result = await act([{ ref: "Inbox messages", action: "setValue", args: ["msg-4"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(frame(page).getByRole("heading", { level: 2, name: "Numbers for the board deck" })).toBeVisible()
})

test("inbox: folder links switch the list, and archived mail can come back", async ({ page }) => {
  await open(page, "inbox")
  await frame(page).getByRole("button", { name: "Archive message" }).click()
  await frame(page).getByRole("link", { name: "Archive" }).click()
  const archived = frame(page).getByRole("listbox", { name: "Archive messages" })
  await expect(archived.getByRole("option")).toHaveCount(1)
  await archived.getByRole("option").first().click()
  await frame(page).getByRole("button", { name: "Move to Inbox" }).click()
  await expect(frame(page).getByText("Nothing here")).toBeVisible()
})

test("inbox on a phone: arrows browse, Enter opens and focuses the message, Back returns", async ({ page }) => {
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

test("settings: tabs keep what you did, and an existing teammate can't be invited twice", async ({ page }) => {
  await open(page, "settings")
  await frame(page).getByRole("tab", { name: "Security" }).click()
  await frame(page).getByRole("button", { name: "Sign out Safari on iPhone" }).click()
  await frame(page).getByRole("tab", { name: "Team" }).click()
  await frame(page).getByRole("tab", { name: "Security" }).click()
  await expect(frame(page).getByRole("button", { name: "Sign out Safari on iPhone" })).toHaveCount(0)

  await frame(page).getByRole("tab", { name: "Team" }).click()
  await frame(page).getByRole("button", { name: "Invite people" }).click()
  const invite = page.getByRole("form", { name: "Invite people" })
  await invite.getByRole("textbox", { name: "Email address" }).fill("grace@example.com")
  await invite.getByRole("button", { name: "Send invite" }).click()
  await expect(invite.getByText("grace@example.com is already on the team.")).toBeVisible()
})

test("auth: a partial code says what's missing", async ({ page }) => {
  await open(page, "auth")
  await page.evaluate(() => (window.location.hash = "verify"))
  const form = frame(page).getByRole("form", { name: "Enter your code" })
  await form.getByRole("textbox").first().focus()
  await page.keyboard.type("123")
  await form.getByRole("button", { name: "Verify" }).click()
  await expect(form.getByText("Enter all 6 digits.")).toBeVisible()
})

/* ------------------------------------------------------------ project board */

const issueBoard = (page: Page) => frame(page).getByRole("group", { name: "Issue board", exact: true })
const issueColumn = (page: Page, name: string) => issueBoard(page).getByRole("listbox", { name })
const undoButton = (page: Page) => page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo", exact: true })

test("project board: a card moves by keyboard, the progress follows, and Undo puts it back", async ({ page }) => {
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

test("project board: Undo focuses the card in the same task as the press", async ({ page }) => {
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

test("project board: the list shows the same issues, and Enter opens one in the card dialog", async ({ page }) => {
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

test("project board: search and the person filter narrow the board and the list", async ({ page }) => {
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

test("project board: the card dialog edits a card, and New issue adds one", async ({ page }) => {
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
})

/* ------------------------------------------------------------------ calendar */

const week = (page: Page) => frame(page).getByRole("group", { name: "My calendar", exact: true })

test("calendar: a phone starts on one day; at 1440 the week shows all seven days", async ({ page }) => {
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

test("calendar: unchecking a calendar hides its events, and checking it brings them back", async ({ page }) => {
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

test("calendar: the small month jumps the week to the day chosen", async ({ page }) => {
  await open(page, "calendar-app")
  await frame(page).getByRole("grid", { name: "November 2026" }).getByRole("gridcell", { name: /November 25/ }).click()
  await expect(frame(page).getByRole("heading", { name: "Nov 23 – 29, 2026" })).toBeVisible()
  await expect(week(page).getByRole("button", { name: /^Design critique, Wednesday, November 25/ })).toBeVisible()
  await frame(page).getByRole("button", { name: "Today", exact: true }).click()
  await expect(frame(page).getByRole("heading", { name: "Nov 16 – 22, 2026" })).toBeVisible()
})

test("calendar: New event adds one to the week, and deleting it offers Undo", async ({ page }) => {
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

test("calendar: the month lists each day's events; choosing a day opens it", async ({ page }) => {
  await open(page, "calendar-app")
  await frame(page).getByRole("radiogroup", { name: "Calendar layout" }).getByRole("radio", { name: "Month" }).click()
  const month = frame(page).getByRole("grid", { name: "Month of events" })
  const day = month.getByRole("gridcell", { name: /November 18/ })
  await expect(day).toHaveAccessibleName(/3 events: Standup at 9:00 AM, 1:1 with Grace at 11:00 AM, Launch rehearsal at 3:00 PM/)
  await day.click()
  await expect(frame(page).getByRole("radio", { name: "Day" })).toBeChecked()
  await expect(frame(page).getByRole("heading", { name: "Wednesday, November 18" })).toBeVisible()
  await expect(week(page).getByRole("button", { name: /^Launch rehearsal, Wednesday/ })).toBeVisible()
})

test("agents move issues and add events by the names people see", async ({ page }) => {
  type Act = { ok: boolean; error?: { message: string } }
  const act = (steps: unknown[]) =>
    page.evaluate((s) => (window as unknown as { agent: { act: (x: unknown) => Promise<Act> } }).agent.act({ steps: s }), steps)

  await open(page, "project-board")
  let result = await act([{ ref: "Issue board", action: "moveCard", args: ["Search results layout", "Done"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(issueColumn(page, "Done").getByRole("option", { name: "Search results layout" })).toBeVisible()
  await expect(frame(page).getByRole("meter", { name: "Sprint progress" })).toHaveAttribute("aria-valuetext", "5 of 14 issues done")

  await open(page, "calendar-app")
  result = await act([{ ref: "My calendar", action: "addEvent", args: ["Thursday", "14:00", "15:00", "Pairing"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(week(page).getByRole("button", { name: /^Pairing, Thursday, November 19, 2:00 PM to 3:00 PM/ })).toBeVisible()
})
