<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Drawer

- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `open?` (`boolean`): Whether the dialog is open. Pass it to control the dialog.
- `defaultOpen?` (`boolean`): Whether the dialog starts open, when uncontrolled. Focus moves into it once it's on the page.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the dialog has finished opening or closing, after any animation.
- `dismissible?` (`boolean`): Whether Escape, an outside press and Android's back gesture can close the dialog. Close parts, triggers and the controller always can. Pass `false` while a form has unsaved changes, and ask in `onDismissAttempt`.
- `persistentElements?` (`(string | Element)[] | (() => Element[])`): Elements that stay usable while the dialog makes the page inert, like a chat launcher or a password manager's button. Elements, CSS selectors, or a function that returns elements, read when the dialog opens. Presses on them never close it.
- `pendingAnnouncement?` (`string`): What screen readers hear once a Close part's action has been running for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `onOpenChange?` (`((open: boolean, details: DialogOpenChangeDetails<DrawerOpenChangeReason>) => void)`): Runs when the drawer wants to open or close. `details.reason` says why, `"swipe"` included, `details.cancel()` stops it, and `details.returnValue` carries what closed it.
- `onPayloadChange?` (`((payload: unknown, details: ChangeDetails<DrawerPayloadChangeReason>) => void)`): Runs when the payload the content shows changes: a trigger with another payload opens the drawer, or takes a non-modal drawer over while it's open, which fires no `onOpenChange`, and so does a controller's `open({ payload })` on the open drawer. `details.cancel()` keeps the previous payload.
- `onDismissAttempt?` (`((details: DrawerDismissAttemptDetails) => void)`): Runs when a dismissal was refused because `dismissible` is false, including a swipe. The drawer resists and springs back. Ask "Discard changes?" here.
- `modal?` (`"trap-focus" | boolean`): `true`: the rest of the page is inert and doesn't scroll, focus is trapped, and an outside press only closes the drawer. `"trap-focus"`: traps focus and leaves the page usable. `false`: a drawer beside the page. See `modalAbove` to make it modal only above a snap point.
- `closeOnOutsidePress?` (`boolean`): Whether pressing outside the drawer, like on its backdrop, closes it.
- `controller?` (`DrawerController<any, any>`): Opens, closes and moves the drawer from anywhere, and connects triggers and outlets outside it. Create one with `createDrawerController()`.
- `snapPoints?` (`SnapPoint[]`): Where the drawer can rest, from the edge it comes from: a fraction of the screen up to 1, pixels above 1, `"…px"`, `"…rem"`, `"…%"`, or `"content"` for its own size. None can be larger than the drawer, which you size with CSS.
- `snapPoint?` (`SnapPoint | null`): The snap point it rests on. Pass it to control it.
- `defaultSnapPoint?` (`SnapPoint`): The snap point it opens at, when uncontrolled. It opens there again each time.
- `onSnapPointChange?` (`((snapPoint: SnapPoint, details: ChangeDetails<DrawerSnapPointChangeReason>) => void)`): Runs when the drawer moves to another snap point. `details.reason` says why: a swipe, the handle, the keyboard, a resize or the controller.
- `side?` (`Side`): The edge it comes from. `"start"` and `"end"` follow the writing direction.
- `modalAbove?` (`SnapPoint`): At or below this snap point the page stays usable and undimmed, like Maps: no inert page, no scroll lock, no `aria-modal`, and presses beside the drawer reach the page. Above it, `modal` applies. Changes once the drawer comes to rest.
- `driver?` (`SheetDriverName`): How it moves. `"pointer"` follows touch, mouse and pen with a spring fitted to iOS. `"scroll-snap"` uses the browser's own scrolling for bottom drawers. `"auto"` picks scroll snap for a bottom drawer on a touch screen, unless `modalAbove` is set or `expandOnScroll` is false, and the pointer driver otherwise.
- `expandOnScroll?` (`boolean`): Whether dragging toward a larger snap point on scrollable content moves the drawer first, until it's at its largest.
- `physics?` (`Partial<SheetPhysics>`): Overrides the motion: spring, projection, rubber band and dim. Starts from `sheetPhysics.ios`.
- `themeColor?` (`boolean`): Whether `<meta name="theme-color">` dims with the backdrop, so Safari's toolbars darken too. Written where motion starts and ends, never per frame.
- `preventEdgeSwipe?` (`boolean`): Whether presses on the drawer near the screen's left and right edges are kept from starting iOS Safari's back and forward swipe. Taps right at those edges then don't click. Read when the content mounts.

### DrawerTrigger

A trigger outside the drawer also takes `controller`.

