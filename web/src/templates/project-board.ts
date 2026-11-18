// The Project board page as web elements: the sprint's progress, and its issues as a board
// or a list that share one set of cards and lanes. The board's card details, a new-issue
// form and Undo on moves are the page's own, on UI SDK's dialogs and toasts. The board stays
// while the list shows, so its column limits hold for edits made from the list. The
// project is the React template's.
import "@ui-sdk/web/alert-dialog"
import "@ui-sdk/web/avatar"
import "@ui-sdk/web/checkbox"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/meter"
import "@ui-sdk/web/segmented-control"
import "@ui-sdk/web/select"
import "@ui-sdk/web/textarea"
import "@ui-sdk/web/toast"
import type { TransferLists } from "@ui-sdk/core"
import { toast } from "@ui-sdk/web"
import { createAgent } from "@ui-sdk/web/agent"
import {
  columnOf,
  dateOf,
  dueDay,
  initials,
  matches,
  priorities,
  priorityOf,
  progress,
  projects,
  sampleColumns,
  sampleIssues,
  sampleLabels,
  sampleLanes,
  samplePeople,
  type Issue,
} from "@/registry/uiset/ui/templates/project-sample"
import type { BoardElement } from "../board"
import type { WebColumn } from "../data-grid"
import { h } from "../dom"
import { iconElement } from "../uiset"
import { decorateIcons } from "./common"

type BoardApi = {
  moveCard: (card: string, column: string, position?: number) => boolean
  hasRoom: (card: string, column: string) => boolean
  focusCard: (key: string) => void
  neighbor: (key: string) => string | undefined
}
type Board = BoardElement & { lanes: TransferLists; api: BoardElement["api"] & BoardApi }
type Grid = HTMLElement & { rows: unknown[]; columns: WebColumn[]; getRowId: (row: unknown) => string }
type Popup = HTMLElement & { open: boolean; api: { open: () => Promise<unknown>; close: () => boolean } }
type Row = Issue & { status: string; column: string }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const columns = sampleColumns
const people = samplePeople
const labels = sampleLabels
const today = "2026-11-16"
const doneColumn = columns.at(-1)!.id
let cards: Record<string, Issue> = { ...sampleIssues }
let lanes: TransferLists = Object.fromEntries(columns.map((c) => [c.id, [...(sampleLanes[c.id] ?? [])]]))
let view: "board" | "list" = "board"
let query = ""
let person: string | null = null

const board = $<Board>("board")
const grid = $<Grid>("issues")
const titleOf = (column: string) => columns.find((c) => c.id === column)?.title ?? column
const badge = (tone: string, text: string) => h("span", { class: "badge", "data-tone": tone }, text)
const option = (value: string, text: string, disabled = false) => h("ui-select-item", { value, disabled }, text)
decorateIcons()

/* ------------------------------------------------------------ the frame */

$("projects").replaceChildren(
  ...projects.map((p) =>
    h(
      "li",
      null,
      h(
        "a",
        { href: `#${p.id}`, class: "sidebar-link", "aria-current": p.id === "website" ? "page" : null },
        h("span", { class: "sidebar-icon" }, iconElement(p.icon)),
        h("span", { class: "sidebar-label" }, p.label),
      ),
    ),
  ),
)
$("members").replaceChildren(
  ...people.map((p) => h("li", null, h("ui-avatar", { role: "img", "aria-label": p, class: "project-member" }, h("ui-avatar-fallback", null, initials(p))))),
)
$("person-list").replaceChildren(option("anyone", "Anyone"), ...people.map((p) => option(p, p)))

/* ---------------------------------------------------------- both views */

grid.columns = [
  { id: "title", header: "Title", value: (r) => (r as Row).title, width: 280, hideable: false, pinned: true },
  {
    id: "status",
    header: "Status",
    value: (r) => (r as Row).status,
    width: 130,
    render: (r) => badge((r as Row).column === doneColumn ? "success" : (r as Row).column === columns[0]!.id ? "neutral" : "info", (r as Row).status),
  },
  { id: "assignee", header: "Assignee", value: (r) => (r as Row).assignee ?? "", text: (r) => (r as Row).assignee ?? "Nobody", width: 170 },
  {
    id: "priority",
    header: "Priority",
    type: "number",
    align: "start",
    value: (r) => priorityOf(r as Row).rank,
    text: (r) => priorityOf(r as Row).label,
    width: 110,
    render: (r) => badge(priorityOf(r as Row).tone, priorityOf(r as Row).label),
  },
  {
    id: "due",
    header: "Due",
    type: "date",
    value: (r) => ((r as Row).due ? dateOf((r as Row).due!) : null),
    text: (r) => ((r as Row).due ? dueDay.format(dateOf((r as Row).due!)) : ""),
    width: 120,
    render: (r) => {
      const { due, column } = r as Row
      if (!due) return ""
      return due < today && column !== doneColumn ? h("span", { class: "project-overdue" }, `Overdue, ${dueDay.format(dateOf(due))}`) : dueDay.format(dateOf(due))
    },
  },
]
grid.getRowId = (r) => (r as Row).id
board.columns = columns
board.cards = cards
board.lanes = lanes

