// The board in Solid, with React's assertions (tests/unit/board.test.tsx). The keys, moves and
// the tab stop are UISet's own primitive (board/board.ts); these check the Solid views over it.
import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { createAgent } from "@ui-sdk/solid/agent"
import { createSignal } from "solid-js"
import { expect, test, vi } from "vitest"
import { Board, BoardCardDialog, createBoardController, type BoardCardData } from "@/solid/src/board"
import { settle } from "./solid-bridge"

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
  const [lanes, setLanes] = createSignal<Record<string, string[]>>({ todo: ["a", "b"], doing: ["c", "d"], done: ["e"] })
  return (
    <Board
      label="Launch"
      columns={columns}
      cards={cards}
      lanes={lanes()}
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
const press = async (key: string, init: Partial<KeyboardEventInit> = {}) => {
  fireEvent.keyDown(document.activeElement!, { key, ...init })
  await settle(0)
}

test("columns are listboxes of cards, and the board is one tab stop", async () => {
  render(() => <Demo />)
  await settle()
  expect(screen.getByRole("group", { name: "Launch" }).getAttribute("aria-roledescription")).toBe("board")
  expect(titles("To do")).toEqual(["Write the spec", "Book the venue"])
  expect(card("Write the spec").getAttribute("aria-roledescription")).toBe("card")
  const stops = [...document.querySelectorAll("[aria-roledescription=card]")].filter((el) => el.getAttribute("tabindex") === "0")
  expect(stops).toHaveLength(1)
  // The counts read in words, and an empty column says so.
  expect(within(column("Doing").parentElement!).getByText("2 of 2 cards")).toBeTruthy()
  expect(screen.getByText("Full: finish a card to add more.")).toBeTruthy()
})

test("arrows move down a column and across to the card at the same height", async () => {
  render(() => <Demo />)
  await settle()
  card("Write the spec").focus()
  await press("ArrowDown")
  expect(document.activeElement).toBe(card("Book the venue"))
  await press("ArrowRight")
  expect(document.activeElement).toBe(card("Fix the build"))
  await press("ArrowRight")
  expect(document.activeElement).toBe(card("Send invites"))
})

test("Space picks a card up, arrows carry it, Space drops it in another column", async () => {
  const onMove = vi.fn()
  render(() => <Demo onMove={onMove} />)
  await settle()
  const send = card("Send invites")
  send.focus()
  await press(" ")
  await waitFor(() => expect(send.getAttribute("aria-selected")).toBe("true"))
  // A carried card changes columns, so its element is remounted; focus goes with it.
  await press("ArrowLeft")
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Send invites")
  await press("ArrowLeft")
  await press(" ")
  expect(onMove).toHaveBeenCalled()
  expect(titles("To do")).toContain("Send invites")
  await waitFor(() => expect(card("Send invites").getAttribute("aria-selected")).toBe("false"))
  expect(document.activeElement).toBe(card("Send invites"))
})

test("a full column refuses a card: carried right, it skips to the next column with room", async () => {
  render(() => <Demo />)
  await settle()
  card("Write the spec").focus()
  await press(" ")
  await press("ArrowRight")
  await press(" ")
  expect(titles("Doing")).toEqual(["Ship the beta", "Fix the build"])
  expect(titles("Done")).toContain("Write the spec")
})

test("Enter opens a card, and a click does too", async () => {
  const onOpen = vi.fn()
  render(() => <Demo onOpen={onOpen} />)
  await settle()
  card("Book the venue").focus()
  await press("Enter")
  expect(onOpen).toHaveBeenCalledWith(cards.b)
  fireEvent.click(card("Ship the beta"))
  expect(onOpen).toHaveBeenLastCalledWith(cards.c)
})

test("a filter hides cards and focus skips them", async () => {
  render(() => <Demo filter={(c) => c.id !== "b"} />)
  await settle()
  expect(screen.queryByRole("option", { name: "Book the venue" })).toBeNull()
  expect(screen.getByRole("group", { name: "Launch" }).hasAttribute("data-filtered")).toBe(true)
  card("Write the spec").focus()
  await press("ArrowDown")
  expect(document.activeElement).toBe(card("Write the spec"))
  // The board's one tab stop never lands on a hidden card, or Tab would find nothing.
  const hidden = document.querySelector<HTMLElement>("[aria-label='Book the venue']")!
  expect(hidden.getAttribute("tabindex")).toBe("-1")
  expect(card("Write the spec").getAttribute("tabindex")).toBe("0")
})

test("agents move and open cards by name, and hear why a move can't happen", async () => {
  const agent = createAgent()
  const onOpen = vi.fn()
  render(() => <Demo onOpen={onOpen} />)
  await settle()
  const entry = agent.snapshot().find((item) => item.label === "Launch")
  expect(entry?.actions).toEqual(expect.arrayContaining(["moveCard", "addCard", "openCard"]))
  const run = async (action: string, ...args: unknown[]) => {
    const result = await agent.act({ steps: [{ ref: "Launch", action, args }] })
    await settle()
    return result
  }

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
  const [filter, setFilter] = createSignal<((c: BoardCardData) => boolean) | undefined>(undefined)
  render(() => <Demo filter={filter()} />)
  await settle()
  card("Write the spec").focus()
  await press("ArrowDown")
  expect(card("Book the venue").getAttribute("tabindex")).toBe("0")
  // Focus leaves for the search box, and the search hides the card holding the tab stop.
  ;(document.activeElement as HTMLElement).blur()
  setFilter(() => (c: BoardCardData) => c.id !== "b")
  await settle()
  const stops = [...document.querySelectorAll<HTMLElement>("[aria-roledescription=card]")].filter((el) => el.getAttribute("tabindex") === "0")
  expect(stops.map((el) => el.getAttribute("aria-label"))).toEqual([expect.not.stringMatching("Book the venue")])
  expect(stops[0]!.hidden).toBe(false)
})

test("while a filter hides cards, Space doesn't pick one up: it says why", async () => {
  const onMove = vi.fn()
  render(() => <Demo onMove={onMove} filter={(c) => c.id !== "b"} />)
  await settle()
  const write = card("Write the spec")
  write.focus()
  await press(" ")
  await press("ArrowRight")
  await press(" ")
  expect(write.getAttribute("aria-selected")).toBe("false")
  expect(onMove).not.toHaveBeenCalled()
  await waitFor(() => expect(document.body.textContent).toContain("Clear the search and filters to move cards."))
})

test("a filter the page changes later hides every card it matches, not only the one with the tab stop", async () => {
  const [filter, setFilter] = createSignal<((c: BoardCardData) => boolean) | undefined>(undefined)
  render(() => <Demo filter={filter()} />)
  await settle()
  setFilter(() => (c: BoardCardData) => c.id === "a")
  await settle()
  expect(screen.getAllByRole("option").map((el) => el.getAttribute("aria-label"))).toEqual(["Write the spec"])
  expect(screen.getByRole("group", { name: "Launch" }).hasAttribute("data-filtered")).toBe(true)
  setFilter(undefined)
  await settle()
  expect(screen.getAllByRole("option")).toHaveLength(5)
  expect(screen.getByRole("group", { name: "Launch" }).hasAttribute("data-filtered")).toBe(false)
})

test("a focused card the filter hides hands focus to its nearest shown neighbor", async () => {
  const [filter, setFilter] = createSignal<((c: BoardCardData) => boolean) | undefined>(undefined)
  render(() => <Demo filter={filter()} />)
  await settle()
  card("Write the spec").focus()
  await press("ArrowDown")
  expect(document.activeElement).toBe(card("Book the venue"))
  setFilter(() => (c: BoardCardData) => c.id !== "b")
  await settle()
  expect(document.activeElement).toBe(card("Write the spec"))
})

test("a filter that hides only cards off the board doesn't stop moves", async () => {
  // The page's cards include one that's in no column, and the filter hides it.
  cards.z = { id: "z", title: "Archived" }
  try {
    render(() => <Demo filter={(c) => c.id !== "z"} />)
    await settle()
    expect(screen.getByRole("group", { name: "Launch" }).hasAttribute("data-filtered")).toBe(false)
    const write = card("Write the spec")
    write.focus()
    await press(" ")
    expect(write.getAttribute("aria-selected")).toBe("true")
    await press("Escape")
  } finally {
    delete cards.z
  }
})

test("modified Enter neither opens a card nor picks it up", async () => {
  const onOpen = vi.fn()
  render(() => <Demo onOpen={onOpen} />)
  await settle()
  card("Book the venue").focus()
  await press("Enter", { shiftKey: true })
  expect(onOpen).not.toHaveBeenCalled()
  expect(card("Book the venue").getAttribute("aria-selected")).toBe("false")
})

test("a card's details reach screen readers as its description, and its face shows them", async () => {
  const detailed = { ...cards, a: { ...cards.a!, assignee: "Grace Hopper", priority: "urgent" as const, labels: ["API"], due: "2026-11-01" } }
  render(() => <Board label="Launch" columns={columns} cards={detailed} defaultLanes={{ todo: ["a"], doing: [], done: [] }} today="2026-11-20" />)
  await settle()
  const write = card("Write the spec")
  expect(document.getElementById(write.getAttribute("aria-describedby")!)?.textContent).toBe("Urgent. Overdue Nov 1. Grace Hopper. Labels: API")
  expect(write.querySelector(".board-card-due")?.textContent).toBe("Overdue, Nov 1")
  expect(write.querySelector(".board-card-due")?.hasAttribute("data-overdue")).toBe(true)
  expect(within(write).getByRole("img", { name: "Grace Hopper" }).textContent).toBe("GH")
  expect([...write.querySelectorAll(".board-card-labels, .board-card-meta")].map((el) => el.textContent)).toEqual(["API", "UrgentOverdue, Nov 1GH"])
  // Empty columns say so; columns without a limit count in words too.
  expect(screen.getAllByText("No cards")).toHaveLength(2)
  expect(screen.getByText("1 cards")).toBeTruthy()
})

test("an uncontrolled board adds the card onAddCard returns, through the form", async () => {
  render(() => (
    <Board
      label="Launch"
      columns={columns}
      cards={cards}
      defaultLanes={{ todo: ["a"], doing: ["c"], done: [] }}
      onAddCard={(_, title) => {
        cards.z = { id: "z", title }
        return "z"
      }}
    />
  ))
  await settle()
  fireEvent.click(screen.getByRole("button", { name: "Add a card to Doing" }))
  await settle()
  const field = screen.getByRole("textbox", { name: "Title of the new card in Doing" })
  expect(document.activeElement).toBe(field)
  fireEvent.input(field, { target: { value: "Pack the demo" } })
  fireEvent.submit(screen.getByRole("form", { name: "New card in Doing" }))
  await settle()
  expect(titles("Doing")).toEqual(["Ship the beta", "Pack the demo"])
  // That filled the column: the form gives way, and focus goes to the new card.
  expect(screen.queryByRole("form", { name: "New card in Doing" })).toBeNull()
  await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toBe("Pack the demo"))
  delete cards.z
})

