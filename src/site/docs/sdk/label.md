<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props, along with a native label's `htmlFor`.

### Label

- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

## Accessibility

A native `<label>` names the element its `for` points at only when that element is labelable, like an input or a button. Label names any other control through `aria-labelledby`, unless the control has an `aria-label` or an `aria-labelledby` of its own, which win. Its press does what a native label's does: it checks a checkbox, a switch or a radio, focuses a group's checked radio, and focuses anything else. A press on a disabled control does nothing.

### Tested Behavior

Every line below is an automated test.

- A label names a native input, and a press focuses it.
- A label names a radio group, and a press focuses its checked radio.
- A label for a slider names its thumb, and a press focuses it.
- A label around a checkbox names it, and a press toggles it.
- A press on the label of a disabled group moves no focus.
- A control its author names keeps that name.
- A label names a control that renders after it.
- A double click on a label doesn't select its text.

Runs in React, Vue and web components.
