import { expect, test, type Page } from "@playwright/test"

const board = (page: Page) => page.getByRole("group", { name: "Sprint board", exact: true })
const column = (page: Page, name: string) => board(page).getByRole("listbox", { name })
const card = (page: Page, name: string) => board(page).getByRole("option", { name })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/components")
  await board(page).scrollIntoViewIfNeeded()
})

test("drag a card to another column with the pointer", async ({ page }) => {
  const from = (await card(page, "Keyboard shortcuts sheet").boundingBox())!
  const to = (await column(page, "Done").boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 4, { steps: 12 })
  await page.mouse.up()
  await expect(column(page, "Done").getByRole("option", { name: "Keyboard shortcuts sheet" })).toBeVisible()
  await expect(column(page, "Backlog").getByRole("option", { name: "Keyboard shortcuts sheet" })).toHaveCount(0)
})

test("move a card with the keyboard, then undo from the toast", async ({ page }) => {
  await card(page, "Audit the cookie banner").focus()
  await page.keyboard.press("Space")
  await expect(card(page, "Audit the cookie banner")).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("Space")
  await expect(column(page, "Backlog").getByRole("option", { name: "Audit the cookie banner" })).toBeVisible()
  await expect(card(page, "Audit the cookie banner")).toBeFocused()
  await page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo", exact: true }).click()
  await expect(column(page, "Done").getByRole("option", { name: "Audit the cookie banner" })).toBeVisible()
})

test("Escape puts a picked-up card back", async ({ page }) => {
  await card(page, "Fix the login redirect").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Escape")
  await expect(column(page, "In review").getByRole("option", { name: "Fix the login redirect" })).toBeVisible()
})

test("Enter opens the details, where a card can move and be edited", async ({ page }) => {
  await card(page, "Onboarding checklist").focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Onboarding checklist" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("textbox", { name: "Title" }).fill("Onboarding checklist v2")
  await dialog.getByRole("combobox", { name: "Column" }).click()
  await page.getByRole("option", { name: "Done" }).click()
  await dialog.getByRole("button", { name: "Save card" }).click()
  await expect(column(page, "Done").getByRole("option", { name: "Onboarding checklist v2" })).toBeVisible()
  // The move went through the board: its toast offers Undo, and focus followed the card.
  await expect(page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo", exact: true })).toBeVisible()
  await expect(card(page, "Onboarding checklist v2")).toBeFocused()
})

test("the dialog can't move a card into a full column", async ({ page }) => {
  await card(page, "Onboarding checklist").focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Onboarding checklist" })
  await dialog.getByRole("combobox", { name: "Column" }).click()
  await expect(page.getByRole("option", { name: "In review (full)" })).toHaveAttribute("aria-disabled", "true")
  await page.keyboard.press("Escape")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(card(page, "Onboarding checklist")).toBeFocused()
})

test("deleting a card hands focus to its neighbor", async ({ page }) => {
  await card(page, "Rate-limit the public API").focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Rate-limit the public API" })
  await dialog.getByRole("button", { name: "Delete card" }).click()
  await page.getByRole("button", { name: "Delete for good" }).click()
  await expect(card(page, "Rate-limit the public API")).toHaveCount(0)
  await expect(card(page, "Onboarding checklist")).toBeFocused()
})

test("an edit that the filter hides hands focus to a card still shown", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search cards" }).fill("api")
  await card(page, "Rate-limit the public API").focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Rate-limit the public API" })
  await dialog.getByRole("textbox", { name: "Title" }).fill("Throttle the endpoints")
  await dialog.getByRole("checkbox", { name: "API" }).uncheck()
  await dialog.getByRole("button", { name: "Save card" }).click()
  await expect(card(page, "Throttle the endpoints")).toBeHidden()
  await expect(card(page, "Ship the invoice export")).toBeFocused()
})

test("closing the add form returns focus to its button", async ({ page }) => {
  const add = board(page).getByRole("button", { name: "Add a card to Backlog" })
  await add.click()
  await page.keyboard.press("Escape")
  await expect(add).toBeFocused()
  await add.click()
  await board(page).getByRole("button", { name: "Done adding" }).click()
  await expect(add).toBeFocused()
})

test("add a card from a column, and a full column offers none", async ({ page }) => {
  await board(page).getByRole("button", { name: "Add a card to Backlog" }).click()
  await page.keyboard.type("Write the changelog")
  await page.keyboard.press("Enter")
  await expect(column(page, "Backlog").getByRole("option", { name: "Write the changelog" })).toBeVisible()
  await expect(board(page).getByRole("button", { name: "Add a card to In review" })).toHaveCount(0)
  await expect(board(page)).toContainText("Full: finish a card to add more.")
})

test("a search that hides the board's tab stop moves it to a card still shown", async ({ page }) => {
  await card(page, "Onboarding checklist").focus()
  await page.getByRole("searchbox", { name: "Search cards" }).fill("webhooks")
  await page.getByRole("combobox", { name: "Cards for" }).focus()
  // Tab passes the earlier columns' Add buttons, then reaches the board's one card stop.
  const stops: string[] = []
  for (let i = 0; i < 4 && !stops.includes("option"); i++) {
    await page.keyboard.press("Tab")
    stops.push(await page.evaluate(() => document.activeElement?.getAttribute("role") ?? ""))
  }
  await expect(card(page, "Retry failed webhooks")).toBeFocused()
})

test("while a filter is on, a dragged card stays put", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search cards" }).fill("api")
  const from = (await card(page, "Rate-limit the public API").boundingBox())!
  const to = (await column(page, "Done").boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 4, { steps: 12 })
  await page.mouse.up()
  await expect(column(page, "Backlog").getByRole("option", { name: "Rate-limit the public API" })).toBeVisible()
})

test("a picked-up card looks different from a focused one", async ({ page }) => {
  const write = card(page, "Keyboard shortcuts sheet")
  await write.focus()
  const focused = await write.evaluate((el) => getComputedStyle(el).outlineStyle + getComputedStyle(el).backgroundColor)
  await page.keyboard.press("Space")
  await expect(write).toHaveAttribute("data-moving", "")
  const moving = await write.evaluate((el) => getComputedStyle(el).outlineStyle + getComputedStyle(el).backgroundColor)
  expect(moving).not.toBe(focused)
  await expect(board(page)).toHaveAttribute("data-moving", "")
  await page.keyboard.press("Escape")
})

test("filtering by person hides the others' cards", async ({ page }) => {
  await page.getByRole("combobox", { name: "Cards for" }).click()
  await page.getByRole("option", { name: "Grace Hopper" }).click()
  await expect(board(page).getByRole("option")).toHaveCount(2)
  await expect(card(page, "Rate-limit the public API")).toBeVisible()
})
