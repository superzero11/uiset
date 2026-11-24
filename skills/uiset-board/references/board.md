# Board

A kanban board on UI SDK's `createTransfer`: cards in columns that people move with the
pointer, the keyboard or an agent, with the same rules and announcements for all three.

```bash
npx shadcn@latest add @uiset/board
```

## Use

```tsx
const [board] = useState(createBoardController)

<BoardToolbar label="Cards" query={query} onQueryChange={setQuery}
  people={people} person={person} onPersonChange={setPerson} />
<Board
  label="Sprint board"
  controller={board}
  columns={[
    { id: "todo", title: "To do" },
    { id: "doing", title: "In progress", limit: 3 },
    { id: "done", title: "Done" },
  ]}
  cards={cards}
  lanes={lanes}
  onLanesChange={(next, { key, from, to, index }) => setLanes(next)}
  onCardOpen={setOpen}
  onAddCard={(column, title) => add(column, title) /* return the new card's id */}
  filter={(card) => matches(card, query, person)}
/>
<BoardCardDialog board={board} card={open} column={columnOf(open)} columns={columns}
  people={people} labels={labels}
  onSave={save} onDelete={remove} onClose={() => setOpen(null)} />
```

- `lanes` maps each column to its card ids, in order. `cards` holds the cards by id.
- A column's `limit` refuses cards past it, for people (the move skips to the next
  column with room), for drags, and for agents (with a reason).
- `filter` hides cards that don't match without moving them; focus skips them, and the
  board's one tab stop never stays on a hidden card. While a filter hides cards, nothing
  moves: a carried card would step through cards nobody can see. Space says so.
- `onAddCard` returns the new card's id. A controlled board's owner adds it to `lanes`; an
  uncontrolled board adds it itself. When it fills the column, focus goes to the new card.
- `controller` (from `createBoardController()`) connects `BoardCardDialog`, or your code, to
  the board: `moveCard`, `addCard`, `hasRoom`, `focusCard`, `cardElement`, `neighbor`. The
  dialog moves cards through it, so a move keeps column limits, reaches `onLanesChange`
  (and your Undo toast), and focus goes back to the card, or to its neighbor after a
  delete or an edit the filter hides.
- `BoardCardDialog` edits the assignee only when given `people`, and labels only when given
  `labels`; labels it doesn't list are kept. Full columns are listed but can't be chosen.
- `renderCard` replaces the card face; `BoardCardFace` is the default. `describeCard`
  gives screen readers the details after the title (priority, due date, person and
  labels by default).
- `locked` marks cards that can't move. `messages` replaces the help, empty, full and
  filtered copy; `moveMessage` replaces the move announcements (for other languages).
- `today` marks overdue cards; pass the real date.
- `BoardToolbar`'s `label` says what the board holds, like "Cards" or "Issues": it names
  the search ("Search cards") and the group ("Cards tools"). Give it a word other than the
  board's own name, or a step by the board's name finds the search too.

## Touch

A finger scrolls the board from anywhere on a card, and drags it from the grip at its
top corner, which shows on touch screens only. The keyboard and agents don't need it.

Cards slide to their new places, across columns too, on the skin's move timing (see
Theming, Motion), and jump under reduced motion.

## Solid

`@uiset/solid/board` is the same board in Solid 2, with React's props (`class`, not
`className`) and parts: `Board`, `BoardToolbar`, `BoardCardDialog`, `BoardCardFace` and
`createBoardController`.

```tsx
import { createSignal } from "solid-js"
import { Board, BoardCardDialog, createBoardController, type BoardCardData } from "@uiset/solid/board"

const board = createBoardController()
const [lanes, setLanes] = createSignal(start)
const [open, setOpen] = createSignal<BoardCardData | null>(null)

<Board label="Sprint board" controller={board} columns={columns} cards={cards()}
  lanes={lanes()} onLanesChange={(next) => setLanes(next)} onCardOpen={setOpen}
  filter={(card) => matches(card, query(), person())} />
<BoardCardDialog board={board} card={open()} column={columnOf(open())} columns={columns}
  onSave={save} onDelete={remove} onClose={() => setOpen(null)} />
```

A `filter` that reads signals filters again when they change. The keys, moves, limits and
the tab stop are the same code as React's, and so are the browser tests: one set runs on
React's gallery and on Solid's board page. See [Solid](./solid.md).

## Known limits

Releasing a dragged card over a full column, or outside the board, drops it in the last
column it passed that had room. That's UI SDK's `createTransfer` (reported upstream).

## Keys

| Keys                    | Does                                                         |
| ----------------------- | ------------------------------------------------------------ |
| Tab                     | Into the board (one stop) and out                            |
| Up, Down, Home, End     | Cards in a column                                            |
| Left, Right             | The card at the same height in the next column with cards    |
| Space                   | Pick a card up; arrows carry it; Space drops it              |
| Escape                  | Put a carried card back                                      |
| Enter                   | Open the card's details: edit, move to a column, delete      |

Every pickup, move and drop is announced ("Write the spec, moved to Doing, position 2 of
3"). Cards are options in a listbox per column, with `aria-roledescription` "card" and
"column", the way UI SDK's sortable lists describe themselves; the carried card is the
selected one.

## For agents

`moveCard(card, column, position?)`, `addCard(column, title)` and `openCard(card)`, by the
titles people see. The snapshot's items list every card with its column and what its face
shows: an urgent or high priority, the assignee, the due date and the labels, like "Ship the
beta (Doing, Urgent, Grace Hopper, due 2026-12-02; labels: Release)". A board without `onCardOpen` or `onAddCard` tells agents it can't open or add cards.
Deleting goes through the dialog's confirm, marked `data-agent-confirm`.
