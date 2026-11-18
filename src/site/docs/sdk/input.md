<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.10, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props, plus every native input prop.

### Input

- `value?` (`string`): The value, for a controlled field.
- `defaultValue?` (`string`): The value it starts with. A form reset returns here.
- `onValueChange?` (`((value: string, details: ChangeDetails<InputValueChangeReason>) => void)`): Called when the user changes the value: typing (`"input-change"`), a Clear part (`"clear-press"`), a form reset (`"reset"`) or a controller (`"imperative"`). `details.cancel()` keeps the value as it was.
- `controller?` (`object`): Reads and writes the field from anywhere. Create one with `createInputController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

- `disabled?` (`boolean`): Disables the field.
- `readOnly?` (`boolean`): Makes the field read-only.
- `required?` (`boolean`): Makes the field required.

### InputGroup

- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### InputClear

A `<button>` that empties the input in its group and focuses it. It renders only while there's text to clear.

### State

- `filled` (`boolean`): Whether the field holds any text.
- `disabled` (`boolean`): Whether the field is disabled.
- `readOnly` (`boolean`): Whether the field is read-only.
- `required` (`boolean`): Whether the field is required.

`InputGroup` and `InputClear` receive the state of the input inside the group.

- `filled` (`boolean`): Whether the field in the group holds any text.
- `disabled` (`boolean`): Whether the field in the group is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the field in the group is read-only.

### Reasons

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `clear-press` (`MouseEvent | KeyboardEvent`): A Clear part was pressed, like on an input, a select or a combobox.
- `reset` (`none`): A form reset.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createInputController()` and pass it as `controller`.

- `getValue()` (`() => string`): The current value.
- `setValue(value, options?)` (`(value: string, options?: ChangeOptions<InputValueChangeReason> | undefined) => boolean`): Sets the value as if the user typed it, so `input` fires. Returns false when the change was canceled or nothing changed.
- `clear(options?)` (`(options?: ChangeOptions<InputValueChangeReason> | undefined) => boolean`): Empties the field, as if the user deleted the text, so `input` fires. Returns false when the change was canceled or nothing changed.
- `focus()` (`() => void`): Moves focus to the field.

## Accessibility

Give the input a visible field label or an `aria-label`, and give the clear button an accessible name. The native input keeps standard text editing, selection, autocomplete and form behavior.

- The label names the input and the description describes it.
- Clicking the label focuses the input.
- An invalid input is marked once the form tries to submit.
- Data-filled follows the text.
- An input group's clear button shows only while there's text.
- <ui-input>'s value property writes the field quietly, and its api reports. Web components only.

**Enhancements**

- Changes report their reason: typing, then a reset.
- A canceled change keeps the text as it was.
- A canceled change keeps a controlled input's text as it was.
- A canceled change waits for an IME to finish before the text goes back.
- A controlled input keeps every keystroke.
- A required input marks its label required.

**Input group**

- The clear button empties the field, reports why, and returns focus.
- Pressing the group's text focuses its field.
- The clear button hides while its field is disabled.

Runs in React, Vue and web components.
