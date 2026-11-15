// The grid's columns and cells, framework-free: what a column can say about itself, how a
// cell reads and how an edit is parsed. The React DataGrid and the web element share them.
import { parseDate } from "@ui-sdk/core/date"
import { parseNumber } from "@ui-sdk/core/number"
import { textOf, type CellValue, type SortRule, type ViewColumn } from "./view"

type GridColumnSpec<Row> = ViewColumn<Row> & {
  /** Sets how an edit is read and how the cell lines up. Defaults to text. */
  type?: "text" | "number" | "date" | "boolean"
  /** The values an edit may take. The editor suggests them and refuses others. */
  options?: readonly string[]
  width?: number
  minWidth?: number
  align?: "start" | "center" | "end"
  sortable?: boolean
  filterable?: boolean
  groupable?: boolean
  editable?: boolean
  pinned?: boolean
  hidden?: boolean
  hideable?: boolean
}

type DataGridDensity = "compact" | "standard" | "comfortable"

type DataGridColumnState = {
  order: string[]
  widths: Record<string, number>
  hidden: string[]
  pinned: string[]
}

type DataGridEdit<Row> = {
  row: Row
  rowId: string
  column: string
  value: CellValue
  text: string
}

const HEADER_HEIGHT = 40
const SELECT_WIDTH = 44
const RESIZE_STEP = 16
const ROW_HEIGHTS: Record<DataGridDensity, number> = {
  compact: 32,
  standard: 40,
  comfortable: 48,
}

function display<Row>(column: GridColumnSpec<Row>, row: Row) {
  if (column.text) return column.text(row)
  if (column.type === "boolean") return column.value(row) ? "Yes" : "No"
  return textOf(column, row)
}

// Dates are calendar days: a Date is read and written as its UTC day, which is what
// `new Date("2026-11-20")` and most JSON dates mean.
const isoDay = (value: CellValue) => (value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : "")

/** The text an edit starts from: numbers and dates without their formatting. */
function editTextOf<Row>(column: GridColumnSpec<Row>, row: Row) {
  const value = column.value(row)
  if (column.type === "number") return value === null || value === undefined ? "" : String(value)
  if (column.type === "date") return isoDay(value)
  return display(column, row)
}

function parse<Row>(column: GridColumnSpec<Row>, text: string, locale?: string): { value: CellValue } | { error: string } {
  const trimmed = text.trim()
  if (column.type === "number") {
    if (!trimmed) return { value: null }
    // A currency sign around the number is fine ("$1,234.50" pastes back); words are not.
    const number = parseNumber(trimmed.replace(/^[\p{Sc}\s]+|[\p{Sc}\s]+$/gu, ""), locale)
    return number === null ? { error: `${column.header} needs a number` } : { value: number }
  }
  if (column.type === "date") {
    if (!trimmed) return { value: null }
    const iso = parseDate(trimmed, locale)
    return iso ? { value: new Date(`${iso}T00:00:00Z`) } : { error: `${column.header} needs a date, like 2026-11-15` }
  }
  if (column.type === "boolean") {
    if (/^(yes|true|1|on)$/i.test(trimmed)) return { value: true }
    if (/^(no|false|0|off|)$/i.test(trimmed)) return { value: false }
    return { error: `${column.header} needs yes or no` }
  }
  if (column.options) {
    const match = column.options.find((option) => option.toLowerCase() === trimmed.toLowerCase())
    return match !== undefined ? { value: match } : { error: `${column.header} must be one of ${column.options.join(", ")}` }
  }
  return { value: text }
}

function sortMessage<Row>(sort: readonly SortRule[], columns: readonly GridColumnSpec<Row>[]) {
  if (!sort.length) return "Sorting cleared"
  const parts = sort.map((rule) => {
    const header = columns.find((c) => c.id === rule.column)?.header ?? rule.column
    return `${header} ${rule.direction}`
  })
  return `Sorted by ${parts.join(", then ")}`
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = name.endsWith(".csv") ? name : `${name}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export { display, download, editTextOf, HEADER_HEIGHT, isoDay, parse, RESIZE_STEP, ROW_HEIGHTS, SELECT_WIDTH, sortMessage }
export type { DataGridColumnState, DataGridDensity, DataGridEdit, GridColumnSpec }
