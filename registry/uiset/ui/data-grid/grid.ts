import {
  byCell,
  byCellRange,
  createCellRange,
  createGridFocus,
  createInlineEdit,
  definePrimitive,
  selects,
  textToCells,
  type CellRange,
  type GridCell,
} from "@ui-sdk/core"

// The data grid's behavior. Row 0 holds the column headers; the React layer maps the
// other rows to data rows or group rows. Keys, focus, ranges, editing and the clipboard
// come from UI SDK behaviors; this file wires them together and names the agent actions.

type SortDirection = "ascending" | "descending"

type Commands = {
  sortBy?: (column: string, direction?: SortDirection | "none") => boolean
  filter?: (text: string) => boolean
  filterColumn?: (column: string, text: string) => boolean
  selectRows?: (ids: string[]) => boolean
  clearSelection?: () => boolean
  editCell?: (rowId: string, column: string, value: string) => boolean
  groupBy?: (column: string | null) => boolean
  showColumn?: (column: string, shown: boolean) => boolean
}

type GridOptions = {
  rowCount: number
  colCount: number
  /** How far Page Up and Page Down move: a number, or a function read at the key press. */
  pageSize?: number | (() => number)
  /** Rows holding one cell that spans every column, like group headers. Focus stays in column 0. */
  spanRows?: readonly number[]
  /** The text a cell shows, for copying and for starting an edit. */
  cellText?: (cell: GridCell) => string
  /** The text an edit starts from, like a number without its formatting. Defaults to `cellText`. */
  editText?: (cell: GridCell) => string
  editable?: (cell: GridCell) => boolean
  onCellEdit?: (cell: GridCell, text: string) => boolean
  /** Enter or Space on a cell that isn't edited in place, and Shift+Enter on a header. */
  onActivate?: (cell: GridCell, event: KeyboardEvent) => void
  /** Keys the grid adds on top of navigation, like resizing a column. Return true when handled. */
  onCellKey?: (cell: GridCell, event: KeyboardEvent, el: HTMLElement) => boolean
  onPaste?: (start: GridCell, rows: string[][]) => void
  /** Brings a row that isn't rendered into view, like `virtualizer.scrollToIndex`. */
  reveal?: (cell: GridCell) => void
  /** The rows as data, for agents, including rows that aren't rendered. */
  items?: () => unknown[]
  /** What the grid shows now (sort, filter, grouping, selection), for agents. */
  view?: object
  commands?: Commands
}

/**
 * Agents read items as `{ value, label }` and drop other fields, so a row as a person
 * reads it goes in the label: its first field, then the rest, like "Jan (Revenue: $12k)".
 */
const asItems = (rows: unknown[], valueKey?: string) =>
  rows.map((row, index) => {
    if (!row || typeof row !== "object") return { value: String(row), label: String(row) }
    const record = row as Record<string, unknown>
    const entries = Object.entries(record).filter(([key]) => key !== valueKey)
    const [first, ...rest] = entries
    const head = first ? String(first[1]) : ""
    const label = rest.length ? `${head} (${rest.map(([key, value]) => `${key}: ${value}`).join(", ")})` : head
    return { value: valueKey && valueKey in record ? String(record[valueKey]) : head || String(index), label }
  })

const none: readonly number[] = []
const at = ({ row, col }: GridCell): GridCell => ({ row, col })
const idOf = (cell: GridCell) => `${cell.row}:${cell.col}`
const cellOf = (id: string): GridCell => {
  const [row, col] = id.split(":").map(Number)
  return { row: row ?? 0, col: col ?? 0 }
}
// Keys that bubble from an editor or a checkbox inside the cell belong to that control.
// Compare with the cell itself: a delegated event's currentTarget is the document root.
const fromInside = (event: Event, el: HTMLElement | undefined) => !!el && event.target !== el
// Presses on controls inside a cell, like an editor or a column's resize handle, aren't range drags.
const onControl = (event: Event) =>
  !!(event.target as Element).closest?.(
    "input:not([type=checkbox]), select, textarea, [data-grid-handle]",
  )
// A row checkbox is the cell's own control: a press there makes its cell active, but isn't a
// range drag either, which would capture the pointer and take the checkbox's click.
const onCheckbox = (event: Event) => !!(event.target as Element).closest?.("input[type=checkbox]")
// Keys that start an edit in a cell (createInlineEdit's): Enter, F2, or typing.
const startsEdit = (event: KeyboardEvent) =>
  !event.ctrlKey &&
  !event.metaKey &&
  !event.altKey &&
  (event.key === "Enter" || event.key === "F2" || (event.key.length === 1 && event.key !== " "))

