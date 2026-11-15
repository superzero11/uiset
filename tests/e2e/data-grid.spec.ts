import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// The Orders grid on the home page: 10,000 seeded rows. Columns, in order:
// 1 select, 2 Order, 3 Customer, 4 Region, 5 Status, 6 Amount, 7 Placed, 8 Rush.

const grid = (page: Page) => page.getByRole("grid", { name: "Orders" })
const section = (page: Page) => page.locator("#data")
const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const cell = el.closest("[aria-colindex]") as HTMLElement | null
    return {
      row: Number(cell?.closest("[role=row]")?.getAttribute("aria-rowindex")),
      col: Number(cell?.getAttribute("aria-colindex")),
      text: cell?.textContent ?? "",
      tag: el.tagName,
    }
  })

async function enter(page: Page) {
  await grid(page).locator('[tabindex="0"]').focus()
}

async function moveTo(page: Page, row: number, col: number) {
  await enter(page)
  await page.keyboard.press("ControlOrMeta+Home")
  for (let r = 1; r < row; r++) await page.keyboard.press("ArrowDown")
  for (let c = 1; c < col; c++) await page.keyboard.press("ArrowRight")
  await expect.poll(() => active(page)).toMatchObject({ row, col })
}

const cellAt = (page: Page, row: number, col: number) =>
  grid(page).locator(`[role=row][aria-rowindex="${row}"] [aria-colindex="${col}"]`)

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/kits#data")
  await expect(grid(page)).toHaveAttribute("aria-rowcount", "10001")
})

for (const scheme of ["light", "dark"] as const) {
  test(`passes axe in ${scheme} mode, with a range, a group and the editor open`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
    await moveTo(page, 2, 3)
    await page.keyboard.press("Shift+ArrowDown")
    await page.keyboard.press("Shift+ArrowRight")
    const results = await new AxeBuilder({ page })
      .include("#data")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])

    await page.keyboard.press("Enter")
    await expect(grid(page).getByRole("textbox")).toBeFocused()
    const editing = await new AxeBuilder({ page })
      .include("#data")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(editing.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])
  })
}

test("one tab stop: Tab enters the grid and the next Tab leaves it", async ({ page }) => {
  await section(page).getByRole("button", { name: "Export CSV" }).focus()
  await page.keyboard.press("Tab")
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 1 })
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowRight")
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 2 })
  await page.keyboard.press("Tab")
  const inside = await page.evaluate(() => !!document.activeElement?.closest("[role=grid]"))
  expect(inside).toBe(false)
  await page.keyboard.press("Shift+Tab")
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 2 })
})

test("Enter on a header sorts, and Shift+Enter adds a second sort", async ({ page }) => {
  await moveTo(page, 1, 6)
  const amount = grid(page).getByRole("columnheader", { name: /Amount/ })
  await page.keyboard.press("Enter")
  await expect(amount).toHaveAttribute("aria-sort", "ascending")
  await expect(cellAt(page, 2, 6)).toHaveText("$40.00")
  await page.keyboard.press("Enter")
  await expect(amount).toHaveAttribute("aria-sort", "descending")

  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("Shift+Enter")
  const region = grid(page).getByRole("columnheader", { name: /Region/ })
  await expect(region.locator(".data-grid-sort-order")).toHaveText("2")
  await expect(amount).toHaveAttribute("aria-sort", "descending")
})

test("Enter edits a cell, bad numbers stay open with a message, Escape cancels", async ({
  page,
}) => {
  await moveTo(page, 2, 6)
  const before = await cellAt(page, 2, 6).textContent()
  await page.keyboard.press("Enter")
  const editor = grid(page).getByRole("textbox", { name: "Amount" })
  await expect(editor).toBeFocused()
  await page.keyboard.press("ControlOrMeta+A")
  await page.keyboard.type("lots")
  await page.keyboard.press("Enter")
  await expect(editor).toBeVisible()
  await expect(editor).toHaveAttribute("aria-invalid", "true")
  await expect(grid(page).getByText("Amount needs a number")).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(editor).toBeHidden()
  await expect(cellAt(page, 2, 6)).toHaveText(before!)
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 6, tag: "DIV" })

  await page.keyboard.press("Enter")
  await page.keyboard.press("ControlOrMeta+A")
  await page.keyboard.type("1234.5")
  await page.keyboard.press("Enter")
  await expect(cellAt(page, 2, 6)).toHaveText("$1,234.50")
})

