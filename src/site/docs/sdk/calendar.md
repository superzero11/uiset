<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.13, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Calendar

- `mode?` (`CalendarMode`): How many dates it selects: one, any number, or a range from a start to an end.
- `value?` (`CalendarValue`): The selected value: an ISO date for `"single"`, a list for `"multiple"`, `[start, end]` for `"range"`, or `null`. Pass it to control the calendar.
- `defaultValue?` (`CalendarValue`): The value it starts with, when uncontrolled.
- `onValueChange?` (`((value: CalendarValue, details: ChangeDetails<CalendarValueChangeReason>) => void)`): Runs when a date is pressed (`"item-press"`), with Enter or Space too, or a controller sets the value (`"imperative"`). A range changes once both ends are picked. `details.cancel()` keeps the value.
- `month?` (`string`): The first month shown, like `"2026-10"`. Pass it to control the calendar.
- `defaultMonth?` (`string`): The first month it shows, when uncontrolled. Defaults to the selected date's month, else today's.
- `onMonthChange?` (`((month: ISOMonth, details: ChangeDetails<CalendarMonthChangeReason>) => void)`): Runs when the months shown want to change: Previous or Next, a key moving focus to another month, a press on a day of another month, or a controller.
- `min?` (`string`): The earliest date that can be picked. Keys stop there, and Previous stops at its month.
- `max?` (`string`): The latest date that can be picked.
- `unavailable?` (`DateMatchers`): Dates that can't be picked, like booked days, as data: ISO dates, `{ from, to }`, `{ weekday: [0, 6] }` for weekends, `{ before }`, `{ after }`, or a function. They stay focusable, so keyboard users hear them.
- `disabled?` (`boolean`): Whether nothing can be picked or focused.
- `readOnly?` (`boolean`): Whether dates can be focused but not picked.
- `deselectable?` (`boolean`): Whether pressing the selected date again clears it, in `"single"` mode.
- `onFocusedChange?` (`((date: ISODate, details: ChangeDetails<CalendarFocusedChangeReason>) => void)`): Runs before keys, a press or `focus()` move focus to another day. Canceling keeps focus where it was.
- `onAnchorChange?` (`((anchor: ISODate | null, details: ChangeDetails<CalendarAnchorChangeReason>) => void)`): Runs before a press starts a range, or ends it or Escape drops it, with `null`. Canceling keeps the start as it was.
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
- `controller?` (`object`): Drives it from anywhere. Create one with `createCalendarController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### CalendarPrevious

Shows the previous month. Renders a `button` that is disabled at `min`.

### CalendarHeading

Names the months shown, like "October 2026". Renders an `h2` the grid is labelled by, and screen readers hear it change.

### CalendarNext

Shows the next month. Renders a `button` that is disabled at `max`.

### CalendarMonthSelect

A native `select` of the months, in the locale, that changes the first month shown.

### CalendarYearSelect

A native `select` of the years from `min` to `max`, or 10 either side of the year shown.

### CalendarGrid

- `offset?` (`number`): Which of the months shown it is, from 0.

### CalendarWeekdays

Renders the header row. Its children are a function that receives each weekday's index.

### CalendarWeekday

- `index` (`number`): The column, from 0.

### CalendarWeeks

Renders the week rows. Its children are a function that receives each cell, with its `date`.

### CalendarDay

- `value` (`string`): Its ISO date.
- `offset?` (`number`): The offset of the grid it's in, read from that grid, so you don't pass it.

### State

What render functions, state-based class names and children functions receive, per part.

`Calendar`:

- `value` (`CalendarValue`): The selected value.
- `month` (`string`): The first month shown.
- `mode` (`CalendarMode`): How it selects.
- `disabled` (`boolean`): Whether nothing can be picked or focused.
- `readOnly` (`boolean`): Whether dates can be focused but not picked.
- `focused` (`string | null`): The date with the tab stop, `null` until days render in the browser.
- `anchor` (`string | null`): A range's start while its end is being picked, else `null`.

`CalendarHeading`:

- `month` (`string`): The first month shown, to format the heading yourself.
- `label` (`string`): The months shown in `monthFormat`, like "October 2026", or "October – November 2026".

`CalendarMonthSelect` and `CalendarYearSelect`:

- `value` (`number`): The first month shown's month, 1 to 12, or its year.
- `options` (`CalendarSelectOption[]`): Every month, or the years from `min` to `max` (10 either side of the year shown without them).
- `disabled` (`boolean`): Whether the calendar's `disabled` option is on. Inside a Date Picker, a disabled `<fieldset>` around the picker counts too.

`CalendarPrevious` and `CalendarNext`:

- `month` (`string`): The first month it shows.
- `disabled` (`boolean`): Whether it can't go further, past `min` or `max`.

`CalendarGrid`:

- `month` (`string`): The month it shows: the first month shown, plus its `offset`.
- `label` (`string`): The month's name and year in `monthFormat`, like "October 2026".
- `weekdays` (`number[]`): The weekday of each column, 0 for Sunday, in the order they show.
- `weeks` (`CalendarGridCell[][]`): The weeks, each seven cells. Render a day for each cell that isn't hidden.

`CalendarWeekday`:

- `weekday` (`number`): The weekday, 0 for Sunday.
- `label` (`string`): Its name, in `weekdayFormat`.
- `name` (`string`): Its full name, which screen readers hear.

`CalendarDay`:

- `date` (`string`): Its ISO date.
- `label` (`string`): The day of the month in the locale's digits, like "16".
- `selected` (`boolean`): Whether it's selected. In a range, every date from start to end is.
- `today` (`boolean`): Whether it's the `today` option's date, or else today in `timeZone`, read once the calendar runs in the browser.
- `outside` (`boolean`): Whether it belongs to the month before or after its grid's.
- `disabled` (`boolean`): Whether it can't be picked: outside `min` and `max`, unavailable, unable to end the range being picked, or the calendar is disabled.
- `unavailable` (`boolean`): Whether `unavailable` names it.
- `rangeStart` (`boolean`): Whether a range starts here, including one being picked.
- `rangeEnd` (`boolean`): Whether a range ends here, including one being picked.
- `inRange` (`boolean`): Whether it's inside a range, ends included, including one being picked.

### Reasons

`details.reason` says why the value changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

And why the month changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `previous-press` (`MouseEvent | KeyboardEvent`): A pagination's or a carousel's Previous part was pressed.
- `next-press` (`MouseEvent | KeyboardEvent`): A pagination's or a carousel's Next part was pressed.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `select-change`

Why focus moves to another day:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `focus-in` (`FocusEvent`): Keyboard focus moved into the component, which stops a rotating carousel, as the carousel pattern asks, or onto a canvas item, which brought it into view, or onto a calendar's day another way, like a screen reader's.

And why a range's start changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).

### Controller

Create one with `createCalendarController()` and pass it as `controller`. Every write method takes an optional `{ reason, event }` and returns `false` when the change is canceled, there's nowhere to go, or the calendar is disabled or read-only.

- `getValue()` (`() => CalendarValue`): The selected value: an ISO date, a list of them, or a `[start, end]` range.
- `setValue(value, options?)` (`(value: CalendarValue, options?: CalendarChangeOptions<CalendarValueChangeReason> | undefined) => boolean`): Selects a value. Returns false when canceled, unchanged, disabled, read-only, or holding a date people can't pick, like one past `max`.
- `getMonth()` (`() => string`): The first month shown, like `"2026-10"`.
- `setMonth(month, options?)` (`(month: string, options?: CalendarChangeOptions<CalendarMonthChangeReason> | undefined) => boolean`): Shows a month first. Returns false when canceled or unchanged.
- `previous(options?)` (`(options?: CalendarChangeOptions<CalendarMonthChangeReason> | undefined) => boolean`): Shows the months before, as the Previous part does.
- `next(options?)` (`(options?: CalendarChangeOptions<CalendarMonthChangeReason> | undefined) => boolean`): Shows the months after, as the Next part does.
- `focus(date?)` (`(date?: string | undefined) => void`): Focuses a date, turning the months to show it, or the date with the tab stop.

### Events

Callbacks get the new value first, then the details.

| Prop              | On         | Receives                                                                               |
| ----------------- | ---------- | -------------------------------------------------------------------------------------- |
| `onValueChange`   | `Calendar` | `(value, details)`: the new value, and the [reason](#reasons)                          |
| `onMonthChange`   | `Calendar` | `(month, details)`: the new first month, and the [reason](#reasons)                    |
| `onFocusedChange` | `Calendar` | `(date, details)`: the day focus moves to, and the [reason](#reasons)                  |
| `onAnchorChange`  | `Calendar` | `(date, details)`: a range's start, or `null` once it ends, and the [reason](#reasons) |

## Accessibility

It follows the grid of the [WAI-ARIA date picker dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/): each month is a `grid` named by its month, weekday headers are `columnheader`s named by their full names, and each day is a focusable `gridcell` named by its full date, like "Friday, October 16, 2026", with `aria-selected`, `aria-disabled` and `aria-current="date"`. A grid that selects several dates or a range is `aria-multiselectable`. Every line below is an automated test.

### Keyboard

The grid has one Tab stop: the selected date when visible, otherwise today, otherwise the first available date. Moving into another month shows it and then focuses the date.

| Key                             | Action                                          |
| ------------------------------- | ----------------------------------------------- |
| Left / Right Arrow              | Move one day, following the page’s direction.   |
| Up / Down Arrow                 | Move one week.                                  |
| Home / End                      | Move to the first or last day of the week.      |
| Page Up / Page Down             | Move one month, keeping the day where possible. |
| Shift+Page Up / Shift+Page Down | Move one year.                                  |
| Enter / Space                   | Select the focused date.                        |
| Escape                          | Cancel an unfinished range.                     |

### Tested Behavior

- The calendar shows a month as a grid of days under weekday headers.
- The selected date holds the tab stop, else today.
- Tab leaves the grid after one stop.
- Arrow keys move focus by day and week.
- Moving past the month's edge shows the next month and focuses the day there.
- Page Up and Page Down move by month, and with Shift by year.
- The day of the month stays the same, or the month's last, when moving by month.
- Home and End go to the first and last day of the week.
- The week starts on the locale's first day.
- Pressing a day selects it.
- Enter on a focused day selects it.
- Space on a focused day selects it.
- Previous and Next show the month before and after, and the heading announces it.
- Min and max stop keys there, and Previous and Next at their months.
- Unavailable dates can be focused but not selected.
- In multiple mode, presses toggle dates.
- In range mode, two presses pick a range, previewed in between.
- In range mode, keys preview the end and Escape drops the start.
- A range keeps to its fewest and most days, and keeps its start.
- Two months show side by side, and focus moves between them without turning.
- Pressing a day of the next month selects it and shows its month.
- Pressing another month's day before min keeps the month shown.
- Pressing another month's day before min leaves focus on the day that had it.
- A controlled calendar shows what the app passes.
- A controller turns to a date and focuses it.
- A disabled calendar has no tab stop and selects nothing.
- A read-only calendar moves focus but selects nothing.

**Month and year selects**

- They show the first month shown and turn the calendar, with the select-change reason.
- Years run from min to max, and months past them are disabled.
- They follow the page's language.

Runs in React, Vue and web components.

Beyond the baseline:

- Keys pressed without waiting still land on the right day.
- A day of next month takes focus even when its month renders after the key.

Runs in React, Vue and web components.
