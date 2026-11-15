<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Collapsible

- `open?` (`boolean`): Whether the panel is open. Pass it to control the collapsible.
- `defaultOpen?` (`boolean`): Whether the panel is open at first, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<CollapsibleOpenChangeReason>) => void)`): Runs when the panel wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the panel has finished opening or closing, after any animation.
- `disabled?` (`boolean`): Stops the trigger from opening or closing the panel. The trigger stays focusable.
- `controller?` (`object`): Opens and closes the panel from anywhere. Create one with `createCollapsibleController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### CollapsibleTrigger

The trigger takes no options of its own, only the props of the element it renders.

### CollapsiblePanel

- `keepMounted?` (`boolean`): Whether the panel stays in the page, hidden, while closed.
- `hiddenUntilFound?` (`boolean`): Keeps the closed panel in the page as `hidden="until-found"`, so the browser's find in page can match its text and open it.

### State

What render functions, state-based class names and slots receive. The trigger and the panel receive the same
state as the collapsible.

- `open` (`boolean`): Whether the panel is open.
- `disabled` (`boolean`): Whether the trigger ignores presses, by its own `disabled` or a disabled fieldset around it. The `open` option and the controller can still open and close it.

### Reasons

`details.reason` says why the panel opened or closed.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `find-in-page` (`Event`): The browser's find in page matched hidden content.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createCollapsibleController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, and returns `false` when the change was canceled or changed nothing.

- `isOpen()` (`() => boolean`): Whether the panel is open.
- `setOpen(open, options?)` (`(open: boolean, options?: CollapsibleChangeOptions | undefined) => boolean`): Opens or closes the panel. Returns false when the change was canceled or not possible.
- `open(options?)` (`(options?: CollapsibleChangeOptions | undefined) => boolean`): Opens the panel.
- `close(options?)` (`(options?: CollapsibleChangeOptions | undefined) => boolean`): Closes the panel.
- `toggle(options?)` (`(options?: CollapsibleChangeOptions | undefined) => boolean`): Opens the panel when it's closed, and closes it when it's open.
- `focus()` (`() => void`): Moves focus to the trigger.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On            | Receives                                                     |
| ---------------------- | ------------- | ------------------------------------------------------------ |
| `onOpenChange`         | `Collapsible` | `(open, details)`: the new state, and the [reason](#reasons) |
| `onOpenChangeComplete` | `Collapsible` | `(open)`, after the panel's animation                        |

## Accessibility

The collapsible follows the [WAI-ARIA disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/). The trigger says whether the panel is open with `aria-expanded`, and points to the panel with `aria-controls` while it's mounted. Every line below is an automated test.

### Keyboard

| Key          | Does                                                   |
| ------------ | ------------------------------------------------------ |
| Enter, Space | Opens or closes the panel. Focus stays on the trigger. |
| Tab          | Moves from the trigger into an open panel              |

Closing a panel while focus is inside it moves focus back to the trigger.

### Tested Behavior

**Opening and closing**

- Starts closed, with the panel out of the page.
- Clicking the trigger opens the panel, and clicking again closes it.
- The trigger controls the panel.
- Generated ids start with ui-sdk-.
- It can start open.
- An opening can be canceled.
- A disabled collapsible doesn't open.
- A disabled trigger stays focusable and says it's disabled.
- A controller opens and closes it from anywhere.

**Keyboard**

- Enter toggles the panel and keeps focus on the trigger.
- Space toggles the panel and keeps focus on the trigger.
- Tab moves from the open trigger into the panel.
- Tab skips a closed panel.

**Mounting**

- With keepMounted, the closed panel stays in the page, hidden.
- With keepMounted, a class that sets display doesn't show the closed panel.
- With hiddenUntilFound, the closed panel stays findable.
- With hiddenUntilFound, a class that sets display keeps the closed panel findable.
- Finding text in the closed panel opens it.
- Following a link into the closed panel opens it.
- The browser's own find opens the closed panel.

Runs in React, Vue and web components.

Beyond the pattern's baseline:

**Enhancements**

- Closing the panel while focus is inside it moves focus to the trigger.
- OnOpenChangeComplete runs once the animation has finished.
- Find in page reports its own reason and opens without an animation.
- A canceled find in page keeps the panel hidden until found.
- An infinite exit animation still unmounts the panel.
- Parts report open and closed through data attributes.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while using the collapsible with a keyboard.

Runs in React, Vue and web components.
