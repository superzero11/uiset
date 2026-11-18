<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Tooltip

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `open?` (`boolean`): Whether the tooltip is open. Pass it to control the tooltip.
- `defaultOpen?` (`boolean`): Whether the tooltip starts open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<TooltipOpenChangeReason>) => void)`): Runs when the tooltip wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the tooltip has finished opening or closing, after any animation.
- `onPayloadChange?` (`((payload: unknown, details: ChangeDetails<TooltipPayloadChangeReason>) => void)`): Runs when the payload the content shows changes: a trigger with another payload opens the tooltip, or takes the open tooltip over, which fires no `onOpenChange`, and so does a controller's `open({ payload })` on the open tooltip. `details.cancel()` keeps the previous payload.
- `delay?` (`number`): Milliseconds the pointer rests on the trigger before the tooltip opens. While another tooltip is open, or was a moment ago, the next one opens at once, without a provider.
- `closeDelay?` (`number`): Milliseconds before the tooltip closes once the pointer leaves the trigger and the tooltip.
- `disabled?` (`boolean`): Stops the tooltip from opening. The trigger keeps working.
- `toggleable?` (`boolean`): Whether pressing the trigger opens and closes the tooltip, so touch screens can show it too. For info buttons whose only job is the tip. The text is announced when a press opens it.
- `closeOnPress?` (`boolean`): Whether pressing the trigger closes the tooltip. Set it to `false` to keep it open, like for a copy button whose tooltip turns into "Copied".
- `type?` (`"description" | "label"`): Whether the tooltip names its trigger (`"label"`) or adds a description to it (`"description"`). By default it names a trigger that has no name of its own, like an icon button, and describes any other.
- `shortcut?` (`string`): The keyboard shortcut of what the trigger does, like `"mod+s"`, as a hint. A `TooltipShortcut` shows it, and the trigger gets `aria-keyshortcuts`. It doesn't bind the keys: the trigger's own `shortcut`, or `registerShortcut`, does.
- `controller?` (`PopupController<any, TooltipOpenChangeReason, {}, string, TooltipPayloadChangeReason>`): Opens, closes and inspects the tooltip from anywhere, and connects triggers outside it. Create one with `createTooltipController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### TooltipTrigger

A trigger outside the tooltip also takes `controller`.

- `payload?` (`unknown`): Data for the content to render when this trigger opens the tooltip, like the row it belongs to.
- `controller?` (`PopupController<any, TooltipOpenChangeReason, {}, string, TooltipPayloadChangeReason>`): Connects a trigger outside the tooltip, like one per table row, to the tooltip with this controller.

### TooltipContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the trigger the tooltip opens on.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the tooltip lines up with the trigger along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the trigger and the tooltip, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the trigger, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.

### TooltipArrow

Points at the trigger from the side the tooltip landed on. Renders a `div`.

### TooltipShortcut

- `shortcut?` (`string`): The keys to show. By default, the tooltip's `shortcut`.

### State

What render functions, state-based class names and slots receive, per part.

`TooltipTrigger`:

- `open` (`boolean`): Whether the tooltip is open from this trigger.

`TooltipContent`:

- `open` (`boolean`): Whether the tooltip is open. False while it animates out.
- `instant` (`boolean`): Whether it opened at once, because another tooltip was open a moment ago. Animations can skip.
- `payload` (`Payload | undefined`): The payload of the last open, from the trigger that opened it or a controller, typed as the controller's `Payload`.

`TooltipArrow`:

- `open` (`boolean`): Whether the tooltip is open. False as soon as it starts closing, while it still animates out.

`TooltipShortcut`:

- `text` (`string`): The shortcut formatted for this platform: `⌘S` on Apple platforms and `Ctrl+S` elsewhere. Empty without one.

### Reasons

`details.reason` says why the tooltip opened or closed.

- `trigger-hover` (`PointerEvent`): The pointer rested on a trigger, or left it, with hover opening.
- `trigger-focus` (`FocusEvent`): Keyboard focus reached a trigger that opens on focus, like a tooltip's.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `window-blur` (`FocusEvent`): The window lost focus.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

For a payload change, it says what opened the tooltip or took it over.

- `trigger-hover` (`PointerEvent`): The pointer rested on a trigger, or left it, with hover opening.
- `trigger-focus` (`FocusEvent`): Keyboard focus reached a trigger that opens on focus, like a tooltip's.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createTooltipController<Payload>()` and pass it as `controller`, to the tooltip and to any
triggers outside it. `Payload` is the type of the data triggers and `open()` pass.

Every write method takes an optional `{ reason, event }`, passed to `onOpenChange`.

