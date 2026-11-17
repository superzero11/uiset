import {
  createFocusRecovery,
  createRovingFocus,
  createSwipeActions,
  css,
  definePrimitive,
  live,
  selects,
  type SwipeDraft,
  type SwipeOpen,
  type SwipeSide,
} from "@ui-sdk/core"

// A list whose rows swipe aside to actions, on UI SDK's createSwipeActions: one row open at
// a time, a long swipe runs the first action, and the keyboard does the same with Left and
// Right (then Escape). Rows are one tab stop, arrows go between them, Enter opens one.

type SwipeListOptions = {
  /** Enter or a press on a row. */
  onOpen?: (key: string) => void
  /**
   * Runs one of a row's actions, from a press, a long swipe, a menu or an agent. Details
   * come second, UI SDK's callback shape, so a web element's `action` event reads
   * `{ value: row, action }`.
   */
  onAction?: (key: string, details: { action: string }) => void
  /**
   * A row's actions, for agents. One with `confirm` needs the person: `run` refuses it and
   * points at `via`, the control that asks them.
   */
  actionsOf?: (key: string) => { id: string; label: string; confirm?: string; via?: string }[]
  /** Each row as agents read it. */
  rows?: () => { value: string; label: string }[]
  /** A swipe past `fullSwipe` runs a side's first action; return whether it did. */
  onFullSwipe?: (key: string, side: SwipeSide) => boolean
  /** How far across the row a swipe runs the first action, from 0 to 1. */
  fullSwipe?: number
  /** Rows that don't swipe. */
  disabled?: (key: string) => boolean
}

/** Whether a press landed on a control inside the row (a star in its content, say). */
const insideControl = (target: Element, row: Element | undefined) => {
  const control = target.closest?.("button, a[href], input, select, textarea, label, [role=button], [role=link], [role=checkbox], [role=switch], [contenteditable=true]")
  return !!control && control !== row && !!row?.contains(control)
}

