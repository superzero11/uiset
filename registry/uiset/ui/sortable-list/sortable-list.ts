import {
  announce,
  createChange,
  createReorder,
  createRovingFocus,
  createSelection,
  createTypeahead,
  definePrimitive,
  isTypeaheadKey,
  live,
  reorderMessage,
  selects,
  type ChangeDetails,
  type ReorderDraft,
  type ReorderMessage,
  type ReorderOrientation,
  type ReorderReason,
  type RovingFocusMoveContext,
} from "@ui-sdk/core"

// A list people put in order: drag an item, or pick it up with Space and move it with the
// arrows (UI SDK's createReorder, with its announcements). With `multiple`, Shift+Space,
// Shift with the arrows, and Shift- or Command-clicks select items, and a selection moves
// together.

type SortableListSelectReason = "item-press" | "list-navigation" | "imperative"

type SortableListOptions = {
  /** The keys in their order. Pass it with `onValueChange` to control the order. */
  value?: string[]
  /** The order at first, when uncontrolled. Defaults to `keys`. */
  defaultValue?: string[]
  onValueChange?: (value: string[], details: ChangeDetails<ReorderReason>) => void
  /** Every item's key, in the data's order. A new key joins the end; a key that goes leaves. */
  keys: string[]
  /** Lets people select several items and move them together. */
  multiple?: boolean
  selected?: string[]
  defaultSelected?: string[]
  onSelectedChange?: (selected: string[], details: ChangeDetails<SortableListSelectReason>) => void
  /** Top to bottom (the default), along a line, or wrapping in rows like a grid of photos. Set it once. */
  orientation?: ReorderOrientation
  /** An item's name, for announcements and agents. Defaults to its key. */
  itemLabel?: (key: string) => string
  /** Items that stay where they are. Others still move past them. */
  locked?: (key: string) => boolean
  /** What screen readers hear for each step of a move. Defaults to English. */
  message?: (message: ReorderMessage) => string
  /** The items as data, for agents, from the order now. Defaults to each key, name and place. */
  itemData?: (order: string[]) => unknown[]
}

/** The order with the keys that left taken out and new ones at the end; the same array if nothing changed. */
function reconcile(order: readonly string[] | undefined, keys: readonly string[]): string[] {
  if (!order) return [...keys]
  const known = new Set(keys)
  const kept = order.filter((key) => known.has(key))
  const seen = new Set(kept)
  const added = keys.filter((key) => !seen.has(key))
  return added.length || kept.length !== order.length ? [...kept, ...added] : (order as string[])
}

/** The options the parts draw, copied into state so the server's HTML has them too. */
const rendered = (options: SortableListOptions) => ({
  multiple: !!options.multiple,
  orientation: options.orientation ?? ("vertical" as ReorderOrientation),
  locked: (options.keys ?? []).filter((key) => options.locked?.(key) ?? false),
})

/** The order with `keys` taken out and put back, in their order, at `index` among the rest. */
function movedTo(order: readonly string[], keys: readonly string[], index: number): string[] {
  const rest = order.filter((key) => !keys.includes(key))
  const moving = order.filter((key) => keys.includes(key))
  const next = [...rest.slice(0, index), ...moving, ...rest.slice(index)]
  return next.every((key, i) => key === order[i]) ? (order as string[]) : next
}

