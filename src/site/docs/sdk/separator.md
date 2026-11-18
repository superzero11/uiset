<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props.

### Separator

- `orientation?` (`SeparatorOrientation`): Which way the line runs. A vertical separator divides items in a row.
- `decorative?` (`boolean`): Hides the separator from assistive technology with `role="none"`, for a line that's only visual. Leave it off when the separator divides content a screen reader should hear as separate, like groups of menu items.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

What render functions and state-based class names receive.

- `orientation` (`SeparatorOrientation`): Which way the line runs.

## Accessibility

The component follows the [WAI-ARIA separator role](https://www.w3.org/TR/wai-aria-1.2/#separator). A separator divides content a screen reader should hear as separate, and it's announced with `role="separator"` and its `aria-orientation`. A decorative separator is only visual: it gets `role="none"`, so screen readers skip it. Use `decorative` only when the surrounding content already conveys the division. Either way, a separator never takes focus, so Tab moves past it.

### Tested Behavior

Every line below is an automated test.

- A separator is announced with its orientation.
- A separator can't be focused.
- A separator carries its orientation for styling.

Runs in React, Vue and web components.
