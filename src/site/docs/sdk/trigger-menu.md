<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### TriggerMenu

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `triggers` (`TriggerDefinition<T>[]`): The texts that open the menu, and what each one lists.
- `editor?` (`TextEditorAdapter`): The editor the menu reads and writes, for editors without a part of their own, like Tiptap. TriggerMenuInput and a surrounding TokenInput set it for you.
- `open?` (`boolean`): Whether the menu is open. Pass it to control it; it shows only while there's a match.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<TriggerMenuOpenChangeReason> & { trigger: string | null; }) => void)`): Runs when the menu wants to open or close. `details.reason` says why, `details.trigger` which trigger, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the menu has finished opening or closing, after any animation.
- `onQueryChange?` (`((query: string, details: ChangeDetails<TriggerMenuQueryChangeReason> & { trigger: string; argument?: string; }) => void)`): Runs when the text after the trigger changes. Read-only: it's the editor's text. `details.argument` names the argument being typed.
- `onSelect?` (`((value: T, details: TriggerMenuSelectDetails<T>) => void | Promise<void | Partial<TokenInsert>>)`): Runs when an item, with every required argument, is chosen. The default insertion follows unless `details.preventDefault()`. Return a Promise and a token is inserted at once as pending, updated with what it resolves to and removed if it rejects; the menu closes either way.
- `pendingAnnouncement?` (`string`): What screen readers hear once an `onSelect` Promise has been pending for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `status?` (`AsyncOptionsStatus`): Whether items that come from outside are loading or failed, for the status and empty parts. Loaders report their own.
- `autoHighlight?` (`boolean`): Whether the first match is highlighted so Enter and Tab choose it. Visual only: screen readers hear about it once an arrow key moves the highlight, so typed characters keep being echoed.
- `loop?` (`boolean`): Whether arrow keys wrap from the last item to the first.
- `shortcut?` (`string`): Reopens a match dismissed with Escape, with the caret in it.
- `controller?` (`object`): Opens, closes and inserts from anywhere. Create one with `createTriggerMenuController()`.
- `dismissible?` (`boolean`): Whether Escape, an outside press, focus or the window leaving, Android's back gesture and a sheet's swipe can close it. Triggers, Close parts and the controller always can. Pass `false` while it holds unsaved work, and ask in `onDismissAttempt`.
- `onDismissAttempt?` (`((details: { reason: "escape-key"; event?: KeyboardEvent | undefined; } | { reason: "outside-press"; event?: MouseEvent | undefined; }) => void)`): Runs when `dismissible` refused a dismissal made on purpose: Escape, an outside press, back or a swipe. Focus or the window leaving is refused without it. Ask "Discard changes?" here.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### Triggers

- `char` (`string`): The text that starts a match: `"@"`, `"/"`, `"#"`, or several characters like `"[["`.
- `boundary?` (`TriggerBoundary`): Where a match may start.
- `spaces?` (`number | boolean`): Whether the query may contain spaces, or up to how many words, like `@next Wednesday`.
- `pattern?` (`RegExp`): Characters a query may contain, tested one at a time.
- `maxLength?` (`number`): The longest query before the match ends.
- `type?` (`string`): The kind of token choosing an item inserts, where the editor takes tokens.
- `items?` (`TriggerItemsLoader<T> | TriggerMenuData<T>`): Suggestions as data, or a loader given the query and an AbortSignal. Without them, the composed items show.
- `filter?` (`ListFilter<T>`): How typing narrows data items. Loaded items aren't filtered.
- `insert?` (`((item: TriggerMenuDataItem<T>, details: { match: TriggerMatch; arguments: Record<string, string>; }) => string | TokenInsert)`): What replaces the trigger and query. Defaults to a token where the editor takes tokens, else the trigger, the label and a space.

### Items as Data

- `value` (`T`): Identifies the item, and is what choosing it reports. A string, or any value with `itemToValue`.
- `label` (`string`): The text shown and matched by typeahead and filtering. A select's trigger shows it once chosen.
- `keywords?` (`string[]`): More words filtering matches, like `["team"]` for a plan called Pro.
- `disabled?` (`boolean`): Keeps the item from being chosen. The keyboard skips it, like in a native select.
- `after?` (`TriggerAfter`): After choosing it: `"compose"` closes the menu, `"continue"` keeps it open and lists the same trigger's items for the text typed after it, and `"submit"` asks the editor to send. Tab never submits.
- `arguments?` (`TriggerArgument[]`): Typed arguments asked for in order once it's chosen, like `/model <name>`.

### Arguments

- `name` (`string`): The name it's reported under in `details.arguments`.
- `hint?` (`string`): Ghost text shown at the caret until it's typed. Defaults to `<name>`.
- `required?` (`boolean`): Whether Enter can finish the command without it.
- `items?` (`TriggerItemsLoader<string> | TriggerMenuData<string>`): Suggestions for it, as data or a loader. Without them, it's free text and no list shows.
- `allowCustomValue?` (`boolean`): Whether text that matches no suggestion is accepted, like a combobox's custom value.

