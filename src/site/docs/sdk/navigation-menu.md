<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.5, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### NavigationMenu

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `value?` (`T | null`): The open item's value. Pass it to control the menu. `null` closes every panel.
- `defaultValue?` (`T | null`): The item open at first, when uncontrolled.
- `onValueChange?` (`((value: T | null, details: ChangeDetails<NavigationMenuValueChangeReason>) => void)`): Runs when an item wants to open or the open one to close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the menu has finished opening or closing, after any animation. Switching items doesn't count.
- `delay?` (`number`): Milliseconds the pointer rests on a trigger before its panel opens. Moving to another trigger while one is open switches at once.
- `closeDelay?` (`number`): Milliseconds before the open panel closes once the pointer leaves its trigger and the panel.
- `openOnHover?` (`boolean`): Whether resting the pointer on a trigger opens its panel. Pressing a trigger always does, so `false` makes a click-only menu.
- `closeOnSelect?` (`boolean`): Whether pressing a link closes the menu, like after a client-side route change. A link's own `closeOnSelect` wins. A press with a modifier key, which opens a new tab, never closes it.
- `orientation?` (`NavigationMenuOrientation`): Which arrow keys move between the top-level items, and the side panels open on: below a horizontal menu, beside a vertical one.
- `controller?` (`object`): Opens and closes panels from anywhere. Create one with `createNavigationMenuController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### NavigationMenuItem

- `value?` (`string`): Identifies the item, for `value` and `onValueChange`. Generated when left out.

### NavigationMenuTrigger

- `disabled?` (`boolean`): Stops the trigger from opening its panel. A native button can't be focused or pressed.

### NavigationMenuContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the trigger it opens on: below a horizontal menu, at the inline end of a vertical one.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How it lines up with the trigger along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the trigger and it, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the trigger, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `keepMounted?` (`boolean`): Whether the content stays in the page, hidden, while its item is closed, so crawlers and the server's HTML have it. Closed content stays in its item; it moves into the viewport when it opens.
- `hiddenUntilFound?` (`boolean`): Whether closed content stays findable with `hidden="until-found"`, so find in page opens its item. Implies `keepMounted`.

### NavigationMenuLink

- `current?` (`boolean`): Whether the link is the current page. Sets `aria-current="page"` and `data-current`.
- `closeOnSelect?` (`boolean`): Whether pressing the link closes the menu. Overrides the menu's `closeOnSelect`.

### NavigationMenuLinkIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

### NavigationMenuViewport

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the trigger it opens on: below a horizontal menu, at the inline end of a vertical one.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How it lines up with the trigger along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the trigger and it, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the trigger, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.

`NavigationMenuList` takes no props of its own.

### NavigationMenuIndicator

The indicator takes no props of its own.

### State

What render functions, state-based class names and slots receive, per part.

`NavigationMenu`:

- `value` (`T | null`): The open item's value, or null.
- `open` (`boolean`): Whether a panel is open.
- `orientation` (`NavigationMenuOrientation`): The menu's `orientation` option, or `"horizontal"` when it's unset or invalid.
- `nested` (`boolean`): Whether the menu sits inside another one's content.

`NavigationMenuList`:

- `open` (`boolean`): Whether a panel is open.
- `orientation` (`NavigationMenuOrientation`): The menu's `orientation` option, or `"horizontal"` when it's unset or invalid.

`NavigationMenuItem`:

- `open` (`boolean`): Whether this item's panel is open.

`NavigationMenuTrigger`:

- `open` (`boolean`): Whether this trigger's panel is open.
- `disabled` (`boolean`): Set by the trigger's `disabled` prop, which stops it opening its panel.

`NavigationMenuContent`:

- `open` (`boolean`): Whether this content's item is open. False while it animates out.
- `motion` (`NavigationMenuMotion | null`): Which way it moves when another item takes over or gives way, or null when the menu opened or closed as a whole.
- `orientation` (`NavigationMenuOrientation`): The menu's `orientation` option, or `"horizontal"` when it's unset or invalid.

`NavigationMenuLink`:

- `current` (`boolean`): Whether the link is the current page.

`NavigationMenuLinkIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

`NavigationMenuViewport`:

- `open` (`boolean`): Whether a panel is open. False while it animates out.
- `orientation` (`NavigationMenuOrientation`): The menu's `orientation` option, or `"horizontal"` when it's unset or invalid.

`NavigationMenuIndicator`:

- `open` (`boolean`): Whether a panel is open.
- `orientation` (`NavigationMenuOrientation`): The menu's `orientation` option, or `"horizontal"` when it's unset or invalid.

### Reasons

`details.reason` says why an item opened or closed.

- `trigger-hover` (`PointerEvent`): The pointer rested on a trigger, or left it, with hover opening.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `link-press` (`MouseEvent | KeyboardEvent`): A link was pressed, which closes the navigation menu it is in, like after a route change.
- `find-in-page` (`Event`): The browser's find in page matched hidden content.
- `parent-close` (`none`): The parent layer closed.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createNavigationMenuController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, passed to `onValueChange`.