- `disabled?` (`boolean`): Stops the trigger from opening the dialog. A native button can't be focused or pressed, unless `focusableWhenDisabled` is set.
- `focusableWhenDisabled?` (`boolean`): Keeps a disabled trigger in the tab order with `aria-disabled` instead of the native attribute, so it can host a tooltip that says why. Presses still do nothing.
- `payload?` (`unknown`): Data for the content to render when this trigger opens the dialog, like the row it belongs to.
- `shortcut?` (`string`): A keyboard shortcut that presses the trigger, like `"mod+k"`. `mod` is Command on Apple platforms and Control elsewhere. Sets `aria-keyshortcuts`, and a Shortcut part inside shows it. A modal dialog pauses the page's shortcuts while it's open.
- `controller?` (`PopupController<any, DialogOpenChangeReason, {}, any, DialogPayloadChangeReason>`): Connects a trigger outside the dialog, like one per table row, to the dialog with this controller.

### DrawerBackdrop

Dims the page behind a modal drawer, which manages its opacity. Renders a `div`.

### DrawerContent

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `initialFocus?` (`DialogInitialFocus`): Where focus goes when the dialog opens. Opening with touch focuses the dialog itself, so no on-screen keyboard appears.
- `finalFocus?` (`PopupFocusTarget`): Where focus goes when the dialog closes while focus is inside it.
- `keepMounted?` (`boolean`): Whether the dialog stays in the page, hidden, while closed. Its content keeps its state between opens.

### DrawerHandle

Resizes the sheet: a press moves to the next snap point, and arrow keys, Home and End choose one. Renders a `button`.

### DrawerTitle

Names the drawer. Renders an `h2`.

### DrawerDescription

Describes the drawer while it's rendered. Renders a `p`.

### DrawerClose

- `value?` (`string`): Reported as `returnValue` in `onOpenChange` and by the controller's `open()`. `createConfirm()` resolves `true` for `"confirm"`.
- `action?` (`((event: Event | undefined, details: ActionDetails) => unknown)`): Runs when the part is pressed, before the dialog closes. A returned Promise keeps the dialog open while it runs: the part gets `data-pending`, `aria-busy` and `aria-disabled`, screen readers hear the dialog's `pendingAnnouncement` after a second, and nothing but the controller closes the dialog. It closes with reason `"action"` once the Promise resolves. A rejection keeps it open and puts the reason in the part's `error` state until the next press, or until the dialog opens again. `details.source` says how the part was pressed, for changes made after an `await`.

### DrawerShortcut

- `shortcut?` (`string`): The keys to show. Inside a trigger, its `shortcut`.

### DrawerOutlet

An outlet outside the drawer also takes `controller`.

- `keyframes?` (`SheetKeyframes`): Keyframes it plays as the drawer expands, like `{ scale: [1, 0.94] }`: the first while collapsed, the last at the largest snap point. They run on the compositor when they're transforms or opacity.
- `controller?` (`DrawerController<any, any>`): Connects an outlet outside the drawer, like the app's shell, to the drawer with this controller.

### State

What render functions, state-based class names and slots receive, per part.

`DrawerTrigger`:

- `open` (`boolean`): Whether the dialog is open from this trigger.
- `disabled` (`boolean`): Set by the trigger's `disabled` prop, which stops it opening the dialog.

`DrawerBackdrop`:

- `open` (`boolean`): Whether the dialog is open. False while it animates out.
- `nested` (`boolean`): Whether the dialog was opened from inside another dialog.
- `nestedOpen` (`boolean`): Whether a dialog opened from inside this one is open.
- `interactive` (`boolean`): Whether the page behind is usable, so the backdrop lets presses through.

`DrawerContent`:

- `open` (`boolean`): Whether the dialog is open. False while it animates out.
- `modal` (`boolean | "trap-focus"`): The `modal` setting. Always true for an alert dialog.
- `nested` (`boolean`): Whether the dialog was opened from inside another dialog.
- `nestedOpen` (`boolean`): Whether a dialog opened from inside this one is open.
- `stack` (`number`): How many dialogs are open above this one, nested inside it.
- `payload` (`Payload | undefined`): The payload of the last open, from the trigger that opened it or a controller, typed as the controller's `Payload`.
- `pending` (`boolean`): Whether a Close part's action is running.
- `snapPoint` (`SnapPoint | null`): The snap point it rests on or is moving to.
- `expanded` (`boolean`): Whether it's at its largest snap point.
- `dragging` (`boolean`): Whether a finger, mouse or pen is dragging it.
- `side` (`PhysicalSide`): The edge it comes from, with `start` and `end` resolved.
- `interactive` (`boolean`): Whether the page behind is usable, because it rests at or below `modalAbove`.

