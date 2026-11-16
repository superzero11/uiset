<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.5, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

### Select

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `open?` (`boolean`): Whether the list is open. Pass it to control it.
- `defaultOpen?` (`boolean`): Whether the list starts open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<SelectOpenChangeReason>) => void)`): Runs when the list wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the list has finished opening or closing, after any animation.
- `items?` (`ListData<T>`): The items as data. Renders the list for you, and lets the trigger show labels and find items by typing before the list has ever opened.
- `emptyItems?` (`ListData<T>`): Items shown instead of `items` while the search field is empty, like recent choices. Groups work, like `{ type: "group", label: "Recent", items }`. Needs `items` and a `SelectInput`.
- `query?` (`string`): The text in the search field, which filters the list. Pass it to control it. Closing the list empties it.
- `defaultQuery?` (`string`): The search field's text at first, when uncontrolled.
- `onQueryChange?` (`((query: string, details: ChangeDetails<SelectQueryChangeReason>) => void)`): Runs when the search field's text wants to change: typing, or closing the list, which empties it.
- `filter?` (`ListFilter<T>`): How a `SelectInput` narrows the list: `"contains"`, `"startsWith"`, a function of the item and the text, whose numeric result also sorts data items, or `false` to keep every item, for results a server already filtered.
- `status?` (`AsyncOptionsStatus`): Whether results are loading or failed, for the status and empty parts. Sets `aria-busy` on the list while loading.
- `onLoadMore?` (`(() => void)`): Runs when the highlight or scrolling reaches the last item, so the next page can load, like `createAsyncOptions`'s `loadMore`. Not again for the same items, unless the last load failed.
- `announcement?` (`((change: ListAnnouncement) => string | null | undefined)`): What screen readers hear after typing pauses in the search field, when no `SelectStatus` is rendered. Return null for nothing.
- `placeholder?` (`string`): What the value shows while nothing is selected.
- `itemToValue?` (`((value: T) => string)`): The string an item's value submits as and is identified by, for object values. Strings pass through, and objects use their `value` or `id`.
- `itemToLabel?` (`((value: T) => string)`): The text a value shows in the trigger, for values whose item isn't rendered, like async results.
- `isItemEqualToValue?` (`((itemValue: T, value: T) => boolean)`): Whether an item's value is the selected value, for object values that aren't the same object.
- `onHighlight?` (`((value: T | null, details: ListHighlightDetails) => void)`): Runs when the highlight moves, with the item's index among the visible items, so a virtualized list can scroll to it.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first.
- `modal?` (`"pointer" | boolean`): `"pointer"`: an outside press only closes the list. `true`: also locks scroll and makes the rest of the page inert. `false`: outside presses reach what they hit.
- `presentation?` (`PresentationSetting<"popover">`): How the list presents. `"sheet"` slides it up from the bottom of the screen, where it can be swiped away, and `"auto"` does that on small touch screens. Decided each time it opens; the server renders `"popover"` for `"auto"`.
- `disabled?` (`boolean`): Disables the select like a native one: it can't be focused or changed, and the value isn't submitted.
- `readOnly?` (`boolean`): Keeps the select focusable and its value submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission until a value is selected, with the browser's own message.
- `name?` (`string`): The name the value submits under. Without one, the select submits nothing.
- `form?` (`string`): The id of a form to belong to, when the select isn't inside that form.
- `autoComplete?` (`string`): A hint for the browser's autofill, like `"country"`.
- `controller?` (`object`): Opens, closes, reads and sets the select from anywhere. Create one with `createSelectController()`.
- `dismissible?` (`boolean`): Whether Escape, an outside press, focus or the window leaving, Android's back gesture and a sheet's swipe can close it. Triggers, Close parts and the controller always can. Pass `false` while it holds unsaved work, and ask in `onDismissAttempt`.
- `onDismissAttempt?` (`function`): Runs when `dismissible` refused a dismissal made on purpose: Escape, an outside press, back or a swipe. Focus or the window leaving is refused without it. Ask "Discard changes?" here.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `multiple?` (`boolean`): Whether several items can be selected. The value is then a list, and the list stays open as items toggle. Whether several items can be selected.
- `value?` (`T | T[] | null`): The selected value. Pass it to control the select. `null` selects nothing. The selected values. Pass it to control the select. The selected value, or values with `multiple`. Pass it to control the select.
- `defaultValue?` (`T | T[] | null`): The value selected at first, when uncontrolled. A form reset returns to it. The values selected at first, when uncontrolled. A form reset returns to them. The value or values selected at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`union`): Runs when a user, a form reset or a controller wants to change the value. `details.reason` says why, and `details.cancel()` stops it.

### SelectTrigger

A trigger outside the select also takes `controller`.

- `disabled?` (`boolean`): Stops the trigger from opening the list. A native button can't be focused or pressed.
- `controller?` (`object`): Connects a trigger outside the select to the select with this controller.

### SelectValue

- `placeholder?` (`string`): What shows while nothing is selected. Overrides the select's `placeholder`.
- `maxLabels?` (`number`): With `multiple`, how many labels show before the rest are counted, as in "Apple, Banana and 2 more", joined the way the page's language joins lists.
- `getMoreLabel?` (`((count: number) => string)`): The words for the labels past `maxLabels`.

### SelectContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the trigger the list opens on.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the list lines up with the trigger along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the trigger and the list, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the trigger, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `alignItemWithTrigger?` (`boolean`): Whether the list overlaps the trigger so the selected item sits on it, like a native select on macOS. Falls back to opening below when there isn't room, and for touch.
- `keepMounted?` (`boolean`): Whether the list stays in the page, hidden, while closed. For animation libraries that drive the exit from state.

### SelectItem

- `label?` (`string`): The text the trigger shows and typing finds, when the content isn't plain text. Not the accessible name: use `aria-label` for that.
- `disabled?` (`boolean`): Keeps the item from being chosen. The keyboard and the pointer skip it. Sets `data-disabled` and `aria-disabled`.
- `index?` (`number`): The item's position among all items, for virtualized lists that render only some. Sets `aria-posinset` and `aria-setsize`.
- `value` (`T`): What the value becomes when the item is chosen. A string, or any value with `itemToValue`.

### SelectItemIndicator

- `keepMounted?` (`boolean`): Whether the indicator stays in the page while its item isn't selected, so it can be styled or animated in both states.

### SelectItemIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

`SelectValueIcon` takes no props of its own, and no children.

### SelectClear

- `keepMounted?` (`boolean`): Whether the clear button stays in the page while nothing is selected.

### SelectInput, SelectEmpty, SelectStatus, SelectItemText and SelectSelectAll

They take no props of their own. A `SelectInput` turns searching on, `SelectItemText` marks what the search matched in its item's text, and `SelectSelectAll` covers its group's items, or every item outside a group. Without a `SelectStatus`, result counts go to screen readers through the page's shared live region once typing pauses. `announcement` receives `{ type: "results", count, query, loading }` and returns the words, or `null` for silence. The default is English: "3 results", "No results" or "Loading".

### Items as Data

Each item in `items`. Groups are `{ type: "group", label, items }` and separators `{ type: "separator" }`.

- `value` (`T`): Identifies the item, and is what choosing it reports. A string, or any value with `itemToValue`.
- `label` (`string`): The text shown and matched by typeahead and filtering. A select's trigger shows it once chosen.
- `keywords?` (`string[]`): More words filtering matches, like `["team"]` for a plan called Pro.
- `disabled?` (`boolean`): Keeps the item from being chosen. The keyboard skips it, like in a native select.

### State

What render functions, state-based class names and slots receive, per part.

`SelectTrigger`:

- `open` (`boolean`): Whether the list is open.
- `disabled` (`boolean`): Whether the select is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the select keeps its value but refuses changes, from its `readOnly` option. Sets `aria-readonly`.
- `required` (`boolean`): Whether a value must be selected before the form submits, from its `required` option. Sets `aria-required`.
- `placeholder` (`boolean`): Whether nothing is selected, so the placeholder shows.

`SelectValue`:

- `value` (`unknown`): The selected value: one, `null`, or a list with `multiple`.
- `label` (`string`): The selected item's label, the labels joined with commas for several, or with `maxLabels`, as a list in the page's language, like "Apple, Banana and 2 more". An empty string for none.
- `labels` (`string[]`): Each selected item's label, in the order they were selected.
- `placeholder` (`boolean`): Whether nothing is selected, so the placeholder shows.

`SelectContent` and `SelectList`:

- `open` (`boolean`): Whether the list is open. False while it animates out.
- `presentation` (`"popover" | "sheet"`): How it presents this time it's open.
- `multiple` (`boolean | undefined`): Whether several items can be selected.
- `items` (`ListData<unknown>`): The data items that match the search, for rendering a virtualized list yourself.
- `status` (`AsyncOptionsStatus`): Whether results are loading or failed.

`SelectItem`:

- `highlighted` (`boolean`): Whether the item has keyboard focus or is under the pointer.
- `selected` (`boolean`): Whether its value is in the select's value, compared with `isItemEqualToValue` when you pass one.
- `disabled` (`boolean`): Whether the item's own `disabled` prop is set. It can't be highlighted or chosen.

`SelectItemIndicator`:

- `selected` (`boolean`): Whether its item is selected. While false, the indicator isn't shown unless `keepMounted` is set.

`SelectItemIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

