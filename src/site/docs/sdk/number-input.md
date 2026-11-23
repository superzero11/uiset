<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### NumberInput

- `value?` (`number | null`): The value, or null for an empty field. Pass it to control the field.
- `defaultValue?` (`number | null`): The value at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`((value: number | null, details: ChangeDetails<NumberInputValueChangeReason>) => void)`): Runs when the value changes: as a typed number becomes valid, and on every step. `details.cancel()` stops it.
- `onValueCommit?` (`((value: number | null, details: CommitDetails<NumberInputValueChangeReason>) => void)`): Runs once an interaction that changed the value ends: typing is committed, a key or a button is released, or a scrub ends. For saving.
- `min?` (`number`): The lowest value. Typed values below it are raised to it when committed.
- `max?` (`number`): The highest value. Typed values above it are lowered to it when committed.
- `step?` (`number`): How far one step moves. Committed values snap to steps from `min`, or from 0 without one.
- `largeStep?` (`number`): How far Page Up, Page Down, and Shift with an arrow key, a button, the wheel or a scrub move.
- `smallStep?` (`number`): How far Alt (Option on a Mac) with an arrow key, the wheel or a scrub moves, for fine changes. Values it reaches snap to it rather than to `step`.
- `format?` (`Intl.NumberFormatOptions`): How the value shows: `Intl.NumberFormat` options, like `{ style: "currency", currency: "USD" }`. Typing accepts the same format in the locale, and percents are fractions: 50% is 0.5.
- `locale?` (`string`): The locale for formatting and reading typed numbers. Defaults to the page's `lang`, or the browser's language without one, once the page is interactive. Server markup uses English until then, so it never disagrees with the client.
- `wheel?` (`boolean`): Lets the mouse wheel step the value while the input has focus.
- `disabled?` (`boolean`): Disables it like a native control: it can't be focused or changed, and isn't submitted.
- `readOnly?` (`boolean`): Keeps it focusable and submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission while it's empty, with the browser's own message.
- `name?` (`string`): The name it submits under. The number is submitted as is, like `1234.5`, never formatted.
- `form?` (`string`): The id of a form to belong to, when it isn't inside that form.
- `controller?` (`object`): Steps it from anywhere. Create one with `createNumberInputController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### NumberInputScrubArea

- `orientation?` (`"horizontal" | "vertical"`): Which way to drag: right and up increase.
- `pixelsPerStep?` (`number`): How far the pointer moves for one step, in CSS pixels.
- `controller?` (`object`): Connects a scrub area outside the number input, like an icon in a toolbar, to the number input with this controller. Inside it, it connects on its own. Web components use `for="<number input id>"` instead.

### NumberInputIncrement and NumberInputDecrement

- `disabled?` (`boolean`): Turns off this button alone. Pressing, clicking or holding it doesn't step.

### State

What render functions, state-based class names and slots receive. Every part gets the field's state.

- `value` (`number | null`): The value, or null when empty.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: it stays focusable and submitted, but typing, steps and scrubs don't change it.
- `required` (`boolean`): Whether a form won't submit while it's empty.
- `scrubbing` (`boolean`): Whether a scrub is moving the value.

The buttons' state, `NumberInputButtonState`, says whether that button can step, and whether the value is at its bound, apart from a disabled field:

- `value` (`number | null`): The value, or null when empty.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`. Whether the button can't step, because it or the field is disabled, the field is read-only, or the value is at its bound.
- `readOnly` (`boolean`): Whether it's read-only: it stays focusable and submitted, but typing, steps and scrubs don't change it.
- `required` (`boolean`): Whether a form won't submit while it's empty.
- `scrubbing` (`boolean`): Whether a scrub is moving the value.
- `atBound` (`boolean`): Whether the value is at the bound this button steps toward, like the maximum for the increment.

### Reasons

`details.reason` says why the value changed.

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `input-commit` (`KeyboardEvent | FocusEvent`): Enter, or leaving a number input, committed what was typed: a number input parses, clamps and snaps it to the step, and an autocomplete closes its suggestions on it.
- `step-key` (`KeyboardEvent`): Arrow, Page Up, Page Down, Home or End stepped a slider or a number input.
- `increment-press` (`MouseEvent | PointerEvent`): A number input's increment button was pressed, or held.
- `decrement-press` (`MouseEvent | PointerEvent`): A number input's decrement button was pressed, or held.
- `wheel` (`WheelEvent`): The mouse wheel stepped a focused number input.
- `scrub` (`PointerEvent`): A drag on a number input's scrub area.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createNumberInputController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the change callback like a press, and returns `false` when the change is canceled.

