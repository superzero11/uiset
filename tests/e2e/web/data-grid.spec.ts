import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// The Data Grid as a web element, on a page with no React. 60 customers. Columns, in order:
// 1 select, 2 Name (pinned), 3 Plan, 4 Region, 5 Seats, 6 MRR, 7 Renews, 8 Active.
const grid = (page: Page) => page.getByRole("grid", { name: "Customers" })
const host = (page: Page) => page.locator("uiset-data-grid")
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
async function moveTo(page: Page, row: number, col: number) {
  await grid(page).locator('[tabindex="0"]').focus()
  await page.keyboard.press("ControlOrMeta+Home")
  for (let r = 1; r < row; r++) await page.keyboard.press("ArrowDown")
  for (let c = 1; c < col; c++) await page.keyboard.press("ArrowRight")
  await expect.poll(() => active(page)).toMatchObject({ row, col })
}
type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]>
}
const act = (page: Page, steps: unknown[]) =>
  page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)
const footer = (page: Page) => host(page).locator(".data-grid-footer")

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/data-grid.html")
  await expect(grid(page)).toHaveAttribute("aria-rowcount", "61")
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Data Grid page passes axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("one tab stop; arrows move; only rows near the view are drawn; Control+End reaches the last", async ({ page }) => {
  await moveTo(page, 2, 2)
  expect((await active(page)).text).toBe("Acme")
  expect(await grid(page).getByRole("row").count()).toBeLessThan(30)
  await page.keyboard.press("ControlOrMeta+End")
  await expect.poll(() => active(page)).toMatchObject({ row: 61, col: 8 })
  await page.keyboard.press("ControlOrMeta+Home")
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 1 })
})

test("Enter on a header sorts, and the order is live and reported", async ({ page }) => {
  await host(page).evaluate((el) => el.addEventListener("sortchange", (e) => ((window as unknown as { sorted: unknown }).sorted = (e as CustomEvent).detail.value)))
  await moveTo(page, 1, 5)
  await page.keyboard.press("Enter")
  await expect(grid(page).getByRole("columnheader", { name: /Seats/ })).toHaveAttribute("aria-sort", "ascending")
  expect(await page.evaluate(() => (window as unknown as { sorted: unknown }).sorted)).toEqual([{ column: "seats", direction: "ascending" }])
  await page.keyboard.press("Enter")
  await expect(grid(page).getByRole("columnheader", { name: /Seats/ })).toHaveAttribute("aria-sort", "descending")
  expect(await host(page).evaluate((el) => (el as unknown as { sort: unknown }).sort)).toEqual([{ column: "seats", direction: "descending" }])
})

test("Enter edits a cell: a list column refuses other values, Escape cancels, the page can refuse", async ({ page }) => {
  await moveTo(page, 2, 3)
  await page.keyboard.press("Enter")
  // A column with options suggests them: its editor is a combobox.
  const editor = grid(page).getByRole("combobox", { name: "Plan" })
  await expect(editor).toBeFocused()
  await editor.fill("Gold")
  await page.keyboard.press("Enter")
  await expect(grid(page).getByText("Plan must be one of Free, Pro, Team, Enterprise")).toBeVisible()
  await expect(editor).toHaveAttribute("aria-invalid", "true")
  await editor.fill("team")
  await page.keyboard.press("Enter")
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 3, text: "Team" })
  // Seats below one: the page's celledit listener says no, and the editor stays.
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  const seats = grid(page).getByRole("textbox", { name: "Seats" })
  await seats.fill("0")
  await page.keyboard.press("Enter")
  await expect(seats).toBeVisible()
  await expect(page.getByText("Seats must be at least 1")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 5, text: "1" })
})

