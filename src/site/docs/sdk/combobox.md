<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.13, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Combobox

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `query?` (`string`): The input's text, which filters the list. Pass it to control it. Choosing an item sets it to the item's label, or empties it with `multiple`.
- `defaultQuery?` (`string`): The input's text at first, when uncontrolled. Defaults to the selected item's label.
- `onQueryChange?` (`((query: string, details: ChangeDetails<ComboboxQueryChangeReason>) => void)`): Runs when the input's text wants to change: typing, choosing an item, or closing with text that wasn't chosen.
- `open?` (`boolean`): Whether the list is open. Pass it to control it.
- `defaultOpen?` (`boolean`): Whether the list starts open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<ComboboxOpenChangeReason>) => void)`): Runs when the list wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the list has finished opening or closing, after any animation.
- `maxSelected?` (`number`): With `multiple`, how many items can be selected. Once reached, the other items are disabled.
- `items?` (`ListData<T>`): The items as data. Renders the list for you, and filters it without rendering every item.
- `emptyItems?` (`ListData<T>`): Items shown instead of `items` while the input is empty, like recent choices or suggestions. Groups work, like `{ type: "group", label: "Recent", items }`. Needs `items`.
- `filter?` (`ListFilter<T>`): How typing narrows the list: `"contains"`, `"startsWith"`, a function of the item and the text, whose numeric result also sorts data items, or `false` to keep every item, for results a server already filtered.
- `itemToValue?` (`((value: T) => string)`): The string an item's value submits as and is identified by, for object values. Strings pass through, and objects use their `value` or `id`.
- `itemToLabel?` (`((value: T) => string)`): The text a value shows, for values whose item isn't rendered, like async results.
- `isItemEqualToValue?` (`((itemValue: T, value: T) => boolean)`): Whether an item's value is the selected value, for object values that aren't the same object.
- `autoHighlight?` (`"always" | "selected" | boolean`): Whether the first matching item is highlighted while typing, so Enter chooses it. `"always"` also highlights the selected item, or the first, when the list opens, so arrows move from there. `"selected"` highlights only the selected item when the list opens, and nothing when none is.
- `keepQuery?` (`boolean`): With `multiple`, whether the input keeps its text after an item is chosen.
- `pendingAnnouncement?` (`string`): What screen readers hear once the Create part's `onCreate` has been pending for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `allowCustomValue?` (`boolean`): Whether text that matches no item becomes the value, when Enter is pressed with nothing highlighted, or, without `multiple`, when the list closes. The value is the text itself.
- `status?` (`AsyncOptionsStatus`): Whether results are loading or failed, for the status and empty parts. Sets `aria-busy` on the list while loading.
- `onHighlight?` (`((value: T | null, details: ListHighlightDetails) => void)`): Runs when the highlight moves, with the item's index among the visible items, so a virtualized list can scroll to it.
- `onLoadMore?` (`(() => void)`): Runs when the highlight or scrolling reaches the last item, so the next page can load, like `createAsyncOptions`'s `loadMore`. Not again for the same items, unless the last load failed.
- `announcement?` (`((change: ListAnnouncement) => string | null | undefined)`): What screen readers hear after typing pauses, when no `ComboboxStatus` is rendered, and when a chip is removed. Return null for nothing.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first.
- `modal?` (`"pointer" | boolean`): `false`: the page stays usable while the list is open. `"pointer"`: an outside press only closes the list. `true`: also locks scroll and makes the rest of the page inert.
- `presentation?` (`PresentationSetting<"popover">`): How the list presents. `"sheet"` slides it up from the bottom of the screen with the input in its header, where it can be swiped away, and `"auto"` does that on small touch screens. A tap that opens a sheet leaves the keyboard closed until the input in the header is tapped. Decided each time it opens; the server renders `"popover"` for `"auto"`.
- `disabled?` (`boolean`): Disables the combobox like a native input: it can't be focused or changed, and the value isn't submitted.
- `readOnly?` (`boolean`): Keeps the combobox focusable and its value submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission until a value is selected, with the browser's own message.
- `name?` (`string`): The name the value submits under. Without one, the combobox submits nothing.
- `form?` (`string`): The id of a form to belong to, when the combobox isn't inside that form.
- `controller?` (`object`): Opens, closes, reads and sets the combobox from anywhere. Create one with `createComboboxController()`.
- `dismissible?` (`boolean`): Whether Escape, an outside press, focus or the window leaving, Android's back gesture and a sheet's swipe can close it. Triggers, Close parts and the controller always can. Pass `false` while it holds unsaved work, and ask in `onDismissAttempt`.
- `onDismissAttempt?` (`function`): Runs when `dismissible` refused a dismissal made on purpose: Escape, an outside press, back or a swipe. Focus or the window leaving is refused without it. Ask "Discard changes?" here.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `multiple?` (`boolean`): Whether several items can be selected. The value is then a list, the list stays open as items toggle, and the input empties after each choice. Whether several items can be selected.
- `value?` (`T | T[] | null`): The selected value. Pass it to control the combobox. `null` selects nothing. The selected values. Pass it to control the combobox. The selected value, or values with `multiple`. Pass it to control the combobox.
- `defaultValue?` (`T | T[] | null`): The value selected at first, when uncontrolled. A form reset returns to it. The values selected at first, when uncontrolled. A form reset returns to them. The value or values selected at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`union`): Runs when a user, a form reset or a controller wants to change the value. `details.reason` says why, and `details.cancel()` stops it.

`announcement` receives `{ type: "results", count, query, loading }` or `{ type: "removed", label }` and returns the words, or `null` for silence. The default is English: "3 results", "No results", "Loading" or "France removed".

### ComboboxLabel

The input's visible label. Renders a `label`.

### ComboboxInput

The text field that filters the list and shows the chosen label. Renders an `input`.

### ComboboxTrigger

Opens and closes the list. Renders a `button`, kept out of the tab order while the input sits beside it.

### ComboboxClear

- `keepMounted?` (`boolean`): Whether the clear button stays in the page while there's nothing to clear.

### ComboboxChips

Holds the chips and the input for a multiple selection. Renders a `div`.

### ComboboxValue

- `maxLabels?` (`number`): With `multiple`, how many labels the `label` in its state shows before the rest are counted, as in "France, Chile and 2 more", joined the way the page's language joins lists, or in English with the default `getMoreLabel`.
- `getMoreLabel?` (`((count: number) => string)`): The words for the labels past `maxLabels`.

### ComboboxChip

- `value` (`T`): The selected value this chip shows.

### ComboboxChipRemove

Removes its chip's value. Renders a `button`. Takes the same props as `ComboboxChip`.

### ComboboxChipsOverflow

Turns collapsing on for the chips around it, and shows how many are hidden. Renders a `span`.

### ComboboxValueIcon

Shows the selected item's icon beside the input. It takes no props of its own, and no children.

### ComboboxContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the input the list opens on.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the list lines up with the input along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the input and the list, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the input, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `keepMounted?` (`boolean`): Whether the list stays in the page, hidden, while closed.

### ComboboxArrow

Points from the popup to its anchor, following the side chosen after collision handling. Renders a `div`.

### ComboboxStatus

Announces loading, errors and result counts. Renders a `div` with the status role.

### ComboboxEmpty

Shows while no option matches. Renders a `div`.

### ComboboxList

Holds the options. Renders a `div` with the listbox role.

### ComboboxSelectAll

Toggles every matching, enabled option in its group, or outside a group. Renders a `div` with the option role.

### ComboboxGroup

Groups options under a label. Renders a `div` with the group role.

### ComboboxGroupLabel

Names its group. Renders a `div`.

### ComboboxItem

- `label?` (`string`): The text the input shows once chosen, and filtering matches, when the content isn't plain text. Not the accessible name: use `aria-label` for that.
- `keywords?` (`string[]`): More words filtering matches.
- `disabled?` (`boolean`): Keeps the item from being chosen. The keyboard and the pointer skip it. Sets `data-disabled` and `aria-disabled`.
- `index?` (`number`): The item's position among all visible items, for virtualized lists that render only some. Sets `aria-posinset` and `aria-setsize`.
- `value` (`T`): What the value becomes when the item is chosen. A string, or any value with `itemToValue`.

### ComboboxItemIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

### ComboboxItemText

Shows its item's label, and marks what matched the query. Renders a `span`.

### ComboboxItemIndicator

- `keepMounted?` (`boolean`): Whether the indicator stays in the page while its item isn't selected.

### ComboboxSeparator

Separates options or groups. Renders a `div` with the separator role.

### ComboboxCreate

- `onCreate?` (`((query: string) => unknown)`): Runs with the input's text when the create option is chosen. It doesn't change the value by itself. Return a Promise to mark the option pending until it settles; the list closes (or the input empties, with `multiple`) once it resolves.
- `minLength?` (`number`): How many characters the text needs before the option shows.

### Items as Data

Each item in `items`. Groups are `{ type: "group", label, items }` and separators `{ type: "separator" }`.

- `value` (`T`): Identifies the item, and is what choosing it reports. A string, or any value with `itemToValue`.
- `label` (`string`): The text shown and matched by typeahead and filtering. A select's trigger shows it once chosen.
- `keywords?` (`string[]`): More words filtering matches, like `["team"]` for a plan called Pro.
- `disabled?` (`boolean`): Keeps the item from being chosen. The keyboard skips it, like in a native select.

### Async Options

[Async Options](https://ui-sdk.dev/docs/react/hooks/async-options) covers loading, paging, and retries.

### State

What render functions, state-based class names and slots receive, per part.

`ComboboxInput`:

- `open` (`boolean`): Whether the list is open.
- `disabled` (`boolean`): Whether the combobox is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the combobox keeps its value but refuses changes, from its `readOnly` option.
- `required` (`boolean`): Whether a value must be selected before the form submits, from its `required` option.

`ComboboxTrigger`:

- `open` (`boolean`): Whether the list is open.
- `disabled` (`boolean`): Whether the combobox is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the combobox keeps its value but refuses changes, from its `readOnly` option.
- `required` (`boolean`): Whether a value must be selected before the form submits, from its `required` option.

`ComboboxContent` and `ComboboxList`:

- `open` (`boolean`): Whether the list is open. False while it animates out.
- `presentation` (`"popover" | "sheet"`): How it presents this time it's open.
- `multiple` (`boolean | undefined`): Whether several items can be selected.
- `status` (`AsyncOptionsStatus`): Whether results are loading or failed.
- `items` (`ListData<unknown>`): The visible items, for rendering a virtualized list yourself.

`ComboboxItem`:

- `highlighted` (`boolean`): Whether the item is highlighted, by the keyboard or the pointer.
- `selected` (`boolean`): Whether its value is in the combobox's value, compared with `isItemEqualToValue` when you pass one.
- `disabled` (`boolean`): Whether the item can't be chosen, by itself or because `maxSelected` is reached.
- `maxReached` (`boolean`): Whether `maxSelected` is reached and the item isn't selected, which is why it's disabled.

`ComboboxItemIndicator`:

- `selected` (`boolean`): Whether its item is selected. While false, the indicator isn't shown unless `keepMounted` is set.

`ComboboxItemIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

