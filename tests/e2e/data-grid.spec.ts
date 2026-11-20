import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"

// The Orders grid on the home page: 10,000 seeded rows. Columns, in order:
// 1 select, 2 Order, 3 Customer, 4 Region, 5 Status, 6 Amount, 7 Placed, 8 Rush.

const grid = (page: Page) => page.getByRole("grid", { name: "Orders" })
const section = (page: Page) => page.locator(".item-frame")
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
  await page.goto("/docs/kits/data-grid")
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
      .include(".item-frame")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])

    await page.keyboard.press("Enter")
    await expect(grid(page).getByRole("textbox")).toBeFocused()
    const editing = await new AxeBuilder({ page })
      .include(".item-frame")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(editing.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])

    // And with a list column's options open.
    await page.keyboard.press("Escape")
    await moveTo(page, 2, 5)
    await page.keyboard.press("Enter")
    await expect(grid(page).getByRole("option").first()).toBeVisible()
    const choosing = await new AxeBuilder({ page })
      .include(".item-frame")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(choosing.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
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

test("typing on a list cell starts a replacement: the list narrows, and only an option can be saved", async ({
  page,
}) => {
  await moveTo(page, 2, 4)
  const before = (await cellAt(page, 2, 4).textContent())!
  await page.keyboard.type("Mars")
  // A column with options is edited in a combobox, whose list is the skin's own.
  const editor = grid(page).getByRole("combobox", { name: "Region" })
  await expect(editor).toHaveValue("Mars")
  await expect(grid(page).getByText("No match")).toBeVisible()
  await expect(grid(page).getByRole("option")).toHaveCount(0)
  // Nothing matches, so Enter has nothing to save: the editor stays, and the cell is as it was.
  await page.keyboard.press("Enter")
  await expect(editor).toBeFocused()
  await page.keyboard.press("ControlOrMeta+A")
  await page.keyboard.type("eur")
  await expect(grid(page).getByRole("option")).toHaveText(["Europe"])
  await expect(grid(page).locator('[role="option"][data-highlighted]')).toHaveText("Europe")
  await page.keyboard.press("Enter")
  await expect(cellAt(page, 2, 4)).toHaveText("Europe")
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 4, tag: "DIV" })
  expect(before).toBeTruthy()

  // A letter on the cell opens the list already narrowed by it.
  await page.keyboard.type("a")
  await expect(editor).toHaveValue("a")
  for (const text of await grid(page).getByRole("option").allTextContents()) expect(text.toLowerCase()).toContain("a")
  await page.keyboard.press("Escape")
  await expect(cellAt(page, 2, 4)).toHaveText("Europe")
})

test("a list column is edited from the skin's own list: arrows, Enter, Escape, Tab and a press", async ({ page }) => {
  await moveTo(page, 2, 5)
  const cell = cellAt(page, 2, 5)
  const before = (await cell.textContent())!
  const box = (await cell.boundingBox())!
  await page.keyboard.press("Enter")
  const editor = grid(page).getByRole("combobox", { name: "Status" })
  await expect(editor).toBeFocused()
  await expect(editor).toHaveValue(before)
  // The old value is selected, so typing replaces it.
  expect(await editor.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(before.length)
  const options = grid(page).getByRole("option")
  await expect(options.first()).toBeVisible()
  expect(await options.count()).toBeGreaterThan(1)
  const highlighted = grid(page).locator('[role="option"][data-highlighted]')
  // The current value is selected and highlighted, so the arrows move from it.
  await expect(grid(page).getByRole("option", { name: before, exact: true })).toHaveAttribute("aria-selected", "true")
  await expect(highlighted).toHaveText(before)
  // The list belongs to its cell: it starts at the cell's edge, just under it, at least as wide.
  // (Polled: the popup takes its cell's width as it is placed, a frame after it shows.)
  const placed = () => grid(page).locator(".data-grid-options").boundingBox()
  await expect.poll(async () => (await placed())!.width).toBeGreaterThanOrEqual(box.width - 1)
  const list = (await placed())!
  expect(Math.abs(list.x - box.x)).toBeLessThanOrEqual(1)
  expect(list.y - (box.y + box.height)).toBeGreaterThanOrEqual(0)
  expect(list.y - (box.y + box.height)).toBeLessThanOrEqual(6)
  // And it is the skin's popup, in the page, not the browser's own list.
  expect(await grid(page).locator(".data-grid-options").evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe("0px")
  await expect(editor).not.toHaveAttribute("list")

  // Escape saves nothing and gives the cell its focus back.
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Escape")
  await expect(editor).toBeHidden()
  await expect(cell).toHaveText(before)
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 5, tag: expect.not.stringMatching("INPUT") })

  // An arrow and Enter saves the highlighted option.
  await page.keyboard.press("Enter")
  await page.keyboard.press("ArrowDown")
  const second = (await highlighted.textContent())!
  expect(second).not.toBe(before)
  await page.keyboard.press("Enter")
  await expect(cell).toHaveText(second)
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 5, tag: expect.not.stringMatching("INPUT") })

  // Tab saves it too, and focus stays with the cell.
  await page.keyboard.press("F2")
  await page.keyboard.press("ArrowDown")
  const third = (await highlighted.textContent())!
  await page.keyboard.press("Tab")
  await expect(cell).toHaveText(third)
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 5 })

  // A press on an option saves it.
  await page.keyboard.press("Enter")
  await grid(page).getByRole("option", { name: before, exact: true }).click()
  await expect(cell).toHaveText(before)
  await expect(editor).toBeHidden()

  // A press somewhere else saves nothing, and focus goes where the press was.
  await moveTo(page, 2, 5)
  await page.keyboard.press("Enter")
  await page.keyboard.press("ArrowDown")
  await cellAt(page, 4, 3).click()
  await expect(editor).toBeHidden()
  await expect(cell).toHaveText(before)
  await expect.poll(() => active(page)).toMatchObject({ row: 4, col: 3 })
})