const progressMeter = $<HTMLElement & { format: (value: number) => string }>("progress")

function render() {
  const { done, total, text } = progress(lanes, columns)
  progressMeter.setAttribute("max", String(Math.max(total, 1)))
  progressMeter.setAttribute("value", String(done))
  progressMeter.format = () => text
  const shown = (issue: Issue) => matches(issue, query, person)
  board.cards = cards
  board.hiddenCards = Object.values(cards).filter((c) => !shown(c)).map((c) => c.id)
  grid.rows = columns.flatMap((c) => (lanes[c.id] ?? []).flatMap((id) => (cards[id] && shown(cards[id]!) ? [{ ...cards[id]!, status: c.title, column: c.id }] : [])))
  grid.setAttribute("empty", query || person ? "No issues match. Clear the search or choose Anyone." : "No issues yet.")
  $("board-view").hidden = view !== "board"
  $("list-view").hidden = view !== "list"
}

$<HTMLElement & { value: string }>("search").addEventListener("valuechange", (event) => {
  query = (event.currentTarget as HTMLElement & { value: string }).value
  render()
})
$("person").addEventListener("valuechange", (event) => {
  const value = (event as CustomEvent<{ value: string | null }>).detail.value
  person = !value || value === "anyone" ? null : String(value)
  render()
})
$("view").addEventListener("valuechange", (event) => {
  const value = (event as CustomEvent<{ value: string | null }>).detail.value
  if (value === "board" || value === "list") view = value
  render()
})

/* ------------------------------------------------------- moves and Undo */

