<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.10, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Menu

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `open?` (`boolean`): Whether the menu is open. Pass it to control the menu.
- `defaultOpen?` (`boolean`): Whether the menu starts open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<MenuOpenChangeReason>) => void)`): Runs when the menu wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the menu has finished opening or closing, after any animation.
- `onPayloadChange?` (`((payload: unknown, details: ChangeDetails<MenuPayloadChangeReason>) => void)`): Runs when the payload the content shows changes: a trigger or context area with another payload opens the menu, or takes the open menu over, which fires no `onOpenChange`, and so does a controller's `open({ payload })` on the open menu. `details.cancel()` keeps the previous payload.
- `onAction?` (`((value: string, details: MenuActionDetails) => unknown)`): Runs for every plain item, including items in submenus, with the item's value. Return a Promise to mark the item pending until it settles: it gets `data-pending`, `aria-busy` and `aria-disabled`, the menu stays open, and choosing it again waits. It closes once the Promise resolves, and a rejection keeps it open with the reason in the item's `error` state until the next try.
- `pendingAnnouncement?` (`string`): What screen readers hear once an item has been pending for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `onCheckedChange?` (`((checked: boolean, details: MenuCheckedChangeDetails) => void)`): Runs when any checkbox item in the menu or its submenus toggles, with the item's value in `details.value`. Made for data menus.
- `onValueChange?` (`((value: string, details: MenuValueChangeDetails) => void)`): Runs when any radio group in the menu or its submenus changes, with the group in `details.group`. Made for data menus.
- `items?` (`MenuData`): The menu as data. Renders the content for you, unless you place a content part of your own, and runs the items' shortcuts.
- `itemShortcuts?` (`boolean`): Whether a data menu runs its items' shortcuts while closed.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first.
- `delay?` (`number`): Milliseconds the pointer rests on a submenu trigger before its submenu opens.
- `presentation?` (`PresentationSetting<"popover">`): How the menu presents. `"sheet"` slides it up from the bottom of the screen, where it can be swiped away and submenus open in its place, and `"auto"` does that on small touch screens. Decided each time it opens; the server renders `"popover"` for `"auto"`. A context menu and a menu in a menubar are always popovers.
- `controller?` (`MenuController`): Opens, closes and inspects the menu from anywhere, and connects triggers outside it. Create one with `createMenuController()`.
- `modal?` (`"pointer" | boolean`): `"pointer"`: an outside press only closes the menu. `true`: also locks scroll, traps focus and makes the rest of the page inert. `false`: outside presses reach what they hit.
- `dismissible?` (`boolean`): Whether Escape, an outside press, focus or the window leaving, Android's back gesture and a sheet's swipe can close it. Triggers, Close parts and the controller always can. Pass `false` while it holds unsaved work, and ask in `onDismissAttempt`.
- `onDismissAttempt?` (`function`): Runs when `dismissible` refused a dismissal made on purpose: Escape, an outside press, back or a swipe. Focus or the window leaving is refused without it. Ask "Discard changes?" here.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### MenuTrigger

A trigger outside the menu also takes `controller`.

- `disabled?` (`boolean`): Stops the trigger from opening the menu. A native button can't be focused or pressed, unless `focusableWhenDisabled` is set.
- `focusableWhenDisabled?` (`boolean`): Keeps a disabled trigger in the tab order with `aria-disabled` instead of the native attribute, so it can host a tooltip that says why. Presses still do nothing.
- `payload?` (`unknown`): Data for the content to render when this trigger opens the menu, like the row it belongs to.
- `shortcut?` (`string`): A keyboard shortcut that opens the menu from anywhere, like `"mod+j"`. `mod` is Command on Apple platforms and Control elsewhere. Sets `aria-keyshortcuts`.
- `controller?` (`PopupController<any, MenuOpenChangeReason, MenuOpenOptions, string, MenuPayloadChangeReason>`): Connects a trigger outside the menu, like one per table row, to the menu with this controller.

### MenuContextTrigger

- `disabled?` (`boolean`): Stops a right-click, a long press or Shift+F10 from opening the menu here. The browser's own menu shows instead.
- `payload?` (`unknown`): Data for the content to render when this area opens the menu, like the row it belongs to.
- `controller?` (`PopupController<any, MenuOpenChangeReason, MenuOpenOptions, string, MenuPayloadChangeReason>`): Connects an area outside the menu to the menu with this controller.

### MenuContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the trigger the menu opens on. Submenus open to the side, mirrored in right-to-left layouts.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the menu lines up with the trigger along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the trigger and the menu, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the trigger, in pixels. Submenus default to lining up their first item with the trigger.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `finalFocus?` (`PopupFocusTarget`): Where focus goes when the menu closes while focus is inside it. `"trigger"` returns it to the trigger and `"none"` leaves it. A CSS selector, an element or a function picks a specific element.
- `keepMounted?` (`boolean`): Whether the menu stays in the page, hidden, while closed. Its content keeps its state between opens.

### MenuItem

- `value?` (`string`): Passed to `onAction` when the item runs.
- `label?` (`string`): The text typeahead matches, when the content isn't plain text. It isn't the accessible name: use `aria-label` for that.
- `disabled?` (`boolean`): Keeps the item focusable but stops it from running, as the menu pattern asks. Sets `data-disabled` and `aria-disabled`.
- `destructive?` (`boolean`): Styles the item as dangerous, like Delete. Sets `data-destructive`.
- `shortcut?` (`string`): A keyboard shortcut like `"mod+n"`. Shows `⌘N` on Apple platforms and `Ctrl+N` elsewhere, and sets `aria-keyshortcuts`.
- `closeOnSelect?` (`boolean`): Whether running the item closes the menu.
- `onSelect?` (`((event: Event) => unknown)`): Runs when the item is selected, by pointer or keyboard, with the event that selected it, or a new `select` Event when no DOM event did. Call `event.preventDefault()` to keep the menu open and skip `onAction`. Return a Promise to mark the item pending until it settles, like `onAction`.

### MenuCheckboxItem

- `value` (`string`): Identifies the item, in the menu's `onCheckedChange`.
- `label?` (`string`): The text typeahead matches, when the content isn't plain text. It isn't the accessible name: use `aria-label` for that.
- `disabled?` (`boolean`): Keeps the item focusable but stops it from toggling, as the menu pattern asks.
- `checked?` (`boolean`): Whether the item is checked. Pass it to control the item.
- `defaultChecked?` (`boolean`): Whether the item starts checked, when uncontrolled.
- `onCheckedChange?` (`((checked: boolean, details: ChangeDetails<MenuCheckedChangeReason>) => void)`): Runs when the item wants to toggle. `details.reason` says why, and `details.cancel()` stops it.
- `closeOnSelect?` (`boolean`): Whether toggling closes the menu.

### MenuRadioGroup

- `value?` (`T | null`): The selected value. Pass it to control the group. `null` selects nothing.
- `defaultValue?` (`T | null`): The value selected at first, when uncontrolled.
- `onValueChange?` (`((value: T, details: ChangeDetails<MenuValueChangeReason>) => void)`): Runs when the selection wants to change. `details.reason` says why, and `details.cancel()` stops it.
- `name?` (`string`): Identifies the group in the menu's `onValueChange`. Defaults to a generated id.

### MenuRadioItem

- `value` (`string`): Selected in the group when the item is chosen.
- `label?` (`string`): The text typeahead matches, when the content isn't plain text. It isn't the accessible name: use `aria-label` for that.
- `disabled?` (`boolean`): Keeps the item focusable but stops it from being chosen, as the menu pattern asks.
- `closeOnSelect?` (`boolean`): Whether choosing the item closes the menu.

### MenuItemIndicator

- `keepMounted?` (`boolean`): Whether the indicator stays in the page while its item is unchecked, so it can be styled or animated in both states.

### MenuItemIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

### MenuSub

- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.
- `open?` (`boolean`): Whether the submenu is open. Pass it to control the submenu.
- `defaultOpen?` (`boolean`): Whether the submenu starts open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<MenuOpenChangeReason>) => void)`): Runs when the menu wants to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the menu has finished opening or closing, after any animation.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first.
- `delay?` (`number`): Milliseconds the pointer rests on a submenu trigger before its submenu opens.
- `controller?` (`MenuController`): Opens, closes and inspects the submenu. Create one with `createMenuController()`. Triggers outside the menu can't connect to it.

