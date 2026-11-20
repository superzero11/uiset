# Sortable lists and trees

Lists and trees people put in order. `SortableList` is a ranking, a playlist or a set of
steps: drag an item by its grip, or pick it up with Space and move it with the arrow keys.
It's built on UI SDK's `createReorder`, so every step is read out, and on `createSelection`,
so several items can move together. `SortableTree` is an outline, a page tree or layers:
rows move up and down and sideways to change their level, with what's under them, on UI
SDK's `createTreeReorder`.

```bash
npx shadcn@latest add @uiset/sortable-list @uiset/sortable-tree
```

## Parts

| Part                                           | Item            | What it is                                                         |
| ---------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| `SortableList`                                 | `sortable-list` | A list drawn from `items` that people put in order                 |
| `SortableListRoot`, `SortableListItemPart`     | `sortable-list` | Its parts, for items drawn your own way                            |
| `sortableList`                                 | `sortable-list` | The primitive, for another framework                               |
| `SortableTree`                                 | `sortable-tree` | A tree drawn from nested `items` that people reorder and nest      |
| `SortableTreeRoot`, `SortableTreeRowPart`      | `sortable-tree` | Its parts, for rows drawn your own way                             |
| `sortableTree`, `flatten`, `build`             | `sortable-tree` | The primitive, and nested items to rows and back                   |

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
and a list in a scroll area scrolls when the copy nears its edge. Items slide to their new
places on the skin's move timing (see Theming, Motion), and jump under reduced motion. On a touch screen, an
item drags from its grip, so a finger elsewhere still scrolls the page.

Items carry `data-moving` while they're picked up, `data-dragging` while a pointer drags
them, and `data-selected`. The list has `data-moving` during a move and `data-orientation`.

## Sortable tree

```tsx
import { SortableTree, type SortableTreeItem } from "@/components/ui/sortable-tree"

const [pages, setPages] = useState<SortableTreeItem[]>([
  { value: "guides", label: "Guides", children: [{ value: "install", label: "Installation" }] },
  { value: "api", label: "API", children: [] },
  { value: "faq", label: "FAQ" },
])

<SortableTree label="Pages" items={pages} onItemsChange={setPages} defaultExpanded={["guides"]} />
```

- `label` is required: it names the tree for people and agents.
- `items` are nested `{ value, label, children?, locked? }`. An item with `children` is a
  branch, even with none yet (`children: []`); only branches hold other items.
- `items` with `onItemsChange(items, details)` controls the tree, or `defaultItems` starts
  it. `onItemsChange` runs once, when a move is dropped, with the items nested again; each
  keeps its own fields. `details` has `key` (what moved), `parent` (its new branch, or `null`
  at the top) and `index` (its place there, from 0), and `reason`.
- `expanded` with `onExpandedChange`, or `defaultExpanded`, holds the open branches. A
  branch something is dropped into opens, so the row stays in view, and a branch a row is
  carried into shows open while it's there.
- A row dropped inside an item that isn't a branch goes back, and the reason is read out;
  while it's carried there, it's marked in the danger tone. `refusedMessage` words that.
- `maxDepth` limits how deep an item and those under it go, from 0. `locked` on an item
  means it can't be picked up.
- `onAction(key)` runs for Enter or a press on an item that isn't a branch, like opening a
  page. Branches open and close instead.
- `icons` adds folder and file icons. `renderItem(item, row)` draws a row's face after its
  arrow; `row` has `depth`, `branch`, `expanded`, `position`, `size`, `moving`, `dragging`
  and `invalid`.

Rows are drawn flat, indented `--sortable-tree-indent` (20px) a level, which is also how far
a drag goes sideways for each level. They carry `data-branch`, `data-moving`,
`data-dragging` and `data-invalid`; each grip shows on hover and focus, and always on a
touch screen, where a row drags from it.

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
| Up, Down, Home, End     | a sortable tree           | Move between the rows that show. The tree is one tab stop    |
| Right                   | a branch                  | Open it, or go to its first item if it's open                |
| Left                    | a row                     | Close a branch that's open, or go to the row's branch        |
| Enter                   | a row                     | Open or close a branch; `onAction` on anything else          |
| Space                   | a row                     | Pick it up with everything under it, or drop it              |
| Up, Down                | a row that's picked up    | Move it between the rows that show                           |
| Left, Right             | a row that's picked up    | Take it out a level, or in one                               |
| Escape                  | a row that's picked up    | Put it back where it was                                     |

With a pointer: drag an item. With `multiple`, press an item's check, or Shift-click,
Command-click or Control-click it, to select; dragging a selected item carries the selection.
In a tree, drag a row up or down, and sideways a level for every 20px; a press on a branch
opens or closes it. In right-to-left text, Left and Right swap.

## For agents

- **SortableList** is listed by its `label`, with each item as data (`{ value, label,
  position }`). `moveItem(item, position)` moves an item, by its key or its label, to a
  place counted from 1; pass a list of items to move several, in their order.
  `selectItems(items)` sets the selection, with `multiple`. Moving a locked item, or a name
  the list doesn't have, fails and says why.
- **SortableTree** is listed by its `label`, with each item's level and branch.
  `moveItem(item, into, position)` moves an item and what's under it into a branch (`null`
  for the top level), at a place from 1 (the end without one). `expandItem` and
  `collapseItem` open and close branches, and `openItem` runs `onAction`. A move into an
  item that isn't a branch, into itself, or of a locked item fails and says why.

## Web Components

`<uiset-sortable-list>` and `<uiset-sortable-tree>` are in
[Web Components](./web-components.md#content-and-forms), on the same primitives:

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

```html
<uiset-sortable-tree id="pages" label="Pages" icons></uiset-sortable-tree>
```

```ts
const pages = document.querySelector("uiset-sortable-tree")!
pages.items = [{ value: "guides", label: "Guides", children: [] }, { value: "faq", label: "FAQ" }]
pages.expanded = ["guides"]
pages.addEventListener("itemschange", (e) => save(e.detail.value)) // the items, nested again
```

- `items` and `expanded` are live: after a move, `items` reads the tree as it is. Setting
  them fires nothing.
- `label`, `icons`, `max-depth` and `help` are attributes.
- It fires `itemschange`, `expandedchange` and `action`, and `api` has `moveItem`,
  `expandItem`, `collapseItem` and `openItem`.
