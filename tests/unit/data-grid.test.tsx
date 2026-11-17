import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { checkServer, mount } from "@ui-sdk/core/testing"
import type { GridCell } from "@ui-sdk/core"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { DataGrid, type DataGridColumn } from "@/registry/uiset/ui/data-grid"
import { dataGrid } from "@/registry/uiset/ui/data-grid/grid"

// A 3 × 3 grid: a header row, a data row and a group row whose other columns are blocked.
const texts = [
  ["Name", "Team", "Score"],
  ["Ada", "Blue", "36"],
  ["Team: Red", "", ""],
]
const markup = `<root aria-label="Scores">
  ${texts.map((row, r) => row.map((_, c) => `<cell row="${r}" col="${c}" value="${r}:${c}">${texts[r]![c]}</cell>`).join("")).join("\n")}
</root>`

function setup(extra: Record<string, unknown> = {}) {
  const onActivate = vi.fn()
  const onCellEdit = vi.fn(() => true)
  const onPaste = vi.fn()
  const view = mount(
    dataGrid,
    {
      rowCount: 3,
      colCount: 3,
      cellText: ({ row, col }: GridCell) => texts[row]![col]!,
      editable: ({ row, col }: GridCell) => row === 1 && col === 0,
      spanRows: [2],
      onActivate,
      onCellEdit,
      onPaste,
      ...extra,
    },
    markup,
  )
  const cell = (row: number, col: number) =>
    view.root.querySelectorAll<HTMLElement>("[aria-colindex]")[row * 3 + col]!
  return { view, cell, onActivate, onCellEdit, onPaste }
}

test("row 0 is the header row, and arrows move one cell at a time", async () => {
  const { view, cell } = setup()
  try {
    expect(view.root.getAttribute("role")).toBe("grid")
    expect(view.root.getAttribute("aria-rowcount")).toBe("3")
    expect(cell(0, 1).getAttribute("role")).toBe("columnheader")
    expect(cell(1, 1).getAttribute("role")).toBe("gridcell")
    expect(cell(1, 2).getAttribute("aria-colindex")).toBe("3")

    cell(0, 0).focus()
    await view.keys("ArrowDown")
    await view.keys("ArrowRight")
    expect(view.state.active).toEqual({ row: 1, col: 1 })
    expect(cell(1, 1).getAttribute("tabindex")).toBe("0")
    expect(cell(0, 0).getAttribute("tabindex")).toBe("-1")
  } finally {
    view.unmount()
  }
})

test("focus skips blocked cells, like the columns a group row spans", async () => {
  const { view, cell } = setup()
  try {
    cell(1, 2).focus()
    await view.click(cell(1, 2))
    await view.keys("ArrowDown")
    expect(view.state.active).not.toEqual({ row: 2, col: 2 })
    cell(1, 0).focus()
    await view.click(cell(1, 0))
    await view.keys("ArrowDown")
    expect(view.state.active).toEqual({ row: 2, col: 0 })
  } finally {
    view.unmount()
  }
})

test("Enter sorts from a header, Shift+Enter adds to the sort, and activates other cells", async () => {
  const { view, cell, onActivate } = setup()
  try {
    cell(0, 1).focus()
    await view.click(cell(0, 1))
    await view.keys("Enter")
    expect(onActivate).toHaveBeenLastCalledWith({ row: 0, col: 1 }, expect.anything())
    await view.keys("Shift+Enter")
    expect(onActivate.mock.lastCall![1].shiftKey).toBe(true)

    cell(1, 1).focus()
    await view.click(cell(1, 1))
    await view.keys("Space")
    expect(onActivate).toHaveBeenLastCalledWith({ row: 1, col: 1 }, expect.anything())
    expect(onActivate).toHaveBeenCalledTimes(3)
  } finally {
    view.unmount()
  }
})

test("Enter on an editable cell edits it instead of activating it", async () => {
  const { view, cell, onActivate } = setup()
  try {
    cell(1, 0).focus()
    await view.click(cell(1, 0))
    await view.keys("Enter")
    expect(view.state.editing).toBe("1:0")
    expect(onActivate).not.toHaveBeenCalled()
    view.api.edit.cancel()
    expect(view.state.editing).toBeNull()
  } finally {
    view.unmount()
  }
})