### MenuSubTrigger

- `disabled?` (`boolean`): Keeps the submenu trigger focusable but stops it from opening its submenu, as the menu pattern asks. Sets `data-disabled` and `aria-disabled`.

### MenuSubContent

It takes the same props as `MenuContent`.

### MenuGroup, MenuGroupLabel and MenuSeparator

These take no props of their own, only the props of the element they render.

### State

What render functions, state-based class names and slots receive, per part.

`MenuTrigger`, `MenuContextTrigger` and `MenuSubTrigger`:

- `open` (`boolean`): Whether the menu is open from this trigger.
- `disabled` (`boolean`): Whether the trigger's `disabled` prop is set, or the menubar it's in is disabled.

`MenuContent`:

- `open` (`boolean`): Whether the menu is open. False while it animates out.
- `nested` (`boolean`): Whether this is a submenu.
- `presentation` (`Presentation`): How the menu is shown.
- `payload` (`Payload | undefined`): The payload of the last open, from the trigger that opened it or a controller, typed as the controller's `Payload`.

`MenuItem`:

- `highlighted` (`boolean`): Whether the item has keyboard focus or is under the pointer.
- `disabled` (`boolean`): Whether the item can't be chosen.
- `pending` (`boolean`): Whether its `onSelect` or `onAction` Promise is running.
- `error` (`unknown`): Why its last action failed, until it runs again.

