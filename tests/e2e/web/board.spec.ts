import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// The Board as a web element, on a page with no React: data in, events out.
const board = (page: Page) => page.getByRole("group", { name: "Sprint board", exact: true })
const column = (page: Page, name: string) => board(page).getByRole("listbox", { name })
const card = (page: Page, name: string) => board(page).getByRole("option", { name })
const undo = (page: Page) => page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo" })
type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]>
}
const act = (page: Page, steps: unknown[]) =>
  page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/board.html")
  await expect(card(page, "Ship the beta")).toBeVisible()
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Board page passes axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("a card moves by keyboard: the board redraws as it's carried, and Undo takes it back", async ({ page }) => {
  await card(page, "Keyboard shortcuts sheet").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  // Mid-move the card already shows in Doing, still focused.
  await expect(column(page, "Doing").getByRole("option", { name: "Keyboard shortcuts sheet" })).toBeFocused()
  await page.keyboard.press("Space")
  expect(await board(page).evaluate((el) => (el as unknown as { lanes: Record<string, string[]> }).lanes.doing)).toContain("c2")
  await expect(card(page, "Keyboard shortcuts sheet")).toBeFocused()
  await undo(page).click()
  await expect(column(page, "Backlog").getByRole("option", { name: "Keyboard shortcuts sheet" })).toBeVisible()
  await expect(column(page, "Backlog").getByRole("option", { name: "Keyboard shortcuts sheet" })).toBeFocused()
  // Escape puts a carried card back where it was.
  await card(page, "Ship the beta").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("Escape")
  await expect(column(page, "Done").getByRole("option", { name: "Ship the beta" })).toBeFocused()
})

test("Undo focuses the card in the same task as the press, so nothing can come in between", async ({ page }) => {
  await card(page, "Keyboard shortcuts sheet").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Space")
  await card(page, "Ship the beta").focus()
  // Where focus is once the press's task is done, before the next frame: a focus put off to
  // a later frame would still be on its way.
  const focused = await undo(page).evaluate((button) => {
    ;(button as HTMLElement).click()
    return new Promise<string | null>((done) => setTimeout(() => done(document.activeElement?.getAttribute("aria-label") ?? null)))
  })
  expect(focused).toBe("Keyboard shortcuts sheet")
})

test("a card drags to another column with the pointer", async ({ page }) => {
  const from = (await card(page, "Ship the beta").boundingBox())!
  const to = (await column(page, "Backlog").boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 - 20, from.y + from.height / 2, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 4, { steps: 12 })
  await page.mouse.up()
  await expect(column(page, "Backlog").getByRole("option", { name: "Ship the beta" })).toBeVisible()
})

test("Enter opens the page's dialog; a move from it keeps limits and returns focus", async ({ page }) => {
  await card(page, "Onboarding checklist").focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Onboarding checklist" })
  // A full column says so, and can't be chosen.
  await expect(dialog.getByRole("button", { name: "In review is full" })).toBeDisabled()
  await dialog.getByRole("button", { name: "Move to Done" }).click()
  await expect(dialog).toBeHidden()
  await expect(column(page, "Done").getByRole("option", { name: "Onboarding checklist" })).toBeFocused()
  // Deleting hands focus to the card's neighbor.
  await page.keyboard.press("Enter")
  await page.getByRole("dialog", { name: "Onboarding checklist" }).getByRole("button", { name: "Delete card" }).click()
  await expect(card(page, "Onboarding checklist")).toHaveCount(0)
  await expect(card(page, "Ship the beta")).toBeFocused()
})

test("Add a card opens a form; the page adds the card; Escape closes it", async ({ page }) => {
  await board(page).getByRole("button", { name: "Add a card to Backlog" }).click()
  const title = page.getByRole("textbox", { name: "Title of the new card in Backlog" })
  await expect(title).toBeFocused()
  await title.fill("Write release notes")
  await page.keyboard.press("Enter")
  await expect(column(page, "Backlog").getByRole("option", { name: "Write release notes" })).toBeVisible()
  await expect(title).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(board(page).getByRole("button", { name: "Add a card to Backlog" })).toBeFocused()
  // A full column has no form, and says so.
  await expect(board(page).getByRole("button", { name: "Add a card to In review" })).toHaveCount(0)
})

test("search hides cards in place; focus skips them", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search cards" }).fill("login")
  await expect(card(page, "Fix the login redirect")).toBeVisible()
  await expect(card(page, "Dark mode for charts")).toBeHidden()
  await expect(board(page)).toHaveAttribute("data-filtered", "")
  await card(page, "Fix the login redirect").focus()
  await page.keyboard.press("ArrowDown")
  await expect(card(page, "Fix the login redirect")).toBeFocused()
  // Moves wait while cards are hidden: a carried card would pass cards nobody can see.
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  await expect(column(page, "In review").getByRole("option", { name: "Fix the login redirect" })).toBeFocused()
  await expect(board(page)).not.toHaveAttribute("data-moving", "")
})

test("agents move cards by the names people see, within the limits, and read where cards are", async ({ page }) => {
  const moved = await act(page, [{ ref: "Sprint board", action: "moveCard", args: ["Ship the beta", "Backlog"] }])
  expect(moved.ok, moved.error?.message).toBe(true)
  await expect(column(page, "Backlog").getByRole("option", { name: "Ship the beta" })).toBeVisible()
  const full = await act(page, [{ ref: "Sprint board", action: "moveCard", args: ["Ship the beta", "In review"] }])
  expect(full.ok).toBe(false)
  expect(full.error?.message).toContain("In review is full")
  const items = await page.evaluate(async () => {
    const found = await (window as unknown as { agent: Agent }).agent.query({ within: "Sprint board" })
    return found.find((c) => c.label === "Sprint board")?.items?.map((i) => i.label)
  })
  expect(items).toContain("Rate-limit the public API (Doing, Ada Lovelace)")
})

