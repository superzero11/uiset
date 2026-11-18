<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

### Toast

- `id?` (`string`): Reuses a toast: a toast with this id that's still showing is updated instead of added again.
- `title?` (`Content`): The main message.
- `description?` (`Content`): More detail, under the title.
- `type?` (`ToastType`): What it's about, for styling through `data-type`, and for how it's announced.
- `duration?` (`number`): How long it shows, in ms, while nothing pauses it. `Infinity` keeps it until dismissed.
- `priority?` (`"assertive" | "polite"`): How screen readers announce it: `"polite"` waits for a pause, `"assertive"` interrupts.
- `action?` (`ToastAction<Content>`): A button that does something, like Undo.
- `cancel?` (`ToastCancel<Content>`): A button that dismisses it, like Cancel.
- `dismissible?` (`boolean`): Whether the user can dismiss it: swiping, Escape and Close parts. Timers and `dismiss()` still close it.
- `data?` (`unknown`): Anything else, for your own rendering, like an avatar.
- `onDismiss?` (`((details: ToastDismissDetails) => void)`): Runs when it closes, with why. Calling `details.cancel()` keeps it.

`toast(message, options)` and `toast(options)` return the toast's id. `toast.success`, `.info`, `.warning`, `.error` and `.loading` set the type. `toast.promise(promise, { loading, success, error })` returns the id too, and `toast.update(id, options)` returns whether the toast was still there. `toast.dismiss(id)` closes one, and `toast.dismiss()` every one.

### Actions

- `label` (`Content`): The button's text.
- `onAction?` (`((event: Event | undefined, details: ToastActionDetails) => unknown)`): Runs when it's pressed. A returned Promise marks the action pending, then dismisses the toast once it resolves. A rejection keeps the toast. `details.source` says how it was pressed, for changes made after an `await`.
- `href?` (`string`): Makes the action a link.
- `dismiss?` (`boolean`): Whether pressing it dismisses the toast.

- `label` (`Content`): The button's text.
- `onCancel?` (`((event: Event | undefined, details: ToastActionDetails) => void)`): Runs when it's pressed, before the toast closes. `details.source` says how it was pressed.

### ToastRegion

- `toaster?` (`Toaster<any>`): The queue it shows. A second toaster, from `createToaster()`, gives a second region its own toasts.
- `side?` (`"bottom" | "top"`): The edge of the viewport it sits on. Swiping toward it dismisses a toast.
- `align?` (`"center" | "end" | "start"`): Where along that edge. `"start"` and `"end"` follow the writing direction, and swiping toward them dismisses too.
- `maxVisible?` (`number`): How many toasts show at once. Older ones wait, with their timers stopped, until there's room.
- `expanded?` (`boolean`): Whether the stack is always expanded. Otherwise it expands while the pointer or focus is in it.
- `shortcut?` (`string | null`): The key that moves focus into the region and back, like `"F6"` or `"alt+t"`. `null` turns it off.
- `pendingAnnouncement?` (`string`): What screen readers hear once a toast's action or close button has been pending for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### ToastAction

- `onAction?` (`((event: Event | undefined, details: ToastActionDetails) => unknown)`): Runs when it's pressed, instead of the toast's own `action.onAction`. A returned Promise marks it pending. `details.source` says how it was pressed, for changes made after an `await`.
- `dismiss?` (`boolean`): Whether pressing it dismisses the toast.

### ToastClose

- `action?` (`((event: Event | undefined, details: ToastActionDetails) => unknown)`): Runs before the toast closes. A returned Promise keeps it open and the button pending until it settles. `details.source` says how it was pressed, for changes made after an `await`.

### Confirm

- `title` (`string`): The question, like "Delete this project?".
- `description?` (`string`): What agreeing does.
- `confirmLabel?` (`string`): The agreeing button's text.
- `cancelLabel?` (`string`): The other button's text.

### State

`ToastRegion`:

- `side` (`"top" | "bottom"`): The edge it sits on.
- `align` (`"start" | "center" | "end"`): Where along that edge.
- `expanded` (`boolean`): Whether the stack is expanded.
- `toasts` (`readonly ToastItem<unknown>[]`): The toasts to render, newest first, including ones animating out.

`Toast`:

- `type` (`ToastType`): What it's about.
- `index` (`number`): Its place in the stack, 0 for the newest.
- `front` (`boolean`): Whether it's the newest, on top of a collapsed stack. A closing toast keeps it.
- `expanded` (`boolean`): Whether the stack is expanded.
- `leaving` (`boolean`): Whether it's animating out.

