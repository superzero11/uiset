import {
  announce,
  createChange,
  createRovingFocus,
  createTreeReorder,
  createTypeahead,
  definePrimitive,
  isRTL,
  isTypeaheadKey,
  live,
  selects,
  subtreeEnd,
  treeReorderMessage,
  type ChangeDetails,
  type TreeReorderDraft,
  type TreeReorderMessage,
  type TreeReorderReason,
  type TreeReorderRow,
} from "@ui-sdk/core"

// A tree people put in order and nest: drag a row up or down, and sideways to change its
// level, or pick it up with Space and use the arrows (UI SDK's createTreeReorder, with its
// announcements). Rows are drawn flat, indented by depth. Up and Down move between the rows
// that show, Right opens a branch or goes into it, Left closes one or goes to its parent, and
// typing a name goes to it. Only branches (items with `children`) hold other items.

type SortableTreeItem = {
  value: string
  label: string
  /** A branch's items. An empty list is a branch with nothing in it yet. Leave it out for a leaf. */
  children?: SortableTreeItem[]
  /** Can't be picked up. It still moves aside for others. */
  locked?: boolean
}

type SortableTreeItemsDetails = ChangeDetails<TreeReorderReason> & {
  /** The item that moved. */
  key: string
  /** Its new parent's key, or `null` at the top level. */
  parent: string | null
  /** Its place among its parent's items, from 0. */
  index: number
}

type SortableTreeExpandReason = "arrow-key" | "item-press" | "drop" | "imperative"

type SortableTreeOptions = {
  /** The items, nested. Pass it with `onItemsChange` to control them. */
  items?: SortableTreeItem[]
  defaultItems?: SortableTreeItem[]
  /** Runs when a move is dropped, with the items as they are now. */
  onItemsChange?: (items: SortableTreeItem[], details: SortableTreeItemsDetails) => void
  /** The open branches' keys. */
  expanded?: string[]
  defaultExpanded?: string[]
  onExpandedChange?: (expanded: string[], details: ChangeDetails<SortableTreeExpandReason>) => void
  /** The deepest an item and those under it can go, from 0. Defaults to no limit. */
  maxDepth?: number
  /** Opens an item that isn't a branch: Enter or a press. Branches open and close instead. */
  onAction?: (key: string) => void
  /** What screen readers hear for each step of a move. Defaults to English. */
  message?: (message: TreeReorderMessage) => string
  /** What screen readers hear when a drop is refused because the row it went into isn't a branch. */
  refusedMessage?: (item: string, into: string) => string
}

/** One drawn row: where it is in the tree, for its ARIA and its indent. */
type SortableTreeRow = {
  key: string
  depth: number
  branch: boolean
  expanded: boolean
  /** Its place among its siblings, from 1, and how many there are. */
  position: number
  size: number
}

/** The rows in reading order, each with its depth. */
function flatten(items: readonly SortableTreeItem[], depth = 0, out: TreeReorderRow[] = []) {
  for (const item of items) {
    out.push({ key: item.value, depth })
    if (item.children) flatten(item.children, depth + 1, out)
  }
  return out
}

const nodeMaps = new WeakMap<readonly SortableTreeItem[], Map<string, SortableTreeItem>>()

/** Every item by its key, at any depth. Kept per `items` array, so asking again is free. */
function nodesOf(items: readonly SortableTreeItem[]) {
  let map = nodeMaps.get(items)
  if (!map) {
    map = new Map()
    const add = (list: readonly SortableTreeItem[]) => {
      for (const item of list) {
        map!.set(item.value, item)
        if (item.children) add(item.children)
      }
    }
    add(items)
    nodeMaps.set(items, map)
  }
  return map
}