test("the add form: Escape and Done adding hand focus back to its button, and a failed add says why", async () => {
  const onAddCard = vi.fn((_: string, title: string) => {
    if (title === "nope") throw new Error("That title is taken.")
  })
  render(() => <Board label="Launch" columns={columns} cards={cards} defaultLanes={{ todo: ["a"], doing: [], done: [] }} onAddCard={onAddCard} />)
  await settle()
  const add = () => screen.getByRole("button", { name: "Add a card to To do" })
  fireEvent.click(add())
  await settle()
  await press("Escape")
  await waitFor(() => expect(document.activeElement).toBe(add()))
  fireEvent.click(add())
  await settle()
  const field = screen.getByRole("textbox", { name: "Title of the new card in To do" })
  fireEvent.input(field, { target: { value: "nope" } })
  fireEvent.submit(screen.getByRole("form", { name: "New card in To do" }))
  await settle()
  const form = () => screen.getByRole("form", { name: "New card in To do" })
  expect(within(form()).getByRole("alert").textContent).toBe("That title is taken.")
  expect(field.getAttribute("aria-invalid")).toBe("true")
  fireEvent.input(field, { target: { value: "Fine" } })
  fireEvent.submit(screen.getByRole("form", { name: "New card in To do" }))
  await settle()
  expect(onAddCard).toHaveBeenLastCalledWith("todo", "Fine")
  expect(within(form()).queryByRole("alert")).toBeNull()
  // The column has room left, so the form stays open, emptied, for the next card.
  expect((screen.getByRole("textbox", { name: "Title of the new card in To do" }) as HTMLInputElement).value).toBe("")
  fireEvent.click(screen.getByRole("button", { name: "Done adding" }))
  await waitFor(() => expect(document.activeElement).toBe(add()))
})