### TriggerMenuInput

The field the menu suggests into. Renders a `textarea`, or an `input` through `render`.

### TriggerMenuStatus

A polite status that says the count and the keys once typing pauses. Pass a function as children to say something else. Renders a `div`.

### TriggerMenuContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the trigger the list opens on.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the list lines up with the trigger along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the line of text and the list, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the text, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `keepMounted?` (`boolean`): Whether the list stays in the page, hidden, while closed.

### TriggerMenuEmpty

Shown while no item matches. Rendering it keeps the menu open with no matches; without it, the menu closes until something matches. Renders a `div`.

### TriggerMenuList

The listbox. Without children, it renders the current trigger's items. Renders a `div`.

### TriggerMenuItem

- `value` (`T`): What `onSelect` receives when the item is chosen.
- `label?` (`string`): The text inserted and matched, when the content isn't plain text.
- `keywords?` (`string[]`): More words filtering matches.
- `disabled?` (`boolean`): Keeps the item from being chosen. It can still be highlighted, as the listbox pattern asks.
- `onSelect?` (`((value: T, details: TriggerMenuSelectDetails<T>) => void | Promise<void | Partial<TokenInsert>>)`): Runs before the menu's `onSelect`. `details.preventDefault()` skips the default insertion.

### TriggerMenuItemIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

### TriggerMenuGroup and TriggerMenuGroupLabel

A group of items, named by its label. Each renders a `div`.

### TriggerMenuSeparator

A line between items or groups, hidden from screen readers. Renders a `div`.

### TriggerMenuHint

Ghost text at the caret for the arguments still to type, like `<status>`. Renders a `span`, hidden from screen readers.

### State

What render functions and state-based class names receive, per part.

`TriggerMenuInput`:

- `open` (`boolean`): Whether the menu is open. It opens on a typed trigger, and closes when nothing matches unless it's loading or renders an empty part.
- `trigger` (`string | null`): The trigger of the current match, like `"@"`, or null.

`TriggerMenuContent` and `TriggerMenuList`:

- `open` (`boolean`): Whether the menu is open. False while it animates out.
- `trigger` (`string | null`): The trigger of the current match, like `"@"`, or null.
- `query` (`string`): The text after the trigger, or after the current argument's start.
- `argument` (`string | null`): The argument being typed, by name, or null at the first level.
- `status` (`AsyncOptionsStatus`): Whether items are loading or failed.
- `items` (`TriggerMenuData<unknown>`): The visible data items, for rendering them yourself.

`TriggerMenuItem`:

- `highlighted` (`boolean`): Whether the item is highlighted, by the keyboard or the pointer.
- `disabled` (`boolean`): Whether the item can't be chosen.

`TriggerMenuItemIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

`TriggerMenuEmpty`:

- `loading` (`boolean`): Whether items are loading.
- `empty` (`boolean`): Whether no item matches.
- `query` (`string`): The text after the trigger.

`TriggerMenuStatus`:

- `open` (`boolean`): Whether the menu is open. It opens on a typed trigger, and closes when nothing matches unless it's loading or renders an empty part.
- `status` (`AsyncOptionsStatus`): Whether items are loading or failed.
- `loading` (`boolean`): Whether items are loading.
- `count` (`number`): How many items match.
- `argument` (`string | null`): The argument being typed, by name, or null.

`TriggerMenuHint`:

- `argument` (`string | null`): The argument being typed, by name, or null.
- `hint` (`string`): The ghost text: the hints of the arguments still to type.

### Reasons

`details.reason` says why the menu opened or closed.

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `caret-move` (`Event | KeyboardEvent | PointerEvent`): The caret left a trigger menu's match: an arrow key, Home or End, a click, or a selection change.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.

With `dismissible` false, the refused dismissals `onDismissAttempt` reports:

- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `outside-press` (`MouseEvent`): A press outside the layer.

Why the query changed:

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createTriggerMenuController()` and pass it as `controller`.