// What an open editor draws: where its focus ring ends, whether it covers its cell exactly,
// and whether the skin's chevron shows.
const drawn = (page: Page) =>
  grid(page)
    .locator(".data-grid-editor")
    .evaluate((el) => {
      const cell = el.closest<HTMLElement>(".data-grid-cell")!
      const style = getComputedStyle(el)
      const a = el.getBoundingClientRect()
      const b = cell.getBoundingClientRect()
      const chevron = getComputedStyle(cell, "::before")
      return {
        // How far the ring reaches past the editor's own box. Past it is over the next cells.
        ringOutside: parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth),
        ring: parseFloat(style.outlineWidth),
        fills: Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5,
        // Bottom edge: the row's line belongs to the cell, so the editor may cover that one pixel.
        below: a.bottom - b.bottom,
        chevron: chevron.content !== "none" && chevron.maskImage !== "none",
        chevronMiddle: chevron.content === "none" ? null : Math.abs(parseFloat(chevron.top) - parseFloat(chevron.bottom)),
        room: parseFloat(style.paddingInlineEnd),
      }
    })

test("an editor's ring stays inside its cell, and a list editor shows the skin's chevron", async ({ page }) => {
  // 6 Amount is a plain editor; 4 Region has a list of options.
  for (const [col, list] of [
    [6, false],
    [4, true],
  ] as const) {
    await moveTo(page, 2, col)
    await page.keyboard.press("Enter")
    await expect(grid(page).locator(".data-grid-editor")).toBeFocused()
    const editor = await drawn(page)
    expect(editor.ring, `column ${col}`).toBeGreaterThanOrEqual(2)
    expect(editor.ringOutside, `column ${col}`).toBeLessThanOrEqual(0)
    expect(editor.fills, `column ${col}`).toBe(true)
    expect(editor.below, `column ${col}`).toBeLessThanOrEqual(1)
    expect(editor.chevron, `column ${col}`).toBe(list)
    if (list) {
      // Centered in the cell's height, with room kept for it beside the text.
      expect(editor.chevronMiddle).toBeLessThan(1)
      expect(editor.room).toBeGreaterThanOrEqual(26)
    }
    await page.keyboard.press("Escape")
  }
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

// The skins audit (2026-11-20): the browser drew the row checkboxes, light grey in dark skins.
test("row checkboxes are drawn by the skin, not the browser, and show their check", async ({ page }) => {
  const box = grid(page).getByRole("checkbox").nth(1)
  await expect(box).toHaveCSS("appearance", "none")
  const unchecked = await box.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(await box.evaluate((el) => getComputedStyle(el, "::before").visibility)).toBe("hidden")
  await box.click()
  await expect(box).toHaveAttribute("data-checked", "")
  await expect.poll(() => box.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(unchecked)
  expect(await box.evaluate((el) => getComputedStyle(el, "::before").visibility)).toBe("visible")
  await expect(grid(page).getByRole("checkbox", { name: "Select all rows" })).toHaveAttribute("data-indeterminate", "")
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
