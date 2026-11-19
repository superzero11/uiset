// The Data Grid for Web Components: <uiset-data-grid> takes `rows`, `columns` and `getRowId`
// and does what the React DataGrid does, from the same view logic (data-grid/view.ts), the
// same cell rules (data-grid/columns.ts) and the same primitive (data-grid/grid.ts): one tab
// stop and arrows between cells, sorting, search and column filters, grouping, selection,
// editing in place with checked values, copy and paste, column menus, resizing, moving,
// pinning and hiding, density, saved layouts, virtualized rows, CSV export and agent actions.
import { announce, bindDrag, createVirtualizer, inputHints, isRTL, type GridCell, type Virtualizer } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/web"
import "@ui-sdk/web/button"
import "@ui-sdk/web/combobox"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/menu"
import "@ui-sdk/web/popover"
import "@ui-sdk/web/select"
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
  type GridColumnSpec,
} from "@/registry/uiset/ui/data-grid/columns"
import { dataGrid, type DataGridCommands } from "@/registry/uiset/ui/data-grid/grid"
import { filterRows, groupRows, nextSort, sortRows, toCsv, type CellValue, type SortRule, type ViewItem } from "@/registry/uiset/ui/data-grid/view"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/shell/shell.css"
import "@/registry/uiset/ui/data-grid/data-grid.css"
import { asFlag, attr, defineElement, ElementBase, h, isOn, place, uid, upgradeProperties } from "./dom"
import { scrollArea } from "./scroll"

type Row = unknown
type WebColumn<Datum = Row> = GridColumnSpec<Datum> & {
  /** Custom content: a Node or text. Copying, filtering and sorting still use `value` and `text`. */
  render?: (row: Datum) => Node | string
}

type GridInstance = { get: () => { editing: string | null }; subscribe: (run: () => void) => () => void; api: GridApi }
type GridApi = {
  grid: { focus: (cell: GridCell, options?: object) => void; active: () => GridCell | null }
  typed: () => string | null
  choose: (text: string) => boolean
  leaveEdit: (refocus: boolean) => void
}
type TableElement = HTMLElement & { api?: GridApi }

const stateNames = ["selected", "sort", "query", "filters", "groupBy", "columnState", "density"] as const
type StateName = (typeof stateNames)[number]

/**
 * <uiset-data-grid label="Customers" selectable toolbar filename="customers"> with `rows`,
 * `columns` and `getRowId` as properties. Its state is live and reported by events:
 * `selected` (selectedchange), `sort` (sortchange), `query` (querychange), `filters`
 * (filterschange), `groupBy` (groupbychange), `columnState` (columnstatechange) and `density`
 * (densitychange). `celledit` asks before an edit is saved: preventDefault() refuses it.
 * `rowaction` is Enter on a cell that isn't edited in place.
 */
// `Datum` is a page's row, for the three properties that take rows: name it
// (`UISetDataGrid<Order>`) to have columns and `getRowId` checked against it. Inside, a row
// is unknown.
/**
 * What `<uiset-data-grid>` fires; `Datum` is your row type. A person's or agent's change
 * fires its `…change` event first, and `preventDefault()` refuses it.
 */
type UISetDataGridEvents<Datum = any> = {
  selectedchange: CustomEvent<{ value: readonly string[] }>
  sortchange: CustomEvent<{ value: readonly SortRule[] }>
  querychange: CustomEvent<{ value: string }>
  filterschange: CustomEvent<{ value: Record<string, string> }>
  groupbychange: CustomEvent<{ value: string | null }>
  columnstatechange: CustomEvent<{ value: DataGridColumnState | null }>
  densitychange: CustomEvent<{ value: DataGridDensity }>
  /** An edit, parsed: write it to your data, or `preventDefault()` and the editor stays open. */
  celledit: CustomEvent<{ row: Datum; rowId: string; column: string; value: CellValue; text: string }>
  /** Enter or a click on a row. */
  rowaction: CustomEvent<{ value: string; row: Datum }>
}

// A generic class can't take its listeners from its base, so the grid's are declared here.
interface UISetDataGrid<Datum = any> {
  addEventListener<K extends keyof UISetDataGridEvents<Datum>>(type: K, listener: (this: this, event: UISetDataGridEvents<Datum>[K]) => unknown, options?: boolean | AddEventListenerOptions): void
  addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: this, event: HTMLElementEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  removeEventListener<K extends keyof UISetDataGridEvents<Datum>>(type: K, listener: (this: this, event: UISetDataGridEvents<Datum>[K]) => unknown, options?: boolean | EventListenerOptions): void
  removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: this, event: HTMLElementEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
}

class UISetDataGrid<Datum = any> extends ElementBase {
  static observedAttributes = ["label", "locale", "selectable", "height", "empty", "persist", "toolbar", "filename", "density", "editable"]

  // Public properties are accessors over private fields, so a value a page set before the
  // element was defined is picked up (see upgradeProperties) rather than overwritten.
  #rows: readonly Row[] = []
  #columns: readonly WebColumn[] = []
  #getRowId: (row: Row) => string = (row) => String((row as { id?: unknown }).id)

  private state = {
    selected: [] as readonly string[],
    sort: [] as readonly SortRule[],
    query: "",
    filters: {} as Record<string, string>,
    groupBy: null as string | null,
    columnState: null as DataGridColumnState | null,
    density: "standard" as DataGridDensity,
  }
  private collapsed = new Set<string>()
  private collapsedVersion = 0
  private editError: { cell: string; message: string } | null = null
  private dragWidth: { id: string; width: number } | null = null
  private anchorRow: string | null = null
  private pendingFocus: GridCell | null = null
  private queued = false
  private loaded = false
  private countTimer?: ReturnType<typeof setTimeout>
  private countKey = ""
  private renderedRowHeight = 0
  private lastEditing: string | null = null
  private instance?: GridInstance
  private virtual: Virtualizer
  // Filtering, sorting and grouping run again only when what they read changes.
  private memo: {
    rows?: readonly Row[]
    columns?: readonly WebColumn[]
    query?: string
    filters?: Record<string, string>
    locale?: string
    filtered?: Row[]
    sort?: readonly SortRule[]
    sorted?: Row[]
    groupBy?: string | null
    collapsed?: number
    getId?: (row: Row) => string
    items?: ViewItem<Row>[]
    rowIds?: string[]
    selected?: readonly string[]
    selectedSet?: Set<string>
  } = {}
  private texts = new WeakMap<object, string[]>()
  private view = this.compute()
  private dom?: {
    toolbar: HTMLElement
    scroller: HTMLElement
    table: TableElement
    head: HTMLElement
    body: HTMLElement
    empty: HTMLElement
    help: HTMLElement
    footer: HTMLElement
  }

  constructor() {
    super()
    this.virtual = createVirtualizer({
      count: () => this.view.items.length,
      estimate: () => this.rowHeight,
      overscan: 8,
      scrollMargin: HEADER_HEIGHT,
      keep: () => {
        const active = this.instance?.api.grid.active()
        return active && active.row > 0 ? [active.row - 1] : []
      },
    })
    this.upgrade()
  }

  private upgrade() {
    upgradeProperties(this, ["rows", "columns", "getRowId", ...stateNames])
  }

  get rows(): readonly Datum[] {
    return this.#rows as readonly Datum[]
  }
  set rows(value: readonly Datum[]) {
    this.#rows = value ?? []
    this.schedule()
  }
  get columns(): readonly WebColumn<Datum>[] {
    return this.#columns as unknown as readonly WebColumn<Datum>[]
  }
  set columns(value: readonly WebColumn<Datum>[]) {
    this.#columns = (value ?? []) as unknown as readonly WebColumn[]
    this.schedule()
  }
  get getRowId(): (row: Datum) => string {
    return this.#getRowId as (row: Datum) => string
  }
  set getRowId(value: (row: Datum) => string) {
    this.#getRowId = (value as ((row: Row) => string) | null) ?? ((row) => String((row as { id?: unknown }).id))
    this.schedule()
  }

  // Live state: read it any time; setting it fires no event, like a native control.
  get selected() {
    return this.state.selected
  }
  set selected(v: readonly string[]) {
    this.set("selected", v, false)
  }
  get sort() {
    return this.state.sort
  }
  set sort(v: readonly SortRule[]) {
    this.set("sort", v, false)
  }
  get query() {
    return this.state.query
  }
  set query(v: string) {
    this.set("query", v, false)
  }
  get filters() {
    return this.state.filters
  }
  set filters(v: Record<string, string>) {
    this.set("filters", v, false)
  }
  get groupBy() {
    return this.state.groupBy
  }
  set groupBy(v: string | null) {
    this.set("groupBy", v, false)
  }
  get columnState(): DataGridColumnState {
    return this.state.columnState ?? this.defaultColumnState()
  }
  set columnState(v: DataGridColumnState) {
    this.set("columnState", v, false)
  }
  get density() {
    return this.state.density
  }
  set density(v: DataGridDensity) {
    this.set("density", v, false)
  }