- `getValue()` (`() => T | null`): The open item's value, or null when every panel is closed.
- `setValue(value, options?)` (`(value: T | null, options?: NavigationMenuChangeOptions | undefined) => boolean`): Opens an item's panel, or closes the open one with `null`. Returns false when canceled.
- `isOpen()` (`() => boolean`): Whether a panel is open.
- `close(options?)` (`(options?: NavigationMenuChangeOptions | undefined) => boolean`): Closes the open panel. Returns false when canceled or already closed.
- `focus(value?)` (`(value?: T | undefined) => void`): Moves focus to an item's trigger: the open one, or the first one, without a value.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On               | Receives                                                      |
| ---------------------- | ---------------- | ------------------------------------------------------------- |
| `onValueChange`        | `NavigationMenu` | `(value, details)`: the open item, and the [reason](#reasons) |
| `onOpenChangeComplete` | `NavigationMenu` | `(open)`, after the animation                                 |

## Accessibility

The menu follows the [disclosure navigation pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/): a landmark with a list of buttons that show and hide groups of links.

### Keyboard

Tab moves through the triggers and top-level links in order, like any links on a page. Enter or Space on a trigger opens its panel and leaves focus on the trigger, and Tab from an open trigger moves into its panel, wherever the panel renders. Tab past the panel's last link moves on to the next item, and Shift+Tab from its first link returns to the trigger. Escape closes the panel and returns focus to its trigger, and focus leaving the navigation closes it.

The arrow keys add to Tab, as the pattern allows: Left and Right move between the top-level items (Up and Down in a vertical menu), Home and End go to the first and last, Down (the inline end in a vertical menu) opens a trigger's panel and moves into it, and in a panel Up and Down, or Left and Right, move between the links and Home and End go to the first and last. Nothing wraps, and keys pressed with a modifier, like Alt+Left for Back, are left to the browser.

Touch screens have no hover: a tap on a trigger opens its panel and another tap closes it.

### Tested Behavior

Every line below is an automated test.

**Pointer**

- Resting the pointer on a trigger opens its panel.
- The panel waits for its delay before opening.
- Moving to another trigger while a panel is open switches at once.
- Crossing another trigger on the way to the open panel keeps the panel.
- Resting on another trigger on the way to the open panel switches to it.
- Moving the pointer away closes the panel after its close delay.
- Moving the pointer into the panel keeps it open.
- Opening on hover leaves focus where it was.
- Clicking a trigger opens its panel, and clicking it again closes it.
- Clicking a trigger the pointer just opened keeps it open.
- A press outside closes the panel.
- A tap opens a panel and another tap closes it.
- Escape closes a panel the pointer opened, which stays closed while the pointer rests.
- Sweeping across every trigger leaves the menu working.

**Keyboard**

- Tab moves through the triggers and links in order while closed.
- Enter opens a panel and leaves focus on its trigger.
- Space toggles a panel.
- Enter on another trigger switches panels.
- Tab from an open trigger moves into its panel.
- Tab past the panel's last link moves on to the next trigger.
- Shift+Tab from the panel's first link returns to its trigger.
- Shift+Tab from the item after an open panel goes back into the panel.
- Escape inside a panel closes it and returns focus to its trigger.
- Escape on an open trigger closes its panel.
- Focus leaving the navigation closes the panel.
- Right and Left arrows move between the top-level items.
- Arrows stop at the first and last items.
- ArrowDown on a trigger opens its panel.
- Down and Up arrows move between the links in a panel.
- An editable element in a panel keeps Down, and a tab stop that isn't editable passes it on.
- A vertical menu moves between items with Down and Up.

**Links**

- A link in a panel follows its href and closes the menu.
- Enter on a link follows it.
- A link with closing turned off leaves the menu open.
- The current page's link says so.

**Viewport**

- The viewport opens below the open trigger, lined up with its start.
- The viewport takes the open panel's size.
- The viewport moves to the newly open trigger.

**Kept content**

- Closed content kept mounted stays in the page, hidden.
- The viewport follows the open panel when its size changes.

**Animation**

- The viewport and its content animate in from their starting style.
- The viewport stays in the page while it animates out.
- A menu opening from closed has no motion.
- With reduced motion, panels switch and close without waiting.
- The viewport appears in place, without sliding in from the corner.
- Exit keyframes keyed on data-closed play on the content that gave way.
- The content that gave way animates out while the next one comes in.

**Reasons**

- Changes report why the menu opened, switched and closed.

**Nested**

- A menu inside a panel opens its own panel.
- A link in a nested panel closes every menu.

Runs in React, Vue and web components.

Beyond the pattern's baseline:

**Keyboard**

- ArrowDown on a trigger opens its panel and moves focus to its first link.
- ArrowDown on an open trigger moves into its panel.
- Home and End move to the first and last top-level items.
- The same keys pressed without waiting still land.

**Pointer**

- With hover opening off, resting the pointer opens nothing and a click still does.
- A click long after the pointer opened a panel still keeps it open.
- An outside press reports itself, not a focus change.
- The panel stays open while focus is in it, even when the pointer leaves.

**Links**

- A link pressed with a modifier key, which opens a new tab, leaves the menu open.

**Without a viewport**

- Each panel opens as its own popup below its trigger.
- Panels switch, close on Escape and return focus like with one.

**Motion**

- Content coming from a later item enters from the end, and the one it replaced leaves toward the start.
- Content coming from an earlier item enters from the start.

**Indicator**

- The indicator rests on the current page's link while closed.
- The indicator moves under the open trigger.
- The indicator follows an item added later as it grows. Web components only.

**Find in page**

- Find in page opens the item whose closed panel matched.

**Nested**

- A nested menu adds no second navigation landmark.
- Escape closes only the nested panel, then the outer one.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while opening a panel and tabbing through it.

Runs in React, Vue and web components.
