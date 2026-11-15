<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props. Headers, triggers and panels take their item's
value from the item.

### Accordion

- `value?` (`T[]`): The open items' values. Pass it to control the accordion.
- `defaultValue?` (`T[]`): The items open at first, when uncontrolled.
- `onValueChange?` (`((value: T[], details: ChangeDetails<AccordionValueChangeReason>) => void)`): Runs when items want to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `multiple?` (`boolean`): Whether several items can be open at once. Otherwise opening one closes the others.
- `collapsible?` (`boolean`): Whether the open item can close when only one may be open. With `false`, one item always stays open and its trigger reports it can't be pressed.
- `disabled?` (`boolean`): Stops every item from opening or closing. Triggers stay focusable.
- `keepMounted?` (`boolean`): Whether closed panels stay in the page, hidden.
- `hiddenUntilFound?` (`boolean`): Keeps closed panels in the page as `hidden="until-found"`, so the browser's find in page can match their text and open them.
- `controller?` (`object`): Opens and closes items from anywhere. Create one with `createAccordionController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### AccordionItem

- `disabled?` (`boolean`): Stops the item from opening or closing. Its trigger stays focusable.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<AccordionValueChangeReason>) => void)`): Runs before the item opens or closes, before the accordion's `onValueChange`. `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the item's panel has finished opening or closing, after any animation.
- `value?` (`T`): Identifies the item. The accordion's value lists the open items' values. Defaults to a generated id.

### AccordionHeader

The header takes no options of its own, only the props of the element it renders.

### AccordionTrigger

- `disabled?` (`boolean`): Stops this trigger from opening or closing the item. It stays focusable.

### AccordionPanel

- `keepMounted?` (`boolean`): Whether the panel stays in the page, hidden, while closed. Overrides the accordion's.
- `hiddenUntilFound?` (`boolean`): Whether the panel stays findable with `hidden="until-found"` while closed. Overrides the accordion's.
### State

What render functions, state-based class names and slots receive, per part.

`Accordion`:

- `value` (`T[]`): The open items' values.
- `disabled` (`boolean`): Whether the whole accordion is disabled, by its `disabled` option or a disabled fieldset around it.
- `multiple` (`boolean`): Whether several items can be open at once.

`AccordionItem`, `AccordionHeader`, `AccordionTrigger` and `AccordionPanel`:

- `open` (`boolean`): Whether the accordion's `value` holds this item's value.
- `disabled` (`boolean`): Whether the item can't open or close.
- `index` (`number`): The item's position among the accordion's items, from 0. -1 until it's in the page.

### Reasons

`details.reason` says why items opened or closed, for `onValueChange` and every item's `onOpenChange`.

- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `find-in-page` (`Event`): The browser's find in page matched hidden content.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createAccordionController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs the item and accordion callbacks like a press, and returns `false` when the change is canceled or does nothing.

- `getValue()` (`() => T[]`): The open items' values.
- `setValue(value, options?)` (`(value: T[], options?: AccordionChangeOptions | undefined) => boolean`): Sets the open items. Only the first counts unless `multiple` is set. Returns false when canceled.
- `isOpen(value)` (`(value: T) => boolean`): Whether an item is open.
- `open(value, options?)` (`(value: T, options?: AccordionChangeOptions | undefined) => boolean`): Opens an item. With one item open at a time, closes the others.
- `close(value, options?)` (`(value: T, options?: AccordionChangeOptions | undefined) => boolean`): Closes an item, unless it's the one item that must stay open.
- `toggle(value, options?)` (`(value: T, options?: AccordionChangeOptions | undefined) => boolean`): Opens a closed item, or closes an open one.
- `openAll(options?)` (`(options?: AccordionChangeOptions | undefined) => boolean`): Opens every enabled item. Only when `multiple` is set.
- `closeAll(options?)` (`(options?: AccordionChangeOptions | undefined) => boolean`): Closes every item that may close.
- `focus(value?)` (`(value?: T | undefined) => void`): Moves focus to an item's trigger, or the first trigger.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On              | Receives                                                       |
| ---------------------- | --------------- | -------------------------------------------------------------- |
| `onValueChange`        | `Accordion`     | `(value, details)`: the open items, and the [reason](#reasons) |
| `onOpenChange`         | `AccordionItem` | `(open, details)`, before `onValueChange`                      |
| `onOpenChangeComplete` | `AccordionItem` | `(open)`, after the panel's animation                          |

## Accessibility

The accordion follows the [WAI-ARIA accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/). Every line below is an automated test.

**Expanding and collapsing**

- The default item is expanded and shows its panel.
- Clicking a collapsed trigger expands it and collapses the open one.
- Clicking an expanded trigger collapses it.
- Clicking a disabled trigger does nothing.
- A change can be canceled.
- Without a default value, every item starts collapsed.
- A default value can expand several items.

**Multiple**

- Items expand and collapse independently.
- Every item can be expanded at once.

**Disabled**

- A disabled item's trigger is marked disabled and stays focusable.
- A disabled accordion disables every trigger.

**Keyboard**

- Tab moves through every trigger in order, disabled ones included.
- Enter toggles the focused trigger's panel.
- Space toggles the focused trigger's panel.
- Enter on a disabled trigger does nothing.
- Tab moves from an expanded trigger into its panel.
- Keys pressed in quick succession are never lost.
- Arrow keys leave focus where it is.

**Structure**

- Each trigger sits in a heading.
- The trigger controls its panel, and the panel is labelled by its trigger.

**Mounting**

- Collapsed panels leave the page by default.
- With keepMounted, collapsed panels stay in the page, hidden.
- With keepMounted, a class that sets display doesn't show collapsed panels.
- With hiddenUntilFound, collapsed panels stay findable.
- Finding text in a collapsed panel expands it.
- Following a link into a collapsed panel expands it.
- The browser's own find expands a collapsed panel.

Runs in React, Vue and web components.

Beyond the pattern's baseline:

**Enhancements**

- With collapsible off, the open trigger is marked disabled and stays open.
- Closing a panel that holds focus moves focus to its trigger.
- A canceled find in page keeps the panel hidden until found.
- An infinite exit animation still unmounts the panel.
- A controller expands and collapses items from anywhere.
- An item's onOpenChangeComplete runs once its panel has finished animating.
- Find in page opens a panel at once, without an animation.

Runs in React, Vue and web components.

Every panel is a region labelled by its trigger, so screen readers can list open panels as landmarks. With many panels open at once, such as `multiple` with Expand all, keep the number of items modest so that list stays short.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while using the accordion with a keyboard.

Runs in React, Vue and web components.
