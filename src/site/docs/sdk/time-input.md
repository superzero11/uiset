<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### TimeInput

- `value?` (`string | null`): The value: a time like `"14:30"`, or `"14:30:15"` with seconds, or `null`. Pass it to control the input.
- `defaultValue?` (`string | null`): The value it starts with, when uncontrolled, and goes back to when its form resets.
- `onValueChange?` (`((value: string | null, details: ChangeDetails<TimeInputValueChangeReason>) => void)`): Runs when the value wants to change: once every segment holds something, and again with `null` when one is emptied. `details.cancel()` keeps the value.
- `granularity?` (`TimeInputGranularity`): The smallest unit it shows.
- `hourCycle?` (`HourCycle`): A 12 or 24 hour clock. Defaults to the locale's.
- `min?` (`string`): The earliest time, like `"09:00"`. A time before it is invalid.
- `max?` (`string`): The latest time, like `"17:30"`. A time after it is invalid.
- `locale?` (`string`): The language whose separators and clock it shows. Defaults to the page's.
- `disabled?` (`boolean`): Whether it can't be used.
- `readOnly?` (`boolean`): Whether the value can be seen but not changed.
- `required?` (`boolean`): Whether a time must be entered before its form submits.
- `name?` (`string`): The name the value submits under.
- `form?` (`string`): The id of the form it belongs to, when it isn't inside it.
- `controller?` (`object`): Drives it from anywhere. Create one with `createTimeInputController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

- `value` (`string | null`): The value, or `null` while empty or partly filled.
- `segments` (`DateInputSegmentData[]`): The segments in the order the locale shows them, with the text between them. Render one part for each.
- `disabled` (`boolean`): Whether it can't be used, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the value can be seen but not changed.
- `invalid` (`boolean`): Whether the value is before `min`, after `max` or an unavailable date.

### Reasons

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `step-key` (`KeyboardEvent`): Arrow, Page Up, Page Down, Home or End stepped a slider or a number input.
- `paste` (`ClipboardEvent`): Files were pasted, like a screenshot, or text and tokens into a token input.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

- `getValue()` (`() => string | null`): The value, or `null` while empty or partly filled.
- `setValue(value, options?)` (`(value: string | null, options?: DateInputChangeOptions | undefined) => boolean`): Sets the value. Returns false when it isn't a value the input can show, or when canceled.
- `clear(options?)` (`(options?: DateInputChangeOptions | undefined) => boolean`): Empties every segment.
- `focus(segment?)` (`(segment?: string | undefined) => void`): Focuses a segment, like `"month"`, or the first one.

### Events

| Prop            | On          | Receives                                                                           |
| --------------- | ----------- | ---------------------------------------------------------------------------------- |
| `onValueChange` | `TimeInput` | `(value, details)`: the time, or null once it's erased, and the [reason](#reasons) |

## Accessibility

The root is a group, named by its Field's label or by your `aria-label`. Each segment is a spinbutton named by its unit, like "hour" or "AM/PM", with its value, range and text. The keys are the same as in [Date Input](/docs/components/date-input#keyboard).

### Tested Behavior

Every line below is an automated test.

- Each unit is a spinbutton in the locale's order.
- Another locale orders the segments its own way.
- Typing fills each segment, moves on and reports the date once.
- A press on the box or between segments focuses the nearest segment.
- A digit that can't start a longer number moves on at once.
- A separator moves to the next segment.
- Typing with separators over a filled date or time keeps every segment.
- ArrowUp and ArrowDown step a segment and wrap around.
- PageUp and PageDown take bigger steps.
- Home and End go to a segment's first and last values.
- ArrowLeft and ArrowRight move between segments.
- Tab moves through the segments, then out.
- Backspace empties a segment, then moves back.
- A day past the end of a new month is moved back to its last day.
- Pasting a date fills every segment.
- A time takes hours, minutes and AM or PM.
- A 24-hour clock has no AM or PM.
- A date with a time shows its hour and minute too.
- A controller sets and clears the date.
- A canceled change keeps the date.
- The form submits the ISO date and time under their names.
- Enter submits the form with what was typed.
- Enter submits a form with no submit button, in a segment or the form's one text field.
- Resetting the form brings back the default date.
- A partly filled date can't be submitted.
- A required empty date can't be submitted.
- A date after max is invalid.
- An unavailable date is invalid.
- The field's label focuses the first segment.
- A read-only date takes focus but doesn't change.
- A disabled date can't be focused.
- Digits committed through an input method fill the segment.

Runs in React, Vue and web components.
