<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### ColorPicker

- `value?` (`string`): The value, as a CSS color, like `"#0ea5e9"` or `"oklch(0.62 0.19 259)"`. Pass it to control the picker.
- `defaultValue?` (`string`): The value at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`((value: string, details: ColorPickerValueChangeDetails) => void)`): Runs while the value changes: on every step of a drag or a key. `details.color` is the color, and `details.cancel()` stops it.
- `onValueCommit?` (`((value: string, details: ColorPickerValueCommitDetails) => void)`): Runs once an interaction that changed the value ends: the pointer lifts, a key is pressed, a swatch is picked. For saving.
- `space?` (`ColorPickerSpace`): The space the parts edit in, which decides their channels: `"hsv"` has hue, saturation and brightness, `"hsl"` hue, saturation and lightness, `"srgb"` red, green and blue, `"oklch"` lightness, chroma and hue.
- `format?` (`ColorFormat`): How the value is written: `"hex"`, or a space in its CSS syntax, like `"oklch"`.
- `gamut?` (`false | ColorGamut`): The colors the value can hold. A drag can go past the edge, and the value is the closest color inside it; once the drag ends, the picker moves there too. `"p3"` allows wide-gamut screens' colors, and `false` any color.
- `disabled?` (`boolean`): Disables every part: they can't be focused or changed, and the value isn't submitted.
- `readOnly?` (`boolean`): Keeps the parts focusable and the value submitted, but stops changes.
- `required?` (`boolean`): Marks it required, with `data-required`. A color picker always has a value, so it never blocks a form.
- `name?` (`string`): The name the value submits under. Without one, the picker submits nothing.
- `form?` (`string`): The id of a form to belong to, when it isn't inside that form.
- `controller?` (`{ getValue: () => string; setValue: (value: string, options?: ColorPickerChangeOptions) => boolean; focus: () => void; }`): Sets the value from anywhere. Create one with `createColorPickerController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### ColorPickerArea

- `x?` (`ColorChannel`): The channel across, left to right.
- `y?` (`ColorChannel`): The channel up, bottom to top.

### ColorPickerSlider

- `channel?` (`ColorChannel`): The channel the slider edits, like `"hue"` or `"alpha"`.
- `orientation?` (`"horizontal" | "vertical"`): The slider's axis. Vertical sliders grow upward.

### ColorPickerChannelInput

- `channel?` (`ColorChannel`): The channel the input edits, like `"hue"` or `"alpha"`.

### ColorPickerSwatchItem

- `value` (`string`): The color it picks, as any CSS color.

### State

What render functions, state-based class names and slots receive. Every part gets the picker's state.

- `value` (`string`): The value, as a CSS color.
- `color` (`Color`): The color the parts show, in the picker's space. During a drag it can be outside the gamut.
- `space` (`ColorPickerSpace`): The space the parts edit in.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: the parts stay focusable, but nothing changes the value.
- `required` (`boolean`): Whether it's marked required.
- `outOfGamut` (`boolean`): Whether the color the parts show is outside the gamut, so the value is the closest one inside.

Sliders and their thumbs add their channel:

- `value` (`string`): The value, as a CSS color.
- `color` (`Color`): The color the parts show, in the picker's space. During a drag it can be outside the gamut.
- `space` (`ColorPickerSpace`): The space the parts edit in.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: the parts stay focusable, but nothing changes the value.
- `required` (`boolean`): Whether it's marked required.
- `outOfGamut` (`boolean`): Whether the color the parts show is outside the gamut, so the value is the closest one inside.
- `channel` (`ColorChannel`): The channel the slider edits.
- `channelValue` (`number`): The channel's value, in the units people read it in: degrees, percentages, 0 to 255 for red.
- `orientation` (`"horizontal" | "vertical"`): The slider's axis.

Preset items have their own:

- `selected` (`boolean`): Whether the picker's color looks the same as this swatch's, whatever each is written in.
- `disabled` (`boolean`): Whether pressing it changes nothing, since the picker is disabled or read-only.

### Reasons

`details.reason` says why the value changed.

- `track-press` (`PointerEvent`): A press on a slider's track or an area's surface moved the nearest thumb there.
- `drag` (`PointerEvent`): A slider thumb or a resize handle was dragged, or an item was dragged to a new place in a list.
- `step-key` (`KeyboardEvent`): Arrow, Page Up, Page Down, Home or End stepped a slider or a number input.
- `input-commit` (`KeyboardEvent | FocusEvent`): Enter, or leaving a number input, committed what was typed: a number input parses, clamps and snaps it to the step, and an autocomplete closes its suggestions on it.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `eye-dropper-pick`
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createColorPickerController()` and pass it as `controller`.

`setValue()` takes any CSS color and an optional `{ reason, event }`, runs the change callback like a drag, and returns `false` when the color can't be read or the change is canceled.

- `getValue()` (`() => string`): The value, as a CSS color.
- `setValue(value, options?)` (`(value: string, options?: ColorPickerChangeOptions | undefined) => boolean`): Sets the value from any CSS color, as a user would. Returns false for text that isn't one.
- `focus()` (`() => void`): Moves focus to the area's thumb, or the first slider's.

### Events

Callbacks get the new value first, then the details.

| Prop            | On            | Receives                                                                                |
| --------------- | ------------- | --------------------------------------------------------------------------------------- |
| `onValueChange` | `ColorPicker` | `(value, details)`: the new value, the [reason](#reasons) and `details.color`           |
| `onValueCommit` | `ColorPicker` | `(value, details)`: the value once the interaction ends, its reason and `details.color` |

## Accessibility

No WAI-ARIA pattern covers a color picker, so it's built from ones that do. The picker is a group. The area's thumb and each slider's thumb follow the [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/), and the area's thumb names both of its channels, like "Saturation 76%, Brightness 96%". The presets follow the [listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), and each one is named by its color, like "vivid red", as is `ColorPickerSwatch`.

The thumbs, inputs and presets are named in English by default. Pass `aria-label` to name them in another language.

### Keyboard

| Key                  | Does                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Arrow keys           | Move a thumb one step. On the area, Left and Right move across, Up and Down move up and down. |
| Shift with an arrow  | Moves ten steps                                                                               |
| Page Up or Page Down | Moves a tenth of the range, up the area or along a slider                                     |
| Home or End          | Moves to the start or end, across the area or along a slider                                  |
| Enter                | Reads the text in the input, or picks the focused preset                                      |
| Escape               | Puts the input's text back to the value                                                       |

Each key press commits, like the end of a drag.

### Tested Behavior

Every line below is an automated test.

**Value**

- The parts show the default value.
- A press on the area moves the color there, and commits when it lifts.
- A drag along a slider follows the pointer and commits once.
- The text input reads any CSS color on Enter, and text that isn't one goes back.
- A channel input sets its channel in its own units.
- A controller sets the value, and a canceled change keeps it.

**Keyboard**

- Arrows step a slider, Shift ten steps, and each press commits.
- Arrows move the area's thumb on both axes.
- Swatches are one tab stop, arrows move between them, and a press picks one.

**Forms**

- The value submits under its name, and a reset returns to the default.
- A disabled picker can't be focused or changed, and submits nothing.

**Gamut**

- In OKLCH, a color past the sRGB edge writes the closest one inside, and the thumb moves there once it lifts.
- The canvas paints the area, with the colors outside the gamut left clear.

Runs in React, Vue and web components.
