<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Dialog

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `open?` (`boolean`): Whether the dialog is open. Pass it to control the dialog.
- `defaultOpen?` (`boolean`): Whether the dialog starts open, when uncontrolled. Focus moves into it once it's on the page.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the dialog has finished opening or closing, after any animation.
- `dismissible?` (`boolean`): Whether Escape, an outside press and Android's back gesture can close the dialog. Close parts, triggers and the controller always can. Pass `false` while a form has unsaved changes, and ask in `onDismissAttempt`.
- `onDismissAttempt?` (`((details: DialogDismissAttemptDetails) => void)`): Runs when a dismissal was refused, because `dismissible` is false, an outside press doesn't close it, or a Close part's action is running. Ask "Discard changes?" here.
- `persistentElements?` (`(string | Element)[] | (() => Element[])`): Elements that stay usable while the dialog makes the page inert, like a chat launcher or a password manager's button. Elements, CSS selectors, or a function that returns elements, read when the dialog opens. Presses on them never close it.
- `pendingAnnouncement?` (`string`): What screen readers hear once a Close part's action has been running for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `onOpenChange?` (`((open: boolean, details: DialogOpenChangeDetails) => void)`): Runs when the dialog wants to open or close. `details.reason` says why, `details.cancel()` stops it, and `details.returnValue` carries what closed it.
- `onPayloadChange?` (`((payload: unknown, details: ChangeDetails<DialogPayloadChangeReason>) => void)`): Runs when the payload the content shows changes: a trigger with another payload opens the dialog, or takes a non-modal dialog over while it's open, which fires no `onOpenChange`, and so does a controller's `open({ payload })` on the open dialog. `details.cancel()` keeps the previous payload.
- `modal?` (`"trap-focus" | boolean`): `true`: the rest of the page is inert and doesn't scroll, focus is trapped, and an outside press only closes the dialog. `"trap-focus"`: traps focus, and leaves the page scrollable and clickable. `false`: a dialog beside the page, which Tab can leave and outside presses don't close.
- `closeOnOutsidePress?` (`boolean`): Whether pressing outside the dialog, like on its backdrop, closes it. The press counts once it's released outside too, so dragging a text selection out of a field doesn't close it.
- `presentation?` (`PresentationSetting<"dialog">`): How the dialog presents. `"sheet"` slides it up from the bottom of the screen, where it can be swiped away, and `"auto"` does that on small touch screens. Decided each time it opens; the server renders `"dialog"` for `"auto"`.
- `controller?` (`PopupController<any, DialogOpenChangeReason, {}, any, DialogPayloadChangeReason>`): Opens, closes and inspects the dialog from anywhere, and connects triggers outside it. Create one with `createDialogController()`.

### DialogTrigger

A trigger outside the dialog also takes `controller`.

- `disabled?` (`boolean`): Stops the trigger from opening the dialog. A native button can't be focused or pressed, unless `focusableWhenDisabled` is set.
- `focusableWhenDisabled?` (`boolean`): Keeps a disabled trigger in the tab order with `aria-disabled` instead of the native attribute, so it can host a tooltip that says why. Presses still do nothing.
- `payload?` (`unknown`): Data for the content to render when this trigger opens the dialog, like the row it belongs to.
- `shortcut?` (`string`): A keyboard shortcut that presses the trigger, like `"mod+k"`. `mod` is Command on Apple platforms and Control elsewhere. Sets `aria-keyshortcuts`, and a Shortcut part inside shows it. A modal dialog pauses the page's shortcuts while it's open.
- `controller?` (`PopupController<any, DialogOpenChangeReason, {}, any, DialogPayloadChangeReason>`): Connects a trigger outside the dialog, like one per table row, to the dialog with this controller.

### DialogBackdrop

Dims the page behind a modal dialog. Renders a `div`.

