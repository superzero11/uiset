<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.16, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### SegmentedControl

- `value?` (`T | null`): The checked item's value. Pass it to control the segmented control. `null` checks nothing.
- `defaultValue?` (`T | null`): The item checked at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`((value: T | null, details: ChangeDetails<SegmentedControlValueChangeReason>) => void)`): Runs when a user or a form reset wants to change the value. `details.reason` says why, and `details.cancel()` stops it.
- `disabled?` (`boolean`): Disables every item: they can't be focused or changed, and the value isn't submitted.
- `readOnly?` (`boolean`): Keeps the items focusable and the value submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission until an item is checked, with the browser's own message.
- `name?` (`string`): The name the value submits under. Without one, the segmented control submits nothing.
- `form?` (`string`): The id of a form to belong to, when the segmented control isn't inside that form.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first.
- `orientation?` (`SegmentedControlOrientation`): Which way the items run, for styling and for screen readers. Arrow keys on both axes move between items either way, as in any radio group.
- `controller?` (`{ getValue: () => T | null; setValue: (value: T | null, details?: SegmentedControlChangeOptions) => boolean; focus: () => void; }`): Checks items from anywhere. Create one with `createSegmentedControlController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### SegmentedControlItem

- `value` (`string`): What the value becomes when this item is checked.
- `disabled?` (`boolean`): Skips the item, like a disabled native radio: arrow keys pass it and it can't be focused or checked.

### State

What render functions, state-based class names and slots receive.

- `value` (`string | null`): The checked item's value.
- `disabled` (`boolean`): Whether the segmented control is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: arrow keys still move focus, but nothing changes the checked item.
- `required` (`boolean`): Whether a form won't submit until an item is checked.
- `orientation` (`SegmentedControlOrientation`): Which way the items run.

- `checked` (`boolean`): Whether this item is the control's value, which the indicator sits behind.
- `disabled` (`boolean`): Whether this item is disabled, by itself, the segmented control or a `<fieldset>`.
- `readOnly` (`boolean`): Whether the control is read-only, so pressing this item changes nothing.
- `required` (`boolean`): Whether a form won't submit until an item is checked.

- `value` (`string | null`): The checked item's value, which the indicator sits behind.
- `orientation` (`SegmentedControlOrientation`): Which way the items run.
- `direction` (`Direction`): Which way the checked item last moved on screen, `"none"` before it first moves.

### Reasons

`details.reason` says why the checked value changed.

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createSegmentedControlController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the change callback like a press, and returns `false` when the change is canceled.

- `getValue()` (`() => T | null`): The checked item's value.
- `setValue(value, details?)` (`(value: T | null, details?: SegmentedControlChangeOptions | undefined) => boolean`): Checks an item, as a user would. Disabled items and read-only controls ignore it.
- `focus()` (`() => void`): Moves focus to the checked item, or the first one.

### Events

Callbacks get the new value first, then the details.

| Prop            | On                 | Receives                                                          |
| --------------- | ------------------ | ----------------------------------------------------------------- |
| `onValueChange` | `SegmentedControl` | `(value, details)`: the checked value, and the [reason](#reasons) |

## Accessibility

A segmented control is a radio group, so it follows the [WAI-ARIA radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) and behaves like native radios that share a name. Each `SegmentedControlItem` renders a button with the `radio` role, and a hidden native radio that takes part in forms. The indicator is presentational, so screen readers skip it.

### Keyboard

| Key        | Does                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| Tab        | Moves into the control, onto the checked item or the first enabled one |
| Arrow keys | Move to the next or previous item and check it, skipping disabled ones |
| Space      | Checks the focused item                                                |
| Enter      | Submits its form                                                       |

### Tested Behavior

Every line below is an automated test.

**Selection**

- The default item is checked, and only that one.
- Clicking an item checks it and says why.
- Clicking a disabled item does nothing.
- A change can be cancelled.
- A controller checks an item.

**Keyboard**

- Tab lands on the checked item, and the next Tab leaves.
- Arrow keys on both axes check the next item, skip disabled ones and wrap.

**Orientation**

- A segmented control is horizontal unless it says otherwise.
- A vertical segmented control reports it.

**Indicator**

- The indicator covers the checked item.
- The indicator follows the checked item.
- The indicator says which way the checked item moved, and none at first.
- The indicator covers the checked item in a vertical control.
- The indicator matches items with fractional widths exactly.
- A scaled ancestor doesn't move the indicator off fractional items.
- With nothing checked, the indicator has no box.

**Forms**

- The checked value submits under the control's name.
- A form reset checks the default item again.
- A disabled control submits nothing, and its items can't be focused or checked.

Runs in React, Vue and web components.
