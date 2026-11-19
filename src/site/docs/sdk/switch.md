<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.13, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Switch

- `checked?` (`boolean`): Whether it's checked. Pass it to control the checkbox.
- `defaultChecked?` (`boolean`): Whether it's checked at first, when uncontrolled. A form reset returns to it.
- `onCheckedChange?` (`((checked: boolean, details: ChangeDetails<CheckboxCheckedChangeReason>) => void)`): Runs when a user or a form reset wants to change it. `details.reason` says why, and `details.cancel()` stops it.
- `disabled?` (`boolean`): Disables it like a native control: it can't be focused or changed, and isn't submitted.
- `readOnly?` (`boolean`): Keeps it focusable and submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission until it's checked, with the browser's own message.
- `name?` (`string`): The name it submits under. Without one, it submits nothing.
- `value?` (`string`): What it submits while checked.
- `form?` (`string`): The id of a form to belong to, when it isn't inside that form.
- `controller?` (`{ toggle: (details?: Details) => boolean; getChecked: () => boolean; setChecked: (checked: boolean, details?: Details) => boolean; focus: () => void; }`): Toggles it from anywhere. Create one with `createSwitchController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

What render functions, state-based class names and slots receive. The thumb's state, `SwitchThumbState`, is the same.

- `checked` (`boolean`): Whether it's checked. False while indeterminate.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether it's read-only: it stays focusable and submitted, but presses don't change it.
- `required` (`boolean`): Whether a form won't submit until it's checked. Indeterminate doesn't count.

### Reasons

`details.reason` says why the switch turned on or off.

- `press` (`MouseEvent | KeyboardEvent`): A single-element control was pressed: a checkbox, a switch or a toggle.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createSwitchController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the change callback like a press, and returns `false` when the change is canceled.

- `toggle(details?)` (`(details?: CheckboxChangeOptions | undefined) => boolean`): Turns it on, or off.
- `getChecked()` (`() => boolean`): Whether it's on.
- `setChecked(checked, details?)` (`(checked: boolean, details?: CheckboxChangeOptions | undefined) => boolean`): Turns it on or off, as a user would.
- `focus()` (`() => void`): Moves focus to it.

### Events

Callbacks get the new state first, then the details.

| Prop              | On       | Receives                                                        |
| ----------------- | -------- | --------------------------------------------------------------- |
| `onCheckedChange` | `Switch` | `(checked, details)`: the new state, and the [reason](#reasons) |

## Accessibility

The switch follows the [WAI-ARIA switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/). `Switch` renders a button with the `switch` role, and a hidden native checkbox that takes part in forms.

### Keyboard

| Key   | Does                                   |
| ----- | -------------------------------------- |
| Tab   | Moves to the next switch               |
| Space | Turns it on or off                     |
| Enter | Submits its form, and never toggles it |

### Tested Behavior

Every line below is an automated test.

- Starts in its default state.
- Clicking toggles it.
- Clicking its label toggles it.
- Space toggles it.
- Enter submits the form and never toggles it.
- The thumb follows the state.

**The first input on a page**

- The first Space reports keyboard.

**On a touch screen**

- The first tap reports touch.

Runs in React, Vue and web components.

In forms:

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

Beyond the pattern's baseline:

**Enhancements**

- The first invalid control takes focus in document order.
- A later required field without an error part doesn't take focus from the first.

**Form-associated custom elements**

- Take part in the form with no hidden input. Web components only.
- Report validity like native controls. Web components only.
- Have live checked and value properties. Web components only.
- Are named by their labels. Web components only.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while checking boxes with a keyboard.
- Announcements while choosing a radio with a keyboard.

Runs in React, Vue and web components.
