// The data grid in Solid, with React's assertions (tests/unit/data-grid.test.tsx, its DataGrid
// half; the primitive's half is framework-free and runs there), and Solid's own: state the page
// holds, a saved layout, and the toolbar parts. The browser half is tests/e2e/data-grid-tests.ts.
import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/solid/agent"
import type { JSX } from "@solidjs/web"
import { createSignal } from "solid-js"
import { afterEach, expect, test, vi } from "vitest"
import { DataGrid, DataGridToolbar, type DataGridColumn, type SortRule } from "@/solid/src/data-grid"
import { settle } from "./solid-bridge"

type Person = { id: string; name: string; team: string; score: number; active: boolean; joined: Date }

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

function People(props: { onEdit?: (rows: Person[]) => void; groupBy?: string; children?: JSX.Element; persist?: string }) {
  const [rows, setRows] = createSignal(people)
  return (
    <DataGrid
      label="People"
      locale="en-US"
      defaultGroupBy={props.groupBy ?? null}
      rows={rows()}
      columns={columns}
      getRowId={(p) => p.id}
      selectable
      persist={props.persist}
      onCellEdit={({ rowId, column, value }) => {
        const next = rows().map((p) => (p.id === rowId ? { ...p, [column]: value } : p))
        setRows(next)
        props.onEdit?.(next)
      }}
    >
      {props.children}
    </DataGrid>
  )
}

const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("gridcell")[1]!.textContent)

afterEach(() => localStorage.clear())

test("a header click sorts ascending, then descending, then clears", async () => {
  render(() => <People />)
  await settle()
  const score = screen.getByRole("columnheader", { name: /Score/ })
  fireEvent.click(score)
  await settle(0)
  expect(score.getAttribute("aria-sort")).toBe("ascending")
  expect(names()).toEqual(["Linus", "Ada", "Grace"])
  fireEvent.click(score)
  await settle(0)
  expect(score.getAttribute("aria-sort")).toBe("descending")
  expect(names()).toEqual(["Grace", "Ada", "Linus"])
  fireEvent.click(score)
  await settle(0)
  expect(score.hasAttribute("aria-sort")).toBe(false)
  expect(names()).toEqual(["Ada", "Grace", "Linus"])
})

test("row checkboxes select rows, and the header box selects every shown row", async () => {
  render(() => <People />)
  await settle()
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Grace" }))
  await settle(0)
  expect(screen.getAllByRole("row")[2]!.getAttribute("aria-selected")).toBe("true")
  const all = screen.getByRole<HTMLInputElement>("checkbox", { name: "Select all rows" })
  expect(all.indeterminate).toBe(true)
  fireEvent.click(all)
  await settle(0)
  expect(screen.getAllByRole("row").slice(1).map((r) => r.getAttribute("aria-selected"))).toEqual(["true", "true", "true"])
  expect(all.indeterminate).toBe(false)
  expect(screen.getByText("3 selected")).toBeTruthy()
})

test("agents sort, filter, select and edit by the names a person sees", async () => {
  const agent = createAgent()
  const onEdit = vi.fn()
  render(() => <People onEdit={onEdit} />)
  await settle()

  const entry = agent.snapshot().find((item) => item.label === "People")
  expect(entry?.actions).toEqual(expect.arrayContaining(["sortBy", "filter", "selectRows", "editCell", "groupBy"]))
  // Agents read rows as { value, label }; the label carries the row as a person reads it.
  expect(entry?.items?.[0]).toEqual({ value: "p1", label: "Ada (Team: Blue, Score: 36, Active: Yes, Joined: 2026-01-05)" })

  const run = async (action: string, ...args: unknown[]) => {
    const result = await agent.act({ steps: [{ ref: "People", action, args }] })
    await settle(0)
    return result
  }

  let result = await run("sortBy", "Score", "descending")
  expect(result.ok, result.error?.message).toBe(true)
  expect(names()).toEqual(["Grace", "Ada", "Linus"])

  result = await run("filter", "blue")
  expect(result.ok, result.error?.message).toBe(true)
  expect(names()).toEqual(["Ada", "Linus"])

  result = await run("selectRows", ["Linus"])
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Select Linus" }).checked).toBe(true)

  result = await run("editCell", "Ada", "Score", "50")
  expect(result.ok, result.error?.message).toBe(true)
  expect(onEdit.mock.lastCall![0][0].score).toBe(50)

  // Values that don't fit the column are refused, and nothing changes.
  result = await run("editCell", "Ada", "Score", "lots")
  expect(result.ok).toBe(false)
  result = await run("editCell", "Ada", "Team", "Purple")
  expect(result.ok).toBe(false)
  expect(onEdit).toHaveBeenCalledTimes(1)
  // What agents read follows the view: the rows that show, as they show.
  expect(agent.snapshot().find((item) => item.label === "People")?.items?.map((item) => item.value)).toEqual(["p1", "p3"])
})

