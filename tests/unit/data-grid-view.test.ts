import { expect, test } from "vitest"
import {
  filterRows,
  groupRows,
  nextSort,
  sortRows,
  toCsv,
} from "@/registry/uiset/ui/data-grid/view"

type Row = { id: string; name: string; plan: string; seats: number | null; joined: Date }
const rows: Row[] = [
  { id: "1", name: "Ada", plan: "Pro", seats: 12, joined: new Date("2024-03-01") },
  { id: "2", name: "grace", plan: "Team", seats: 2, joined: new Date("2023-01-10") },
  { id: "3", name: "Linus", plan: "Pro", seats: null, joined: new Date("2025-07-04") },
  { id: "4", name: "Item 10", plan: "Hobby", seats: 30, joined: new Date("2022-05-05") },
  { id: "5", name: "Item 9", plan: "Team", seats: 2, joined: new Date("2021-02-02") },
]
const columns = [
  { id: "name", header: "Name", value: (r: Row) => r.name },
  { id: "plan", header: "Plan", value: (r: Row) => r.plan },
  { id: "seats", header: "Seats", value: (r: Row) => r.seats },
  { id: "joined", header: "Joined", value: (r: Row) => r.joined },
]
const ids = (list: Row[]) => list.map((r) => r.id)

test("every word must match somewhere in the row, case-insensitively", () => {
  expect(ids(filterRows(rows, columns, "pro ada"))).toEqual(["1"])
  expect(ids(filterRows(rows, columns, "GRACE"))).toEqual(["2"])
  expect(ids(filterRows(rows, columns, "  "))).toEqual(["1", "2", "3", "4", "5"])
})

test("column filters narrow by their own column", () => {
  expect(ids(filterRows(rows, columns, "", { plan: "team" }))).toEqual(["2", "5"])
  expect(ids(filterRows(rows, columns, "item", { plan: "team" }))).toEqual(["5"])
})

test("sorting is natural, stable, and keeps empty values last both ways", () => {
  expect(
    ids(sortRows(rows, columns, [{ column: "name", direction: "ascending" }])),
  ).toEqual(["1", "2", "5", "4", "3"])
  expect(
    ids(sortRows(rows, columns, [{ column: "seats", direction: "ascending" }])),
  ).toEqual(["2", "5", "1", "4", "3"])
  expect(
    ids(sortRows(rows, columns, [{ column: "seats", direction: "descending" }])),
  ).toEqual(["4", "1", "2", "5", "3"])
  expect(
    ids(sortRows(rows, columns, [{ column: "joined", direction: "ascending" }])),
  ).toEqual(["5", "4", "2", "1", "3"])
})

test("multi-column sort breaks ties with the next rule", () => {
  expect(
    ids(
      sortRows(rows, columns, [
        { column: "plan", direction: "ascending" },
        { column: "seats", direction: "descending" },
      ]),
    ),
  ).toEqual(["4", "1", "3", "2", "5"])
})

test("clicking a header cycles ascending, descending, off; Shift adds a rule", () => {
  let sort = nextSort([], "name", false)
  expect(sort).toEqual([{ column: "name", direction: "ascending" }])
  sort = nextSort(sort, "name", false)
  expect(sort).toEqual([{ column: "name", direction: "descending" }])
  expect(nextSort(sort, "name", false)).toEqual([])
  expect(nextSort(sort, "plan", true)).toEqual([
    { column: "name", direction: "descending" },
    { column: "plan", direction: "ascending" },
  ])
  expect(nextSort(sort, "plan", false)).toEqual([
    { column: "plan", direction: "ascending" },
  ])
})

test("grouping makes a header per value and hides collapsed groups' rows", () => {
  const items = groupRows(rows, (r) => r.id, columns[1]!, new Set(["Team"]))
  expect(
    items.map((i) =>
      i.kind === "group" ? `[${i.key} ${i.count}${i.expanded ? "" : " closed"}]` : i.id,
    ),
  ).toEqual(["[Pro 2]", "1", "3", "[Team 2 closed]", "[Hobby 1]", "4"])
})

test("CSV escapes quotes and commas, and defuses formulas in text but not numbers", () => {
  const evil = [
    {
      id: "x",
      name: '=HYPERLINK("http://bad")',
      plan: 'Pro, "annual"',
      seats: -5,
      joined: new Date("2024-01-01"),
    },
  ]
  const file = toCsv(evil, columns)
  // A byte order mark first, so spreadsheet apps read the file as UTF-8.
  expect(file.startsWith("\uFEFF")).toBe(true)
  const csv = file.slice(1)
  expect(csv.split("\r\n")[0]).toBe("Name,Plan,Seats,Joined")
  expect(csv.split("\r\n")[1]).toBe(
    `"'=HYPERLINK(""http://bad"")","Pro, ""annual""",-5,2024-01-01`,
  )
})