const dataGrid = definePrimitive({
  name: "data-grid",
  options: {
    rowCount: "number",
    colCount: "number",
    pageSize: "value",
    spanRows: "value",
    cellText: "value",
    editText: "value",
    editable: "value",
    onCellEdit: "action",
    onActivate: "callback",
    onCellKey: "action",
    onPaste: "callback",
    reveal: "value",
    items: "value",
    view: "value",
    commands: "value",
  },
  state: (options: GridOptions) => ({
    rowCount: options.rowCount,
    colCount: options.colCount,
    view: options.view ?? {},
    spanRows: options.spanRows ?? none,
    active: null as GridCell | null,
    range: null as CellRange | null,
    editing: null as string | null,
  }),
  sync: (options) => ({
    rowCount: options.rowCount,
    colCount: options.colCount,
    view: options.view ?? {},
    spanRows: options.spanRows ?? none,
  }),
  api: (context) => {
    const opts = () => context.options()
    const grid = createGridFocus(context, {
      key: "active",
      rows: () => context.store.get().rowCount,
      cols: () => context.store.get().colCount,
      pageSize: () => {
        const size = opts().pageSize
        return typeof size === "function" ? size() : (size ?? 10)
      },
      disabled: (cell) => cell.col > 0 && context.store.get().spanRows.includes(cell.row),
      reveal: (cell) => opts().reveal?.(cell),
    })
    const range = createCellRange(context, {
      key: "range",
      grid,
      rows: () => context.store.get().rowCount,
      cols: () => context.store.get().colCount,
      reveal: (cell) => opts().reveal?.(cell),
    })
    const edit = createInlineEdit(context, {
      key: "editing",
      value: (id) => {
        const cell = cellOf(id)
        return opts().editText?.(cell) ?? opts().cellText?.(cell) ?? ""
      },
      commit: (id, text) => opts().onCellEdit?.(cellOf(id), text) ?? false,
      disabled: (id) => !(opts().editable?.(cellOf(id)) ?? false),
    })
    // An edit left open because its text didn't fit (focus moved away) gives way when
    // another cell starts one, rather than blocking every other edit.
    const dropStale = (cell: GridCell) => {
      const editing = context.store.get().editing
      if (editing && editing !== idOf(cell) && (opts().editable?.(cell) ?? false)) edit.cancel()
    }

    // Rows and columns come and go (a search, a hidden column): the active cell moves to the
    // nearest one still there, so the grid keeps its tab stop. Focus follows only if it was
    // in the grid.
    context.onOptions((options) => {
      const { active } = context.store.get()
      if (!active || options.rowCount < 1 || options.colCount < 1) return
      const row = Math.min(active.row, options.rowCount - 1)
      let col = Math.min(active.col, options.colCount - 1)
      if (col > 0 && (options.spanRows ?? none).includes(row)) col = 0
      if (row === active.row && col === active.col) return
      const el = context.element("cell", idOf(active))
      const focused = !!el && el.contains(el.ownerDocument.activeElement)
      if (focused) queueMicrotask(() => grid.focus({ row, col }, { reason: "imperative" }))
      else context.store.set({ active: { row, col } })
    })

    // Commands throw an Error that says why a step can't run, which agents read.
    const command = <K extends keyof Commands>(name: K) => {
      const run = opts().commands?.[name]
      if (!run) throw new Error(`This grid doesn't support ${name}.`)
      return run as NonNullable<Commands[K]>
    }

    return {
      grid,
      range,
      edit,
      idOf,
      items: () => asItems(opts().items?.() ?? [], "id"),
      keydown(event: KeyboardEvent, cell: GridCell, el?: HTMLElement) {
        if (fromInside(event, el)) return
        if (el && opts().onCellKey?.(cell, event, el)) {
          event.preventDefault()
          return
        }
        if (startsEdit(event)) dropStale(cell)
        if (edit.keydown(event, idOf(cell))) return
        const modified = event.ctrlKey || event.metaKey || event.altKey
        const activates =
          !modified &&
          ((!event.shiftKey && (event.key === "Enter" || event.key === " ")) ||
            (event.shiftKey && event.key === "Enter" && cell.row === 0))
        if (activates) {
          event.preventDefault()
          opts().onActivate?.(cell, event)
          return
        }
        range.keydown(event)
      },
      pointerdown(event: PointerEvent, cell: GridCell) {
        if (onCheckbox(event)) return grid.focus(cell, { reason: "item-press", event })
        if (onControl(event)) return
        range.pointerdown(event, cell)
      },
      dblclick(event: MouseEvent, cell: GridCell) {
        if (onControl(event) || onCheckbox(event)) return
        dropStale(cell)
        edit.dblclick(event, idOf(cell))
      },
      copy(event: ClipboardEvent) {
        const state = context.store.get()
        if (state.editing || !range.bounds(state)) return
        const text = range.text(state, (cell) => opts().cellText?.(cell) ?? "")
        event.preventDefault()
        event.clipboardData?.setData("text/plain", text)
      },
      paste(event: ClipboardEvent) {
        const state = context.store.get()
        const bounds = range.bounds(state)
        if (state.editing || !bounds) return
        event.preventDefault()
        const rows = textToCells(event.clipboardData?.getData("text/plain") ?? "")
        opts().onPaste?.({ row: bounds.top, col: bounds.left }, rows)
      },
      sortBy: (column: string, direction?: SortDirection | "none") =>
        command("sortBy")(column, direction),
      filter: (text: string) => command("filter")(text),
      filterColumn: (column: string, text: string) => command("filterColumn")(column, text),
      selectRows: (ids: string[]) => command("selectRows")(ids),
      clearSelection: () => command("clearSelection")(),
      editCell: (rowId: string, column: string, value: string) =>
        command("editCell")(rowId, column, value),
      groupBy: (column: string | null) => command("groupBy")(column),
      showColumn: (column: string, shown: boolean) => command("showColumn")(column, shown),
    }
  },
  slots: (slot) => ({
    root: slot({
      role: "grid",
      keys: { none: "Each cell handles its own keys." },
      attrs: (state) => ({
        "aria-rowcount": String(state.rowCount),
        "aria-colcount": String(state.colCount),
        "aria-multiselectable": "true",
      }),
      on: {
        copy: (event, { api }) => api.copy(event as ClipboardEvent),
        paste: (event, { api }) => api.paste(event as ClipboardEvent),
      },
    }),
    // `value` ("row:col") keys each cell, so every part keeps its own props.
    cell: slot<{ row: number; col: number; value: string }, { active: boolean; editing: boolean }>({
      props: { row: "number", col: "number", value: "string" },
      role: (_state, { props }) => (props.row === 0 ? "columnheader" : "gridcell"),
      roles: ["columnheader", "gridcell"],
      focus: "roving",
      keys: [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Enter",
        " ",
        "F2",
        "Escape",
        "ContextMenu",
        "typeahead",
      ],
      selects: selects({ active: byCell, range: byCellRange }),
      state: (state, { props, api }) => ({
        active: api.grid.isActive(state, props),
        editing: state.editing === api.idOf(props),
      }),
      attrs: (state, { props, api }) => ({
        tabindex: api.grid.tabIndex(state, props),
        "aria-colindex": String(props.col + 1),
        "data-active": api.grid.isActive(state, props) ? "" : undefined,
        "data-editing": state.editing === api.idOf(props) ? "" : undefined,
        ...api.range.cellAttrs(state, props),
      }),
      on: {
        keydown: (event, { api, props, el }) => api.keydown(event as KeyboardEvent, at(props), el),
        pointerdown: (event, { api, props }) => api.pointerdown(event as PointerEvent, at(props)),
        dblclick: (event, { api, props }) => api.dblclick(event as MouseEvent, at(props)),
      },
      bind: (el, { api, props }) => api.range.bind(el, at(props)),
    }),
    editor: slot({
      on: {
        keydown: (event, { api }) => api.edit.inputKeydown(event as KeyboardEvent),
        focusout: (event, { api }) => api.edit.end("focus-out", event),
      },
      bind: (el, { api }) => api.edit.bindInput(el as HTMLInputElement),
    }),
  }),
  agent: {
    actions: [
      "sortBy",
      "filter",
      "filterColumn",
      "selectRows",
      "clearSelection",
      "editCell",
      "groupBy",
      "showColumn",
    ],
    items: (api) => api.items(),
  },
})

export { dataGrid, idOf as gridCellId }
export type { Commands as DataGridCommands, GridOptions as DataGridOptions, SortDirection }