test("agents hear that a board without onCardOpen can't open cards", async () => {
  const agent = createAgent()
  render(() => <Board label="Plain" columns={columns} cards={cards} defaultLanes={{ todo: ["a"], doing: [], done: [] }} />)
  await settle()
  const result = await agent.act({ steps: [{ ref: "Plain", action: "openCard", args: ["Write the spec"] }] })
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/doesn't open cards/)
  // A click on such a card does nothing, rather than throw.
  expect(() => fireEvent.click(card("Write the spec"))).not.toThrow()
})

test("agents see each card as a readable item: where it is and what its face shows", async () => {
  const agent = createAgent()
  const detailed = {
    ...cards,
    c: { ...cards.c!, assignee: "Grace Hopper", due: "2026-12-02", priority: "urgent" as const, labels: ["Release", "Docs"] },
  }
  render(() => <Board label="Items" columns={columns} cards={detailed} defaultLanes={{ todo: ["a"], doing: ["c"], done: [] }} />)
  await settle()
  expect(agent.snapshot().find((item) => item.label === "Items")?.items).toEqual([
    { value: "a", label: "Write the spec (To do)" },
    { value: "c", label: "Ship the beta (Doing, Urgent, Grace Hopper, due 2026-12-02; labels: Release, Docs)" },
  ])
})