test("an editor of its own, like a list, saves through choose and hands focus back", async () => {
  const { view, cell, onCellEdit } = setup()
  try {
    cell(1, 0).focus()
    await view.click(cell(1, 0))
    // Enter starts with no typed character; a letter starts with that letter.
    await view.keys("Enter")
    expect(view.state.editing).toBe("1:0")
    expect(view.api.typed()).toBeNull()
    // The same value as before saves nothing, and still ends the edit.
    expect(view.api.choose("Ada")).toBe(true)
    expect(onCellEdit).not.toHaveBeenCalled()
    expect(view.state.editing).toBeNull()
    expect(document.activeElement).toBe(cell(1, 0))

    await view.keys("g")
    expect(view.state.editing).toBe("1:0")
    expect(view.api.typed()).toBe("g")
    // The editor has focus while it's open, as a list's field does.
    const field = document.createElement("input")
    cell(1, 0).append(field)
    field.focus()
    expect(view.api.choose("Grace")).toBe(true)
    expect(onCellEdit).toHaveBeenCalledWith({ row: 1, col: 0 }, "Grace")
    expect(view.state.editing).toBeNull()
    expect(document.activeElement).toBe(cell(1, 0))
    field.remove()
    // Nothing is being edited now, so there is nothing to choose for.
    expect(view.api.choose("Linus")).toBe(false)
    expect(onCellEdit).toHaveBeenCalledTimes(1)
  } finally {
    view.unmount()
  }
})

test("a refused choice keeps the edit open, and leaving it saves nothing", async () => {
  const onCellEdit = vi.fn(() => false)
  const { view, cell } = setup({ onCellEdit })
  try {
    cell(1, 0).focus()
    await view.click(cell(1, 0))
    await view.keys("F2")
    expect(view.api.choose("Grace")).toBe(false)
    expect(view.state.editing).toBe("1:0")

    const other = document.createElement("button")
    document.body.append(other)
    other.focus()
    // A press somewhere else leaves focus where it went; Escape brings it back to the cell.
    view.api.leaveEdit(false)
    expect(view.state.editing).toBeNull()
    expect(document.activeElement).toBe(other)
    other.remove()

    cell(1, 0).focus()
    await view.keys("F2")
    view.api.leaveEdit(true)
    expect(view.state.editing).toBeNull()
    expect(document.activeElement).toBe(cell(1, 0))
    expect(onCellEdit).toHaveBeenCalledTimes(1)
  } finally {
    view.unmount()
  }
})

test("a press inside a cell's own popup is not the start of a range drag", async () => {
  const { view, cell } = setup()
  try {
    cell(1, 1).focus()
    await view.click(cell(1, 1))
    const popup = document.createElement("div")
    popup.setAttribute("data-grid-control", "")
    const option = document.createElement("span")
    popup.append(option)
    cell(1, 2).append(popup)
    fireEvent.pointerDown(option, { button: 0 })
    expect(view.state.active).toEqual({ row: 1, col: 1 })
  } finally {
    view.unmount()
  }
})

test("keys from a control inside a cell stay with that control", async () => {
  const { view, cell } = setup()
  try {
    cell(1, 1).focus()
    await view.click(cell(1, 1))
    const input = document.createElement("input")
    cell(1, 1).append(input)
    input.focus()
    fireEvent.keyDown(input, { key: "ArrowRight" })
    expect(view.state.active).toEqual({ row: 1, col: 1 })
  } finally {
    view.unmount()
  }
})

test("extra keys reach onCellKey first, which can claim them", async () => {
  const onCellKey = vi.fn((_cell: GridCell, event: KeyboardEvent, _el: HTMLElement) => event.altKey)
  const { view, cell } = setup({ onCellKey })
  try {
    cell(0, 1).focus()
    await view.click(cell(0, 1))
    await view.keys("Alt+ArrowRight")
    expect(onCellKey).toHaveBeenCalled()
    expect(onCellKey.mock.lastCall![2]).toBe(cell(0, 1))
    expect(view.state.active).toEqual({ row: 0, col: 1 })
    await view.keys("ArrowRight")
    expect(view.state.active).toEqual({ row: 0, col: 2 })
  } finally {
    view.unmount()
  }
})

