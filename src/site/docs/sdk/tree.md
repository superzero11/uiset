<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

### Tree

- `items?` (`TreeItemData[]`): The items as data: each a `value`, a `label` and, for a branch, `children`. Renders them for you, and gives the tree its whole shape even where rows aren't rendered.
- `paths?` (`readonly string[]`): Items from file paths, like `["src/index.ts", "README.md"]`: each folder becomes a branch, folders first. A path ending in `/` is an empty folder.
- `mode?` (`Mode`): How many items can be selected.
- `value?` (`TreeValue<Mode>`): The selected value. Pass it to control the selection. `null` selects nothing, and with `mode: "multiple"` it's a list.
- `defaultValue?` (`TreeValue<Mode>`): The value selected at first, when uncontrolled.
- `onValueChange?` (`((value: TreeValue<Mode>, details: ChangeDetails<TreeValueChangeReason>) => void)`): Runs when the selection wants to change. `details.reason` says why, and `details.cancel()` stops it.
- `activation?` (`"automatic" | "manual"`): Whether moving focus with the keyboard selects, with one item selectable: `"automatic"` selects the focused item, `"manual"` waits for Enter, Space or a press.
- `expanded?` (`string[]`): The expanded branches' values. Pass it to control which branches are open.
- `defaultExpanded?` (`string[]`): The branches expanded at first, when uncontrolled. The ancestors of `current` are added.
- `onExpandedChange?` (`((expanded: string[], details: ChangeDetails<TreeExpandedChangeReason>) => void)`): Runs when branches want to expand or collapse. `details.reason` says why, and `details.cancel()` stops it.
- `expandOnPress?` (`boolean`): Whether pressing a branch's row expands or collapses it. Its indicator always does.
- `checkable?` (`boolean`): Gives every item a tri-state checkbox, kept apart from the selection. Checking a branch checks everything in it, and a branch shows mixed while only some of it is checked. Space checks the focused item.
- `checked?` (`string[]`): The checked items' values, as `checkStrategy` reports them. Pass it to control the checkboxes.
- `defaultChecked?` (`string[]`): The items checked at first, when uncontrolled. A branch stands for everything in it.
- `onCheckedChange?` (`((checked: string[], details: ChangeDetails<TreeCheckedChangeReason>) => void)`): Runs when checkboxes want to change. `details.reason` says why, and `details.cancel()` stops it.
- `checkStrategy?` (`TreeCheckStrategy`): Which items the checked value lists: `"leaf"` the checked leaves, `"trunk"` the outermost fully checked items, `"branch"` every fully checked item, and `"independent"` each item on its own, with no cascading.
- `onAction?` (`((value: string, details: TreeActionDetails) => unknown)`): Runs when an item is pressed or Enter is pressed on it, apart from selecting it, like opening a file. Return a Promise to mark the item pending until it settles.
- `pendingAnnouncement?` (`string`): What screen readers hear once an item's action has been pending for a second, so a slow action doesn't pass in silence. Set it in the page's language. An empty string says nothing.
- `loadChildren?` (`((value: string, details: { signal: AbortSignal; }) => void | Promise<unknown>)`): Loads a branch's children the first time it expands while it has none. The branch shows `data-loading` and expands once the Promise resolves; a rejection marks it `data-failed` and the next expand tries again. Expanding it again while loading cancels through `signal`.
- `current?` (`string | null`): The value of the item for the current page. It gets `aria-current="page"`, takes the tab stop first, and its ancestors expand, at first and whenever it changes.
- `onHighlight?` (`((value: string, details: ListHighlightDetails) => void)`): Runs when the keyboard moves focus to an item, with its row among the items that show, from 0. A virtualized list scrolls that row into view here, so an item it hasn't rendered can take focus once it does.
- `disabled?` (`boolean`): Disables every item. Items stay focusable unless `focusableWhenDisabled` is false.
- `focusableWhenDisabled?` (`boolean`): Whether disabled items take focus, so a screen reader still finds them.
- `keepMounted?` (`boolean`): Whether collapsed branches keep their groups in the page, hidden.
- `hiddenUntilFound?` (`boolean`): Keeps collapsed groups in the page as `hidden="until-found"`, so the browser's find in page can match their text and expand them.
- `announcement?` (`((change: TreeAnnouncement) => string | null | undefined)`): What screen readers hear when a branch expands, collapses, starts loading or fails to load. Return null for nothing. Expanding and collapsing are announced on Apple platforms only, where VoiceOver doesn't read the change.
- `controller?` (`object`): Drives the tree from anywhere. Create one with `createTreeController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### TreeItem

- `value` (`string`): Identifies the item, unique in the tree. Passed to `onAction`, and listed by the value, `expanded` and `checked`.
- `branch?` (`boolean`): Whether it's a branch. Adapters set it when it has a group; set it yourself for a branch whose children load later.
- `disabled?` (`boolean`): Stops it from being selected, checked, expanded or run. It stays focusable unless `focusableWhenDisabled` is false.
- `label?` (`string`): The text typeahead matches, when its label isn't plain text.

### TreeGroup

- `keepMounted?` (`boolean`): Whether the group stays in the page, hidden, while collapsed. Overrides the tree's.
- `hiddenUntilFound?` (`boolean`): Whether the group stays findable with `hidden="until-found"` while collapsed. Overrides the tree's.

### Items as Data

Each item in `items`:

- `value` (`string`): Identifies the item. Unique in the tree.
- `label` (`string`): What it shows, and what typeahead matches.
- `children?` (`TreeItemData[]`): Its children. Leave it out for a leaf. An empty array is a branch with no children, or one whose children load when it opens.
- `disabled?` (`boolean`): Whether it can't be selected, checked or activated. It can still take focus.
- `href?` (`string`): Makes the item a link to this address.

Each row `visibleTreeRows(items, expanded)` returns, for a flat list:

- `item` (`TreeItemData`): The object from your data this row shows, the same one you passed in, children included.
- `parent` (`string | null`): The value of the item it's nested in, or `null` at the top level.
- `level` (`number`): Its depth, 1 at the top level.
- `index` (`number`): Its place among the rows that show, from 0, for a virtualized list.

### State

What render functions, state-based class names and slots receive, per part.

`Tree`:

- `mode` (`TreeMode`): How many items can be selected.
- `checkable` (`boolean`): Whether items have checkboxes.
- `disabled` (`boolean`): Whether the whole tree is disabled, by its `disabled` option or a disabled fieldset around it.

`TreeItem`, and its `TreeItemLabel`, `TreeItemIndicator` and `TreeItemCheckbox`:

- `expanded` (`boolean`): Whether it's a branch that's expanded.
- `selected` (`boolean`): Whether its value is in the tree's value. Separate from `checked`, which its checkbox sets.
- `checked` (`TreeCheckedState`): Its checkbox: checked, unchecked or `"indeterminate"`. False without `checkable`.
- `disabled` (`boolean`): Whether it can't be selected, checked, expanded or run.
- `branch` (`boolean`): Whether it has children, or can load them.
- `level` (`number`): Its depth, 1 at the top level.
- `current` (`boolean`): Whether it's the current page's item.
- `loading` (`boolean`): Whether its children are loading.
- `failed` (`boolean`): Whether loading its children failed.
- `pending` (`boolean`): Whether its `onAction` is still running.

`TreeGroup`:

- `expanded` (`boolean`): Whether its branch is expanded.
- `level` (`number`): The depth of the items in it.

### Reasons

Why branches expanded or collapsed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `find-in-page` (`Event`): The browser's find in page matched hidden content.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

Why the selection changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

And why the checkboxes changed:

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createTreeController()` and pass it as `controller`.