// Every move, by a person, an agent or the dialog, can be taken back: Undo moves that one
// card back where it was and leaves every other move since alone. Focus goes to the card at
// once: a toast that no longer has focus doesn't hand it on as it closes.
let undoing = false
board.addEventListener("laneschange", (event) => {
  const { value, key, from, to } = (event as CustomEvent<{ value: TransferLists; key: string; from: string; to: string }>).detail
  const at = lanes[from]?.indexOf(key) ?? -1
  lanes = Object.fromEntries(Object.entries(value).map(([column, keys]) => [column, [...keys]]))
  queueMicrotask(render)
  if (!key || from === to || undoing || at < 0) return
  queueMicrotask(() =>
    toast(`Moved “${cards[key]?.title}” to ${titleOf(to)}`, {
      action: {
        label: "Undo",
        onAction: () => {
          if (!board.lanes[to]?.includes(key)) return
          undoing = true
          try {
            board.api.moveCard(key, from, at + 1)
            if (view === "board") board.api.focusCard(key)
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

// "Add a card" under a column: the page adds it; the board drew the form and checked the room.
board.addEventListener("add", (event) => {
  const { value: column, title } = (event as CustomEvent<{ value: string; title: string }>).detail
  const issue: Issue = { id: crypto.randomUUID(), title, priority: "medium" }
  cards = { ...cards, [issue.id]: issue }
  lanes = { ...lanes, [column]: [...(lanes[column] ?? []), issue.id] }
  board.cards = cards
  board.lanes = lanes
  render()
})

/* ------------------------------------------------------- issue details */

const dialog = $<Popup>("card-dialog")
const content = dialog.querySelector("ui-dialog-content")!
const confirm = $<Popup>("confirm-delete")
let current: string | null = null
// A deleted card's neighbor, focused once the dialog has closed.
let focusAfter: string | undefined

// Fills a form's selects from the project: columns (full ones can't be chosen), people
// and priorities.
function fillSelects(form: HTMLFormElement, key: string, values: { column: string; assignee: string; priority: string }) {
  for (const select of form.querySelectorAll<HTMLElement>("[data-options]")) {
    const kind = select.dataset.options
    const items =
      kind === "column"
        ? columns.map((c) => {
            const full = c.id !== values.column && !board.api.hasRoom(key, c.id)
            return option(c.id, full ? `${c.title} (full)` : c.title, full)
          })
        : kind === "assignee"
          ? [option("", "Nobody"), ...people.map((p) => option(p, p))]
          : [...priorities].reverse().map((p) => option(p.value, p.label))
    select.querySelector("ui-select-content")!.replaceChildren(...items)
    select.setAttribute("default-value", kind === "column" ? values.column : kind === "assignee" ? values.assignee : values.priority)
  }
}

function show(key: string) {
  const card = cards[key]
  const column = columnOf(lanes, key)
  if (!card || !column) return
  current = key
  // Where focus goes when it closes: the card on the board; the list focuses its grid.
  if (view === "board") content.setAttribute("final-focus", `uiset-board-card[value="${CSS.escape(key)}"]`)
  else content.removeAttribute("final-focus")
  $("card-title").textContent = card.title
  $("card-where").textContent = `${titleOf(column)} column.`
  const form = ($<HTMLTemplateElement>("card-form").content.cloneNode(true) as DocumentFragment).querySelector("form")!
  form.setAttribute("aria-label", `Edit ${card.title}`)
  form.querySelector<HTMLInputElement>('input[name="card-title"]')!.value = card.title
  form.querySelector<HTMLTextAreaElement>('textarea[name="card-description"]')!.value = card.description ?? ""
  form.querySelector<HTMLInputElement>('input[name="card-due"]')!.value = card.due ?? ""
  fillSelects(form, key, { column, assignee: card.assignee ?? "", priority: card.priority ?? "medium" })
  const group = form.querySelector("ui-checkbox-group")!
  group.setAttribute("default-value", (card.labels ?? []).filter((l) => labels.includes(l)).join(","))
  group.replaceChildren(...labels.map((l) => h("label", { "data-slot": "label", class: "board-dialog-label" }, h("ui-checkbox", { value: l }, h("ui-checkbox-indicator")), l)))
  const error = form.querySelector<HTMLElement>(".board-dialog-error")!
  form.querySelector("[data-delete]")!.addEventListener("click", () => {
    $("confirm-title").textContent = `Delete “${card.title}”?`
    $("confirm-delete-card").setAttribute("data-agent-confirm", `Deletes the card “${card.title}”`)
    void confirm.api.open()
  })
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const to = String(data.get("card-column") || column)
    // Move first: a full column refuses, and nothing is saved.
    if (to !== column) {
      try {
        board.api.moveCard(key, to)
      } catch (failure) {
        error.textContent = (failure as Error).message
        error.hidden = false
        return
      }
    }
    const chosen = data.getAll("card-labels").map(String)
    cards = {
      ...cards,
      [key]: {
        ...card,
        title: String(data.get("card-title")),
        description: String(data.get("card-description") ?? "") || undefined,
        due: String(data.get("card-due") ?? "") || undefined,
        priority: (String(data.get("card-priority") || "medium") as Issue["priority"]),
        assignee: String(data.get("card-assignee") ?? "") || undefined,
        labels: [...(card.labels ?? []).filter((l) => !labels.includes(l)), ...chosen],
      },
    }
    render()
    dialog.open = false
  })
  $("card-form-slot").replaceChildren(form)
  decorateIcons(form)
  focusAfter = undefined
  // From the list, focus goes back to the grid's row (the dialog's default).
  const from = view
  void dialog.api.open().then(() => {
    if (from === "board" && focusAfter) board.api.focusCard(focusAfter)
  })
}

board.addEventListener("open", (event) => show((event as CustomEvent<{ value: string }>).detail.value))
grid.addEventListener("rowaction", (event) => show((event as CustomEvent<{ value: string }>).detail.value))

// Deleting takes the card off at once, and a toast offers it back where it was.
$("confirm-delete-card").addEventListener("click", () => {
  if (!current) return
  const key = current
  const column = columnOf(lanes, key)
  if (!column) return
  // The dialog read `final-focus` as it opened, and this card is going: its neighbor gets
  // focus once the dialog has closed.
  focusAfter = board.api.neighbor(key)
  content.removeAttribute("final-focus")
  const at = lanes[column]!.indexOf(key)
  const card = cards[key]!
  lanes = { ...lanes, [column]: lanes[column]!.filter((k) => k !== key) }
  board.lanes = lanes
  render()
  dialog.open = false
  toast(`Deleted “${card.title}”`, {
    action: {
      label: "Undo",
      onAction: () => {
        const lane = [...(lanes[column] ?? [])]
        lane.splice(Math.min(at, lane.length), 0, key)
        lanes = { ...lanes, [column]: lane }
        board.lanes = lanes
        render()
      },
    },
  })
})

/* ------------------------------------------------------------ new issue */

const creator = $<Popup>("new-issue-dialog")
$("new-issue").addEventListener("click", () => {
  // Each opening gets a fresh form, so a second "New issue" starts empty.
  const form = ($<HTMLTemplateElement>("new-issue-form").content.cloneNode(true) as DocumentFragment).querySelector("form")!
  fillSelects(form, "", { column: columns[0]!.id, assignee: "", priority: "medium" })
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const column = String(data.get("issue-column") || columns[0]!.id)
    if (!board.api.hasRoom("", column)) {
      toast(`${titleOf(column)} is full. Finish an issue there first.`)
      return
    }
    const issue: Issue = {
      id: crypto.randomUUID(),
      title: String(data.get("issue-title")),
      assignee: String(data.get("issue-assignee") ?? "") || undefined,
      priority: (String(data.get("issue-priority") || "medium") as Issue["priority"]),
      due: String(data.get("issue-due") ?? "") || undefined,
      labels: [],
    }
    cards = { ...cards, [issue.id]: issue }
    lanes = { ...lanes, [column]: [...(lanes[column] ?? []), issue.id] }
    board.cards = cards
    board.lanes = lanes
    render()
    creator.api.close()
    toast(`Added “${issue.title}” to ${titleOf(column)}`)
  })
  $("new-issue-slot").replaceChildren(form)
  void creator.api.open()
})

render()
Object.assign(window, { agent: createAgent() })
