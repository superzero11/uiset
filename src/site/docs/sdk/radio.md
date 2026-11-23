<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### RadioGroup

- `value?` (`T | null`): The checked radio's value. Pass it to control the group. `null` checks nothing.
- `defaultValue?` (`T | null`): The radio checked at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`((value: T | null, details: ChangeDetails<RadioGroupValueChangeReason>) => void)`): Runs when a user or a form reset wants to change the value. `details.reason` says why, and `details.cancel()` stops it.
- `disabled?` (`boolean`): Disables every radio like native ones: they can't be focused or changed, and the value isn't submitted.
- `readOnly?` (`boolean`): Keeps the items focusable and the value submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission until an item is checked, with the browser's own message.
- `name?` (`string`): The name the value submits under. Without one, the group submits nothing.
- `form?` (`string`): The id of a form to belong to, when the group isn't inside that form.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first.
- `controller?` (`{ getValue: () => T | null; setValue: (value: T | null, details?: Details) => boolean; focus: () => void; }`): Checks radios from anywhere. Create one with `createRadioGroupController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### Radio

- `value` (`string`): What the group's value becomes when this item is checked.
- `disabled?` (`boolean`): Skips the item, like a disabled native radio: arrow keys pass it and it can't be focused or checked.

### RadioIndicator

- `keepMounted?` (`boolean`): Whether the indicator stays in the page while its item is unchecked.

### State

What render functions, state-based class names and slots receive.

- `value` (`string | null`): The checked item's value.
- `disabled` (`boolean`): Whether the group is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the group is read-only: arrow keys still move focus, but nothing changes the checked item.
- `required` (`boolean`): Whether a form won't submit until an item is checked.

- `checked` (`boolean`): Whether this item is checked.
- `disabled` (`boolean`): Whether this item is disabled, by itself, its group or a `<fieldset>`.
- `readOnly` (`boolean`): Whether the group is read-only.
- `required` (`boolean`): Whether the group is required.

- `checked` (`boolean`): Whether this item is checked.
- `disabled` (`boolean`): Whether this item is disabled, by itself, its group or a `<fieldset>`.
- `readOnly` (`boolean`): Whether the group is read-only.
- `required` (`boolean`): Whether the group is required.

### Reasons

`details.reason` says why the checked value changed.

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createRadioGroupController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the change callback like a press, and returns `false` when the change is canceled.

- `getValue()` (`() => T | null`): The checked radio's value.
- `setValue(value, details?)` (`(value: T | null, details?: RadioGroupChangeOptions | undefined) => boolean`): Checks a radio, as a user would. Disabled radios and read-only groups ignore it.
- `focus()` (`() => void`): Moves focus to the checked radio, or the first one.

### Events

Callbacks get the new value first, then the details.

| Prop            | On           | Receives                                                          |
| --------------- | ------------ | ----------------------------------------------------------------- |
| `onValueChange` | `RadioGroup` | `(value, details)`: the checked value, and the [reason](#reasons) |

## Accessibility

Radio groups follow the [WAI-ARIA radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), and behave like native radios that share a name. `Radio` renders a button with the `radio` role, and a hidden native radio that takes part in forms.

### Keyboard

| Key        | Does                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| Tab        | Moves into the group, onto the checked radio or the first enabled one   |
| Arrow keys | Move to the next or previous radio and check it, skipping disabled ones |
| Space      | Checks the focused radio                                                |
| Enter      | Submits its form                                                        |

### Tested Behavior

Every line below is an automated test.

**Selection**

- Nothing is checked at first without a default value.
- Clicking an item checks it and unchecks the others.
- Clicking an item's label checks it.
- Clicking a disabled item does nothing.
- A change can be cancelled.

**Keyboard**

- Tab lands on the first item when nothing is checked.
- Tab lands on the checked item.
- Tab leaves the group after one stop.
- Space checks the focused item.
- ArrowDown and ArrowRight move to the next item and check it.
- ArrowUp and ArrowLeft move to the previous item and check it.
- Arrow keys skip disabled items.
- Arrow keys wrap at both ends.
- Enter never checks an item.
- Keys pressed in quick succession are never lost.
- Enter on an item submits the form.

**Read-only and disabled**

- A read-only group moves focus with arrow keys but checks nothing.
- A disabled group can't be focused or changed.
- Clicking a radio in a disabled group doesn't focus it.
- Clicking the label of a radio in a disabled group neither focuses nor checks it.

**Animation**

- The indicator animates in from its starting style.

Runs in React, Vue and web components.

In a field:

**With every radio enabled**

- Each radio is named by the label of its own field.
- The field around the group still names the group.
- Clicking a radio's label checks it and unchecks the others.
- The group keeps one tab stop.
- Arrow keys move between the radios and check them.

**A disabled radio**

- A disabled field around the first radio moves the tab stop to the next.
- Disabling the first radio after it renders moves the tab stop to the next.
- Enabling the first radio again gives it back the tab stop.

Runs in React, Vue and web components.

In right-to-left pages:

- ArrowLeft moves to the next radio and ArrowRight to the previous one.
- ArrowDown and ArrowUp keep their direction.

Runs in React, Vue and web components.
