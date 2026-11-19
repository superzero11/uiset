<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.13, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Command

- `value?` (`string | null`): The highlighted command's value. Pass it to control the highlight. `null` highlights nothing.
- `defaultValue?` (`string | null`): The command highlighted at first, when uncontrolled. Without it, the first command is, with `autoHighlight`.
- `onValueChange?` (`((value: string | null, details: CommandValueChangeDetails) => void)`): Runs when the highlight moves: arrow keys, the pointer, typing, a page change or a controller. `details.index` says where the command is, for virtualized lists.
- `query?` (`string`): The search text, which filters the commands. Pass it to control it.
- `defaultQuery?` (`string`): The search text at first, when uncontrolled.
- `onQueryChange?` (`((query: string, details: ChangeDetails<CommandQueryChangeReason>) => void)`): Runs when the search text wants to change: typing, opening a page, going back, or a controller.
- `pages?` (`string[]`): The stack of open pages, from the first page opened to the current one. Pass it to control it.
- `defaultPages?` (`string[]`): The pages open at first, when uncontrolled.
- `onPagesChange?` (`((pages: string[], details: ChangeDetails<CommandPagesChangeReason>) => void)`): Runs when a page opens or Backspace or Escape goes back.
- `onAction?` (`((value: string, details: CommandActionDetails) => unknown)`): Runs when a command runs, with its value: Enter, a click, or its shortcut. Return a Promise to mark the command pending until it settles: it gets `data-pending`, `aria-busy` and `aria-disabled`, and running it again waits. A rejection puts the reason in its `error` state until the next run.
- `pendingAnnouncement?` (`string`): What screen readers hear once a command has been pending for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `items?` (`CommandData`): The commands as data. Renders them for you, ranked as the user types, with pages for commands that have `items`.
- `emptyItems?` (`CommandData`): Commands shown instead of `items` on the first page while the search is empty, like recent or suggested ones. Groups work, like `{ type: "group", label: "Suggestions", items }`. Needs `items`.
- `filter?` (`SearchFilter<string>`): How typing narrows the list: `"fuzzy"` keeps commands with the text's letters in order, best matches first; `"contains"` and `"startsWith"` match the text itself. A function returns a score (0 hides) or a boolean. `false` keeps every command, for results a server already filtered. Composed commands keep their order, and data commands are ranked by score.
- `autoHighlight?` (`boolean`): Whether the first command is highlighted while nothing else is, and the best match as the user types, so Enter runs it.
- `loop?` (`boolean`): Whether arrow keys wrap from the last command to the first.
- `status?` (`AsyncOptionsStatus`): Whether results are loading or failed, for the empty and status parts. Sets `aria-busy` on the list while loading.
- `onLoadMore?` (`(() => void)`): Runs when the highlight or scrolling reaches the last command, so the next page can load, like `createAsyncOptions`'s `loadMore`. Not again for the same commands, unless the last load failed.
- `announcement?` (`((change: ListAnnouncement) => string | null | undefined)`): What screen readers hear after typing pauses, when no `CommandStatus` is rendered. Return null for nothing.
- `controller?` (`object`): Reads and drives the list from anywhere. Create one with `createCommandController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### CommandInput

The search field. Renders an `input` with the combobox role.

### CommandStatus

Describes loading and failures. Renders a `div` with the status role.

### CommandEmpty

Shows while no command matches. Renders a `div`.

### CommandList

Holds the commands. Renders a `div` with the listbox role, always shown.

### CommandPage

- `value?` (`string`): The page's name, which a command's `page` opens. Leave it out for the first page.

### CommandGroup

Groups commands under a label. Renders a `div` with the group role.

### CommandGroupLabel

Names its group. Renders a `div`.

### CommandItem

- `value?` (`string`): Passed to `onAction` and `onValueChange`, and identifies the command. Without it, one is generated.
- `label?` (`string`): The text the search matches, when the content isn't plain text. Not the accessible name: use `aria-label` for that.
- `keywords?` (`string[]`): More words the search matches.
- `disabled?` (`boolean`): Keeps the command from running. Arrow keys and the pointer skip it. Sets `data-disabled` and `aria-disabled`.
- `shortcut?` (`string`): A keyboard shortcut that runs the command while it's in the page, like `"mod+p"`. Sets `aria-keyshortcuts`, and a `CommandShortcut` inside shows it.
- `page?` (`string`): The page choosing this command opens, by the `value` of a `CommandPage`.
- `index?` (`number`): The command's position among all visible commands, for virtualized lists that render only some. Sets `aria-posinset` and `aria-setsize`.
- `onSelect?` (`((event: Event) => unknown)`): Runs when the command runs, before `onAction`, with the click or key press that ran it, or a new `select` Event for a shortcut or a controller's `run()`. Call `event.preventDefault()` to skip `onAction` and the page. Return a Promise to mark the command pending until it settles, like `onAction`.

### CommandItemIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

### CommandItemText

Shows its command's label, and marks what matched the search. Renders a `span`.

### CommandShortcut

- `shortcut?` (`string`): The keys to show, like `"mod+p"`. Inside a command, its `shortcut`.

### CommandSeparator

Separates commands or groups. Renders a `div` with the separator role.

### Items as Data

Each command in `items`. Groups are `{ type: "group", label, items }` and separators `{ type: "separator" }`.

- `value` (`string`): Identifies the item, and is what choosing it reports. A string, or any value with `itemToValue`.
- `label` (`string`): The text shown and matched by typeahead and filtering. A select's trigger shows it once chosen.
- `keywords?` (`string[]`): More words filtering matches, like `["team"]` for a plan called Pro.
- `disabled?` (`boolean`): Keeps the item from being chosen. The keyboard skips it, like in a native select.
- `shortcut?` (`string`): A keyboard shortcut that runs the command, like `"mod+p"`, while the list is in the page, whatever page it's on. Shows `⌘P` on Apple platforms and `Ctrl+P` elsewhere.
- `items?` (`CommandData`): Commands on a page of their own. Choosing this command opens the page, and Backspace in the empty field goes back.

### State

What render functions, state-based class names and slots receive, per part.

`Command`:

- `page` (`string | null`): The current page, or `null` on the first page.
- `loading` (`boolean`): Whether results are loading.

`CommandInput`:

- `page` (`string | null`): The current page, or `null` on the first page.

`CommandList`:

- `status` (`AsyncOptionsStatus`): Whether results are loading or failed.
- `items` (`CommandData`): The visible data commands, ranked, for rendering a virtualized list yourself.

`CommandItem`:

- `highlighted` (`boolean`): Whether the command is highlighted, by the keyboard, the pointer or typing.
- `disabled` (`boolean`): Whether the command can't run.
- `pending` (`boolean`): Whether its action's Promise is running.
- `error` (`unknown`): Why its last action failed, until it runs again.

`CommandEmpty`:

- `loading` (`boolean`): Whether results are loading.
- `empty` (`boolean`): Whether no item matches.
- `query` (`string`): The text the list is filtered by.

`CommandStatus`:

- `status` (`"idle" | "loading" | "error"`): Whether results are loading or failed.
- `loading` (`boolean`): Whether results are loading.
- `count` (`number`): How many items are visible.

`CommandShortcut`:

- `text` (`string`): The shortcut formatted for this platform: `⌘P` on Apple platforms and `Ctrl+P` elsewhere. Empty without one.

`CommandItemText`, which takes no props of its own:

- `segments` (`MatchSegment[]`): The text in pieces, each marked when it matched. Joined, they're the whole text.
- `matched` (`boolean`): Whether any piece matched.

`CommandItemIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