test("Space on a yes-or-no cell flips it without an editor", async () => {
  const onEdit = vi.fn()
  render(() => <People onEdit={onEdit} />)
  await settle()
  const cell = () => screen.getAllByRole("row")[1]!.querySelectorAll("[role=gridcell]")[4] as HTMLElement
  expect(cell().textContent).toBe("Yes")
  fireEvent.keyDown(cell(), { key: " " })
  await settle(0)
  expect(onEdit.mock.lastCall![0][0].active).toBe(false)
  expect(cell().textContent).toBe("No")
  // Enter flips it too: a yes-or-no cell has no editor to open.
  fireEvent.keyDown(cell(), { key: "Enter" })
  await settle(0)
  expect(screen.queryByRole("textbox")).toBeNull()
  expect(cell().textContent).toBe("Yes")
})

test("Shift-click selects the rows between, in the order they show, groups included", async () => {
  render(() => <People groupBy="team" />)
  await settle()
  // On screen: Blue (Ada, Linus), then Red (Grace). In data order Grace sits between them, so
  // Ada to Grace takes Linus on screen and wouldn't in data order.
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Ada" }))
  await settle(0)
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Grace" }), { shiftKey: true })
  await settle(0)
  const checked = (name: string) => screen.getByRole<HTMLInputElement>("checkbox", { name: `Select ${name}` }).checked
  expect([checked("Ada"), checked("Linus"), checked("Grace")]).toEqual([true, true, true])
})

test("agents get a reason for a bad direction, a bad number or a bad date", async () => {
  const agent = createAgent()
  const onEdit = vi.fn()
  render(() => <People onEdit={onEdit} />)
  await settle()
  const run = (action: string, ...args: unknown[]) => agent.act({ steps: [{ ref: "People", action, args }] })

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
  expect((onEdit.mock.lastCall![0][0].joined as Date).toISOString().slice(0, 10)).toBe("2026-11-20")
  result = await run("editCell", "Ada", "Joined", "someday")
  expect(result.ok).toBe(false)
})

test("groups draw a header row each, which closes and opens, and the grid counts the rows it spans", async () => {
  render(() => <People groupBy="team" />)
  await settle()
  const groups = () => screen.getAllByRole("row").filter((row) => row.classList.contains("data-grid-group-row"))
  expect(groups().map((row) => row.textContent)).toEqual(["Team: Blue2", "Team: Red1"])
  const blue = groups()[0]!.querySelector<HTMLElement>("[role=gridcell]")!
  expect(blue.getAttribute("aria-expanded")).toBe("true")
  expect(blue.getAttribute("aria-colspan")).toBe("6")
  fireEvent.click(blue)
  await settle(0)
  expect(screen.queryByRole("checkbox", { name: "Select Ada" })).toBeNull()
  expect(screen.getByRole("checkbox", { name: "Select Grace" })).toBeTruthy()
  expect(groups()[0]!.querySelector("[role=gridcell]")!.getAttribute("aria-expanded")).toBe("false")
  expect(screen.getByRole("grid").getAttribute("aria-rowcount")).toBe("4")
})

test("sort, query and selection the page holds: the grid shows them and asks to change them", async () => {
  const [sort, setSort] = createSignal<SortRule[]>([{ column: "score", direction: "descending" }])
  const onSortChange = vi.fn()
  const [selected, setSelected] = createSignal<string[]>(["p3"])
  render(() => (
    <DataGrid
      label="People"
      locale="en-US"
      rows={people}
      columns={columns}
      getRowId={(p) => p.id}
      selectable
      sort={sort()}
      onSortChange={onSortChange}
      selected={selected()}
      onSelectedChange={setSelected}
      query="a"
    />
  ))
  await settle()
  expect(names()).toEqual(["Grace", "Ada"])
  // A press asks; the page decides. This page doesn't take it, so the sort stays.
  fireEvent.click(screen.getByRole("columnheader", { name: /Name/ }))
  await settle(0)
  expect(onSortChange).toHaveBeenCalledWith([{ column: "name", direction: "ascending" }])
  expect(names()).toEqual(["Grace", "Ada"])
  setSort([{ column: "name", direction: "ascending" }])
  await settle(0)
  expect(names()).toEqual(["Ada", "Grace"])
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Ada" }))
  await settle(0)
  expect(selected()).toEqual(["p3", "p1"])
  expect(screen.getByText("2 selected")).toBeTruthy()
  expect(screen.getByText("2 of 3 rows")).toBeTruthy()
})

test("the layout is saved, and comes back on the next visit", async () => {
  const { unmount } = render(() => <People persist="people-grid" />)
  await settle()
  const agent = createAgent()
  await agent.act({ steps: [{ ref: "People", action: "showColumn", args: ["Joined", false] }] })
  await settle()
  expect(JSON.parse(localStorage.getItem("people-grid")!).columns.hidden).toEqual(["joined"])
  unmount()
  render(() => <People persist="people-grid" />)
  await settle()
  expect(screen.queryByRole("columnheader", { name: /Joined/ })).toBeNull()
  expect(screen.getByRole("columnheader", { name: /Active/ })).toBeTruthy()
})

