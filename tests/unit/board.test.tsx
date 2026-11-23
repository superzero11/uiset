import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { Board, type BoardCardData } from "@/registry/uiset/ui/board"

const columns = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "Doing", limit: 2 },
  { id: "done", title: "Done" },
]
const cards: Record<string, BoardCardData> = {
  a: { id: "a", title: "Write the spec" },
  b: { id: "b", title: "Book the venue" },
  c: { id: "c", title: "Ship the beta" },
  d: { id: "d", title: "Fix the build" },
  e: { id: "e", title: "Send invites" },
}

function Demo(props: { onOpen?: (c: BoardCardData) => void; onMove?: (lanes: Record<string, string[]>) => void; filter?: (c: BoardCardData) => boolean }) {
  const [lanes, setLanes] = useState<Record<string, string[]>>({ todo: ["a", "b"], doing: ["c", "d"], done: ["e"] })
  return (
    <Board
      label="Launch"
      columns={columns}
      cards={cards}
      lanes={lanes}
      onLanesChange={(next) => {
        setLanes(next)
        props.onMove?.(next)
      }}
      onCardOpen={props.onOpen}
      filter={props.filter}
      onAddCard={() => {}}
    />
  )
}

const card = (name: string) => screen.getByRole("option", { name })
const column = (name: string) => screen.getByRole("listbox", { name })
const titles = (name: string) =>
  within(column(name))
    .queryAllByRole("option", { hidden: true })
    .map((o) => o.getAttribute("aria-label"))

test("columns are listboxes of cards, and the board is one tab stop", () => {
  render(<Demo />)
  expect(screen.getByRole("group", { name: "Launch" }).getAttribute("aria-roledescription")).toBe("board")
  expect(titles("To do")).toEqual(["Write the spec", "Book the venue"])
  expect(card("Write the spec").getAttribute("aria-roledescription")).toBe("card")
  const stops = [...document.querySelectorAll("[aria-roledescription=card]")].filter(
    (el) => el.getAttribute("tabindex") === "0",
  )
  expect(stops).toHaveLength(1)
})

test("arrows move down a column and across to the card at the same height", () => {
  render(<Demo />)
  card("Write the spec").focus()
  fireEvent.keyDown(card("Write the spec"), { key: "ArrowDown" })
  expect(document.activeElement).toBe(card("Book the venue"))
  fireEvent.keyDown(card("Book the venue"), { key: "ArrowRight" })
  expect(document.activeElement).toBe(card("Fix the build"))
  fireEvent.keyDown(card("Fix the build"), { key: "ArrowRight" })
  expect(document.activeElement).toBe(card("Send invites"))
})

test("Space picks a card up, arrows carry it, Space drops it in another column", async () => {
  const onMove = vi.fn()
  render(<Demo onMove={onMove} />)
  const send = card("Send invites")
  send.focus()
  fireEvent.keyDown(send, { key: " " })
  await waitFor(() => expect(send.getAttribute("aria-selected")).toBe("true"))
  // A carried card changes columns, so its element is remounted; focus goes with it.
  const press = async (key: string) => {
    fireEvent.keyDown(document.activeElement!, { key })
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  }
  await press("ArrowLeft")
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Send invites")
  await press("ArrowLeft")
  await press(" ")
  expect(onMove).toHaveBeenCalled()
  expect(titles("To do")).toContain("Send invites")
  await waitFor(() => expect(card("Send invites").getAttribute("aria-selected")).toBe("false"))
})

test("a full column refuses a card: carried right, it skips to the next column with room", () => {
  render(<Demo />)
  const write = card("Write the spec")
  write.focus()
  fireEvent.keyDown(write, { key: " " })
  fireEvent.keyDown(write, { key: "ArrowRight" })
  fireEvent.keyDown(write, { key: " " })
  expect(titles("Doing")).toEqual(["Ship the beta", "Fix the build"])
  expect(titles("Done")).toContain("Write the spec")
})