### Reasons

Why the highlighted command changed:

- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `item-hover` (`PointerEvent`): The pointer moved onto an item, which highlighted it, like in a command list.
- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `item-removed` (`none`): The selected item left the page, and another was picked.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

Why the search text changed:

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

And why the stack of pages changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `shortcut` (`KeyboardEvent`): A keyboard shortcut, like a trigger's `shortcut`.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createCommandController()` and pass it as `controller`.

- `getValue()` (`() => string | null`): The highlighted command's value, or `null`.
- `setValue(value, options?)` (`(value: string | null, options?: CommandChangeOptions<CommandValueChangeReason> | undefined) => boolean`): Highlights a command, and scrolls it into view. Returns false when the change was canceled or nothing changed.
- `getQuery()` (`() => string`): The search text.
- `setQuery(query, options?)` (`(query: string, options?: CommandChangeOptions<CommandQueryChangeReason> | undefined) => boolean`): Changes the search text, which filters the commands. Returns false when the change was canceled or nothing changed.
- `getPages()` (`() => string[]`): The stack of open pages, from the first page opened to the current one. Empty on the first page.
- `setPages(pages, options?)` (`(pages: string[], options?: CommandChangeOptions<CommandPagesChangeReason> | undefined) => boolean`): Replaces the stack of pages. Returns false when the change was canceled or nothing changed.
- `push(page, options?)` (`(page: string, options?: CommandChangeOptions<CommandPagesChangeReason> | undefined) => boolean`): Opens a page on top of the current one, by the `value` of a `CommandPage` or a data command. Returns false when the change was canceled or nothing changed.
- `pop(options?)` (`(options?: CommandChangeOptions<CommandPagesChangeReason> | undefined) => boolean`): Goes back to the previous page, and puts back the search text typed there. Returns false when the change was canceled or nothing changed.
- `run(value?)` (`(value?: string | undefined) => void`): Runs a command, as Enter would: the highlighted one, or the one with this value.
- `focus()` (`() => void`): Moves focus to the search field.