- `getValue()` (`() => number | null`): The value, or null when the field is empty.
- `setValue(value, options?)` (`(value: number | null, options?: NumberInputChangeOptions | undefined) => boolean`): Sets the value, as a user would. It's clamped and snapped to the step.
- `increment(options?)` (`(options?: (NumberInputChangeOptions & { large?: boolean | undefined; }) | undefined) => boolean`): Steps the value up, by `largeStep` with `{ large: true }`.
- `decrement(options?)` (`(options?: (NumberInputChangeOptions & { large?: boolean | undefined; }) | undefined) => boolean`): Steps the value down, by `largeStep` with `{ large: true }`.
- `focus()` (`() => void`): Moves focus to the input.

### Events

Callbacks get the new value first, then the details.

| Prop            | On            | Receives                                                                          |
| --------------- | ------------- | --------------------------------------------------------------------------------- |
| `onValueChange` | `NumberInput` | `(value, details)`: the new value, or null when empty, and the [reason](#reasons) |
| `onValueCommit` | `NumberInput` | `(value, details)`: the value once the interaction ends, and its reason           |

## Accessibility

Follows the keyboard model of the [WAI-ARIA spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) on a native text input, so ordinary text editing works too. Give the input a FieldLabel or `aria-label`, and name both step buttons. Each button points to the input with `aria-controls`.

### Keyboard

| Input                                               | Increment                                         |
| --------------------------------------------------- | ------------------------------------------------- |
| ArrowUp, ArrowDown, or a step button                | `step`, which defaults to 1.                      |
| Shift with an arrow or button; Page Up or Page Down | `largeStep`, which defaults to ten steps.         |
| Alt (Option) with an arrow key                      | `smallStep`, which defaults to a tenth of a step. |
| Home or End                                         | The minimum or maximum, when set.                 |

Enter commits typed text. The step buttons stay out of the Tab order, because the focused input gives the same steps through its arrow keys.

### Tested Behavior

Every line below is an automated test.

**Keyboard**

- Starts with its default value, formatted.
- ArrowUp and ArrowDown step the value.
- Full-width digits from an input method commit as a number.
- Shift with an arrow key steps by the large step.
- Home and End go to the minimum and the maximum.
- Stepping stops at the bounds.
- Steps keep cents exact.
- The buttons aren't in the tab order.

**Typing**

- Typing a number changes the value.
- A typed value above the maximum is lowered when focus leaves.
- Typed text in the format is read and formatted when focus leaves.
- Typing sends change only once the text is committed.
- Letters can't be typed.
- Arrow keys step from what's typed.
- Text that isn't a number goes back to the value when focus leaves.
- The value commits when focus leaves.

**Buttons**

- The increment and decrement buttons step the value.
- A button at its bound is disabled and marked data-at-bound.
- Holding a button repeats the step.
- A press commits when the button is released.
- A disabled button is marked disabled.
- A disabled button doesn't step when clicked or held, and the other still does.
- <button disabled> inside a step button element stays disabled past a bound. Web components only.
- A button disabled while it's held stops repeating.

**State and forms**

- Submits the number as is, not formatted.
- A disabled field can't be focused or changed.
- A read-only field can be focused, but not changed.
- A required empty field blocks the form.
- The mouse wheel does nothing unless turned on.
- The mouse wheel steps a focused field when turned on.
- A canceled change keeps the value.
- A controlled field follows its value.
- Reads and writes the locale's format.

Runs in React, Vue and web components.

Beyond the pattern:

- Page Up and Page Down step by the large step.
- A form reset returns every field to its default.
- A typed value snaps to the step when focus leaves.
- Enter commits and formats what's typed.
- Holding an arrow key commits once, when the key comes up.
- A field with cents asks for a decimal keypad.
- A scrub steps by distance, whatever the speed.
- A scrub that doesn't move commits nothing.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while moving to a number input with a keyboard.

Runs in React, Vue and web components.