`ComboboxCreate`:

- `query` (`string`): The text the option would create.
- `highlighted` (`boolean`): Whether the option is highlighted.
- `pending` (`boolean`): Whether `onCreate`'s Promise is running.
- `error` (`unknown`): Why the last `onCreate` failed, until the next try.

`ComboboxEmpty`:

- `loading` (`boolean`): Whether results are loading.
- `empty` (`boolean`): Whether no item matches.
- `query` (`string`): The text the list is filtered by.

`ComboboxStatus`:

- `status` (`"idle" | "loading" | "error"`): Whether results are loading or failed.
- `loading` (`boolean`): Whether results are loading.
- `count` (`number`): How many items are visible.

`ComboboxValue`:

- `value` (`unknown`): The selected value: one, `null`, or a list with `multiple`.
- `labels` (`string[]`): Each selected item's label, in the order they were selected.
- `label` (`string`): The labels joined with commas, or with `maxLabels`, as a list in the page's language, like "France, Chile and 2 more". An empty string for none.

`ComboboxChip`:

- `value` (`unknown`): The selected value the chip stands for, from its `value` prop.
- `label` (`string`): The text for the value: from `itemToLabel`, its item's label, or the value itself.
- `disabled` (`boolean`): Whether the combobox is disabled or read-only, so the chip can't be removed.