// In a grid, Left and Right step through the order and Up and Down go to the nearest item in
// the row above or below, measured from where the items are drawn.
function gridMove(event: KeyboardEvent, { from, items, rtl }: RovingFocusMoveContext) {
  const index = items.findIndex((item) => item.key === from.key)
  const next = (step: number) => items[Math.max(0, Math.min(items.length - 1, index + step))]?.key
  if (event.key === "ArrowRight") return next(rtl ? -1 : 1)
  if (event.key === "ArrowLeft") return next(rtl ? 1 : -1)
  if (event.key === "Home") return items[0]?.key
  if (event.key === "End") return items.at(-1)?.key
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return undefined
  const here = from.el.getBoundingClientRect()
  const middle = here.left + here.width / 2
  const down = event.key === "ArrowDown"
  const rows = items
    .map((item) => ({ key: item.key, rect: item.el.getBoundingClientRect() }))
    .filter(({ rect }) => (down ? rect.top >= here.bottom - 1 : rect.bottom <= here.top + 1))
  if (!rows.length) return from.key
  const edge = down ? Math.min(...rows.map((r) => r.rect.top)) : Math.max(...rows.map((r) => r.rect.top))
  const row = rows.filter((r) => Math.abs(r.rect.top - edge) < 1)
  row.sort((a, b) => Math.abs(a.rect.left + a.rect.width / 2 - middle) - Math.abs(b.rect.left + b.rect.width / 2 - middle))
  return row[0]?.key
}