  // Attributes that are properties too. A framework that finds a member by an attribute's
  // name sets it as a property (Vue does), so each one writes its attribute.
  get label(): string {
    return this.getAttribute("label") ?? ""
  }
  set label(value: string | null) {
    attr(this, "label", value)
  }
  get locale(): string | undefined {
    return this.getAttribute("locale") ?? undefined
  }
  set locale(value: string | null | undefined) {
    attr(this, "locale", value)
  }
  get selectable(): boolean {
    return isOn(this, "selectable")
  }
  set selectable(value: boolean) {
    attr(this, "selectable", asFlag(value))
  }
  get editable(): boolean {
    return isOn(this, "editable")
  }
  set editable(value: boolean) {
    attr(this, "editable", asFlag(value))
  }
  private get rowHeight() {
    return ROW_HEIGHTS[this.state.density]
  }
  private count(n: number) {
    return new Intl.NumberFormat(this.locale).format(n)
  }

  /**
   * Changes state: a person's or agent's change (`report`) fires its event, and
   * preventDefault() refuses it. Returns whether the change was made, so a refused one is
   * neither announced nor followed by focus.
   */
  private set<K extends StateName>(name: K, value: (typeof this.state)[K], report = true) {
    if (report) {
      const event = new CustomEvent(`${name.toLowerCase()}change`, { detail: { value }, cancelable: true })
      if (!this.dispatchEvent(event)) return false
    }
    this.state[name] = value
    if (name === "columnState" || name === "density") this.save()
    this.schedule()
    return true
  }