test("copy writes the range as tab-separated text, and paste hands rows to onPaste", async () => {
  const { view, onPaste } = setup()
  try {
    view.api.range.select({ anchor: { row: 0, col: 0 }, end: { row: 1, col: 1 } })
    const data: Record<string, string> = {}
    const copy = {
      preventDefault: vi.fn(),
      clipboardData: { setData: (type: string, text: string) => (data[type] = text) },
    }
    view.api.copy(copy as unknown as ClipboardEvent)
    expect(copy.preventDefault).toHaveBeenCalled()
    expect(data["text/plain"]).toBe("Name\tTeam\nAda\tBlue")

    view.api.range.select({ anchor: { row: 1, col: 1 }, end: { row: 1, col: 1 } })
    view.api.paste({
      preventDefault: () => {},
      clipboardData: { getData: () => "Green\t40\nRed\t12" },
    } as unknown as ClipboardEvent)
    expect(onPaste).toHaveBeenCalledWith({ row: 1, col: 1 }, [
      ["Green", "40"],
      ["Red", "12"],
    ])
  } finally {
    view.unmount()
  }
})

test("renders on the server", () => {
  checkServer(dataGrid, { rowCount: 3, colCount: 3 }, markup)
})

// The React grid

type Person = {
  id: string
  name: string
  team: string
  score: number
  active: boolean
  joined: Date
}

const people: Person[] = [
  { id: "p1", name: "Ada", team: "Blue", score: 36, active: true, joined: new Date("2026-01-05") },
  { id: "p2", name: "Grace", team: "Red", score: 45, active: false, joined: new Date("2026-02-10") },
  { id: "p3", name: "Linus", team: "Blue", score: 12, active: true, joined: new Date("2026-03-15") },
]

const columns: DataGridColumn<Person>[] = [
  { id: "name", header: "Name", value: (p) => p.name, editable: true },
  { id: "team", header: "Team", value: (p) => p.team, options: ["Blue", "Red"], editable: true },
  { id: "score", header: "Score", type: "number", value: (p) => p.score, editable: true },
  { id: "active", header: "Active", type: "boolean", value: (p) => p.active, editable: true },
  { id: "joined", header: "Joined", type: "date", value: (p) => p.joined, editable: true },
]

function People(props: { onEdit?: (rows: Person[]) => void; groupBy?: string }) {
  const [rows, setRows] = useState(people)
  return (
    <DataGrid
      label="People"
      locale="en-US"
      defaultGroupBy={props.groupBy ?? null}
      rows={rows}
      columns={columns}
      getRowId={(p) => p.id}
      selectable
      onCellEdit={({ rowId, column, value }) => {
        const next = rows.map((p) => (p.id === rowId ? { ...p, [column]: value } : p))
        setRows(next)
        props.onEdit?.(next)
      }}
    />
  )
}

const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("gridcell")[1]!.textContent)

test("a header click sorts ascending, then descending, then clears", async () => {
  render(<People />)
  const score = screen.getByRole("columnheader", { name: /Score/ })
  fireEvent.click(score)
  expect(score.getAttribute("aria-sort")).toBe("ascending")
  expect(names()).toEqual(["Linus", "Ada", "Grace"])
  fireEvent.click(score)
  expect(score.getAttribute("aria-sort")).toBe("descending")
  expect(names()).toEqual(["Grace", "Ada", "Linus"])
  fireEvent.click(score)
  expect(score.hasAttribute("aria-sort")).toBe(false)
  expect(names()).toEqual(["Ada", "Grace", "Linus"])
})

test("row checkboxes select rows, and the header box selects every shown row", async () => {
  render(<People />)
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Grace" }))
  expect(screen.getAllByRole("row")[2]!.getAttribute("aria-selected")).toBe("true")
  const all = screen.getByRole<HTMLInputElement>("checkbox", { name: "Select all rows" })
  expect(all.indeterminate).toBe(true)
  fireEvent.click(all)
  expect(screen.getAllByRole("row").slice(1).map((r) => r.getAttribute("aria-selected"))).toEqual([
    "true",
    "true",
    "true",
  ])
  expect(screen.getByText("3 selected")).toBeTruthy()
})