`SelectClear`:

- `disabled` (`boolean`): Whether the select is disabled or read-only, so there's nothing it can clear.

`SelectArrow`:

- `open` (`boolean`): Whether the list is open.

`SelectInput`:

- `open` (`boolean`): Whether the list is open.
- `disabled` (`boolean`): Whether the select is disabled, by itself or by a `<fieldset>`. A read-only select's search field stays enabled.

`SelectItemText`:

- `segments` (`MatchSegment[]`): The text in pieces, each marked when it matched. Joined, they're the whole text.
- `matched` (`boolean`): Whether any piece matched.

`SelectSelectAll`:

- `checked` (`boolean`): Whether every item it covers is selected.
- `indeterminate` (`boolean`): Whether some of its items are selected, but not all.
- `highlighted` (`boolean`): Whether it's highlighted, by the keyboard or the pointer.
- `disabled` (`boolean`): Whether it can't be used: nothing it covers can be chosen, or choosing them all would pass `maxSelected`.

`SelectEmpty`:

- `loading` (`boolean`): Whether results are loading.
- `empty` (`boolean`): Whether no item matches.
- `query` (`string`): The text the list is filtered by.

`SelectStatus`:

- `status` (`"idle" | "loading" | "error"`): Whether results are loading or failed.
- `loading` (`boolean`): Whether results are loading.
- `count` (`number`): How many items are visible.

