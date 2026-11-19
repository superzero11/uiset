# Sortable lists and trees

Lists people put in order. `SortableList` is a ranking, a playlist or a set of steps: drag an
item by its grip, or pick it up with Space and move it with the arrow keys. It's built on UI
SDK's `createReorder`, so every step is read out, and on `createSelection`, so several items
can move together.

```bash
npx shadcn@latest add @uiset/sortable-list
```

## Parts

| Part                                           | Item            | What it is                                                         |
| ---------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| `SortableList`                                 | `sortable-list` | A list drawn from `items` that people put in order                 |
| `SortableListRoot`, `SortableListItemPart`     | `sortable-list` | Its parts, for items drawn your own way                            |
| `sortableList`                                 | `sortable-list` | The primitive, for another framework                               |

## Sortable list

```tsx
import { SortableList } from "@/components/ui/sortable-list"

const features = [
  { value: "search", label: "Faster search" },
  { value: "offline", label: "Offline mode" },
  { value: "export", label: "Export to PDF" },
]
const [order, setOrder] = useState(features.map((f) => f.value))

<SortableList label="Priorities" items={features} value={order} onValueChange={setOrder} numbered />
```

- `label` is required: it names the list for people and agents.
- `items` are `{ value, label, description?, locked? }`. `value` is the key; `label` names
  the item when it's read out.
- `value` with `onValueChange(order, details)` controls the order, as the items' keys, or
  `defaultValue` starts it. Without either, it starts in `items`' order. An item added to
  `items` joins the end; one taken out leaves the order. `details.reason` is `drag`,
  `move-key` or `imperative`.
- `multiple` lets people select several items and move them together. `selected` with
  `onSelectedChange`, or `defaultSelected`, holds the selection. Each item gets a check to
  press, and a dragged selection's copy shows how many it carries.
- `locked` on an item means it can't be picked up or selected, and it shows a lock in place
  of its grip. Other items can still move past it.
- `numbered` shows each item's place, 1 first, updated as an item moves.
- `orientation` is `vertical` (the default), `horizontal` for a row that wraps, like tags,
  or `grid` for tiles. Set it once.
- `renderItem(item, state)` draws an item's face in place of its label and description.
  `state` has `moving`, `dragging`, `selected` and `locked`.
- `help` replaces the instructions read out with the list.

A dragged item's copy follows the pointer while the item itself shows where it will land,
and a list in a scroll area scrolls when the copy nears its edge. On a touch screen, an
item drags from its grip, so a finger elsewhere still scrolls the page.

Items carry `data-moving` while they're picked up, `data-dragging` while a pointer drags
them, and `data-selected`. The list has `data-moving` during a move and `data-orientation`.

## Keys

| Keys                    | Where                     | Does                                                         |
| ----------------------- | ------------------------- | ------------------------------------------------------------ |
| Up, Down (Left, Right in a row) | a sortable list   | Move between items. The list is one tab stop                 |
| Home, End               | a sortable list           | The first and last item                                      |
| Letters                 | a sortable list           | The next item whose name starts with them                    |
| Space, Enter            | an item                   | Pick it up, or drop it where it is                           |
| Arrows, Home, End       | an item that's picked up  | Move it one place, or to either end                          |
| Escape                  | an item that's picked up  | Put it back where it was                                     |
| Tab                     | an item that's picked up  | Put it back, and move on                                     |
| Shift+Space             | a list with `multiple`    | Select or let go of the item                                 |
| Shift with the arrows   | a list with `multiple`    | Select the run of items to the one you reach                 |
| Ctrl+A (Command+A on a Mac) | a list with `multiple` | Select every item that can move, or none                    |
| Escape                  | a list with a selection   | Let go of the selection                                      |

With a pointer: drag an item. With `multiple`, press an item's check, or Shift-click,
Command-click or Control-click it, to select; dragging a selected item carries the selection.

## For agents

- **SortableList** is listed by its `label`, with each item as data (`{ value, label,
  position }`). `moveItem(item, position)` moves an item, by its key or its label, to a
  place counted from 1; pass a list of items to move several, in their order.
  `selectItems(items)` sets the selection, with `multiple`. Moving a locked item, or a name
  the list doesn't have, fails and says why.

## Web Components

`<uiset-sortable-list>` is in [Web Components](./web-components.md#content-and-forms), on the
same primitive:

```html
<uiset-sortable-list id="playlist" label="Playlist" multiple></uiset-sortable-list>
```

```ts
const playlist = document.querySelector("uiset-sortable-list")! // typed by @uiset/web
playlist.items = [
  { value: "intro", label: "Intro", description: "0:48", locked: true },
  { value: "harbor", label: "Harbor Lights", description: "3:52" },
]
playlist.addEventListener("valuechange", (e) => save(e.detail.value)) // preventDefault() refuses
```

- `items` is a property. `value` (the order) and `selected` are live: reading gives a copy,
  and setting them fires nothing. Keys a set order leaves out follow it, in `items`' order.
- `label`, `multiple`, `numbered`, `orientation` and `help` are attributes.
- It fires `valuechange` and `selectedchange`, and `api` has `moveItem` and `selectItems`.