`DrawerHandle`:

- `snapPoint` (`SnapPoint | null`): The snap point it rests on.
- `canExpand` (`boolean`): Whether there's a larger snap point to move to.
- `canCollapse` (`boolean`): Whether there's a smaller snap point to move to.

`DrawerClose`:

- `pending` (`boolean`): Whether this part's action is running.
- `error` (`unknown`): Why this part's last action failed, until it's pressed again or the dialog opens again.

`DrawerOutlet`:

- `open` (`boolean`): Whether the drawer is open. False as soon as it starts closing, while it still animates out.

### Reasons

`details.reason` says why the drawer opened or closed.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `parent-close` (`none`): The parent layer closed.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `action` (`MouseEvent | KeyboardEvent`): A Close part's `action` finished.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

For a payload change, it says what opened the drawer or took it over.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

Why it moved to another snap point:

- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `handle-press` (`MouseEvent | KeyboardEvent`): A drawer's handle was pressed, which moved it to its next snap point.
- `handle-key` (`KeyboardEvent`): Arrow keys, Home or End on a drawer's handle moved it between snap points.
- `content-resize` (`none`): The content or the screen changed size, and the drawer's snap point or the carousel's page went away, so it moved to the nearest one.

The dismissals `dismissible` can refuse:

- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

### Controller

Create one with `createDrawerController<Payload, Result>()` and pass it as `controller`, to the drawer and to any
triggers and outlets outside it.

Every write method takes an optional `{ reason, event }`, passed to the callbacks. Closing with a controller always works, even when the drawer isn't dismissible or an action is running.