### Reasons

`details.reason` says why the value changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `clear-press` (`MouseEvent | KeyboardEvent`): A Clear part was pressed, like on an input, a select or a combobox.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

And why the list opened or closed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

With `dismissible` false, the refused dismissals `onDismissAttempt` reports:

- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

And why the search text changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.
- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.

### Controller

Create one with `createSelectController<Value, Multiple>()` and pass it as `controller`, to the select and to
a trigger outside it.

Every write method takes an optional `{ reason, event }`, passed to the change callback.

- `isOpen()` (`() => boolean`): Whether the list is open.
- `setOpen(open, options?)` (`(open: boolean, options?: SelectChangeOptions<SelectOpenChangeReason> | undefined) => boolean`): Opens or closes the list. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (SelectChangeOptions<SelectOpenChangeReason> & { signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens the list, and resolves once it closes, with why and how. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the select leaves the page.
- `close(options?)` (`(options?: SelectChangeOptions<SelectOpenChangeReason> | undefined) => boolean`): Closes the list. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: SelectChangeOptions<SelectOpenChangeReason> | undefined) => boolean`): Opens the list when it's closed, and closes it when it's open. Returns false when the change was canceled.
- `getValue()` (`() => SelectValue<T, Multiple>`): The selected value.
- `setValue(value, options?)` (`(value: SelectValue<T, Multiple>, options?: SelectChangeOptions<SelectValueChangeReason> | undefined) => boolean`): Selects a value, as a user would. A disabled or read-only select ignores it. Returns false when the change was canceled, ignored or the value was already selected.
- `clear(options?)` (`(options?: SelectChangeOptions<SelectValueChangeReason> | undefined) => boolean`): Selects nothing: `null`, or an empty list with `multiple`. Returns false when nothing changed.
- `getQuery()` (`() => string`): The text in the search field.
- `setQuery(query, options?)` (`(query: string, options?: SelectChangeOptions<SelectQueryChangeReason> | undefined) => boolean`): Changes the text in the search field, which filters the list. Returns false when nothing changed.
- `focus()` (`() => void`): Moves focus to the trigger.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On       | Receives                                                        |
| ---------------------- | -------- | --------------------------------------------------------------- |
| `onValueChange`        | `Select` | `(value, details)`: the new value, and the [reason](#reasons)   |
| `onOpenChange`         | `Select` | `(open, details)`: the new state, and the [reason](#reasons)    |
| `onOpenChangeComplete` | `Select` | `(open)`, after the animation                                   |
| `onHighlight`          | `Select` | `(value, { index, event })`: the highlighted item and its row   |
| `onQueryChange`        | `Select` | `(query, details)`: the search text, and the [reason](#reasons) |
| `onLoadMore`           | `Select` | `()`, when the last item is reached                             |
| `onDismissAttempt`     | `Select` | `({ reason, event })`, when a dismissal was refused             |

## Accessibility

The select follows the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/). The trigger has the `combobox` role and the popup is a `listbox`. If you don't need a visible label, give `SelectTrigger` an `aria-label` instead.

### Keyboard

Arrow keys move through the open list; Home and End reach its first and last items. Set `loop={false}` to stop arrow keys at either end. The popup follows the trigger's inherited text direction; use logical CSS properties for spacing in right-to-left layouts.

### Tested Behavior

Every line below is an automated test.

- With alignItemWithTrigger, the selected item sits over the trigger.
- A controller opens the list.

**Trigger**

- Is a combobox named by its label that shows the placeholder.
- Click opens the list.
- Enter opens the list and focuses the first item.
- Space opens the list and focuses the first item.
- ArrowDown opens the list and focuses the first item.
- Points to the list it controls while open.
- A click on the open trigger closes the list.
- A click on a trigger in a shadow root opens the list, and it stays open. Vue and web components only.

**Keyboard in the list**

- Arrow keys move focus through the items.
- Home and End move to the first and last items.
- Arrow keys skip disabled items.
- Typing focuses the next item that starts with the text.
- Enter chooses the focused item, closes and returns focus to the trigger.
- Space chooses the focused item.
- Escape closes without choosing and returns focus to the trigger.
- The chosen item is selected when the list opens again, and takes focus.

**Typing on the closed trigger**

- Selects the next item that starts with the text, like a native select.
- Skips disabled items.

**Pointer**

- Clicking an item chooses it and closes the list.
- Clicking a disabled item does nothing.
- Moving over a disabled item leaves the highlight where it was.
- Clicking outside closes without choosing.
- Pressing, dragging to an item and releasing chooses it.
- Enter opens the list after a drag chose an item.
- Enter opens the list after pressing the open trigger and releasing elsewhere.

**Value**

- A disabled value stays in the trigger, and the list opens on the first enabled item.
- A default value shows its label and is selected.
- Opening with a selected item focuses it.
- Canceling the change keeps the value.

**Multiple**

- The list allows several selections.
- Choosing toggles items and keeps the list open.

**Groups**

- Items sit in groups named by their labels.
- Arrow keys move across groups.

**Forms**

- The form submits the value under the select's name.
- A required select blocks submission until a value is chosen.
- A disabled select can't be opened.
- A read-only select doesn't change its value.
- A disabled fieldset disables the select and leaves it out of the form.

**Positioning**

- The list opens below the trigger, at least as wide.

Runs in React, Vue and web components.

Also tested:

**Enhancements**

- A data select whose content part is wrapped in a component renders one list.
- The list is named by the select's label.
- A clear button selects nothing and keeps focus on the select.
- Alt+ArrowUp chooses the focused item and closes, as the APG asks.
- The content says whether the keyboard or a pointer is in use, for styling the highlight.
- A form reset returns the select to its default value.
- Typing on the closed trigger selects items before the list has ever been in the page.

Runs in React, Vue and web components.

Searching, with a search field in the list:

**Searchable select**

- Opening focuses the search field and highlights the selected item.
- The search field is a combobox that controls the listbox in the list.
- Typing filters the list and highlights the first match.
- Typing never jumps by first letter: the characters go into the field.
- Arrow keys move the highlight while focus stays in the field.
- Home and End are the field's, so the highlight stays.
- Enter chooses the highlighted item, closes, and focus returns to the trigger.
- A click on an item chooses it.
- Escape closes the list and focus returns to the trigger.
- The search empties once the list closes.
- An empty message shows when nothing matches.
- Matches ignore case and accents.
- Labels mark what the search matched.
- With multiple, choosing keeps the list open and focus in the field.
- Tab closes the list and moves on from the trigger.
- No axe violations while searching.
- Typing on the closed trigger still selects by first letter.

**Items shown while the search is empty**

- Recent items show until the user types, then the results.
- A recent item is chosen like any other, and its label shows in the trigger.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while choosing with a keyboard.

Runs in React, Vue and web components.
