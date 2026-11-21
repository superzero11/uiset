import { screen, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/button"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/toast"
import { toast } from "@ui-sdk/web"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Board as a web element (web/board.html), on a page with no React: data in, events out,
// driven through the web agent bridge. Keys, drags and focus stay in the browser. Moved from
// tests/e2e/web/board.spec.ts.

const board = () => screen.getByRole("group", { name: "Sprint board" }) as Live
const column = (name: string) => within(board()).getByRole("listbox", { name })
const open = () => openWebPage("board.html", "board-demo.ts")
type Agent = { query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]> }
type Live = HTMLElement & {
  cards: Record<string, Record<string, unknown>>
  columns: { id: string; title: string; limit?: number }[]
  lanes: Record<string, string[]>
  renderCard?: (card: { title: string }) => Node
}

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  // Toasts outlive the page's markup: each test starts with none.
  toast.dismiss()
  document.body.innerHTML = ""
})

test("agents move cards by the names people see, within the limits, and read where cards are", async () => {
  const bridge = await open()
  const moved = await bridge.run("Sprint board", "moveCard", "Ship the beta", "Backlog")
  expect(moved.ok, moved.error?.message).toBe(true)
  expect(within(column("Backlog")).getByRole("option", { name: "Ship the beta" })).toBeTruthy()
  const full = await bridge.run("Sprint board", "moveCard", "Ship the beta", "In review")
  expect(full.ok).toBe(false)
  expect(full.error?.message).toContain("In review is full")
  const found = await (bridge.agent as unknown as Agent).query({ within: "Sprint board" })
  const items = found.find((c) => c.label === "Sprint board")?.items?.map((i) => i.label)
  expect(items).toContain("Rate-limit the public API (Doing, Ada Lovelace)")
})

test("renamed columns and a new renderCard redraw; counts include every id, in words", async () => {
  await open()
  board().columns = board().columns.map((c) => (c.id === "backlog" ? { ...c, title: "Icebox" } : c))
  await settle()
  expect(column("Icebox")).toBeTruthy()
  expect(within(board()).getByRole("heading", { name: "Icebox" })).toBeTruthy()
  expect(within(board()).getByRole("button", { name: "Add a card to Icebox" })).toBeTruthy()
  board().renderCard = (c) => Object.assign(document.createElement("strong"), { textContent: c.title.toUpperCase() })
  await settle()
  expect([...board().querySelectorAll("strong")].some((s) => s.textContent === "SHIP THE BETA")).toBe(true)
  const count = () => board().querySelector('[data-column="done"] .board-column-count')!
  const shown = () => count().querySelector('[aria-hidden="true"]')!.textContent
  const spoken = () => count().querySelector(".uiset-visually-hidden")!.textContent
  expect(shown()).toBe("1")
  expect(spoken()).toBe("1 card")
  board().lanes = { ...board().lanes, done: [...(board().lanes.done ?? []), "ghost"] }
  await settle()
  expect(shown()).toBe("2")
  expect(spoken()).toBe("2 cards")
  // What `lanes` reads back is a copy: changing it changes nothing.
  board().lanes.done!.push("c1")
  expect(board().lanes.done!.includes("c1")).toBe(false)
})

test("the page's own description stays; the board's help is added to it", async () => {
  await open()
  const el = board()
  el.before(Object.assign(document.createElement("p"), { id: "board-note", textContent: "Team Atlas." }))
  el.setAttribute("aria-describedby", "board-note")
  await settle()
  expect(screen.getByRole("group", { name: "Sprint board", description: /^Team Atlas\. Arrow keys move/ })).toBe(el)
})
