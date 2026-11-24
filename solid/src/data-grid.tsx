import type { JSX } from "@solidjs/web"
import { announce, bindDrag, createVirtualizer, inputHints, isRTL, type GridCell, type StateOf, type VirtualItem } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/solid/primitive"
import { createContext, createEffect, createMemo, createSignal, createUniqueId, For, omit, onCleanup, onSettled, Show, untrack, useContext } from "solid-js"
import { Button } from "./button"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, createComboboxController } from "./combobox"
import { Field, FieldLabel, Input } from "./field"
import {
  createMenuController,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "./menu"
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./popover"
import { ScrollBox } from "./scroll-area"
import { SearchField } from "./search-field"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"
import { Icon } from "./shell/icons"
import {
  display,
  download,
  editTextOf,
  HEADER_HEIGHT,
  parse,
  RESIZE_STEP,
  ROW_HEIGHTS,
  SELECT_WIDTH,
  sortMessage,
  type DataGridColumnState,
  type DataGridDensity,
  type DataGridEdit,
  type GridColumnSpec,
} from "../../registry/uiset/ui/data-grid/columns"
import { dataGrid, type DataGridCommands } from "../../registry/uiset/ui/data-grid/grid"
import { filterRows, groupRows, nextSort, sortRows, toCsv, type SortRule, type ViewItem } from "../../registry/uiset/ui/data-grid/view"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/data-grid/data-grid.css"

// The data grid in Solid, as React's: the grid's keys, focus, ranges, editing and clipboard are
// the shared primitive (data-grid/grid.ts), and the view (filter, sort, group) and columns are
// shared too. This file holds the state, the virtualized rows and the toolbar parts.

type DataGridColumn<Row> = GridColumnSpec<Row> & {
  /** Custom content. Copying, filtering and sorting still use `value` and `text`. */
  render?: (row: Row) => JSX.Element
}

type DataGridProps<Row> = {
  rows: readonly Row[]
  columns: readonly DataGridColumn<Row>[]
  getRowId: (row: Row) => string
  /** The grid's accessible name, also how agents find it. */
  label: string
  /** Reads typed numbers and dates, and formats counts. Pass it when rendering on a server. */
  locale?: string
  selectable?: boolean
  selected?: readonly string[]
  defaultSelected?: readonly string[]
  onSelectedChange?: (ids: string[]) => void
  sort?: readonly SortRule[]
  defaultSort?: readonly SortRule[]
  onSortChange?: (sort: SortRule[]) => void
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  filters?: Record<string, string>
  defaultFilters?: Record<string, string>
  onFiltersChange?: (filters: Record<string, string>) => void
  groupBy?: string | null
  defaultGroupBy?: string | null
  onGroupByChange?: (column: string | null) => void
  columnState?: DataGridColumnState
  defaultColumnState?: Partial<DataGridColumnState>
  onColumnStateChange?: (state: DataGridColumnState) => void
  density?: DataGridDensity
  defaultDensity?: DataGridDensity
  onDensityChange?: (density: DataGridDensity) => void
  /** Saves column order, widths, visibility, pinning and density under this key. */
  persist?: string
  /** Saves an edit. Return false to keep the editor open. Without it nothing is editable. */
  onCellEdit?: (edit: DataGridEdit<Row>) => boolean | void
  /** Enter on a cell that isn't edited in place, like opening the row's details. */
  onRowAction?: (row: Row) => void
  /** The grid's block size, like "28rem". Rows past it scroll and aren't rendered. */
  height?: string
  empty?: JSX.Element
  /** A toolbar, like `<DataGridToolbar />` or its parts, shown above the grid. */
  children?: JSX.Element
  class?: string
}

const none: readonly string[] = []

/** A value the page may hold (`value` given) or leave to the grid (a default). */
function controllable<T>(value: () => T | undefined, initial: T, onChange: () => ((value: T) => void) | undefined) {
  // Written from settled callbacks too, like a saved layout loading. Boxed, so a value is
  // never taken for a function to derive it from.
  const [inner, setInner] = createSignal<{ value: T }>({ value: initial }, { ownedWrite: true })
  const current = () => {
    const given = value()
    return given !== undefined ? given : inner().value
  }
  const set = (next: T) => {
    if (untrack(value) === undefined) setInner({ value: next })
    untrack(onChange)?.(next)
  }
  return [current, set] as const
}

// Shared with the toolbar parts, which may sit anywhere inside the grid's children.
type GridContextValue = {
  readonly label: string
  readonly columns: {
    id: string
    header: string
    shown: boolean
    hideable: boolean
    filterable: boolean
    groupable: boolean
  }[]
  readonly query: string
  setQuery: (query: string) => void
  readonly filters: Record<string, string>
  setFilter: (column: string, text: string) => void
  clearFilters: () => void
  readonly groupBy: string | null
  setGroupBy: (column: string | null) => void
  setShown: (column: string, shown: boolean) => void
  readonly density: DataGridDensity
  setDensity: (density: DataGridDensity) => void
  exportCsv: (filename: string) => void
  readonly total: number
  readonly shown: number
  readonly selectedCount: number
  clearSelection: () => void
  /** Puts focus back in the grid, on its active cell, like after the selection bar goes away. */
  focusGrid: () => void
  count: (n: number) => string
}

const GridContext = createContext<GridContextValue | null>(null)

/** The grid around a toolbar part: its label, filters, columns, selection and actions. */
function useDataGrid() {
  const context = useContext(GridContext)
  if (!context) throw new Error("Data grid toolbar parts must be inside a DataGrid")
  return context
}

type CellState = StateOf<typeof dataGrid, "cell">

function GridCellPart(props: { row: number; col: number } & PartProps<"div", CellState>) {
  return usePart(dataGrid, "cell", () => ({ row: props.row, col: props.col, value: `${props.row}:${props.col}` }), omit(props, "row", "col") as PartProps<"div", CellState>, "div")
}

function GridEditor(props: { error: string | null; onClose: () => void } & PartProps<"input">) {
  const errorId = createUniqueId()
  // A message belongs to this editing session; it goes when the editor does.
  onCleanup(() => props.onClose())
  return (
    <>
      {usePart(
        dataGrid,
        "editor",
        () => ({}),
        {
          ...omit(props, "error", "onClose"),
          get "aria-invalid"() {
            return props.error ? ("true" as const) : undefined
          },
          get "aria-describedby"() {
            return props.error ? errorId : undefined
          },
        },
        "input",
      )}
      <Show when={props.error}>
        <span id={errorId} class="data-grid-error">
          {props.error}
        </span>
      </Show>
    </>
  )
}

/**
 * The editor for a column with `options`: UI SDK's Combobox in the cell. Typing narrows the
 * list, the arrows move through it, and Enter or a press chooses, which saves.
 */
function GridOptionEditor(props: {
  label: string
  options: readonly string[]
  value: string
  typed: string | null
  error: string | null
  onChoose: (value: string) => boolean
  onLeave: (refocus: boolean) => void
  onClose: () => void
}) {
  const errorId = createUniqueId()
  let highlighted: string | null = null
  let input: HTMLInputElement | undefined
  const controller = createComboboxController<string>()
  onCleanup(() => props.onClose())
  // An edit started by typing begins as if that character had been typed here: it narrows
  // the list, and the first match is ready for Enter. The input takes focus, as a person
  // started editing from the cell.
  onSettled(() => {
    const typed = untrack(() => props.typed)
    if (typed !== null) controller.setQuery(typed, { reason: "input-change" })
    input?.focus()
  })
  return (
    <Combobox
      controller={controller}
      defaultValue={untrack(() => (props.options.includes(props.value) ? props.value : null))}
      defaultOpen
      autoHighlight="always"
      onHighlight={(item) => {
        highlighted = item as string | null
      }}
      onValueChange={(next) => {
        if (typeof next === "string") props.onChoose(next)
      }}
      onOpenChange={(open, details) => {
        if (open) return
        // Escape gives the cell its focus back. A press or focus somewhere else keeps it there.
        if (details.reason === "escape-key") props.onLeave(true)
        else if (details.reason === "outside-press" || details.reason === "focus-out") props.onLeave(false)
      }}
    >
      <ComboboxInput
        ref={(el: HTMLInputElement) => (input = el)}
        class="data-grid-editor"
        aria-label={props.label}
        aria-invalid={props.error ? "true" : undefined}
        aria-describedby={props.error ? errorId : undefined}
        // An edit started by typing keeps what was typed; otherwise the old value is
        // selected, so typing replaces it.
        onFocus={(event: FocusEvent & { currentTarget: HTMLInputElement }) => {
          if (props.typed === null) event.currentTarget.select()
        }}
        // Tab saves the highlighted option, as it saves text in the other editors, and
        // focus stays with the cell.
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== "Tab") return
          event.preventDefault()
          if (highlighted === null || !props.onChoose(highlighted)) props.onLeave(true)
        }}
      />
      <ComboboxContent class="data-grid-options" data-grid-control="" align="start" sideOffset={2}>
        <ComboboxEmpty>No match</ComboboxEmpty>
        <ComboboxList>
          <For each={props.options}>{(option) => <ComboboxItem value={option}>{option}</ComboboxItem>}</For>
        </ComboboxList>
      </ComboboxContent>
      <Show when={props.error}>
        <span id={errorId} class="data-grid-error">
          {props.error}
        </span>
      </Show>
    </Combobox>
  )
}

