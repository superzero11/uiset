// The Board for Web Components: <uiset-board> renders columns and cards from `columns`,
// `cards` and `lanes`, and redraws them as a card is carried, like the React Board. Card
// details, search and person filters are the page's own (UI SDK's dialog and fields): the
// board fires `open` and takes `hidden`.
import type { TransferLists } from "@ui-sdk/core"
import { createParts, type UiActionDetail, type UiDetailedChangeEvent, type UiElement } from "@ui-sdk/web"
import "@ui-sdk/web/avatar"
import "@ui-sdk/web/button"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import { boardPrimitive, keepDragPreviewInside, type BoardColumnSpec, type BoardControllerApi, type BoardLanesDetails } from "@/registry/uiset/ui/board/board"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/board/board.css"
import { glide } from "@/registry/uiset/ui/shell/glide"
import { attr, h, holdRender, isOn, place, uid } from "./dom"
import { scrollArea } from "./scroll"

type BoardCardData = {
  id: string
  title: string
  description?: string
  labels?: string[]
  assignee?: string
  /** An ISO date, like "2026-11-20". */
  due?: string
  priority?: "low" | "medium" | "high" | "urgent"
}

type BoardMessages = { help: string; empty: string; full: string; filtered?: string }

/** What `board.api` does from code. Each throws, saying why, when it can't. */
type BoardApi = BoardControllerApi & {
  /** Opens a card's details, as Enter does. */
  openCard(card: string): boolean
}

/** What `<uiset-board>` fires. A change event's `preventDefault()` refuses the change. */
type UISetBoardEvents = {
  /** A card moved: `value` is every lane; `key`, `from`, `to` and `index` say which and where. */
  laneschange: UiDetailedChangeEvent<TransferLists, BoardLanesDetails>
  /** Enter or a click on a card, with `openable`. */
  open: CustomEvent<{ value: string }>
  /** "Add a card" submitted, with `addable`: `value` is the column. */
  add: CustomEvent<{ value: string; title: string } & Pick<UiActionDetail, "waitUntil">>
}

type BoardElement = UiElement<UISetBoardEvents> & {
  columns?: BoardColumnSpec[]
  cards?: Record<string, BoardCardData>
  /** Which cards are in which column, in order. Reading gives a copy; set it to change the board. */
  lanes?: Record<string, string[]>
  messages?: Partial<BoardMessages>
  /** What screen readers hear after a card's title. Defaults to its priority, due date, person and labels. */
  describeCard?: (card: BoardCardData) => string
  /** A card's face, instead of the title, labels and details. */
  renderCard?: (card: BoardCardData) => Node
  /** Today, as an ISO date, for "overdue". */
  today?: string
  /** Cards a search or filter hides: they keep their places, focus skips them, moves wait. */
  hiddenCards?: string[]
  api?: BoardApi
}

