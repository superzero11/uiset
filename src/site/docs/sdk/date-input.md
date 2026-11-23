<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### DateInput

- `value?` (`string | null`): The value: an ISO date like `"2026-11-02"`, with a time granularity a date and time like `"2026-11-02T14:30"`, or `null`. Pass it to control the input.
- `defaultValue?` (`string | null`): The value it starts with, when uncontrolled, and goes back to when its form resets.
- `onValueChange?` (`((value: string | null, details: ChangeDetails<DateInputValueChangeReason>) => void)`): Runs when the value wants to change: once every segment holds something, and again with `null` when one is emptied. `details.cancel()` keeps the value.
- `granularity?` (`DateInputGranularity`): The smallest unit it shows. `"day"` shows a date, and `"hour"`, `"minute"` or `"second"` add the time down to it.
- `hourCycle?` (`HourCycle`): A 12 or 24 hour clock for the time. Defaults to the locale's.
- `min?` (`string`): The earliest value, as an ISO date or date and time. A value before it is invalid.
- `max?` (`string`): The latest value. A date alone takes any time that day. A value after it is invalid.
- `unavailable?` (`DateMatchers`): Dates that can't be chosen, as in Calendar: ISO dates, `{ from, to }` ranges, weekdays or a function. A value on one is invalid.
- `locale?` (`string`): The language whose order, separators and clock it shows. Defaults to the page's.
- `disabled?` (`boolean`): Whether it can't be used.
- `readOnly?` (`boolean`): Whether the value can be seen but not changed.
- `required?` (`boolean`): Whether a value must be entered before its form submits.
- `name?` (`string`): The name the value submits under.
- `form?` (`string`): The id of the form it belongs to, when it isn't inside it.
- `controller?` (`object`): Drives it from anywhere. Create one with `createDateInputController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### DateInputSegment

- `segment` (`DateInputSegmentData`): The segment it shows, from the root's `segments`.

### State

What render functions, state-based class names and `children` receive.

- `value` (`string | null`): The value, or `null` while empty or partly filled.
- `segments` (`DateInputSegmentData[]`): The segments in the order the locale shows them, with the text between them. Render one part for each.
- `disabled` (`boolean`): Whether it can't be used, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the value can be seen but not changed.
- `invalid` (`boolean`): Whether the value is before `min`, after `max` or an unavailable date.

Each segment's state, `DateInputSegmentState`, is the segment with the input's state beside it:

- `key` (`string`): Tells segments apart: the type, or `"literal-<n>"` for the text between them.
- `type` (`DateInputSegmentType`)
- `text` (`string`): What it shows: the number, padded, or AM and PM in the locale. Empty while it holds nothing.
- `value` (`number | null`): The number it holds, or `null` while empty. AM is 0 and PM is 1.
- `min` (`number`): The smallest number it takes.
- `max` (`number`): The largest number it takes, like the days in the month.
- `empty` (`boolean`): Whether it holds nothing yet.
- `editable` (`boolean`): Whether it's a segment you type in, rather than the text between segments.
- `label` (`string`): Its name in the locale, like "month", which names it to assistive technology.
- `disabled` (`boolean`): Whether it can't be used.
- `readOnly` (`boolean`): Whether its value can't be changed.
- `invalid` (`boolean`): Whether the value is before `min`, after `max` or an unavailable date.

### Reasons

`details.reason` says why the value changed.

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `step-key` (`KeyboardEvent`): Arrow, Page Up, Page Down, Home or End stepped a slider or a number input.
- `paste` (`ClipboardEvent`): Files were pasted, like a screenshot, or text and tokens into a token input.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createDateInputController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the change callback like typing, and returns `false` when the change is canceled.

- `getValue()` (`() => string | null`): The value, or `null` while empty or partly filled.
- `setValue(value, options?)` (`(value: string | null, options?: DateInputChangeOptions | undefined) => boolean`): Sets the value. Returns false when it isn't a value the input can show, or when canceled.
- `clear(options?)` (`(options?: DateInputChangeOptions | undefined) => boolean`): Empties every segment.
- `focus(segment?)` (`(segment?: string | undefined) => void`): Focuses a segment, like `"month"`, or the first one.

### Events

Callbacks get the new value first, then the details.

| Prop            | On          | Receives                                                                               |
| --------------- | ----------- | -------------------------------------------------------------------------------------- |
| `onValueChange` | `DateInput` | `(value, details)`: the ISO date, or null once it's erased, and the [reason](#reasons) |

## Accessibility

The root is a group, named by its Field's label or by your `aria-label`. Each segment is a [spinbutton](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) named by its unit, like "month", with its value, range and text. An empty segment reads as "Empty". The text between segments is hidden from screen readers, which read each segment's name instead.

Segments are real inputs, so phones show a number pad and typing works before the page's script runs.

### Keyboard

| Key                    | Action                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| 0 to 9                 | Fill the segment, then move to the next one.                                |
| ArrowUp / ArrowDown    | Step the segment by one, wrapping around. An empty segment starts at today. |
| PageUp / PageDown      | Step by more: a year by 5, a month by 3, a day by 7, minutes by 15.         |
| Home / End             | Go to the segment's first or last value.                                    |
| ArrowLeft / ArrowRight | Move to the segment before or after.                                        |
| Backspace              | Remove the last digit, then empty the segment, then move back.              |
| Delete                 | Empty the segment.                                                          |
| A / P                  | Choose AM or PM, in a time with a 12-hour clock.                            |
| Enter                  | Submit the form with what was typed.                                        |
| Tab / Shift+Tab        | Move through the segments, then out of the input.                           |

In a right-to-left page, the segments keep the locale's order, and ArrowLeft and ArrowRight follow the order on screen.

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