- `getExpanded()` (`() => string[]`): The values of the expanded branches.
- `setExpanded(expanded, options?)` (`(expanded: string[], options?: TreeChangeOptions<TreeExpandedChangeReason> | undefined) => boolean`): Expands exactly these branches. Returns false when canceled.
- `isExpanded(value)` (`(value: string) => boolean`): Whether a branch is expanded.
- `expand(value, options?)` (`(value: string, options?: TreeChangeOptions<TreeExpandedChangeReason> | undefined) => boolean`): Expands a branch, loading its children first with `loadChildren` when it has none.
- `collapse(value, options?)` (`(value: string, options?: TreeChangeOptions<TreeExpandedChangeReason> | undefined) => boolean`): Collapses a branch. Focus inside it moves to the branch.
- `toggle(value, options?)` (`(value: string, options?: TreeChangeOptions<TreeExpandedChangeReason> | undefined) => boolean`): Expands a collapsed branch, or collapses an expanded one.
- `expandAll(options?)` (`(options?: TreeChangeOptions<TreeExpandedChangeReason> | undefined) => boolean`): Expands every branch, and every branch that renders inside one later.
- `collapseAll(options?)` (`(options?: TreeChangeOptions<TreeExpandedChangeReason> | undefined) => boolean`): Collapses every branch.
- `getValue()` (`() => string | string[] | null`): The selected value: a value or `null`, or a list with `mode: "multiple"`.
- `setValue(value, options?)` (`(value: string | string[] | null, options?: TreeChangeOptions<TreeValueChangeReason> | undefined) => boolean`): Selects these items.
- `getChecked()` (`() => string[]`): The checked value, as `checkStrategy` reports it.
- `setChecked(checked, options?)` (`(checked: string[], options?: TreeChangeOptions<TreeCheckedChangeReason> | undefined) => boolean`): Sets the checked value.
- `checkedState(value)` (`(value: string) => TreeCheckedState`): Whether an item's checkbox is checked, unchecked or `"indeterminate"`.
- `reveal(value)` (`(value: string) => void`): Expands an item's ancestors, scrolls it into view and focuses it.
- `focus(value?)` (`(value?: string | undefined) => void`): Focuses an item, or the item with the tab stop.