function Checkbox(props: { checked: boolean; mixed?: boolean; label: string; onToggle: (shift: boolean) => void }) {
  // A native checkbox the cell owns. It never takes focus, which stays on the cell (the
  // grid's one tab stop), and Space on the cell toggles it the same as a click. It wears
  // the checkbox slot and its state, so each skin draws it like its other checkboxes.
  let box: HTMLInputElement | undefined
  createEffect(
    () => !!props.mixed,
    (mixed) => {
      if (box) box.indeterminate = mixed
    },
  )
  return (
    <input
      ref={(el) => (box = el)}
      type="checkbox"
      class="data-grid-checkbox"
      data-slot="checkbox"
      data-checked={props.checked && !props.mixed ? "" : undefined}
      data-indeterminate={props.mixed ? "" : undefined}
      tabindex={-1}
      aria-label={props.label}
      checked={props.checked}
      readonly
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => props.onToggle(event.shiftKey)}
    />
  )
}

function DataGrid<Row>(props: DataGridProps<Row>) {
  const [selected, setSelected] = controllable<readonly string[]>(
    () => props.selected,
    untrack(() => props.defaultSelected ?? none),
    () => props.onSelectedChange as ((ids: readonly string[]) => void) | undefined,
  )
  const [sort, setSort] = controllable<readonly SortRule[]>(
    () => props.sort,
    untrack(() => props.defaultSort ?? []),
    () => props.onSortChange as ((sort: readonly SortRule[]) => void) | undefined,
  )
  const [query, setQuery] = controllable(
    () => props.query,
    untrack(() => props.defaultQuery ?? ""),
    () => props.onQueryChange,
  )
  const [filters, setFilters] = controllable(
    () => props.filters,
    untrack(() => props.defaultFilters ?? {}),
    () => props.onFiltersChange,
  )
  const [groupBy, setGroupBy] = controllable<string | null>(
    () => props.groupBy,
    untrack(() => props.defaultGroupBy ?? null),
    () => props.onGroupByChange,
  )
  const [columnState, setColumnState] = controllable<DataGridColumnState>(
    () => props.columnState,
    untrack(() => ({
      order: props.defaultColumnState?.order ?? props.columns.map((c) => c.id),
      widths: props.defaultColumnState?.widths ?? {},
      hidden: props.defaultColumnState?.hidden ?? props.columns.filter((c) => c.hidden).map((c) => c.id),
      pinned: props.defaultColumnState?.pinned ?? props.columns.filter((c) => c.pinned).map((c) => c.id),
    })),
    () => props.onColumnStateChange,
  )
  const [density, setDensity] = controllable<DataGridDensity>(
    () => props.density,
    untrack(() => props.defaultDensity ?? "standard"),
    () => props.onDensityChange,
  )
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set())
  const [editError, setEditError] = createSignal<{ cell: string; message: string } | null>(null)
  const [dragWidth, setDragWidth] = createSignal<{ id: string; width: number } | null>(null)
  const helpId = createUniqueId()
  let scroller: HTMLDivElement | undefined
  let anchorRow: string | null = null
  let pendingFocus: GridCell | null = null
  const menu = createMenuController<string>()
  const counter = createMemo(() => new Intl.NumberFormat(props.locale))
  const count = (n: number) => untrack(counter).format(n)
  const closeEditor = () => setEditError(null)

  // Saved layout loads once the grid is on the page, so server and client markup agree.
  // Saving waits until it has loaded, so the defaults never overwrite it.
  const [loaded, setLoaded] = createSignal(false, { ownedWrite: true })
  onSettled(() => {
    const key = untrack(() => props.persist)
    if (!key) return
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null")
      if (saved?.columns) setColumnState({ ...untrack(columnState), ...saved.columns })
      if (saved?.density in ROW_HEIGHTS) setDensity(saved.density)
    } catch {
      // Storage can be unavailable or hold something else; the defaults stand.
    }
    setLoaded(true)
  })
  createEffect(
    () => ({ key: props.persist, loaded: loaded(), columns: columnState(), density: density() }),
    ({ key, loaded: ready, columns, density: rows }) => {
      if (!key || !ready) return
      try {
        localStorage.setItem(key, JSON.stringify({ columns, density: rows }))
      } catch {
        // Private windows and full storage keep working without saving.
      }
    },
  )

  // Columns as shown: pinned ones first, hidden ones left out.
  const byId = createMemo(() => new Map(props.columns.map((column) => [column.id, column])))
  const order = createMemo(() => {
    const state = columnState()
    return [...state.order.filter((id) => byId().has(id)), ...props.columns.map((c) => c.id).filter((id) => !state.order.includes(id))]
  })
  const pinned = createMemo(() => new Set(columnState().pinned))
  const hidden = createMemo(() => new Set(columnState().hidden))
  const shownIds = createMemo(() => [...order().filter((id) => pinned().has(id)), ...order().filter((id) => !pinned().has(id))].filter((id) => !hidden().has(id)))
  const visible = createMemo(() => shownIds().map((id) => byId().get(id)!))
  const offset = () => (props.selectable ? 1 : 0)
  const colCount = () => offset() + visible().length
  const clampWidth = (column: DataGridColumn<Row>, width: number) => Math.round(Math.min(960, Math.max(column.minWidth ?? 64, width)))
  const widthOf = (column: DataGridColumn<Row>) => {
    const drag = dragWidth()
    return drag?.id === column.id ? drag.width : clampWidth(column, columnState().widths[column.id] ?? column.width ?? 160)
  }

  const layout = createMemo(() => {
    let edge = props.selectable ? SELECT_WIDTH : 0
    const pinOffsets = new Map<string, number>()
    for (const column of visible()) {
      if (!pinned().has(column.id)) continue
      pinOffsets.set(column.id, edge)
      edge += widthOf(column)
    }
    const columns = visible()
    return {
      pinOffsets,
      stickyWidth: edge,
      lastSticky: columns.filter((c) => pinned().has(c.id)).at(-1)?.id ?? (props.selectable ? "" : null),
      // The last column takes any room left, so the rows always reach the edge.
      template: [
        ...(props.selectable ? [`${SELECT_WIDTH}px`] : []),
        ...columns.map((column, index) => (index === columns.length - 1 ? `minmax(${widthOf(column)}px, 1fr)` : `${widthOf(column)}px`)),
      ].join(" "),
      totalWidth: columns.reduce((sum, c) => sum + widthOf(c), props.selectable ? SELECT_WIDTH : 0),
    }
  })

  // The view: filter, sort, group.
  const searchText = createMemo(() => {
    const columns = props.columns
    const cache = new WeakMap<object, readonly string[]>()
    return (row: Row) => {
      const key = row as unknown as object
      const cached = typeof row === "object" && row !== null ? cache.get(key) : undefined
      if (cached) return cached
      const texts = columns.map((column) => display(column, row).toLowerCase())
      if (typeof row === "object" && row !== null) cache.set(key, texts)
      return texts
    }
  })
  const filtered = createMemo(() => filterRows(props.rows, props.columns, query(), filters(), searchText()))
  const sorted = createMemo(() => sortRows(filtered(), props.columns, sort()))
  const groupColumn = createMemo(() => {
    const id = groupBy()
    return id ? (byId().get(id) ?? null) : null
  })
  const items = createMemo<ViewItem<Row>[]>(() => groupRows(sorted(), props.getRowId, groupColumn(), collapsed()))
  const selectedSet = createMemo(() => new Set(selected()))
  const rowIds = createMemo(() => sorted().map(props.getRowId))
  // Shift-click ranges follow the rows on screen, in their order, groups included.
  const screenIds = createMemo(() => items().flatMap((item) => (item.kind === "row" ? [item.id] : [])))
  const selectedShown = createMemo(() => rowIds().reduce((n, id) => n + (selectedSet().has(id) ? 1 : 0), 0))
  const allShownSelected = () => rowIds().length > 0 && selectedShown() === rowIds().length
  const rowHeight = () => ROW_HEIGHTS[density()]

  const spanRows = createMemo(() => items().flatMap((item, index) => (item.kind === "group" ? [index + 1] : [])))
  const itemAt = (row: number) => (row > 0 ? items()[row - 1] : undefined)
  const columnAt = (col: number) => (col >= offset() ? visible()[col - offset()] : undefined)
  const primaryText = (row: Row) => (visible()[0] ? display(visible()[0]!, row) : props.getRowId(row))

  // Rows render only while near the viewport. The virtualizer asks when it measures, outside
  // any tracking, for the latest count and row height.
  let handleRef: { api: { grid: { active: () => GridCell | null } } } | undefined
  const virtual = createVirtualizer({
    count: () => untrack(() => items().length),
    estimate: () => untrack(rowHeight),
    overscan: 8,
    scrollMargin: HEADER_HEIGHT,
    keep: () => {
      const active = handleRef?.api?.grid.active()
      return active && active.row > 0 ? [active.row - 1] : []
    },
  })
  createEffect(
    () => ({ count: items().length, height: rowHeight() }),
    (now, before) => {
      if (before && before.height !== now.height) virtual.reset()
      else virtual.refresh()
    },
  )
  onSettled(() => (scroller ? virtual.connect(scroller) : undefined))

  const toggleRow = (id: string, shift = false) => {
    const ids = screenIds()
    const from = anchorRow === null ? -1 : ids.indexOf(anchorRow)
    const to = ids.indexOf(id)
    if (shift && from >= 0 && to >= 0) {
      const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1)
      setSelected([...new Set([...selected(), ...range])])
    } else {
      setSelected(selectedSet().has(id) ? selected().filter((x) => x !== id) : [...selected(), id])
    }
    anchorRow = id
  }
  const toggleAll = () => {
    if (allShownSelected()) {
      const shownSet = new Set(rowIds())
      setSelected(selected().filter((id) => !shownSet.has(id)))
      announce("Rows deselected")
    } else {
      setSelected([...new Set([...selected(), ...rowIds()])])
      announce(`${count(rowIds().length)} rows selected`)
    }
  }
  const toggleGroup = (key: string) => {
    const next = new Set(collapsed())
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }
  const sortColumn = (column: DataGridColumn<Row>, additive: boolean) => {
    const next = nextSort(sort(), column.id, additive)
    setSort(next)
    announce(sortMessage(next, props.columns))
  }
  /** Saves an edit. `cell` marks an edit typed into the grid, whose message shows there. */
  const commit = (row: Row, column: DataGridColumn<Row>, text: string, cell?: string) => {
    const parsed = parse(column, text, props.locale)
    if ("error" in parsed) {
      if (cell) {
        setEditError({ cell, message: parsed.error })
        announce(parsed.error, { priority: "assertive" })
      }
      return false
    }
    const accepted = props.onCellEdit?.({ row, rowId: props.getRowId(row), column: column.id, value: parsed.value, text }) !== false
    if (accepted && cell) setEditError(null)
    return accepted
  }
  const resizeColumn = (column: DataGridColumn<Row>, width: number) => {
    const next = clampWidth(column, width)
    setColumnState({ ...columnState(), widths: { ...columnState().widths, [column.id]: next } })
    announce(`${column.header}, ${next} pixels wide`)
    return next
  }
  const resetWidth = (id: string) => {
    const next = { ...columnState().widths }
    delete next[id]
    setColumnState({ ...columnState(), widths: next })
  }
  const moveColumn = (id: string, delta: number) => {
    const ids = shownIds()
    const index = ids.indexOf(id)
    const target = ids[index + delta]
    if (!target || pinned().has(target) !== pinned().has(id)) return false
    const next = [...order()]
    const a = next.indexOf(id)
    const b = next.indexOf(target)
    ;[next[a], next[b]] = [next[b]!, next[a]!]
    setColumnState({ ...columnState(), order: next })
    announce(`${byId().get(id)?.header} moved to column ${index + delta + 1 + offset()}`)
    return true
  }
  const setShown = (id: string, shown: boolean) => {
    const next = new Set(hidden())
    if (shown) next.delete(id)
    else if (shownIds().length > 1) next.add(id)
    setColumnState({ ...columnState(), hidden: [...next] })
  }
  const setPinned = (id: string, pin: boolean) => {
    const next = new Set(pinned())
    if (pin) next.add(id)
    else next.delete(id)
    setColumnState({ ...columnState(), pinned: [...next] })
  }
  const setFilter = (column: string, text: string) => {
    const next = { ...filters() }
    if (text) next[column] = text
    else delete next[column]
    setFilters(next)
  }
  const exportCsv = (filename: string) => {
    const chosen = selectedShown() ? sorted().filter((row) => selectedSet().has(props.getRowId(row))) : sorted()
    download(filename, toCsv(chosen, visible()))
    announce(`Exported ${count(chosen.length)} rows`)
  }

  // Agents name columns by id or header, and rows by id or by their first column.
  // A step that can't run throws an Error saying why, which the agent reads and acts on.
  const columnNames = () => visible().map((c) => c.header).join(", ")
  const findColumn = (name: string) => {
    const column = byId().get(name) ?? props.columns.find((c) => c.header.toLowerCase() === String(name).toLowerCase())
    if (!column) throw new Error(`No column "${name}" in ${props.label}. Its columns: ${columnNames()}.`)
    return column
  }
  const findRow = (name: string) => {
    const row = props.rows.find((r) => props.getRowId(r) === name) ?? props.rows.find((r) => primaryText(r).toLowerCase() === String(name).toLowerCase())
    if (row === undefined) throw new Error(`No row "${name}" in ${props.label}.`)
    return row
  }
  const refuse = (message: string): never => {
    throw new Error(message)
  }
  const commands: DataGridCommands = {
    sortBy: (name, direction = "ascending") => {
      const column = findColumn(name)
      if (column.sortable === false) refuse(`${column.header} can't be sorted.`)
      if (direction !== "ascending" && direction !== "descending" && direction !== "none") refuse(`Sort direction must be ascending, descending or none, not "${direction}".`)
      const next: SortRule[] = direction === "none" ? [] : [{ column: column.id, direction }]
      setSort(next)
      return true
    },
    filter: (text) => {
      setQuery(String(text ?? ""))
      return true
    },
    filterColumn: (name, text) => {
      const column = findColumn(name)
      if (column.filterable === false) refuse(`${column.header} can't be filtered.`)
      setFilter(column.id, String(text ?? ""))
      return true
    },
    selectRows: (names) => {
      if (!props.selectable) refuse(`Rows in ${props.label} can't be selected.`)
      if (!Array.isArray(names)) refuse("selectRows takes a list of row names.")
      setSelected(names.map((name) => props.getRowId(findRow(name))))
      return true
    },
    clearSelection: () => {
      setSelected([])
      return true
    },
    editCell: (rowName, columnName, text) => {
      const row = findRow(rowName)
      const column = findColumn(columnName)
      if (!column.editable || !props.onCellEdit) refuse(`${column.header} can't be edited.`)
      const parsed = parse(column, String(text ?? ""), props.locale)
      if ("error" in parsed) refuse(parsed.error)
      if (!commit(row, column, String(text))) refuse(`${props.label} didn't accept that ${column.header}.`)
      return true
    },
    groupBy: (name) => {
      if (name === null || name === "" || String(name).toLowerCase() === "none") {
        setGroupBy(null)
        return true
      }
      const column = findColumn(name)
      if (column.groupable === false) refuse(`Rows can't be grouped by ${column.header}.`)
      setGroupBy(column.id)
      return true
    },
    showColumn: (name, shown) => {
      const column = findColumn(name)
      if (column.hideable === false && !shown) refuse(`${column.header} can't be hidden.`)
      setShown(column.id, shown !== false)
      return true
    },
  }

  // What agents read about the view. One object per change, so the grid's state settles.
  const view = createMemo(() => ({
    rows: sorted().length,
    of: props.rows.length,
    sort: sort().length ? sortMessage(sort(), props.columns) : "none",
    filter: query(),
    ...(Object.keys(filters()).length ? { columnFilters: filters() } : {}),
    groupBy: groupColumn()?.header ?? "none",
    selected: selected().length,
  }))

  const handle = usePrimitive(dataGrid, () => ({
    rowCount: 1 + items().length,
    colCount: colCount(),
    // Read at the key press: how many whole rows the scroller shows.
    pageSize: () => Math.max(1, Math.floor(((scroller?.clientHeight ?? 400) - HEADER_HEIGHT) / untrack(rowHeight)) - 1),
    spanRows: spanRows(),
    cellText: (cell: GridCell) => {
      if (cell.row === 0) return columnAt(cell.col)?.header ?? ""
      const item = itemAt(cell.row)
      if (!item) return ""
      if (item.kind === "group") return cell.col === 0 ? `${item.label} (${item.count})` : ""
      const column = columnAt(cell.col)
      return column ? display(column, item.row) : ""
    },
    editText: (cell: GridCell) => {
      const item = itemAt(cell.row)
      const column = columnAt(cell.col)
      if (item?.kind !== "row" || !column) return ""
      // Numbers and dates start from plain values, not their formatting.
      return editTextOf(column, item.row)
    },
    editable: (cell: GridCell) => {
      const item = itemAt(cell.row)
      const column = columnAt(cell.col)
      return item?.kind === "row" && !!column?.editable && column.type !== "boolean" && !!props.onCellEdit
    },
    onCellEdit: (cell: GridCell, text: string) => {
      const item = itemAt(cell.row)
      const column = columnAt(cell.col)
      return item?.kind === "row" && column ? commit(item.row, column, text, `${cell.row}:${cell.col}`) : false
    },
    onActivate: (cell: GridCell, event: KeyboardEvent | MouseEvent) => {
      if (cell.row === 0) {
        if (props.selectable && cell.col === 0) return toggleAll()
        const column = columnAt(cell.col)
        if (column && column.sortable !== false) sortColumn(column, event.shiftKey)
        return
      }
      const item = itemAt(cell.row)
      if (!item) return
      if (item.kind === "group") return toggleGroup(item.key)
      if (props.selectable && cell.col === 0) return toggleRow(item.id)
      const column = columnAt(cell.col)
      if (column?.type === "boolean" && column.editable && props.onCellEdit) {
        commit(item.row, column, column.value(item.row) ? "no" : "yes")
        return
      }
      props.onRowAction?.(item.row)
    },
    onCellKey: (cell: GridCell, event: KeyboardEvent, target: HTMLElement) => {
      if (cell.row !== 0) return false
      const column = columnAt(cell.col)
      if (!column) return false
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        void menu.open({ payload: column.id, anchor: target })
        return true
      }
      const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight"
      if (!event.altKey || !horizontal || event.ctrlKey || event.metaKey) return false
      const forward = event.key === "ArrowRight" !== isRTL(target)
      if (event.shiftKey) {
        if (moveColumn(column.id, forward ? 1 : -1)) pendingFocus = { row: 0, col: cell.col + (forward ? 1 : -1) }
      } else {
        resizeColumn(column, widthOf(column) + (forward ? RESIZE_STEP : -RESIZE_STEP))
      }
      return true
    },
    onPaste: (start: GridCell, pasted: string[][]) => {
      let pastedCount = 0
      let refused = 0
      pasted.forEach((cells, i) =>
        cells.forEach((text, j) => {
          const item = itemAt(start.row + i)
          const column = columnAt(start.col + j)
          if (item?.kind !== "row" || !column?.editable || !props.onCellEdit) return
          if (commit(item.row, column, text)) pastedCount++
          else refused++
        }),
      )
      const pastedText = pastedCount ? `Pasted ${count(pastedCount)} ${pastedCount === 1 ? "cell" : "cells"}` : "Nothing pasted"
      announce(refused ? `${pastedText}; ${count(refused)} didn't fit their column` : pastedCount ? pastedText : "Nothing pasted: these cells can't be edited")
    },
    reveal: (cell: GridCell) => {
      if (cell.row > 0) virtual.scrollToIndex(cell.row - 1)
    },
    items: () =>
      sorted().map((row) => {
        const entry: Record<string, string> = { id: props.getRowId(row) }
        for (const column of visible()) entry[column.header] = display(column, row)
        return entry
      }),
    view: view(),
    commands,
  }))
  handleRef = handle as unknown as typeof handleRef

  // A column moved from the keyboard keeps focus on its header, at its new place.
  createEffect(shownIds, () => {
    const cell = pendingFocus
    if (!cell) return
    pendingFocus = null
    queueMicrotask(() => handle.api.grid.focus(cell, { reason: "imperative" }))
  })
  const headerOf = (id: string): GridCell | null => {
    const index = visible().findIndex((column) => column.id === id)
    return index < 0 ? null : { row: 0, col: index + offset() }
  }

  // The filter announces its count once typing pauses.
  createEffect(
    () => ({ query: query(), filters: filters(), rows: sorted().length }),
    ({ query: typed, filters: columnFilters, rows }) => {
      if (!typed && !Object.keys(columnFilters).length) return
      const timer = setTimeout(() => announce(`${count(rows)} ${rows === 1 ? "row" : "rows"}`), 600)
      return () => clearTimeout(timer)
    },
  )

  const stickyAttrs = (id: string) => {
    const left = id === "" ? 0 : layout().pinOffsets.get(id)
    return {
      "data-pinned": left !== undefined ? "" : undefined,
      "data-pinned-edge": id === layout().lastSticky ? "" : undefined,
      style: left === undefined ? undefined : { "inset-inline-start": `${left}px` },
    }
  }

  // Dragging a header's edge previews the width, and saves it once, on release.
  const startResize = (event: PointerEvent & { currentTarget: HTMLElement }, column: DataGridColumn<Row>) => {
    event.preventDefault()
    event.stopPropagation()
    const start = widthOf(column)
    const startX = event.clientX
    const rtl = isRTL(event.currentTarget)
    let width = start
    bindDrag(event.currentTarget, event, {
      cancelOnEscape: true,
      // Measured from where the press began: moves arrive once a frame, so adding up
      // movementX would lose distance.
      onMove: ({ x }) => {
        width = clampWidth(column, start + (rtl ? startX - x : x - startX))
        setDragWidth({ id: column.id, width })
      },
      onEnd: (_event, canceled) => {
        setDragWidth(null)
        if (!canceled && width !== start) resizeColumn(column, width)
      },
    })
  }

  const align = (column: DataGridColumn<Row>) => column.align ?? (column.type === "number" ? "end" : undefined)

  // Drawn inside the grid's root, where the cells find it: Solid builds JSX where it's written.
  const header = () => (
    <div role="row" aria-rowindex={1} class="data-grid-row data-grid-header-row">
      <Show when={props.selectable}>
        <GridCellPart row={0} col={0} class="data-grid-cell data-grid-select" {...stickyAttrs("")}>
          <Checkbox checked={allShownSelected()} mixed={selectedShown() > 0 && !allShownSelected()} label="Select all rows" onToggle={toggleAll} />
        </GridCellPart>
      </Show>
      <For each={visible()}>
        {(column, index) => {
          const sortIndex = () => sort().findIndex((rule) => rule.column === column.id)
          const rule = () => sort()[sortIndex()]
          return (
            <GridCellPart
              row={0}
              col={index() + offset()}
              class="data-grid-cell data-grid-header"
              data-align={align(column)}
              aria-sort={sort()[0]?.column === column.id ? sort()[0]!.direction : undefined}
              onClick={(event: MouseEvent) => {
                if ((event.target as Element).closest("[data-grid-handle]")) return
                if (column.sortable !== false) sortColumn(column, event.shiftKey)
              }}
              onContextMenu={(event: MouseEvent) => {
                event.preventDefault()
                void menu.open({ payload: column.id, anchor: { x: event.clientX, y: event.clientY } })
              }}
              {...stickyAttrs(column.id)}
            >
              <span class="data-grid-header-label">{column.header}</span>
              <Show when={rule()}>
                {(shown) => (
                  <span class="data-grid-sort" aria-hidden="true">
                    <Icon name={shown().direction === "ascending" ? "up" : "down"} />
                    <Show when={sort().length > 1}>
                      <span class="data-grid-sort-order">{sortIndex() + 1}</span>
                    </Show>
                  </span>
                )}
              </Show>
              {/* For pointers and touch screen readers; keyboards use Shift+F10 on the header. */}
              <button
                type="button"
                tabindex={-1}
                class="data-grid-menu-button"
                data-grid-handle=""
                aria-label={`${column.header} column menu`}
                aria-haspopup="menu"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => void menu.open({ payload: column.id, anchor: event.currentTarget.closest<HTMLElement>("[role=columnheader]") ?? undefined })}
              >
                <Icon name="more" />
              </button>
              <span class="data-grid-resizer" data-grid-handle="" aria-hidden="true" onPointerDown={(event) => startResize(event, column)} onDblClick={() => resetWidth(column.id)} />
            </GridCellPart>
          )
        }}
      </For>
    </div>
  )

  /** One row the virtualizer shows: a group's header row, or a row of cells. */
  const renderRow = (virtualItem: () => VirtualItem) => {
    const item = () => items()[virtualItem().index]
    const row = () => virtualItem().index + 1
    const style = () => ({ top: `${virtualItem().start}px`, "block-size": `${rowHeight()}px` })
    return (
      <Show when={item()}>
        {(current) => (
          <Show
            when={current().kind === "group" && (current() as Extract<ViewItem<Row>, { kind: "group" }>)}
            fallback={<DataRow item={current() as Extract<ViewItem<Row>, { kind: "row" }>} row={row()} style={style()} />}
          >
            {(group) => (
              <div role="row" aria-rowindex={row() + 1} class="data-grid-row data-grid-group-row" style={style()}>
                <GridCellPart
                  row={row()}
                  col={0}
                  aria-colspan={colCount()}
                  aria-expanded={group().expanded ? "true" : "false"}
                  class="data-grid-cell data-grid-group"
                  onClick={() => toggleGroup(group().key)}
                >
                  <span class="data-grid-group-inner">
                    <Icon name="chevron" class="data-grid-chevron" />
                    <span class="data-grid-group-label">{group().label}</span>
                    <span class="data-grid-count">{count(group().count)}</span>
                  </span>
                </GridCellPart>
              </div>
            )}
          </Show>
        )}
      </Show>
    )
  }

  function DataRow(rowProps: { item: Extract<ViewItem<Row>, { kind: "row" }>; row: number; style: JSX.CSSProperties }) {
    const isSelected = () => selectedSet().has(rowProps.item.id)
    return (
      <div
        role="row"
        aria-rowindex={rowProps.row + 1}
        aria-selected={props.selectable ? (isSelected() ? "true" : "false") : undefined}
        data-selected={isSelected() ? "" : undefined}
        class="data-grid-row"
        style={rowProps.style}
      >
        <Show when={props.selectable}>
          <GridCellPart row={rowProps.row} col={0} class="data-grid-cell data-grid-select" {...stickyAttrs("")}>
            <Checkbox checked={isSelected()} label={`Select ${primaryText(rowProps.item.row)}`} onToggle={(shift) => toggleRow(rowProps.item.id, shift)} />
          </GridCellPart>
        </Show>
        <For each={visible()}>
          {(column, index) => {
            const cellId = () => `${rowProps.row}:${index() + offset()}`
            const error = () => (editError()?.cell === cellId() ? editError()!.message : null)
            return (
              <GridCellPart
                row={rowProps.row}
                col={index() + offset()}
                class="data-grid-cell"
                data-align={align(column)}
                data-editable={column.editable && props.onCellEdit ? "" : undefined}
                {...stickyAttrs(column.id)}
              >
                {(state: CellState) => (
                  <Show
                    when={state.editing}
                    fallback={
                      <Show when={column.render} fallback={column.type === "boolean" ? <span class="data-grid-boolean" data-value={String(!!column.value(rowProps.item.row))}>{display(column, rowProps.item.row)}</span> : display(column, rowProps.item.row)}>
                        {(render) => <>{render()(rowProps.item.row)}</>}
                      </Show>
                    }
                  >
                    <Show
                      when={column.options}
                      fallback={<GridEditor class="data-grid-editor" aria-label={column.header} error={error()} onClose={closeEditor} {...(column.type === "number" ? inputHints("decimal") : {})} />}
                    >
                      {(options) => (
                        <GridOptionEditor
                          label={column.header}
                          options={options()}
                          value={editTextOf(column, rowProps.item.row)}
                          typed={untrack(() => handle.api?.typed() ?? null)}
                          error={error()}
                          onChoose={(value) => handle.api?.choose(value) ?? false}
                          onLeave={(refocus) => handle.api?.leaveEdit(refocus)}
                          onClose={closeEditor}
                        />
                      )}
                    </Show>
                  </Show>
                )}
              </GridCellPart>
            )
          }}
        </For>
      </div>
    )
  }

  // The rows follow the scroll on their own, so scrolling never redraws the header, the
  // menus or the toolbar.
  const [shownRows, setShownRows] = createSignal({ items: virtual.items(), size: virtual.size() }, { ownedWrite: true })
  onSettled(() => {
    const update = () => setShownRows({ items: virtual.items(), size: virtual.size() })
    const off = virtual.subscribe(update)
    // The scroller may have been measured before this listened: start from what it measured.
    update()
    return off
  })

  const table = usePart(
    handle,
    "root",
    undefined,
    {
      get "aria-label"() {
        return props.label
      },
      "aria-describedby": helpId,
      class: "data-grid-table",
      get style() {
        return {
          "--data-grid-columns": layout().template,
          "--data-grid-header-height": `${HEADER_HEIGHT}px`,
          "--data-grid-row-height": `${rowHeight()}px`,
          "inline-size": `${layout().totalWidth}px`,
        }
      },
      children: () => (
        <>
          <div role="rowgroup" class="data-grid-head">
            {header()}
          </div>
          <div role="rowgroup" class="data-grid-body" style={{ "block-size": `${shownRows().size}px` }}>
            <For each={shownRows().items} keyed={(item) => item.index}>
              {(item) => renderRow(item)}
            </For>
          </div>
        </>
      ),
    },
    "div",
  )

  const context: GridContextValue = {
    get label() {
      return props.label
    },
    get columns() {
      return order().map((id) => {
        const column = byId().get(id)!
        return {
          id,
          header: column.header,
          shown: !hidden().has(id),
          hideable: column.hideable !== false,
          filterable: column.filterable !== false && column.type !== "boolean",
          groupable: column.groupable !== false,
        }
      })
    },
    get query() {
      return query()
    },
    setQuery,
    get filters() {
      return filters()
    },
    setFilter,
    clearFilters: () => setFilters({}),
    get groupBy() {
      return groupBy()
    },
    setGroupBy,
    setShown,
    get density() {
      return density()
    },
    setDensity,
    exportCsv,
    get total() {
      return props.rows.length
    },
    get shown() {
      return sorted().length
    },
    get selectedCount() {
      return selected().length
    },
    clearSelection: () => setSelected([]),
    focusGrid: () => handle.api.grid.focus(handle.api.grid.active() ?? { row: 0, col: 0 }, { reason: "imperative" }),
    count,
  }

  return (
    <GridContext value={context}>
      <div class={["data-grid", props.class]} data-density={density()} style={{ "--data-grid-height": props.height }}>
        {props.children}
        {/* Out of the tab order: the grid's one tab stop is its active cell, and Firefox
            would otherwise stop on any scrolling box as well. */}
        <ScrollBox
          axis="both"
          data-frame="none"
          class="data-grid-frame"
          viewport={{
            ref: (el: HTMLDivElement) => (scroller = el),
            class: "data-grid-scroller",
            role: "group",
            "aria-label": "Rows",
            tabindex: -1,
            style: { "scroll-padding-inline-start": `${layout().stickyWidth}px`, "scroll-padding-block-start": `${HEADER_HEIGHT}px` },
          }}
        >
          {table}
          <Show when={items().length === 0}>
            <div class="data-grid-empty">{props.empty ?? "No rows to show"}</div>
          </Show>
        </ScrollBox>
        <p id={helpId} hidden>
          Arrow keys move between cells. Enter sorts a column or edits a cell, Escape cancels. Shift with arrows selects cells. On a column header, Shift+F10 opens the column menu, Alt (Option on a Mac)
          with Left or Right resizes the column, and adding Shift moves it.
        </p>
        <Menu
          controller={menu}
          onOpenChange={(open, details) => {
            if (open) return
            // Closed from the menu itself (Escape, an item, its button), focus goes to the
            // header of the column it was for, as the grid's active cell. Its button doesn't
            // take focus when pressed, so UI SDK alone would return focus to whatever header
            // had it before. Closed by a press or focus elsewhere, focus stays there.
            const fromMenu = ["escape-key", "item-press", "trigger-press", "close-press"].includes(details.reason)
            const id = menu.getPayload()
            if (!fromMenu || !id) return
            requestAnimationFrame(() => {
              const cell = headerOf(id)
              if (cell) handle.api.grid.focus(cell, { reason: "imperative" })
            })
          }}
          onAction={(action) => {
            const column = byId().get(menu.getPayload() ?? "")
            if (!column) return
            const rtl = isRTL(scroller ?? null)
            if (action === "ascending" || action === "descending") {
              const next: SortRule[] = [{ column: column.id, direction: action }]
              setSort(next)
              announce(sortMessage(next, props.columns))
            } else if (action === "unsort") {
              setSort(sort().filter((rule) => rule.column !== column.id))
              announce("Sorting cleared")
            } else if (action === "group") setGroupBy(column.id)
            else if (action === "ungroup") setGroupBy(null)
            else if (action === "pin") setPinned(column.id, true)
            else if (action === "unpin") setPinned(column.id, false)
            else if (action === "left") moveColumn(column.id, rtl ? 1 : -1)
            else if (action === "right") moveColumn(column.id, rtl ? -1 : 1)
            else if (action === "wider") resizeColumn(column, widthOf(column) + RESIZE_STEP * 2)
            else if (action === "narrower") resizeColumn(column, widthOf(column) - RESIZE_STEP * 2)
            else if (action === "width") resetWidth(column.id)
            else if (action === "hide") setShown(column.id, false)
          }}
        >
          <MenuContent align="start" class="data-grid-menu">
            {(state: { payload?: string | null }) => (
              <Show when={byId().get(state.payload ?? "")}>
                {(column) => {
                  const rule = () => sort().find((r) => r.column === column().id)
                  const canMove = (delta: number) => {
                    const ids = shownIds()
                    const target = ids[ids.indexOf(column().id) + delta]
                    return !!target && pinned().has(target) === pinned().has(column().id)
                  }
                  const rtl = () => isRTL(scroller ?? null)
                  return (
                    <>
                      <MenuGroup>
                        <MenuGroupLabel>{column().header}</MenuGroupLabel>
                        <Show when={column().sortable !== false}>
                          <MenuItem value="ascending" disabled={rule()?.direction === "ascending"}>
                            Sort ascending
                          </MenuItem>
                          <MenuItem value="descending" disabled={rule()?.direction === "descending"}>
                            Sort descending
                          </MenuItem>
                          <Show when={rule()}>
                            <MenuItem value="unsort">Clear sort</MenuItem>
                          </Show>
                        </Show>
                      </MenuGroup>
                      <MenuSeparator />
                      <Show when={column().groupable !== false}>
                        <Show when={groupBy() === column().id} fallback={<MenuItem value="group">Group by {column().header}</MenuItem>}>
                          <MenuItem value="ungroup">Stop grouping</MenuItem>
                        </Show>
                      </Show>
                      <Show when={pinned().has(column().id)} fallback={<MenuItem value="pin">Pin to start</MenuItem>}>
                        <MenuItem value="unpin">Unpin</MenuItem>
                      </Show>
                      <MenuItem value="left" disabled={!canMove(rtl() ? 1 : -1)}>
                        Move left
                      </MenuItem>
                      <MenuItem value="right" disabled={!canMove(rtl() ? -1 : 1)}>
                        Move right
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem value="wider" closeOnSelect={false}>
                        Wider
                      </MenuItem>
                      <MenuItem value="narrower" closeOnSelect={false}>
                        Narrower
                      </MenuItem>
                      <Show when={columnState().widths[column().id] !== undefined}>
                        <MenuItem value="width">Reset width</MenuItem>
                      </Show>
                      <Show when={column().hideable !== false && shownIds().length > 1}>
                        <MenuSeparator />
                        <MenuItem value="hide">Hide column</MenuItem>
                      </Show>
                    </>
                  )
                }}
              </Show>
            )}
          </MenuContent>
        </Menu>
        <div class="data-grid-footer">
          <span>{sorted().length === props.rows.length ? `${count(props.rows.length)} ${props.rows.length === 1 ? "row" : "rows"}` : `${count(sorted().length)} of ${count(props.rows.length)} rows`}</span>
          <Show when={props.selectable && selected().length > 0}>
            <span>{count(selected().length)} selected</span>
          </Show>
        </div>
      </div>
    </GridContext>
  )
}