test("Space checks a row and a yes-or-no cell; the toolbar shows the selection and clears it", async ({ page }) => {
  await moveTo(page, 2, 1)
  await page.keyboard.press("Space")
  await expect(grid(page).getByRole("row", { name: /Acme/ }).first()).toHaveAttribute("aria-selected", "true")
  await expect(footer(page)).toContainText("1 selected")
  await expect(host(page).locator(".data-grid-selection-count")).toHaveText("1 selected")
  await page.keyboard.press("ArrowRight")
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight")
  expect((await active(page)).text).toBe("No")
  await page.keyboard.press("Space")
  await expect.poll(async () => (await active(page)).text).toBe("Yes")
  await host(page).getByRole("button", { name: "Clear selection" }).click()
  await expect(footer(page)).not.toContainText("selected")
  await expect.poll(() => active(page)).toMatchObject({ row: 2 })
})

test("the toolbar searches, filters a column, groups and exports a CSV", async ({ page }) => {
  await host(page).getByRole("searchbox", { name: "Search customers" }).fill("8,900")
  await expect(footer(page)).toHaveText("1 of 60 rows")
  await host(page).getByRole("searchbox", { name: "Search customers" }).fill("")
  await host(page).getByRole("button", { name: "Filters" }).click()
  await page.getByRole("textbox", { name: "Plan" }).fill("enterprise")
  await expect(footer(page)).toHaveText("15 of 60 rows")
  await page.keyboard.press("Escape")
  await expect(host(page).getByRole("button", { name: /^Filters\s*,\s*1 on$/ })).toBeVisible()
  await host(page).getByRole("combobox", { name: "Group customers by" }).click()
  await page.getByRole("option", { name: "Group by Region" }).click()
  await expect(grid(page).getByRole("gridcell", { name: /^Region: / }).first()).toBeVisible()
  const download = page.waitForEvent("download")
  await host(page).getByRole("button", { name: "Export CSV" }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe("customers.csv")
})

test("Shift+F10 opens a column menu that hides a column; the View menu shows it again", async ({ page }) => {
  await moveTo(page, 1, 4)
  await page.keyboard.press("Shift+F10")
  await page.getByRole("menuitem", { name: "Hide column" }).click()
  await expect(grid(page).getByRole("columnheader", { name: /Region/ })).toHaveCount(0)
  expect(await host(page).evaluate((el) => (el as unknown as { columnState: { hidden: string[] } }).columnState.hidden)).toEqual(["region"])
  await host(page).getByRole("button", { name: "View" }).click()
  await page.getByRole("menuitemcheckbox", { name: "Region" }).click()
  await expect(grid(page).getByRole("columnheader", { name: /Region/ })).toHaveCount(1)
})

test("Alt+Arrows resize a header's column and Alt+Shift+Arrows move it, with focus following", async ({ page }) => {
  await moveTo(page, 1, 4)
  const width = () => host(page).evaluate((el) => (el as unknown as { columnState: { widths: Record<string, number> } }).columnState.widths.region)
  await page.keyboard.press("Alt+ArrowRight")
  expect(await width()).toBe(166)
  await page.keyboard.press("Alt+Shift+ArrowRight")
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 5 })
  expect((await active(page)).text).toContain("Region")
})

test("Enter on a cell that isn't edited in place fires rowaction", async ({ page }) => {
  await moveTo(page, 2, 4)
  await page.keyboard.press("Enter")
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("Opened Acme")).toBeVisible()
})

test("agents sort, filter, select, edit, group and hide by the names people see", async ({ page }) => {
  const sorted = await act(page, [{ ref: "Customers", action: "sortBy", args: ["MRR", "descending"] }])
  expect(sorted.ok, sorted.error?.message).toBe(true)
  await expect(grid(page).getByRole("columnheader", { name: /MRR/ })).toHaveAttribute("aria-sort", "descending")
  const edited = await act(page, [{ ref: "Customers", action: "editCell", args: ["Acme", "Seats", "12"] }])
  expect(edited.ok, edited.error?.message).toBe(true)
  const bad = await act(page, [{ ref: "Customers", action: "editCell", args: ["Acme", "Seats", "lots"] }])
  expect(bad.error?.message).toContain("Seats needs a number")
  const selected = await act(page, [{ ref: "Customers", action: "selectRows", args: [["Acme", "Globex"]] }])
  expect(selected.ok, selected.error?.message).toBe(true)
  await expect(footer(page)).toContainText("2 selected")
  const filtered = await act(page, [{ ref: "Customers", action: "filter", args: ["Acme"] }])
  expect(filtered.ok, filtered.error?.message).toBe(true)
  await expect(footer(page)).toContainText("of 60 rows")
  const hidden = await act(page, [{ ref: "Customers", action: "showColumn", args: ["Name", false] }])
  expect(hidden.error?.message).toContain("Name can't be hidden")
  // "Customers" also names the search field and the filters ("Search customers"), so the
  // grid is read by its ref.
  const items = await page.evaluate(async () => {
    const agent = (window as unknown as { agent: Agent & { snapshot: () => Promise<{ ref: string; component: string; label: string }[]> } }).agent
    const ref = (await agent.snapshot()).find((c) => c.component === "data-grid" && c.label === "Customers")!.ref
    const found = await agent.query({ within: ref })
    return found.find((c) => c.label === "Customers")?.items?.map((i) => i.label)
  })
  expect(items).toContainEqual(expect.stringContaining("Acme (Plan: Free, Region: Americas, Seats: 12,"))
})

