import {
  announce,
  createChange,
  createController,
  createRovingFocus,
  createTransfer,
  definePrimitive,
  live,
  selects,
  transferMessage,
  type ChangeDetails,
  type TransferDraft,
  type TransferLists,
  type TransferMessage,
  type TransferReason,
} from "@ui-sdk/core"
import { keepDragPreviewInside } from "../shell/drag-preview"

// A kanban board's behavior: columns of cards, one tab stop for the whole board,
// arrows between cards and columns, Space to pick a card up and move it (UI SDK's
// createTransfer, with its announcements), Enter or a click to open a card. Columns
// can cap how many cards they hold.

type BoardColumnSpec = { id: string; title: string; limit?: number }

type BoardLanesDetails = ChangeDetails<TransferReason> & { key: string; from: string; to: string; index: number }

/** What code outside the board can do: a card dialog moving a card, or returning focus. */
type BoardControllerApi = {
  /** Moves a card to a column (and a position, from 1). Throws, saying why, if it can't. */
  moveCard(card: string, column: string, position?: number): boolean
  /** Adds a card and returns its key. Throws, saying why, if it can't. */
  addCard(column: string, title: string): string | true
  /** Whether a column has room for a card, counting the card itself as already there. */
  hasRoom(card: string, column: string): boolean
  /** Focuses a card, now or as soon as it renders. */
  focusCard(key: string): void
  /** The card's element, if it's on the board and shown. */
  cardElement(key: string): HTMLElement | undefined
  /** Where focus should go when a card leaves: the next card shown in its column, else the one before, else the nearest column's. */
  neighbor(key: string): string | undefined
}

/** Connects a card dialog, or any code, to a board. Create it once and pass it to both. */
const createBoardController = () => createController<BoardControllerApi>()
type BoardController = ReturnType<typeof createBoardController>

type BoardOptions = {
  lanes?: TransferLists
  defaultLanes?: TransferLists
  onLanesChange?: (lanes: TransferLists, details: BoardLanesDetails) => void
  columns: BoardColumnSpec[]
  /** A card's name, for announcements and agents. */
  cardLabel?: (key: string) => string
  /** Cards that can't be picked up, like archived ones. */
  locked?: (key: string) => boolean
  /**
   * Cards a filter hides. They keep their places, focus skips them, and nothing moves
   * until the filter clears: a carried card would step through cards nobody can see.
   */
  hidden?: string[]
  /** Opens a card: Enter, a click, or an agent. Without it, cards don't open. */
  onOpen?: (key: string) => void
  /**
   * Adds a card; returns its key. Uncontrolled boards put that key at the column's end.
   * Details come second, UI SDK's callback shape: a web element's `add` event reads
   * `{ value: column, title }`.
   */
  onAdd?: (column: string, details: { title: string }) => string | void
  /** The cards as data, for agents, from the board's current lanes. */
  items?: (lanes: TransferLists) => unknown[]
  /** What screen readers hear for each step of a move. Defaults to English. */
  message?: (message: TransferMessage) => string
  /** What screen readers hear when Space can't pick a card up because of a filter. */
  filteredMessage?: string
  controller?: BoardController
}