- `isOpen()` (`() => boolean`): Whether it's open. False as soon as it starts closing, while it still animates out.
- `setOpen(open, options?)` (`(open: boolean, options?: PopupChangeOptions<TooltipOpenChangeReason> | undefined) => boolean`): Opens or closes it. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (PopupChangeOptions<TooltipPayloadChangeReason> & { payload?: Payload | undefined; anchor?: Anchor | undefined; signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens it, and resolves once it closes, with why, how and any return value. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the component leaves the page.
- `close(options?)` (`(options?: (PopupChangeOptions<TooltipOpenChangeReason> & { returnValue?: string | undefined; }) | undefined) => boolean`): Closes it. `returnValue` is passed to the promise `open()` returned. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: PopupChangeOptions<TooltipOpenChangeReason> | undefined) => boolean`): Opens it when it's closed, and closes it when it's open. Returns false when the change was canceled.
- `getPayload()` (`() => Payload | undefined`): The payload of the last open, from a controller or the trigger that opened it.
- `focus()` (`() => void`): Moves focus to the trigger that opened it last, or the first trigger.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On        | Receives                                                                    |
| ---------------------- | --------- | --------------------------------------------------------------------------- |
| `onOpenChange`         | `Tooltip` | `(open, details)`: the new state, and the [reason](#reasons)                |
| `onOpenChangeComplete` | `Tooltip` | `(open)`, after the animation                                               |
| `onPayloadChange`      | `Tooltip` | `(payload, details)`: the content's new payload, and the [reason](#reasons) |

## Accessibility

The trigger is named or described by the tooltip, following the [WAI-ARIA tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/). It opens on hover and on keyboard focus, and stays open while the pointer moves onto it.

### Keyboard

| Key          | Does                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Tab          | Focus on the trigger opens the tooltip at once; focus leaving it closes the tooltip            |
| Escape       | Closes the tooltip and leaves focus on the trigger, without closing a dialog or menu around it |
| Enter, Space | Presses the trigger and closes the tooltip; on a `toggleable` trigger, opens and closes it     |

### Tested Behavior

Every line below is an automated test.

**Pointer**

- Resting the pointer on the trigger opens the tooltip.
- The tooltip waits for its delay before opening.
- Leaving the trigger before the delay keeps the tooltip closed.
- Moving the pointer away closes the tooltip.
- The pointer can move onto the tooltip without closing it.
- Opening on hover leaves focus where it was.
- Pressing the trigger closes the tooltip and runs the button.
- After a press, the tooltip stays closed until the pointer comes back.

**Keyboard**

- Keyboard focus on the trigger opens the tooltip.
- Focus leaving the trigger closes the tooltip.
- Escape closes the tooltip and leaves focus on the trigger.
- Escape closes a tooltip opened by hover.
- Tab through the toolbar shows each tooltip in turn.
- A click that focuses the trigger doesn't open the tooltip from focus.

**Several tooltips**

- Only one tooltip is open at a time.
- Once the pointer has been away a while, the delay applies again.

**Positioning**

- The tooltip opens above the trigger.
- The tooltip flips below the trigger when there is no room above.
- The tooltip opens on the requested side.
- The arrow points at the middle of the trigger.

**A tooltip on a popover trigger**

- Hovering shows the tooltip, and pressing opens the popover instead.
- Escape closes the tooltip and leaves the popover open.

**Disabled buttons**

- Browsers send hover events to a disabled button.
- An aria-disabled trigger shows its tooltip on hover and focus and ignores presses.

**Animation**

- The tooltip animates in from its starting style.
- The tooltip stays in the page while it animates out.

**Hidden while closed**

- A class that sets display on the content doesn't show it while closed.

**Options and dismissal**

- Escape closes only a tooltip that keyboard focus opened inside a popover.
- The pointer can leave the trigger sideways on its way to the tooltip.
- With closeOnPress false, pressing the trigger keeps the tooltip open.
- Disabled tooltips never open.
- A tap on a plain tooltip's trigger only presses it.

Runs in React, Vue and web components.

Also tested:

**Enhancements**

- Focus returning to the trigger after its popover closes doesn't reopen the tooltip.
- Tooltips open at once after another one, without a provider.
- Focus coming back with the window doesn't reopen the tooltip.
- A controller opens the tooltip without moving focus.
- A trigger that's a disabled button warns in development.

**Shortcuts**

- A trigger connected through a controller shows its tooltip's shortcut in a Shortcut part.

**Toggleable**

- Pressing a toggleable trigger opens and closes the tooltip.
- Pressing outside closes a toggleable tooltip.
- Enter toggles the tooltip from the keyboard and keeps focus on the trigger.
- A press announces the tooltip's text to screen readers.
- A tap opens a toggleable tooltip on a touch screen.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while tabbing through triggers with tooltips.

Runs in React, Vue and web components.