`MenuCheckboxItem` and `MenuRadioItem`:

- `highlighted` (`boolean`): Whether the item has keyboard focus or is under the pointer.
- `disabled` (`boolean`): Whether the item can't be chosen.
- `checked` (`boolean`): Whether the item is on: its `checked` prop when you pass one, otherwise `defaultChecked` until a press changes it.

`MenuRadioGroup`:

- `value` (`string | null`): The selected value, or null when nothing is selected.

`MenuItemIndicator`:

- `checked` (`boolean`): Whether its checkbox item is on, or its radio item is its group's value. While false, the indicator isn't shown unless `keepMounted` is set.
- `disabled` (`boolean`): Whether the item can't be chosen.

`MenuItemIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

### Reasons

`details.reason` says why the menu or a submenu opened or closed.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `trigger-hover` (`PointerEvent`): The pointer rested on a trigger, or left it, with hover opening.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `submenu-switch` (`KeyboardEvent | PointerEvent`): Another submenu in the same menu, or another menu in the same menubar, took over.
- `parent-close` (`none`): The parent layer closed.
- `trigger-release` (`PointerEvent`): A press-and-hold open was released outside the popup.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

For a payload change, it says what opened the menu or took it over.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `trigger-hover` (`PointerEvent`): The pointer rested on a trigger, or left it, with hover opening.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

With `dismissible` false, the refused dismissals `onDismissAttempt` reports:

- `outside-press` (`MouseEvent`): A press outside the layer.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

Checkbox items report why they toggled, in `onCheckedChange`:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

Radio groups report why their value changed, in `onValueChange`:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createMenuController<Payload>()` and pass it as `controller`, to the menu and to any
triggers outside it. `Payload` is the type of the data triggers and `open()` pass.

Every write method takes an optional `{ reason, event }`, passed to `onOpenChange`. `open()` also takes `focus`: `"first"`, `"last"`, `"popup"` or `"none"`.

