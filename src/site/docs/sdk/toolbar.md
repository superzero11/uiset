<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.14, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

### Toolbar

- `orientation?` (`ToolbarOrientation`): Which arrow keys move between items: left and right, or up and down.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first.
- `disabled?` (`boolean`): Stops every item from being used. Items stay focusable with `aria-disabled`, so the toolbar keeps its tab stop and stays discoverable.
- `controller?` (`{ focus: () => void; }`): Focuses the toolbar from anywhere. Create one with `createToolbarController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### ToolbarButton

- `disabled?` (`boolean`): Stops the item from being used. It stays focusable with `aria-disabled`, so arrow keys still reach it and a tooltip can say why.
- `focusableWhenDisabled?` (`boolean`): Whether a disabled item stays reachable with arrow keys. Turn it off to skip it, natively disabled.

### ToolbarInput

- `disabled?` (`boolean`): Stops the item from being used. It stays focusable with `aria-disabled`, so arrow keys still reach it and a tooltip can say why.
- `focusableWhenDisabled?` (`boolean`): Whether a disabled item stays reachable with arrow keys. Turn it off to skip it, natively disabled.

### ToolbarGroup

- `disabled?` (`boolean`): Disables every item in the group. They stay focusable with `aria-disabled`.

`ToolbarLink` and `ToolbarSeparator` take no props of their own.

### State

What render functions and state-based class names receive on `ToolbarButton` and `ToolbarInput`:

- `disabled` (`boolean`): Whether the item is disabled, by itself, its group or the toolbar.
- `orientation` (`ToolbarOrientation`): The toolbar's `orientation` option: `"vertical"`, or `"horizontal"` for anything else.

On `ToolbarLink`:

- `disabled` (`boolean`): Whether the link is disabled, by its group or the toolbar.
- `orientation` (`ToolbarOrientation`): The toolbar's `orientation` option: `"vertical"`, or `"horizontal"` for anything else.

On `ToolbarSeparator`:

- `orientation` (`ToolbarOrientation`): Which way the line runs: across the toolbar, so vertical in a horizontal toolbar.

### Controller

- `focus()` (`() => void`): Moves focus to the item that holds the toolbar's tab stop: the one focused last, or the first.

## Accessibility

The toolbar follows the [WAI-ARIA toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/). The root has the `toolbar` role and `aria-orientation`, and separators have the `separator` role.

### Keyboard

The toolbar has one tab stop, a roving focus. Tab enters on the first enabled item, then returns to the item focused last. The next Tab leaves the toolbar.

| Key                        | Action                                          |
| -------------------------- | ----------------------------------------------- |
| `ArrowRight` / `ArrowLeft` | Move focus in a horizontal toolbar              |
| `ArrowDown` / `ArrowUp`    | Move focus in a vertical toolbar                |
| `Home` / `End`             | Focus the first or last item, except in a field |
| `Enter` / `Space`          | Activate a button or toggle, or open its popup  |

Controls keep the keys they use: Down opens a menu, and Up and Down step a number input. Moving focus never presses a toggle. In right-to-left text, Left and Right swap.

### Tested Behavior

Every line below is an automated test.

- The toolbar is named and has a horizontal orientation.
- Tab lands on the first item, and Tab again leaves the toolbar.
- Shift+Tab from after the toolbar lands on its tab stop.
- ArrowRight moves through every item, into toggle groups and out of fields.
- ArrowRight on the last item wraps to the first, and ArrowLeft back.
- Arrow keys never press a toggle, and Space and Enter do.
- Tab comes back to the item focused last.
- A toggle group in the toolbar is no tab stop of its own.
- A disabled button stays reachable, says it's disabled and does nothing.
- A button runs its action when pressed.
- A menu trigger rendered through a button opens with ArrowDown, and arrows still move past it.
- Choosing from a menu in the toolbar returns focus to its trigger.
- A text field keeps Home and End for its caret.
- Up and Down step a number field in the toolbar.
- Separators run across the toolbar.
- A group of buttons is named.
- A link in the toolbar follows its href with Enter.
- With loop off, arrows stop at the ends.
- A disabled toolbar keeps one tab stop, and every item says it's disabled.

**Vertical**

- ArrowDown and ArrowUp move between items, and Left and Right don't.
- Separators run across a vertical toolbar.

**Disabled groups**

- Toggles and toggle groups in a disabled group are disabled.
- A link in a disabled group is disabled, and follows its href once enabled.
- Enabling a group enables the toggles and buttons in it.

Runs in React, Vue and web components.
