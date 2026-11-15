<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Checkbox

- `checked?` (`CheckedState`): Whether it's checked. Pass it to control the checkbox.
- `defaultChecked?` (`CheckedState`): Whether it's checked at first, when uncontrolled. A form reset returns to it.
- `onCheckedChange?` (`((checked: CheckedState, details: ChangeDetails<CheckboxCheckedChangeReason>) => void)`): Runs when a user or a form reset wants to change it. `details.reason` says why, and `details.cancel()` stops it.
- `disabled?` (`boolean`): Disables it like a native control: it can't be focused or changed, and isn't submitted.
- `readOnly?` (`boolean`): Keeps it focusable and submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission until it's checked, with the browser's own message.
- `name?` (`string`): The name it submits under. Without one, it submits nothing.
- `value?` (`string`): What it submits while checked.
- `form?` (`string`): The id of a form to belong to, when it isn't inside that form.
- `controller?` (`{ toggle: (details?: Details) => boolean; getChecked: () => CheckedState; setChecked: (checked: CheckedState, details?: Details) => boolean; focus: () => void; }`): Toggles it from anywhere. Create one with `createCheckboxController()`.
- `parent?` (`boolean`): Makes it the parent of its group: it checks or unchecks every checkbox in the group, and shows checked, unchecked or indeterminate from them.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### CheckboxIndicator

- `keepMounted?` (`boolean`): Whether the indicator stays in the page while unchecked, so it can be styled or animated in both states.

### CheckboxGroup

- `value?` (`T[]`): The checked checkboxes' values. Pass it to control the group.
- `defaultValue?` (`T[]`): The values checked at first, when uncontrolled. A form reset returns to them.
- `onValueChange?` (`((value: T[], details: ChangeDetails<CheckboxGroupValueChangeReason>) => void)`): Runs when a user or a form reset wants to change the value. `details.reason` says why, and `details.cancel()` stops it.
- `allValues?` (`T[]`): Every value a parent checkbox checks. Without it, the parent checks the checkboxes in the group. Pass it to render the parent right on the server.
- `disabled?` (`boolean`): Disables every checkbox in the group, and leaves them out of the form.
- `readOnly?` (`boolean`): Makes every checkbox in the group read-only: focusable and submitted, but presses don't change it.
- `required?` (`boolean`): Blocks form submission until at least one checkbox is checked, with the browser's own message.
- `name?` (`string`): The name every checkbox in the group submits under.
- `form?` (`string`): The id of a form to belong to, when the group isn't inside that form.
- `controller?` (`{ getValue: () => T[]; setValue: (value: T[], details?: Details) => boolean; focus: () => void; }`): Checks values from anywhere. Create one with `createCheckboxGroupController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

What render functions, state-based class names and slots receive.

- `checked` (`boolean`): Whether it's checked. False while indeterminate.
- `indeterminate` (`boolean`): Whether it's `"indeterminate"`, for a partly checked group. A press makes it checked.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: it stays focusable and submitted, but presses don't change it.
- `required` (`boolean`): Whether a form won't submit until it's checked. Indeterminate doesn't count.

The indicator receives the same state.

- `checked` (`boolean`): Whether it's checked. False while indeterminate.
- `indeterminate` (`boolean`): Whether it's `"indeterminate"`, for a partly checked group. A press makes it checked.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: it stays focusable and submitted, but presses don't change it.
- `required` (`boolean`): Whether a form won't submit until it's checked. Indeterminate doesn't count.

The group:

- `value` (`string[]`): The checked values.
- `disabled` (`boolean`): Whether the group is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the group is read-only: its checkboxes stay focusable and submitted, but presses don't change them.
- `required` (`boolean`): Whether a form won't submit until at least one of its checkboxes is checked.

### Reasons

`details.reason` says why the checked state changed.

- `press` (`MouseEvent | KeyboardEvent`): A single-element control was pressed: a checkbox, a switch or a toggle.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

For a group, it says why the checked values changed.

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Checkbox Controller

Create one with `createCheckboxController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the change callback like a press, and returns `false` when the change is canceled.