/** The items nested again from rows, each keeping its own fields. */
function build(rows: readonly TreeReorderRow[], nodes: ReadonlyMap<string, SortableTreeItem>) {
  const top: SortableTreeItem[] = []
  const stack: { depth: number; children: SortableTreeItem[] }[] = [{ depth: -1, children: top }]
  for (const row of rows) {
    const source = nodes.get(row.key)
    if (!source) continue
    const node: SortableTreeItem = { ...source, ...(source.children ? { children: [] } : {}) }
    while (stack.at(-1)!.depth >= row.depth) stack.pop()
    stack.at(-1)!.children.push(node)
    if (node.children) stack.push({ depth: row.depth, children: node.children })
  }
  return top
}

/** The key of the row's parent, or `null` at the top level. */
function parentOf(rows: readonly TreeReorderRow[], index: number) {
  const depth = rows[index]?.depth ?? 0
  for (let i = index - 1; i >= 0; i--) if (rows[i]!.depth < depth) return rows[i]!.key
  return null
}

/** The options the rows draw, copied into state so the server's HTML has them too. */
function shape(items: readonly SortableTreeItem[]) {
  const nodes = nodesOf(items)
  return {
    items: items as SortableTreeItem[],
    rows: flatten(items),
    branches: [...nodes.values()].filter((item) => item.children).map((item) => item.value),
    locked: [...nodes.values()].filter((item) => item.locked).map((item) => item.value),
  }
}

type TreeState = {
  rows: TreeReorderRow[]
  moving: TreeReorderDraft | null
  expanded: string[]
  branches: string[]
}

/**
 * The rows that show: those whose branches above are all open. While an item moves, the
 * branches it's in show open, so the row being moved never disappears.
 */
function shownRows(state: TreeState, rows: readonly TreeReorderRow[]): SortableTreeRow[] {
  // Every row asks for this on each render: the answer is kept until what it reads changes.
  const last = shownCache
  if (last && last.rows === rows && last.expanded === state.expanded && last.branches === state.branches && last.moving === state.moving) return last.shown
  const shown = computeShown(state, rows)
  shownCache = { rows, expanded: state.expanded, branches: state.branches, moving: state.moving, shown }
  return shown
}

let shownCache: { rows: readonly TreeReorderRow[]; expanded: string[]; branches: string[]; moving: TreeReorderDraft | null; shown: SortableTreeRow[] } | undefined

function computeShown(state: TreeState, rows: readonly TreeReorderRow[]): SortableTreeRow[] {
  const branches = new Set(state.branches)
  const open = new Set(state.expanded)
  if (state.moving) {
    let index = rows.findIndex((row) => row.key === state.moving!.key)
    for (let depth = rows[index]?.depth ?? 0; index >= 0 && depth > 0; index--) {
      if (rows[index]!.depth < depth) {
        open.add(rows[index]!.key)
        depth = rows[index]!.depth
      }
    }
  }
  // Siblings counted from the whole tree, closed branches included.
  const counts = new Map<string, number>()
  const places: number[] = []
  const parents: string[] = []
  const stack: string[] = []
  for (const row of rows) {
    stack.length = row.depth
    const parent = row.depth ? (stack[row.depth - 1] ?? "") : ""
    const place = (counts.get(parent) ?? 0) + 1
    counts.set(parent, place)
    places.push(place)
    parents.push(parent)
    stack[row.depth] = row.key
  }
  const shown: SortableTreeRow[] = []
  let hideBelow = Infinity
  rows.forEach((row, i) => {
    if (row.depth > hideBelow) return
    hideBelow = Infinity
    const branch = branches.has(row.key)
    const expanded = branch && open.has(row.key)
    shown.push({ key: row.key, depth: row.depth, branch, expanded, position: places[i]!, size: counts.get(parents[i]!)! })
    if (branch && !expanded) hideBelow = row.depth
  })
  return shown
}