### Events

Callbacks get the new state first, then the details.

| Prop            | On            | Receives                                                                              |
| --------------- | ------------- | ------------------------------------------------------------------------------------- |
| `onValueChange` | `Command`     | `(value, details)`: the highlighted command, the [reason](#reasons) and its `index`   |
| `onQueryChange` | `Command`     | `(query, details)`: the new text, and the [reason](#reasons)                          |
| `onPagesChange` | `Command`     | `(pages, details)`: the new stack, and the [reason](#reasons)                         |
| `onAction`      | `Command`     | `(value, { event })`: the command that ran. Return a Promise to mark it pending       |
| `onLoadMore`    | `Command`     | `()`, when the last command is reached                                                |
| `onSelect`      | `CommandItem` | `(event)`: before `onAction`. `preventDefault()` skips it. A Promise marks it pending |

## Accessibility

The command list follows the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) with a listbox that's always shown. Focus stays in the input, which points to the highlighted command with `aria-activedescendant`. Every line below is an automated test.

### Keyboard

| Key                | Does                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| Typing             | Filters the commands and highlights the best match                    |
| ArrowDown, ArrowUp | Moves the highlight. Wraps unless `loop={false}`                      |
| Enter              | Runs the highlighted command, or follows it when it renders as a link |
| Escape             | Clears the search, then goes back a page                              |
| Backspace          | In an empty search, goes back a page and restores its query           |
| An item's shortcut | Runs it while the list is mounted, even when hidden by the search     |

The first available command is highlighted by default. Set `autoHighlight` to `false` to wait for an arrow key or pointer movement.

### Tested Behavior

**Field**

- Is a combobox that controls an always-expanded listbox.
- The list is named by the field, not by what's typed.
- The first command is highlighted from the start.

**Filtering**

- Typing keeps the commands that match, ignoring case and accents.
- Groups without a match hide, and the rest keep their labels.
- The first match is highlighted as the text changes, so Enter runs it.
- Deleting text brings back the commands the shorter text matches.
- Commands without a value that mount while the field has text show when they match.
- Going back a page reports the new highlight as back, not as a removal.
- Nothing matching shows the empty message.

**Keyboard**

- Arrow keys move the highlight while focus stays in the field.
- Home and End stay in the field for the caret.
- The highlighted option has the id aria-activedescendant names.
- Enter runs the highlighted command.

**Pointer**

- Clicking a command runs it.
- A disabled command doesn't run.

**AutoHighlight**

- Without autoHighlight, nothing is highlighted until an arrow key.

Runs in React, Vue and web components.

Long lists stay fast and announce their size:

**Virtualized**

- Renders only the rows in view, each with its place in the whole list.
- Arrow keys reach commands that weren't rendered, and the active descendant follows.
- Typing ranks every command, rendered or not, best match first.

Runs in React.

Also tested:

**Enhancements**

- The highlighted command is the selected option, as the APG's list autocomplete marks it.
- Keywords match as well as labels.
- Fuzzy matching finds the letters in order, across words.
- Arrow keys skip disabled commands.
- A command's shortcut runs it and sets aria-keyshortcuts.
- A shortcut runs its command while the search hides it.
- A command is pending while its action's Promise runs, and runs only once.
- A command opens its page, and Backspace in the empty field goes back with the text.
- Escape clears the text, then goes back a page.
- Results that still hold the highlighted command keep the highlight.
- The list is busy while results load.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while searching with a keyboard.

Runs in React, Vue and web components.