`ToastAction` and `ToastClose`:

- `pending` (`boolean`): Whether a Promise its handler returned is still running.
- `error` (`unknown`): Why its handler failed, until it's pressed again.

### Reasons

- `timeout` (`none`): A duration ran out, like a toast's, or a rotating carousel's interval.
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `action` (`MouseEvent | KeyboardEvent`): A Close part's `action` finished.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

## Accessibility

Toasts are announced through shared [live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions), once each, without making the visible region live: politely by default and assertively for errors. While it has toasts, the region is a landmark named Notifications; set `aria-label` to name it in the page's language. Keep messages short, and use `duration: Infinity` for one that has to stay available.

### Keyboard

F6, or the region's `shortcut`, moves focus to the newest toast, and pressing it again returns focus to where it came from. Tab moves through the toasts and their buttons, and Tab past the last one goes back too. Escape dismisses the focused toast; focus then moves to the next toast, or back where it came from after the last one. The region stays reachable while a modal dialog is open, and its timers pause while focus is inside.

### Tested Behavior

Every line below is an automated test.

**Showing**

- A toast shows its title, description and action in the Notifications region.
- Newer toasts come first.
- The newest toast is marked as the front one.
- Each toast says what it's about through data-type.
- The region sits on its side and alignment.
- It shows above everything, in the top layer.
- A promise toast loads, then shows the result.
- A toast with an id that's showing is updated in place.

**Closing**

- A toast closes after its duration.
- Infinity keeps it until it's dismissed.
- The Dismiss button closes it.
- The action runs and closes it.
- Escape on a focused toast closes it.
- A closing toast stays while it animates out.
- A toast that can't be dismissed ignores Escape.

**Timers**

- Hovering the region pauses its timers, and leaving resumes them.
- Focus in the region pauses its timers.

**Keyboard**

- F6 moves focus to the newest toast, and again back where it was.
- The shortcut is configurable.
- The region names its shortcut.
- When the focused toast closes, focus goes to the next one, then back where it was.

**Stacking**

- Only maxVisible toasts show; the rest wait for room.
- The stack expands while hovered or focused.
- Expanded keeps the stack expanded.
- Toasts measure their heights and offsets for the stack.
- A toast measures its content's height, whatever height it's given.
- A toast given its measured height animates to a new one when its content changes.
- A toast measures again when a child, its class or its padding changes.
- A toast closing from the front stays in front while it animates out.

**Swiping**

- Swiping toward the region's side dismisses.
- Swiping toward the aligned edge dismisses too.
- A short swipe snaps back.
- Swiping away from the side never dismisses.
- A toast that can't be dismissed doesn't swipe.

**Over a modal dialog**

- A toast shown from a modal dialog is visible, usable and above it.

**Updates after closing**

- A promise toast dismissed while loading stays closed.
- An update after a toast closed never brings it back.

**More pausing and keys**

- The window losing focus pauses timers, and getting it back resumes them.
- F6 does nothing while there are no toasts, so the browser keeps it.
- A toast on the top edge swipes up, and a swipe down snaps back.

Runs in React, Vue and web components.

Also tested:

**Enhancements**

- Update() says whether the toast was still there.
- A toast beyond maxVisible never expires unseen.
- There's no empty Notifications landmark.
- Focus never falls to the page when a toast focused by the mouse closes.
- A pending action shows it and holds the toast open until it settles.

**Pausing**

- A hidden page pauses timers.
- Pause reasons hold separately: getting the window back doesn't resume while focus is in the region.

**Announcements**

- The live regions exist before the first toast.
- A toast is announced politely, with its title and description.
- An error is announced assertively.
- Toasts that arrive together are announced together.
- The visible region isn't a live region, so nothing is read twice.

**The shortcut**

- F6 works from a text field and types nothing.
- A shortcut of null turns it off.
- Tab past the last toast goes back where F6 came from.

**Over modal dialogs**

- F6 reaches the toasts from inside a modal dialog, and goes back into it.
- Escape on a toast closes the toast, not the dialog beneath.
- A dialog opened after a toast doesn't cover it, and pressing it doesn't close the dialog.

**Swiping**

- Dragging across a toast's text with a mouse selects it instead of dismissing.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while reaching a toast with F6 and leaving it.

Runs in React, Vue and web components.
