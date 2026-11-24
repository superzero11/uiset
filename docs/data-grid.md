# Data Grid

A grid for real data, built on UI SDK: thousands of rows, spreadsheet keys, editing in
place, and actions an agent can call. One item, `data-grid`, gives you `DataGrid`,
`DataGridToolbar` and the framework-free pieces under them.

```bash
npx shadcn@latest add @uiset/data-grid
```

## Why it's built this way

UI SDK ships the hard behaviors a grid needs, and the grid is those behaviors wired
together, not a rewrite of them:

| Need                                         | UI SDK piece                       |
| -------------------------------------------- | ---------------------------------- |
| One tab stop, arrows, Home/End, Page keys    | `createGridFocus`                  |
| Select a block, rows or columns; copy it     | `createCellRange`, `textToCells`   |
| Edit in place: Enter, F2, typing, Escape     | `createInlineEdit`                 |
| Choose from a column's `options`             | `Combobox`                         |
| Render 10,000 rows, reveal one off screen    | `createVirtualizer`                |
| Column menu, View menu, filters, grouping    | `Menu`, `Popover`, `Select`        |
| Drag a column edge                           | `bindDrag`                         |
| Announce sorts, counts and edits             | `announce`                         |
| Agents sort, filter, select and edit         | the primitive's `agent` key        |

Sorting, filtering, grouping and CSV export are plain functions in `data-grid/view.ts`,
so they run on a server or in a worker too.

## Use

```tsx
import { DataGrid, DataGridToolbar, type DataGridColumn } from "@/components/ui/data-grid"

const columns: DataGridColumn<Order>[] = [
  { id: "id", header: "Order", value: (o) => o.id, pinned: true, hideable: false },
  { id: "customer", header: "Customer", value: (o) => o.customer, editable: true },
  { id: "status", header: "Status", value: (o) => o.status, options: ["Paid", "Pending"], editable: true },
  {
    id: "amount",
    header: "Amount",
    type: "number",
    value: (o) => o.amount,
    text: (o) => money.format(o.amount),
    editable: true,
  },
  { id: "rush", header: "Rush", type: "boolean", value: (o) => o.rush, editable: true },
]

<DataGrid
  label="Orders"
  rows={orders}
  columns={columns}
  getRowId={(o) => o.id}
  selectable
  onCellEdit={({ rowId, column, value }) => save(rowId, column, value)}
  persist="orders-grid"
  height="30rem"
>
  <DataGridToolbar filename="orders" selectionActions={<Button>Mark paid</Button>} />
</DataGrid>
```

- `value` is what sorts and filters; `text` is what shows and copies; `render` replaces
  what shows (a badge, a link) without changing either.
- `type` sets how an edit is read, with UI SDK's `parseNumber` and `parseDate` in
  `locale`: `"number"` follows the locale's grouping and accepts a currency sign
  (`$1,200.50`) but refuses words (`12 units`); `"date"` reads "Nov 20", "2026-11-20" or
  the locale's order and stores that calendar day; `"boolean"` flips with Space.
  `options` limits an edit to a list. Its editor is UI SDK's Combobox in the cell: the
  list opens under the cell in the skin's own style, typing narrows it, and only an
  option can be saved. Pasted and agent edits are checked against the list too.
- `onCellEdit` gets the parsed value. Return `false` to keep the editor open. Without
  it, nothing is editable.
- `sort`, `query`, `filters`, `groupBy`, `selected`, `columnState` and `density` can
  each be controlled (keep filters in the URL, say), with a `default…` and an
  `on…Change`.
- Pass `locale` when rendering on a server, so counts format the same on both sides.
- `persist` saves column order, widths, visibility, pinning and density in
  `localStorage`, read after the first render so server markup matches.

## Toolbar parts

`DataGridToolbar` is one arrangement of parts you can use on their own, anywhere inside
a `DataGrid`: `DataGridSearch`, `DataGridFilters`, `DataGridGroupBy`, `DataGridViewMenu`,
`DataGridExport` and `DataGridSelection` (the count, your bulk actions, Clear selection).
`useDataGrid()` gives a custom part the same state.

```tsx
<DataGrid label="Orders" rows={orders} columns={columns} getRowId={(o) => o.id} selectable>
  <div className="my-toolbar">
    <DataGridSearch />
    <DataGridSelection>
      <Button>Mark paid</Button>
    </DataGridSelection>
    <DataGridExport filename="orders" />
  </div>
</DataGrid>
```