- `isOpen()` (`() => boolean`): Whether it's open. False as soon as it starts closing, while it still animates out.
- `setOpen(open, options?)` (`(open: boolean, options?: PopupChangeOptions<DrawerOpenChangeReason> | undefined) => boolean`): Opens or closes it. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (PopupChangeOptions<DialogPayloadChangeReason> & { payload?: Payload | undefined; anchor?: Anchor | undefined; signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens it, and resolves once it closes, with why, how and any return value. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the component leaves the page.
- `close(options?)` (`(options?: (PopupChangeOptions<DrawerOpenChangeReason> & { returnValue?: Result | undefined; }) | undefined) => boolean`): Closes it. `returnValue` is passed to the promise `open()` returned. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: PopupChangeOptions<DrawerOpenChangeReason> | undefined) => boolean`): Opens it when it's closed, and closes it when it's open. Returns false when the change was canceled.
- `getPayload()` (`() => Payload | undefined`): The payload of the last open, from a controller or the trigger that opened it.
- `focus()` (`() => void`): Moves focus to the trigger that opened it last, or the first trigger.
- `getSnapPoint()` (`() => SnapPoint | null`): The snap point it rests on, or null before it first opens.
- `setSnapPoint(snapPoint, options?)` (`(snapPoint: SnapPoint, options?: ChangeOptions<DrawerSnapPointChangeReason> | undefined) => boolean`): Moves it to a snap point. While closed, it opens there next. Returns false when the change was canceled or it was already there.

### Events

Callbacks get the new value first, then the details.

| Prop                   | On       | Receives                                                                       |
| ---------------------- | -------- | ------------------------------------------------------------------------------ |
| `onOpenChange`         | `Drawer` | `(open, details)`: the new state, the [reason](#reasons) and any `returnValue` |
| `onOpenChangeComplete` | `Drawer` | `(open)`, once it has settled                                                  |
| `onPayloadChange`      | `Drawer` | `(payload, details)`: the content's new payload, and the [reason](#reasons)    |
| `onSnapPointChange`    | `Drawer` | `(snapPoint, details)`: the new snap point and the [reason](#reasons)          |
| `onDismissAttempt`     | `Drawer` | `({ reason, event })`, when a dismissal was refused                            |

## Accessibility

The trigger is a button that opens a dialog, and the drawer follows the [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) while it's modal: `aria-modal`, focus trapped inside, the page inert, labelled by its title and described by its description. Escape closes it. The handle is a button that controls the drawer: a press moves to the next snap point, arrow keys along the drawer's axis step, and Home and End go to the ends. Every line below is an automated test.

### Keyboard

| Key                       | Does                                                                          |
| ------------------------- | ----------------------------------------------------------------------------- |
| Enter, Space              | On the trigger, opens the drawer; on the handle, moves to the next snap point |
| Arrow keys along the axis | On the handle, moves one snap point without wrapping                          |
| Home, End                 | On the handle, moves to the smallest or largest snap point                    |
| Tab, Shift+Tab            | Moves through the sheet's controls, staying inside while it's modal           |
| Escape                    | Closes the topmost drawer when it's dismissible                               |

It shares [Dialog’s focus behavior](/docs/components/dialog#focus): focus moves inside on open and returns when it closes. A touch open focuses the content so a field does not summon the keyboard immediately. When the on-screen keyboard opens, the viewport shrinks and the focused field can scroll into view inside the sheet.

### Tested Behavior

**Dialog**

- The trigger advertises a dialog.
- The trigger opens a modal dialog named by its title and described by its description.
- Opening moves focus into the drawer and closing returns it to the trigger.
- Tab stays inside the drawer.
- Escape closes it with the escape-key reason.
- Pressing the backdrop closes it.
- A Close part closes it.
- Buttons inside it work without closing it.
- The page behind is hidden from assistive technology while it's open.
- Opening and closing never scroll or restyle the page.
- A controller opens it from outside.

**Sheet**

- It rises from the bottom and rests against it at its own size.
- It opens at the first snap point, a fraction of the screen.
- A slow drag settles on the nearest snap point and reports the swipe.
- A drag down past the smallest snap point closes it with the swipe reason.
- A short fast flick down closes it, though it moved less than half its height.
- The same distance, slowly, settles back.
- A fling up from the smallest snap point can pass the middle one.
- A press while it rises catches it and holds it under the finger.
- A short drag back up keeps it open.
- A click on a button inside it isn't a drag.
- With side="…" it rests against the … edge.
- With side="left" a drag toward the left closes it.

**Touch**

- A touch drag down closes it.

**Handle**

- Pressing it moves to the next snap point and wraps.
- Arrow keys step without wrapping, and Home and End go to the ends.
- Moving it moves the drawer to the snap point's extent.
- A snap point a controller sets while it animates closed is where it opens next.
- A controller moves it with the imperative reason.

**Not dismissible**

- Escape reports an attempt and keeps it open.
- A press on the backdrop reports an attempt and keeps it open.
- A swipe down resists, springs back and reports an attempt.

**Modal above a snap point**

- At that snap point the page stays usable and the drawer isn't modal.
- Above it the drawer becomes modal, and back down the page is usable again.
- The switch doesn't move focus.

**Nested**

- Escape closes only the drawer on top.

Runs in React, Vue and web components.

Screen readers and layouts the drawer is tested against:

- No axe violations while closed.
- No axe violations while open.
- No axe violations while a nested drawer is open.
- No axe violations while it rests where the page stays usable.
- The drawer's accessibility tree is a dialog with its handle, title and actions.
- The handle is a button that controls the drawer.

Runs in React, Vue and web components.

- Side="start" comes from the right in a right-to-left layout.
- Side="end" comes from the left in a right-to-left layout.
- A drag toward the start edge closes it in a right-to-left layout.

Runs in React, Vue and web components.

Also tested:

- Without a touch screen `auto` picks the pointer driver.

**Dialog**

- An open modal drawer is marked aria-modal.
- A keyboard open focuses its first control, and Tab cycles through the controls in order.
- A controller's open() resolves with how it closed.

**Shortcuts**

- A trigger connected through a controller shows its shortcut in a Shortcut part, and binds it.

**State attributes**

- The content names its side, its snap point and whether it's at the largest.
- A drawer resting at its own size reports the content snap point and is expanded.
- Data-dragging is set while a drag moves it.
- A drawer opened from inside another marks both, and the one beneath reads its depth from --drawer-stack.

**Physics**

- Past the largest snap point it stretches less than 24px and springs back.

**Touch**

- Pulling down on scrolled content scrolls it to the top, then moves the drawer in the same gesture.
- Pushing up on content below the largest snap point grows the drawer before the content scrolls.

**Compositor**

- A settle runs as a spring sampled into linear(), on translate and the backdrop's opacity.
- While a finger drives it, the drawer writes no attributes, only styles.
- Its variables are registered and don't inherit, so moving it restyles only the drawer.
- With reduced motion it fades in and out instead of sliding.

**Page**

- An outlet outside the drawer follows it, and goes back when it closes.
- The theme color dims while it's open and comes back when it closes.
- Content that grows moves its content snap point, and the drawer follows.
- Escape on a drawer that can't be dismissed nudges it toward closing.

**Scroll-snap driver**

- On a touch screen it's the driver `auto` picks.
- On a touch screen `auto` keeps the pointer driver with …=….
- It opens at its first snap point with the browser's scrolling.
- A swipe up snaps to the next snap point and reports the swipe.
- It comes to rest when the scroll ends before the page hears the finger lift.
- The handle moves it with a spring, like the pointer driver.

Runs in React, Vue and web components.
