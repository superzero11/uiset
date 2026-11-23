<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### DatePicker

- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `month?` (`string`): The first month shown, like `"2026-10"`. Pass it to control the calendar.
- `defaultMonth?` (`string`): The first month it shows, when uncontrolled. Defaults to the selected date's month, else today's.
- `min?` (`string`): The earliest date that can be picked. Keys stop there, and Previous stops at its month.
- `max?` (`string`): The latest date that can be picked.
- `unavailable?` (`DateMatchers`): Dates that can't be picked, like booked days, as data: ISO dates, `{ from, to }`, `{ weekday: [0, 6] }` for weekends, `{ before }`, `{ after }`, or a function. They stay focusable, so keyboard users hear them.
- `disabled?` (`boolean`): Whether nothing can be picked or focused.
- `readOnly?` (`boolean`): Whether dates can be focused but not picked.
- `months?` (`number`): How many months show side by side, each in its own grid.
- `pageBy?` (`"month" | "page"`): Whether Previous, Next and keys turn one month, or all the months shown.
- `locale?` (`string`): The language of the names and labels. Defaults to the page's `lang`, then the browser's.
- `weekStartsOn?` (`number`): The first day of the week, 0 for Sunday. Defaults to the locale's.
- `weekdayFormat?` (`"long" | "narrow" | "short"`): How weekday headers are written.
- `monthFormat?` (`"long" | "narrow" | "short"`): How month names are written, in the heading and the month select.
- `fixedWeeks?` (`boolean`): Whether every month shows six weeks, so the calendar doesn't change height.
- `showOutsideDays?` (`boolean`): Whether the days of the months before and after show at the edges.
- `today?` (`string`): Today's date, for `aria-current` and the starting month. Defaults to today in `timeZone`, read on the client.
- `timeZone?` (`string`): The time zone that says what day today is, like `"America/New_York"`. Defaults to the browser's.
- `minDays?` (`number`): The fewest days a range can span, counting both ends.
- `maxDays?` (`number`): The most days a range can span, counting both ends.
- `allowUnavailable?` (`boolean`): Whether a range may hold unavailable dates, like a stay over a booked night.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `mode?` (`DatePickerMode`): How many dates it selects: one, or a range from a start to an end, with an input for each.
- `value?` (`DatePickerValue`): The selected value: an ISO date, `[start, end]` in range mode, or `null`. Pass it to control the date picker.
- `defaultValue?` (`DatePickerValue`): The value it starts with, when uncontrolled, and goes back to when its form resets.
- `onValueChange?` (`((value: DatePickerValue, details: ChangeDetails<DatePickerValueChangeReason>) => void)`): Runs when a date is picked in the calendar (`"item-press"`), a typed date is committed on Enter or blur (`"input-commit"`), a preset or Clear is pressed, the form resets, or a controller sets it. A range changes once both ends are set. `details.cancel()` keeps the value.
- `onMonthChange?` (`((month: ISOMonth, details: ChangeDetails<DatePickerMonthChangeReason>) => void)`): Runs when the months the calendar shows want to change, as in Calendar, or a typed date or a preset turns them.
- `open?` (`boolean`): Whether the popup is open. Pass it to control the popup.
- `defaultOpen?` (`boolean`): Whether the popup starts open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<DatePickerOpenChangeReason>) => void)`): Runs when the popup wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the popup has finished opening or closing, after any animation.
- `closeOnSelect?` (`boolean`): Whether picking a date, or a range's end, or pressing a preset closes the popup.
- `presentation?` (`PresentationSetting<"popover">`): How the popup presents. `"sheet"` slides it up from the bottom of the screen, and `"auto"` does that on small touch screens.
- `name?` (`string`): The name the date submits under, as an ISO date. In range mode, both ends submit under it unless `startName` and `endName` are set.
- `startName?` (`string`): The name a range's start submits under.
- `endName?` (`string`): The name a range's end submits under.
- `form?` (`string`): The id of the form it belongs to, when it isn't inside it.
- `required?` (`boolean`): Whether a date must be entered before its form submits.
- `controller?` (`object`): Drives it from anywhere. Create one with `createDatePickerController()`.
- `dismissible?` (`boolean`): Whether Escape, an outside press, focus or the window leaving, Android's back gesture and a sheet's swipe can close it. Triggers, Close parts and the controller always can. Pass `false` while it holds unsaved work, and ask in `onDismissAttempt`.
- `onDismissAttempt?` (`function`): Runs when `dismissible` refused a dismissal made on purpose: Escape, an outside press, back or a swipe. Focus or the window leaving is refused without it. Ask "Discard changes?" here.

### DatePickerInput

- `end?` (`boolean`): Whether it's a range's end. The input without it holds the start, or the date.

### DatePickerTrigger

Opens and closes the calendar. Renders a `button` with `aria-haspopup="dialog"`, named by the chosen date.

### DatePickerHint

Describes the expected format, and its state includes an example date. Renders a `span` that describes the input.

### DatePickerClear

Clears the value and focuses the input. Renders a `button`.

### DatePickerContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the input the popup opens on.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the popup lines up with the input along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the input and the popup, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the input, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `finalFocus?` (`PopupFocusTarget`): Where focus goes when the popup closes while focus is inside it.
- `keepMounted?` (`boolean`): Whether the popup stays in the page, hidden, while closed. Its content keeps its state between opens.
### DatePickerPreset

- `value` (`DatePickerValue`): The value it selects: an ISO date, or `[start, end]` in range mode.

`DatePickerTrigger`, `DatePickerHint` and `DatePickerClear` take no props of their own.

### State

What render functions, state-based class names and children functions receive, per part.

`DatePicker`:

- `value` (`DatePickerValue`): The selected value.
- `mode` (`DatePickerMode`): How it selects.
- `open` (`boolean`): Whether the popup is open.
- `disabled` (`boolean`): Whether it can't be used.
- `readOnly` (`boolean`): Whether dates can be seen but not changed.
- `invalid` (`boolean`): Whether an input holds text that isn't a date that can be picked.

`DatePickerInput`:

- `invalid` (`boolean`): Whether its text isn't a date that can be picked, after Enter or blur.
- `disabled` (`boolean`): Whether it can't be used.
- `readOnly` (`boolean`): Whether its text can't be changed.

`DatePickerTrigger`:

- `open` (`boolean`): Whether the popup is open.
- `disabled` (`boolean`): Whether it can't be pressed.

`DatePickerContent`:

- `open` (`boolean`): Whether the popup is open. False while it animates out.
- `presentation` (`"popover" | "sheet"`): How it presents this time it's open.

`DatePickerHint`:

- `placeholder` (`string`): The format, with a letter for each digit, like "MM/DD/YYYY", "TT.MM.JJJJ" in German.
- `example` (`string`): December 31 of this year in the format, like "12/31/2026".

`DatePickerPreset`:

- `selected` (`boolean`): Whether its value is the one selected.
- `disabled` (`boolean`): Whether it can't be pressed.

`DatePickerClear`:

- `empty` (`boolean`): Whether there's nothing to clear.
- `disabled` (`boolean`): Whether it can't be pressed.

### Reasons

`details.reason` says why the value changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `input-commit` (`KeyboardEvent | FocusEvent`): Enter, or leaving a number input, committed what was typed: a number input parses, clamps and snaps it to the step, and an autocomplete closes its suggestions on it.
- `preset-press`
- `clear-press` (`MouseEvent | KeyboardEvent`): A Clear part was pressed, like on an input, a select or a combobox.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

Why the popup opened or closed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `preset-press`
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

With `dismissible` false, the refused dismissals `onDismissAttempt` reports:

- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

### Controller

Create one with `createDatePickerController()` and pass it as `controller`.

- `getValue()` (`() => DatePickerValue`): The selected value: an ISO date, a `[start, end]` range, or `null`.
- `setValue(value, options?)` (`(value: DatePickerValue, options?: DatePickerChangeOptions<DatePickerValueChangeReason> | undefined) => boolean`): Selects a value. Returns false when canceled, unchanged, disabled, read-only, or holding a date people can't pick, like one past `max`.
- `clear(options?)` (`(options?: DatePickerChangeOptions<DatePickerValueChangeReason> | undefined) => boolean`): Selects nothing, as the Clear part does. Returns false when canceled or unchanged.
- `getMonth()` (`() => string`): The first month the calendar shows, like `"2026-10"`.
- `setMonth(month, options?)` (`(month: string, options?: DatePickerChangeOptions<DatePickerMonthChangeReason> | undefined) => boolean`): Shows a month first. Returns false when canceled or unchanged.
- `previous(options?)` (`(options?: DatePickerChangeOptions<DatePickerMonthChangeReason> | undefined) => boolean`): Shows the months before, as the Previous part does.
- `next(options?)` (`(options?: DatePickerChangeOptions<DatePickerMonthChangeReason> | undefined) => boolean`): Shows the months after, as the Next part does.
- `focus(date?)` (`(date?: string | undefined) => void`): Focuses a date in the open calendar, turning the months to show it, or the date with the tab stop.
- `isOpen()` (`() => boolean`): Whether the popup is open.
- `setOpen(open, options?)` (`(open: boolean, options?: DatePickerChangeOptions<DatePickerOpenChangeReason> | undefined) => boolean`): Opens or closes the popup. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (DatePickerChangeOptions<DatePickerOpenChangeReason> & { signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens the popup, and resolves once it closes, with why and how. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the date picker leaves the page.
- `close(options?)` (`(options?: DatePickerChangeOptions<DatePickerOpenChangeReason> | undefined) => boolean`): Closes the popup. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: DatePickerChangeOptions<DatePickerOpenChangeReason> | undefined) => boolean`): Opens the popup if it's closed, and closes it if it's open. Returns false when the change was canceled.

