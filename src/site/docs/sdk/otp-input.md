<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.10, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props. `id`, `autoFocus`, `aria-label`,
`aria-labelledby`, `aria-describedby` and `aria-invalid` go to the input.

### OTPInput

- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `value?` (`string`): The code, for a controlled input.
- `defaultValue?` (`string`): The code it starts with, when uncontrolled. A form reset returns here.
- `onValueChange?` (`((value: string, details: ChangeDetails<OTPInputValueChangeReason>) => void)`): Runs when the code changes: typing or deleting (`"input-change"`), a paste (`"paste"`), the browser's undo and redo, a form reset, or a controller. Autofill and codes from the keyboard's suggestions are `"input-change"`. `details.cancel()` keeps the code as it was.
- `onValueCommit?` (`((value: string, details: CommitDetails<OTPInputValueChangeReason>) => void)`): Runs when a change fills every slot, with the whole code, like to verify it. A controller filling it counts, so does a code that changes while full.
- `maxLength?` (`number`): How many characters the code has, one slot each.
- `pattern?` (`OTPInputPattern`): Which characters it accepts: `"digits"`, `"letters"`, `"alphanumeric"`, or a regular expression each character must match, like `/[A-F0-9]/i`. Anything else typed, pasted or dropped is ignored.
- `inputMode?` (`"decimal" | "none" | "numeric" | "tel" | "text"`): The keyboard touch screens show.
- `textAlign?` (`"center" | "end" | "start"`): Where the invisible input keeps its text and caret. It decides where the browser puts its own popups, like the paste menu on phones. `"start"` and `"end"` follow the reading direction.
- `autoComplete?` (`string`): The input's `autocomplete`. `"one-time-code"` lets phones offer a code from a message, and password managers fill it.
- `disabled?` (`boolean`): Disables it like a native input: it can't be focused, and isn't submitted.
- `readOnly?` (`boolean`): Makes it read-only: focusable and submitted, but the code can't change.
- `required?` (`boolean`): Requires a code before the form submits. A partial code is too short either way.
- `name?` (`string`): The name it submits the code under.
- `form?` (`string`): The id of a form to belong to, when it isn't inside that form.
- `controller?` (`{ getValue: () => string; setValue: (value: string, options?: OTPInputChangeOptions) => boolean; clear: (options?: OTPInputChangeOptions) => boolean; focus: () => void; }`): Reads and writes the code from anywhere. Create one with `createOTPInputController()`.

### OTPInputSlot

- `index` (`number`): Which character of the code the slot shows, from 0.

### State

What render functions, state-based class names and slots receive. The root, groups and separators get the
input's state.

- `value` (`string`): The code.
- `slots` (`OTPInputSlotData[]`): One entry per slot: its character, whether it's active, and whether it draws a caret.
- `focused` (`boolean`): Whether the input has focus.
- `complete` (`boolean`): Whether every slot is filled.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.

Slots get their own:

- `char` (`string | null`): The character in the slot, or null when it's empty.
- `active` (`boolean`): Whether the slot is where typing goes: the selected character, or the empty slot after the last one.
- `hasFakeCaret` (`boolean`): Whether the slot should draw a caret: it's active and empty. The real caret is hidden.
- `index` (`number`): Which character of the code the slot shows.
- `focused` (`boolean`): Whether the input has focus.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.

### Reasons

`details.reason` says why the code changed. Autofill and a code from the keyboard's suggestions are `input-change`.

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `paste` (`ClipboardEvent`): Files were pasted, like a screenshot, or text and tokens into a token input.
- `undo` (`KeyboardEvent | InputEvent`): Undo, from the keyboard, the Edit menu or a controller.
- `redo` (`KeyboardEvent | InputEvent`): Redo, from the keyboard, the Edit menu or a controller.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createOTPInputController()` and pass it as `controller`.

`setValue()` and `clear()` take an optional `{ reason, event }`, and run the change callback like typing.

- `getValue()` (`() => string`): The code.
- `setValue(value, options?)` (`(value: string, options?: OTPInputChangeOptions | undefined) => boolean`): Sets the code, as typing it would. Characters that don't fit the pattern are dropped. Returns false when the change was canceled or nothing changed.
- `clear(options?)` (`(options?: OTPInputChangeOptions | undefined) => boolean`): Empties the code. Returns false when the change was canceled or nothing changed.
- `focus()` (`() => void`): Moves focus to the input.

### Events

Callbacks get the code first, then the details.

| Prop            | On         | Receives                                                        |
| --------------- | ---------- | --------------------------------------------------------------- |
| `onValueChange` | `OTPInput` | `(value, details)`: the new code and the [reason](#reasons)     |
| `onValueCommit` | `OTPInput` | `(value, details)`: the full code and the reason that filled it |

## Accessibility

Name the input with FieldLabel, a native label, `aria-label`, or `aria-labelledby`. Screen readers encounter one input with the whole code; the visual slots, groups, and separators are hidden from them.

### Keyboard

The input keeps its native keys. Arrow keys, Home, and End move the selection between slots, Backspace deletes, and your usual shortcuts undo and redo. Pasting a code such as `123-456` removes the separators.

### Tested Behavior

Every line below is an automated test.

- Typing fills the slots in order.
- Characters the pattern doesn't accept are ignored.
- Filling every slot completes the code.
- Backspace deletes the last character.
- ArrowLeft goes back a slot, and typing replaces its character.
- Pressing a filled slot lets you retype it.
- Pasting a code with a dash fills every slot.
- The form submits the code under its name.
- A partial default code is too short to submit.
- A typed partial code is too short, not the wrong format.
- A canceled change keeps the code.
- A disabled code can't be typed into.
- A code of letters and digits takes both.
- The input asks for a one-time code and a numeric keyboard.
- Typing a whole code with no waits fills it.

Runs in React, Vue and web components.
