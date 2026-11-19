<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.13, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Popover

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `open?` (`boolean`): Whether the popover is open. Pass it to control the popover.
- `defaultOpen?` (`boolean`): Whether the popover starts open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<PopoverOpenChangeReason>) => void)`): Runs when the popover wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the popover has finished opening or closing, after any animation.
- `onPayloadChange?` (`((payload: unknown, details: ChangeDetails<PopoverPayloadChangeReason>) => void)`): Runs when the payload the content shows changes: a trigger with another payload opens the popover, or takes the open popover over, which fires no `onOpenChange`, and so does a controller's `open({ payload })` on the open popover. `details.cancel()` keeps the previous payload.
- `modal?` (`"trap-focus" | boolean`): `false`: the rest of the page stays usable, and focus leaving the popover closes it. `true`: also traps focus, locks scroll and makes the rest of the page inert, and an outside press only closes the popover. `"trap-focus"`: traps focus but leaves the page scrollable and clickable.
- `openOnHover?` (`boolean`): Whether resting the pointer on the trigger opens the popover. Pressing the trigger still opens it, so keyboard and touch users can too.
- `delay?` (`number`): Milliseconds the pointer rests on the trigger before the popover opens, with `openOnHover`.
- `closeDelay?` (`number`): Milliseconds before the popover closes once the pointer leaves it and its trigger, with `openOnHover`.
- `presentation?` (`PresentationSetting<"popover">`): How the popover presents. `"sheet"` slides it up from the bottom of the screen, where it can be swiped away, and `"auto"` does that on small touch screens. Decided each time it opens; the server renders `"popover"` for `"auto"`.
- `controller?` (`PopupController<any, PopoverOpenChangeReason, {}, string, PopoverPayloadChangeReason>`): Opens, closes and inspects the popover from anywhere, and connects triggers outside it. Create one with `createPopoverController()`.
- `dismissible?` (`boolean`): Whether Escape, an outside press, focus or the window leaving, Android's back gesture and a sheet's swipe can close it. Triggers, Close parts and the controller always can. Pass `false` while it holds unsaved work, and ask in `onDismissAttempt`.
- `onDismissAttempt?` (`function`): Runs when `dismissible` refused a dismissal made on purpose: Escape, an outside press, back or a swipe. Focus or the window leaving is refused without it. Ask "Discard changes?" here.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### PopoverTrigger

A trigger outside the popover also takes `controller`.

- `disabled?` (`boolean`): Stops the trigger from opening the popover. A native button can't be focused or pressed, unless `focusableWhenDisabled` is set.
- `focusableWhenDisabled?` (`boolean`): Keeps a disabled trigger in the tab order with `aria-disabled` instead of the native attribute, so it can host a tooltip that says why. Presses still do nothing.
- `payload?` (`unknown`): Data for the content to render when this trigger opens the popover, like the row it belongs to.
- `shortcut?` (`string`): A keyboard shortcut that presses the trigger, like `"mod+i"`. `mod` is Command on Apple platforms and Control elsewhere. Sets `aria-keyshortcuts`.
- `controller?` (`PopupController<any, PopoverOpenChangeReason, {}, string, PopoverPayloadChangeReason>`): Connects a trigger outside the popover, like one per table row, to the popover with this controller.

### PopoverContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the trigger the popover opens on.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the popover lines up with the trigger along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the trigger and the popover, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the trigger, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `initialFocus?` (`PopoverInitialFocus`): Where focus goes when the popover opens. Opening on hover never moves focus, and opening with touch focuses the popover itself so no on-screen keyboard appears.
- `finalFocus?` (`PopupFocusTarget`): Where focus goes when the popover closes while focus is inside it.
- `keepMounted?` (`boolean`): Whether the popover stays in the page, hidden, while closed. Its content keeps its state between opens.
- `inline?` (`boolean`): Renders the popover where it is in the page instead of above it, inside its parent's layout and stacking, and leaves placing it to your CSS: `side`, `align` and the offsets don't apply.

### PopoverArrow

Points at the trigger from the side the popover landed on. Renders a `div`.

### PopoverTitle

Names the popover. Renders an `h2`.

### PopoverDescription

Describes the popover while it's rendered. Renders a `p`.

### PopoverClose

Closes the popover. Renders a `button`.

### PopoverShortcut

- `shortcut?` (`string`): The keys to show. Inside a trigger, its `shortcut`.

### State

What render functions, state-based class names and slots receive, per part.

`PopoverTrigger`:

- `open` (`boolean`): Whether the popover is open from this trigger.
- `disabled` (`boolean`): Set by the trigger's `disabled` prop, which stops it opening the popover.

`PopoverContent`:

- `open` (`boolean`): Whether the popover is open. False while it animates out.
- `modal` (`boolean | "trap-focus"`): The `modal` setting.
- `presentation` (`"popover" | "sheet"`): How it presents this time it's open.
- `payload` (`Payload | undefined`): The payload of the last open, from the trigger that opened it or a controller, typed as the controller's `Payload`.

`PopoverArrow`:

- `open` (`boolean`): Whether the popover is open. False as soon as it starts closing, while it still animates out.

`PopoverShortcut`:

- `text` (`string`): The shortcut formatted for this platform: `⌘I` on Apple platforms and `Ctrl+I` elsewhere. Empty without one.

### Reasons

`details.reason` says why the popover opened or closed.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `trigger-hover` (`PointerEvent`): The pointer rested on a trigger, or left it, with hover opening.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

For a payload change, it says what opened the popover or took it over.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `trigger-hover` (`PointerEvent`): The pointer rested on a trigger, or left it, with hover opening.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

With `dismissible` false, the refused dismissals `onDismissAttempt` reports:

- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

### Controller

Create one with `createPopoverController<Payload>()` and pass it as `controller`, to the popover and to any
triggers outside it. `Payload` is the type of the data triggers and `open()` pass.

Every write method takes an optional `{ reason, event }`, passed to `onOpenChange`.

- `isOpen()` (`() => boolean`): Whether it's open. False as soon as it starts closing, while it still animates out.
- `setOpen(open, options?)` (`(open: boolean, options?: PopupChangeOptions<PopoverOpenChangeReason> | undefined) => boolean`): Opens or closes it. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (PopupChangeOptions<PopoverPayloadChangeReason> & { payload?: Payload | undefined; anchor?: Anchor | undefined; signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens it, and resolves once it closes, with why, how and any return value. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the component leaves the page.
- `close(options?)` (`(options?: (PopupChangeOptions<PopoverOpenChangeReason> & { returnValue?: Result | undefined; }) | undefined) => boolean`): Closes it. `returnValue` is passed to the promise `open()` returned. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: PopupChangeOptions<PopoverOpenChangeReason> | undefined) => boolean`): Opens it when it's closed, and closes it when it's open. Returns false when the change was canceled.
- `getPayload()` (`() => Payload | undefined`): The payload of the last open, from a controller or the trigger that opened it.
- `focus()` (`() => void`): Moves focus to the trigger that opened it last, or the first trigger.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On        | Receives                                                                    |
| ---------------------- | --------- | --------------------------------------------------------------------------- |
| `onOpenChange`         | `Popover` | `(open, details)`: the new state, and the [reason](#reasons)                |
| `onOpenChangeComplete` | `Popover` | `(open)`, after the animation                                               |
| `onPayloadChange`      | `Popover` | `(payload, details)`: the content's new payload, and the [reason](#reasons) |
| `onDismissAttempt`     | `Popover` | `({ reason, event })`, when a dismissal was refused                         |

## Accessibility

The trigger is a button that opens a dialog, and focus inside follows the [WAI-ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### Tested Behavior

Every line below is an automated test.

**Trigger**

- Reflects the open state.
- Click opens the popover.
- Click on the open trigger closes the popover.
- Enter opens the popover.
- Space opens the popover.
- Points to the popover it controls while open.

**Focus**

- Opening moves focus to the first focusable element.
- Each time focus moves in, the popover is named by its title and described by its description.
- Tab moves through the popover in order.
- Shift+Tab from the first element returns focus to the trigger.
- Tab from the last element moves focus to the element after the trigger.
- Focus leaving the popover closes it.
- Escape closes the popover and returns focus to the trigger.
- An ancestor hears Escape already handled.
- Escape after a click returns focus to the trigger.
- The close button closes the popover and returns focus to the trigger.
- With initial focus none, opening leaves focus on the trigger.
- A virtual click from a screen reader moves focus into the popover.
- A touch press focuses the popover itself, so no on-screen keyboard appears.
- Closing after the trigger is gone moves focus to the element after where it was.
- Pressing a button inside keeps the popover open.

**Dismissal**

- Clicking outside closes the popover.
- Clicking inside the popover keeps it open.
- An outside press reaches what it hits.
- A press on empty space returns focus to the trigger.
- Escape while an input method is composing text leaves the popover open.
- Pressing a scrollbar outside the popover leaves it open.
- Pressing a button in a shadow root inside keeps the popover open.
- Tab into a button in a shadow root inside keeps the popover open.
- Escape on a button in a shadow root inside returns focus to the trigger.
- Switching windows leaves the popover open.

**Modal**

- With modal true, Tab stays inside the popover.
- With modal trap-focus, Tab stays inside the popover.
- With modal true, an outside press only closes the popover.
- With modal true, the page doesn't scroll while open.

**Hover**

- Resting the pointer on the trigger opens the popover.
- Moving the pointer into the popover keeps it open.
- Moving the pointer away closes the popover.
- Opening on hover leaves focus where it was.
- Keyboard focus on the trigger doesn't open the popover.
- Escape on a popover opened by hover leaves focus where it was.
- Pressing the trigger still opens the popover.

**Nested popovers**

- Using a nested popover keeps both open.
- Escape closes only the nested popover and returns focus to its trigger.
- Clicking outside closes every popover.

Runs in React, Vue and web components.

Additional behaviors:

**Enhancements**

- The popup writes --arrow-offset, where the trigger's center falls along its edge.
- Without a title, the trigger names the popover.
- Tab from the trigger of a popover opened by hover moves into it.
- A controller opens the popover from anywhere and moves focus in.
- A popover open from the start leaves focus alone.
- Modal popovers make the rest of the page inert and restore it exactly.
- Live regions keep announcing while a modal popover makes the page inert.
- Clicking into an iframe closes the popover.
- An infinite exit animation still unmounts.

**Shortcuts**

- A trigger's shortcut opens and closes the popover.
- The trigger advertises its shortcut, and its Shortcut part shows the keys to sighted users only.
- A Shortcut part shows its own keys.
- A trigger connected through a controller shows and binds its own shortcut.

**Web components**

- A title added after the popover connects names it. Web components only.
- Changing an attribute updates the part. Web components only.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while using the popover with a keyboard.

Runs in React, Vue and web components.
