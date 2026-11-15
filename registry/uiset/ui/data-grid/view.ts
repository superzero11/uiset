// Framework-free data logic for the grid: filter, sort, group, export.

type CellValue = string | number | boolean | Date | null | undefined
type SortDirection = "ascending" | "descending"
type SortRule = { column: string; direction: SortDirection }

type ViewColumn<Row> = {
  id: string
  header: string
  value: (row: Row) => CellValue
  text?: (row: Row) => string
}

type ViewItem<Row> =
  | { kind: "row"; row: Row; id: string }
  | { kind: "group"; key: string; label: string; count: number; expanded: boolean }

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

function textOf<Row>(column: ViewColumn<Row>, row: Row): string {
  if (column.text) return column.text(row)
  const value = column.value(row)
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

function compare(a: CellValue, b: CellValue) {
  const empty = (v: CellValue) => v === null || v === undefined || v === ""
  if (empty(a) && empty(b)) return 0
  if (empty(a)) return 1
  if (empty(b)) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b)
  return collator.compare(String(a), String(b))
}

// Every word in the query must appear somewhere in the row; column filters must each match.
// `textsOf` can supply each row's lowercased column texts from a cache, in column order.
function filterRows<Row>(
  rows: readonly Row[],
  columns: readonly ViewColumn<Row>[],
  query = "",
  columnFilters: Record<string, string> = {},
  textsOf: (row: Row) => readonly string[] = (row) =>
    columns.map((column) => textOf(column, row).toLowerCase()),
): Row[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const filters = Object.entries(columnFilters)
    .filter(([, value]) => value.trim())
    .map(([id, value]) => [columns.findIndex((c) => c.id === id), value.trim().toLowerCase()] as const)
    .filter(([index]) => index >= 0)
  if (!words.length && !filters.length) return [...rows]
  return rows.filter((row) => {
    const texts = textsOf(row)
    if (!words.every((word) => texts.some((text) => text.includes(word)))) return false
    return filters.every(([index, value]) => texts[index]!.includes(value))
  })
}

// Stable: rows that compare equal keep their order. Empty values sort last both ways.
function sortRows<Row>(
  rows: readonly Row[],
  columns: readonly ViewColumn<Row>[],
  sort: readonly SortRule[],
): Row[] {
  const rules = sort
    .map((rule) => ({ rule, column: columns.find((c) => c.id === rule.column) }))
    .filter((r): r is { rule: SortRule; column: ViewColumn<Row> } => !!r.column)
  if (!rules.length) return [...rows]
  return rows
    .map((row, index) => ({ row, index }))
    .sort((x, y) => {
      for (const { rule, column } of rules) {
        const a = column.value(x.row)
        const b = column.value(y.row)
        const emptyA = a === null || a === undefined || a === ""
        const emptyB = b === null || b === undefined || b === ""
        if (emptyA !== emptyB) return emptyA ? 1 : -1
        const result = compare(a, b)
        if (result !== 0) return rule.direction === "ascending" ? result : -result
      }
      return x.index - y.index
    })
    .map(({ row }) => row)
}

function groupRows<Row>(
  rows: readonly Row[],
  getId: (row: Row) => string,
  column: ViewColumn<Row> | null,
  collapsed: ReadonlySet<string> = new Set(),
): ViewItem<Row>[] {
  if (!column) return rows.map((row) => ({ kind: "row", row, id: getId(row) }))
  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const key = textOf(column, row) || "(empty)"
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const items: ViewItem<Row>[] = []
  for (const [key, list] of groups) {
    const expanded = !collapsed.has(key)
    items.push({
      kind: "group",
      key,
      label: `${column.header}: ${key}`,
      count: list.length,
      expanded,
    })
    if (expanded) for (const row of list) items.push({ kind: "row", row, id: getId(row) })
  }
  return items
}

function escapeCsv(text: string, numeric = false) {
  // Text starting with = + - @ (or a tab or return) runs as a formula when opened in a
  // spreadsheet, so prefix it. Real numbers can't be formulas and stay as they are.
  const safe = !numeric && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

// Starts with a byte order mark, so spreadsheet apps read it as UTF-8.
function toCsv<Row>(rows: readonly Row[], columns: readonly ViewColumn<Row>[]) {
  const lines = [columns.map((c) => escapeCsv(c.header)).join(",")]
  for (const row of rows) {
    lines.push(
      columns
        .map((c) => escapeCsv(textOf(c, row), typeof c.value(row) === "number"))
        .join(","),
    )
  }
  return `\uFEFF${lines.join("\r\n")}`
}

function nextSort(
  sort: readonly SortRule[],
  column: string,
  additive: boolean,
): SortRule[] {
  const current = sort.find((rule) => rule.column === column)
  const direction: SortDirection | null = !current
    ? "ascending"
    : current.direction === "ascending"
      ? "descending"
      : null
  const others = additive ? sort.filter((rule) => rule.column !== column) : []
  return direction ? [...others, { column, direction }] : others
}

export { compare, filterRows, groupRows, nextSort, sortRows, textOf, toCsv }
export type { CellValue, SortDirection, SortRule, ViewColumn, ViewItem }