/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const boardPrimitive = definePrimitive({
  name: "board",
  options: {
    lanes: "value",
    defaultLanes: "value",
    onLanesChange: "callback",
    columns: "value",
    cardLabel: "value",
    locked: "value",
    hidden: "value",
    onOpen: "callback",
    onAdd: "action",
    items: "value",
    message: "value",
    filteredMessage: "string",
    controller: "value",
  },
  controlled: ["lanes"],
  live: ["moving"],
  state: (options: BoardOptions) => ({
    lanes: options.lanes ?? options.defaultLanes ?? ({} as TransferLists),
    moving: null as TransferDraft | null,
    focused: null as string | null,
    /** The cards the filter hides, as `hidden` says. */
    hidden: options.hidden ?? ([] as string[]),
  }),
  sync: (options) => (options.lanes === undefined ? {} : { lanes: options.lanes }),
  api: (context) => {
    const opts = () => context.options()
    const change = createChange(context)
    const columnOf = (key: string, lists = context.store.get().lanes) =>
      Object.keys(lists).find((column) => lists[column]!.includes(key))
    const titleOf = (column: string) => opts().columns.find((c) => c.id === column)?.title ?? column
    const label = (key: string) => opts().cardLabel?.(key) ?? key
    const roomFor = (key: string, column: string) => {
      const limit = opts().columns.find((c) => c.id === column)?.limit
      const cards = context.store.get().lanes[column] ?? []
      return limit === undefined || cards.filter((card) => card !== key).length < limit
    }

    // The filter lives outside state, so the tab stop is checked again when it changes:
    // a card the filter hides can't keep the board's one tab stop.
    let hidden = new Set(opts().hidden ?? [])
    let hiddenKey = [...hidden].join("\n")
    // Only a hidden card that's on the board holds moves back: a stale id doesn't.
    const filtering = () => {
      if (!hidden.size) return false
      return Object.values(context.store.get().lanes).some((keys) => keys.some((key) => hidden.has(key)))
    }
    context.onOptions((options) => {
      const next = (options.hidden ?? []).join("\n")
      if (next === hiddenKey) return
      // A focused card the filter now hides hands focus to its nearest shown neighbor.
      const focused = context.store.get().focused
      const el = focused ? context.element("card", focused) : undefined
      const had = !!el?.contains(el.ownerDocument.activeElement)
      hiddenKey = next
      hidden = new Set(options.hidden ?? [])
      // In state, so the cards hear it: a view that renders a card only when its own props
      // change (Solid's) hides it here, in the same update that moves the tab stop off it.
      context.store.set({ hidden: options.hidden ?? [] })
      const handOff = had && focused && hidden.has(focused) ? api.neighbor(focused) : undefined
      roving.check()
      if (handOff) roving.focus(handOff)
    })

    const transfer = createTransfer(context, {
      key: "lanes",
      draft: "moving",
      set: (value, details) => change("lanes", value, details),
      order: () => opts().columns.map((c) => c.id),
      accepts: (key, column) => roomFor(key, column),
      disabled: (key) => filtering() || (opts().locked?.(key) ?? false),
      label,
      listLabel: titleOf,
      message: (message) => (opts().message ?? transferMessage)(message),
    })

    // Focus moves like the board looks: Up and Down within a column, Left and Right to
    // the card at the same height in the next column that has cards.
    const roving = createRovingFocus(context, {
      slot: "card",
      key: "focused",
      focusable: (item) => !hidden.has(item.key) && !(item.props as { filtered?: boolean }).filtered,
      move: (event, { from, items, rtl }) => {
        const lists = transfer.lists(context.store.get())
        const order = opts().columns.map((c) => c.id)
        const visible = new Set(items.map((item) => item.key))
        const shown = (column: string) => (lists[column] ?? []).filter((k) => visible.has(k))
        const column = columnOf(from.key, lists)
        if (!column) return undefined
        const cards = shown(column)
        const index = cards.indexOf(from.key)
        const step = (dir: 1 | -1) => {
          for (let c = order.indexOf(column) + dir; c >= 0 && c < order.length; c += dir) {
            const next = shown(order[c]!)
            if (next.length) return next[Math.min(index, next.length - 1)]
          }
          return from.key
        }
        if (event.key === "ArrowDown") return cards[Math.min(index + 1, cards.length - 1)]
        if (event.key === "ArrowUp") return cards[Math.max(index - 1, 0)]
        if (event.key === "Home") return cards[0]
        if (event.key === "End") return cards.at(-1)
        if (event.key === "ArrowRight") return step(rtl ? -1 : 1)
        if (event.key === "ArrowLeft") return step(rtl ? 1 : -1)
        return undefined
      },
    })

    const findCard = (name: string) => {
      const lists = context.store.get().lanes
      const all = Object.values(lists).flat()
      const card =
        all.find((key) => key === name) ??
        all.find((key) => label(key).toLowerCase() === String(name).toLowerCase())
      if (!card) throw new Error(`No card "${name}" on this board.`)
      return card
    }
    const findColumn = (name: string) => {
      const column = opts().columns.find(
        (c) => c.id === name || c.title.toLowerCase() === String(name).toLowerCase(),
      )
      if (!column)
        throw new Error(
          `No column "${name}". Its columns: ${opts().columns.map((c) => c.title).join(", ")}.`,
        )
      return column
    }

    const cardElement = (key: string) => {
      const el = context.element("card", key)
      return el && !el.hidden ? el : undefined
    }

    const api = {
      transfer,
      roving,
      columnOf,
      filtering,
      cardElement,
      hasRoom: (card: string, column: string) => roomFor(card, column),
      focusCard: (key: string) => roving.focus(key),
      neighbor(key: string) {
        const lists = context.store.get().lanes
        const order = opts().columns.map((c) => c.id)
        const shown = (column: string) => (lists[column] ?? []).filter((k) => k !== key && !hidden.has(k))
        const column = columnOf(key, lists)
        if (!column) return undefined
        const index = (lists[column] ?? []).indexOf(key)
        const own = lists[column] ?? []
        const after = own.slice(index + 1).find((k) => !hidden.has(k))
        const before = own.slice(0, index).reverse().find((k) => !hidden.has(k))
        if (after ?? before) return after ?? before
        const at = order.indexOf(column)
        for (let distance = 1; distance < order.length; distance++) {
          for (const c of [order[at + distance], order[at - distance]]) {
            const cards = c ? shown(c) : []
            if (cards.length) return cards[Math.min(index, cards.length - 1)]
          }
        }
        return undefined
      },
      /** Opens a card from a press or Enter; a board without `onOpen` ignores it. */
      open: (key: string) => opts().onOpen?.(key),
      /** Moves a card to a column (and a position, from 1), by the names people see. */
      moveCard(card: string, column: string, position?: number) {
        const key = findCard(card)
        const to = findColumn(column)
        if (opts().locked?.(key)) throw new Error(`${label(key)} can't be moved.`)
        if (!roomFor(key, to.id))
          throw new Error(`${to.title} is full: it holds at most ${to.limit} cards.`)
        const size = (context.store.get().lanes[to.id] ?? []).filter((k) => k !== key).length
        const index = position === undefined ? size : Math.max(0, Math.min(size, position - 1))
        return transfer.move(key, to.id, index)
      },
      /** Adds a card to a column. */
      addCard(column: string, title: string): string | true {
        const to = findColumn(column)
        const text = String(title ?? "").trim()
        if (!text) throw new Error("A card needs a title.")
        if (!roomFor("", to.id)) throw new Error(`${to.title} is full: it holds at most ${to.limit} cards.`)
        const add = opts().onAdd
        if (!add) throw new Error("This board doesn't add cards.")
        const key = add(to.id, { title: text })
        if (typeof key !== "string") return true
        // A controlled board's owner puts the card in its lanes; an uncontrolled one does it here.
        if (opts().lanes === undefined) {
          const lanes = context.store.get().lanes
          const cards = lanes[to.id] ?? []
          if (!cards.includes(key))
            change(
              "lanes",
              { ...lanes, [to.id]: [...cards, key] },
              { reason: "imperative", key, from: to.id, to: to.id, index: cards.length },
            )
        }
        return key
      },
      /** Opens a card's details. */
      openCard(card: string) {
        const open = opts().onOpen
        if (!open) throw new Error("This board doesn't open cards.")
        open(findCard(card))
        return true
      },
      /** The lanes now, and a way to set them from code (a web element's live `lanes`). */
      lanes: () => context.store.get().lanes,
      setLanes: (next: TransferLists) => change("lanes", next, { reason: "imperative", key: "", from: "", to: "", index: -1 }),
      /** Tells someone pressing Space why a filtered board won't pick a card up. */
      explainFiltered() {
        announce(opts().filteredMessage ?? "Clear the search and filters to move cards.")
      },
      items: () => opts().items?.(context.store.get().lanes) ?? [],
    }
    return api
  },
  slots: (slot) => ({
    // The root hands its render function the lanes as drawn: the draft during a move.
    root: slot<{}, { lanes: TransferLists; moving: boolean }>({
      role: "group",
      state: (state, { api }) => ({ lanes: api.transfer.lists(state), moving: state.moving !== null }),
      attrs: () => ({ "aria-roledescription": "board" }),
      live: live((state) => ({ "data-moving": state.moving ? "" : undefined })),
    }),
    column: slot<{ value: string }>({
      props: { value: "string" },
      role: "listbox",
      keys: { none: "The cards handle the keys; the board is one tab stop." },
      attrs: () => ({ "aria-roledescription": "column" }),
      bind: (el, { api, props }) => api.transfer.bindList(el, props.value),
    }),
    card: slot<{ value: string; filtered?: boolean }, { moving: boolean; dragging: boolean }>({
      props: { value: "string", filtered: "boolean" },
      role: "option",
      focus: "roving",
      keys: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " ", "Enter", "Escape"],
      press: ({ api, key }) => api.open(key),
      // A focus change reaches only the two cards it touches. (During a move every card
      // may shift, so moves reach all of them.)
      // A filter reaches only the cards it hides or shows again.
      selects: selects({ focused: ({ key }) => [key, null], hidden: ({ key }) => [key] }),
      state: (state, { api, key }) => ({
        moving: api.transfer.moving(state, key),
        dragging: api.transfer.dragging(state, key),
      }),
      attrs: (state, part) => ({
        tabindex: part.api.roving.tabIndex(state, part),
        "aria-roledescription": "card",
        // Named for the server's HTML; `live` below keeps it current during a move.
        "aria-selected": "false",
        hidden: part.props.filtered || state.hidden.includes(part.key) ? "" : undefined,
      }),
      // The move is live state: written straight to the element the moment it changes.
      // (Attributes in `attrs` may not read it, or they'd wait for the next render.)
      // The picked-up card is the selected one, the way sortable lists say it.
      live: live((state, part) => ({
        "aria-selected": String(part.api.transfer.moving(state, part.key)),
        "data-moving": part.api.transfer.moving(state, part.key) ? "" : undefined,
        "data-dragging": part.api.transfer.dragging(state, part.key) ? "" : undefined,
      })),
      on: {
        keydown: (event, { api, key, el, store }) => {
          const e = event as KeyboardEvent
          const plain = !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
          const carrying = store.get().moving !== null
          if (!carrying && (e.key === "Enter" || e.key === " ")) {
            // Enter opens a card. Modified Enter and Space do nothing, rather than pick it up.
            if (!plain) return
            if (e.key === "Enter") {
              e.preventDefault()
              api.open(key)
              return
            }
            if (api.filtering()) {
              e.preventDefault()
              api.explainFiltered()
              return
            }
          }
          if (api.transfer.keydown(e, key)) return
          if (el) api.roving.keydown(e, el)
        },
        // A touch drags from the card's handle only, so a finger can still scroll the board.
        pointerdown: (event, { api, key }) => {
          const e = event as PointerEvent
          if (e.pointerType === "touch" && !(e.target as Element).closest?.("[data-board-handle]")) return
          api.transfer.pointerdown(e, key)
        },
      },
      bind: (el, part) => {
        const cleanups = [part.api.roving.bind(el, part), part.api.transfer.bindItem(el, part.key)]
        return () => cleanups.forEach((cleanup) => cleanup())
      },
    }),
  }),
  agent: {
    actions: ["moveCard", "addCard", "openCard"],
    items: (api) => api.items(),
  },
})

export { boardPrimitive, createBoardController, keepDragPreviewInside }
export type { BoardColumnSpec, BoardController, BoardControllerApi, BoardLanesDetails, BoardOptions }
