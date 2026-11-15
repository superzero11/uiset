import { useState } from "react"
import {
  Board,
  BoardCardDialog,
  BoardToolbar,
  createBoardController,
  type BoardCardData,
  type BoardColumnSpec,
} from "@/registry/uiset/ui/board"
import { toast } from "@/registry/uiset/ui/toast"

const columns: BoardColumnSpec[] = [
  { id: "backlog", title: "Backlog" },
  { id: "doing", title: "In progress", limit: 3 },
  { id: "review", title: "In review", limit: 2 },
  { id: "done", title: "Done" },
]
const people = ["Ada Lovelace", "Grace Hopper", "Linus Pauling", "Margaret Hamilton"]
const labels = ["Bug", "Design", "API", "Docs"]

const initialCards: Record<string, BoardCardData> = Object.fromEntries(
  (
    [
      ["c1", "Rate-limit the public API", ["API"], "Grace Hopper", "2026-12-02", "high"],
      ["c2", "Onboarding checklist", ["Design"], "Margaret Hamilton", "2026-12-05", "medium"],
      ["c3", "Keyboard shortcuts sheet", ["Docs"], undefined, undefined, "low"],
      ["c4", "Ship the invoice export", ["API"], "Ada Lovelace", "2026-11-20", "medium"],
      ["c5", "Dark mode for charts", ["Design"], "Margaret Hamilton", "2026-11-12", "urgent"],
      ["c6", "Fix the login redirect", ["Bug"], "Linus Pauling", "2026-11-17", "high"],
      ["c7", "Retry failed webhooks", ["API", "Bug"], "Grace Hopper", "2026-11-18", "medium"],
      ["c8", "Audit the cookie banner", ["Docs"], "Ada Lovelace", undefined, "low"],
    ] as const
  ).map(([id, title, l, assignee, due, priority]) => [
    id,
    { id, title, labels: [...l], assignee, due, priority } as BoardCardData,
  ]),
)

function BoardDemo() {
  const [board] = useState(createBoardController)
  const [cards, setCards] = useState(initialCards)
  const [lanes, setLanes] = useState<Record<string, string[]>>({
    backlog: ["c1", "c2", "c3"],
    doing: ["c4", "c5"],
    review: ["c6", "c7"],
    done: ["c8"],
  })
  const [open, setOpen] = useState<BoardCardData | null>(null)
  const [query, setQuery] = useState("")
  const [person, setPerson] = useState<string | null>(null)
  const columnOf = (id: string) => Object.keys(lanes).find((c) => lanes[c]!.includes(id))

  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const filter = (card: BoardCardData) =>
    (!person || card.assignee === person) &&
    words.every((w) => `${card.title} ${card.labels?.join(" ")} ${card.assignee ?? ""}`.toLowerCase().includes(w))

  return (
    <div className="board-demo">
      <BoardToolbar
        label="Sprint board"
        query={query}
        onQueryChange={setQuery}
        people={people}
        person={person}
        onPersonChange={setPerson}
      />
      <Board
        label="Sprint board"
        controller={board}
        columns={columns}
        cards={cards}
        lanes={lanes}
        today="2026-11-15"
        filter={filter}
        onLanesChange={(next, details) => {
          const before = lanes
          setLanes(next)
          if (details.from !== details.to)
            toast(`Moved to ${columns.find((c) => c.id === details.to)?.title}`, {
              action: { label: "Undo", onAction: () => setLanes(before) },
            })
        }}
        onCardOpen={setOpen}
        onAddCard={(column, title) => {
          const id = `c${Date.now()}`
          setCards((all) => ({ ...all, [id]: { id, title, priority: "medium" } }))
          setLanes((all) => ({ ...all, [column]: [...(all[column] ?? []), id] }))
          return id
        }}
      />
      <BoardCardDialog
        board={board}
        card={open}
        column={open ? columnOf(open.id) : undefined}
        columns={columns}
        people={people}
        labels={labels}
        onClose={() => setOpen(null)}
        onSave={(card) => setCards((all) => ({ ...all, [card.id]: card }))}
        onDelete={(card) => {
          setLanes((all) => Object.fromEntries(Object.entries(all).map(([c, ids]) => [c, ids.filter((id) => id !== card.id)])))
          toast(`Deleted “${card.title}”`)
        }}
      />
    </div>
  )
}

export { BoardDemo }