type GridEl = HTMLElement & Record<string, unknown>
const header = (page: Page, name: string) => grid(page).getByRole("columnheader", { name, exact: false }).filter({ hasText: name })
const listen = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { said: string[] }
    w.said = []
    new MutationObserver(() => {
      for (const region of document.querySelectorAll("[data-ui-sdk-announcer]")) {
        const text = region.textContent?.trim()
        if (text && w.said.at(-1) !== text) w.said.push(text)
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
const said = (page: Page) => page.evaluate(() => (window as unknown as { said: string[] }).said)
const tabStops = (page: Page) => grid(page).locator('[tabindex="0"]').count()

test("properties set before the element is defined are picked up, and later sets still work", async ({ page }) => {
  await page.route("**/early-grid.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root><uiset-data-grid id="g" label="Early" selectable></uiset-data-grid></uiset-root>
        <script>
          const g = document.getElementById("g")
          g.columns = [{ id: "name", header: "Name", value: (r) => r.name }]
          g.rows = [{ id: "a", name: "Beta" }, { id: "b", name: "Alpha" }]
          g.sort = [{ column: "name", direction: "ascending" }]
          g.selected = ["a"]
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-grid.html")
  const early = page.getByRole("grid", { name: "Early" })
  await expect(early).toHaveAttribute("aria-rowcount", "3")
  await expect(early.getByRole("row").nth(1)).toContainText("Alpha")
  await expect(early.getByRole("row", { name: /Beta/ })).toHaveAttribute("aria-selected", "true")
  await page.evaluate(() => ((document.getElementById("g") as unknown as { selected: string[] }).selected = ["b"]))
  await expect(early.getByRole("row", { name: /Alpha/ })).toHaveAttribute("aria-selected", "true")
})

test("the grid keeps a tab stop when its active cell's row or column goes away", async ({ page }) => {
  await moveTo(page, 30, 3)
  await page.getByRole("searchbox", { name: "Search customers" }).fill("acme")
  await expect.poll(() => tabStops(page)).toBe(1)
  // Hiding the focused header's column moves focus to the header now in its place, in the
  // middle of the row and at its end.
  await moveTo(page, 1, 4)
  await page.keyboard.press("Shift+F10")
  await page.getByRole("menuitem", { name: "Hide column" }).click()
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 4, text: expect.stringContaining("Seats") })
  await moveTo(page, 1, 7)
  await page.keyboard.press("Shift+F10")
  await page.getByRole("menuitem", { name: "Hide column" }).click()
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 6 })
  await expect.poll(() => tabStops(page)).toBe(1)
})