### DialogContent

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `initialFocus?` (`DialogInitialFocus`): Where focus goes when the dialog opens. Opening with touch focuses the dialog itself, so no on-screen keyboard appears.
- `finalFocus?` (`PopupFocusTarget`): Where focus goes when the dialog closes while focus is inside it.
- `keepMounted?` (`boolean`): Whether the dialog stays in the page, hidden, while closed. Its content keeps its state between opens.
- `inline?` (`boolean`): Renders the dialog and its backdrop where they are in the page instead of above it, so it can stay inside a frame, like an app preview. Pair it with `modal="trap-focus"` to keep the rest of the page usable. A `container` on the dialog still moves its backdrop, so leave it off.

### DialogTitle

Names the dialog. Renders an `h2`.

### DialogDescription

Describes the dialog while it's rendered. Renders a `p`.

### DialogClose

Its `action` receives the event and `{ source }`, how the part was pressed, as [Button](/docs/components/button#changes-after-an-await) describes.

- `value?` (`string`): Reported as `returnValue` in `onOpenChange` and by the controller's `open()`. `createConfirm()` resolves `true` for `"confirm"`.
- `action?` (`((event: Event | undefined, details: ActionDetails) => unknown)`): Runs when the part is pressed, before the dialog closes. A returned Promise keeps the dialog open while it runs: the part gets `data-pending`, `aria-busy` and `aria-disabled`, screen readers hear the dialog's `pendingAnnouncement` after a second, and nothing but the controller closes the dialog. It closes with reason `"action"` once the Promise resolves. A rejection keeps it open and puts the reason in the part's `error` state until the next press, or until the dialog opens again. `details.source` says how the part was pressed, for changes made after an `await`.

### DialogShortcut

- `shortcut?` (`string`): The keys to show. Inside a trigger, its `shortcut`.

### State

What render functions, state-based class names and slots receive, per part.

`DialogTrigger`:

- `open` (`boolean`): Whether the dialog is open from this trigger.
- `disabled` (`boolean`): Set by the trigger's `disabled` prop, which stops it opening the dialog.

`DialogBackdrop`:

- `open` (`boolean`): Whether the dialog is open. False while it animates out.
- `nested` (`boolean`): Whether the dialog was opened from inside another dialog.
- `nestedOpen` (`boolean`): Whether a dialog opened from inside this one is open.

`DialogContent`:

- `open` (`boolean`): Whether the dialog is open. False while it animates out.
- `modal` (`boolean | "trap-focus"`): The `modal` setting. Always true for an alert dialog.
- `nested` (`boolean`): Whether the dialog was opened from inside another dialog.
- `nestedOpen` (`boolean`): Whether a dialog opened from inside this one is open.
- `stack` (`number`): How many dialogs are open above this one, nested inside it.
- `payload` (`Payload | undefined`): The payload of the last open, from the trigger that opened it or a controller, typed as the controller's `Payload`.
- `pending` (`boolean`): Whether a Close part's action is running.
- `presentation` (`"dialog" | "sheet"`): How it presents this time it's open.

`DialogClose`:

- `pending` (`boolean`): Whether this part's action is running.
- `error` (`unknown`): Why this part's last action failed, until it's pressed again or the dialog opens again.

`DialogShortcut`:

- `text` (`string`): The shortcut formatted for this platform: `⌘K` on Apple platforms and `Ctrl+K` elsewhere. Empty without one.

### Reasons

`details.reason` says why the dialog opened or closed.

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

For a payload change, it says what opened the dialog or took it over.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

The dismissals `dismissible` can refuse:

- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

### Controller

Create one with `createDialogController<Payload, Result>()` and pass it as `controller`, to the dialog and to any
triggers outside it.

Every write method takes an optional `{ reason, event }`, passed to `onOpenChange`. Closing with a controller always works, even when the dialog isn't dismissible or an action is running.

- `isOpen()` (`() => boolean`): Whether it's open. False as soon as it starts closing, while it still animates out.
- `setOpen(open, options?)` (`(open: boolean, options?: PopupChangeOptions<DialogOpenChangeReason> | undefined) => boolean`): Opens or closes it. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (PopupChangeOptions<DialogPayloadChangeReason> & { payload?: Payload | undefined; anchor?: Anchor | undefined; signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens it, and resolves once it closes, with why, how and any return value. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the component leaves the page.
- `close(options?)` (`(options?: (PopupChangeOptions<DialogOpenChangeReason> & { returnValue?: Result | undefined; }) | undefined) => boolean`): Closes it. `returnValue` is passed to the promise `open()` returned. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: PopupChangeOptions<DialogOpenChangeReason> | undefined) => boolean`): Opens it when it's closed, and closes it when it's open. Returns false when the change was canceled.
- `getPayload()` (`() => Payload | undefined`): The payload of the last open, from a controller or the trigger that opened it.
- `focus()` (`() => void`): Moves focus to the trigger that opened it last, or the first trigger.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On       | Receives                                                                       |
| ---------------------- | -------- | ------------------------------------------------------------------------------ |
| `onOpenChange`         | `Dialog` | `(open, details)`: the new state, the [reason](#reasons) and any `returnValue` |
| `onOpenChangeComplete` | `Dialog` | `(open)`, after the animation                                                  |
| `onPayloadChange`      | `Dialog` | `(payload, details)`: the content's new payload, and the [reason](#reasons)    |
| `onDismissAttempt`     | `Dialog` | `({ reason, event })`, when a dismissal was refused                            |

## Accessibility

The trigger is a button that opens a dialog, and the dialog follows the [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): `aria-modal` while it's modal, labelled by its title, described by its description only while one is rendered. Every line below is an automated test.

### Keyboard

| Key                  | Does                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| Enter, Space         | On the trigger, opens the dialog                                     |
| Tab, Shift+Tab       | Moves through the dialog's controls, staying inside while it's modal |
| Escape               | Closes the topmost dialog and returns focus to its trigger           |
| A trigger's shortcut | Opens its dialog from anywhere on the page                           |

### Tested Behavior

**Trigger**

- Advertises a dialog.
- Click opens the dialog.
- Enter opens the dialog.
- Space opens the dialog.

**Focus**

- Opening moves focus to the first focusable element.
- Each time focus moves in, the dialog is named by its title and described by its description.
- Tab moves through the dialog in order.
- Tab from the last element wraps to the first.
- Shift+Tab from the first element wraps to the last.
- … from inside an iframe that is the … element wraps around the dialog.
- Shift+Tab from the first element wraps to the checked radio of a group outside a form.
- Tab reaches radios whose group's checked radio is behind the dialog.
- Tab visits a positive tabindex first, like the browser.
- A positive tabindex keeps Tab inside a dialog that leaves the page usable.
- A positive tabindex slotted into a custom element keeps its host's place.
- With a positive tabindex in the dialog, Tab still moves through a shadow root and slots.
- With a positive tabindex in the dialog, Tab from a focused element outside the tab order goes to the next stop.
- Tab from a custom element with a positive tabindex enters its shadow root.
- Tab from a last control inside a shadow root wraps to the first, and Shift+Tab comes back to it.
- Tab wraps past a shadow root that Tab skips, under an inert or tabindex -1 host.
- Tab wraps from the last stop of a shadow root that orders a positive tabindex first.
- Opening focuses the first field even when a later one has a positive tabindex.
- Escape closes the dialog and returns focus to the trigger.
- An ancestor hears Escape already handled.
- Escape after a click returns focus to the trigger.
- The close button closes the dialog and returns focus to the trigger.
- A virtual click from a screen reader moves focus into the dialog.
- A touch press focuses the dialog itself, so no on-screen keyboard appears.
- Pressing a button inside keeps the dialog open.

**Dismissal**

- Pressing the backdrop closes the dialog.
- Pressing the backdrop returns focus to the trigger.
- After pressing the backdrop, Space on the trigger opens it again.
- Clicking inside the dialog keeps it open.
- An outside press doesn't reach the page.

**Presses**

- Selecting text in a field and releasing over the backdrop keeps the dialog open.
- Pressing the backdrop and releasing inside the dialog keeps it open.
- A right click on the backdrop keeps the dialog open.
- A dialog styled only with ::backdrop closes when the backdrop is pressed.
- With closeOnOutsidePress false, pressing the backdrop keeps the dialog open.
- Pressing a nested dialog's backdrop closes only the nested dialog.
- While the dialog animates out, a press on its backdrop doesn't reach the page.
- Escape right after opening a nested dialog closes only the nested one.

**Modal**

- Tab never leaves the dialog.
- The page doesn't scroll while the dialog is open.
- The rest of the page is hidden from assistive technology.
- With modal false, the page stays usable.

**Nested dialogs**

- Escape closes only the nested dialog and returns focus to its trigger.
- The nested dialog's close button closes only it.
- The outer dialog's open change hears only the outer dialog.
- Tab stays inside the nested dialog.
- A second Escape closes the outer dialog.

Runs in React, Vue and web components.

Additional behaviors:

**Escape that closes exactly one thing**

- Escape while an input method is composing text keeps the dialog open.
- Escape closes a non-modal dialog only while focus is inside it.

**Focus that always lands somewhere useful**

- Closing returns focus to the trigger before the exit animation finishes.
- Closing after the trigger is gone moves focus to the element after where it was.
- Closing after the trigger is gone skips past a later positive tabindex.
- A dialog open from the start moves focus inside.
- With initial focus on the content, the dialog itself takes focus.

**The outside is inert, except what must stay live**

- The page outside is inert while open and restored exactly after.
- A live region outside the dialog keeps announcing while it's open.

**Non-modal dialogs that behave like the APG**

- Tab leaves a non-modal dialog and the dialog stays open.
- A non-modal dialog stays open when the page is clicked.

**Nested and stacked**

- A dialog opened inside a dialog marks both, for styling.
- Closing the parent closes the nested dialog with reason parent-close.

**Opening from anywhere**

- A controller opens the dialog, moves focus in, and resolves with how it closed.
- Aborting the signal closes the dialog, and the promise resolves once.
- A pending open() resolves with reason unmount when the dialog leaves the page. Web components only.
- A form with method dialog closes the dialog and reports the submitter's value.
- A confirm helper resolves true for the action and false otherwise.
- A confirm opened from inside a modal dialog takes focus and stays usable.
- A confirm opened over a modal dialog with nothing focused stays usable.
- A confirm opened as a modal dialog shows, before the page freezes, stays usable.
- Closing reports why, for every way a dialog closes.

**Shortcuts**

- A trigger connected through a controller shows its shortcut in a Shortcut part, and binds it.

**Web components**

- The open property and attribute open and close the dialog. Web components only.

Runs in React, Vue and web components.

**Opening a dialog from a menu item**

- Choosing the item closes the menu and moves focus into the dialog.
- Choosing the item with the keyboard moves focus into the dialog.

**The page and focus around a dialog opened from a menu item**

- The page around the dialog is inert, the menu's trigger included.
- Closing the dialog returns focus to the menu's trigger.
- A dialog the item opens through its open prop returns focus to the menu's trigger. React and Vue only.

**Shortcuts**

- A trigger's shortcut opens the dialog.
- The trigger advertises its shortcut, and shows it to sighted users only.
- A modal dialog pauses the page's shortcuts and keeps its own.
- A dialog's own shortcut doesn't run while the dialog is closed.
- Menu and popover triggers take shortcuts too.
- Plain keys typed in a text field are text, and modifier shortcuts still run.
- A plain-key shortcut runs outside text fields.

**A dirty form**

- Refuses Escape and outside presses, and reports each attempt.
- A clean form closes on Escape.

**Persistent elements**

- Stay usable while a modal dialog is open, and pressing them keeps it open.

**Async actions**

- Keep the alert dialog open and pending, then close with reason action.
- A failed action keeps the alert dialog open and stops pending.

**Popups inside a portaled popover**

- A menu and a dialog inside it render into the popover's container.

**Android's back gesture**

- Closes the topmost dialog with reason back.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while using the dialog with a keyboard.
- Announcements while using the alert dialog with a keyboard.

Runs in React, Vue and web components.