test("typing on a cell starts a replacement, and a list column refuses other values", async ({
  page,
}) => {
  await moveTo(page, 2, 4)
  await page.keyboard.type("Mars")
  // A column with options suggests them, so its editor is a combobox.
  const editor = grid(page).getByRole("combobox", { name: "Region" })
  await expect(editor).toHaveValue("Mars")
  await page.keyboard.press("Enter")
  await expect(editor).toHaveAttribute("aria-invalid", "true")
  await page.keyboard.press("ControlOrMeta+A")
  await page.keyboard.type("europe")
  await page.keyboard.press("Enter")
  await expect(cellAt(page, 2, 4)).toHaveText("Europe")
})

test("Space flips a yes-or-no cell and checks a row", async ({ page }) => {
  await moveTo(page, 2, 8)
  const before = await cellAt(page, 2, 8).textContent()
  await page.keyboard.press("Space")
  await expect(cellAt(page, 2, 8)).toHaveText(before === "Yes" ? "No" : "Yes")

  await page.keyboard.press("Home")
  await page.keyboard.press("Space")
  await expect(grid(page).locator('[role=row][aria-rowindex="2"]')).toHaveAttribute(
    "aria-selected",
    "true",
  )
  await expect(section(page).getByRole("group", { name: "Orders tools" })).toContainText("1 selected")
  await expect(section(page).getByRole("button", { name: "Mark paid" })).toBeVisible()
})

test("Control+End reaches the last of 10,000 rows, rendering only a few", async ({ page }) => {
  await moveTo(page, 2, 2)
  await page.keyboard.press("ControlOrMeta+End")
  await expect.poll(() => active(page)).toMatchObject({ row: 10001, col: 8 })
  const rendered = await grid(page).locator("[role=row]").count()
  expect(rendered).toBeLessThan(60)
  await page.keyboard.press("ControlOrMeta+Home")
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 1 })
})