- `toggle(details?)` (`(details?: CheckboxChangeOptions | undefined) => boolean`): Checks it, or unchecks it. An indeterminate checkbox becomes checked.
- `getChecked()` (`() => CheckedState`): Whether it's checked: `true`, `false` or `"indeterminate"`.
- `setChecked(checked, details?)` (`(checked: CheckedState, details?: CheckboxChangeOptions | undefined) => boolean`): Sets whether it's checked, as a user would.
- `focus()` (`() => void`): Moves focus to it.

### CheckboxGroup Controller

Create one with `createCheckboxGroupController()` and pass it as `controller`.

Its write methods work like the checkbox controller's.

- `getValue()` (`() => T[]`): The checked values.
- `setValue(value, details?)` (`(value: T[], details?: CheckboxGroupChangeOptions | undefined) => boolean`): Sets the checked values, as a user would. A disabled group ignores it.
- `focus()` (`() => void`): Moves focus to the first enabled checkbox.

### Events

Callbacks get the new state or value first, then the details.

| Prop              | On              | Receives                                                                               |
| ----------------- | --------------- | -------------------------------------------------------------------------------------- |
| `onCheckedChange` | `Checkbox`      | `(checked, details)`: `true`, `false` or `"indeterminate"`, and the [reason](#reasons) |
| `onValueChange`   | `CheckboxGroup` | `(value, details)`: the checked values, and the [reason](#reasons)                     |

## Accessibility

The checkbox follows the [WAI-ARIA checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/), and a group's parent checkbox follows its [mixed checkbox example](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/examples/checkbox-mixed/). `Checkbox` renders a button with the `checkbox` role, and a hidden native checkbox that takes part in forms. Every line below is an automated test.

### Keyboard

| Key   | Does                                         |
| ----- | -------------------------------------------- |
| Tab   | Moves to the next checkbox                   |
| Space | Checks or unchecks it, or checks a mixed one |
| Enter | Submits its form                             |

### Tested Behavior

**Checkbox**

- Clicking toggles it.
- Clicking its label toggles it.
- Clicking a label around it toggles it once.
- Space toggles it.
- Enter submits the form and never toggles it.
- Tab moves through checkboxes in order.
- The indicator shows only while checked.
- A change can be cancelled.
- A controlled checkbox follows its value.
- A read-only checkbox can be focused but not changed.
- Exit keyframes keyed on data-unchecked play before the indicator unmounts.
- An infinite exit animation still unmounts the indicator.

Runs in React, Vue and web components.

Groups and parent checkboxes:

- The group is named by its label.
- Starts on its default value.
- Checking a checkbox adds its value to the group.
- Every checked value submits under the group's name, in order.
- A reset returns to the default value.
- A required group blocks submission until one is checked.

**Parent checkbox**

- Is mixed while some checkboxes are checked.
- Checks every checkbox from mixed, then unchecks them all.
- Is checked once every checkbox is.
- Submits nothing itself.

Runs in React, Vue and web components.

In forms:

- The form submits every checked control's name and value.
- Unchecked controls submit nothing.
- A checkbox outside the form joins it with the form attribute.
- Required controls block submission.
- A form reset returns every control to its default.
- A reset returns to the default value, not to nothing.
- A disabled fieldset disables the controls inside it.
- A read-only control still submits.
- A user's change fires native input and change events on the form.

Runs in React, Vue and web components.

Beyond the pattern's baseline:

**Enhancements**

- The first invalid control takes focus in document order.
- A later required field without an error part doesn't take focus from the first.

**Form-associated custom elements**

- Take part in the form with no hidden input. Web components only.
- Report validity like native controls. Web components only.
- Have live checked and value properties. Web components only.
- Are named by their labels. Web components only.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while checking boxes with a keyboard.
- Announcements while choosing a radio with a keyboard.

Runs in React, Vue and web components.
