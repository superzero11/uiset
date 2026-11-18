<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props.

### Progress

- `min?` (`number`): The lowest value.
- `max?` (`number`): The highest value.
- `format?` (`NumberFormat`): How the value reads, for screen readers and the Value part: `Intl.NumberFormat` options, or a function of the value. A percent style shows where the value sits between `min` and `max`; any other style shows the value itself, like `{ style: "unit", unit: "gigabyte" }`.
- `locale?` (`string`): The locale the value is formatted in. Defaults to the page's `lang`, or the browser's language without one, once the page is interactive. Server markup uses English until then, so it never disagrees with the client.
- `getValueLabel?` (`((value: number | null, details: GaugeLabelDetails<number | null>) => string)`): The text screen readers announce for the value, when the formatted value says too little, like "3 of 12 files". It receives the value, null while a progress bar is indeterminate, and details: the `formatted` value, its `percent`, `min` and `max`.
- `value?` (`number | null`): How far the task has come, between `min` and `max`. Null means it's under way but how far is unknown, and the bar is indeterminate.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

What render functions, state-based class names and slots receive. Every part gets the same state.

- `value` (`number | null`): The value, or null while indeterminate.
- `percent` (`number | null`): Where the value sits between `min` and `max`, from 0 to 100, or null while indeterminate.
- `status` (`ProgressStatus`): Whether the progress is unknown, under way, or done.

`ProgressValue` adds the formatted text:

- `value` (`number | null`): The value, or null while indeterminate.
- `percent` (`number | null`): Where the value sits between `min` and `max`, from 0 to 100, or null while indeterminate.
- `status` (`ProgressStatus`): Whether the progress is unknown, under way, or done.
- `text` (`string`): The formatted value, like "40%". Empty while indeterminate.

## Accessibility

Name the component with `ProgressLabel` or `aria-label`. It exposes the range and formatted value through the `progressbar` role. Use `getValueLabel` when that value needs more explanation.

### Tested Behavior

Every line below is an automated test.

- A progress bar is named by its label and reads its value.
- The value part shows the formatted value.
- The indicator is as wide as the value.
- A new value updates the bar.
- Every part says whether the task is under way, done, or unknown.
- An indeterminate bar has no value.
- A unit format reads the value itself.
- A value label replaces the formatted value for screen readers.
- A value above the maximum reads as the maximum.

Runs in React, Vue and web components.