test("the toolbar searches, says how many rows show, and swaps to the selection while rows are chosen", async () => {
  render(() => (
    <People>
      <DataGridToolbar filename="people" selectionActions={<button type="button">Archive</button>} />
    </People>
  ))
  await settle()
  expect(screen.getByRole("group", { name: "People tools" })).toBeTruthy()
  await userEvent.type(screen.getByRole("searchbox", { name: "Search people" }), "blue")
  await settle(0)
  expect(names()).toEqual(["Ada", "Linus"])
  expect(screen.getByText("2 of 3 rows")).toBeTruthy()
  // Cleared, every row is back: the rows drawn follow the view both ways.
  await userEvent.clear(screen.getByRole("searchbox", { name: "Search people" }))
  await settle(0)
  expect(names()).toEqual(["Ada", "Grace", "Linus"])
  await userEvent.type(screen.getByRole("searchbox", { name: "Search people" }), "blue")
  await settle(0)
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Ada" }))
  await settle(0)
  expect(screen.queryByRole("searchbox")).toBeNull()
  expect(screen.getByRole("button", { name: "Archive" })).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Clear selection" }))
  await settle(0)
  expect(screen.getByRole("searchbox", { name: "Search people" })).toBeTruthy()
  await waitFor(() => expect(document.activeElement?.closest("[role=grid]")).toBeTruthy())
})

test("Enter on an editable cell opens its editor, a bad number keeps it open with a message, and a good one saves", async () => {
  const onEdit = vi.fn()
  render(() => <People onEdit={onEdit} />)
  await settle()
  const score = () => screen.getAllByRole("row")[1]!.querySelectorAll<HTMLElement>("[role=gridcell]")[3]!
  score().focus()
  fireEvent.keyDown(score(), { key: "Enter" })
  await settle(0)
  const editor = screen.getByRole<HTMLInputElement>("textbox", { name: "Score" })
  await userEvent.clear(editor)
  await userEvent.type(editor, "lots{Enter}")
  await settle(0)
  expect(editor.getAttribute("aria-invalid")).toBe("true")
  expect(document.getElementById(editor.getAttribute("aria-describedby")!)?.textContent).toMatch(/Score needs a number/)
  expect(onEdit).not.toHaveBeenCalled()
  await userEvent.clear(editor)
  await userEvent.type(editor, "40{Enter}")
  await settle(0)
  expect(onEdit.mock.lastCall![0][0].score).toBe(40)
  expect(screen.queryByRole("textbox", { name: "Score" })).toBeNull()
  expect(document.querySelector(".data-grid-error")).toBeNull()
})

test("Alt+Right widens a column a step at a time, and focus stays on its header", async () => {
  render(() => <People />)
  await settle()
  const header = () => screen.getByRole("columnheader", { name: /Team/ })
  const width = () => /(\d+)px/.exec(screen.getByRole("grid").style.getPropertyValue("--data-grid-columns").split(" ")[2]!)![1]
  header().focus()
  expect(width()).toBe("160")
  fireEvent.keyDown(header(), { key: "ArrowRight", altKey: true })
  await settle(0)
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight", altKey: true })
  await settle(0)
  expect(width()).toBe("192")
  expect(document.activeElement).toBe(header())
})

test("Alt+Shift+Right moves a column, and the grid's arrows go on from its new place", async () => {
  render(() => <People />)
  await settle()
  const header = (name: RegExp) => screen.getByRole("columnheader", { name })
  header(/Team/).focus()
  fireEvent.keyDown(header(/Team/), { key: "ArrowRight", altKey: true, shiftKey: true })
  await settle()
  expect(screen.getAllByRole("columnheader").map((h) => h.querySelector(".data-grid-header-label")?.textContent ?? "")).toEqual(["", "Name", "Score", "Team", "Active", "Joined"])
  expect(document.activeElement).toBe(header(/Team/))
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" })
  await settle(0)
  expect(document.activeElement).toBe(header(/Active/))
})

test("a refused edit's message goes with its editor: Escape, and the next edit starts clean", async () => {
  render(() => <People />)
  await settle()
  const score = () => screen.getAllByRole("row")[1]!.querySelectorAll<HTMLElement>("[role=gridcell]")[3]!
  score().focus()
  fireEvent.keyDown(score(), { key: "Enter" })
  await settle(0)
  const editor = screen.getByRole<HTMLInputElement>("textbox", { name: "Score" })
  await userEvent.clear(editor)
  await userEvent.type(editor, "lots{Enter}")
  await settle(0)
  expect(document.querySelector(".data-grid-error")).toBeTruthy()
  fireEvent.keyDown(editor, { key: "Escape" })
  await settle(0)
  expect(screen.queryByRole("textbox", { name: "Score" })).toBeNull()
  fireEvent.keyDown(score(), { key: "Enter" })
  await settle(0)
  expect(screen.getByRole("textbox", { name: "Score" }).hasAttribute("aria-invalid")).toBe(false)
  expect(document.querySelector(".data-grid-error")).toBeNull()
})