test("a card the page changes redraws in place, and a locked card can't be picked up", async () => {
  const [deck, setDeck] = createSignal<Record<string, BoardCardData>>({ ...cards })
  render(() => <Board label="Launch" columns={columns} cards={deck()} defaultLanes={{ todo: ["a", "b"], doing: [], done: [] }} locked={(c) => c.id === "b"} />)
  await settle()
  const write = card("Write the spec")
  setDeck({ ...deck(), a: { ...cards.a!, title: "Write the brief" } })
  await settle()
  expect(card("Write the brief")).toBe(write)
  card("Book the venue").focus()
  await press(" ")
  expect(card("Book the venue").getAttribute("aria-selected")).toBe("false")
})

test("the card dialog edits a card, moves it through the board, and refuses a full column", async () => {
  const board = createBoardController()
  const [deck, setDeck] = createSignal<Record<string, BoardCardData>>({ ...cards, a: { ...cards.a!, labels: ["Docs", "Legacy"] } })
  const [lanes, setLanes] = createSignal<Record<string, string[]>>({ todo: ["a", "b"], doing: ["c", "d"], done: ["e"] })
  const [open, setOpen] = createSignal<string | null>(null)
  const columnOf = (key: string | null) => (key ? Object.keys(lanes()).find((c) => lanes()[c]!.includes(key)) : undefined)
  const onSave = vi.fn((next: BoardCardData) => setDeck({ ...deck(), [next.id]: next }))
  render(() => (
    <>
      <Board label="Launch" columns={columns} cards={deck()} lanes={lanes()} onLanesChange={setLanes} controller={board} onCardOpen={(c) => setOpen(c.id)} />
      <BoardCardDialog
        board={board}
        card={open() ? deck()[open()!]! : null}
        column={columnOf(open())}
        columns={columns}
        people={["Grace Hopper"]}
        labels={["API", "Docs"]}
        onSave={onSave}
        onDelete={() => {}}
        onClose={() => setOpen(null)}
      />
    </>
  ))
  await settle()
  card("Write the spec").focus()
  await press("Enter")
  const dialog = await screen.findByRole("dialog", { name: "Write the spec" })
  expect(within(dialog).getByText("To do column.")).toBeTruthy()
  const form = within(dialog).getByRole("form", { name: "Edit Write the spec" }) as HTMLFormElement
  // Doing is full, so the dialog can't move the card there: the board says why.
  const columnField = form.querySelector<HTMLInputElement | HTMLSelectElement>("[name='card-column']")!
  columnField.value = "doing"
  fireEvent.input(within(dialog).getByRole("textbox", { name: "Title" }), { target: { value: "Write the brief" } })
  fireEvent.submit(form)
  await settle()
  expect(within(dialog).getByRole("alert").textContent).toBe("Doing is full: it holds at most 2 cards.")
  expect(onSave).not.toHaveBeenCalled()
  columnField.value = "done"
  // Labels the dialog lists follow the boxes; one it doesn't list stays.
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "API" }))
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Docs" }))
  fireEvent.submit(form)
  await settle()
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "a", title: "Write the brief", priority: "medium", labels: ["Legacy", "API"] }))
  expect(titles("Done")).toEqual(["Send invites", "Write the brief"])
  // Focus followed the card to its new column.
  await waitFor(() => expect(document.activeElement).toBe(card("Write the brief")))
})