test("clicking row checkboxes and Select all selects; Shift-click selects the rows between", async ({ page }) => {
  const boxes = grid(page).getByRole("checkbox")
  await boxes.nth(1).click()
  await expect(grid(page).getByRole("row").nth(1)).toHaveAttribute("aria-selected", "true")
  await boxes.nth(3).click({ modifiers: ["Shift"] })
  await expect(footer(page)).toContainText("3 selected")
  await expect(boxes.nth(2)).toBeChecked()
  await page.keyboard.press("ArrowDown")
  await expect.poll(() => active(page)).toMatchObject({ row: 5, col: 1 })
  await grid(page).getByRole("checkbox", { name: "Select all rows" }).click()
  await expect(footer(page)).toContainText("60 selected")
  // A refused change leaves the box as it was.
  await host(page).evaluate((el) => el.addEventListener("selectedchange", (e) => e.preventDefault()))
  await boxes.nth(1).click()
  await expect(boxes.nth(1)).toBeChecked()
})

test("the toolbar follows the grid's state, however it changed", async ({ page }) => {
  await page.getByRole("button", { name: "Filters" }).click()
  await page.getByRole("textbox", { name: "Plan" }).fill("pro")
  await page.getByRole("textbox", { name: "Region" }).fill("eu")
  await expect(page.getByRole("button", { name: /^Filters\s*, 2 on$/ })).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByRole("textbox", { name: "Plan" })).toHaveValue("")
  await expect(page.getByRole("textbox", { name: "Region" })).toHaveValue("")
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeDisabled()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: "Filters", exact: true })).toBeVisible()
  // Grouping set from code shows in the select; stopping it from a column menu clears it.
  await host(page).evaluate((el) => ((el as GridEl).groupBy = "region"))
  await expect(host(page).locator("ui-select ui-select-value")).toHaveText("Group by Region")
  await moveTo(page, 1, 4)
  await page.keyboard.press("Shift+F10")
  await page.getByRole("menuitem", { name: "Stop grouping" }).click()
  await expect(host(page).locator("ui-select ui-select-value")).toHaveText("No grouping")
  // Density set from code shows in View.
  await page.getByRole("button", { name: "View" }).click()
  await page.getByRole("menuitemradio", { name: "Compact" }).click()
  await page.keyboard.press("Escape")
  await host(page).evaluate((el) => ((el as GridEl).density = "standard"))
  await page.getByRole("button", { name: "View" }).click()
  await expect(page.getByRole("menuitemradio", { name: "Standard" })).toBeChecked()
})

test("an open column menu stays open as the grid redraws; Escape returns focus to the header", async ({ page }) => {
  await moveTo(page, 1, 4)
  await page.keyboard.press("Shift+F10")
  const wider = page.getByRole("menuitem", { name: "Wider" })
  await wider.focus()
  await page.keyboard.press("Enter")
  await expect(wider).toBeVisible()
  await expect(wider).toBeFocused()
  await host(page).evaluate((el) => ((el as GridEl).rows = [...(el as GridEl).rows as unknown[]]))
  await expect(wider).toBeFocused()
  await page.keyboard.press("Escape")
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 4, tag: "UISET-DATA-GRID-CELL" })
  // A click on the menu button leaves focus with the header, which Escape gives back.
  await host(page).getByRole("button", { name: "Seats column menu" }).click()
  await page.keyboard.press("Escape")
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 5, tag: "UISET-DATA-GRID-CELL" })
  await page.keyboard.press("ArrowDown")
  await expect.poll(() => active(page)).toMatchObject({ row: 2, col: 5 })
})

test("a refused column change is neither announced nor followed by focus", async ({ page }) => {
  await listen(page)
  await host(page).evaluate((el) => el.addEventListener("columnstatechange", (e) => e.preventDefault()))
  await moveTo(page, 1, 4)
  await page.keyboard.press("Alt+Shift+ArrowRight")
  await expect.poll(() => active(page)).toMatchObject({ row: 1, col: 4, text: expect.stringContaining("Region") })
  await page.getByRole("searchbox", { name: "Search customers" }).focus()
  await page.keyboard.type("a")
  await expect(page.getByRole("searchbox", { name: "Search customers" })).toBeFocused()
  expect((await said(page)).some((text) => text.includes("moved"))).toBe(false)
})