test("Enter opens a card", () => {
  const onOpen = vi.fn()
  render(<Demo onOpen={onOpen} />)
  card("Book the venue").focus()
  fireEvent.keyDown(card("Book the venue"), { key: "Enter" })
  expect(onOpen).toHaveBeenCalledWith(cards.b)
})

test("a filter hides cards and focus skips them", () => {
  render(<Demo filter={(c) => c.id !== "b"} />)
  expect(screen.queryByRole("option", { name: "Book the venue" })).toBeNull()
  card("Write the spec").focus()
  fireEvent.keyDown(card("Write the spec"), { key: "ArrowDown" })
  expect(document.activeElement).toBe(card("Write the spec"))
  // The board's one tab stop never lands on a hidden card, or Tab would find nothing.
  const hidden = document.querySelector<HTMLElement>("[aria-label='Book the venue']")!
  expect(hidden.getAttribute("tabindex")).toBe("-1")
  expect(card("Write the spec").getAttribute("tabindex")).toBe("0")
})

test("agents move and open cards by name, and hear why a move can't happen", async () => {
  const agent = createAgent()
  const onOpen = vi.fn()
  render(<Demo onOpen={onOpen} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const entry = agent.snapshot().find((item) => item.label === "Launch")
  expect(entry?.actions).toEqual(expect.arrayContaining(["moveCard", "addCard", "openCard"]))
  const run = (action: string, ...args: unknown[]) =>
    act(() => agent.act({ steps: [{ ref: "Launch", action, args }] }))

  let result = await run("moveCard", "Write the spec", "Doing")
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/Doing is full/)

  result = await run("moveCard", "Send invites", "To do", 1)
  expect(result.ok, result.error?.message).toBe(true)
  expect(titles("To do")[0]).toBe("Send invites")

  result = await run("openCard", "Ship the beta")
  expect(result.ok, result.error?.message).toBe(true)
  expect(onOpen).toHaveBeenCalledWith(cards.c)
})

