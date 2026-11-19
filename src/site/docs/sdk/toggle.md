<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.13, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Toggle

- `pressed?` (`boolean`): Whether it's pressed. Pass it to control the toggle. Inside a group, the group's value decides.
- `defaultPressed?` (`boolean`): Whether it's pressed at first, when uncontrolled.
- `onPressedChange?` (`((pressed: boolean, details: ChangeDetails<TogglePressedChangeReason>) => void)`): Runs when a press wants to change it. `details.reason` says why, and `details.cancel()` stops it. Inside a group, it runs before the group's `onValueChange`, and canceling it cancels the group's change too.
- `value?` (`string`): Identifies the toggle inside a group, whose value lists the pressed toggles' values. Defaults to a generated id.
- `disabled?` (`boolean`): Stops presses. Alone, the toggle is natively disabled, unless `focusableWhenDisabled` is set. Inside a group or a toolbar, it stays focusable with `aria-disabled`, so arrow keys still reach it.
- `focusableWhenDisabled?` (`boolean`): Keeps a disabled toggle in the tab order with `aria-disabled` instead of the native attribute. Toggles in a group or a toolbar always are.
- `controller?` (`{ isPressed: () => boolean; setPressed: (pressed: boolean, options?: ToggleChangeOptions) => boolean; toggle: (options?: ToggleChangeOptions) => boolean; focus: () => void; }`): Presses it from anywhere. Create one with `createToggleController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### ToggleIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

### ToggleGroup

- `value?` (`T[]`): The pressed toggles' values. Pass it to control the group.
- `defaultValue?` (`T[]`): The toggles pressed at first, when uncontrolled.
- `onValueChange?` (`((value: T[], details: ChangeDetails<ToggleGroupValueChangeReason>) => void)`): Runs when a toggle wants to be pressed or unpressed. `details.reason` says why, and `details.cancel()` stops it.
- `multiple?` (`boolean`): Whether several toggles can be pressed at once. Otherwise pressing one unpresses the others.
- `deselectable?` (`boolean`): Whether the pressed toggle can be unpressed when only one may be pressed. With `false`, one toggle stays pressed once any is. Ignored with `multiple`.
- `disabled?` (`boolean`): Stops every toggle from being pressed. They stay focusable with `aria-disabled`, so the group keeps its tab stop and stays discoverable.
- `orientation?` (`ToggleGroupOrientation`): Which arrow keys move between toggles: left and right, or up and down.
- `loop?` (`boolean`): Whether arrow keys wrap from the last toggle to the first.
- `controller?` (`object`): Presses toggles from anywhere. Create one with `createToggleGroupController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

What render functions, state-based class names and slots receive.

- `pressed` (`boolean`): Whether it's pressed. Inside a group, it follows the group's value.
- `disabled` (`boolean`): Whether it's disabled, by itself, its group or a fieldset around it.

In a group, a toggle's `disabled` includes the group's. The group:

- `value` (`T[]`): The pressed toggles' values.
- `multiple` (`boolean`): Whether several toggles can be pressed at once.
- `disabled` (`boolean`): Whether the whole group is disabled, by its `disabled` option or a disabled fieldset around it.
- `orientation` (`ToggleGroupOrientation`): The group's `orientation` option, or `"horizontal"` when it's unset or invalid.

`ToggleIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

### Reasons

`details.reason` says why the toggle was pressed or unpressed.

- `press` (`MouseEvent | KeyboardEvent`): A single-element control was pressed: a checkbox, a switch or a toggle.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

For a group, it says why the pressed toggles changed.

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Toggle Controller

Create one with `createToggleController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the change callback like a press, and returns `false` when the change is canceled.

