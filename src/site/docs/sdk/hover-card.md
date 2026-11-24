<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.16, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### HoverCard

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `open?` (`boolean`): Whether the card is open. Pass it to control the card.
- `defaultOpen?` (`boolean`): Whether the card starts open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<HoverCardOpenChangeReason>) => void)`): Runs when the card wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the card has finished opening or closing, after any animation.
- `onPayloadChange?` (`((payload: unknown, details: ChangeDetails<HoverCardPayloadChangeReason>) => void)`): Runs when the payload the content shows changes: a trigger with another payload opens the card, or takes the open card over, which fires no `onOpenChange`, and so does a controller's `open({ payload })` on the open card. `details.cancel()` keeps the previous payload.
- `delay?` (`number`): Milliseconds the pointer rests on the trigger, or keyboard focus stays on it, before the card opens.
- `closeDelay?` (`number`): Milliseconds before the card closes once the pointer leaves the trigger and the card.
- `disabled?` (`boolean`): Stops the card from opening. The trigger keeps working as a link.
- `controller?` (`PopupController<any, HoverCardOpenChangeReason, {}, string, HoverCardPayloadChangeReason>`): Opens, closes and inspects the card from anywhere, and connects triggers outside it. Create one with `createHoverCardController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### HoverCardTrigger

A trigger outside the card also takes `controller`.

- `payload?` (`unknown`): Data for the content to render when this trigger opens the card, like the profile it links to.
- `controller?` (`PopupController<any, HoverCardOpenChangeReason, {}, string, HoverCardPayloadChangeReason>`): Connects a trigger outside the card, like every author link in a feed, to the card with this controller.

### HoverCardContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the trigger the card opens on.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the card lines up with the trigger along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the trigger and the card, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the trigger, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `keepMounted?` (`boolean`): Whether the card stays in the page, hidden, while closed. Its content keeps its state between opens.

### HoverCardArrow

Points at the link from the side the card landed on. Renders a `div`.

### State

What render functions, state-based class names and slots receive, per part.

`HoverCardTrigger`:

- `open` (`boolean`): Whether the card is open from this trigger.

`HoverCardContent`:

- `open` (`boolean`): Whether the card is open. False while it animates out.
- `payload` (`Payload | undefined`): The payload of the last open, from the trigger that opened it or a controller, typed as the controller's `Payload`.

`HoverCardArrow`:

- `open` (`boolean`): Whether the card is open. False as soon as it starts closing, while it still animates out.

### Reasons

`details.reason` says why the card opened or closed.

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

For a payload change, it says what opened the card or took it over.

- `trigger-hover` (`PointerEvent`): The pointer rested on a trigger, or left it, with hover opening.
- `trigger-focus` (`FocusEvent`): Keyboard focus reached a trigger that opens on focus, like a tooltip's.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createHoverCardController<Payload>()` and pass it as `controller`, to the card and to any
triggers outside it. `Payload` is the type of the data triggers and `open()` pass.

Every write method takes an optional `{ reason, event }`, passed to `onOpenChange`.

- `isOpen()` (`() => boolean`): Whether it's open. False as soon as it starts closing, while it still animates out.
- `setOpen(open, options?)` (`(open: boolean, options?: PopupChangeOptions<HoverCardOpenChangeReason> | undefined) => boolean`): Opens or closes it. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (PopupChangeOptions<HoverCardPayloadChangeReason> & { payload?: Payload | undefined; anchor?: Anchor | undefined; signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens it, and resolves once it closes, with why, how and any return value. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the component leaves the page.
- `close(options?)` (`(options?: (PopupChangeOptions<HoverCardOpenChangeReason> & { returnValue?: string | undefined; }) | undefined) => boolean`): Closes it. `returnValue` is passed to the promise `open()` returned. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: PopupChangeOptions<HoverCardOpenChangeReason> | undefined) => boolean`): Opens it when it's closed, and closes it when it's open. Returns false when the change was canceled.
- `getPayload()` (`() => Payload | undefined`): The payload of the last open, from a controller or the trigger that opened it.
- `focus()` (`() => void`): Moves focus to the trigger that opened it last, or the first trigger.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On          | Receives                                                                    |
| ---------------------- | ----------- | --------------------------------------------------------------------------- |
| `onOpenChange`         | `HoverCard` | `(open, details)`: the new state, and the [reason](#reasons)                |
| `onOpenChangeComplete` | `HoverCard` | `(open)`, after the animation                                               |
| `onPayloadChange`      | `HoverCard` | `(payload, details)`: the content's new payload, and the [reason](#reasons) |

## Accessibility

The trigger stays a plain link, and the card is a preview beside it, not a dialog. Every line below is an automated test.

### Keyboard

| Key    | Does                                                                         |
| ------ | ---------------------------------------------------------------------------- |
| Tab    | On the link, opens the card after `delay`; with the card open, moves into it |
| Enter  | Follows the link                                                             |
| Escape | Closes the card and leaves focus on the link                                 |

Keyboard focus opens the card after the same `delay` as the pointer, so tabbing through a page of links doesn't flash a card at every stop. Focus leaving the card closes it.

Touch screens have no hover, so a tap follows the link without opening the card. Anything in the card should be on the page the link goes to.

### Tested Behavior

**Pointer**

- Resting the pointer on the link opens the card.
- The card waits for its delay before opening.
- Moving the pointer away closes the card after its close delay.
- Moving the pointer into the card keeps it open.
- Opening on hover leaves focus where it was.
- Clicking the link follows it.

**Keyboard**

- Keyboard focus on the link opens the card after the delay.
- Keyboard focus on a link the pointer opened keeps the card open when the pointer leaves.
- Escape closes the card and leaves focus on the link.
- Enter follows the link.

**Positioning**

- The card opens below the link.
- The card opens on the requested side.

**Animation**

- The card animates in from its starting style.
- The card stays in the page while it animates out.

**Focus, touch and reasons**

- A click that focuses the link doesn't open the card from focus.
- Leaving the link before the delay keeps keyboard focus from opening it later.
- A tap follows the link without opening the card.
- Changes report why the card opened and closed.

Runs in React, Vue and web components.

Also tested:

**Enhancements**

- Tab from the link moves into the open card.
- Shift+Tab from the card returns to the link.
- Tab out of the card moves on past the link and closes it.
- Escape inside the card closes it and returns focus to the link.
- The card stays open while focus is in it, even when the pointer leaves.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while tabbing into the card and out.

Runs in React, Vue and web components.