### Events

Callbacks get the new value first, then the details.

| Prop               | On           | Receives                                                           |
| ------------------ | ------------ | ------------------------------------------------------------------ |
| `onValueChange`    | `DatePicker` | `(value, details)`: the new value, and the [reason](#reasons)      |
| `onOpenChange`     | `DatePicker` | `(open, details)`: whether the popup opens, and the reason         |
| `onMonthChange`    | `DatePicker` | `(month, details)`: the calendar's new first month, and the reason |
| `onDismissAttempt` | `DatePicker` | `({ reason, event })`, when a dismissal was refused                |

## Accessibility

It follows the [WAI-ARIA date picker dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/): a plain text input that every screen reader handles, a button with `aria-haspopup="dialog"` and `aria-expanded` named by the date chosen, and a dialog holding the calendar's grid. Focus moves into the grid when the dialog opens and back to the button when a date is picked or Escape closes it. Every line below is an automated test.

### Keyboard

| Key             | Where   | Action                                                                        |
| --------------- | ------- | ----------------------------------------------------------------------------- |
| Enter           | Input   | Commit the typed date.                                                        |
| Alt+Down Arrow  | Input   | Open the calendar.                                                            |
| Enter / Space   | Trigger | Open or close the calendar.                                                   |
| Escape          | Popup   | Cancel an unfinished range first; otherwise close the popup.                  |
| Tab / Shift+Tab | Popup   | Move through controls. Leaving the popup closes it when dismissal is allowed. |

Opening focuses the selected date, otherwise today, otherwise the first focusable date. The calendar’s [arrow keys and month navigation](/docs/components/calendar#keyboard) work here too. An ancestor’s `dir="rtl"` reverses Left and Right Arrow to follow the visual order.

### Tested Behavior

- A typed date in the page's format becomes the value on Enter, and the form submits it as ISO.
- Text that isn't a date stays as typed and marks the input invalid.
- Text that isn't a date blocks the form's submit until it's fixed.
- Clearing text that isn't a date lets the form submit.
- A message the app set on the input comes back once the text is a date.
- The date picker element reports text that isn't a date as its own bad input. Web components only.
- The format hint describes the input.
- The trigger opens a dialog with focus on the selected date, and Escape closes it back to the trigger.
- With nothing selected, focus goes to today.
- Picking a day fills the input, closes the dialog and returns focus to the trigger.
- With closeOnSelect off, the dialog stays open after a pick.
- Alt+ArrowDown in the input opens the calendar.
- A typed date opens the calendar on its month.
- A press outside closes the dialog.
- A preset selects its value and closes the dialog.
- Clear empties the value and focuses the input.
- A form reset puts the default value back.
- A required date picker blocks an empty submit.
- Days past min and max can't be typed or picked.
- German reads and writes dates day first.

**Range**

- Picking a start and an end fills both inputs and closes after the end.
- Each end can be typed, and the value changes once both are set.
- An end before the start is invalid.
- An end that isn't a date blocks the form's submit until it's fixed.

Runs in React, Vue and web components.