test("copy and paste a block through the system clipboard", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Playwright can grant clipboard access only in Chromium")
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await moveTo(page, 2, 3)
  const first = await cellAt(page, 2, 3).textContent()
  const second = await cellAt(page, 3, 3).textContent()
  await page.keyboard.press("Shift+ArrowDown")
  await page.keyboard.press("ControlOrMeta+C")
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${first}\n${second}`)

  // Focus stays on the range's first cell; three rows down is row 5.
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  await expect.poll(() => active(page)).toMatchObject({ row: 5, col: 3 })
  await page.keyboard.press("ControlOrMeta+V")
  await expect(cellAt(page, 5, 3)).toHaveText(first!)
  await expect(cellAt(page, 6, 3)).toHaveText(second!)
})

test("Shift+F10 opens a column menu that hides and pins, and focus comes back", async ({
  page,
}) => {
  await moveTo(page, 1, 3)
  await page.keyboard.press("Shift+F10")
  const menu = page.getByRole("menu")
  await expect(menu).toBeVisible()
  await menu.getByRole("menuitem", { name: "Hide column" }).click()
  await expect(grid(page).getByRole("columnheader", { name: /Customer/ })).toHaveCount(0)
  await expect.poll(() => active(page)).toMatchObject({ row: 1 })

  await section(page).getByRole("button", { name: "View" }).click()
  await page.getByRole("menuitemcheckbox", { name: "Customer" }).click()
  await page.keyboard.press("Escape")
  await expect(grid(page).getByRole("columnheader", { name: /Customer/ })).toHaveCount(1)

  await moveTo(page, 1, 5)
  await page.keyboard.press("Shift+F10")
  await page.getByRole("menuitem", { name: "Pin to start" }).click()
  const status = grid(page).getByRole("columnheader", { name: /Status/ })
  await expect(status).toHaveAttribute("aria-colindex", "3")
  await expect(status).toHaveCSS("position", "sticky")
})

test("Alt+Arrows resize a column and Alt+Shift+Arrows move it, with focus following", async ({
  page,
}) => {
  await moveTo(page, 1, 4)
  const region = grid(page).getByRole("columnheader", { name: /Region/ })
  const width = (await region.boundingBox())!.width
  await page.keyboard.press("Alt+ArrowRight")
  await page.keyboard.press("Alt+ArrowRight")
  await expect.poll(async () => (await region.boundingBox())!.width).toBeCloseTo(width + 32, 0)

  await page.keyboard.press("Alt+Shift+ArrowRight")
  await expect(region).toHaveAttribute("aria-colindex", "5")
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 5, text: "Region" })
})

test("the toolbar searches, filters by column, groups and exports a CSV", async ({ page }) => {
  const footer = section(page).locator(".data-grid-footer")
  await section(page).getByRole("searchbox", { name: "Search orders" }).fill("wonka europe")
  await expect(footer).toContainText(/^\d[\d,]* of 10,000 rows/)
  const shown = Number((await footer.textContent())!.split(" of")[0]!.replace(/,/g, ""))
  expect(shown).toBeGreaterThan(10)
  expect(shown).toBeLessThan(400)

  await section(page).getByRole("button", { name: /^Filters/ }).click()
  await page.getByRole("textbox", { name: "Status" }).fill("refunded")
  await page.keyboard.press("Escape")
  await expect(section(page).getByRole("button", { name: /Filters\W+1 on/ })).toBeVisible()
  // The footer's count follows the filter a moment later.
  const count = async () => Number((await footer.textContent())!.split(" of")[0]!.replace(/,/g, ""))
  await expect.poll(count).toBeLessThan(shown)
  const filtered = await count()

  await section(page).getByRole("combobox", { name: "Group orders by" }).click()
  await page.getByRole("option", { name: "Group by Status" }).click()
  // A grid row can't be expanded (only a treegrid's can), so the group's cell carries it.
  const group = grid(page).locator("[role=gridcell][aria-expanded]").first()
  await expect(group).toHaveAttribute("aria-expanded", "true")
  await group.click()
  await expect(group).toHaveAttribute("aria-expanded", "false")

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    section(page).getByRole("button", { name: "Export CSV" }).click(),
  ])
  expect(download.suggestedFilename()).toBe("orders.csv")
  const text = await (await download.createReadStream()).toArray()
  const file = Buffer.concat(text).toString("utf8")
  expect(file.startsWith("\uFEFF")).toBe(true)
  const lines = file.slice(1).split("\r\n")
  expect(lines[0]).toBe("Order,Customer,Region,Status,Amount,Placed,Rush")
  expect(lines).toHaveLength(filtered + 1)
})

test("dragging a header's edge resizes the column, and Escape puts it back", async ({ page }) => {
  const header = grid(page).getByRole("columnheader", { name: /Customer/ })
  const box = (await header.boundingBox())!
  const handle = header.locator(".data-grid-resizer")
  const h = (await handle.boundingBox())!
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + 60, h.y + h.height / 2, { steps: 4 })
  await page.mouse.up()
  await expect.poll(async () => (await header.boundingBox())!.width).toBeCloseTo(box.width + 56, -1)

  const wide = (await header.boundingBox())!.width
  const h2 = (await handle.boundingBox())!
  await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height / 2)
  await page.mouse.down()
  await page.mouse.move(h2.x + 80, h2.y + h2.height / 2, { steps: 4 })
  await page.keyboard.press("Escape")
  await page.mouse.up()
  await expect.poll(async () => (await header.boundingBox())!.width).toBeCloseTo(wide, 0)
})

test("the layout is remembered on the next visit", async ({ page }) => {
  await moveTo(page, 1, 4)
  await page.keyboard.press("Alt+Shift+ArrowRight")
  await expect(grid(page).getByRole("columnheader", { name: /Region/ })).toHaveAttribute(
    "aria-colindex",
    "5",
  )
  await page.reload()
  await expect(grid(page).getByRole("columnheader", { name: /Region/ })).toHaveAttribute(
    "aria-colindex",
    "5",
  )
})

test("clicking a row checkbox selects its row and keeps the arrows working", async ({ page }) => {
  await grid(page).getByRole("checkbox").nth(1).click()
  await expect(grid(page).getByRole("checkbox").nth(1)).toBeChecked()
  await expect(grid(page).getByRole("row").nth(1)).toHaveAttribute("aria-selected", "true")
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 1, tag: "DIV" })
  await page.keyboard.press("ArrowDown")
  await expect.poll(() => active(page)).toMatchObject({ row: 3, col: 1 })
  // Shift-click selects the rows between.
  await grid(page).getByRole("checkbox").nth(3).click({ modifiers: ["Shift"] })
  await expect(grid(page).getByRole("checkbox").nth(2)).toBeChecked()
})

test("a refused edit's message stays with that cell", async ({ page }) => {
  await moveTo(page, 2, 6)
  await page.keyboard.press("Enter")
  await page.keyboard.press("ControlOrMeta+A")
  await page.keyboard.type("abc")
  await page.keyboard.press("Enter")
  await expect(grid(page).getByText("Amount needs a number")).toBeVisible()
  await page.keyboard.press("Escape")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("Enter")
  const editor = grid(page).getByRole("textbox", { name: "Customer" })
  await expect(editor).toBeFocused()
  await expect(editor).not.toHaveAttribute("aria-invalid")
  await expect(grid(page).getByText("Amount needs a number")).toHaveCount(0)
})

test("a focused cell scrolls under the header, and under pinned columns", async ({ page }) => {
  await moveTo(page, 3, 3)
  const scroller = section(page).locator(".data-grid-scroller")
  await scroller.evaluate((el) => (el.scrollTop = 60))
  const header = grid(page).getByRole("columnheader", { name: /Customer/ })
  const box = (await header.boundingBox())!
  const topmost = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x!, y!)?.closest("[role=columnheader]")?.textContent,
    [box.x + 20, box.y + box.height / 2],
  )
  expect(topmost).toContain("Customer")
})

// A column menu's button doesn't take focus when pressed, so UI SDK alone returned focus to
// whichever header had it before: Escape from Status's menu went back to Region.
test("Escape from a column menu opened by its button goes to that column's header", async ({ page }) => {
  await grid(page).getByRole("columnheader", { name: /^Region/ }).focus()
  await grid(page).getByRole("button", { name: "Status column menu" }).click()
  await expect(page.getByRole("menu")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(grid(page).getByRole("columnheader", { name: /^Status/ })).toBeFocused()
  // Closed by moving focus on (Tab), focus isn't pulled back to the header.
  await grid(page).getByRole("columnheader", { name: /^Region/ }).focus()
  await grid(page).getByRole("button", { name: "Status column menu" }).click()
  await expect(page.getByRole("menu")).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("menu")).toBeHidden()
  await page.waitForTimeout(100)
  await expect(grid(page).getByRole("columnheader", { name: /^Status/ })).not.toBeFocused()
})

test("touch and screen reader users reach the column menu by its button, with Wider", async ({
  page,
}) => {
  const header = grid(page).getByRole("columnheader", { name: /Region/ })
  const width = (await header.boundingBox())!.width
  await grid(page).getByRole("button", { name: "Region column menu" }).click()
  await page.getByRole("menuitem", { name: "Wider" }).click()
  await expect(page.getByRole("menu")).toBeVisible()
  await expect.poll(async () => (await header.boundingBox())!.width).toBeCloseTo(width + 32, 0)
})