const sortableTree = definePrimitive({
  name: "sortable-tree",
  options: {
    items: "value",
    defaultItems: "value",
    onItemsChange: "callback",
    expanded: "value",
    defaultExpanded: "value",
    onExpandedChange: "callback",
    maxDepth: "number",
    onAction: "callback",
    message: "value",
    refusedMessage: "value",
  },
  controlled: ["items", "expanded"],
  live: ["moving"],
  state: (options: SortableTreeOptions) => ({
    ...shape(options.items ?? options.defaultItems ?? []),
    expanded: options.expanded ?? options.defaultExpanded ?? ([] as string[]),
    moving: null as TreeReorderDraft | null,
    focused: null as string | null,
  }),
  sync: (options) => ({
    ...(options.items === undefined ? {} : shape(options.items)),
    ...(options.expanded === undefined ? {} : { expanded: options.expanded }),
  }),
  api: (context) => {
    const opts = () => context.options()
    const change = createChange(context)
    const nodes = () => nodesOf(context.store.get().items)
    const label = (key: string) => nodes().get(key)?.label ?? key
    const isBranch = (key: string | null) => key === null || context.store.get().branches.includes(key)
    const isLocked = (key: string) => context.store.get().locked.includes(key)
    const typeahead = createTypeahead()
    const refused = (key: string, into: string) =>
      (opts().refusedMessage ?? ((item, parent) => `${item} can't go inside ${parent}. It went back.`))(label(key), label(into))

    const setExpanded = (key: string, open: boolean, reason: SortableTreeExpandReason, event?: Event) => {
      const { expanded } = context.store.get()
      if (expanded.includes(key) === open) return true
      return change("expanded", open ? [...expanded, key] : expanded.filter((k) => k !== key), { reason, event })
    }

    const roving = createRovingFocus(context, { slot: "row", key: "focused" })
    const tree = createTreeReorder(context, {
      key: "rows",
      draft: "moving",
      set: (rows, details) => {
        const { reason, event, key, parent, index } = details
        if (!isBranch(parent)) {
          announce(refused(key, parent!))
          return false
        }
        const items = build(rows, nodes())
        if (!change("items", items, { reason, event, key, parent, index })) return false
        // Uncontrolled, the rows follow the items now; controlled, they follow when the items come back.
        if (opts().items === undefined) context.store.set({ rows })
        // The branch it went into opens, so it stays in view.
        if (parent) setExpanded(parent, true, "drop", event)
        return true
      },
      indent: () => 20,
      maxDepth: () => opts().maxDepth ?? Infinity,
      disabled: isLocked,
      label,
      message: (m) => {
        // A move into a leaf is shown as it is, and said: dropping there is refused.
        const draft = context.store.get().moving
        if (m.type === "move" && draft) {
          const index = draft.rows.findIndex((row) => row.key === m.key)
          const parent = parentOf(draft.rows, index)
          if (parent && !isBranch(parent)) return `${m.label}: ${label(parent)} can't hold other items.`
        }
        return (opts().message ?? treeReorderMessage)(m)
      },
      preview: true,
    })

    const find = (name: string) => {
      const all = context.store.get().rows.map((row) => row.key)
      const key = all.find((k) => k === name) ?? all.find((k) => label(k).toLowerCase() === String(name).toLowerCase())
      if (!key) throw new Error(`No item "${name}" in this tree.`)
      return key
    }

    const api = {
      tree,
      roving,
      typeahead,
      label,
      isBranch,
      isLocked,
      /** The rows that show now, with each one's place: the draft's during a move. */
      shown: (state: TreeState & { rows: TreeReorderRow[] }) => shownRows(state, tree.rows(state as never)),
      /** Whether the row's parent in the draft can hold it, while it moves. */
      invalid(state: { moving: TreeReorderDraft | null }, key: string) {
        if (state.moving?.key !== key) return false
        const parent = parentOf(state.moving.rows, state.moving.rows.findIndex((row) => row.key === key))
        return parent !== null && !isBranch(parent)
      },
      /** The items now, nested. */
      itemsNow: () => context.store.get().items,
      /** Sets the items from code. Fires nothing, as setting a field's value doesn't. */
      writeItems: (items: SortableTreeItem[]) => context.store.set(shape(items ?? [])),
      expandedNow: () => context.store.get().expanded,
      writeExpanded: (expanded: string[]) => context.store.set({ expanded: [...(expanded ?? [])] }),
      setExpanded,
      /** Enter or a press: a branch opens or closes; any other item runs `onAction`. */
      activate(key: string, event?: Event) {
        if (isBranch(key)) setExpanded(key, !context.store.get().expanded.includes(key), "item-press", event)
        else opts().onAction?.(key)
      },
      /** Moves an item, with what's under it, into a branch (or the top level) at a place from 1. */
      moveItem(item: string, into: string | null = null, position?: number) {
        const key = find(item)
        const parent = into === null || into === "" ? null : find(into)
        if (isLocked(key)) throw new Error(`${label(key)} can't be moved.`)
        if (parent !== null && !isBranch(parent)) throw new Error(`${label(parent)} can't hold other items.`)
        const rows = context.store.get().rows
        const from = rows.findIndex((row) => row.key === key)
        const block = rows.slice(from, subtreeEnd(rows, from)).map((row) => row.key)
        if (parent !== null && block.includes(parent)) throw new Error(`${label(key)} can't go inside itself.`)
        const rest = rows.filter((row) => !block.includes(row.key))
        const at = parent === null ? -1 : rest.findIndex((row) => row.key === parent)
        const depth = parent === null ? 0 : rest[at]!.depth + 1
        const end = parent === null ? rest.length : subtreeEnd(rest, at)
        const siblings = rest.slice(at + 1, end).filter((row) => row.depth === depth)
        const n = position === undefined ? siblings.length + 1 : Math.round(Number(position))
        if (!Number.isFinite(n) || n < 1) throw new Error("Give a position from 1.")
        const before = siblings[n - 1]?.key ?? rest[end]?.key ?? null
        return tree.move(key, before, depth)
      },
      openItem(item: string) {
        if (!opts().onAction) throw new Error("This tree doesn't open items.")
        opts().onAction!(find(item))
        return true
      },
      expandItem: (item: string) => setExpanded(find(item), true, "imperative"),
      collapseItem: (item: string) => setExpanded(find(item), false, "imperative"),
      items: () => {
        const rows = context.store.get().rows
        return rows.map((row, i) => {
          const parent = parentOf(rows, i)
          return { value: row.key, label: label(row.key), ...(parent ? { parent: label(parent) } : {}), level: row.depth + 1 }
        })
      },
    }
    return api
  },
  slots: (slot) => ({
    // The root hands its render function the rows that show, as drawn: the draft's during a move.
    root: slot<{}, { rows: SortableTreeRow[]; moving: boolean; nodes: Map<string, SortableTreeItem> }>({
      role: "tree",
      keys: { none: "The rows handle the keys; the tree is one tab stop." },
      state: (state, { api }) => ({ rows: api.shown(state), moving: state.moving !== null, nodes: nodesOf(state.items) }),
      attrs: () => ({ "aria-roledescription": "sortable tree" }),
      live: live((state) => ({ "data-moving": state.moving ? "" : undefined })),
    }),
    row: slot<{ value: string }, { moving: boolean; dragging: boolean; invalid: boolean }>({
      props: { value: "string" },
      role: "treeitem",
      focus: "roving",
      keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", " ", "Enter", "Escape", "Tab", "typeahead"],
      press: ({ api, key }, event) => api.activate(key, event),
      selects: selects({ focused: ({ key }) => [key, null] }),
      state: (state, { api, key }) => ({
        moving: api.tree.moving(state, key),
        dragging: api.tree.dragging(state, key),
        invalid: api.invalid(state, key),
      }),
      attrs: (state, part) => {
        const row = shownRows(state, state.rows).find((r) => r.key === part.key)
        return {
          tabindex: part.api.roving.tabIndex(state, part),
          "aria-level": String((row?.depth ?? 0) + 1),
          "aria-posinset": row ? String(row.position) : undefined,
          "aria-setsize": row ? String(row.size) : undefined,
          "aria-expanded": row?.branch ? String(row.expanded) : undefined,
          "aria-disabled": state.locked.includes(part.key) ? "true" : undefined,
          "data-branch": row?.branch ? "" : undefined,
        }
      },
      // A move is live state, written straight to the element as it changes: its level too, and
      // whether a branch shows open, since one a row is carried into shows open meanwhile.
      live: live((state, part) => {
        const rows = part.api.tree.rows(state)
        const at = rows.findIndex((row) => row.key === part.key)
        const shown = part.api.shown(state).find((row) => row.key === part.key)
        return {
          "aria-level": String((rows[at]?.depth ?? 0) + 1),
          "aria-expanded": shown?.branch ? String(shown.expanded) : undefined,
          "data-moving": part.api.tree.moving(state, part.key) ? "" : undefined,
          "data-dragging": part.api.tree.dragging(state, part.key) ? "" : undefined,
          "data-invalid": part.api.invalid(state, part.key) ? "" : undefined,
        }
      }),
      on: {
        keydown: (event, { api, key, el, store }) => {
          const e = event as KeyboardEvent
          const state = store.get()
          const carrying = state.moving !== null
          const plain = !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
          if (!carrying && plain) {
            if (e.key === "Enter") {
              e.preventDefault()
              api.activate(key, e)
              return
            }
            const rows = api.shown(state)
            const at = rows.findIndex((row) => row.key === key)
            const row = rows[at]
            const rtl = !!el && isRTL(el)
            const inward = rtl ? "ArrowLeft" : "ArrowRight"
            const outward = rtl ? "ArrowRight" : "ArrowLeft"
            if (row && e.key === inward) {
              e.preventDefault()
              if (row.branch && !row.expanded) api.setExpanded(key, true, "arrow-key", e)
              else if (row.branch && rows[at + 1]?.depth === row.depth + 1) api.roving.focus(rows[at + 1]!.key)
              return
            }
            if (row && e.key === outward) {
              e.preventDefault()
              if (row.branch && row.expanded) api.setExpanded(key, false, "arrow-key", e)
              else {
                for (let i = at - 1; i >= 0; i--) if (rows[i]!.depth < row.depth) return api.roving.focus(rows[i]!.key)
              }
              return
            }
            // Typing a name's first letters goes to it; Space continues a name being typed.
            if (isTypeaheadKey(e) && (e.key !== " " || api.typeahead.active())) {
              const items = api.roving.items()
              const index = api.typeahead(e.key, items.map((item) => api.label(item.key)), items.findIndex((item) => item.key === key))
              if (index !== -1) {
                e.preventDefault()
                api.roving.focus(items[index]!.key)
              }
              return
            }
          }
          // Modified Space and Enter don't pick a row up.
          if (!carrying && (e.key === " " || e.key === "Enter") && !plain) return
          if (api.tree.keydown(e, key)) return
          if (el) api.roving.keydown(e, el)
        },
        // A touch drags from the handle only, so a finger can still scroll the tree. The
        // disclosure arrow opens and closes, and doesn't start a drag.
        pointerdown: (event, { api, key }) => {
          const e = event as PointerEvent
          const target = e.target as Element
          if (target.closest?.("[data-sortable-tree-toggle]")) return
          if (e.pointerType === "touch" && !target.closest?.("[data-sortable-handle]")) return
          api.tree.pointerdown(e, key)
        },
      },
      bind: (el, part) => {
        const cleanups = [part.api.roving.bind(el, part), part.api.tree.bind(el, part.key)]
        return () => cleanups.forEach((cleanup) => cleanup())
      },
    }),
  }),
  agent: {
    actions: ["moveItem", "openItem", "expandItem", "collapseItem"],
    items: (api) => api.items(),
  },
})

export { build, flatten, nodesOf, sortableTree }
export type { SortableTreeExpandReason, SortableTreeItem, SortableTreeItemsDetails, SortableTreeOptions, SortableTreeRow }
