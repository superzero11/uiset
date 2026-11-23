<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props.

### Meter

- `min?` (`number`): The lowest value.
- `max?` (`number`): The highest value.
- `format?` (`NumberFormat`): How the value reads, for screen readers and the Value part: `Intl.NumberFormat` options, or a function of the value. A percent style shows where the value sits between `min` and `max`; any other style shows the value itself, like `{ style: "unit", unit: "gigabyte" }`.
- `locale?` (`string`): The locale the value is formatted in. Defaults to the page's `lang`, or the browser's language without one, once the page is interactive. Server markup uses English until then, so it never disagrees with the client.
- `getValueLabel?` (`((value: number, details: GaugeLabelDetails<number>) => string)`): The text screen readers announce for the value, when the formatted value says too little, like "3 of 12 files". It receives the value, null while a progress bar is indeterminate, and details: the `formatted` value, its `percent`, `min` and `max`.
- `value` (`number`): The reading, between `min` and `max`. Outside them, the fill, the percentage and `aria-valuenow` are clamped, while the state keeps the value as given. A meter always has a value, since there's no busy state.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

What render functions, state-based class names and slots receive. Every part gets the same state.

- `value` (`number`): The value, as given.
- `percent` (`number`): Where the value sits between `min` and `max`, from 0 to 100.

`MeterValue` adds the formatted text:

- `value` (`number`): The value, as given.
- `percent` (`number`): Where the value sits between `min` and `max`, from 0 to 100.
- `text` (`string`): The formatted value, like "40%".

## Accessibility

Name the component with `MeterLabel` or `aria-label`. It exposes the range and formatted value through the `meter` role. Use `getValueLabel` when that value needs more explanation.

### Tested Behavior

Every line below is an automated test.

- A meter is named by its label and reads its value.
- The value part shows the formatted value.
- The indicator is as wide as the value.
- A new value updates the meter.
- Min and max set where the value sits.
- A unit format reads the value itself.
- A value label replaces the formatted value for screen readers.
- A value above the maximum reads as the maximum and fills the track.

Runs in React, Vue and web components.