type Live = HTMLElement & {
  cards: Record<string, Record<string, unknown>>
  columns: { id: string; title: string; limit?: number }[]
  lanes: Record<string, string[]>
  hiddenCards: string[]
  renderCard?: (card: { title: string }) => Node
}
const live = (page: Page, run: (el: Live) => unknown) => board(page).evaluate((el, code) => new Function("el", `return (${code})(el)`)(el), run.toString())

test("a card whose details change is patched in place and keeps focus; `today` is an attribute", async ({ page }) => {
  await card(page, "Ship the beta").focus()
  await live(page, (el) => (el.cards = { ...el.cards, c7: { ...el.cards.c7, title: "Ship the beta now", due: "2026-11-10" } }))
  await expect(card(page, "Ship the beta now")).toBeFocused()
  await expect(card(page, "Ship the beta now")).toHaveAccessibleDescription("Overdue Nov 10")
  await board(page).evaluate((el) => el.setAttribute("today", "2026-11-01"))
  await expect(card(page, "Ship the beta now")).toHaveAccessibleDescription("Due Nov 10")
  await expect(card(page, "Ship the beta now")).toBeFocused()
})

test("renamed columns and a new renderCard redraw; counts include every id, in words", async ({ page }) => {
  await live(page, (el) => (el.columns = el.columns.map((c) => (c.id === "backlog" ? { ...c, title: "Icebox" } : c))))
  await expect(column(page, "Icebox")).toBeVisible()
  await expect(board(page).getByRole("heading", { name: "Icebox" })).toBeVisible()
  await expect(board(page).getByRole("button", { name: "Add a card to Icebox" })).toBeVisible()
  await live(page, (el) => (el.renderCard = (c) => Object.assign(document.createElement("strong"), { textContent: c.title.toUpperCase() })))
  await expect(board(page).locator("strong", { hasText: "SHIP THE BETA" })).toBeVisible()
  const count = board(page).locator('[data-column="done"] .board-column-count')
  const shown = count.locator('[aria-hidden="true"]')
  const spoken = count.locator(".uiset-visually-hidden")
  await expect(shown).toHaveText("1")
  await expect(spoken).toHaveText("1 card")
  await live(page, (el) => (el.lanes = { ...el.lanes, done: [...(el.lanes.done ?? []), "ghost"] }))
  await expect(shown).toHaveText("2")
  await expect(spoken).toHaveText("2 cards")
  // What `lanes` reads back is a copy: changing it changes nothing.
  expect(await live(page, (el) => (el.lanes.done!.push("c1"), el.lanes.done!.includes("c1")))).toBe(false)
})

test("without addable and openable the board neither adds nor opens, and agents are told", async ({ page }) => {
  await board(page).evaluate((el) => (el.removeAttribute("addable"), el.removeAttribute("openable")))
  await expect(board(page).getByRole("button", { name: /Add a card/ })).toHaveCount(0)
  await card(page, "Ship the beta").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const opened = await act(page, [{ ref: "Sprint board", action: "openCard", args: ["Ship the beta"] }])
  expect(opened.ok).toBe(false)
  const added = await act(page, [{ ref: "Sprint board", action: "addCard", args: ["Backlog", "Sneaky card"] }])
  expect(added.ok).toBe(false)
  await expect(card(page, "Sneaky card")).toHaveCount(0)
})

test("the page's own description stays; the board's help is added to it", async ({ page }) => {
  await board(page).evaluate((el) => {
    const note = Object.assign(document.createElement("p"), { id: "board-note", textContent: "Team Atlas." })
    el.before(note)
    el.setAttribute("aria-describedby", "board-note")
  })
  await expect(board(page)).toHaveAccessibleDescription(/^Team Atlas\. Arrow keys move/)
})

test("a focused card the filter hides hands focus on; a stale hidden id doesn't stop moves", async ({ page }) => {
  await card(page, "Keyboard shortcuts sheet").focus()
  await live(page, (el) => (el.hiddenCards = ["c2"]))
  await expect(card(page, "Audit the cookie banner")).toBeFocused()
  await live(page, (el) => (el.hiddenCards = ["nobody"]))
  await expect(board(page)).not.toHaveAttribute("data-filtered", "")
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  await expect(board(page)).toHaveAttribute("data-moving", "")
  await page.keyboard.press("Escape")
})

test("Undo takes back its own move only; a deleted card comes back with Undo", async ({ page }) => {
  const toastFor = (text: string) => page.getByRole("region", { name: "Notifications" }).locator("ui-toast", { hasText: text })
  await act(page, [{ ref: "Sprint board", action: "moveCard", args: ["Keyboard shortcuts sheet", "Done"] }])
  await act(page, [{ ref: "Sprint board", action: "moveCard", args: ["Ship the beta", "Backlog"] }])
  await toastFor("Keyboard shortcuts sheet").getByRole("button", { name: "Undo" }).click()
  await expect(column(page, "Backlog").getByRole("option", { name: "Keyboard shortcuts sheet" })).toBeVisible()
  await expect(column(page, "Backlog").getByRole("option", { name: "Ship the beta" })).toBeVisible()
  await card(page, "Dark mode for charts").focus()
  await page.keyboard.press("Enter")
  await page.getByRole("dialog", { name: "Dark mode for charts" }).getByRole("button", { name: "Delete card" }).click()
  await expect(card(page, "Dark mode for charts")).toHaveCount(0)
  await toastFor("Deleted").getByRole("button", { name: "Undo" }).click()
  await expect(column(page, "In review").getByRole("option", { name: "Dark mode for charts" })).toBeFocused()
})