test("a filter that hides the tab stop's card hands the tab stop to a card still shown", async () => {
  const { rerender } = render(<Demo />)
  const write = card("Write the spec")
  write.focus()
  fireEvent.keyDown(write, { key: "ArrowDown" })
  expect(card("Book the venue").getAttribute("tabindex")).toBe("0")
  // Focus leaves for the search box, and the search hides the card holding the tab stop.
  ;(document.activeElement as HTMLElement).blur()
  rerender(<Demo filter={(c) => c.id !== "b"} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const stops = [...document.querySelectorAll<HTMLElement>("[aria-roledescription=card]")].filter(
    (el) => el.getAttribute("tabindex") === "0",
  )
  expect(stops.map((el) => el.getAttribute("aria-label"))).toEqual([expect.not.stringMatching("Book the venue")])
  expect(stops[0]!.hidden).toBe(false)
})

test("while a filter hides cards, Space doesn't pick one up: it says why", async () => {
  const onMove = vi.fn()
  render(<Demo onMove={onMove} filter={(c) => c.id !== "b"} />)
  const write = card("Write the spec")
  write.focus()
  fireEvent.keyDown(write, { key: " " })
  fireEvent.keyDown(write, { key: "ArrowRight" })
  fireEvent.keyDown(write, { key: " " })
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(write.getAttribute("aria-selected")).toBe("false")
  expect(onMove).not.toHaveBeenCalled()
  await waitFor(() => expect(document.body.textContent).toContain("Clear the search and filters to move cards."))
})

test("a focused card the filter hides hands focus to its nearest shown neighbor", async () => {
  const { rerender } = render(<Demo />)
  const write = card("Write the spec")
  write.focus()
  fireEvent.keyDown(write, { key: "ArrowDown" })
  expect(document.activeElement).toBe(card("Book the venue"))
  rerender(<Demo filter={(c) => c.id !== "b"} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(document.activeElement).toBe(card("Write the spec"))
})

test("a filter that hides only cards off the board doesn't stop moves", async () => {
  // The page's cards include one that's in no column, and the filter hides it.
  cards.z = { id: "z", title: "Archived" }
  try {
    render(<Demo filter={(c) => c.id !== "z"} />)
    expect(screen.getByRole("group", { name: "Launch" }).hasAttribute("data-filtered")).toBe(false)
    const write = card("Write the spec")
    write.focus()
    fireEvent.keyDown(write, { key: " " })
    expect(write.getAttribute("aria-selected")).toBe("true")
    fireEvent.keyDown(write, { key: "Escape" })
  } finally {
    delete cards.z
  }
})

test("modified Enter neither opens a card nor picks it up", () => {
  const onOpen = vi.fn()
  render(<Demo onOpen={onOpen} />)
  const book = card("Book the venue")
  book.focus()
  fireEvent.keyDown(book, { key: "Enter", shiftKey: true })
  expect(onOpen).not.toHaveBeenCalled()
  expect(book.getAttribute("aria-selected")).toBe("false")
})

test("a card's details reach screen readers as its description", () => {
  const detailed = { ...cards, a: { ...cards.a!, assignee: "Grace Hopper", priority: "urgent" as const, labels: ["API"] } }
  render(<Board label="Launch" columns={columns} cards={detailed} defaultLanes={{ todo: ["a"], doing: [], done: [] }} />)
  const id = card("Write the spec").getAttribute("aria-describedby")!
  expect(document.getElementById(id)?.textContent).toBe("Urgent. Grace Hopper. Labels: API")
})

test("an uncontrolled board adds the card onAddCard returns, through the form", async () => {
  render(
    <Board
      label="Launch"
      columns={columns}
      cards={cards}
      defaultLanes={{ todo: ["a"], doing: ["c"], done: [] }}
      onAddCard={(_, title) => {
        cards.z = { id: "z", title }
        return "z"
      }}
    />,
  )
  fireEvent.click(screen.getByRole("button", { name: "Add a card to Doing" }))
  fireEvent.change(screen.getByRole("textbox", { name: "Title of the new card in Doing" }), { target: { value: "Pack the demo" } })
  fireEvent.submit(screen.getByRole("form", { name: "New card in Doing" }))
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(titles("Doing")).toEqual(["Ship the beta", "Pack the demo"])
  // That filled the column: the form gives way, and focus goes to the new card.
  expect(screen.queryByRole("form", { name: "New card in Doing" })).toBeNull()
  await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toBe("Pack the demo"))
  delete cards.z
})

test("agents hear that a board without onCardOpen can't open cards", async () => {
  const agent = createAgent()
  render(<Board label="Plain" columns={columns} cards={cards} defaultLanes={{ todo: ["a"], doing: [], done: [] }} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const result = await act(() => agent.act({ steps: [{ ref: "Plain", action: "openCard", args: ["Write the spec"] }] }))
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/doesn't open cards/)
  // A click on such a card does nothing, rather than throw.
  expect(() => fireEvent.click(card("Write the spec"))).not.toThrow()
})

// Agents read what people see on a card's face: its priority badge and labels too, not only
// where it is and whose it is (2026-11-23, from vercel-labs/ui#1030's kanban for agents).
test("agents see each card as a readable item: where it is and what its face shows", async () => {
  const agent = createAgent()
  const detailed = {
    ...cards,
    c: { ...cards.c!, assignee: "Grace Hopper", due: "2026-12-02", priority: "urgent" as const, labels: ["Release", "Docs"] },
  }
  render(<Board label="Items" columns={columns} cards={detailed} defaultLanes={{ todo: ["a"], doing: ["c"], done: [] }} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(agent.snapshot().find((item) => item.label === "Items")?.items).toEqual([
    { value: "a", label: "Write the spec (To do)" },
    { value: "c", label: "Ship the beta (Doing, Urgent, Grace Hopper, due 2026-12-02; labels: Release, Docs)" },
  ])
})
