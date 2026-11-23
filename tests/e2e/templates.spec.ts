import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"

const templates = ["auth", "dashboard", "settings", "admin", "inbox", "chat-app", "pricing", "checkout", "invoice", "ide-app", "project-board", "calendar-app"]
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
      test(`${template} passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
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

test("templates fit a phone without scrolling sideways", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  for (const template of templates) {
    await open(page, template)
    const overflow = await frame(page).evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(overflow, template).toBeLessThanOrEqual(1)
  }
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

test("project board: at 1440 all four columns fit beside the sidebars", { tag: "@engine" }, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page, "project-board")
  const done = (await issueBoard(page).getByRole("listbox", { name: "Done" }).boundingBox())!
  const board = (await issueBoard(page).boundingBox())!
  expect(done.x + done.width).toBeLessThanOrEqual(board.x + board.width + 1)
})

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