`ComboboxClear` and `ComboboxChipRemove`:

- `disabled` (`boolean`): Whether the combobox is disabled or read-only.

`ComboboxArrow`:

- `open` (`boolean`): Whether the list is open.

`ComboboxItemText`:

- `segments` (`MatchSegment[]`): The text in pieces, each marked when it matched. Joined, they're the whole text.
- `matched` (`boolean`): Whether any piece matched.

`ComboboxSelectAll`:

- `checked` (`boolean`): Whether every item it covers is selected.
- `indeterminate` (`boolean`): Whether some of its items are selected, but not all.
- `highlighted` (`boolean`): Whether it's highlighted, by the keyboard or the pointer.
- `disabled` (`boolean`): Whether it can't be used: nothing it covers can be chosen, or choosing them all would pass `maxSelected`.

`ComboboxChipsOverflow`:

- `count` (`number`): How many chips don't fit and are hidden.
- `labels` (`string[]`): The labels of the hidden chips.

### Reasons

`details.reason` says why the value changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `clear-press` (`MouseEvent | KeyboardEvent`): A Clear part was pressed, like on an input, a select or a combobox.
- `remove-press` (`MouseEvent | KeyboardEvent`): A chip's remove part was pressed, or Backspace or Delete removed a chip or a span.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