- `isOpen()` (`() => boolean`): Whether it's open. False as soon as it starts closing, while it still animates out.
- `setOpen(open, options?)` (`(open: boolean, options?: PopupChangeOptions<MenuOpenChangeReason> | undefined) => boolean`): Opens or closes it. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (PopupChangeOptions<MenuPayloadChangeReason> & { payload?: Payload | undefined; anchor?: Anchor | undefined; signal?: AbortSignal | undefined; } & MenuOpenOptions) | undefined) => Promise<...>`): Opens it, and resolves once it closes, with why, how and any return value. Resolves exactly once and never rejects: on the next close from any source, when `signal` aborts, or with reason `"unmount"` when the component leaves the page.
- `close(options?)` (`(options?: (PopupChangeOptions<MenuOpenChangeReason> & { returnValue?: Result | undefined; }) | undefined) => boolean`): Closes it. `returnValue` is passed to the promise `open()` returned. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: PopupChangeOptions<MenuOpenChangeReason> | undefined) => boolean`): Opens it when it's closed, and closes it when it's open. Returns false when the change was canceled.
- `getPayload()` (`() => Payload | undefined`): The payload of the last open, from a controller or the trigger that opened it.
- `focus()` (`() => void`): Moves focus to the trigger that opened it last, or the first trigger.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On                 | Receives                                                                       |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `onOpenChange`         | `Menu`             | `(open, details)`: the new state, and the [reason](#reasons)                   |
| `onOpenChangeComplete` | `Menu`             | `(open)`, after the animation                                                  |
| `onPayloadChange`      | `Menu`             | `(payload, details)`: the content's new payload, and the [reason](#reasons)    |
| `onAction`             | `Menu`             | `(value, { event })` for every plain item, including items in submenus         |
| `onCheckedChange`      | `Menu`             | `(checked, details)`, with the item's value in `details.value`. For data menus |
| `onValueChange`        | `Menu`             | `(value, details)`, with the group's name in `details.group`. For data menus   |
| `onDismissAttempt`     | `Menu`             | `({ reason, event })`, when a dismissal was refused                            |
| `onSelect`             | `MenuItem`         | `(event)`, before the menu closes. `event.preventDefault()` keeps it open      |
| `onCheckedChange`      | `MenuCheckboxItem` | `(checked, details)`, before the menu's                                        |
| `onValueChange`        | `MenuRadioGroup`   | `(value, details)`, before the menu's                                          |

## Accessibility

The menu follows the [WAI-ARIA menu button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).

### Tested Behavior

Every line below is an automated test.

**Trigger**

- Advertises its menu and reflects the open state.
- Click opens the menu and moves focus into it.
- Click on the open trigger closes the menu.
- Enter opens the menu and focuses the first item.
- Space opens the menu and focuses the first item.
- ArrowDown opens the menu and focuses the first item.
- ArrowUp opens the menu and focuses the last item.
- A click on a trigger in a shadow root opens the menu, and it stays open. Vue and web components only.

**Keyboard navigation**

- ArrowDown and ArrowUp move between items, skipping separators and labels.
- Disabled items are focusable.
- Focus wraps at both ends.
- Home and End move to the first and last items.
- Typing a character moves to the next item that starts with it.
- Typing several characters quickly matches the whole prefix.

**Activation**

- Enter on an item runs it, closes the menu and returns focus.
- Clicking an item runs it and closes the menu.
- Disabled items do nothing.
- Checkbox items toggle and keep the menu open.
- Radio items select one value and keep the menu open.
- Hovering an item highlights it.

**Dismissal**

- Escape closes the menu and returns focus to the trigger.
- Clicking outside closes the menu.
- Escape while an input method is composing text leaves the menu open.
- Pressing a scrollbar outside the menu leaves it open.
- Tab closes the menu.

**Submenu**

- The submenu trigger advertises its menu.
- ArrowRight opens the submenu and focuses its first item.
- Enter opens the submenu and focuses its first item.
- Space opens the submenu and focuses its first item.
- ArrowLeft closes the submenu and returns focus to its trigger.
- Nested submenus open and run their items.
- Submenu keyboard navigation stays inside the submenu.
- Keys pressed in quick succession are never lost.
- Clicking outside closes every menu.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while using the menu with a keyboard.
- Item shortcuts are announced.

Runs in React, Vue and web components.
