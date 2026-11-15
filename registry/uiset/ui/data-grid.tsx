"use client"

import {
  announce,
  bindDrag,
  createVirtualizer,
  inputHints,
  isRTL,
  type GridCell,
  type StateOf,
  type VirtualItem,
  type Virtualizer,
} from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive"
import {
  createContext,
  use,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Button } from "./button"
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
} from "./data-grid/columns"
import { dataGrid, type DataGridCommands } from "./data-grid/grid"
import {
  filterRows,
  groupRows,
  nextSort,
  sortRows,
  toCsv,
  type SortRule,
  type ViewItem,
} from "./data-grid/view"
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
import { SearchField } from "./search-field"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"
import { Icon } from "./shell/icons"
import "./shell/shell.css"
import "./data-grid/data-grid.css"

type DataGridColumn<Row> = GridColumnSpec<Row> & {
  /** Custom content. Copying, filtering and sorting still use `value` and `text`. */
  render?: (row: Row) => ReactNode
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
  empty?: ReactNode
  /** A toolbar, like `<DataGridToolbar />` or its parts, shown above the grid. */
  children?: ReactNode
  className?: string
}

const none: readonly string[] = []

function useControllable<T>(value: T | undefined, initial: T, onChange?: (value: T) => void) {
  const [inner, setInner] = useState(initial)
  const controlled = value !== undefined
  const current = controlled ? value : inner
  const set = (next: T) => {
    if (!controlled) setInner(next)
    onChange?.(next)
  }
  return [current, set] as const
}

// Shared with the toolbar parts, which may sit anywhere inside the grid's children.
type GridContextValue = {
  label: string
  columns: {
    id: string
    header: string
    shown: boolean
    hideable: boolean
    filterable: boolean
    groupable: boolean
  }[]
  query: string
  setQuery: (query: string) => void
  filters: Record<string, string>
  setFilter: (column: string, text: string) => void
  clearFilters: () => void
  groupBy: string | null
  setGroupBy: (column: string | null) => void
  setShown: (column: string, shown: boolean) => void
  density: DataGridDensity
  setDensity: (density: DataGridDensity) => void
  exportCsv: (filename: string) => void
  total: number
  shown: number
  selectedCount: number
  clearSelection: () => void
  /** Puts focus back in the grid, on its active cell, like after the selection bar goes away. */
  focusGrid: () => void
  count: (n: number) => string
}

const GridContext = createContext<GridContextValue | null>(null)

/** The grid around a toolbar part: its label, filters, columns, selection and actions. */
function useDataGrid() {
  const context = use(GridContext)
  if (!context) throw new Error("Data grid toolbar parts must be inside a DataGrid")
  return context
}

type CellState = StateOf<typeof dataGrid, "cell">

function GridCellPart({
  row,
  col,
  ...props
}: { row: number; col: number } & PartProps<"div", CellState>) {
  return usePart(dataGrid, "cell", { row, col, value: `${row}:${col}` }, props, "div")
}

function GridEditor({
  error,
  onClose,
  ...props
}: { error: string | null; onClose: () => void } & PartProps<"input">) {
  const errorId = useId()
  // A message belongs to this editing session; it goes when the editor does.
  useEffect(() => onClose, [onClose])
  return (
    <>
      {usePart(
        dataGrid,
        "editor",
        {},
        {
          ...props,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? errorId : undefined,
        },
        "input",
      )}
      {error && (
        <span id={errorId} className="data-grid-error">
          {error}
        </span>
      )}
    </>
  )
}

function Checkbox({
  checked,
  mixed = false,
  label,
  onToggle,
}: {
  checked: boolean
  mixed?: boolean
  label: string
  onToggle: (shift: boolean) => void
}) {
  // A native checkbox the cell owns. It never takes focus, which stays on the cell (the
  // grid's one tab stop), and Space on the cell toggles it the same as a click.
  return (
    <input
      type="checkbox"
      className="data-grid-checkbox"
      tabIndex={-1}
      aria-label={label}
      checked={checked}
      readOnly
      ref={(el) => {
        if (el) el.indeterminate = mixed
      }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => onToggle(event.shiftKey)}
    />
  )
}

// The rows follow the scroll on their own, so scrolling never re-renders the header,
// the menus or the toolbar.
function GridBody({
  virtual,
  render,
}: {
  virtual: Virtualizer
  render: (item: VirtualItem) => ReactNode
}) {
  const items = useSyncExternalStore(virtual.subscribe, virtual.items, virtual.items)
  return (
    <div role="rowgroup" className="data-grid-body" style={{ blockSize: virtual.size() }}>
      {items.map(render)}
    </div>
  )
}

