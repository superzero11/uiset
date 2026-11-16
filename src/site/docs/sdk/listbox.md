<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.5, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Listbox

- `activation?` (`"automatic" | "manual"`): Whether the selection follows focus. `"automatic"`: arrow keys, Home, End and typing select the option they move to, and with `multiple` a press replaces the selection while Ctrl or ⌘ adds to it, like a native multiple select. `"manual"`: keys only move focus, and Space, Enter or a press selects, or toggles with `multiple`.
- `deselectable?` (`boolean`): Whether pressing the selected item of a single listbox unselects it, so nothing is selected.
- `orientation?` (`"horizontal" | "vertical"`): Which arrow keys move between items. Horizontal lists use Left and Right, swapped in right-to-left text.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first. Shift with an arrow never wraps.
- `keepInView?` (`boolean`): Whether the list scrolls the option keys move to into view, and the selected option when it first shows. Turn it off when something else scrolls the list, like `bindScrollPicker`.
- `items?` (`ListData<T>`): The items as data. Renders them for you, and lets typing find items a virtualized list hasn't rendered.
- `itemToValue?` (`((value: T) => string)`): The string an item's value submits as and is identified by, for object values. Strings pass through, and objects use their `value` or `id`.
- `isItemEqualToValue?` (`((itemValue: T, value: T) => boolean)`): Whether an item's value is the selected value, for object values that aren't the same object.
- `onHighlight?` (`((value: T | null, details: ListHighlightDetails) => void)`): Runs when focus moves to another item, with its index among the items, so a virtualized list can scroll to it.
- `disabled?` (`boolean`): Disables the listbox like a native control: its items can't be focused or chosen, and the value isn't submitted.
- `readOnly?` (`boolean`): Keeps the listbox focusable and its value submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission until a value is selected, with the browser's own message.
- `name?` (`string`): The name the value submits under. Without one, the listbox submits nothing.
- `form?` (`string`): The id of a form to belong to, when the listbox isn't inside that form.
- `controller?` (`object`): Reads and sets the listbox from anywhere. Create one with `createListboxController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `multiple?` (`boolean`): Whether several items can be selected. The value is then a list, Shift selects ranges, and Ctrl or ⌘ with A selects every item. Whether several items can be selected.
- `value?` (`T | T[] | null`): The selected value. Pass it to control the listbox. `null` selects nothing. The selected values. Pass it to control the listbox. The selected value, or values with `multiple`. Pass it to control the listbox.
- `defaultValue?` (`T | T[] | null`): The value selected at first, when uncontrolled. A form reset returns to it. The values selected at first, when uncontrolled. A form reset returns to them. The value or values selected at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`union`): Runs when a user, a form reset or a controller wants to change the value. `details.reason` says why, and `details.cancel()` stops it.

### ListboxItem

- `value` (`T`): What the value becomes when the item is chosen. A string, or any value with `itemToValue`.
- `label?` (`string`): The text typing finds, when the content isn't plain text. Not the accessible name: use `aria-label` for that.
- `disabled?` (`boolean`): Keeps the item from being chosen. Arrow keys, typing and ranges skip it. Sets `data-disabled` and `aria-disabled`.
- `index?` (`number`): The item's position among all items, for virtualized lists that render only some. Sets `aria-posinset` and `aria-setsize`.

### ListboxItemIndicator

- `keepMounted?` (`boolean`): Whether the indicator stays in the page while its item isn't selected, so it can be styled or animated in both states.

### ListboxItemIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

`ListboxGroup`, `ListboxGroupLabel` and `ListboxSeparator` take no props of their own.

### State

What render functions, state-based class names and slots receive, per part.

`Listbox`:

- `multiple` (`boolean | undefined`): Whether several items can be selected.
- `orientation` (`"horizontal" | "vertical"`): Which arrow keys move between items.
- `disabled` (`boolean`): Whether the listbox is disabled, by itself, a Field or a `<fieldset>`.
- `readOnly` (`boolean`): Whether the listbox keeps its value but refuses changes, from its `readOnly` option. A form reset still restores it.
- `required` (`boolean`): Whether a value is required.
- `items` (`ListData<unknown>`): The data items, for rendering a virtualized list yourself. Empty without `items`.

`ListboxItem`:

- `highlighted` (`boolean`): Whether the item has focus.
- `selected` (`boolean`): Whether its value is in the listbox's value, compared with `isItemEqualToValue` when you pass one.
- `disabled` (`boolean`): Whether the item can't be chosen, by itself or a disabled listbox.

`ListboxItemIndicator`:

- `selected` (`boolean`): Whether its item is selected. While false, the indicator isn't shown unless `keepMounted` is set.

### Reasons

`details.reason` says why the value changed: `item-press` for a press, Space or Enter, `list-navigation` for keys that select as they move, Shift ranges with arrows and Ctrl or ⌘ with A, `reset` and `restore` from the form, and `imperative` from a controller.

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createListboxController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, passed to `onValueChange`.

- `getValue()` (`() => ListboxValue<T, Multiple>`): The selected value.
- `setValue(value, options?)` (`(value: ListboxValue<T, Multiple>, options?: ListboxChangeOptions | undefined) => boolean`): Selects a value, as a user would. A disabled or read-only listbox ignores it. Returns false when the change was canceled or nothing changed.
- `clear(options?)` (`(options?: ListboxChangeOptions | undefined) => boolean`): Selects nothing: `null`, or an empty list with `multiple`. Returns false when the change was canceled or nothing changed.
- `selectAll(options?)` (`(options?: ListboxChangeOptions | undefined) => boolean`): Selects every enabled item, with `multiple`. Returns false when the change was canceled or nothing changed.
- `focus()` (`() => void`): Moves focus into the list, onto the option that holds its tab stop.

### Events

Callbacks get the new value first, then the details.

| Prop            | On        | Receives                                                      |
| --------------- | --------- | ------------------------------------------------------------- |
| `onValueChange` | `Listbox` | `(value, details)`: the new value, and the [reason](#reasons) |
| `onHighlight`   | `Listbox` | `(value, details)`: the focused option's value, and its index |

## Accessibility

Follows the [WAI-ARIA listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), with both of its keyboard models for several options. Options take real focus with one roving tab stop. Every option says whether it's selected.

### Focus

The list is one tab stop. Tab returns to the last focused option, then falls back to the first selected or enabled option. Options receive real DOM focus, so `focus-visible` works directly.

The root forwards focus into the options, including when you press a Field label or the list’s padding. Escape stays available to an enclosing dialog.

### Tested Behavior

Every line below is an automated test.

**Focus**

- Tab lands on the first option when nothing is selected.
- Tab lands on the selected option.
- Tab lands on the first selected option with multiple.
- The list is one tab stop: Tab leaves it from any option.
- Shift+Tab back into the list returns to the option focused last.
- A press focuses the option.
- Arrow keys skip disabled options.
- A disabled option can't be chosen.
- Arrow keys from a pressed disabled option move to the enabled ones around it.
- Tab lands on the first enabled option when the selected one is disabled.

**Single selection**

- Arrow keys move focus and the selection follows.
- Home and End move to the first and last option.
- Arrow keys wrap from the last option to the first.
- With loop off, arrow keys stop at the ends.
- A press selects the option.
- Pressing the selected option keeps it selected.
- With deselectable, pressing the selected option unselects it.
- With manual activation, arrows only move focus and Space selects.
- Typing moves focus to the next option that starts with it, and selects it.
- Typing several letters finds the option that starts with them.
- Escape leaves the selection alone.

**Multiple selection**

- Presses and Space toggle options.
- Arrow keys move focus without changing the selection.
- Shift with a press selects the range from the last option chosen.
- Shift with an arrow passes over a disabled option.
- A range skips disabled options.
- A second Shift press changes the range, keeping what was selected before it.
- Shift with an arrow key moves focus and extends the selection.
- Shift with Space selects from the last option chosen to the focused one.
- Ctrl+Shift+End selects from the focused option to the last.
- Ctrl+Shift+Home selects from the focused option to the first.
- Ctrl+A selects every enabled option, and again unselects them.
- Ctrl+A does nothing in a single listbox.
- Typing moves focus without selecting.

**Multiple selection with automatic activation**

- A press replaces the selection.
- Ctrl or Cmd with a press adds an option, and removes it again.
- Shift with a press replaces the selection with a range.
- Arrow keys select the option they move to.
- Ctrl or Cmd with an arrow moves focus only, and with Space toggles.
- Shift with an arrow key extends the selection.

**Horizontal**

- Left and Right move between options, and Up and Down don't.

**Groups**

- Arrow keys move across groups, skipping their labels.
- A range crosses groups.

**Form**

- Submits the selected value under its name.
- Submits each value with multiple.
- A reset returns to the default value.
- Required blocks submission until a value is selected.
- A disabled listbox can't be focused or changed, and submits nothing.
- A disabled fieldset disables the listbox.
- A read-only listbox can be browsed but not changed, and submits.

**Changes**

- A canceled change keeps the selection.
- A controlled listbox shows the value it's given.
- The controller clears and selects everything.

Runs in React, Vue and web components.

Beyond the pattern:

- Keys pressed with no waits between them all land.
- Escape leaves the selection alone and reaches a dialog around the list.
- A Shift press after the selection was cleared starts a new range there.
- Shift with an arrow never wraps past the end.
- A Shift press doesn't select the page's text.
- The selected option scrolls into view without taking focus.
- Arrow keys keep the focused option clear of the list's scroll padding at both ends.
- The selected option scrolls into view clear of the list's scroll padding.
- A focused option that leaves the list hands focus back to it, so keys keep working.
- Options that all leave take the tab stop with them, and options that come back hold it again.
- Options the app reorders keep their place in the keys.
- A press on the list's padding gives focus to the option that holds the tab stop.

**Touch**

- Taps toggle where clicks replace, since touch has no modifier keys.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while choosing one option with a keyboard.
- Announcements while choosing several options with a keyboard.

Runs in React, Vue and web components.
