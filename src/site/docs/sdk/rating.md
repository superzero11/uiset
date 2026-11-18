<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Rating

- `value?` (`number | null`): The score. Pass it to control the rating. `null` means no score yet.
- `defaultValue?` (`number | null`): The score at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`((value: number | null, details: ChangeDetails<RatingValueChangeReason>) => void)`): Runs when a user or a form reset wants to change the score. `details.reason` says why, and `details.cancel()` stops it.
- `max?` (`number`): How many stars there are.
- `step?` (`number`): The smallest change, as a fraction of a star: `0.5` makes half stars, each half its own radio.
- `deselectable?` (`boolean`): Lets a press on the checked star clear the score.
- `disabled?` (`boolean`): Disables every star: they can't be focused or changed, and the score isn't submitted.
- `readOnly?` (`boolean`): Shows the score as an image, named by `getValueLabel`, that can't be changed. Any score shows, like an average of 4.2.
- `required?` (`boolean`): Blocks form submission until there's a score, with the browser's own message.
- `name?` (`string`): The name the score submits under. Without one, the rating submits nothing.
- `form?` (`string`): The id of a form to belong to, when the rating isn't inside that form.
- `loop?` (`boolean`): Whether arrow keys wrap from the last star to the first.
- `getValueLabel?` (`((value: number, max: number) => string)`): Names a score, for each star's radio and for a read-only rating.
- `controller?` (`{ getValue: () => number | null; setValue: (value: number | null, details?: RatingChangeOptions) => boolean; focus: () => void; }`): Sets the score from anywhere. Create one with `createRatingController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

What render functions, state-based class names and slots receive.

- `value` (`number | null`): The score, or `null` before anyone rates.
- `highlighted` (`number | null`): The score a pointer previews over the stars, or `null` while none does.
- `disabled` (`boolean`): Whether the rating is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the rating only shows its score.
- `required` (`boolean`): Whether a form won't submit until there's a score.

- `index` (`number`): Which star this is, from 1.
- `fill` (`number`): How much of this star the shown score covers, from 0 to 1. Also `--rating-fill`.
- `checked` (`boolean`): Whether the score ends in this star.
- `highlighted` (`boolean`): Whether a pointer previews a score that reaches this star.
- `disabled` (`boolean`): Whether the rating is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the rating only shows its score.

### Reasons

`details.reason` says why the score changed.

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createRatingController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the change callback like a press, and returns `false` when the change is canceled.

- `getValue()` (`() => number | null`): The score, or `null` before anyone rates.
- `setValue(value, details?)` (`(value: number | null, details?: RatingChangeOptions | undefined) => boolean`): Sets the score, as a user would. Disabled and read-only ratings ignore it.
- `focus()` (`() => void`): Moves focus to the checked star, or the first one.

### Events

Callbacks get the new score first, then the details.

| Prop            | On       | Receives                                                            |
| --------------- | -------- | ------------------------------------------------------------------- |
| `onValueChange` | `Rating` | `(value, details)`: the score or `null`, and the [reason](#reasons) |

## Accessibility

A rating is a radio group, so it follows the [WAI-ARIA radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) and behaves like native radios that share a name. Each star holds a button with the `radio` role per score it can pick, and a hidden native radio that takes part in forms. Icons inside the stars should be hidden from screen readers with `aria-hidden`, since each radio is already named. A read-only rating has the `img` role instead, named by `getValueLabel`.

### Keyboard

| Key        | Does                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------ |
| Tab        | Moves into the rating, onto the checked star or the first one                              |
| Arrow keys | Move to the next or previous score and check it, stopping at the ends unless `loop` is set |
| Space      | Checks the focused star, or clears it when it's checked and `deselectable`                 |
| Enter      | Submits its form                                                                           |

### Tested Behavior

Every line below is an automated test.

**Selection**

- The default score is checked, and the stars up to it are full.
- Clicking a star checks it and says why.
- A half star fills half of its star.
- Clicking the checked star clears a deselectable rating, and only that one.
- A change can be cancelled.
- A controller sets the score.

**Preview**

- A pointer over a star previews its score, and leaving shows the score again.

**Keyboard**

- Tab lands on the checked star, and the next Tab leaves.
- Arrow keys change the score by a step, and stop at the ends.
- Space on the checked star clears a deselectable rating.

**Read-only**

- A read-only rating is one image, named by its label, that shows any score.

**Forms**

- Each score submits under its rating's name.
- A form reset returns to the default score.
- A disabled rating submits nothing, and its stars can't be focused or checked.

Runs in React, Vue and web components.