function DataGrid<Row>({
  rows,
  columns,
  getRowId,
  label,
  locale,
  selectable = false,
  selected: selectedProp,
  defaultSelected = none,
  onSelectedChange,
  sort: sortProp,
  defaultSort = [],
  onSortChange,
  query: queryProp,
  defaultQuery = "",
  onQueryChange,
  filters: filtersProp,
  defaultFilters = {},
  onFiltersChange,
  groupBy: groupByProp,
  defaultGroupBy = null,
  onGroupByChange,
  columnState: columnStateProp,
  defaultColumnState,
  onColumnStateChange,
  density: densityProp,
  defaultDensity = "standard",
  onDensityChange,
  persist,
  onCellEdit,
  onRowAction,
  height,
  empty = "No rows to show",
  children,
  className,
}: DataGridProps<Row>) {
  const [selected, setSelected] = useControllable<readonly string[]>(
    selectedProp,
    defaultSelected,
    onSelectedChange as (ids: readonly string[]) => void,
  )
  const [sort, setSort] = useControllable<readonly SortRule[]>(
    sortProp,
    defaultSort,
    onSortChange as (sort: readonly SortRule[]) => void,
  )
  const [query, setQuery] = useControllable(queryProp, defaultQuery, onQueryChange)
  const [filters, setFilters] = useControllable(filtersProp, defaultFilters, onFiltersChange)
  const [groupBy, setGroupBy] = useControllable(groupByProp, defaultGroupBy, onGroupByChange)
  const [columnState, setColumnState] = useControllable<DataGridColumnState>(
    columnStateProp,
    {
      order: defaultColumnState?.order ?? columns.map((c) => c.id),
      widths: defaultColumnState?.widths ?? {},
      hidden: defaultColumnState?.hidden ?? columns.filter((c) => c.hidden).map((c) => c.id),
      pinned: defaultColumnState?.pinned ?? columns.filter((c) => c.pinned).map((c) => c.id),
    },
    onColumnStateChange,
  )
  const [density, setDensity] = useControllable(densityProp, defaultDensity, onDensityChange)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [editError, setEditError] = useState<{ cell: string; message: string } | null>(null)
  const [dragWidth, setDragWidth] = useState<{ id: string; width: number } | null>(null)
  const helpId = useId()
  const scroller = useRef<HTMLDivElement>(null)
  const anchorRow = useRef<string | null>(null)
  const pendingFocus = useRef<GridCell | null>(null)
  const [menu] = useState(() => createMenuController<string>())
  const counter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const count = (n: number) => counter.format(n)
  const closeEditor = useRef(() => setEditError(null)).current

  // Saved layout loads after the first render, so server and client markup agree.
  // Saving waits until it has loaded, so the defaults never overwrite it.
  const [loaded, setLoaded] = useState(false)
  useLayoutEffect(() => {
    if (!persist) return
    setLoaded(true)
    try {
      const saved = JSON.parse(localStorage.getItem(persist) ?? "null")
      if (saved?.columns) setColumnState({ ...columnState, ...saved.columns })
      if (saved?.density in ROW_HEIGHTS) setDensity(saved.density)
    } catch {
      // Storage can be unavailable or hold something else; the defaults stand.
    }
    // Only on mount, or when the key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist])
  useEffect(() => {
    if (!persist || !loaded) return
    try {
      localStorage.setItem(persist, JSON.stringify({ columns: columnState, density }))
    } catch {
      // Private windows and full storage keep working without saving.
    }
  }, [persist, loaded, columnState, density])

  // Columns as shown: pinned ones first, hidden ones left out.
  const byId = new Map(columns.map((column) => [column.id, column]))
  const order = [
    ...columnState.order.filter((id) => byId.has(id)),
    ...columns.map((c) => c.id).filter((id) => !columnState.order.includes(id)),
  ]
  const pinned = new Set(columnState.pinned)
  const hidden = new Set(columnState.hidden)
  const shownIds = [
    ...order.filter((id) => pinned.has(id)),
    ...order.filter((id) => !pinned.has(id)),
  ].filter((id) => !hidden.has(id))
  const visible = shownIds.map((id) => byId.get(id)!)
  const offset = selectable ? 1 : 0
  const colCount = offset + visible.length
  const clampWidth = (column: DataGridColumn<Row>, width: number) =>
    Math.round(Math.min(960, Math.max(column.minWidth ?? 64, width)))
  const widthOf = (column: DataGridColumn<Row>) =>
    dragWidth?.id === column.id
      ? dragWidth.width
      : clampWidth(column, columnState.widths[column.id] ?? column.width ?? 160)

  let edge = selectable ? SELECT_WIDTH : 0
  const pinOffsets = new Map<string, number>()
  for (const column of visible) {
    if (!pinned.has(column.id)) continue
    pinOffsets.set(column.id, edge)
    edge += widthOf(column)
  }
  const stickyWidth = edge
  const lastSticky = visible.filter((c) => pinned.has(c.id)).at(-1)?.id ?? (selectable ? "" : null)
  // The last column takes any room left, so the rows always reach the edge.
  const template = [
    ...(selectable ? [`${SELECT_WIDTH}px`] : []),
    ...visible.map((column, index) =>
      index === visible.length - 1 ? `minmax(${widthOf(column)}px, 1fr)` : `${widthOf(column)}px`,
    ),
  ].join(" ")
  const totalWidth = visible.reduce((sum, c) => sum + widthOf(c), selectable ? SELECT_WIDTH : 0)

  // The view: filter (deferred, so typing stays quick), sort, group.
  const searchText = useMemo(() => {
    const cache = new WeakMap<object, readonly string[]>()
    return (row: Row) => {
      const key = row as unknown as object
      const cached = typeof row === "object" && row !== null ? cache.get(key) : undefined
      if (cached) return cached
      const texts = columns.map((column) => display(column, row).toLowerCase())
      if (typeof row === "object" && row !== null) cache.set(key, texts)
      return texts
    }
  }, [columns])
  const deferredQuery = useDeferredValue(query)
  const deferredFilters = useDeferredValue(filters)
  const filtered = useMemo(
    () => filterRows(rows, columns, deferredQuery, deferredFilters, searchText),
    [rows, columns, deferredQuery, deferredFilters, searchText],
  )
  const sorted = useMemo(() => sortRows(filtered, columns, sort), [filtered, columns, sort])
  const groupColumn = groupBy ? (byId.get(groupBy) ?? null) : null
  const items: ViewItem<Row>[] = useMemo(
    () => groupRows(sorted, getRowId, groupColumn, collapsed),
    [sorted, getRowId, groupColumn, collapsed],
  )
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const rowIds = useMemo(() => sorted.map(getRowId), [sorted, getRowId])
  // Shift-click ranges follow the rows on screen, in their order, groups included.
  const screenIds = useMemo(
    () => items.flatMap((item) => (item.kind === "row" ? [item.id] : [])),
    [items],
  )
  const selectedShown = useMemo(
    () => rowIds.reduce((n, id) => n + (selectedSet.has(id) ? 1 : 0), 0),
    [rowIds, selectedSet],
  )
  const allShownSelected = rowIds.length > 0 && selectedShown === rowIds.length
  const rowHeight = ROW_HEIGHTS[density]

  const spanRows = useMemo(
    () => items.flatMap((item, index) => (item.kind === "group" ? [index + 1] : [])),
    [items],
  )
  const itemAt = (row: number) => (row > 0 ? items[row - 1] : undefined)
  const columnAt = (col: number) => (col >= offset ? visible[col - offset] : undefined)
  const primaryText = (row: Row) => (visible[0] ? display(visible[0], row) : getRowId(row))

  // Rows render only while near the viewport.
  const latest = useRef({
    count: items.length,
    rowHeight,
    active: () => null as GridCell | null,
    // A column's header cell as of the latest render (its place changes when columns move).
    headerOf: (_id: string) => null as GridCell | null,
  })
  const [virtual] = useState(() =>
    createVirtualizer({
      count: () => latest.current.count,
      estimate: () => latest.current.rowHeight,
      overscan: 8,
      scrollMargin: HEADER_HEIGHT,
      keep: () => {
        const active = latest.current.active()
        return active && active.row > 0 ? [active.row - 1] : []
      },
    }),
  )
  useLayoutEffect(() => {
    const resized = latest.current.rowHeight !== rowHeight
    latest.current.count = items.length
    latest.current.rowHeight = rowHeight
    if (resized) virtual.reset()
    else virtual.refresh()
  }, [virtual, items.length, rowHeight])
  useLayoutEffect(() => virtual.connect(scroller.current!), [virtual])

  const toggleRow = (id: string, shift = false) => {
    const anchor = anchorRow.current
    const from = anchor === null ? -1 : screenIds.indexOf(anchor)
    const to = screenIds.indexOf(id)
    if (shift && from >= 0 && to >= 0) {
      const range = screenIds.slice(Math.min(from, to), Math.max(from, to) + 1)
      setSelected([...new Set([...selected, ...range])])
    } else {
      setSelected(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id])
    }
    anchorRow.current = id
  }
  const toggleAll = () => {
    if (allShownSelected) {
      const shownSet = new Set(rowIds)
      setSelected(selected.filter((id) => !shownSet.has(id)))
      announce("Rows deselected")
    } else {
      setSelected([...new Set([...selected, ...rowIds])])
      announce(`${count(rowIds.length)} rows selected`)
    }
  }
  const toggleGroup = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }
  const sortColumn = (column: DataGridColumn<Row>, additive: boolean) => {
    const next = nextSort(sort, column.id, additive)
    setSort(next)
    announce(sortMessage(next, columns))
  }
  /** Saves an edit. `cell` marks an edit typed into the grid, whose message shows there. */
  const commit = (row: Row, column: DataGridColumn<Row>, text: string, cell?: string) => {
    const parsed = parse(column, text, locale)
    if ("error" in parsed) {
      if (cell) {
        setEditError({ cell, message: parsed.error })
        announce(parsed.error, { priority: "assertive" })
      }
      return false
    }
    const accepted =
      onCellEdit?.({ row, rowId: getRowId(row), column: column.id, value: parsed.value, text }) !==
      false
    if (accepted && cell) setEditError(null)
    return accepted
  }
  const resizeColumn = (column: DataGridColumn<Row>, width: number) => {
    const next = clampWidth(column, width)
    setColumnState({ ...columnState, widths: { ...columnState.widths, [column.id]: next } })
    announce(`${column.header}, ${next} pixels wide`)
    return next
  }
  const resetWidth = (id: string) => {
    const next = { ...columnState.widths }
    delete next[id]
    setColumnState({ ...columnState, widths: next })
  }
  const moveColumn = (id: string, delta: number) => {
    const index = shownIds.indexOf(id)
    const target = shownIds[index + delta]
    if (!target || pinned.has(target) !== pinned.has(id)) return false
    const next = [...order]
    const a = next.indexOf(id)
    const b = next.indexOf(target)
    ;[next[a], next[b]] = [next[b]!, next[a]!]
    setColumnState({ ...columnState, order: next })
    announce(`${byId.get(id)?.header} moved to column ${index + delta + 1 + offset}`)
    return true
  }
  const setShown = (id: string, shown: boolean) => {
    const next = new Set(hidden)
    if (shown) next.delete(id)
    else if (shownIds.length > 1) next.add(id)
    setColumnState({ ...columnState, hidden: [...next] })
  }
  const setPinned = (id: string, pin: boolean) => {
    const next = new Set(pinned)
    if (pin) next.add(id)
    else next.delete(id)
    setColumnState({ ...columnState, pinned: [...next] })
  }
  const setFilter = (column: string, text: string) => {
    const next = { ...filters }
    if (text) next[column] = text
    else delete next[column]
    setFilters(next)
  }
  const exportCsv = (filename: string) => {
    const chosen = selectedShown ? sorted.filter((row) => selectedSet.has(getRowId(row))) : sorted
    download(filename, toCsv(chosen, visible))
    announce(`Exported ${count(chosen.length)} rows`)
  }

  // Agents name columns by id or header, and rows by id or by their first column.
  // A step that can't run throws an Error saying why, which the agent reads and acts on.
  const columnNames = () => visible.map((c) => c.header).join(", ")
  const findColumn = (name: string) => {
    const column =
      byId.get(name) ?? columns.find((c) => c.header.toLowerCase() === String(name).toLowerCase())
    if (!column) throw new Error(`No column "${name}" in ${label}. Its columns: ${columnNames()}.`)
    return column
  }
  const findRow = (name: string) => {
    const row =
      rows.find((r) => getRowId(r) === name) ??
      rows.find((r) => primaryText(r).toLowerCase() === String(name).toLowerCase())
    if (row === undefined) throw new Error(`No row "${name}" in ${label}.`)
    return row
  }
  const refuse = (message: string): never => {
    throw new Error(message)
  }
  const commands: DataGridCommands = {
    sortBy: (name, direction = "ascending") => {
      const column = findColumn(name)
      if (column.sortable === false) refuse(`${column.header} can't be sorted.`)
      if (direction !== "ascending" && direction !== "descending" && direction !== "none")
        refuse(`Sort direction must be ascending, descending or none, not "${direction}".`)
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
      if (!selectable) refuse(`Rows in ${label} can't be selected.`)
      if (!Array.isArray(names)) refuse("selectRows takes a list of row names.")
      setSelected(names.map((name) => getRowId(findRow(name))))
      return true
    },
    clearSelection: () => {
      setSelected([])
      return true
    },
    editCell: (rowName, columnName, text) => {
      const row = findRow(rowName)
      const column = findColumn(columnName)
      if (!column.editable || !onCellEdit) refuse(`${column.header} can't be edited.`)
      const parsed = parse(column, String(text ?? ""), locale)
      if ("error" in parsed) refuse(parsed.error)
      if (!commit(row, column, String(text))) refuse(`${label} didn't accept that ${column.header}.`)
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

  const handle = usePrimitive(dataGrid, {
    rowCount: 1 + items.length,
    colCount,
    // Read at the key press: how many whole rows the scroller shows.
    pageSize: () =>
      Math.max(
        1,
        Math.floor(((scroller.current?.clientHeight ?? 400) - HEADER_HEIGHT) / rowHeight) - 1,
      ),
    spanRows,
    cellText: (cell) => {
      if (cell.row === 0) return columnAt(cell.col)?.header ?? ""
      const item = itemAt(cell.row)
      if (!item) return ""
      if (item.kind === "group") return cell.col === 0 ? `${item.label} (${item.count})` : ""
      const column = columnAt(cell.col)
      return column ? display(column, item.row) : ""
    },
    editText: (cell) => {
      const item = itemAt(cell.row)
      const column = columnAt(cell.col)
      if (item?.kind !== "row" || !column) return ""
      // Numbers and dates start from plain values, not their formatting.
      return editTextOf(column, item.row)
    },
    editable: (cell) => {
      const item = itemAt(cell.row)
      const column = columnAt(cell.col)
      return (
        item?.kind === "row" && !!column?.editable && column.type !== "boolean" && !!onCellEdit
      )
    },
    onCellEdit: (cell, text) => {
      const item = itemAt(cell.row)
      const column = columnAt(cell.col)
      return item?.kind === "row" && column
        ? commit(item.row, column, text, `${cell.row}:${cell.col}`)
        : false
    },
    onActivate: (cell, event) => {
      if (cell.row === 0) {
        if (selectable && cell.col === 0) return toggleAll()
        const column = columnAt(cell.col)
        if (column && column.sortable !== false) sortColumn(column, event.shiftKey)
        return
      }
      const item = itemAt(cell.row)
      if (!item) return
      if (item.kind === "group") return toggleGroup(item.key)
      if (selectable && cell.col === 0) return toggleRow(item.id)
      const column = columnAt(cell.col)
      if (column?.type === "boolean" && column.editable && onCellEdit) {
        commit(item.row, column, column.value(item.row) ? "no" : "yes")
        return
      }
      onRowAction?.(item.row)
    },
    onCellKey: (cell, event, target) => {
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
        if (moveColumn(column.id, forward ? 1 : -1))
          pendingFocus.current = { row: 0, col: cell.col + (forward ? 1 : -1) }
      } else {
        resizeColumn(column, widthOf(column) + (forward ? RESIZE_STEP : -RESIZE_STEP))
      }
      return true
    },
    onPaste: (start, pasted) => {
      let pastedCount = 0
      let refused = 0
      pasted.forEach((cells, i) =>
        cells.forEach((text, j) => {
          const item = itemAt(start.row + i)
          const column = columnAt(start.col + j)
          if (item?.kind !== "row" || !column?.editable || !onCellEdit) return
          if (commit(item.row, column, text)) pastedCount++
          else refused++
        }),
      )
      const pastedText = pastedCount
        ? `Pasted ${count(pastedCount)} ${pastedCount === 1 ? "cell" : "cells"}`
        : "Nothing pasted"
      announce(
        refused
          ? `${pastedText}; ${count(refused)} didn't fit their column`
          : pastedCount
            ? pastedText
            : "Nothing pasted: these cells can't be edited",
      )
    },
    reveal: (cell) => {
      if (cell.row > 0) virtual.scrollToIndex(cell.row - 1)
    },
    items: () =>
      sorted.map((row) => {
        const entry: Record<string, string> = { id: getRowId(row) }
        for (const column of visible) entry[column.header] = display(column, row)
        return entry
      }),
    view: {
      rows: sorted.length,
      of: rows.length,
      sort: sort.length ? sortMessage(sort, columns) : "none",
      filter: query,
      ...(Object.keys(filters).length ? { columnFilters: filters } : {}),
      groupBy: groupColumn?.header ?? "none",
      selected: selected.length,
    },
    commands,
  })

  useLayoutEffect(() => {
    latest.current.active = () => handle.api?.grid.active() ?? null
    latest.current.headerOf = (id) => {
      const index = visible.findIndex((column) => column.id === id)
      return index < 0 ? null : { row: 0, col: index + offset }
    }
    const cell = pendingFocus.current
    if (!cell) return
    pendingFocus.current = null
    handle.api.grid.focus(cell, { reason: "imperative" })
  })

  // The filter announces its count once typing pauses.
  useEffect(() => {
    if (!deferredQuery && !Object.keys(deferredFilters).length) return
    const timer = setTimeout(
      () => announce(`${count(sorted.length)} ${sorted.length === 1 ? "row" : "rows"}`),
      600,
    )
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, deferredFilters, sorted.length])

  const stickyAttrs = (id: string) => {
    const left = id === "" ? 0 : pinOffsets.get(id)
    return {
      "data-pinned": left !== undefined ? "" : undefined,
      "data-pinned-edge": id === lastSticky ? "" : undefined,
      style: left === undefined ? undefined : ({ insetInlineStart: left } as CSSProperties),
    }
  }

  // Dragging a header's edge previews the width, and saves it once, on release.
  const startResize = (event: React.PointerEvent, column: DataGridColumn<Row>) => {
    event.preventDefault()
    event.stopPropagation()
    const start = widthOf(column)
    const startX = event.clientX
    const rtl = isRTL(event.currentTarget)
    let width = start
    bindDrag(event.currentTarget as HTMLElement, event.nativeEvent, {
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

  const primarySort = sort[0]
  const align = (column: DataGridColumn<Row>) =>
    column.align ?? (column.type === "number" ? "end" : undefined)

  const header = (
    <div role="row" aria-rowindex={1} className="data-grid-row data-grid-header-row">
      {selectable && (
        <GridCellPart row={0} col={0} className="data-grid-cell data-grid-select" {...stickyAttrs("")}>
          <Checkbox
            checked={allShownSelected}
            mixed={selectedShown > 0 && !allShownSelected}
            label="Select all rows"
            onToggle={toggleAll}
          />
        </GridCellPart>
      )}
      {visible.map((column, index) => {
        const sortIndex = sort.findIndex((rule) => rule.column === column.id)
        const rule = sort[sortIndex]
        return (
          <GridCellPart
            key={index}
            row={0}
            col={index + offset}
            className="data-grid-cell data-grid-header"
            data-align={align(column)}
            aria-sort={primarySort?.column === column.id ? primarySort.direction : undefined}
            onClick={(event) => {
              if ((event.target as Element).closest("[data-grid-handle]")) return
              if (column.sortable !== false) sortColumn(column, event.shiftKey)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              void menu.open({ payload: column.id, anchor: { x: event.clientX, y: event.clientY } })
            }}
            {...stickyAttrs(column.id)}
          >
            <span className="data-grid-header-label">{column.header}</span>
            {rule && (
              <span className="data-grid-sort" aria-hidden="true">
                <Icon name={rule.direction === "ascending" ? "up" : "down"} />
                {sort.length > 1 && <span className="data-grid-sort-order">{sortIndex + 1}</span>}
              </span>
            )}
            {/* For pointers and touch screen readers; keyboards use Shift+F10 on the header. */}
            <button
              type="button"
              tabIndex={-1}
              className="data-grid-menu-button"
              data-grid-handle=""
              aria-label={`${column.header} column menu`}
              aria-haspopup="menu"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) =>
                void menu.open({
                  payload: column.id,
                  anchor:
                    event.currentTarget.closest<HTMLElement>("[role=columnheader]") ?? undefined,
                })
              }
            >
              <Icon name="more" />
            </button>
            <span
              className="data-grid-resizer"
              data-grid-handle=""
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, column)}
              onDoubleClick={() => resetWidth(column.id)}
            />
          </GridCellPart>
        )
      })}
    </div>
  )

  const renderRow = (virtualItem: VirtualItem) => {
    const item = items[virtualItem.index]
    if (!item) return null
    const row = virtualItem.index + 1
    const style = { top: virtualItem.start, blockSize: rowHeight }
    if (item.kind === "group") {
      return (
        <div
          key={virtualItem.index}
          role="row"
          aria-rowindex={row + 1}
          className="data-grid-row data-grid-group-row"
          style={style}
        >
          <GridCellPart
            row={row}
            col={0}
            aria-colspan={colCount}
            aria-expanded={item.expanded}
            className="data-grid-cell data-grid-group"
            onClick={() => toggleGroup(item.key)}
          >
            <span className="data-grid-group-inner">
              <Icon name="chevron" className="data-grid-chevron" />
              <span className="data-grid-group-label">{item.label}</span>
              <span className="data-grid-count">{count(item.count)}</span>
            </span>
          </GridCellPart>
        </div>
      )
    }
    const isSelected = selectedSet.has(item.id)
    return (
      <div
        key={virtualItem.index}
        role="row"
        aria-rowindex={row + 1}
        aria-selected={selectable ? isSelected : undefined}
        data-selected={isSelected ? "" : undefined}
        className="data-grid-row"
        style={style}
      >
        {selectable && (
          <GridCellPart row={row} col={0} className="data-grid-cell data-grid-select" {...stickyAttrs("")}>
            <Checkbox
              checked={isSelected}
              label={`Select ${primaryText(item.row)}`}
              onToggle={(shift) => toggleRow(item.id, shift)}
            />
          </GridCellPart>
        )}
        {visible.map((column, index) => {
          const cellId = `${row}:${index + offset}`
          return (
            <GridCellPart
              key={index}
              row={row}
              col={index + offset}
              className="data-grid-cell"
              data-align={align(column)}
              data-editable={column.editable && onCellEdit ? "" : undefined}
              {...stickyAttrs(column.id)}
            >
              {({ editing }) =>
                editing ? (
                  <GridEditor
                    className="data-grid-editor"
                    aria-label={column.header}
                    list={column.options ? `${helpId}-${column.id}` : undefined}
                    error={editError?.cell === cellId ? editError.message : null}
                    onClose={closeEditor}
                    {...(column.type === "number" ? inputHints("decimal") : {})}
                  />
                ) : column.render ? (
                  column.render(item.row)
                ) : column.type === "boolean" ? (
                  <span className="data-grid-boolean" data-value={String(!!column.value(item.row))}>
                    {display(column, item.row)}
                  </span>
                ) : (
                  display(column, item.row)
                )
              }
            </GridCellPart>
          )
        })}
      </div>
    )
  }

  const table = usePart(
    handle,
    "root",
    {},
    {
      "aria-label": label,
      "aria-describedby": helpId,
      className: "data-grid-table",
      style: {
        "--data-grid-columns": template,
        "--data-grid-header-height": `${HEADER_HEIGHT}px`,
        "--data-grid-row-height": `${rowHeight}px`,
        inlineSize: totalWidth,
      } as CSSProperties,
      children: (
        <>
          <div role="rowgroup" className="data-grid-head">
            {header}
          </div>
          <GridBody virtual={virtual} render={renderRow} />
        </>
      ),
    },
    "div",
  )

  const context: GridContextValue = {
    label,
    columns: order.map((id) => {
      const column = byId.get(id)!
      return {
        id,
        header: column.header,
        shown: !hidden.has(id),
        hideable: column.hideable !== false,
        filterable: column.filterable !== false && column.type !== "boolean",
        groupable: column.groupable !== false,
      }
    }),
    query,
    setQuery,
    filters,
    setFilter,
    clearFilters: () => setFilters({}),
    groupBy,
    setGroupBy,
    setShown,
    density,
    setDensity,
    exportCsv,
    total: rows.length,
    shown: sorted.length,
    selectedCount: selected.length,
    clearSelection: () => setSelected([]),
    focusGrid: () =>
      handle.api.grid.focus(handle.api.grid.active() ?? { row: 0, col: 0 }, { reason: "imperative" }),
    count,
  }

  return (
    <GridContext value={context}>
      <div
        className={["data-grid", className].filter(Boolean).join(" ")}
        data-density={density}
        style={{ "--data-grid-height": height } as CSSProperties}
      >
        {children}
        {/* Out of the tab order: the grid's one tab stop is its active cell, and Firefox
            would otherwise stop on any scrolling box as well. */}
        <div
          ref={scroller}
          className="data-grid-scroller"
          tabIndex={-1}
          data-stale={deferredQuery !== query || deferredFilters !== filters ? "" : undefined}
          style={{
            scrollPaddingInlineStart: stickyWidth,
            scrollPaddingBlockStart: HEADER_HEIGHT,
          }}
        >
          {table}
          {items.length === 0 && <div className="data-grid-empty">{empty}</div>}
        </div>
        <p id={helpId} hidden>
          Arrow keys move between cells. Enter sorts a column or edits a cell, Escape cancels.
          Shift with arrows selects cells. On a column header, Shift+F10 opens the column
          menu, Alt (Option on a Mac) with Left or Right resizes the column, and adding Shift
          moves it.
        </p>
        {visible
          .filter((column) => column.options)
          .map((column) => (
            <datalist key={column.id} id={`${helpId}-${column.id}`}>
              {column.options!.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          ))}
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
              const cell = latest.current.headerOf(id)
              if (cell) handle.api.grid.focus(cell, { reason: "imperative" })
            })
          }}
          onAction={(action) => {
            const column = byId.get(menu.getPayload() ?? "")
            if (!column) return
            const rtl = isRTL(scroller.current)
            if (action === "ascending" || action === "descending") {
              const next: SortRule[] = [{ column: column.id, direction: action }]
              setSort(next)
              announce(sortMessage(next, columns))
            } else if (action === "unsort") {
              setSort(sort.filter((rule) => rule.column !== column.id))
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
          <MenuContent<string> align="start" className="data-grid-menu">
            {(state) => {
              const column = byId.get(state.payload ?? "")
              if (!column) return null
              const rule = sort.find((r) => r.column === column.id)
              const at = shownIds.indexOf(column.id)
              const rtl = isRTL(scroller.current)
              const canMove = (delta: number) => {
                const target = shownIds[at + delta]
                return !!target && pinned.has(target) === pinned.has(column.id)
              }
              return (
                <>
                  <MenuGroup>
                    <MenuGroupLabel>{column.header}</MenuGroupLabel>
                    {column.sortable !== false && (
                      <>
                        <MenuItem value="ascending" disabled={rule?.direction === "ascending"}>
                          Sort ascending
                        </MenuItem>
                        <MenuItem value="descending" disabled={rule?.direction === "descending"}>
                          Sort descending
                        </MenuItem>
                        {rule && <MenuItem value="unsort">Clear sort</MenuItem>}
                      </>
                    )}
                  </MenuGroup>
                  <MenuSeparator />
                  {column.groupable !== false &&
                    (groupBy === column.id ? (
                      <MenuItem value="ungroup">Stop grouping</MenuItem>
                    ) : (
                      <MenuItem value="group">Group by {column.header}</MenuItem>
                    ))}
                  {pinned.has(column.id) ? (
                    <MenuItem value="unpin">Unpin</MenuItem>
                  ) : (
                    <MenuItem value="pin">Pin to start</MenuItem>
                  )}
                  <MenuItem value="left" disabled={!canMove(rtl ? 1 : -1)}>
                    Move left
                  </MenuItem>
                  <MenuItem value="right" disabled={!canMove(rtl ? -1 : 1)}>
                    Move right
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem value="wider" closeOnSelect={false}>
                    Wider
                  </MenuItem>
                  <MenuItem value="narrower" closeOnSelect={false}>
                    Narrower
                  </MenuItem>
                  {columnState.widths[column.id] !== undefined && (
                    <MenuItem value="width">Reset width</MenuItem>
                  )}
                  {column.hideable !== false && shownIds.length > 1 && (
                    <>
                      <MenuSeparator />
                      <MenuItem value="hide">Hide column</MenuItem>
                    </>
                  )}
                </>
              )
            }}
          </MenuContent>
        </Menu>
        <div className="data-grid-footer">
          <span>
            {sorted.length === rows.length
              ? `${count(rows.length)} ${rows.length === 1 ? "row" : "rows"}`
              : `${count(sorted.length)} of ${count(rows.length)} rows`}
          </span>
          {selectable && selected.length > 0 && <span>{count(selected.length)} selected</span>}
        </div>
      </div>
    </GridContext>
  )
}

// Toolbar parts. Each works alone inside a DataGrid; DataGridToolbar arranges them.

/** The quick filter: every word must appear somewhere in a row. */
function DataGridSearch({ placeholder }: { placeholder?: string }) {
  const grid = useDataGrid()
  const name = grid.label.toLowerCase()
  return (
    <SearchField
      label={`Search ${name}`}
      placeholder={placeholder ?? `Search ${name}…`}
      value={grid.query}
      onValueChange={(value) => grid.setQuery(value)}
      shortcut={null}
    />
  )
}

/** A popover with one text filter per filterable column. */
function DataGridFilters() {
  const grid = useDataGrid()
  const filterable = grid.columns.filter((column) => column.filterable)
  const active = Object.keys(grid.filters).length
  if (!filterable.length) return null
  return (
    <Popover>
      <PopoverTrigger data-variant="outline">
        <Icon name="filter" />
        Filters
        {active > 0 && (
          <span className="data-grid-badge">
            <span className="uiset-visually-hidden">, </span>
            {active}
            <span className="uiset-visually-hidden"> on</span>
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="data-grid-filters">
        <PopoverTitle>Filter {grid.label.toLowerCase()}</PopoverTitle>
        {filterable.map((column) => (
          <Field key={column.id}>
            <FieldLabel>{column.header}</FieldLabel>
            <Input
              value={grid.filters[column.id] ?? ""}
              onValueChange={(value) => grid.setFilter(column.id, value)}
              autoComplete="off"
            />
          </Field>
        ))}
        <Button variant="ghost" disabled={!active} onClick={grid.clearFilters}>
          Clear filters
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/** Groups rows by a column, with a header row per value that opens and closes. */
function DataGridGroupBy() {
  const grid = useDataGrid()
  const groupable = grid.columns.filter((column) => column.groupable)
  if (!groupable.length) return null
  return (
    <Select
      value={grid.groupBy ?? "none"}
      onValueChange={(value) => grid.setGroupBy(value === "none" ? null : String(value))}
    >
      <SelectLabel className="uiset-visually-hidden">
        Group {grid.label.toLowerCase()} by
      </SelectLabel>
      <SelectTrigger data-variant="outline" />
      <SelectContent>
        <SelectItem value="none">No grouping</SelectItem>
        {groupable.map((column) => (
          <SelectItem key={column.id} value={column.id}>
            Group by {column.header}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Which columns show, and how dense the rows are. */
function DataGridViewMenu() {
  const grid = useDataGrid()
  const shownCount = grid.columns.filter((c) => c.shown).length
  return (
    <Menu>
      <MenuTrigger data-variant="outline">
        <Icon name="columns" />
        View
      </MenuTrigger>
      <MenuContent align="end" className="data-grid-menu">
        <MenuGroup>
          <MenuGroupLabel>Columns</MenuGroupLabel>
          {grid.columns
            .filter((column) => column.hideable)
            .map((column) => (
              <MenuCheckboxItem
                key={column.id}
                value={column.id}
                checked={column.shown}
                disabled={column.shown && shownCount === 1}
                onCheckedChange={(checked) => grid.setShown(column.id, checked)}
              >
                <MenuItemIndicator>
                  <Icon name="check" />
                </MenuItemIndicator>
                {column.header}
              </MenuCheckboxItem>
            ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuRadioGroup
          value={grid.density}
          onValueChange={(value) => grid.setDensity(value as DataGridDensity)}
        >
          <MenuGroupLabel>Density</MenuGroupLabel>
          {(["compact", "standard", "comfortable"] as const).map((density) => (
            <MenuRadioItem key={density} value={density}>
              <MenuItemIndicator>
                <Icon name="check" />
              </MenuItemIndicator>
              {density[0]!.toUpperCase() + density.slice(1)}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}

/** Downloads what the grid shows (or the selected rows) as CSV. */
function DataGridExport({ filename }: { filename: string }) {
  const grid = useDataGrid()
  return (
    <Button variant="outline" onClick={() => grid.exportCsv(filename)}>
      <Icon name="download" />
      Export CSV
    </Button>
  )
}

/** The selected count, your actions for those rows, and Clear selection. */
function DataGridSelection({ children }: { children?: ReactNode }) {
  const grid = useDataGrid()
  if (!grid.selectedCount) return null
  return (
    <div className="data-grid-selection">
      <span className="data-grid-selection-count">{grid.count(grid.selectedCount)} selected</span>
      {children}
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
  )
}

type DataGridToolbarProps = {
  /** The file name for Export CSV, without the extension. Leave it out to hide the button. */
  filename?: string
  /** Actions for the rows, like Delete, shown while rows are selected (in place of search). */
  selectionActions?: ReactNode
  /** Extra tools, after the built-in ones. */
  children?: ReactNode
}

/**
 * The usual arrangement: search (or the selection while rows are selected) at the start,
 * then filters, grouping, the view menu and export. Compose the parts yourself for another.
 */
function DataGridToolbar({ filename, selectionActions, children }: DataGridToolbarProps) {
  const grid = useDataGrid()
  return (
    <div className="data-grid-toolbar" role="group" aria-label={`${grid.label} tools`}>
      {grid.selectedCount > 0 ? (
        <DataGridSelection>{selectionActions}</DataGridSelection>
      ) : (
        <DataGridSearch />
      )}
      <div className="data-grid-tools">
        <DataGridFilters />
        <DataGridGroupBy />
        <DataGridViewMenu />
        {filename && <DataGridExport filename={filename} />}
        {children}
      </div>
    </div>
  )
}

export {
  DataGrid,
  DataGridExport,
  DataGridFilters,
  DataGridGroupBy,
  DataGridSearch,
  DataGridSelection,
  DataGridToolbar,
  DataGridViewMenu,
  useDataGrid,
}
export type {
  DataGridColumn,
  DataGridColumnState,
  DataGridDensity,
  DataGridEdit,
  DataGridProps,
  DataGridToolbarProps,
  SortRule,
}
