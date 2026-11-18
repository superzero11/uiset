<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.10, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Slider

- `value?` (`Value`): The value: a number for one thumb, or an array with one number per thumb, like `[20, 80]` for a range. Pass it to control the slider.
- `defaultValue?` (`Value`): The value at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`((value: Value, details: SliderValueChangeDetails) => void)`): Runs while the value changes: on every step of a drag or a key. `details.thumb` says which thumb moved, and `details.cancel()` stops it.
- `onValueCommit?` (`((value: Value, details: SliderValueCommitDetails) => void)`): Runs once an interaction that changed the value ends: the pointer lifts, the key comes up, or a screen reader adjusts it. For saving.
- `min?` (`number`): The lowest value.
- `max?` (`number`): The highest value. When the steps from `min` don't land on it, the highest step below it is the end.
- `step?` (`number`): How far one step moves, from `min`.
- `largeStep?` (`number`): How far Page Up, Page Down and Shift with an arrow key move.
- `minStepsBetweenThumbs?` (`number`): How many steps apart neighbouring thumbs stay. Thumbs never pass each other.
- `orientation?` (`"horizontal" | "vertical"`): The slider's axis. Vertical sliders grow upward.
- `disabled?` (`boolean`): Disables it like a native control: thumbs can't be focused or moved, and nothing is submitted.
- `readOnly?` (`boolean`): Keeps it focusable and submitted, but stops drags, keys and screen reader adjustments from changing it.
- `required?` (`boolean`): Marks it required, with `data-required`. A slider always has a value, so it never blocks a form.
- `name?` (`string`): The name it submits under: the number, or a range as `"start/end"`. Without one, it submits nothing.
- `form?` (`string`): The id of a form to belong to, when it isn't inside that form.
- `format?` (`NumberFormat`): How values read, for screen readers and `SliderValue`: `Intl.NumberFormat` options, like `{ style: "currency", currency: "EUR" }`, or a function of the value.
- `locale?` (`string`): The locale values are formatted in. Defaults to the page's `lang`, or the browser's language without one, once the page is interactive. Server markup uses English until then, so it never disagrees with the client.
- `controller?` (`{ getValue: () => Value; setValue(value: Value, options?: SliderChangeOptions): boolean; focus: (thumb?: number) => void; }`): Moves the slider from anywhere. Create one with `createSliderController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### SliderThumb

- `index?` (`number`): Which value the thumb shows, from 0. Give each thumb of a range its own.

### State

What render functions, state-based class names and slots receive. Every part gets the slider's state.

- `value` (`number | number[]`): The value: a number, or one number per thumb.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: it stays focusable and submitted, but drags and keys don't change it.
- `required` (`boolean`): Whether it's marked required.
- `dragging` (`boolean`): Whether a thumb is being dragged.
- `orientation` (`"horizontal" | "vertical"`): The slider's axis.

Thumbs add their own fields, and have their own value, `thumbValue`, in place of the whole `value`, so a thumb renders only when its own value moves:

- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: it stays focusable and submitted, but drags and keys don't change it.
- `required` (`boolean`): Whether it's marked required.
- `dragging` (`boolean`): Whether a thumb is being dragged.
- `orientation` (`"horizontal" | "vertical"`): The slider's axis.
- `index` (`number`): Which value the thumb shows.
- `thumbValue` (`number`): The thumb's own value.
- `percent` (`number`): Where the thumb sits, from 0 to 100.

`SliderValue` adds the formatted text:

- `value` (`number | number[]`): The value: a number, or one number per thumb.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: it stays focusable and submitted, but drags and keys don't change it.
- `required` (`boolean`): Whether it's marked required.
- `dragging` (`boolean`): Whether a thumb is being dragged.
- `orientation` (`"horizontal" | "vertical"`): The slider's axis.
- `text` (`string`): The formatted value, a range joined with an en dash.

### Reasons

`details.reason` says why the value changed.

- `track-press` (`PointerEvent`): A press on a slider's track or an area's surface moved the nearest thumb there.
- `drag` (`PointerEvent`): A slider thumb or a resize handle was dragged, or an item was dragged to a new place in a list.
- `step-key` (`KeyboardEvent`): Arrow, Page Up, Page Down, Home or End stepped a slider or a number input.
- `accessibility-adjust` (`Event`): A screen reader's adjust gesture, like a swipe up or down on a slider.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createSliderController()` and pass it as `controller`.

