// The Board demo's own script, as an app would write it: data in, events out.
import type { TransferLists } from "@ui-sdk/core"
import { createAgent } from "@ui-sdk/web/agent"
import { toast } from "@ui-sdk/web"
import type { BoardCardData, BoardElement } from "./board"

type BoardApi = {
  moveCard: (card: string, column: string, position?: number) => boolean
  hasRoom: (card: string, column: string) => boolean
  cardElement: (key: string) => HTMLElement | undefined
  neighbor: (key: string) => string | undefined
}
type Board = BoardElement & { lanes: TransferLists; api: BoardElement["api"] & BoardApi }

const board = document.getElementById("board") as Board
const columns = [
  { id: "backlog", title: "Backlog" },
  { id: "doing", title: "Doing", limit: 3 },
  { id: "review", title: "In review", limit: 2 },
  { id: "done", title: "Done" },
]
let cards: Record<string, BoardCardData> = {
  c1: { id: "c1", title: "Audit the cookie banner", labels: ["Legal"], due: "2026-11-12", assignee: "Grace Hopper" },
  c2: { id: "c2", title: "Keyboard shortcuts sheet", labels: ["Docs"] },
  c3: { id: "c3", title: "Rate-limit the public API", priority: "urgent", assignee: "Ada Lovelace" },
  c4: { id: "c4", title: "Onboarding checklist", due: "2026-11-20" },
  c5: { id: "c5", title: "Fix the login redirect", priority: "high", assignee: "Linus Pauling" },
  c6: { id: "c6", title: "Dark mode for charts", labels: ["Design"] },
  c7: { id: "c7", title: "Ship the beta" },
}
let next = 8

board.columns = columns
board.cards = cards
board.lanes = { backlog: ["c1", "c2"], doing: ["c3", "c4"], review: ["c5", "c6"], done: ["c7"] }

// Every move, by a person or an agent, can be taken back: Undo moves that one card back
// where it was, and leaves every other move since alone.
// Focus goes to the card once the toast that was pressed has closed (a closing toast hands
// focus to the next one).
const focusSoon = (key: string) => requestAnimationFrame(() => requestAnimationFrame(() => board.api?.focusCard(key)))
let undoing = false
board.addEventListener("laneschange", (event) => {
  const { reason, key, from, to } = (event as CustomEvent<{ value: TransferLists; reason: string; key: string; from: string; to: string }>).detail
  if ((reason === "imperative" && !key) || undoing) return
  const at = board.lanes[from]?.indexOf(key) ?? -1
  if (at < 0) return
  queueMicrotask(() =>
    toast(`Moved “${cards[key]?.title}”`, {
      action: {
        label: "Undo",
        onAction: () => {
          if (!board.lanes[to]?.includes(key)) return
          undoing = true
          try {
            board.api.moveCard(key, from, at + 1)
            focusSoon(key)
          } catch (failure) {
            toast((failure as Error).message)
          } finally {
            undoing = false
          }
        },
      },
    }),
  )
})

// The page adds the card; the board drew the form and checked the column's room.
board.addEventListener("add", (event) => {
  const { value: column, title } = (event as CustomEvent<{ value: string; title: string }>).detail
  const id = `c${next++}`
  cards = { ...cards, [id]: { id, title } }
  board.cards = cards
  board.lanes = { ...board.lanes, [column]: [...(board.lanes[column] ?? []), id] }
})

// Search hides cards that don't match; they keep their places.
document.getElementById("search")!.addEventListener("input", (event) => {
  const query = (event.target as HTMLInputElement).value.trim().toLowerCase()
  board.hiddenCards = query ? Object.values(cards).filter((c) => !c.title.toLowerCase().includes(query)).map((c) => c.id) : []
})

// Card details in UI SDK's dialog.
const dialog = document.getElementById("card-dialog") as HTMLElement & { open: boolean; api: { open: () => Promise<unknown> } }
const content = dialog.querySelector("ui-dialog-content")!
const error = document.getElementById("card-error")!
let current: string | null = null
// A deleted card's neighbor, focused once the dialog has closed.
let focusAfter: string | undefined
// Where focus goes when the dialog closes: a selector, on web components.
const returnTo = (key: string | undefined) =>
  key ? content.setAttribute("final-focus", `uiset-board-card[value="${CSS.escape(key)}"]`) : content.removeAttribute("final-focus")

const columnOf = (key: string) => columns.find((c) => board.lanes[c.id]?.includes(key))

function show(key: string) {
  current = key
  returnTo(key)
  const card = cards[key]!
  document.getElementById("card-title")!.textContent = card.title
  document.getElementById("card-where")!.textContent = `${columnOf(key)?.title ?? "No"} column.`
  error.hidden = true
  const moves = document.getElementById("card-moves")!
  moves.replaceChildren(
    ...columns
      .filter((c) => c.id !== columnOf(key)?.id)
      .map((column) => {
        const wrap = document.createElement("ui-button")
        const button = document.createElement("button")
        button.type = "button"
        button.dataset.variant = "outline"
        // A full column can't take it: the button says so, and stays where it was.
        const room = board.api.hasRoom(key, column.id)
        button.textContent = room ? `Move to ${column.title}` : `${column.title} is full`
        if (!room) {
          wrap.setAttribute("disabled", "")
          wrap.setAttribute("focusable-when-disabled", "")
        }
        button.addEventListener("click", () => {
          try {
            board.api.moveCard(key, column.id)
            dialog.open = false
          } catch (failure) {
            error.textContent = (failure as Error).message
            error.hidden = false
          }
        })
        wrap.append(button)
        return wrap
      }),
  )
  focusAfter = undefined
  void dialog.api.open().then(() => focusAfter && board.api.focusCard(focusAfter))
}

board.addEventListener("open", (event) => show((event as CustomEvent<{ value: string }>).detail.value))

// Deleting takes the card off at once, and a toast offers it back where it was.
document.getElementById("card-delete")!.addEventListener("click", () => {
  if (!current) return
  const key = current
  // The dialog read `final-focus` as it opened, and this card is going: its neighbor gets
  // focus once the dialog has closed.
  focusAfter = board.api.neighbor(key)
  returnTo(undefined)
  const column = columnOf(key)!.id
  const at = board.lanes[column]!.indexOf(key)
  const card = cards[key]!
  board.lanes = { ...board.lanes, [column]: board.lanes[column]!.filter((k) => k !== key) }
  dialog.open = false
  toast(`Deleted “${card.title}”`, {
    action: {
      label: "Undo",
      onAction: () => {
        const lane = [...(board.lanes[column] ?? [])]
        lane.splice(Math.min(at, lane.length), 0, key)
        board.lanes = { ...board.lanes, [column]: lane }
        focusSoon(key)
      },
    },
  })
})

Object.assign(window, { agent: createAgent() })