## Keys

| Keys                           | Where         | Does                                         |
| ------------------------------ | ------------- | -------------------------------------------- |
| Arrows, Home, End, Page keys   | anywhere      | Move one cell, to the row's ends, by a page  |
| Control+Home, Control+End      | anywhere      | First cell, last cell (rows render on the way) |
| Enter, Space                   | header        | Sort ascending, descending, off              |
| Shift+Enter                    | header        | Add the column to the sort                   |
| Shift+F10 or the Menu key      | header        | Column menu: sort, group, pin, move, hide    |
| Alt+Left, Alt+Right            | header        | Narrower, wider (Option on a Mac)            |
| Alt+Shift+Left, Alt+Shift+Right | header       | Move the column                              |
| Enter, F2, or start typing     | editable cell | Edit; Enter saves, Escape cancels, Tab saves |
| Up, Down, or keep typing       | a list cell's editor | Move through the options, or narrow them; Enter or Tab saves the highlighted one |
| Space                          | yes/no cell   | Flip it                                      |
| Space                          | first column  | Check the row                                |
| Enter                          | group row     | Open or close the group                      |
| Shift+Arrows, Shift+click      | anywhere      | Select a block                               |
| Shift+Space, Control+Space     | anywhere      | Select the rows, the columns                 |
| Control+A, Escape              | anywhere      | Select all cells, clear the block            |
| Control+C, Control+V           | anywhere      | Copy the block; paste into editable cells    |

The grid's description lists these for screen reader users, and every sort, resize,
move, paste and filter result is announced. Each header also has a column menu button
for pointers, touch and touch screen readers (it never takes the tab stop), and the menu
has **Wider** and **Narrower**, so resizing never needs a drag.

## For agents

The grid offers `sortBy`, `filter`, `filterColumn`, `selectRows`, `clearSelection`,
`editCell`, `groupBy` and `showColumn`. Columns are named by header and rows by their id
or first column, the way a person reads them. The snapshot shows what the grid is doing
(rows shown, sort, filter, grouping, selection), and `query` returns every row, including
the ones not rendered.

A step that can't run says why, so the agent can try again:

```txt
No column "Total" in Orders. Its columns: Order, Customer, Region, Status, Amount, Placed, Rush.
Amount needs a number
Status must be one of Paid, Pending, Refunded, Failed
```

Edits go through the same parsing and `onCellEdit` as a person's, so your validation
applies to both.

## Accessibility notes

- `role="grid"` with `aria-rowcount` and `aria-rowindex`, so screen readers know the
  full size while only visible rows render.
- The primary sort column carries `aria-sort`. Group cells carry `aria-expanded` (a grid
  row may not; only a treegrid's can).
- Row checkboxes are real checkboxes that never take focus; the cell keeps it, so the
  arrows keep working after a click. Shift-click ranges follow the rows on screen. They
  carry `data-slot="checkbox"` and its state, so each skin draws them like its other
  checkboxes.
- The editor covers its cell, says what's wrong with `aria-invalid` and a message, and
  announces it.
- Range outlines follow the reading direction, and the focused cell's ring is an outline,
  so both hold in right-to-left and in forced colors.

## Solid

`@uiset/solid/data-grid` is the same grid in Solid 2, with React's props (`class`, not
`className`) and the same parts: `DataGrid`, `DataGridToolbar` and its pieces, and
`useDataGrid` for parts of your own.

```tsx
import { createSignal } from "solid-js"
import { DataGrid, DataGridToolbar, type DataGridColumn } from "@uiset/solid/data-grid"

const [rows, setRows] = createSignal(orders)

<DataGrid label="Orders" rows={rows()} columns={columns} getRowId={(o) => o.id} selectable
  onCellEdit={({ rowId, column, value }) => {
    setRows((all) => all.map((o) => (o.id === rowId ? { ...o, [column]: value } : o)))
  }}>
  <DataGridToolbar filename="orders" />
</DataGrid>
```

The keys, focus, ranges, editing and clipboard are the same code as React's, and so are the
browser tests: one set runs on React's kit page and on Solid's. See [Solid](./solid.md).

## Limits, for now

- Rows have one height per density; wrapping text is cut with an ellipsis.
- Columns aren't virtualized; hundreds of columns will be slow.
- Find in page only finds rendered rows; use the search box. `createVirtualizer`'s
  `findable` can lift this later.