`setValue()` takes an optional `{ reason, event }`, runs the change callback like a drag, and returns `false` when the change is canceled.

- `getValue()` (`() => Value`): The value: a number, or one number per thumb.
- `setValue(value, options?)` (`(value: Value, options?: SliderChangeOptions | undefined) => boolean`): Sets the value, as a user would. It's clamped, snapped to the step and sorted.
- `focus(thumb?)` (`(thumb?: number | undefined) => void`): Moves focus to a thumb, the first by default.

### Events

Callbacks get the new value first, then the details.

| Prop            | On       | Receives                                                                                |
| --------------- | -------- | --------------------------------------------------------------------------------------- |
| `onValueChange` | `Slider` | `(value, details)`: the new value, the [reason](#reasons) and `details.thumb`           |
| `onValueCommit` | `Slider` | `(value, details)`: the value once the interaction ends, its reason and `details.thumb` |

## Accessibility

The slider follows the [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/), and the [multi-thumb slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/) for ranges. Each thumb is a native range input, named by a `FieldLabel` or its own `aria-label`, and the slider is a group around them.

### Keyboard

Focus a thumb to use these keys. Tab moves through the thumbs in order.

| Key                                        | Moves the thumb                                                       |
| ------------------------------------------ | --------------------------------------------------------------------- |
| ArrowRight or ArrowUp                      | One `step` up. In right to left, ArrowRight moves down.               |
| ArrowLeft or ArrowDown                     | One `step` down. In right to left, ArrowLeft moves up.                |
| Page Up, Page Down, or Shift with an arrow | By `largeStep`, ten steps by default.                                 |
| Home or End                                | To the minimum or maximum, or as far as a neighbouring thumb lets it. |

### Tested Behavior

Every line below is an automated test.

**Keyboard**

- Starts at its default value.
- ArrowRight and ArrowUp increase it by one step.
- ArrowLeft and ArrowDown decrease it by one step.
- Page Up and Page Down move by the large step.
- Shift with an arrow key moves by the large step.
- Home and End go to the minimum and the maximum.
- A value never goes past the bounds.
- Tab moves through the thumbs in order.
- Home and End move a range thumb as far as its neighbour.
- A range thumb stops at its neighbour.
- A canceled change keeps the value.
- A controlled slider follows its value.

**Pointer**

- Pressing the track moves the thumb there.
- Pressing the track focuses the thumb.
- Pressing a range's track moves the nearest thumb.
- Dragging a thumb follows the pointer.
- Grabbing a thumb off center doesn't move it.
- Dragging past the end stops at the bound.
- Dragging continues outside the slider.
- Dragging right from stacked thumbs moves the upper one.
- The value commits once, when the pointer lifts.
- A screen reader's adjustment reaches the form as one input and one change.
- A drag sends input as it moves, and change once when the pointer lifts.
- Pressing a thumb without moving commits nothing.
- A press on the track commits.
- The thumb sits at its value along the track.

**Vertical**

- It says it's vertical.
- ArrowUp increases it and ArrowDown decreases it.
- The bottom is the minimum.
- Dragging up increases it.

**Value and state**

- The value part shows the value, and a range joined with a dash.
- The value reads in the format and the locale.
- A disabled slider can't be focused or changed.
- Its parts say when it's dragged.
- A single slider submits its value under its name.

Runs in React, Vue and web components.

Beyond the pattern:

- A dragged range thumb stops at its neighbour, as the APG's multi-thumb slider says.
- Each range thumb's own range ends at its neighbour.
- A form reset returns every slider to its default.
- Holding an arrow key commits once, when the key comes up.
- Dragging left from stacked thumbs moves the lower one.
- Pressing the track beside stacked thumbs moves the one on that side.
- A key moves a thumb as close to its neighbour as the minimum distance allows.
- Touch drags on the control never scroll the page.
- A range submits one start/end value.
- Clicking a range's label focuses its first thumb.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while moving to a slider with a keyboard.
- A range thumb announces how far it can go and its formatted value.

Runs in React, Vue and web components.