type BoardInstance = {
  get: () => object
  subscribe: (run: () => void) => () => void
  api: { transfer: { lists: (state: object) => TransferLists } }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
const dueFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const dueText = (due: string) => dueFormat.format(new Date(`${due}T00:00:00Z`))
const overdue = (card: BoardCardData, today?: string) => !!(card.due && today && card.due < today)

const words = (el: BoardElement): BoardMessages => ({
  help: "Arrow keys move between cards and columns. Space picks a card up; arrows move it; Space drops it; Escape puts it back. Enter opens a card.",
  empty: "No cards",
  full: "Full: finish a card to add more.",
  ...el.messages,
})

function describe(card: BoardCardData, today?: string) {
  return [
    card.priority === "urgent" ? "Urgent" : card.priority === "high" ? "High priority" : undefined,
    card.due ? `${overdue(card, today) ? "Overdue" : "Due"} ${dueText(card.due)}` : undefined,
    card.assignee,
    card.labels?.length ? `Labels: ${card.labels.join(", ")}` : undefined,
  ]
    .filter(Boolean)
    .join(". ")
}

const badge = (tone: string, text: string) => h("span", { class: "badge", "data-tone": tone }, text)

/** A card's face: title, labels, due date and the person on it. */
function face(card: BoardCardData, today?: string) {
  const late = overdue(card, today)
  const urgent = card.priority === "high" || card.priority === "urgent"
  const avatar =
    card.assignee &&
    h("ui-avatar", { class: "board-card-avatar", role: "img", "aria-label": card.assignee }, h("ui-avatar-fallback", null, initials(card.assignee)))
  return [
    h("span", { class: "board-card-title" }, card.title),
    card.labels?.length ? h("span", { class: "board-card-labels" }, ...card.labels.map((label) => badge("neutral", label))) : null,
    card.due || card.assignee || urgent
      ? h(
          "span",
          { class: "board-card-meta" },
          urgent ? badge(card.priority === "urgent" ? "danger" : "warning", card.priority === "urgent" ? "Urgent" : "High") : null,
          card.due ? h("span", { class: "board-card-due", "data-overdue": late }, late ? "Overdue, " : "Due ", dueText(card.due)) : null,
          avatar,
        )
      : null,
  ]
}

/** A boolean attribute, as UI SDK reads them: on when present, unless it says "false". */

// A function's identity, so a new renderCard or describeCard draws cards again.
const fnIds = new WeakMap<object, number>()
let nextFn = 1
const fnId = (fn?: object) => (fn ? (fnIds.get(fn) ?? (fnIds.set(fn, nextFn++), nextFn - 1)) : 0)

function defineBoard() {
  createParts(boardPrimitive, {
    root: {
      tag: "uiset-board",
      properties: ["cards", "messages", "describeCard", "renderCard", "hiddenCards"],
      // The primitive's `hidden` would hide the element's own `hidden`: it's `hiddenCards`
      // here. `today` is an attribute (and a property that reflects it).
      kinds: { hidden: null, today: "string", addable: "boolean", openable: "boolean" },
      state: {
        // A copy: changing what you read doesn't change the board until you set it.
        lanes: {
          get: (api) => Object.fromEntries(Object.entries(api.lanes() as TransferLists).map(([column, keys]) => [column, [...keys]])),
          set: (api, lanes: TransferLists) => api.setLanes(lanes),
        },
      },
      api: ["moveCard", "addCard", "openCard", "focusCard", "cardElement", "neighbor", "hasRoom"],
      // Cards are named by their titles, for announcements, and described to agents by where
      // they are and whose they are.
      options: (el) => {
        const board = el as BoardElement
        return {
          hidden: board.hiddenCards ?? [],
          filteredMessage: board.messages?.filtered,
          // Without `addable` or `openable`, the board doesn't add or open cards, and agents are told so.
          ...(isOn(el, "addable") ? {} : { onAdd: undefined }),
          ...(isOn(el, "openable") ? {} : { onOpen: undefined }),
          cardLabel: (key: string) => board.cards?.[key]?.title ?? key,
          items: (lanes: TransferLists) =>
            (board.columns ?? []).flatMap((column) =>
              (lanes[column.id] ?? []).map((key) => {
                const card = board.cards?.[key]
                const details = [column.title, card?.assignee, card?.due && `due ${card.due}`].filter(Boolean)
                return { value: key, label: `${card?.title ?? key} (${details.join(", ")})` }
              }),
            ),
        }
      },
      render: holdRender((el, instance) => {
        const board = el as BoardElement
        let view = views.get(board)
        if (!view) views.set(board, (view = new BoardView(board)))
        return view.attach(instance as unknown as BoardInstance)
      }),
    },
    column: "uiset-board-column",
    // The card's behavior sits on an inner element: the drag preview is a copy of that, not
    // of a part, so it doesn't look for a board it isn't in.
    card: { tag: "uiset-board-card", target: (el) => el.firstElementChild as HTMLElement | null, display: "contents" },
  })
}

type ColumnView = {
  column: BoardColumnSpec
  root: HTMLElement
  heading: HTMLElement
  count: HTMLElement
  spoken: HTMLElement
  list: HTMLElement
  empty: HTMLElement
  note: HTMLElement
  add: HTMLElement
}

type CardView = { part: HTMLElement; el: HTMLElement; sig: string; descriptionId: string }

// Each board keeps its columns and cards across renders (a property set renders again), so
// focus, an open form and the elements stay.
const views = new WeakMap<BoardElement, BoardView>()

class BoardView {
  private columns = new Map<string, ColumnView>()
  private cards = new Map<string, CardView>()
  private help: HTMLElement
  private lanes = h("div", { class: "board-lanes" })
  private area = scrollArea(this.lanes, { axis: "x", frame: { class: "board-frame" }, viewport: { class: "board-scroller", role: "group", "aria-label": "Columns" } }).root
  private instance?: BoardInstance
  private queued = false

  constructor(private el: BoardElement) {
    el.classList.add("board")
    // A dragged card's copy stays inside the board, keeping its look.
    keepDragPreviewInside(el)
    glide(el, ".board-card")
    this.help = h("p", { id: uid("board-help"), hidden: true })
    el.prepend(this.help, this.area)
    // These attributes change what's drawn, not the board's state: they draw again here.
    new MutationObserver(() => this.schedule()).observe(el, { attributes: true, attributeFilter: ["today", "addable", "openable", "aria-describedby"] })
  }

  attach(instance: BoardInstance) {
    this.instance = instance
    if (!this.help.isConnected) this.el.prepend(this.help)
    if (!this.area.isConnected) this.help.after(this.area)
    // Properties set together draw once.
    this.schedule()
    // The lanes as drawn follow the draft while a card is carried, at once.
    let last = instance.api.transfer.lists(instance.get())
    return instance.subscribe(() => {
      const now = instance.api.transfer.lists(instance.get())
      if (now === last) return
      last = now
      this.draw()
    })
  }

  private schedule() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      this.draw()
    })
  }

  private columnView(column: BoardColumnSpec): ColumnView {
    const headingId = uid("board-column")
    const heading = h("h3", { id: headingId, class: "board-column-title" })
    const count = h("span", { "aria-hidden": "true" })
    const spoken = h("span", { class: "uiset-visually-hidden" })
    const list = h("uiset-board-column", { value: column.id, class: "board-cards", "aria-labelledby": headingId })
    const empty = h("p", { class: "board-column-empty" })
    const note = h("p", { class: "board-column-note" })
    const add = h("div", { class: "board-add-slot" })
    const root = h("div", { class: "board-column", "data-column": column.id }, h("div", { class: "board-column-header" }, heading, h("span", { class: "board-column-count" }, count, spoken)), list, empty, add, note)
    const view: ColumnView = { column, root, heading, count, spoken, list, empty, note, add }
    this.addButton(view)
    return view
  }

  // "Add a card" opens a small form; the page adds the card when the board fires `add`.
  // Both read the column's current title, so a renamed column reads right.
  private addButton(view: ColumnView) {
    const button = h("button", { type: "button", class: "board-add", "data-variant": "ghost", onclick: () => this.addForm(view) }, iconElement("plus"), h("span", { "data-add-label": "" }, `Add a card to ${view.column.title}`))
    view.add.replaceChildren(h("ui-button", null, button))
    return button
  }

  private addForm(view: ColumnView) {
    const inputId = uid("board-add")
    const error = h("p", { class: "board-add-error", role: "alert", hidden: true })
    const input = h("input", { id: inputId, name: "title", required: true, autocomplete: "off", placeholder: "What needs doing?" }) as HTMLInputElement
    const close = () => this.addButton(view).focus()
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      close()
    })
    const form = h(
      "form",
      {
        class: "board-add-form",
        "aria-label": `New card in ${view.column.title}`,
        onsubmit: (event: Event) => {
          event.preventDefault()
          const text = input.value.trim()
          if (!text) return
          try {
            this.el.api?.addCard(view.column.id, text)
            error.hidden = true
            input.removeAttribute("aria-invalid")
            input.value = ""
          } catch (failure) {
            error.textContent = (failure as Error).message
            error.hidden = false
            input.setAttribute("aria-invalid", "true")
          }
        },
      },
      h("ui-field", { name: "title" }, h("ui-field-label", { class: "uiset-visually-hidden", for: inputId, "data-add-label": "" }, `Title of the new card in ${view.column.title}`), h("ui-input", null, input), error),
      h(
        "div",
        { class: "board-add-actions" },
        h("ui-button", null, h("button", { type: "submit" }, "Add card")),
        h("ui-button", null, h("button", { type: "button", "data-variant": "ghost", onclick: close }, "Done adding")),
      ),
    )
    view.add.replaceChildren(form)
    input.focus()
  }

  private today() {
    return this.el.today ?? this.el.getAttribute("today") ?? undefined
  }

  private cardView(key: string, card: BoardCardData, hidden: boolean) {
    const el = this.el
    const today = this.today()
    const description = el.describeCard ? el.describeCard(card) : describe(card, today)
    const sig = JSON.stringify([card, description, today, fnId(el.renderCard)])
    let view = this.cards.get(key)
    if (!view) {
      const inner = h("div", { class: "board-card" })
      const part = h("uiset-board-card", { value: key }, inner)
      this.cards.set(key, (view = { part, el: inner, sig: "", descriptionId: uid("board-card") }))
    }
    attr(view.part, "filtered", hidden)
    if (view.sig !== sig) {
      // A card whose details changed is filled again in place: the same element, so it
      // keeps focus and a carry in progress.
      view.sig = sig
      view.el.setAttribute("aria-label", card.title)
      attr(view.el, "aria-describedby", description ? view.descriptionId : null)
      view.el.replaceChildren(
        ...(el.renderCard ? [el.renderCard(card)] : face(card, today).filter((node): node is HTMLElement => !!node)),
        ...(description ? [h("span", { id: view.descriptionId, hidden: true }, description)] : []),
        h("span", { class: "board-card-handle", "data-board-handle": "", "aria-hidden": "true" }, iconElement("grip")),
      )
    }
    return view.part
  }

  draw() {
    const el = this.el
    const instance = this.instance
    if (!instance) return
    // The page's own description stays; the board's help goes after it.
    const described = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== this.help.id)
    attr(el, "aria-describedby", [...described, this.help.id].join(" "))
    const columns = el.columns ?? []
    const cards = el.cards ?? {}
    const lists = instance.api.transfer.lists(instance.get())
    const hidden = new Set(el.hiddenCards ?? [])
    const w = words(el)
    this.help.textContent = w.help
    attr(el, "data-filtered", [...hidden].some((key) => Object.values(lists).some((keys) => keys.includes(key))))
    const active = document.activeElement
    const addable = isOn(el, "addable")
    const shown = new Set(columns.map((c) => c.id))
    for (const [id, view] of this.columns) if (!shown.has(id)) (view.root.remove(), this.columns.delete(id))
    const roots = columns.map((column) => {
      let view = this.columns.get(column.id)
      if (!view) this.columns.set(column.id, (view = this.columnView(column)))
      view.column = column
      view.heading.textContent = column.title
      for (const label of view.add.querySelectorAll("[data-add-label]")) label.textContent = label.localName === "span" ? `Add a card to ${column.title}` : `Title of the new card in ${column.title}`
      view.add.querySelector("form")?.setAttribute("aria-label", `New card in ${column.title}`)
      // Every id counts toward the limit, as the board's own check does; cards it knows are drawn.
      const all = lists[column.id] ?? []
      const keys = all.filter((key) => cards[key])
      const room = column.limit === undefined ? Infinity : column.limit - all.length
      const full = room <= 0
      attr(view.root, "data-full", full)
      view.count.textContent = `${all.length}${column.limit !== undefined ? ` / ${column.limit}` : ""}`
      const noun = (n: number) => (n === 1 ? "card" : "cards")
      view.spoken.textContent = column.limit !== undefined ? `${all.length} of ${column.limit} ${noun(column.limit)}` : `${all.length} ${noun(all.length)}`
      place(view.list, keys.map((key) => this.cardView(key, cards[key]!, hidden.has(key))), (child) => child.localName === "uiset-board-card")
      view.empty.textContent = w.empty
      view.empty.hidden = keys.length > 0
      view.note.textContent = w.full
      view.note.hidden = !full
      // A full column has no room: its form goes, and focus moves to its last card.
      const hadForm = !!active && view.add.contains(active)
      view.add.hidden = full || !addable
      if (full && view.add.querySelector("form")) this.addButton(view)
      if (full && hadForm && keys.length) el.api?.focusCard(keys.at(-1)!)
      return view.root
    })
    place(this.lanes, roots, (child) => child.classList.contains("board-column"))
    for (const [key, view] of this.cards) if (!view.part.isConnected) this.cards.delete(key)
  }
}

export { defineBoard }
export type { BoardApi, BoardCardData, BoardElement, BoardMessages, UISetBoardEvents }
