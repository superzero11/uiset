<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

### Waterfall

- `items` (`WaterfallData`): The spans, each with a `value`, a `label`, a `start`, a `duration` and the spans it started as `children`.
- `range?` (`[number, number]`): The stretch of time the axis shows, as `[start, end]` in milliseconds. Bars outside it shrink to its edges. Change it to zoom or pan.
- `value?` (`string | null`): The selected span's value. Pass it to control the selection. `null` selects nothing.
- `defaultValue?` (`string | null`): The span selected at first, when uncontrolled.
- `onValueChange?` (`((value: string | null, details: ChangeDetails<WaterfallValueChangeReason>) => void)`): Runs when the selection wants to change. `details.reason` says why, and `details.cancel()` stops it.
- `expanded?` (`string[]`): The expanded spans' values. Pass it to control which spans show their children.
- `defaultExpanded?` (`string[]`): The spans expanded at first, when uncontrolled.
- `onExpandedChange?` (`((expanded: string[], details: ChangeDetails<WaterfallExpandedChangeReason>) => void)`): Runs when spans want to expand or collapse. `details.reason` says why, and `details.cancel()` stops it.
- `onHighlight?` (`((value: string, details: ListHighlightDetails) => void)`): Runs when the keyboard moves focus to a row, with its place among the rows that show, from 0. A waterfall that renders only the rows in view scrolls that row into view here, so it can take focus once it renders.
- `format?` (`NumberFormat`): How times read on the axis and to screen readers: `Intl.NumberFormat` options for a number of milliseconds, or a function of it.
- `locale?` (`string`): The locale times are formatted in. Defaults to the page's `lang`, or the browser's language without one, once the page is interactive. Server markup uses English until then, so it never disagrees with the client.
- `getBarLabel?` (`((item: WaterfallDataItem, details: WaterfallBarLabelDetails) => string)`): What screen readers hear for a span's bar. Set it in the page's language.
- `controller?` (`object`): Drives the waterfall from anywhere. Create one with `createWaterfallController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### WaterfallAxis

- `maxTicks?` (`number`): The most ticks the axis shows. Ticks fall on round times, so it may show fewer.

### WaterfallTick and WaterfallMark

- `time` (`number`): The moment it marks, in milliseconds.

### WaterfallRow

- `value` (`string`): The value of the span the row shows.

### Items as Data

Each span in `items`:

- `value` (`string`): Identifies the span. Unique in the waterfall.
- `label` (`string`): What its row shows, and what typeahead matches.
- `start` (`number`): When it starts, in milliseconds, on the same clock as every other span.
- `duration` (`number`): How long it lasts, in milliseconds.
- `children?` (`WaterfallDataItem[]`): The spans it started. Leave it out for a span with none.

Each row `visibleWaterfallRows(items, expanded)` returns:

- `item` (`WaterfallDataItem`): The span this row shows, the same object you passed in.
- `parent` (`string | null`): The value of the span it's nested in, or `null` at the top level.
- `level` (`number`): Its depth, 1 at the top level.
- `index` (`number`): Its place among the rows that show, from 0.

### State

What render functions, state-based class names and slots receive, per part.

`Waterfall`:

- `range` (`[number, number]`): The stretch of time the axis shows, as `[start, end]` in milliseconds.

`WaterfallAxis`:

- `ticks` (`WaterfallTickData[]`): The ticks it shows, at round times inside the range.

`WaterfallTick` and `WaterfallMark`:

- `time` (`number`): The moment it marks, in milliseconds.
- `label` (`string`): The time as `format` and the locale show it.
- `position` (`number`): Where it sits between the range's start and end, from 0 to 100.
- `outside` (`boolean`): Whether its time is outside the range, so it doesn't show on the axis.

`WaterfallRow`, and its `WaterfallRowHeader`, `WaterfallIndicator`, `WaterfallCell` and `WaterfallBar`:

- `expanded` (`boolean`): Whether it's a span with children that's expanded.
- `selected` (`boolean`): Whether it's the selected span.
- `branch` (`boolean`): Whether its span has children.
- `level` (`number`): Its depth, 1 at the top level.

### Reasons

Why spans expanded or collapsed:

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

Why the selection changed:

- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.

### Controller

Create one with `createWaterfallController()` and pass it as `controller`.

- `getValue()` (`() => string | null`): The selected span's value, or `null`.
- `setValue(value, options?)` (`(value: string | null, options?: WaterfallChangeOptions<WaterfallValueChangeReason> | undefined) => boolean`): Selects a span, or nothing with `null`. Returns false when canceled.
- `getExpanded()` (`() => string[]`): The values of the expanded spans.
- `setExpanded(expanded, options?)` (`(expanded: string[], options?: WaterfallChangeOptions<WaterfallExpandedChangeReason> | undefined) => boolean`): Expands exactly these spans. Returns false when canceled.
- `isExpanded(value)` (`(value: string) => boolean`): Whether a span is expanded.
- `expand(value, options?)` (`(value: string, options?: WaterfallChangeOptions<WaterfallExpandedChangeReason> | undefined) => boolean`): Expands a span.
- `collapse(value, options?)` (`(value: string, options?: WaterfallChangeOptions<WaterfallExpandedChangeReason> | undefined) => boolean`): Collapses a span. Focus inside it moves to its row.
- `toggle(value, options?)` (`(value: string, options?: WaterfallChangeOptions<WaterfallExpandedChangeReason> | undefined) => boolean`): Expands a collapsed span, or collapses an expanded one.
- `expandAll(options?)` (`(options?: WaterfallChangeOptions<WaterfallExpandedChangeReason> | undefined) => boolean`): Expands every span with children.
- `collapseAll(options?)` (`(options?: WaterfallChangeOptions<WaterfallExpandedChangeReason> | undefined) => boolean`): Collapses every span.
- `reveal(value)` (`(value: string) => void`): Expands a span's ancestors and focuses its row, through `onHighlight` when it isn't rendered.
- `focus(value?)` (`(value?: string | undefined) => void`): Focuses a span's row, or the row with the tab stop.

## Accessibility

The waterfall follows the [WAI-ARIA treegrid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/). Rows have the `row` role with `aria-level`, `aria-posinset`, `aria-setsize`, `aria-selected="true"` on the selected row, and `aria-expanded` on spans with children. `WaterfallRowHeader` is a `rowheader`, so screen readers repeat the span's name as focus moves down a column, and each `WaterfallBar` is a `gridcell` labeled with when its span starts and how long it lasts, like "Starts at 120 ms, lasts 340 ms". Times are formatted with `Intl` in the page's language.

### Keyboard

The waterfall has one tab stop. Tab enters at the selected row, or the first row, then returns to the row or cell focused last.

| Key                  | Action                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------- |
| Down / Up Arrow      | Focus the next or previous row. In a cell, keep the column.                             |
| Right Arrow          | On a row, expand it, or move into its first cell. In a cell, move right.                |
| Left Arrow           | In a cell, move left, then back to the row. On a row, collapse it, or focus its parent. |
| Home / End           | Focus the first or last row. In a cell, the row's first or last cell.                   |
| Ctrl+Home / Ctrl+End | Focus the first or last row, keeping the column.                                        |
| Page Up / Page Down  | Move a page of rows.                                                                    |
| Enter / Space        | Select the row.                                                                         |
| Typing               | Focus the next row whose label starts with that text.                                   |

Command replaces Ctrl on a Mac. In right-to-left text, Left and Right swap.

### Tested Behavior

Every line below is an automated test.

**Rows**

- Spans start collapsed, and only top-level rows show.
- Clicking the indicator expands a span without selecting it.
- Clicking a row's cell selects the row and focuses the cell.
- A change can be canceled.
- A controller expands and collapses everything, and reveals a span.
- Collapsing a span from its indicator moves focus out of it.

**Keyboard**

- The waterfall is one tab stop.
- Down and Up move between rows, Home and End to the first and last.
- Right expands a collapsed row, then moves into its cells.
- Left moves back through the cells to the row, collapses it, then moves to the parent.
- Down and Up in a cell keep its column.
- Home and End in a cell go to the row's ends, and with Control to the column's.
- A focused cell keeps the tab stop.
- A cell hidden by a collapse gives up the tab stop.
- Enter and Space select the focused row.
- Typing moves to the next row whose name starts with it.

**Time axis**

- Each row places its bar as a share of the range.
- Each bar tells screen readers when its span starts and how long it lasts.
- The axis shows round times, hidden from screen readers.

Runs in React, Vue and web components.