Why the text changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `clear-press` (`MouseEvent | KeyboardEvent`): A Clear part was pressed, like on an input, a select or a combobox.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `reset` (`none`): A form reset.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

And why the list opened or closed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

With `dismissible` false, the refused dismissals `onDismissAttempt` reports:

- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `outside-press` (`MouseEvent`): A press outside the layer.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

### Controller

Create one with `createComboboxController<Value, Multiple>()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, passed to the change callback.

- `isOpen()` (`() => boolean`): Whether the list is open.
- `setOpen(open, options?)` (`(open: boolean, options?: ComboboxChangeOptions<ComboboxOpenChangeReason> | undefined) => boolean`): Opens or closes the list. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (ComboboxChangeOptions<ComboboxOpenChangeReason> & { signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens the list, and resolves once it closes, with why and how. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the combobox leaves the page.
- `close(options?)` (`(options?: ComboboxChangeOptions<ComboboxOpenChangeReason> | undefined) => boolean`): Closes the list. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: ComboboxChangeOptions<ComboboxOpenChangeReason> | undefined) => boolean`): Opens the list when it's closed, and closes it when it's open. Returns false when the change was canceled.
- `getValue()` (`() => ComboboxValue<T, Multiple>`): The selected value.
- `setValue(value, options?)` (`(value: ComboboxValue<T, Multiple>, options?: ComboboxChangeOptions<ComboboxValueChangeReason> | undefined) => boolean`): Selects a value, as a user would. A disabled or read-only combobox ignores it. Returns false when the change was canceled or nothing changed.
- `clear(options?)` (`(options?: ComboboxChangeOptions<ComboboxValueChangeReason> | undefined) => boolean`): Selects nothing and empties the input. Returns false when the change was canceled or nothing changed.
- `getQuery()` (`() => string`): The input's text.
- `setQuery(query, options?)` (`(query: string, options?: ComboboxChangeOptions<ComboboxQueryChangeReason> | undefined) => boolean`): Changes the input's text, which filters the list. Returns false when the change was canceled or nothing changed.
- `getHighlighted()` (`() => T | null`): The value of the highlighted item, or null when none is.
- `highlight(value)` (`(value: T | null) => boolean`): Highlights the item with this value in the open list, scrolled into view, or none with null. Returns false when the list is closed, or no enabled item has the value.
- `focus()` (`() => void`): Moves focus to the input.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On               | Receives                                                      |
| ---------------------- | ---------------- | ------------------------------------------------------------- |
| `onValueChange`        | `Combobox`       | `(value, details)`: the new value, and the [reason](#reasons) |
| `onQueryChange`        | `Combobox`       | `(query, details)`: the new text, and the [reason](#reasons)  |
| `onOpenChange`         | `Combobox`       | `(open, details)`: the new state, and the [reason](#reasons)  |
| `onOpenChangeComplete` | `Combobox`       | `(open)`, after the animation                                 |
| `onHighlight`          | `Combobox`       | `(value, { index, event })`: the highlighted item and its row |
| `onLoadMore`           | `Combobox`       | `()`, when the last item is reached                           |
| `onDismissAttempt`     | `Combobox`       | `({ reason, event })`, when a dismissal was refused           |
| `onCreate`             | `ComboboxCreate` | `(query)`: the text. Return a Promise to mark it pending      |

## Accessibility

The combobox follows the [WAI-ARIA combobox pattern with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/). Focus usually stays in the input while `aria-activedescendant` identifies the highlighted option. A touch screen-reader trigger can move real focus into the list, and a sheet has its own [focus behavior](#presentation). Every line below is an automated test.

### Keyboard

| Key                   | Does                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| Typing                | Filters the options and opens the list                                |
| ArrowDown, ArrowUp    | Opens the list, then moves the highlight. Wraps unless `loop={false}` |
| Enter                 | Chooses the highlighted option                                        |
| Escape                | Closes the list, then restores the selection's label                  |
| Backspace             | In an empty input with chips, removes the last chip                   |
| ArrowLeft, ArrowRight | Moves between chips, reversed in right-to-left text                   |

### Tested Behavior

**Input**

- Is a combobox named by its label, with list autocomplete.
- Typing opens the list with the items that match.
- Matching ignores case and accents.
- ArrowDown opens the list.
- Choosing with the keyboard leaves the caret after the text.
- Points to the list it controls while open.

**Highlight**

- Arrow keys move the highlight while focus stays in the input.
- Arrow keys skip disabled items.
- Moving over a disabled item leaves the highlight where it was.
- The highlighted option has the id aria-activedescendant names.

**AutoHighlight**

- The first match is highlighted from the first keystroke, so Enter chooses it.
- A disabled match is passed over.

**Choosing**

- Enter chooses the highlighted item, puts its label in the input and closes.
- Clicking an item chooses it and keeps focus in the input.
- A disabled item can't be chosen.
- After choosing, opening again shows every item with the chosen one selected.
- A canceled choice closes the list and keeps the value's label in the input.
- Text that matches nothing shows the empty message.

**Closing**

- Escape closes the list and keeps focus in the input.
- Escape after deleting the text brings back the value and its label.
- Leaving after deleting the text keeps the value empty.
- Clicking outside closes the list.
- Tab closes the list and moves on.

**Trigger and clear**

- The trigger button opens and closes the list.
- Clear empties the input and the value.

**Default value**

- Shows its label in the input.
- Typing inside the label keeps the caret where it is.

**Multiple**

- Choosing adds a chip and empties the input.
- A canceled choice adds no chip and keeps the text.
- Backspace in an empty input removes the last chip.
- A chip's remove button removes its value.

**Groups**

- Items sit in groups named by their labels, and empty groups hide while filtering.

**Forms**

- The form submits the value under the combobox's name.
- Several values submit under one name.
- A required combobox blocks submission until a value is chosen.
- A disabled combobox can't be focused.
- A disabled fieldset disables the combobox and leaves it out of the form.

**Async**

- Results load for the text, with the list kept while loading.
- The chosen item's label survives results that don't include it.

Runs in React, Vue and web components.

Long lists stay fast and announce their size:

**Virtualized**

- Renders only the rows in view, each with its place in the whole list.
- Arrow keys reach items that weren't rendered, and the active descendant follows.
- Filtering covers every item, rendered or not.

Runs in React.

Also tested:

**Enhancements**

- The list is named by the combobox's label.
- A click on the label focuses the input and leaves the list closed.
- Filtering matches an item's keywords as well as its label.
- A create option offers the text, and hides when an item's label matches it exactly.
- Enter on the create option calls onCreate with the text.
- A create option is pending while onCreate's Promise runs.
- With multiple, the list stays open after choosing.
- MaxSelected disables the other items once reached.
- Arrow keys move between chips, and Backspace on one removes it.
- The chips are a toolbar named by the combobox's label.
- Web chips follow a label that changes after they rendered. Web components only.
- Enter on the trigger opens the list as the keyboard did.
- ArrowDown on the trigger opens the list at its first item.
- The content says whether the keyboard or a pointer is in use, while focus stays in the input.
- A form reset returns the combobox to its default value and label.
- Arrow keys keep the highlighted item in view when the … scrolls.

Runs in React, Vue and web components.

Rows people rebuild, here and in Select:

**Items shown while nothing is typed**

- A combobox shows its recent items, as a group, until the user types.
- An autocomplete shows recent searches while the field is empty.

**Select all**

- Selects every item that can be chosen, then clears them, and says which with aria-checked.
- Is mixed while some are selected.
- Covers only the items the text matches.
- Is reached with the arrow keys and chosen with Enter.
- In a group, it covers that group.
- A select's works the same, with real focus.

**Chips that collapse**

- Chips past the line hide, and a count says how many.
- Removing chips brings the hidden ones back, and the count goes.
- A value text lists two labels and counts the rest, in the page's language. React and Vue only.
- A select's value lists two labels and counts the rest.
- A web select value takes getMoreLabel as a property. Web components only.

**Loading more**

- Reaching the last item with the keyboard loads the next page.
- Scrolling to the end loads the next page, with a status while it does.
- The last page loads no more.

**Rows**

- A recent item is chosen like any other.
- Typing on a select never lands on it.

Runs in React, Vue and web components.

Match highlighting, here and in Autocomplete and Command:

**Combobox**

- Marks the part of each label the text matched.
- Marks keep the label's own case and accents while matching without them.
- An item matched by a keyword has nothing to mark.
- Marks go away when the text is cleared, and the label reads whole.

**Autocomplete**

- Marks the part of each suggestion the text matched.

**Command**

- Marks each letter a fuzzy match found, joining neighbours.
- Marks a whole match at a word start.

**Highlighting**

- The chosen label in the input shows every item unmarked.

Runs in React, Vue and web components.

Touch screen readers and announcements:

**A screen reader's tap moves real focus into the list**

- Autocomplete: tapping the trigger focuses the first suggestion, and Escape returns.
- Searchable select: tapping the trigger focuses the selected item, not the search field.

**Combobox**

- Tapping the trigger focuses the selected item, with no aria-activedescendant.
- Arrow keys move real focus, and choosing returns focus to the input.
- Escape closes the list and focus returns to the input.

**Announcements**

- How many items match is announced once typing pauses.
- Autocomplete and searchable select announce counts too.
- Removing a chip announces which.

**Touch screen readers and announcements**

- A tap on the input is for typing: focus stays there.
- A status part says it instead, so nothing is announced twice.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while filtering and choosing with a keyboard.

Runs in React, Vue and web components.