- `isOpen()` (`() => boolean`): Whether the menu is open.
- `setOpen(open, options?)` (`(open: boolean, options?: TriggerMenuChangeOptions<TriggerMenuOpenChangeReason> | undefined) => boolean`): Opens or closes the menu. Opening needs a match; see `open()` for one that types the trigger. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (TriggerMenuChangeOptions<TriggerMenuOpenChangeReason> & { trigger?: string | undefined; signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens the menu for `trigger`, typing it at the caret first unless a match for it is already there, and resolves once it closes. Resolves exactly once and never rejects.
- `close(options?)` (`(options?: TriggerMenuChangeOptions<TriggerMenuOpenChangeReason> | undefined) => boolean`): Closes the menu. The match isn't dismissed, so typing in it opens it again. Returns false when the close was canceled or it was already closed.
- `getQuery()` (`() => string`): The text after the trigger, or after the current argument's start. Empty while closed.
- `getMatch()` (`() => TriggerMatch | null`): The current match, or null.
- `insert(content)` (`(content: string | Token) => void`): Replaces the current match with text or a token, or inserts at the caret without one.
- `focus()` (`() => void`): Moves focus to the editor.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On                               | Receives                                                                         |
| ---------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `onOpenChange`         | `TriggerMenu`                    | `(open, details)`: the new state, the [reason](#reasons) and the `trigger`       |
| `onOpenChangeComplete` | `TriggerMenu`                    | `(open)`, after the animation                                                    |
| `onQueryChange`        | `TriggerMenu`                    | `(query, details)`: the text after the trigger, and the `argument` being typed   |
| `onDismissAttempt`     | `TriggerMenu`                    | `({ reason, event })`, when a dismissal was refused                              |
| `onSelect`             | `TriggerMenu`, `TriggerMenuItem` | `(value, details)`: the item, its `arguments`, `insert()` and `preventDefault()` |

When `onSelect` returns a Promise and the editor takes tokens, the token is inserted at once with `data-pending`, updated with what the Promise resolves to, and removed if it rejects. The menu closes either way, so people keep typing.

## Accessibility

Focus stays in the field while the arrow keys move the highlight. A `<textarea>` stays a textbox, the only role ARIA allows it, and points at the list with `aria-controls` and, after an arrow key, `aria-activedescendant`. An `<input>` is a combobox with `aria-expanded`. Counts and loading are said through `TriggerMenuStatus`, a polite status, never through the field, so render one: visually hidden, as in the demo, or at the top of the list, as in [Loading Items](#loading-items). Give the field a visible label through a [Field](/docs/components/field), or an `aria-label`.

### Keyboard

| Key                  | Does                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| ArrowDown, ArrowUp   | Moves the highlight while the list is open; the caret stays in the field                          |
| Enter                | Chooses the highlighted item. In a command's arguments, finishes once only optional ones are left |
| Tab                  | Chooses the highlighted item, or accepts an argument and moves to the next                        |
| Escape               | Closes the list and dismisses the match, so typing on doesn't reopen it                           |
| Control+Space        | Reopens a dismissed match with the caret in it; `shortcut` changes the key                        |
| Backspace            | Past an argument's start, goes back to the previous argument                                      |
| Command+Z, Control+Z | Undoes the insertion and brings back the query                                                    |

### Tested Behavior

Every line below is an automated test.

**Opening**

- Typing a trigger opens the list with every item.
- Typing after the trigger filters the list.
- Text an input method commits filters the list.
- Queries match Unicode letters and ignore accents.
- A trigger mid-word doesn't open.
- A trigger followed by a space doesn't open.
- A command trigger opens only at the start, so a leading space escapes it.
- The list opens at the trigger and stays there as the query grows.
- Pasting a trigger opens the list.
- Focusing a field that already has a match doesn't open the list.
- Moving the caret into a match doesn't open the list.
- A query that matches nothing closes the list, and Backspace that matches again opens it.
- With an empty part, a query that matches nothing keeps the list open with the message.

**Choosing**

- The first match is highlighted, and Enter inserts it with a space.
- Tab accepts the highlighted suggestion and focus stays in the field.
- Arrow keys move the highlight, and wrap.
- A disabled item can be highlighted but not chosen.
- Clicking an item inserts it and keeps focus and the caret in the field.
- Text after the caret stays where it was.

**Dismissing**

- Escape closes the list, keeps the text and focus.
- A dismissed match stays closed through caret moves, typing in it and clicks.
- A new trigger after a dismissed one opens.
- Deleting and retyping the trigger opens it again.
- Ctrl+Space reopens a dismissed match.
- Moving the caret out of the match closes the list.
- Pressing outside closes the list.

**Arguments**

- A command with arguments asks for each one, and Enter finishes with them.
- Enter finishes once only optional arguments are left.
- A free-text argument shows no list, and Enter takes the typed text.
- Backspace past an argument's start goes back a level.
- Escape in an argument keeps the inserted text.
- An item that submits sends the form once inserted.

**Loading**

- Items load for the query.
- A newer query aborts the older load, and only its results land.

**Undo**

- Undo after choosing brings the query back, never a dead undo.

**Input**

- The SDK's Textarea works as the field, and undo still works.
- An <input> field works the same.

Runs in React, Vue and web components.

- No axe violations while closed.
- No axe violations while open with an item highlighted.
- No axe violations while open on an input.
- No axe violations with nothing found.
- A textarea stays a textbox, without aria-expanded, and controls the list while open.
- An input is a combobox that says whether it's expanded.
- Aria-activedescendant waits for an arrow key and clears on the next edit.
- Two menus on a page have their own ids, and the role never changes.
- Options are named by their text.
- The status says the count and the keys once typing pauses, then that nothing matches.
- The hint is hidden from assistive technology, and the status names the argument.
- Accessibility tree.

Runs in React, Vue and web components.