/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const sortableList = definePrimitive({
  name: "sortable-list",
  options: {
    value: "value",
    defaultValue: "value",
    onValueChange: "callback",
    keys: "value",
    multiple: "boolean",
    selected: "value",
    defaultSelected: "value",
    onSelectedChange: "callback",
    orientation: "string",
    itemLabel: "value",
    locked: "value",
    message: "value",
    itemData: "value",
  },
  controlled: ["value", "selected"],
  live: ["moving"],
  state: (options: SortableListOptions) => ({
    value: reconcile(options.value ?? options.defaultValue, options.keys ?? []),
    selected: options.selected ?? options.defaultSelected ?? ([] as string[]),
    moving: null as ReorderDraft | null,
    focused: null as string | null,
    ...rendered(options),
  }),
  sync: (options) => ({
    ...rendered(options),
    ...(options.value === undefined ? {} : { value: reconcile(options.value, options.keys ?? []) }),
    ...(options.selected === undefined ? {} : { selected: options.selected }),
  }),
  api: (context) => {
    const opts = () => context.options()
    const change = createChange(context)
    const label = (key: string) => opts().itemLabel?.(key) ?? key
    const locked = (key: string) => context.store.get().locked.includes(key)
    const multiple = () => context.store.get().multiple
    const typeahead = createTypeahead()

    // Items added or removed while uncontrolled: the order keeps up without reporting a change.
    context.onOptions((options) => {
      if (options.value !== undefined) return
      const { value } = context.store.get()
      const next = reconcile(value, options.keys ?? [])
      if (next !== value) context.store.set({ value: next })
    })

    const roving = createRovingFocus(context, {
      slot: "item",
      key: "focused",
      orientation: () => (context.store.get().orientation === "horizontal" ? "horizontal" : "vertical"),
      ...(opts().orientation === "grid" ? { move: gridMove } : {}),
    })
    const selection = createSelection(context, {
      key: "selected",
      set: (value, details) => change("selected", value, details),
      order: () => context.store.get().value,
      multiple: () => true,
      selectable: (key) => !locked(key),
    })
    const message = (m: ReorderMessage) => (opts().message ?? reorderMessage)(m)
    const reorder = createReorder(context, {
      slot: "item",
      key: "value",
      draft: "moving",
      set: (value, details) => change("value", value, details),
      orientation: () => context.store.get().orientation,
      // A selected item takes the rest of the selection with it.
      group: (key) => {
        const { selected } = context.store.get()
        return multiple() && selected.includes(key) ? selected : [key]
      },
      preview: true,
      disabled: ({ key }) => locked(key),
      label,
      message,
    })

    const find = (name: string) => {
      const keys = context.store.get().value
      const key = keys.find((k) => k === name) ?? keys.find((k) => label(k).toLowerCase() === String(name).toLowerCase())
      if (!key) throw new Error(`No item "${name}" in this list. Its items: ${keys.map(label).join(", ")}.`)
      return key
    }

    const api = {
      reorder,
      roving,
      selection,
      label,
      locked,
      multiple,
      typeahead,
      /** The order now. */
      order: () => context.store.get().value,
      /** Sets the order from code, keeping it to the keys the list has. Fires nothing, as setting a field's value doesn't. */
      writeOrder(next: string[]) {
        const value = reconcile(next, opts().keys ?? [])
        if (value !== context.store.get().value) context.store.set({ value })
      },
      /** The selected keys now. */
      selectedKeys: () => context.store.get().selected,
      /** Sets the selection from code. Fires nothing. */
      writeSelected(next: string[]) {
        context.store.set({ selected: [...next] })
      },
      /** Moves an item, or several in their order, to a position from 1, by the names people see. */
      moveItem(item: string | string[], position: number) {
        const keys = (Array.isArray(item) ? item : [item]).map(find)
        const stuck = keys.find(locked)
        if (stuck) throw new Error(`${label(stuck)} can't be moved.`)
        const at = Math.round(Number(position))
        if (!Number.isFinite(at) || at < 1) throw new Error("Give a position from 1.")
        const order = context.store.get().value
        const moving = order.filter((key) => keys.includes(key))
        const index = Math.min(at - 1, order.length - moving.length)
        if (moving.length === 1) return reorder.move(moving[0]!, index)
        const next = movedTo(order, moving, index)
        if (next === order) return true
        if (!change("value", next, { reason: "imperative" })) return false
        announce(message({ type: "drop", key: moving[0]!, label: label(moving[0]!), count: moving.length, position: index + 1, total: order.length }))
        return true
      },
      /** Selects these items, by their names, in place of the selection. */
      selectItems(items: string[]) {
        if (!multiple()) throw new Error("This list moves one item at a time.")
        const keys = (Array.isArray(items) ? items : [items]).map(find).filter((key) => !locked(key))
        return change("selected", keys, { reason: "imperative" })
      },
      clearSelection: (event?: Event) => change("selected", [], { reason: "list-navigation", event }),
      /** A press with Shift, Command or Control, or on an item's check, selects rather than drags. */
      pointerSelect(event: PointerEvent, key: string) {
        if (!multiple() || event.button !== 0) return false
        const details = { reason: "item-press" as const, event }
        const onCheck = !!(event.target as Element).closest?.("[data-sortable-check]")
        if (event.shiftKey && !onCheck) selection.extend(key, { ...details, from: context.store.get().focused })
        else if (onCheck || event.metaKey || event.ctrlKey) selection.toggle(key, details)
        else return false
        event.preventDefault()
        roving.focus(key)
        return true
      },
      items: () => {
        const order = context.store.get().value
        return opts().itemData?.(order) ?? order.map((key, index) => ({ value: key, label: label(key), position: index + 1 }))
      },
    }
    return api
  },
  slots: (slot) => ({
    // The root hands its render function the order as drawn: the draft's during a move.
    root: slot<{}, { order: string[]; moving: boolean; selected: string[] }>({
      role: "listbox",
      keys: { none: "The items handle the keys; the list is one tab stop." },
      state: (state, { api }) => ({ order: api.reorder.order(state), moving: state.moving !== null, selected: state.selected }),
      attrs: (state) => ({
        "aria-roledescription": "sortable list",
        "aria-orientation": state.orientation === "grid" ? undefined : state.orientation,
        "aria-multiselectable": state.multiple ? "true" : undefined,
        "data-orientation": state.orientation,
      }),
      live: live((state) => ({ "data-moving": state.moving ? "" : undefined })),
    }),
    item: slot<{ value: string }, { moving: boolean; dragging: boolean; selected: boolean; locked: boolean }>({
      props: { value: "string" },
      role: "option",
      focus: "roving",
      keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", " ", "Enter", "Escape", "Tab", "shift+ ", "mod+a", "typeahead"],
      press: { none: "Items move by drag and by keys; a press with Shift or Command selects, from pointerdown." },
      // A focus change reaches only the two items it touches; a selection, the items it adds or drops.
      selects: selects({ focused: ({ key }) => [key, null], selected: ({ key }) => [key] }),
      state: (state, { api, key }) => ({
        moving: api.reorder.moving(state, key),
        dragging: api.reorder.dragging(state, key),
        selected: state.selected.includes(key),
        locked: state.locked.includes(key),
      }),
      attrs: (state, part) => ({
        tabindex: part.api.roving.tabIndex(state, part),
        "aria-roledescription": "sortable item",
        // Named for the server's HTML; `live` below keeps it current.
        "aria-selected": "false",
        "aria-disabled": state.locked.includes(part.key) ? "true" : undefined,
      }),
      // A move is live state, written straight to the element as it changes. With `multiple`
      // the selection is what's selected; without, the picked-up item is, as sortable lists say it.
      live: live((state, part) => {
        const moving = part.api.reorder.moving(state, part.key)
        const selected = state.selected.includes(part.key)
        return {
          "aria-selected": String(state.multiple ? selected : moving),
          "data-selected": selected ? "" : undefined,
          "data-moving": moving ? "" : undefined,
          "data-dragging": part.api.reorder.dragging(state, part.key) ? "" : undefined,
        }
      }),
      on: {
        keydown: (event, { api, key, el, store }) => {
          const e = event as KeyboardEvent
          const carrying = store.get().moving !== null
          const command = e.ctrlKey || e.metaKey
          if (!carrying && api.multiple() && !e.altKey) {
            if (e.key === " " && e.shiftKey && !command) {
              e.preventDefault()
              api.selection.toggle(key, { reason: "item-press", event: e })
              return
            }
            if (e.key.toLowerCase() === "a" && command && !e.shiftKey) {
              e.preventDefault()
              api.selection.toggleAll({ reason: "list-navigation", event: e })
              return
            }
            // Escape clears a selection, and only claims the key when there's one to clear.
            if (e.key === "Escape" && store.get().selected.length) {
              e.preventDefault()
              api.clearSelection(e)
              return
            }
          }
          // Typing a name's first letters goes to it; Space continues a name being typed.
          if (!carrying && isTypeaheadKey(e) && (e.key !== " " || api.typeahead.active())) {
            const items = api.roving.items()
            const index = api.typeahead(e.key, items.map((item) => api.label(item.key)), items.findIndex((item) => item.key === key))
            if (index !== -1) {
              e.preventDefault()
              api.roving.focus(items[index]!.key)
            }
            return
          }
          // Modified Space and Enter don't pick an item up.
          if (!carrying && (e.key === " " || e.key === "Enter") && (e.shiftKey || command || e.altKey)) return
          if (api.reorder.keydown(e, key)) return
          if (!el) return
          const moved = api.roving.keydown(e, el)
          if (moved && api.multiple()) {
            if (moved.shift) api.selection.extend(moved.key, { from: moved.from, reason: "list-navigation", event: e })
            else api.selection.setAnchor(moved.key)
          }
        },
        // A touch drags from the handle only, so a finger can still scroll past the list.
        pointerdown: (event, { api, key }) => {
          const e = event as PointerEvent
          if (api.pointerSelect(e, key)) return
          if (e.pointerType === "touch" && !(e.target as Element).closest?.("[data-sortable-handle]")) return
          api.reorder.pointerdown(e, key)
        },
      },
      bind: (el, part) => {
        const cleanups = [part.api.roving.bind(el, part), part.api.reorder.bind(el, part)]
        return () => cleanups.forEach((cleanup) => cleanup())
      },
    }),
  }),
  agent: {
    actions: ["moveItem", "selectItems"],
    items: (api) => api.items(),
  },
})

export { reconcile, sortableList }
export type { SortableListOptions, SortableListSelectReason }