test("rows stay in order in the page after scrolling back up", async ({ page }) => {
  const scroller = host(page).locator(".data-grid-scroller")
  for (const top of [1500, 600, 0]) {
    await scroller.evaluate((el, y) => el.scrollTo(0, y), top)
    await page.waitForTimeout(80)
  }
  const order = await grid(page).locator(".data-grid-body [role=row]").evaluateAll((rows) => rows.map((r) => Number(r.getAttribute("aria-rowindex"))))
  expect(order).toEqual([...order].sort((a, b) => a - b))
})

test("the count is said only when it changes, and a selection leaves other cells' content alone", async ({ page }) => {
  await listen(page)
  await page.getByRole("searchbox", { name: "Search customers" }).fill("pro")
  await expect.poll(() => said(page)).toContainEqual(expect.stringMatching(/^\d+ rows$/))
  const before = (await said(page)).length
  await moveTo(page, 1, 5)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(800)
  expect((await said(page)).slice(before).filter((text) => /^\d+ rows?$/.test(text))).toEqual([])
  const name = grid(page).getByRole("row").nth(2).getByRole("gridcell").nth(1)
  await name.evaluate((el) => ((window as unknown as { kept: Node }).kept = el.firstChild!))
  await moveTo(page, 2, 1)
  await page.keyboard.press("Space")
  await expect(grid(page).getByRole("row").nth(1)).toHaveAttribute("aria-selected", "true")
  expect(await name.evaluate((el) => el.firstChild === (window as unknown as { kept: Node }).kept)).toBe(true)
})

test("an invalid edit left by moving away gives way to the next edit", async ({ page }) => {
  await moveTo(page, 2, 5)
  await page.keyboard.press("Enter")
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.type("lots")
  await page.keyboard.press("Enter")
  await expect(host(page).locator(".data-grid-error")).toBeVisible()
  await page.getByRole("heading").first().click()
  await moveTo(page, 4, 3)
  await page.keyboard.press("Enter")
  await expect(page.getByRole("combobox", { name: "Plan" })).toBeFocused()
  await expect(host(page).locator("uiset-data-grid-editor")).toHaveCount(1)
})

test("double-clicking a resize edge resets its width", async ({ page }) => {
  const region = host(page).locator('[data-column="region"][role=columnheader]')
  const edge = region.locator(".data-grid-resizer")
  const box = (await edge.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect.poll(() => host(page).evaluate((el) => ((el as GridEl).columnState as { widths: Record<string, number> }).widths.region)).toBe(190)
  await edge.dblclick()
  await expect.poll(() => host(page).evaluate((el) => ((el as GridEl).columnState as { widths: Record<string, number> }).widths.region)).toBe(undefined)
})

test("tool labels follow the grid's label and headers; `editable` is observed", async ({ page }) => {
  await host(page).evaluate((el) => {
    el.setAttribute("label", "Clients")
    const grid = el as GridEl
    grid.columns = (grid.columns as { id: string; header: string }[]).map((c) => (c.id === "plan" ? { ...c, header: "Tier" } : c))
  })
  await page.getByRole("button", { name: "Filters" }).click()
  await expect(page.getByRole("dialog", { name: "Filter clients" }).getByRole("textbox", { name: "Tier" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(host(page).locator("ui-select-label")).toHaveText("Group clients by")
  await host(page).evaluate((el) => el.removeAttribute("editable"))
  await expect(host(page).locator("[data-editable]")).toHaveCount(0)
})

test("a new density keeps the active row in view", async ({ page }) => {
  await moveTo(page, 30, 2)
  // The active row at the top of the view: smaller rows would leave it above.
  await host(page).evaluate((el) => {
    const row = el.querySelector<HTMLElement>('[tabindex="0"]')!.closest<HTMLElement>("[role=row]")!
    el.querySelector(".data-grid-scroller")!.scrollTo(0, parseFloat(row.style.top))
  })
  await page.waitForTimeout(50)
  await host(page).evaluate((el) => ((el as GridEl).density = "compact"))
  const cell = grid(page).locator('[tabindex="0"]')
  await expect.poll(async () => {
    const scroller = (await host(page).locator(".data-grid-scroller").boundingBox())!
    const box = (await cell.boundingBox())!
    return box.y >= scroller.y && box.y + box.height <= scroller.y + scroller.height
  }).toBe(true)
})