/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const swipeList = definePrimitive({
  name: "swipe-list",
  options: {
    onOpen: "callback",
    onAction: "action",
    actionsOf: "value",
    rows: "value",
    onFullSwipe: "action",
    fullSwipe: "number",
    disabled: "value",
  },
  live: ["swiping"],
  state: (_options: SwipeListOptions) => ({
    open: null as SwipeOpen | null,
    swiping: null as SwipeDraft | null,
    focused: null as string | null,
  }),
  api: (context) => {
    const opts = () => context.options()
    const swipe = createSwipeActions(context, {
      key: "open",
      draft: "swiping",
      onFullSwipe: (key, side) => opts().onFullSwipe?.(key, side) ?? false,
      fullSwipe: () => opts().fullSwipe ?? 0.6,
      disabled: (key) => opts().disabled?.(key) ?? false,
    })
    // Up and Down go between rows; Left and Right belong to the swipe.
    const roving = createRovingFocus(context, { slot: "row", key: "focused", orientation: () => "vertical" })
    // A focused row that goes (archived, deleted) hands focus to the row now in its place.
    const recovery = createFocusRecovery<{ value: string }>({
      fallback: (lost) => {
        const items = roving.items()
        const at = Math.max(0, lostIndex.get(lost.key) ?? 0)
        return (items[at] ?? items.at(-1))?.el
      },
    })
    const lostIndex = new Map<string, number>()
    // Whether a row was open when this press began: by its click, the swipe has closed it.
    let openAtPress = false
    const findRow = (name: string) => {
      const rows = opts().rows?.() ?? []
      const row = rows.find((r) => r.value === name) ?? rows.find((r) => r.label.toLowerCase().includes(String(name).toLowerCase()))
      if (!row) throw new Error(`No row "${name}". Rows: ${rows.map((r) => r.label).join("; ")}.`)
      return row
    }
    return {
      swipe,
      roving,
      recovery,
      // Every row's place, kept current as rows come and go, so a row that leaves (even after
      // it's off the page, as a custom element's cleanup runs) knows where it was. Read once
      // the row's registration has settled: a row just bound isn't in the list yet.
      remember: () => queueMicrotask(() => roving.items().forEach((item, at) => lostIndex.set(item.key, at))),
      pressStarted: () => (openAtPress = context.store.get().open !== null),
      pressedOpen: () => openAtPress,
      open: (key: string) => opts().onOpen?.(key),
      /**
       * A person runs an action: the row closes and focus goes back to it (or its successor).
       * A long swipe with a pointer leaves focus where it was.
       */
      act(key: string, action: string, focus = true) {
        swipe.close({ focus })
        opts().onAction?.(key, { action })
      },
      /** Runs one of a row's actions, by the row's name and the action's. */
      run(row: string, action: string) {
        const found = findRow(row)
        const actions = opts().actionsOf?.(found.value) ?? []
        const chosen = actions.find((a) => a.id === action || a.label.toLowerCase() === String(action).toLowerCase())
        if (!chosen) throw new Error(`"${found.label}" has no action "${action}". It has: ${actions.map((a) => a.label).join(", ")}.`)
        if (chosen.confirm) {
          const via = chosen.via ? ` Press "${chosen.label}" in "${chosen.via}" instead, which asks them.` : ""
          throw new Error(`Needs a person: "${chosen.confirm}".${via}`)
        }
        opts().onAction?.(found.value, { action: chosen.id })
        return true
      },
      /** Opens a row, by its name. */
      openRow(row: string) {
        if (!opts().onOpen) throw new Error("These rows don't open.")
        opts().onOpen!(findRow(row).value)
        return true
      },
      items: () =>
        (opts().rows?.() ?? []).map((row) => {
          const actions = opts().actionsOf?.(row.value) ?? []
          return { value: row.value, label: actions.length ? `${row.label} (actions: ${actions.map((a) => a.label).join(", ")})` : row.label }
        }),
    }
  },
  slots: (slot) => ({
    // The root creates the instance, so it's named root: custom elements need that.
    root: slot({
      role: "list",
    }),
    row: slot<{ value: string }>({
      props: { value: "string" },
      role: "listitem",
      focus: "roving",
      keys: ["ArrowUp", "ArrowDown", "Home", "End", "ArrowLeft", "ArrowRight", "Escape", "Enter"],
      selects: selects({ focused: ({ key }) => [key, null] }),
      attrs: (state, part) => ({
        tabindex: part.api.roving.tabIndex(state, part),
        style: css({ position: "relative", overflow: "hidden", "touch-action": "pan-y" }),
      }),
      on: {
        keydown: (event, { api, key, el }) => {
          const e = event as KeyboardEvent
          // The row's menu is its own (on the web its popup stays inside the row).
          if ((e.target as Element).closest("[data-swipe-menu]")) return
          // The swipe hears its row and its actions (Escape there closes them);
          // opening and moving between rows are the row's own.
          if (api.swipe.keydown(e, key)) return
          if (e.target !== el) return
          if (e.key === "Enter" && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault()
            api.open(key)
            return
          }
          if (el) api.roving.keydown(e, el)
        },
        pointerdown: (event, { api, key, el }) => {
          if ((event.target as Element).closest("[data-swipe-actions], [data-swipe-menu]")) return
          if (insideControl(event.target as Element, el)) return
          api.pressStarted()
          if (el) api.swipe.pointerdown(event as PointerEvent, key, el)
        },
        click: (event, { api, key, store, el }) => {
          // A tap opens the row, unless it closes one that was open, or presses an action.
          if ((event.target as Element).closest("[data-swipe-actions], [data-swipe-menu]")) return
          if (insideControl(event.target as Element, el)) return
          if (api.pressedOpen() || store.get().open) {
            api.swipe.close()
            return
          }
          api.open(key)
        },
      },
      bind: (el, part) => {
        part.api.remember()
        const cleanups = [part.api.roving.bind(el, part), part.api.swipe.bindRow(el, part.key), part.api.recovery.bind(el, part)]
        return () => {
          part.api.remember()
          cleanups.forEach((cleanup) => cleanup())
        }
      },
    }),
    content: slot<{ value: string }>({
      props: { value: "string" },
      attrs: () => ({ style: css({ transform: "translateX(var(--swipe-x, 0px))" }) }),
      live: live((state, { api, key }) => api.swipe.contentAttrs(state, key)),
    }),
    // Keyed by row and side ("m1:end"), since a row can have actions on both.
    actions: slot<{ value: string; row: string; side: string }>({
      props: { value: "string", row: "string", side: "string" },
      attrs: () => ({ "data-swipe-actions": "" }),
      live: live((state, { api, props }) => api.swipe.actionsAttrs(state, props.row, props.side as SwipeSide)),
      bind: (el, { api, props }) => api.swipe.bindActions(el, props.row, props.side as SwipeSide),
    }),
  }),
  agent: { actions: ["run", "openRow"], items: (api) => api.items() },
})

export { swipeList }
export type { SwipeListOptions, SwipeSide }