// Toolbar parts. Each works alone inside a DataGrid; DataGridToolbar arranges them.

/**
 * The quick filter: every word must appear somewhere in a row. Agents use the grid's own
 * `filter`, which this repeats; the field's name, which holds the grid's, would make the
 * grid's name find two components.
 */
function DataGridSearch(props: { placeholder?: string }) {
  const grid = useDataGrid()
  const name = () => grid.label.toLowerCase()
  return (
    <SearchField
      data-agent-hidden=""
      label={`Search ${name()}`}
      placeholder={props.placeholder ?? `Search ${name()}…`}
      value={grid.query}
      onValueChange={(value: string) => grid.setQuery(value)}
      shortcut={null}
    />
  )
}

/** A popover with one text filter per filterable column. */
function DataGridFilters() {
  const grid = useDataGrid()
  const filterable = () => grid.columns.filter((column) => column.filterable)
  const active = () => Object.keys(grid.filters).length
  return (
    <Show when={filterable().length > 0}>
      <Popover>
        <PopoverTrigger data-variant="outline">
          <Icon name="filter" />
          Filters
          <Show when={active() > 0}>
            <span class="data-grid-badge">
              <span class="uiset-visually-hidden">, </span>
              {active()}
              <span class="uiset-visually-hidden"> on</span>
            </span>
          </Show>
        </PopoverTrigger>
        <PopoverContent class="data-grid-filters">
          <PopoverTitle>Filter {grid.label.toLowerCase()}</PopoverTitle>
          <For each={filterable()} keyed={(column) => column.id}>
            {(column) => (
              <Field>
                <FieldLabel>{column().header}</FieldLabel>
                <Input value={grid.filters[column().id] ?? ""} onValueChange={(value: string) => grid.setFilter(column().id, value)} autocomplete="off" />
              </Field>
            )}
          </For>
          <Button variant="ghost" disabled={!active()} onClick={() => grid.clearFilters()}>
            Clear filters
          </Button>
        </PopoverContent>
      </Popover>
    </Show>
  )
}

