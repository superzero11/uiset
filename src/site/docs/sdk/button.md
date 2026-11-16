<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.5, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Button accepts native button props and the options below. `render`, `children`, `className` and `style` can read the button's state; see [Parts and Composition](https://ui-sdk.dev/docs/react/parts-and-composition).

### Button

- `disabled?` (`boolean`): Stops presses. The button is natively disabled, so it leaves the tab order and its form doesn't submit through it, unless `focusableWhenDisabled` is set.
- `focusableWhenDisabled?` (`boolean`): Keeps a disabled button in the tab order with `aria-disabled` instead of the native attribute, so it can hold focus while it becomes disabled and host a tooltip that says why. Presses still do nothing.
- `type?` (`"button" | "reset" | "submit"`): What a native button does in a form: `"submit"` submits it and `"reset"` resets it. Ignored when the button renders as something else.
- `pendingAnnouncement?` (`string`): What screen readers hear once the button has been pending for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### State

- `disabled` (`boolean`): Whether it's disabled, by the `disabled` option or a disabled fieldset around it. A running press shows in `pending` instead.
- `pending` (`boolean`): Whether the Promise the last press returned is still running. Presses do nothing meanwhile.
- `error` (`unknown`): Why the last press failed: what its handler threw, or its Promise rejected with. Cleared by the next press.

### Events

| Prop      | Receives                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `onClick` | React's click event and `{ source }`, how the button was pressed. Return a Promise to keep the button pending until it settles. |

## Accessibility

Give the button a clear text label. If it contains only an icon, add an `aria-label`. Native buttons respond to Enter and Space; links respond to Enter.

### Pending Buttons

While its action runs, the button tells assistive technology it's busy, so you don't need to add anything:

- It sets `aria-busy="true"` and `aria-disabled="true"`, and ignores presses until the action settles. It keeps focus the whole time.
- After a second, it announces `pendingAnnouncement` ("Loading" by default) through a polite live region. Quick actions stay silent. This is a status message: people hear it without focus moving.

To show progress, keep the label and change only the visual, like a spinner. Changing the text renames the button while it has focus: screen readers don't reliably announce a new name on the focused element, so the change mostly helps sighted users, and the button's width shifts as the text changes length. The announcement already tells everyone it's working.

```tsx title="Do"
<Button onClick={save} pendingAnnouncement="Saving">
  <ArrowDownToLineIcon data-show="idle" aria-hidden="true" />
  <LoaderCircleIcon data-show="pending" aria-hidden="true" />
  Save
</Button>
```

```tsx title="Don't"
<Button onClick={save} aria-label="Save">
  {saving ? "Saving…" : "Save"}
  <span aria-live="polite">{saving ? "Saving" : ""}</span>
</Button>
```

The second button tracks `saving` itself, shows text its accessible name doesn't contain, and announces the same state twice. If the text has to change anyway, swap it with `data-show` and leave out `aria-label`, so the button's name always contains the text on screen. See [Pending Content](#pending-content) for the markup.

References:

- [WCAG 2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)
- [WCAG 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [WAI-ARIA `aria-busy`](https://www.w3.org/TR/wai-aria-1.2/#aria-busy) and [`aria-disabled`](https://www.w3.org/TR/wai-aria-1.2/#aria-disabled)

### Tested Behavior

The following behaviors are covered by automated tests:

- Clicking a button runs its handler.
- Space presses a focused button.
- Enter presses a focused button.
- A submit button submits its form.
- A reset button resets its form.
- A disabled button can't be focused or pressed.
- A button rendered as a link stays a link.

**Focusable when disabled**

- It stays focusable and says it's disabled.
- Tab reaches it.
- Clicking it runs nothing and submits nothing.
- Space on it runs nothing and submits nothing.
- Enter on it runs nothing and submits nothing.

**Pending**

- A returned Promise makes it busy, and it keeps focus until the Promise settles.
- While pending, it says it's unavailable with aria-disabled and keeps focus.
- Still pending after a second, it tells screen readers it's loading.
- A rejected Promise ends the pending state.

Runs in React, Vue and web components.