- `isPressed()` (`() => boolean`): Whether it's pressed. Inside a group, it follows the group's value.
- `setPressed(pressed, options?)` (`(pressed: boolean, options?: ToggleChangeOptions | undefined) => boolean`): Presses or unpresses it, as a user would. A disabled toggle ignores it. Returns false when canceled.
- `toggle(options?)` (`(options?: ToggleChangeOptions | undefined) => boolean`): Presses it, or unpresses it.
- `focus()` (`() => void`): Moves focus to it.

### ToggleGroup Controller

Create one with `createToggleGroupController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs `onValueChange` like a press, and returns `false` when the change is canceled.

- `getValue()` (`() => T[]`): The pressed toggles' values, in the order they appear.
- `setValue(value, options?)` (`(value: T[], options?: ToggleGroupChangeOptions | undefined) => boolean`): Sets the pressed toggles. Only the first counts unless `multiple` is set. Returns false when canceled.
- `isPressed(value)` (`(value: T) => boolean`): Whether a toggle is pressed.
- `toggle(value, options?)` (`(value: T, options?: ToggleGroupChangeOptions | undefined) => boolean`): Presses a toggle, or unpresses a pressed one, as a user would. Disabled toggles and `deselectable={false}` refuse it.
- `focus(value?)` (`(value?: T | undefined) => void`): Moves focus to a toggle, or to the one that holds the group's tab stop.

### Events

Callbacks get the new state or value first, then the details. `onValueChange` never runs on mount.

| Prop              | On            | Receives                                                                                                                     |
| ----------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `onPressedChange` | `Toggle`      | `(pressed, details)`: the new state, and the [reason](#reasons). In a group, it runs first and can cancel the group's change |
| `onValueChange`   | `ToggleGroup` | `(value, details)`: the pressed toggles' values, and the [reason](#reasons)                                                  |

## Accessibility

A toggle follows the toggle button in the [WAI-ARIA button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/): a native button with `aria-pressed`. A group follows the keyboard of the [WAI-ARIA toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/), with one tab stop and arrow keys between toggles. It has the `group` role, not `toolbar`, so it can sit inside a [Toolbar](/docs/components/toolbar), and not `radiogroup`, since its toggles are buttons.

### Keyboard

A group is one tab stop. Tab first enters on its first enabled pressed toggle, or its first enabled toggle, and later returns to the last focused one.

| Key          | Does                                                    |
| ------------ | ------------------------------------------------------- |
| Enter, Space | Presses or unpresses the focused toggle                 |
| Tab          | Moves into or out of a group                            |
| Left, Right  | Move focus in a horizontal group, swapped right to left |
| Up, Down     | Move focus in a vertical group                          |
| Home, End    | Move focus to the first or last toggle                  |

### Tested Behavior

Every line below is an automated test.

- A toggle starts unpressed.
- Clicking a toggle presses it, and clicking again unpresses it.
- Space presses a focused toggle.
- Enter presses a focused toggle.
- A toggle can start pressed.
- A change can be cancelled.
- A toggle keeps its name when it's pressed.

Runs in React, Vue and web components.

In a group:

**One pressed at a time**

- The group is named and its default toggle is pressed.
- Pressing a toggle unpresses the others.
- Pressing the pressed toggle unpresses it.
- A change can be cancelled.

**Several pressed at once**

- Pressing toggles adds them to the value.
- A disabled toggle can't be pressed.
- A disabled group presses nothing.

**Keyboard**

- Tab moves into the group once, and out of it.
- Only one toggle in a group is a tab stop.
- ArrowRight and ArrowLeft move focus without pressing.
- Focus wraps at both ends.
- Home and End move to the first and last toggles.
- ArrowUp and ArrowDown do nothing in a horizontal group.
- Space presses the focused toggle.
- Enter presses the focused toggle.
- Tab returns to the toggle focused last.
- The group itself is never a tab stop.
- Keys pressed without waiting still land.
- Arrow keys with a modifier are left to the browser.

**Options**

- With loop off, arrows stop at the ends.
- A vertical group moves with ArrowDown and ArrowUp.
- The group carries its orientation.

Runs in React, Vue and web components.