/** Groups rows by a column, with a header row per value that opens and closes. */
function DataGridGroupBy() {
  const grid = useDataGrid()
  const groupable = () => grid.columns.filter((column) => column.groupable)
  return (
    <Show when={groupable().length > 0}>
      <Select value={grid.groupBy ?? "none"} onValueChange={(value) => grid.setGroupBy(value === "none" ? null : String(value))}>
        <SelectLabel class="uiset-visually-hidden">Group {grid.label.toLowerCase()} by</SelectLabel>
        {/* Agents group with the grid's own `groupBy`, as with the search. */}
        <SelectTrigger data-variant="outline" data-agent-hidden="" />
        <SelectContent>
          <SelectItem value="none">No grouping</SelectItem>
          <For each={groupable()} keyed={(column) => column.id}>
            {(column) => <SelectItem value={column().id}>Group by {column().header}</SelectItem>}
          </For>
        </SelectContent>
      </Select>
    </Show>
  )
}

/** Which columns show, and how dense the rows are. */
function DataGridViewMenu() {
  const grid = useDataGrid()
  const shownCount = () => grid.columns.filter((c) => c.shown).length
  return (
    <Menu>
      <MenuTrigger data-variant="outline">
        <Icon name="columns" />
        View
      </MenuTrigger>
      <MenuContent align="end" class="data-grid-menu">
        <MenuGroup>
          <MenuGroupLabel>Columns</MenuGroupLabel>
          <For each={grid.columns.filter((column) => column.hideable)} keyed={(column) => column.id}>
            {(column) => (
              <MenuCheckboxItem value={column().id} checked={column().shown} disabled={column().shown && shownCount() === 1} onCheckedChange={(checked) => grid.setShown(column().id, checked)}>
                <MenuItemIndicator>
                  <Icon name="check" />
                </MenuItemIndicator>
                {column().header}
              </MenuCheckboxItem>
            )}
          </For>
        </MenuGroup>
        <MenuSeparator />
        <MenuRadioGroup value={grid.density} onValueChange={(value) => grid.setDensity(value as DataGridDensity)}>
          <MenuGroupLabel>Density</MenuGroupLabel>
          <For each={["compact", "standard", "comfortable"] as const}>
            {(density) => (
              <MenuRadioItem value={density}>
                <MenuItemIndicator>
                  <Icon name="check" />
                </MenuItemIndicator>
                {density[0]!.toUpperCase() + density.slice(1)}
              </MenuRadioItem>
            )}
          </For>
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}

/** Downloads what the grid shows (or the selected rows) as CSV. */
function DataGridExport(props: { filename: string }) {
  const grid = useDataGrid()
  return (
    <Button variant="outline" onClick={() => grid.exportCsv(props.filename)}>
      <Icon name="download" />
      Export CSV
    </Button>
  )
}

/** The selected count, your actions for those rows, and Clear selection. */
function DataGridSelection(props: { children?: JSX.Element }) {
  const grid = useDataGrid()
  return (
    <Show when={grid.selectedCount > 0}>
      <div class="data-grid-selection">
        <span class="data-grid-selection-count">{grid.count(grid.selectedCount)} selected</span>
        {props.children}
        <Button
          variant="ghost"
          onClick={() => {
            // This bar goes away with the selection, so focus returns to the grid.
            grid.clearSelection()
            grid.focusGrid()
          }}
        >
          Clear selection
        </Button>
      </div>
    </Show>
  )
}

type DataGridToolbarProps = {
  /** The file name for Export CSV, without the extension. Leave it out to hide the button. */
  filename?: string
  /** Actions for the rows, like Delete, shown while rows are selected (in place of search). */
  selectionActions?: JSX.Element
  /** Extra tools, after the built-in ones. */
  children?: JSX.Element
}

/**
 * The usual arrangement: search (or the selection while rows are selected) at the start,
 * then filters, grouping, the view menu and export. Compose the parts yourself for another.
 */
function DataGridToolbar(props: DataGridToolbarProps) {
  const grid = useDataGrid()
  return (
    <div class="data-grid-toolbar" role="group" aria-label={`${grid.label} tools`}>
      <Show when={grid.selectedCount > 0} fallback={<DataGridSearch />}>
        <DataGridSelection>{props.selectionActions}</DataGridSelection>
      </Show>
      <div class="data-grid-tools">
        <DataGridFilters />
        <DataGridGroupBy />
        <DataGridViewMenu />
        <Show when={props.filename}>{(filename) => <DataGridExport filename={filename()} />}</Show>
        {props.children}
      </div>
    </div>
  )
}

export { DataGrid, DataGridExport, DataGridFilters, DataGridGroupBy, DataGridSearch, DataGridSelection, DataGridToolbar, DataGridViewMenu, useDataGrid }
export type { DataGridColumn, DataGridColumnState, DataGridDensity, DataGridEdit, DataGridProps, DataGridToolbarProps, SortRule }
