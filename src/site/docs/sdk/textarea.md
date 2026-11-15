<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props, plus every native textarea prop.

### Textarea

- `value?` (`string`): The value, for a controlled field.
- `defaultValue?` (`string`): The value it starts with. A form reset returns here.
- `onValueChange?` (`((value: string, details: ChangeDetails<InputValueChangeReason>) => void)`): Called when the user changes the value: typing (`"input-change"`), a Clear part (`"clear-press"`), a form reset (`"reset"`) or a controller (`"imperative"`). `details.cancel()` keeps the value as it was.
- `controller?` (`object`): Reads and writes the field from anywhere. Create one with `createInputController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `autoResize?` (`boolean`): Grows and shrinks with the text. Bound it with CSS `min-height` and `max-height`; past the maximum, it scrolls.
- `onSubmit?` (`((value: string, details: TextareaSubmitDetails) => void)`): Runs on the submit shortcut, unless an input method is composing. Without it, the shortcut submits the form the textarea is in. With neither, the key is left alone, so Enter adds a line.
- `submitShortcut?` (`"enter" | "mod+enter"`): Which keys submit: `"enter"`, with Shift+Enter for a new line, or `"mod+enter"`, with Enter for a new line. Without it, Enter always starts a new line.

- `disabled?` (`boolean`): Disables the field.
- `readOnly?` (`boolean`): Makes the field read-only.
- `required?` (`boolean`): Makes the field required.

### State

- `filled` (`boolean`): Whether the field holds any text.
- `disabled` (`boolean`): Whether the field is disabled.
- `readOnly` (`boolean`): Whether the field is read-only.
- `required` (`boolean`): Whether the field is required.

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

There's no WAI-ARIA pattern for a multi-line text field. The textarea stays a native `<textarea>`, with standard text editing, selection, spell checking and form behavior. Give it a visible field label or an `aria-label`, and keep descriptions and errors in their field parts so they're associated with it.

### Tested Behavior

Every line below is an automated test.

- The label names the textarea and the description describes it.

**Auto resize**

- Grows with its text and shrinks back.
- Stops at its max height and scrolls.
- Shrinks back when a reset empties it.
- Follows text written from code.

**Submit shortcut**

- Without a submit shortcut, Enter starts a new line and doesn't submit.
- With enter, Enter submits the form and Shift+Enter starts a new line.
- With mod+enter, Enter starts a new line and Cmd or Ctrl+Enter submits.
- Enter while an input method composes doesn't submit.

Runs in React, Vue and web components.