  private defaultColumnState(): DataGridColumnState {
    return {
      order: this.#columns.map((c) => c.id),
      widths: {},
      hidden: this.#columns.filter((c) => c.hidden).map((c) => c.id),
      pinned: this.#columns.filter((c) => c.pinned).map((c) => c.id),
    }
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === "density" && value && value in ROW_HEIGHTS) this.state.density = value as DataGridDensity
    if (name === "persist") this.load()
    this.schedule()
  }

  connectedCallback() {
    this.upgrade()
    this.build()
    this.load()
    this.schedule()
  }

  disconnectedCallback() {
    clearTimeout(this.countTimer)
  }

  // Saved layouts load once the element is on the page; saving waits until then.
  private load() {
    const key = this.getAttribute("persist")
    if (!key || !this.isConnected) return
    this.loaded = true
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null")
      if (saved?.columns) this.state.columnState = { ...this.columnState, ...saved.columns }
      if (saved?.density in ROW_HEIGHTS) this.state.density = saved.density
    } catch {
      // Storage can be unavailable or hold something else; the defaults stand.
    }
  }

  private save() {
    const key = this.getAttribute("persist")
    if (!key || !this.loaded) return
    try {
      localStorage.setItem(key, JSON.stringify({ columns: this.columnState, density: this.state.density }))
    } catch {
      // Private windows and full storage keep working without saving.
    }
  }

  private schedule() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      if (this.isConnected) this.render()
    })
  }

  /** A row's text per column, lowercased, for search: kept per row object until columns change. */
  private textOf(row: Row, columns: readonly WebColumn[]) {
    if (!row || typeof row !== "object") return columns.map((c) => display(c, row).toLowerCase())
    let texts = this.texts.get(row)
    if (!texts) this.texts.set(row, (texts = columns.map((c) => display(c, row).toLowerCase())))
    return texts
  }

  /** The view: columns as shown, rows filtered, sorted and grouped. */
  private compute() {
    const columns = this.#columns
    const cs = this.state.columnState ?? (columns.length ? this.defaultColumnState() : { order: [], widths: {}, hidden: [], pinned: [] })
    const byId = new Map(columns.map((c) => [c.id, c]))
    const order = [...(cs.order ?? []).filter((id) => byId.has(id)), ...columns.map((c) => c.id).filter((id) => !(cs.order ?? []).includes(id))]
    const pinned = new Set(cs.pinned ?? [])
    const hidden = new Set(cs.hidden ?? [])
    const shownIds = [...order.filter((id) => pinned.has(id)), ...order.filter((id) => !pinned.has(id))].filter((id) => !hidden.has(id))
    const visible = shownIds.map((id) => byId.get(id)!)
    const state = this.state
    const getId = this.#getRowId
    const m = this.memo
    const locale = this.getAttribute("locale") ?? undefined
    if (m.columns !== columns || m.locale !== locale) this.texts = new WeakMap()
    if (!m.filtered || m.rows !== this.#rows || m.columns !== columns || m.query !== state.query || m.filters !== state.filters || m.locale !== locale) {
      m.filtered = filterRows(this.#rows, columns, state.query, state.filters, (row) => this.textOf(row, columns))
      Object.assign(m, { rows: this.#rows, columns, query: state.query, filters: state.filters, locale, sorted: undefined })
    }
    if (!m.sorted || m.sort !== state.sort) {
      m.sorted = sortRows(m.filtered, columns, state.sort)
      Object.assign(m, { sort: state.sort, items: undefined, rowIds: undefined })
    }
    const sorted = m.sorted
    const groupColumn = state.groupBy ? (byId.get(state.groupBy) ?? null) : null
    if (!m.items || m.groupBy !== state.groupBy || m.collapsed !== this.collapsedVersion || m.getId !== getId) {
      m.items = groupRows(sorted, getId, groupColumn, this.collapsed)
      Object.assign(m, { groupBy: state.groupBy, collapsed: this.collapsedVersion })
    }
    if (!m.rowIds || m.getId !== getId) m.rowIds = sorted.map(getId)
    m.getId = getId
    if (!m.selectedSet || m.selected !== state.selected) Object.assign(m, { selected: state.selected, selectedSet: new Set(state.selected) })
    const items = m.items
    const rowIds = m.rowIds
    const selectedSet = m.selectedSet!
    const selectedShown = rowIds.reduce((n, id) => n + (selectedSet.has(id) ? 1 : 0), 0)
    return { cs, byId, order, pinned, hidden, shownIds, visible, sorted, groupColumn, items, selectedSet, rowIds, selectedShown }
  }

  private offset() {
    return this.selectable ? 1 : 0
  }
  private clampWidth(column: WebColumn, width: number) {
    return Math.round(Math.min(960, Math.max(column.minWidth ?? 64, width)))
  }
  private widthOf(column: WebColumn) {
    return this.dragWidth?.id === column.id ? this.dragWidth.width : this.clampWidth(column, this.view.cs.widths[column.id] ?? column.width ?? 160)
  }
  private itemAt(row: number) {
    return row > 0 ? this.view.items[row - 1] : undefined
  }
  private columnAt(col: number) {
    return col >= this.offset() ? this.view.visible[col - this.offset()] : undefined
  }
  private primaryText(row: Row) {
    const first = this.view.visible[0]
    return first ? display(first, row) : this.#getRowId(row)
  }

  /* --------------------------------------------------------------- actions */

  private toggleRow(id: string, shift = false) {
    const screenIds = this.view.items.flatMap((item) => (item.kind === "row" ? [item.id] : []))
    const from = this.anchorRow === null ? -1 : screenIds.indexOf(this.anchorRow)
    const to = screenIds.indexOf(id)
    const selected = this.state.selected
    if (shift && from >= 0 && to >= 0) {
      const range = screenIds.slice(Math.min(from, to), Math.max(from, to) + 1)
      this.set("selected", [...new Set([...selected, ...range])])
    } else this.set("selected", this.view.selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id])
    this.anchorRow = id
  }

  private toggleAll() {
    const { rowIds, selectedShown } = this.view
    if (rowIds.length > 0 && selectedShown === rowIds.length) {
      const shown = new Set(rowIds)
      if (this.set("selected", this.state.selected.filter((id) => !shown.has(id)))) announce("Rows deselected")
    } else if (this.set("selected", [...new Set([...this.state.selected, ...rowIds])])) announce(`${this.count(rowIds.length)} rows selected`)
  }

  private toggleGroup(key: string) {
    if (this.collapsed.has(key)) this.collapsed.delete(key)
    else this.collapsed.add(key)
    this.collapsedVersion++
    this.schedule()
  }

  private sortColumn(column: WebColumn, additive: boolean) {
    const next = nextSort(this.state.sort, column.id, additive)
    if (this.set("sort", next)) announce(sortMessage(next, this.#columns))
  }

  /** Saves an edit, if `celledit` doesn't refuse it. `cell` marks one typed into the grid. */
  private commit(row: Row, column: WebColumn, text: string, cell?: string) {
    const parsed = parse(column, text, this.locale)
    if ("error" in parsed) {
      if (cell) {
        this.editError = { cell, message: parsed.error }
        announce(parsed.error, { priority: "assertive" })
        this.schedule()
      }
      return false
    }
    const event = new CustomEvent("celledit", {
      cancelable: true,
      detail: { row, rowId: this.#getRowId(row), column: column.id, value: parsed.value as CellValue, text },
    })
    const accepted = this.dispatchEvent(event)
    if (accepted && cell) this.editError = null
    this.schedule()
    return accepted
  }

  private resizeColumn(column: WebColumn, width: number) {
    const next = this.clampWidth(column, width)
    const cs = this.columnState
    if (!this.set("columnState", { ...cs, widths: { ...cs.widths, [column.id]: next } })) return false
    announce(`${column.header}, ${next} pixels wide`)
    return true
  }

  private resetWidth(id: string) {
    const cs = this.columnState
    if (cs.widths[id] === undefined) return false
    const widths = { ...cs.widths }
    delete widths[id]
    if (!this.set("columnState", { ...cs, widths })) return false
    announce(`${this.view.byId.get(id)?.header ?? id}, width reset`)
    return true
  }

  private moveColumn(id: string, delta: number) {
    const { shownIds, pinned, order, byId } = this.view
    const index = shownIds.indexOf(id)
    const target = shownIds[index + delta]
    if (!target || pinned.has(target) !== pinned.has(id)) return false
    const next = [...order]
    const a = next.indexOf(id)
    const b = next.indexOf(target)
    ;[next[a], next[b]] = [next[b]!, next[a]!]
    if (!this.set("columnState", { ...this.columnState, order: next })) return false
    announce(`${byId.get(id)?.header} moved to column ${index + delta + 1 + this.offset()}`)
    return true
  }

  private setShown(id: string, shown: boolean) {
    const next = new Set(this.view.hidden)
    if (shown) next.delete(id)
    else if (this.view.shownIds.length > 1) next.add(id)
    return this.set("columnState", { ...this.columnState, hidden: [...next] })
  }

  private setPinned(id: string, pin: boolean) {
    const next = new Set(this.view.pinned)
    if (pin) next.add(id)
    else next.delete(id)
    return this.set("columnState", { ...this.columnState, pinned: [...next] })
  }

  private setFilter(column: string, text: string) {
    const next = { ...this.state.filters }
    if (text) next[column] = text
    else delete next[column]
    return this.set("filters", next)
  }

  /** Downloads what the grid shows (or the selected rows) as CSV. */
  exportCsv(filename = this.getAttribute("filename") ?? "export") {
    const { sorted, selectedShown, selectedSet, visible } = this.view
    const chosen = selectedShown ? sorted.filter((row) => selectedSet.has(this.#getRowId(row))) : sorted
    download(filename, toCsv(chosen, visible))
    announce(`Exported ${this.count(chosen.length)} rows`)
  }

  /** Puts focus on the grid's active cell, or its first. */
  focusGrid() {
    const api = this.instance?.api
    api?.grid.focus(api.grid.active() ?? { row: 0, col: 0 }, { reason: "imperative" })
  }

  // Agents name columns by id or header, and rows by id or by their first column.
  private commands(): DataGridCommands {
    const { visible, byId } = this.view
    const label = this.label
    const columnNames = () => visible.map((c) => c.header).join(", ")
    const findColumn = (name: string) => {
      const column = byId.get(name) ?? this.#columns.find((c) => c.header.toLowerCase() === String(name).toLowerCase())
      if (!column) throw new Error(`No column "${name}" in ${label}. Its columns: ${columnNames()}.`)
      return column
    }
    const findRow = (name: string) => {
      const row = this.#rows.find((r) => this.#getRowId(r) === name) ?? this.#rows.find((r) => this.primaryText(r).toLowerCase() === String(name).toLowerCase())
      if (row === undefined) throw new Error(`No row "${name}" in ${label}.`)
      return row
    }
    const refuse = (message: string): never => {
      throw new Error(message)
    }
    // A change the page refused (preventDefault on its event) is an error the agent reads.
    const applied = (done: boolean) => done || refuse(`${label} didn't accept that change.`)
    return {
      sortBy: (name, direction = "ascending") => {
        const column = findColumn(name)
        if (column.sortable === false) refuse(`${column.header} can't be sorted.`)
        if (direction !== "ascending" && direction !== "descending" && direction !== "none")
          refuse(`Sort direction must be ascending, descending or none, not "${direction}".`)
        return applied(this.set("sort", direction === "none" ? [] : [{ column: column.id, direction }]))
      },
      filter: (text) => applied(this.set("query", String(text ?? ""))),
      filterColumn: (name, text) => {
        const column = findColumn(name)
        if (column.filterable === false) refuse(`${column.header} can't be filtered.`)
        return applied(this.setFilter(column.id, String(text ?? "")))
      },
      selectRows: (names) => {
        if (!this.selectable) refuse(`Rows in ${label} can't be selected.`)
        if (!Array.isArray(names)) refuse("selectRows takes a list of row names.")
        return applied(this.set("selected", names.map((name) => this.#getRowId(findRow(name)))))
      },
      clearSelection: () => applied(this.set("selected", [])),
      editCell: (rowName, columnName, text) => {
        const row = findRow(rowName)
        const column = findColumn(columnName)
        if (!column.editable || !this.editable) refuse(`${column.header} can't be edited.`)
        const parsed = parse(column, String(text ?? ""), this.locale)
        if ("error" in parsed) refuse(parsed.error)
        if (!this.commit(row, column, String(text))) refuse(`${label} didn't accept that ${column.header}.`)
        return true
      },
      groupBy: (name) => {
        if (name === null || name === "" || String(name).toLowerCase() === "none") return applied(this.set("groupBy", null))
        const column = findColumn(name)
        if (column.groupable === false) refuse(`Rows can't be grouped by ${column.header}.`)
        return applied(this.set("groupBy", column.id))
      },
      showColumn: (name, shown) => {
        const column = findColumn(name)
        if (column.hideable === false && !shown) refuse(`${column.header} can't be hidden.`)
        return applied(this.setShown(column.id, shown !== false))
      },
    }
  }

  /** The primitive's options, read by the table element. */
  options() {
    const { items, visible, sorted, groupColumn, byId } = this.view
    const offset = this.offset()
    const colCount = offset + visible.length
    const columnAt = (col: number) => this.columnAt(col)
    const itemAt = (row: number) => this.itemAt(row)
    return {
      rowCount: 1 + items.length,
      colCount,
      pageSize: () => Math.max(1, Math.floor(((this.dom?.scroller.clientHeight ?? 400) - HEADER_HEIGHT) / this.rowHeight) - 1),
      spanRows: items.flatMap((item, index) => (item.kind === "group" ? [index + 1] : [])),
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
        return item?.kind === "row" && column ? editTextOf(column, item.row) : ""
      },
      editable: (cell: GridCell) => {
        const item = itemAt(cell.row)
        const column = columnAt(cell.col)
        return item?.kind === "row" && !!column?.editable && column.type !== "boolean" && this.editable
      },
      onCellEdit: (cell: GridCell, text: string) => {
        const item = itemAt(cell.row)
        const column = columnAt(cell.col)
        return item?.kind === "row" && column ? this.commit(item.row, column, text, `${cell.row}:${cell.col}`) : false
      },
      onActivate: (cell: GridCell, event: KeyboardEvent) => {
        if (cell.row === 0) {
          if (this.selectable && cell.col === 0) return this.toggleAll()
          const column = columnAt(cell.col)
          if (column && column.sortable !== false) this.sortColumn(column, event.shiftKey)
          return
        }
        const item = itemAt(cell.row)
        if (!item) return
        if (item.kind === "group") return this.toggleGroup(item.key)
        if (this.selectable && cell.col === 0) return this.toggleRow(item.id)
        const column = columnAt(cell.col)
        if (column?.type === "boolean" && column.editable && this.editable) {
          this.commit(item.row, column, column.value(item.row) ? "no" : "yes")
          return
        }
        this.dispatchEvent(new CustomEvent("rowaction", { detail: { value: item.id, row: item.row } }))
      },
      onCellKey: (cell: GridCell, event: KeyboardEvent, target: HTMLElement) => {
        if (cell.row !== 0) return false
        const column = columnAt(cell.col)
        if (!column) return false
        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          this.openMenu(column.id)
          return true
        }
        const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight"
        if (!event.altKey || !horizontal || event.ctrlKey || event.metaKey) return false
        const forward = event.key === "ArrowRight" !== isRTL(target)
        if (event.shiftKey) {
          if (this.moveColumn(column.id, forward ? 1 : -1)) this.pendingFocus = { row: 0, col: cell.col + (forward ? 1 : -1) }
        } else this.resizeColumn(column, this.widthOf(column) + (forward ? RESIZE_STEP : -RESIZE_STEP))
        return true
      },
      onPaste: (start: GridCell, pasted: string[][]) => {
        let done = 0
        let refused = 0
        pasted.forEach((cells, i) =>
          cells.forEach((text, j) => {
            const item = itemAt(start.row + i)
            const column = columnAt(start.col + j)
            if (item?.kind !== "row" || !column?.editable || !this.editable) return
            if (this.commit(item.row, column, text)) done++
            else refused++
          }),
        )
        const text = done ? `Pasted ${this.count(done)} ${done === 1 ? "cell" : "cells"}` : "Nothing pasted"
        announce(refused ? `${text}; ${this.count(refused)} didn't fit their column` : done ? text : "Nothing pasted: these cells can't be edited")
      },
      reveal: (cell: GridCell) => {
        if (cell.row > 0) this.virtual.scrollToIndex(cell.row - 1)
      },
      items: () =>
        sorted.map((row) => {
          const entry: Record<string, string> = { id: this.#getRowId(row) }
          for (const column of visible) entry[column.header] = display(column, row)
          return entry
        }),
      view: {
        rows: sorted.length,
        of: this.#rows.length,
        sort: this.state.sort.length ? sortMessage(this.state.sort, this.#columns) : "none",
        filter: this.state.query,
        ...(Object.keys(this.state.filters).length ? { columnFilters: this.state.filters } : {}),
        groupBy: groupColumn?.header ?? "none",
        selected: this.state.selected.length,
      },
      commands: this.commands(),
      _byId: byId,
    }
  }

  /** The table element hands over its primitive instance once it exists. */
  attach(instance: GridInstance) {
    this.instance = instance
    const stop = instance.subscribe(() => {
      const editing = instance.get().editing
      if (editing === this.lastEditing) return
      this.lastEditing = editing
      if (!editing) this.editError = null
      this.renderBody()
    })
    return stop
  }

  /* -------------------------------------------------------------- building */

  // Your controls for the selection bar (children with data-part="selection"), like
  // "Delete selected": they show while rows are selected.
  private selectionActions: Element[] = []

  private build() {
    if (this.dom) return
    this.selectionActions = [...this.children].filter((child) => (child as HTMLElement).dataset.part === "selection")
    this.classList.add("data-grid")
    const toolbar = h("div", { class: "data-grid-toolbar", role: "group" })
    const head = h("div", { role: "rowgroup", class: "data-grid-head" })
    const body = h("div", { role: "rowgroup", class: "data-grid-body" })
    const table = h("uiset-data-grid-table", { class: "data-grid-table" }, head, body) as TableElement
    const empty = h("div", { class: "data-grid-empty" })
    // Out of the tab order: the grid's one tab stop is its active cell, and Firefox would
    // otherwise stop on any scrolling box as well.
    const area = scrollArea(null, { axis: "both", frame: { class: "data-grid-frame" }, viewport: { class: "data-grid-scroller", role: "group", "aria-label": "Rows", tabindex: "-1" } })
    area.content.append(table, empty)
    const scroller = area.view
    const help = h(
      "p",
      { id: uid("grid-help"), hidden: true },
      "Arrow keys move between cells. Enter sorts a column or edits a cell, Escape cancels. Shift with arrows selects cells. On a column header, Shift+F10 opens the column menu, Alt (Option on a Mac) with Left or Right resizes the column, and adding Shift moves it.",
    )
    const footer = h("div", { class: "data-grid-footer" })
    this.replaceChildren(toolbar, area.root, help, footer)
    this.dom = { toolbar, scroller, table, head, body, empty, help, footer }
    // The tools exist from the start, so your selection actions are on the page for your script.
    if (isOn(this, "toolbar")) this.tools = this.buildTools()
    this.virtual.connect(scroller)
    this.virtual.subscribe(() => this.renderBody())
    // The filter announces its count once typing pauses.
  }

  private render() {
    const dom = this.dom
    if (!dom) return
    this.view = this.compute()
    const { visible, items, sorted } = this.view
    const offset = this.offset()

    this.dataset.density = this.state.density
    this.style.setProperty("--data-grid-height", this.getAttribute("height") ?? "")
    attr(dom.table, "aria-label", this.label)
    attr(dom.table, "aria-describedby", dom.help.id)
    dom.table.style.setProperty("--data-grid-header-height", `${HEADER_HEIGHT}px`)
    dom.table.style.setProperty("--data-grid-row-height", `${this.rowHeight}px`)
    this.layout()
    ;(dom.table as unknown as { gridOptions: unknown }).gridOptions = this.options()
    // The table re-reads its options when one of its properties is set.
    ;(dom.table as unknown as { view: unknown }).view = this.options().view

    this.renderToolbar()
    this.renderHeader(offset)
    dom.empty.textContent = this.getAttribute("empty") ?? "No rows to show"
    dom.empty.style.display = items.length ? "none" : ""
    const total = this.#rows.length
    const footer = [
      sorted.length === total ? `${this.count(total)} ${total === 1 ? "row" : "rows"}` : `${this.count(sorted.length)} of ${this.count(total)} rows`,
      ...(this.selectable && this.state.selected.length > 0 ? [`${this.count(this.state.selected.length)} selected`] : []),
    ]
    if (dom.footer.dataset.key !== footer.join("\n")) {
      dom.footer.dataset.key = footer.join("\n")
      dom.footer.replaceChildren(...footer.map((text) => h("span", null, text)))
    }
    // A new density changes every row's height: the virtualizer measures again, and the
    // active row stays in view.
    if (this.renderedRowHeight && this.renderedRowHeight !== this.rowHeight) {
      this.virtual.reset()
      const active = this.instance?.api.grid.active()
      if (active && active.row > 0) this.virtual.scrollToIndex(active.row - 1)
    } else this.virtual.refresh()
    this.renderedRowHeight = this.rowHeight
    this.renderBody()
    const cell = this.pendingFocus
    if (cell) {
      this.pendingFocus = null
      queueMicrotask(() => this.instance?.api.grid.focus(cell, { reason: "imperative" }))
    }
    // The count is announced once typing pauses, and only when the search, the filters or
    // the count changed: not after every sort, selection or resize.
    const filtering = !!this.state.query || Object.keys(this.state.filters).length > 0
    const countKey = filtering ? JSON.stringify([this.state.query, this.state.filters, sorted.length]) : ""
    if (countKey !== this.countKey) {
      this.countKey = countKey
      clearTimeout(this.countTimer)
      if (filtering) this.countTimer = setTimeout(() => announce(`${this.count(sorted.length)} ${sorted.length === 1 ? "row" : "rows"}`), 600)
    }
  }

  private pinOffsets = new Map<string, number>()
  private lastSticky: string | null = null

  /** Column widths and pinned offsets: all a drag changes, so a drag redraws nothing else. */
  private layout() {
    const dom = this.dom!
    const { visible, pinned } = this.view
    // The last column takes any room left, so the rows always reach the edge.
    let edge = this.selectable ? SELECT_WIDTH : 0
    const pinOffsets = new Map<string, number>()
    for (const column of visible) {
      if (!pinned.has(column.id)) continue
      pinOffsets.set(column.id, edge)
      edge += this.widthOf(column)
    }
    const template = [
      ...(this.selectable ? [`${SELECT_WIDTH}px`] : []),
      ...visible.map((column, index) => (index === visible.length - 1 ? `minmax(${this.widthOf(column)}px, 1fr)` : `${this.widthOf(column)}px`)),
    ].join(" ")
    const totalWidth = visible.reduce((sum, c) => sum + this.widthOf(c), this.selectable ? SELECT_WIDTH : 0)
    this.pinOffsets = pinOffsets
    this.lastSticky = visible.filter((c) => pinned.has(c.id)).at(-1)?.id ?? (this.selectable ? "" : null)
    dom.scroller.style.scrollPaddingInlineStart = `${edge}px`
    dom.scroller.style.scrollPaddingBlockStart = `${HEADER_HEIGHT}px`
    dom.table.style.setProperty("--data-grid-columns", template)
    dom.table.style.inlineSize = `${totalWidth}px`
  }

  private sticky(el: HTMLElement, id: string) {
    const left = id === "" ? 0 : this.pinOffsets.get(id)
    attr(el, "data-column", id)
    attr(el, "data-pinned", left !== undefined)
    attr(el, "data-pinned-edge", id === this.lastSticky)
    const inset = left === undefined ? "" : `${left}px`
    if (el.style.insetInlineStart !== inset) el.style.insetInlineStart = inset
  }

  /** A native checkbox the cell owns. It never takes focus, which stays on the cell (the
      grid's one tab stop), and Space on the cell toggles it the same as a click. */
  private checkbox(onToggle: (box: HTMLInputElement, shift: boolean) => void) {
    const box = h("input", { type: "checkbox", class: "data-grid-checkbox", tabindex: "-1" }) as HTMLInputElement
    box.addEventListener("mousedown", (event) => event.preventDefault())
    // The box toggles itself; the grid's state then sets it right (back, if the page
    // refused the change).
    box.addEventListener("click", (event) => {
      onToggle(box, event.shiftKey)
      this.schedule()
    })
    return box
  }

  private updateCheckbox(box: HTMLInputElement, checked: boolean, label: string, mixed = false) {
    box.checked = checked
    box.indeterminate = mixed
    attr(box, "aria-label", label)
  }

  private cellPart(row: number, col: number, existing?: Element | null) {
    const cell = (existing as HTMLElement | null) ?? h("uiset-data-grid-cell")
    attr(cell, "row", row)
    attr(cell, "col", col)
    attr(cell, "value", `${row}:${col}`)
    return cell
  }

  /* ---------------------------------------------------------------- header */

  // Header cells are kept by column (and "" for Select all), so a cell keeps its menu, its
  // resize handle and focus as columns move, sort and resize.
  private headers = new Map<string, HeaderParts>()

  private headerParts(id: string): HeaderParts {
    const cell = h("uiset-data-grid-cell", { id: uid("grid-header"), class: "data-grid-cell data-grid-header" })
    const label = h("span", { class: "data-grid-header-label" })
    const sort = h("span", { class: "data-grid-sort", "aria-hidden": "true" })
    // For pointers and touch screen readers; keyboards use Shift+F10 on the header. A press
    // leaves focus where it is, so Escape and the menu's items return it to the header.
    const button = h("button", { type: "button", tabindex: "-1", class: "data-grid-menu-button", "data-grid-handle": "" }, iconElement("more"))
    button.addEventListener("mousedown", (event) => event.preventDefault())
    const menu = this.menuParts(id, button, cell.id)
    const resizer = h("span", { class: "data-grid-resizer", "data-grid-handle": "", "aria-hidden": "true" })
    resizer.addEventListener("pointerdown", (event) => {
      const column = this.view.byId.get(id)
      if (column) this.startResize(event, column)
    })
    resizer.addEventListener("dblclick", () => this.resetWidth(id))
    cell.append(label, sort, menu.menu, resizer)
    cell.addEventListener("click", (event) => {
      if ((event.target as Element).closest("[data-grid-handle], ui-menu")) return
      const column = this.view.byId.get(id)
      if (column && column.sortable !== false) this.sortColumn(column, event.shiftKey)
    })
    cell.addEventListener("contextmenu", (event) => {
      event.preventDefault()
      this.openMenu(id)
    })
    const parts = { cell, label, sort, menu, resizer, sortKey: "" }
    this.headers.set(id, parts)
    return parts
  }

  private renderHeader(offset: number) {
    const dom = this.dom!
    const { visible, selectedShown, rowIds } = this.view
    const sort = this.state.sort
    const primary = sort[0]
    let row = dom.head.firstElementChild as HTMLElement | null
    if (!row) dom.head.append((row = h("div", { role: "row", "aria-rowindex": "1", class: "data-grid-row data-grid-header-row" })))
    const cells: HTMLElement[] = []
    if (this.selectable) {
      let parts = this.headers.get("")
      if (!parts) {
        const cell = h("uiset-data-grid-cell", { id: uid("grid-header"), class: "data-grid-cell data-grid-select" })
        const box = this.checkbox(() => this.toggleAll())
        cell.append(box)
        parts = { cell, box }
        this.headers.set("", parts)
      }
      this.cellPart(0, 0, parts.cell)
      this.sticky(parts.cell, "")
      const all = rowIds.length > 0 && selectedShown === rowIds.length
      this.updateCheckbox(parts.box!, all, "Select all rows", selectedShown > 0 && !all)
      cells.push(parts.cell)
    }
    visible.forEach((column, index) => {
      const parts = this.headers.get(column.id) ?? this.headerParts(column.id)
      const cell = this.cellPart(0, index + offset, parts.cell)
      attr(cell, "data-align", column.align ?? (column.type === "number" ? "end" : undefined))
      attr(cell, "aria-sort", primary?.column === column.id ? primary.direction : undefined)
      this.sticky(cell, column.id)
      if (parts.label!.textContent !== column.header) parts.label!.textContent = column.header
      const sortIndex = sort.findIndex((rule) => rule.column === column.id)
      const rule = sort[sortIndex]
      const sortKey = rule ? `${rule.direction}:${sort.length > 1 ? sortIndex + 1 : ""}` : ""
      if (parts.sortKey !== sortKey) {
        parts.sortKey = sortKey
        parts.sort!.replaceChildren(
          ...(rule ? [iconElement(rule.direction === "ascending" ? "up" : "down"), sort.length > 1 ? h("span", { class: "data-grid-sort-order" }, String(sortIndex + 1)) : ""] : []),
        )
        parts.sort!.style.display = rule ? "" : "none"
      }
      this.updateMenu(parts.menu!, column)
      cells.push(cell)
    })
    const keep = new Set(cells)
    for (const [id, parts] of this.headers) if (!keep.has(parts.cell)) this.headers.delete(id)
    place(row, cells, (child) => child.localName === "uiset-data-grid-cell")
  }

  private openMenu(id: string) {
    const menu = this.headers.get(id)?.menu?.menu
    if (menu) menu.open = true
  }

  /** A header's menu, made once per column: its items are kept and updated, so an open
      menu stays open, with focus on its item, as the grid redraws. */
  private menuParts(id: string, button: HTMLElement, cellId: string): MenuParts {
    const label = h("ui-menu-group-label")
    const group = h("ui-menu-group", null, label)
    // Focus goes back to the header when the menu closes.
    const content = h("ui-menu-content", { class: "data-grid-menu", align: "start", "final-focus": `#${cellId}` }, group)
    // Its popup stays inside the header cell on the web: marked as a handle, the cell leaves
    // presses there alone (a drag-select would take the pointer from the menu's items).
    const menu = h("ui-menu", { "data-grid-handle": "" }, h("ui-menu-trigger", null, button), content) as HTMLElement & { open?: boolean }
    menu.addEventListener("action", (event) => this.menuAction(id, String((event as CustomEvent<{ value: unknown }>).detail.value)))
    menu.addEventListener("openchange", (event) => {
      const { value, reason } = (event as CustomEvent<{ value: boolean; reason?: string }>).detail
      if (value) return
      // Closed from the menu itself (Escape, an item, its own button), focus goes to this
      // header as the grid's active cell, wherever it was: a menu opened by a click and closed
      // at once never took focus from the header that had it. Closed by a press or focus
      // elsewhere, focus stays where it went, unless it came back to this header.
      const fromMenu = reason === "escape-key" || reason === "item-press" || reason === "trigger-press" || reason === "close-press"
      requestAnimationFrame(() => {
        const cell = this.headers.get(id)?.cell
        if (!cell?.isConnected) return
        if (fromMenu || cell.contains(document.activeElement)) this.instance?.api.grid.focus({ row: 0, col: Number(cell.getAttribute("col")) }, { reason: "imperative" })
      })
    })
    return { menu, content, group, label, button, items: new Map() }
  }

  private updateMenu(parts: MenuParts, column: WebColumn) {
    const { shownIds, pinned, cs } = this.view
    const rule = this.state.sort.find((r) => r.column === column.id)
    const at = shownIds.indexOf(column.id)
    const rtl = this.dom ? isRTL(this.dom.scroller) : false
    const canMove = (delta: number) => {
      const target = shownIds[at + delta]
      return !!target && pinned.has(target) === pinned.has(column.id)
    }
    const node = (key: string, tag: string, text?: string, attrs: Record<string, unknown> = {}) => {
      let el = parts.items.get(key)
      if (!el) parts.items.set(key, (el = h(tag, tag === "ui-menu-item" ? { value: key } : null)))
      if (text !== undefined && el.textContent !== text) el.textContent = text
      for (const [name, value] of Object.entries(attrs)) attr(el, name, value)
      return el
    }
    const item = (key: string, text: string, attrs?: Record<string, unknown>) => node(key, "ui-menu-item", text, attrs)
    const separator = (key: string) => node(`separator-${key}`, "ui-menu-separator")
    attr(parts.button, "aria-label", `${column.header} column menu`)
    if (parts.label.textContent !== column.header) parts.label.textContent = column.header
    const sortable = column.sortable !== false
    place(
      parts.group,
      [
        parts.label,
        ...(sortable
          ? [
              item("ascending", "Sort ascending", { disabled: rule?.direction === "ascending" }),
              item("descending", "Sort descending", { disabled: rule?.direction === "descending" }),
              ...(rule ? [item("unsort", "Clear sort")] : []),
            ]
          : []),
      ],
      () => true,
    )
    const hideable = column.hideable !== false && shownIds.length > 1
    place(
      parts.content,
      [
        parts.group,
        separator("a"),
        ...(column.groupable !== false ? [this.state.groupBy === column.id ? item("ungroup", "Stop grouping") : item("group", `Group by ${column.header}`)] : []),
        pinned.has(column.id) ? item("unpin", "Unpin") : item("pin", "Pin to start"),
        item("left", "Move left", { disabled: !canMove(rtl ? 1 : -1) }),
        item("right", "Move right", { disabled: !canMove(rtl ? -1 : 1) }),
        separator("b"),
        item("wider", "Wider", { "close-on-select": "false" }),
        item("narrower", "Narrower", { "close-on-select": "false" }),
        ...(cs.widths[column.id] !== undefined ? [item("width", "Reset width")] : []),
        ...(hideable ? [separator("c"), item("hide", "Hide column")] : []),
      ],
      () => true,
    )
  }

  private menuAction(id: string, action: string) {
    const column = this.view.byId.get(id)
    if (!column) return
    const flip = this.dom ? isRTL(this.dom.scroller) : false
    if (action === "ascending" || action === "descending") {
      const next: SortRule[] = [{ column: column.id, direction: action }]
      if (this.set("sort", next)) announce(sortMessage(next, this.#columns))
    } else if (action === "unsort") {
      if (this.set("sort", this.state.sort.filter((r) => r.column !== column.id))) announce("Sorting cleared")
    } else if (action === "group") this.set("groupBy", column.id)
    else if (action === "ungroup") this.set("groupBy", null)
    else if (action === "pin") this.setPinned(column.id, true)
    else if (action === "unpin") this.setPinned(column.id, false)
    else if (action === "left") this.moveColumn(column.id, flip ? 1 : -1)
    else if (action === "right") this.moveColumn(column.id, flip ? -1 : 1)
    else if (action === "wider") this.resizeColumn(column, this.widthOf(column) + RESIZE_STEP * 2)
    else if (action === "narrower") this.resizeColumn(column, this.widthOf(column) - RESIZE_STEP * 2)
    else if (action === "width") this.resetWidth(column.id)
    // Its header goes with it: the menu hands focus to the grid's tab stop, the header now
    // in its place (or the new last one, through the primitive's clamp).
    else if (action === "hide") this.setShown(column.id, false)
  }

  // Dragging a header's edge previews the width, and saves it once, on release. While it
  // moves, only the column widths change.
  private startResize(event: PointerEvent, column: WebColumn) {
    event.preventDefault()
    event.stopPropagation()
    const handle = event.currentTarget as HTMLElement
    const start = this.widthOf(column)
    const startX = event.clientX
    const rtl = isRTL(handle)
    let width = start
    const preview = () => {
      this.layout()
      for (const cell of this.dom?.table.querySelectorAll<HTMLElement>("[data-column]") ?? []) this.sticky(cell, cell.dataset.column!)
    }
    bindDrag(handle, event, {
      cancelOnEscape: true,
      onMove: ({ x }) => {
        width = this.clampWidth(column, start + (rtl ? startX - x : x - startX))
        this.dragWidth = { id: column.id, width }
        preview()
      },
      onEnd: (_event, canceled) => {
        this.dragWidth = null
        if (canceled || width === start || !this.resizeColumn(column, width)) preview()
      },
    })
  }

  /* ------------------------------------------------------------------ body */

  // What each cell shows now, so a redraw leaves a cell whose row and column didn't change.
  private cellMemo = new WeakMap<HTMLElement, { row: Row; column: WebColumn; text: string | undefined }>()
  private cellSig = new WeakMap<HTMLElement, string>()

  /** The rows near the viewport; rows are reused by position, as the React grid does. */
  private renderBody() {
    const dom = this.dom
    if (!dom) return
    const { items, visible, selectedSet } = this.view
    const offset = this.offset()
    const colCount = offset + visible.length
    const editing = this.instance?.get().editing ?? null
    const size = `${this.virtual.size()}px`
    if (dom.body.style.blockSize !== size) dom.body.style.blockSize = size
    const existing = new Map<number, HTMLElement>()
    for (const row of dom.body.children) existing.set(Number((row as HTMLElement).dataset.index), row as HTMLElement)
    const rows: HTMLElement[] = []
    for (const virtualItem of this.virtual.items()) {
      const item = items[virtualItem.index]
      if (!item) continue
      const index = virtualItem.index
      const rowNumber = index + 1
      let row = existing.get(index)
      const kind = item.kind
      if (row && row.dataset.kind !== kind) row = undefined
      row ??= h("div", { role: "row", "data-index": String(index), "data-kind": kind })
      attr(row, "aria-rowindex", rowNumber + 1)
      const top = `${virtualItem.start}px`
      if (row.style.top !== top) row.style.top = top
      const height = `${this.rowHeight}px`
      if (row.style.blockSize !== height) row.style.blockSize = height
      const old = [...row.children]
      if (item.kind === "group") {
        row.className = "data-grid-row data-grid-group-row"
        attr(row, "aria-selected", null)
        const cell = this.cellPart(rowNumber, 0, old[0])
        cell.className = "data-grid-cell data-grid-group"
        attr(cell, "aria-colspan", colCount)
        attr(cell, "aria-expanded", String(item.expanded))
        cell.onclick = () => this.toggleGroup(item.key)
        const sig = `group\u0000${item.label}\u0000${item.count}`
        if (this.cellSig.get(cell) !== sig) {
          this.cellSig.set(cell, sig)
          this.cellMemo.delete(cell)
          cell.replaceChildren(
            h(
              "span",
              { class: "data-grid-group-inner" },
              iconElement("chevron", "data-grid-chevron"),
              h("span", { class: "data-grid-group-label" }, item.label),
              h("span", { class: "data-grid-count" }, this.count(item.count)),
            ),
          )
        }
        for (const extra of old.slice(1)) extra.remove()
        if (cell.parentElement !== row) row.append(cell)
      } else {
        const selected = selectedSet.has(item.id)
        row.className = "data-grid-row"
        attr(row, "aria-selected", this.selectable ? String(selected) : undefined)
        attr(row, "data-selected", selected)
        const cells: HTMLElement[] = []
        if (this.selectable) {
          const cell = this.cellPart(rowNumber, 0, old[0])
          cell.className = "data-grid-cell data-grid-select"
          cell.onclick = null
          attr(cell, "aria-colspan", null)
          this.sticky(cell, "")
          let box = cell.firstElementChild as HTMLInputElement | null
          if (this.cellSig.get(cell) !== "select" || !box) {
            this.cellSig.set(cell, "select")
            this.cellMemo.delete(cell)
            // The row a reused checkbox stands for is read when it's pressed.
            box = this.checkbox((pressed, shift) => this.toggleRow(pressed.dataset.row!, shift))
            cell.replaceChildren(box)
          }
          box.dataset.row = item.id
          this.updateCheckbox(box, selected, `Select ${this.primaryText(item.row)}`)
          cells.push(cell)
        }
        visible.forEach((column, i) => {
          const col = i + offset
          const cellId = `${rowNumber}:${col}`
          const cell = this.cellPart(rowNumber, col, old[col])
          cell.className = "data-grid-cell"
          cell.onclick = null
          attr(cell, "aria-colspan", null)
          attr(cell, "aria-expanded", null)
          attr(cell, "data-align", column.align ?? (column.type === "number" ? "end" : undefined))
          attr(cell, "data-editable", !!column.editable && this.editable)
          this.sticky(cell, column.id)
          if (editing === cellId) {
            // The editor is UI SDK's inline edit: it keeps its text while it's open.
            this.cellMemo.delete(cell)
            this.cellSig.delete(cell)
            if (!cell.querySelector("uiset-data-grid-editor, .data-grid-option-editor")) {
              if (column.options) this.openOptions(cell, column, item.row)
              else cell.replaceChildren(this.editor(column))
            }
            const error = cell.querySelector<HTMLElement>(".data-grid-error")
            const input = cell.querySelector("input")!
            const message = this.editError?.cell === cellId ? this.editError.message : null
            if (error) error.textContent = message ?? ""
            if (error) error.hidden = !message
            attr(input, "aria-invalid", message ? "true" : undefined)
          } else {
            const text = column.render ? undefined : display(column, item.row)
            const memo = this.cellMemo.get(cell)
            if (!memo || memo.row !== item.row || memo.column !== column || memo.text !== text || this.cellSig.has(cell)) {
              this.cellSig.delete(cell)
              this.cellMemo.set(cell, { row: item.row, column, text })
              cell.replaceChildren(this.content(column, item.row, text))
            }
          }
          cells.push(cell)
        })
        for (const extra of old.slice(cells.length)) extra.remove()
        for (const cell of cells) if (cell.parentElement !== row) row.append(cell)
      }
      rows.push(row)
    }
    // Rows go in index order, so screen readers read them in the order they're shown.
    place(dom.body, rows, (child) => child.getAttribute("role") === "row")
  }

  private content(column: WebColumn, row: Row, text = display(column, row)): Node {
    if (column.render) {
      const out = column.render(row)
      return typeof out === "string" ? document.createTextNode(out) : out
    }
    if (column.type === "boolean") return h("span", { class: "data-grid-boolean", "data-value": String(!!column.value(row)) }, text)
    return document.createTextNode(text)
  }

  private editor(column: WebColumn) {
    const errorId = uid("grid-error")
    const input = h("input", {
      class: "data-grid-editor",
      "aria-label": column.header,
      "aria-describedby": errorId,
      ...(column.type === "number" ? inputHints("decimal") : {}),
    })
    return h("uiset-data-grid-editor", null, input, h("span", { id: errorId, class: "data-grid-error", hidden: true }))
  }

  /**
   * The editor for a column with `options`: UI SDK's combobox in the cell. Typing narrows the
   * list, the arrows move through it, and Enter or a press chooses, which saves.
   */
  private openOptions(cell: HTMLElement, column: WebColumn, row: Row) {
    const api = this.instance!.api
    const errorId = uid("grid-error")
    const value = editTextOf(column, row)
    const typed = api.typed()
    const input = h("input", { class: "data-grid-editor", "aria-label": column.header, "aria-describedby": errorId }) as HTMLInputElement
    const combobox = h(
      "ui-combobox",
      {
        class: "data-grid-option-editor",
        "default-open": "",
        "auto-highlight": "always",
        "default-value": column.options!.includes(value) ? value : undefined,
      },
      h("ui-combobox-input", null, input),
      h(
        "ui-combobox-content",
        { class: "data-grid-options", "data-grid-control": "", align: "start", "side-offset": "2", hidden: "" },
        h("ui-combobox-empty", null, "No match"),
        h("ui-combobox-list", null, ...column.options!.map((option) => h("ui-combobox-item", { value: option }, option))),
      ),
      h("span", { id: errorId, class: "data-grid-error", hidden: true }),
    ) as HTMLElement & { api: { setQuery: (query: string, options?: { reason: string }) => boolean } }
    type Change<T> = CustomEvent<{ value: T; reason?: string }>
    let highlighted: string | null = null
    combobox.addEventListener("highlight", (event) => {
      highlighted = (event as Change<string | null>).detail.value
    })
    combobox.addEventListener("valuechange", (event) => {
      const chosen = (event as Change<unknown>).detail.value
      if (typeof chosen === "string") api.choose(chosen)
    })
    combobox.addEventListener("openchange", (event) => {
      const { value: open, reason } = (event as Change<boolean>).detail
      if (open) return
      // Escape gives the cell its focus back. A press or focus somewhere else keeps it there.
      if (reason === "escape-key") api.leaveEdit(true)
      else if (reason === "outside-press" || reason === "focus-out") api.leaveEdit(false)
    })
    // Tab saves the highlighted option, as it saves text in the other editors, and focus
    // stays with the cell.
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return
      event.preventDefault()
      if (highlighted === null || !api.choose(highlighted)) api.leaveEdit(true)
    })
    cell.replaceChildren(combobox)
    input.focus({ preventScroll: true })
    // An edit started by typing begins as if that character had been typed here. Otherwise
    // the old value is selected, so typing replaces it. A tick later: the combobox fills its
    // input as its parts connect, which would undo either.
    queueMicrotask(() => {
      if (!combobox.isConnected) return
      if (typed !== null) combobox.api.setQuery(typed, { reason: "input-change" })
      else input.select()
    })
  }

  /* --------------------------------------------------------------- toolbar */

  // The tools are made once and kept up to date, so an open popover or menu stays open and
  // nothing shows a state the grid has left.
  private tools?: ToolParts

  private renderToolbar() {
    const dom = this.dom!
    const on = isOn(this, "toolbar")
    dom.toolbar.style.display = on ? "" : "none"
    if (!on) return
    attr(dom.toolbar, "aria-label", `${this.label} tools`)
    const tools = (this.tools ??= this.buildTools())
    const name = this.label.toLowerCase()
    tools.searchLabel.textContent = `Search ${name}`
    tools.searchInput.placeholder = `Search ${name}…`
    if (tools.searchInput.value !== this.state.query) tools.searchInput.value = this.state.query
    const selecting = this.state.selected.length > 0
    tools.search.style.display = selecting ? "none" : ""
    tools.selection.style.display = selecting ? "" : "none"
    tools.selectionCount.textContent = `${this.count(this.state.selected.length)} selected`

    const columns = this.columnsInfo()
    // Filters: one field per filterable column, kept by column.
    const filterable = columns.filter((c) => c.filterable)
    tools.filters.style.display = filterable.length ? "" : "none"
    tools.filtersTitle.textContent = `Filter ${name}`
    const active = Object.keys(this.state.filters).length
    tools.filtersBadge.style.display = active ? "" : "none"
    tools.filtersCount.data = String(active)
    tools.filtersClear.disabled = !active
    place(
      tools.filterList,
      filterable.map((column) => {
        let field = tools.filterFields.get(column.id)
        if (!field) {
          const id = uid("grid-filter")
          const input = h("input", { id, autocomplete: "off" }) as HTMLInputElement
          input.addEventListener("input", () => this.setFilter(column.id, input.value))
          const label = h("ui-field-label", { for: id })
          tools.filterFields.set(column.id, (field = { root: h("ui-field", null, label, h("ui-input", null, input)), label, input }))
        }
        if (field.label.textContent !== column.header) field.label.textContent = column.header
        const value = this.state.filters[column.id] ?? ""
        if (field.input.value !== value) field.input.value = value
        return field.root
      }),
      () => true,
    )
    // Group by: the select follows the grid's grouping, however it changed.
    const groupable = columns.filter((c) => c.groupable)
    tools.group.style.display = groupable.length ? "" : "none"
    tools.groupLabel.textContent = `Group ${name} by`
    place(
      tools.groupList,
      [{ id: "none", text: "No grouping" }, ...groupable.map((c) => ({ id: c.id, text: `Group by ${c.header}` }))].map(({ id, text }) => {
        let item = tools.groupItems.get(id)
        if (!item) tools.groupItems.set(id, (item = h("ui-select-item", { value: id })))
        if (item.textContent !== text) item.textContent = text
        return item
      }),
      () => true,
    )
    const grouping = this.state.groupBy ?? "none"
    if (tools.group.value !== grouping) tools.group.value = grouping
    // View: which columns show, and the density.
    const shownCount = columns.filter((c) => c.shown).length
    place(
      tools.columnList,
      [
        tools.columnLabel,
        ...columns
          .filter((c) => c.hideable)
          .map((c) => {
            let item = tools.columnItems.get(c.id)
            if (!item) {
              const label = h("span")
              item = h("ui-menu-checkbox-item", { value: c.id }, h("ui-menu-item-indicator", null, iconElement("check")), label) as HTMLElement & { checked?: boolean }
              item.addEventListener("checkedchange", (event) => {
                const shown = !!(event as CustomEvent<{ value: boolean }>).detail.value
                if (shown === !this.view.hidden.has(c.id)) return
                this.setShown(c.id, shown)
              })
              tools.columnItems.set(c.id, item)
            }
            const label = item.lastElementChild!
            if (label.textContent !== c.header) label.textContent = c.header
            if (item.checked !== c.shown) item.checked = c.shown
            attr(item, "disabled", c.shown && shownCount === 1)
            return item
          }),
      ],
      () => true,
    )
    if (tools.density.value !== this.state.density) tools.density.value = this.state.density
    tools.export.style.display = this.hasAttribute("filename") ? "" : "none"
  }

  private buildTools(): ToolParts {
    const dom = this.dom!
    const inputId = uid("grid-search")
    const searchInput = h("input", { id: inputId, type: "search", autocomplete: "off" }) as HTMLInputElement
    searchInput.addEventListener("input", () => this.set("query", searchInput.value))
    const searchLabel = h("ui-field-label", { class: "uiset-visually-hidden", for: inputId })
    // Agents use the grid's own `filter` and `groupBy`, which the search and the group select
    // repeat; their names, which hold the grid's, would make the grid's name find several.
    const search = h("ui-field", { "data-grid-search": "", class: "search-field", "data-agent-hidden": true }, searchLabel, iconElement("search", "search-field-icon"), h("ui-input", null, searchInput))
    const clearSelection = h("button", { type: "button", "data-variant": "ghost" }, "Clear selection")
    clearSelection.addEventListener("click", () => {
      // This bar goes away with the selection, so focus returns to the grid.
      if (this.set("selected", [])) this.focusGrid()
    })
    const selectionCount = h("span", { class: "data-grid-selection-count" })
    const selection = h("div", { class: "data-grid-selection" }, selectionCount, ...this.selectionActions, h("ui-button", null, clearSelection))

    // Filters.
    const filtersCount = document.createTextNode("")
    const filtersBadge = h("span", { class: "data-grid-badge" }, h("span", { class: "uiset-visually-hidden" }, ", "), filtersCount, h("span", { class: "uiset-visually-hidden" }, " on"))
    const filtersClear = h("button", { type: "button", "data-variant": "ghost", "data-filters-clear": "" }, "Clear filters") as HTMLButtonElement
    filtersClear.addEventListener("click", () => this.set("filters", {}))
    const filtersTitle = h("ui-popover-title")
    const filterList = h("div", { class: "data-grid-filter-list" })
    // Agents use the grid's own `filterColumn`, which this repeats; its title, which holds the
    // grid's name, would make the grid's name find two components.
    const filters = h(
      "ui-popover",
      { "data-agent-hidden": true },
      h("ui-popover-trigger", null, h("button", { type: "button", "data-variant": "outline", "data-filters-trigger": "" }, iconElement("filter"), "Filters", filtersBadge)),
      h("ui-popover-content", { class: "data-grid-filters", hidden: true }, filtersTitle, filterList, h("ui-button", null, filtersClear)),
    )

    // Group by.
    const groupLabel = h("ui-select-label", { class: "uiset-visually-hidden" })
    const groupList = h("ui-select-content")
    const group = h(
      "ui-select",
      { "default-value": this.state.groupBy ?? "none", "data-agent-hidden": true },
      groupLabel,
      h("ui-select-trigger", null, h("button", { type: "button", "data-variant": "outline" }, h("ui-select-value"))),
      groupList,
    ) as ToolParts["group"]
    group.addEventListener("valuechange", (event) => {
      const value = (event as CustomEvent<{ value: string | null }>).detail.value
      const next = !value || value === "none" ? null : value
      if (next !== this.state.groupBy) this.set("groupBy", next)
    })

    // View.
    const check = () => h("ui-menu-item-indicator", null, iconElement("check"))
    const density = h(
      "ui-menu-radio-group",
      { "default-value": this.state.density },
      h("ui-menu-group-label", null, "Density"),
      ...(["compact", "standard", "comfortable"] as const).map((d) => h("ui-menu-radio-item", { value: d }, check(), d[0]!.toUpperCase() + d.slice(1))),
    ) as ToolParts["density"]
    density.addEventListener("valuechange", (event) => {
      const value = (event as CustomEvent<{ value: DataGridDensity }>).detail.value
      if (value && value !== this.state.density) this.set("density", value)
    })
    const columnLabel = h("ui-menu-group-label", null, "Columns")
    const columnList = h("ui-menu-group", null, columnLabel)
    const view = h(
      "ui-menu",
      null,
      h("ui-menu-trigger", null, h("button", { type: "button", "data-variant": "outline" }, iconElement("columns"), "View")),
      h("ui-menu-content", { class: "data-grid-menu", align: "end" }, columnList, h("ui-menu-separator"), density),
    )

    // Export.
    const exportButton = h("button", { type: "button", "data-variant": "outline" }, iconElement("download"), "Export CSV")
    exportButton.addEventListener("click", () => this.exportCsv())
    const exportWrap = h("ui-button", null, exportButton)

    dom.toolbar.append(search, selection, h("div", { class: "data-grid-tools" }, filters, group, view, exportWrap))
    return {
      search,
      searchInput,
      searchLabel,
      selection,
      selectionCount,
      filters,
      filtersTitle,
      filtersBadge,
      filtersCount,
      filtersClear,
      filterList,
      filterFields: new Map(),
      group,
      groupLabel,
      groupList,
      groupItems: new Map(),
      columnList,
      columnLabel,
      columnItems: new Map(),
      density,
      export: exportWrap,
    }
  }

  private columnsInfo() {
    return this.view.order.map((id) => {
      const column = this.view.byId.get(id)!
      return {
        id,
        header: column.header,
        shown: !this.view.hidden.has(id),
        hideable: column.hideable !== false,
        filterable: column.filterable !== false && column.type !== "boolean",
        groupable: column.groupable !== false,
      }
    })
  }
}

type MenuParts = {
  menu: HTMLElement & { open?: boolean }
  content: HTMLElement
  group: HTMLElement
  label: HTMLElement
  button: HTMLElement
  items: Map<string, HTMLElement>
}

type HeaderParts = {
  cell: HTMLElement
  label?: HTMLElement
  sort?: HTMLElement
  menu?: MenuParts
  resizer?: HTMLElement
  sortKey?: string
  box?: HTMLInputElement
}

type ToolParts = {
  search: HTMLElement
  searchInput: HTMLInputElement
  searchLabel: HTMLElement
  selection: HTMLElement
  selectionCount: HTMLElement
  filters: HTMLElement
  filtersTitle: HTMLElement
  filtersBadge: HTMLElement
  filtersCount: Text
  filtersClear: HTMLButtonElement
  filterList: HTMLElement
  filterFields: Map<string, { root: HTMLElement; label: HTMLElement; input: HTMLInputElement }>
  group: HTMLElement & { value?: string | null }
  groupLabel: HTMLElement
  groupList: HTMLElement
  groupItems: Map<string, HTMLElement>
  columnList: HTMLElement
  columnLabel: HTMLElement
  columnItems: Map<string, HTMLElement & { checked?: boolean }>
  density: HTMLElement & { value?: string }
  export: HTMLElement
}

function defineDataGrid() {
  // The table owns the primitive; its options come from the grid around it.
  createParts(dataGrid, {
    root: {
      tag: "uiset-data-grid-table",
      properties: ["gridOptions"],
      options: (el) => {
        const grid = el.closest("uiset-data-grid") as UISetDataGrid | null
        if (!grid) return {}
        const { _byId, ...options } = grid.options() as ReturnType<UISetDataGrid["options"]>
        void _byId
        return options
      },
      render: (el, instance) => (el.closest("uiset-data-grid") as UISetDataGrid | null)?.attach(instance as unknown as GridInstance),
    },
    cell: "uiset-data-grid-cell",
    editor: { tag: "uiset-data-grid-editor", target: (el) => el.querySelector("input"), display: "contents" },
  })
  defineElement("uiset-data-grid", UISetDataGrid)
}

export { defineDataGrid, UISetDataGrid }
export type { UISetDataGridEvents, WebColumn }