test("agents sort, filter, select and edit by the names a person sees", async () => {
  const agent = createAgent()
  const onEdit = vi.fn()
  render(<People onEdit={onEdit} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

  const entry = agent.snapshot().find((item) => item.label === "People")
  expect(entry?.actions).toEqual(
    expect.arrayContaining(["sortBy", "filter", "selectRows", "editCell", "groupBy"]),
  )
  // Agents read rows as { value, label }; the label carries the row as a person reads it.
  expect(entry?.items?.[0]).toEqual({ value: "p1", label: "Ada (Team: Blue, Score: 36, Active: Yes, Joined: 2026-01-05)" })

  const run = (action: string, ...args: unknown[]) =>
    act(() => agent.act({ steps: [{ ref: "People", action, args }] }))

  let result = await run("sortBy", "Score", "descending")
  expect(result.ok, result.error?.message).toBe(true)
  expect(names()).toEqual(["Grace", "Ada", "Linus"])

  result = await run("filter", "blue")
  expect(result.ok, result.error?.message).toBe(true)
  expect(names()).toEqual(["Ada", "Linus"])

  result = await run("selectRows", ["Linus"])
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Select Linus" }).checked).toBe(
    true,
  )

  result = await run("editCell", "Ada", "Score", "50")
  expect(result.ok, result.error?.message).toBe(true)
  expect(onEdit.mock.lastCall![0][0].score).toBe(50)

  // Values that don't fit the column are refused, and nothing changes.
  result = await run("editCell", "Ada", "Score", "lots")
  expect(result.ok).toBe(false)
  result = await run("editCell", "Ada", "Team", "Purple")
  expect(result.ok).toBe(false)
  expect(onEdit).toHaveBeenCalledTimes(1)
})

test("Space on a yes-or-no cell flips it without an editor", async () => {
  const onEdit = vi.fn()
  render(<People onEdit={onEdit} />)
  const cell = screen.getAllByRole("row")[1]!.querySelectorAll("[role=gridcell]")[4] as HTMLElement
  expect(cell.textContent).toBe("Yes")
  fireEvent.keyDown(cell, { key: " " })
  expect(onEdit.mock.lastCall![0][0].active).toBe(false)
  expect(cell.textContent).toBe("No")
})

test("Shift-click selects the rows between, in the order they show, groups included", async () => {
  render(<People groupBy="team" />)
  // On screen: Blue (Ada, Linus), then Red (Grace). In data order Grace sits between them.
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Ada" }))
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Linus" }), { shiftKey: true })
  const checked = (name: string) =>
    screen.getByRole<HTMLInputElement>("checkbox", { name: `Select ${name}` }).checked
  expect([checked("Ada"), checked("Linus"), checked("Grace")]).toEqual([true, true, false])
})

test("agents get a reason for a bad direction, a bad number or a bad date", async () => {
  const agent = createAgent()
  const onEdit = vi.fn()
  render(<People onEdit={onEdit} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const run = (action: string, ...args: unknown[]) =>
    act(() => agent.act({ steps: [{ ref: "People", action, args }] }))

  let result = await run("sortBy", "Score", "asc")
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/ascending, descending or none/)

  result = await run("editCell", "Ada", "Score", "12 units")
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/Score needs a number/)

  // A currency sign is fine, and grouping follows the locale.
  result = await run("editCell", "Ada", "Score", "$1,200.50")
  expect(result.ok, result.error?.message).toBe(true)
  expect(onEdit.mock.lastCall![0][0].score).toBe(1200.5)

  // Dates are read the way people type them, and stored as that calendar day.
  result = await run("editCell", "Ada", "Joined", "Nov 20, 2026")
  expect(result.ok, result.error?.message).toBe(true)
  expect((onEdit.mock.lastCall![0][0].joined as Date).toISOString().slice(0, 10)).toBe(
    "2026-11-20",
  )
  result = await run("editCell", "Ada", "Joined", "someday")
  expect(result.ok).toBe(false)
})