## Accessibility

The tree follows the [WAI-ARIA tree view pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/). Items have the `treeitem` role with `aria-level`, `aria-expanded` on branches, and `aria-checked` when the tree is checkable.

### Keyboard

The tree has one tab stop. Tab enters at the current page, the selected item, or the first item, then returns to the item focused last.

| Key                         | Action                                                 |
| --------------------------- | ------------------------------------------------------ |
| Down / Up Arrow             | Focus the next or previous visible item.               |
| Right Arrow                 | Expand a branch, or enter its first child.             |
| Left Arrow                  | Collapse a branch, or focus its parent.                |
| Home / End                  | Focus the first or last visible item.                  |
| Alt+Right / Alt+Left Arrow  | Expand or collapse a branch and its descendants.       |
| `*`                         | Expand sibling branches.                               |
| Enter                       | Select and run the item's action, or follow its link.  |
| Space                       | Check the item when checkable, otherwise select it.    |
| Shift+Down / Shift+Up Arrow | Extend a multiple selection.                           |
| Cmd+A / Ctrl+A              | Select visible items in multiple selection mode.       |
| Typing                      | Focus the next item whose label starts with that text. |

Option is Alt on a Mac. In right-to-left text, Left and Right swap.

### Tested Behavior

Every line below is an automated test.

**Expanding and collapsing**

- Branches start collapsed, and only top-level items show.
- Clicking a branch expands it and shows its children.
- Clicking the indicator expands without selecting.
- A change can be canceled.
- A default can expand nested branches.
- A controller expands and collapses everything.
- Reveal expands an item's ancestors and focuses it.

**Keyboard**

- Tab reaches the tree once, on the first item.
- Down and Up move between the items that show.
- Right expands a branch, then moves to its first child.
- Right on a leaf does nothing.
- Left collapses a branch, then moves to its parent.
- Home and End move to the first and last items that show.
- * expands every branch beside the focused item.
- Alt+Right expands a branch and everything in it.
- Typing moves to the next item that starts with the text.
- Enter selects the item and runs its action.
- A key on a nested item acts on that item only.

**Selection**

- Clicking an item selects it alone.
- The selected item takes the tab stop.
- Disabled items take focus but can't be selected.
- With multiple selection, Shift+Down extends and Ctrl+A selects everything.
- With automatic activation, moving focus selects.
- Without selection, items have no aria-selected.

**Checkboxes**

- Checking a branch checks everything in it.
- Space checks the focused item, and a disabled item keeps its check.
- Checking a leaf leaves the selection and the branch alone.

**Positions**

- Every item says its level and place among its siblings.
- The current page's item is marked.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while using the tree with a keyboard.
- Expanding the focused item is announced on Apple platforms.
- Nothing is announced elsewhere, where screen readers read the change.

Runs in React, Vue and web components.
