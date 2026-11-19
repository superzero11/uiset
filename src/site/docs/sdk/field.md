<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.13, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props.

A field has no change events. Read its state from the parts' data attributes, or from render functions. Set `debug` to log every state change and its reason.

### Field

- `name?` (`string`): The name the control submits under, when the control doesn't set its own.
- `disabled?` (`boolean`): Disables the control, and marks every part.
- `invalid?` (`boolean`): Whether the field shows as invalid, when your code decides, like a form library or an error from the server. `true` shows its errors now, `false` shows none whatever the browser thinks. Leave it out to show the browser's own validation once a submit finds the field invalid.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### FieldError

- `match?` (`boolean | ValidityKey`): When this error shows. `true` shows it always and `false` never. A validity flag, like `"valueMissing"`, shows it only for that problem of the browser's own validation. Without it, any problem shows it.

### FieldSet

- `disabled?` (`boolean`): Disables every control inside it, except those in its legend, and leaves them out of the form.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

- `disabled` (`boolean`): Whether the field is disabled, by itself or by a `<fieldset>`.
- `required` (`boolean`): Whether the control is required, read from its `required` or `aria-required`.
- `focused` (`boolean`): Whether focus is inside the control.
- `invalid` (`boolean`): Whether the field shows as invalid: `invalid` when you pass it, else the browser's validation once shown.
- `valid` (`boolean`): Whether the browser's validation passes, once shown. Always false while you pass `invalid`.

- `disabled` (`boolean`): Whether the field is disabled, by itself or by a `<fieldset>`.
- `required` (`boolean`): Whether the control is required, read from its `required` or `aria-required`.
- `focused` (`boolean`): Whether focus is inside the control.
- `invalid` (`boolean`): Whether the field shows as invalid: `invalid` when you pass it, else the browser's validation once shown.
- `valid` (`boolean`): Whether the browser's validation passes, once shown. Always false while you pass `invalid`.
- `message` (`string`): The browser's message for the current problem. Children you pass show instead.

A `FieldDescription` receives the field's state, or only `disabled` when it describes a field set.

- `disabled` (`boolean`): Whether the field set is disabled, by itself or by a field set around it. Whether the field is disabled, by itself or by a `<fieldset>`.
- `required` (`boolean | undefined`): Whether the control is required, read from its `required` or `aria-required`.
- `focused` (`boolean | undefined`): Whether focus is inside the control.
- `invalid` (`boolean | undefined`): Whether the field shows as invalid: `invalid` when you pass it, else the browser's validation once shown.
- `valid` (`boolean | undefined`): Whether the browser's validation passes, once shown. Always false while you pass `invalid`.

Every part of a field set receives the same state.

- `disabled` (`boolean`): Whether the field set is disabled, by itself or by a field set around it.

## Accessibility

The label names the control with `aria-labelledby`, beside a native `<label for>` where the control can take one. The description and any error that shows describe it with `aria-describedby`, and an invalid control has `aria-invalid`. The tests below cover these connections and keyboard behavior.

**Labelling**

- The label names the control.
- The description describes the control.
- Clicking the label of a text field focuses it.

**A label wrapping a field**

- Names the control inside it.
- Checks its control when clicked anywhere.
- Keeps the field's description on its control.
- Names a control that renders after it.
- Keeps the part's data-slot.
- Warns in development only when a label outside a field labels nothing.
- A description and an error outside a field keep their data-slot. Web components only.
- A hidden error outside a field stays hidden whatever display its class gives. Web components only.
- An error outside a field follows its match. Web components only.
- An error outside a field shows a child that arrives after it. Web components only.

**Errors**

- Stay hidden until the form tries to submit.
- Show the browser's message when they have no text of their own.
- Count another library's form-associated element inside the field.
- Describe the control while they show.
- Update as the value changes once shown.
- Update as state set from script changes the value once shown. Web components only.
- A field marked invalid shows its error right away.
- A field marked valid never shows the browser's errors.
- A form reset hides them again.
- Errors in the page replace the browser's message, and the first invalid control takes focus.

Runs in React, Vue and web components.

In a field set:

- The legend names the group.
- A disabled field set disables the controls inside and leaves them out of the form.
- Enabling it again restores the controls.
- A field set disabled from the start disables its required fields.
- Fields in a disabled field set mark their parts disabled.

**Enhancements**

- The description describes the group.

Runs in React, Vue and web components.

In a form:

- The form submits every checked control's name and value.
- Unchecked controls submit nothing.
- A checkbox outside the form joins it with the form attribute.
- Required controls block submission.
- A form reset returns every control to its default.
- A reset returns to the default value, not to nothing.
- A disabled fieldset disables the controls inside it.
- A read-only control still submits.
- A user's change fires native input and change events on the form.

Runs in React, Vue and web components.