test("the card dialog deletes a card once it's confirmed, and focus goes to its neighbor", async () => {
  const board = createBoardController()
  const [lanes, setLanes] = createSignal<Record<string, string[]>>({ todo: ["a", "b"], doing: [], done: [] })
  const [open, setOpen] = createSignal<string | null>(null)
  const onDelete = vi.fn((gone: BoardCardData) => setLanes({ ...lanes(), todo: lanes().todo!.filter((id) => id !== gone.id) }))
  render(() => (
    <>
      <Board label="Launch" columns={columns} cards={cards} lanes={lanes()} onLanesChange={setLanes} controller={board} onCardOpen={(c) => setOpen(c.id)} />
      <BoardCardDialog
        board={board}
        card={open() ? cards[open()!]! : null}
        column={open() ? "todo" : undefined}
        columns={columns}
        onSave={() => {}}
        onDelete={onDelete}
        onClose={() => setOpen(null)}
      />
    </>
  ))
  await settle()
  card("Write the spec").focus()
  await press("Enter")
  const dialog = await screen.findByRole("dialog", { name: "Write the spec" })
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete card" }))
  const alert = await screen.findByRole("alertdialog", { name: "Delete “Write the spec”?" })
  // The alert renders beside the card's form, not in it.
  expect(alert.closest("form")).toBeNull()
  fireEvent.click(within(alert).getByRole("button", { name: "Keep the card" }))
  await settle()
  expect(onDelete).not.toHaveBeenCalled()
  expect(screen.getByRole("dialog", { name: "Write the spec" })).toBeTruthy()
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete card" }))
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete for good" }))
  await settle()
  expect(onDelete).toHaveBeenCalledWith(cards.a)
  expect(titles("To do")).toEqual(["Book the venue"])
  await waitFor(() => expect(document.activeElement).toBe(card("Book the venue")))
})

test("an uncontrolled board that adds a card its filter hides says it's filtering", async () => {
  const agent = createAgent()
  const [deck, setDeck] = createSignal<Record<string, BoardCardData>>({ ...cards })
  render(() => (
    <Board
      label="Launch"
      columns={columns}
      cards={deck()}
      defaultLanes={{ todo: ["a"], doing: [], done: [] }}
      filter={(c) => c.title !== "Hidden one"}
      onAddCard={(_, title) => {
        setDeck({ ...deck(), y: { id: "y", title } })
        return "y"
      }}
    />
  ))
  await settle()
  expect(screen.getByRole("group", { name: "Launch" }).hasAttribute("data-filtered")).toBe(false)
  const result = await agent.act({ steps: [{ ref: "Launch", action: "addCard", args: ["To do", "Hidden one"] }] })
  expect(result.ok, result.error?.message).toBe(true)
  await settle()
  expect(screen.getByRole("group", { name: "Launch" }).hasAttribute("data-filtered")).toBe(true)
  expect(screen.queryByRole("option", { name: "Hidden one" })).toBeNull()
})
