<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.16, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### PasswordInput

- `value?` (`string`): The value, for a controlled field.
- `defaultValue?` (`string`): The value it starts with. A form reset returns here.
- `onValueChange?` (`((value: string, details: ChangeDetails<InputValueChangeReason>) => void)`): Called when the user changes the value: typing (`"input-change"`), a Clear part (`"clear-press"`), a form reset (`"reset"`) or a controller (`"imperative"`). `details.cancel()` keeps the value as it was.
- `visible?` (`boolean`): Whether the password is shown. Pass it to control it.
- `defaultVisible?` (`boolean`): Whether the password is shown at first, when uncontrolled.
- `onVisibleChange?` (`((visible: boolean, details: ChangeDetails<PasswordInputVisibleChangeReason>) => void)`): Runs when the password wants to be shown or hidden: the toggle (`"toggle-press"`), submitting or resetting its form (`"form-submit"`, `"reset"`), the page being hidden (`"page-hide"`) or a controller (`"imperative"`). `details.cancel()` keeps it as it was; the field is a password field while the browser reads a submitted form either way.
- `autoComplete?` (`"current-password" | "new-password" | "off" | (string & {})`): What the browser and password managers fill in: `"current-password"` for signing in, `"new-password"` for signing up or changing it.
- `name?` (`string`): The name the password submits under. Inside a Field, the Field's name.
- `form?` (`string`): The id of the form the field belongs to, when it isn't inside it.
- `required?` (`boolean`): Whether a password is required to submit the form.
- `disabled?` (`boolean`): Disables the field and the toggle. Inside a Field or a disabled `<fieldset>`, they follow it.
- `readOnly?` (`boolean`): Makes the field read-only. The toggle still shows and hides it.
- `controller?` (`object`): Reads, writes, shows and hides it from anywhere. Create one with `createPasswordInputController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

What render functions, state-based class names and slots receive. Every part gets the same state.

- `visible` (`boolean`): Whether the password is shown.
- `capsLock` (`boolean`): Whether Caps Lock is on while the field has focus.
- `filled` (`boolean`): Whether the field holds any text.
- `disabled` (`boolean`): Whether the field is disabled, by itself, its Field or a `<fieldset>`.
- `readOnly` (`boolean`): Whether the field is read-only.
- `required` (`boolean`): Whether a form won't submit while the field is empty.

### Reasons

`details.reason` says why the value changed. Autofill and a password manager's fill are `input-change`.

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `clear-press` (`MouseEvent | KeyboardEvent`): A Clear part was pressed, like on an input, a select or a combobox.
- `reset` (`none`): A form reset.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

And why the password was shown or hidden:

- `toggle-press` (`MouseEvent | KeyboardEvent`): A toggle was pressed: a password input's, which shows or hides the password, or a carousel's, which starts or stops rotation.
- `form-submit` (`SubmitEvent`): The form was submitted, which hides a shown password so the browser offers to save it.
- `reset` (`none`): A form reset.
- `page-hide` (`PageTransitionEvent`): The page was hidden, like when navigating away, which hides a shown password before the browser keeps the page.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createPasswordInputController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, and runs the change callback like typing or a press. `setVisible()` and `toggleVisible()` return `false` when the change is canceled.

- `getValue()` (`() => string`): The current value.
- `setValue(value, options?)` (`(value: string, options?: ChangeOptions<InputValueChangeReason> | undefined) => boolean`): Sets the value as if the user typed it, so `input` fires. Returns false when the change was canceled or nothing changed.
- `clear(options?)` (`(options?: ChangeOptions<InputValueChangeReason> | undefined) => boolean`): Empties the field, as if the user deleted the text, so `input` fires. Returns false when the change was canceled or nothing changed.
- `isVisible()` (`() => boolean`): Whether the password is shown.
- `setVisible(visible, options?)` (`(visible: boolean, options?: ChangeOptions<PasswordInputVisibleChangeReason> | undefined) => boolean`): Shows or hides the password. Returns false when canceled.
- `toggleVisible(options?)` (`(options?: ChangeOptions<PasswordInputVisibleChangeReason> | undefined) => boolean`): Shows the password if it's hidden, and hides it if it's shown. Returns false when canceled.
- `focus()` (`() => void`): Moves focus to the field.

### Events

Callbacks get the new value first, then the details.

| Prop              | On              | Receives                                                                             |
| ----------------- | --------------- | ------------------------------------------------------------------------------------ |
| `onValueChange`   | `PasswordInput` | `(value, details)`: the new password and the [reason](#reasons)                      |
| `onVisibleChange` | `PasswordInput` | `(visible, details)`: whether the password wants to show, and the [reason](#reasons) |

## Accessibility

There's no WAI-ARIA pattern for a password field. The input stays a native password field named by its Field label or an `aria-label`, and the toggle follows the [WAI-ARIA button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) as a toggle button. Name the toggle by what it does, such as “Show password”, and keep that name the same: its `aria-pressed` state tells screen readers whether the password is shown, and `aria-controls` points to the input.

### Keyboard

Tab moves from the input to the toggle, and Space or Enter on the toggle shows or hides the password. Enter in the input submits its form; it never presses the toggle.

### Focus

A pointer press on the toggle keeps focus in the input, with the caret and selection where they were. A press from elsewhere brings focus back to the input. A keyboard press keeps focus on the toggle.

### Tested Behavior

Every line below is an automated test.

- The field is a password field named by its label and described by its description.
- The toggle is a button that says what it does, and isn't pressed.
- Pressing the toggle shows the password, and pressing it again hides it.
- Space on the focused toggle shows the password and keeps focus on the toggle.
- Enter on the focused toggle shows the password and keeps focus on the toggle.
- The toggle keeps its name when the password shows.
- Enter in the field submits the form, and never presses the toggle.
- The password submits under its name.
- The password can start shown.
- A change can be canceled.
- A disabled password input disables the field and the toggle.
- A read-only field can still be shown.
- The controller shows and hides the password.
- A controlled password input follows its owner. React and Vue only.
- A click with no pointer behind it, like a screen reader's, shows the password.

Runs in React, Vue and web components.

Beyond the pattern:

- Showing the password keeps focus in the field, with the caret where it was.
- Showing and hiding the password keeps the selection.
- A click on the toggle while typing never blurs the field.
- A click on the toggle from elsewhere brings focus back to the field.
- Submitting hides a shown password before the page's own submit handler runs.
- Submitting hides the password even when the change is canceled, while the browser reads the form.
- Resetting the form hides the password.
- Hiding the page hides the password, so the browser never keeps it as text.
- A shown password is never spellchecked, autocorrected or capitalized.
- The field asks password managers for the current password, or a new one.
- Caps Lock marks the input while the field has focus.
- A click into the field with Caps Lock on shows the warning before any key.
- A web field keeps an autocomplete changed after it connects. Web components only.
- The toggle has its own id and controls the field.
- A disabled fieldset disables the toggle too.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while showing and hiding a password with a keyboard.

Runs in React, Vue and web components.

Also tested:

- No axe violations at rest.
- No axe violations with the password shown.
- No axe violations while disabled.
- No axe violations while read-only.
- The field is named by its label, and the toggle by its aria-label.
- Accessibility tree.

Runs in React, Vue and web components.
