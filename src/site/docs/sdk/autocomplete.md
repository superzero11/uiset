<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.16, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Autocomplete

- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `value?` (`string`): The text. Pass it to control it.
- `defaultValue?` (`string`): The text at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`((value: string, details: AutocompleteValueChangeDetails) => void)`): Runs when the text wants to change: typing, choosing a suggestion, a Clear part, a form reset or a controller. `details.cancel()` keeps it as it was.
- `open?` (`boolean`): Whether the suggestions are open. Pass it to control them.
- `defaultOpen?` (`boolean`): Whether the suggestions start open, when uncontrolled.
- `onOpenChange?` (`((open: boolean, details: ChangeDetails<AutocompleteOpenChangeReason>) => void)`): Runs when the suggestions want to open or close. `details.reason` says why, and `details.cancel()` stops it.
- `onOpenChangeComplete?` (`((open: boolean) => void)`): Runs once the suggestions have finished opening or closing, after any animation.
- `onSubmit?` (`((value: string, details: AutocompleteSubmitDetails) => void)`): Runs with the text when Enter is pressed with no suggestion highlighted, or after choosing one with `submitOnSelect`. The surrounding form submits next, unless the event's `preventDefault()` is called.
- `items?` (`ListData<string>`): The suggestions as data. Renders them for you, and filters them without rendering every one.
- `emptyItems?` (`ListData<string>`): Suggestions shown instead of `items` while the field is empty, like recent searches, with `openOnFocus`. Groups work, like `{ type: "group", label: "Recent", items }`. Needs `items`.
- `filter?` (`SearchFilter<string>`): How typing narrows the suggestions: `"contains"`, `"startsWith"`, `"fuzzy"`, a function of the item and the text, or `false` to keep every one, for results a server already filtered.
- `inlineComplete?` (`boolean`): Whether typing completes the text with the first suggestion that starts with it, with the rest selected after the caret: ArrowRight or End accepts it, Backspace and Escape take it back out, and arrow keys fill in the suggestion they highlight.
- `autoHighlight?` (`boolean`): Whether the first suggestion is highlighted while typing, so Enter chooses it.
- `openOnFocus?` (`boolean`): Whether the suggestions open when the field gets focus, like recent searches, even before anything is typed.
- `submitOnSelect?` (`boolean`): Whether choosing a suggestion submits, like a search box: `onSubmit` runs, then the form submits.
- `status?` (`AsyncOptionsStatus`): Whether results are loading or failed, for the empty and status parts. Sets `aria-busy` on the list while loading.
- `onHighlight?` (`((value: string | null, details: ListHighlightDetails) => void)`): Runs when the highlight moves, with the suggestion's index among the visible ones, so a virtualized list can scroll to it.
- `onLoadMore?` (`(() => void)`): Runs when the highlight or scrolling reaches the last suggestion, so the next page can load, like `createAsyncOptions`'s `loadMore`. Not again for the same suggestions, unless the last load failed.
- `announcement?` (`((change: ListAnnouncement) => string | null | undefined)`): What screen readers hear after typing pauses, when no `AutocompleteStatus` is rendered. Return null for nothing.
- `loop?` (`boolean`): Whether arrow keys wrap from the last suggestion to the first.
- `modal?` (`"pointer" | boolean`): `false`: the page stays usable while the suggestions are open. `"pointer"`: an outside press only closes them. `true`: also locks scroll and makes the rest of the page inert.
- `presentation?` (`PresentationSetting<"popover">`): How the suggestions present. `"sheet"` slides them up from the bottom of the screen with the field in its header, where they can be swiped away, and `"auto"` does that on small touch screens. A tap that opens a sheet leaves the keyboard closed until the field in the header is tapped. Decided each time they open; the server renders `"popover"` for `"auto"`.
- `disabled?` (`boolean`): Disables the field like a native input: it can't be focused or changed, and its text isn't submitted.
- `readOnly?` (`boolean`): Keeps the field focusable and its text submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission while the field is empty, with the browser's own message.
- `name?` (`string`): The name the text submits under.
- `form?` (`string`): The id of a form to belong to, when the field isn't inside that form.
- `controller?` (`object`): Opens, closes, reads and sets the autocomplete from anywhere. Create one with `createAutocompleteController()`.
- `dismissible?` (`boolean`): Whether Escape, an outside press, focus or the window leaving, Android's back gesture and a sheet's swipe can close it. Triggers, Close parts and the controller always can. Pass `false` while it holds unsaved work, and ask in `onDismissAttempt`.
- `onDismissAttempt?` (`function`): Runs when `dismissible` refused a dismissal made on purpose: Escape, an outside press, back or a swipe. Focus or the window leaving is refused without it. Ask "Discard changes?" here.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### AutocompleteLabel

Names the input. Renders a `label` tied to the input, so you don't need a `Field`.

### AutocompleteInput

The text field. Renders an `input` with the combobox role, and accepts its props.

### AutocompleteTrigger

An optional button that opens and closes the suggestions. Renders a `button`.

### AutocompleteClear

- `keepMounted?` (`boolean`): Whether the clear button stays in the page while the field is empty.

### AutocompleteContent

- `side?` (`Side`): Which side of the anchor the popup opens on. Flips to the other side when there isn't room. Which side of the field the suggestions open on.
- `align?` (`Align`): How the popup lines up with the anchor along that side. `start` and `end` follow the reading direction. How the suggestions line up with the field along that side.
- `sideOffset?` (`number`): Gap between the anchor and the popup, in pixels. Gap between the field and the suggestions, in pixels.
- `alignOffset?` (`number`): Shift along the anchor, in pixels. Shift along the field, in pixels.
- `collisionPadding?` (`number`): Space to keep from the viewport edges, in pixels.
- `arrowPadding?` (`number`): Space to keep between the arrow and the popup's corners, in pixels.
- `anchor?` (`string | Anchor | null`): Positions the popup against this instead of its trigger: an element, a CSS selector, a point like `{ x, y }`, or anything with `getBoundingClientRect()`. It's read on every check, so it can move. A controller's `open({ anchor })` wins for that open.
- `container?` (`DocumentFragment | Element | null`): Renders the popup into this element instead of in place, like a container inside a shadow root or an iframe. On web components, a CSS selector. Nested popups stay inside their parent.
- `keepMounted?` (`boolean`): Whether the suggestions stay in the page, hidden, while closed.

### AutocompleteArrow

An optional arrow pointing at the input. Renders a `div` positioned on the content's edge.

### AutocompleteStatus

Announces loading and result counts to screen readers. Its children can be a function of the state.

### AutocompleteEmpty

Shows when no suggestion matches. Its children can be a function of the state.

### AutocompleteList

Holds the suggestions. Renders the listbox, and renders `items` when you pass no children.

### AutocompleteGroup

Groups related suggestions. Renders a `div` with the group role.

### AutocompleteGroupLabel

Names its group. Renders a `div` the group is labelled by.

### AutocompleteItem

- `value` (`string`): Identifies the suggestion. Choosing it fills the field with its `label`, or with this when there's none.
- `label?` (`string`): The text the field gets and filtering matches, when the content isn't plain text. Not the accessible name: use `aria-label` for that.
- `keywords?` (`string[]`): More words filtering matches.
- `disabled?` (`boolean`): Keeps the suggestion from being chosen. Sets `data-disabled` and `aria-disabled`.
- `index?` (`number`): The suggestion's position among all visible ones, for virtualized lists that render only some. Sets `aria-posinset` and `aria-setsize`.

### AutocompleteItemIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

### AutocompleteItemText

The suggestion's text, with the matched part marked. Its children can be a function that receives the matched `segments`.

### AutocompleteSeparator

A divider between suggestions or groups. Renders a `div` with the separator role.

### Items as Data

Each suggestion in `items`, or a plain string. Groups are `{ type: "group", label, items }` and separators `{ type: "separator" }`.

- `value` (`T`): Identifies the item, and is what choosing it reports. A string, or any value with `itemToValue`.
- `label` (`string`): The text shown and matched by typeahead and filtering. A select's trigger shows it once chosen.
- `keywords?` (`string[]`): More words filtering matches, like `["team"]` for a plan called Pro.
- `disabled?` (`boolean`): Keeps the item from being chosen. The keyboard skips it, like in a native select.

### State

What render functions, state-based class names and slots receive, per part.

`AutocompleteInput` and `AutocompleteTrigger`:

- `open` (`boolean`): Whether the suggestions are open.
- `disabled` (`boolean`): Whether the field is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the field is read-only.
- `required` (`boolean`): Whether the field is required.

`AutocompleteContent` and `AutocompleteList`:

- `open` (`boolean`): Whether the suggestions are open. False while they animate out.
- `presentation` (`"popover" | "sheet"`): How they present this time they're open.
- `status` (`AsyncOptionsStatus`): Whether results are loading or failed.
- `items` (`ListData<string>`): The visible suggestions, for rendering a virtualized list yourself.

`AutocompleteItem`:

- `highlighted` (`boolean`): Whether the suggestion is highlighted, by the keyboard or the pointer.
- `disabled` (`boolean`): Whether the suggestion can't be chosen.

`AutocompleteEmpty`:

- `loading` (`boolean`): Whether results are loading.
- `empty` (`boolean`): Whether no item matches.
- `query` (`string`): The text the list is filtered by.

`AutocompleteStatus`:

- `status` (`"idle" | "loading" | "error"`): Whether results are loading or failed.
- `loading` (`boolean`): Whether results are loading.
- `count` (`number`): How many items are visible.

`AutocompleteClear`:

- `disabled` (`boolean`): Whether the field is disabled or read-only.

`AutocompleteArrow`:

- `open` (`boolean`): Whether the suggestions are open.

`AutocompleteItemText`, which takes no props of its own:

- `segments` (`MatchSegment[]`): The text in pieces, each marked when it matched. Joined, they're the whole text.
- `matched` (`boolean`): Whether any piece matched.

`AutocompleteItemIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

### Reasons

Why the text changed:

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `clear-press` (`MouseEvent | KeyboardEvent`): A Clear part was pressed, like on an input, a select or a combobox.
- `reset` (`none`): A form reset.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

And why the suggestions opened or closed:

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `trigger-press` (`MouseEvent | KeyboardEvent | TouchEvent`): Click, tap, Enter or Space on the part that opens, closes or toggles. Arrow keys that open a menu or submenu count too. A tap on a combobox's input that opens a sheet reports its `touchend`.
- `trigger-focus` (`FocusEvent`): Keyboard focus reached a trigger that opens on focus, like a tooltip's.
- `input-commit` (`KeyboardEvent | FocusEvent`): Enter, or leaving a number input, committed what was typed: a number input parses, clamps and snaps it to the step, and an autocomplete closes its suggestions on it.
- `outside-press` (`MouseEvent`): A press outside the layer.
- `close-press` (`MouseEvent | KeyboardEvent | SubmitEvent`): A Close part was pressed, or a form with `method="dialog"` was submitted.
- `focus-out` (`KeyboardEvent | FocusEvent`): Focus left the layer, or Tab moved it out.
- `window-blur` (`FocusEvent`): The window lost focus.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

With `dismissible` false, the refused dismissals `onDismissAttempt` reports:

- `escape-key` (`KeyboardEvent`): Escape, or a submenu's close key (ArrowLeft in left-to-right layouts).
- `outside-press` (`MouseEvent`): A press outside the layer.
- `back` (`Event`): Going back: the Android back button or gesture, or Backspace in an empty command input, which returns to the previous page.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.

### Controller

Create one with `createAutocompleteController()` and pass it as `controller`.

- `isOpen()` (`() => boolean`): Whether the suggestions are open.
- `setOpen(open, options?)` (`(open: boolean, options?: AutocompleteChangeOptions<AutocompleteOpenChangeReason> | undefined) => boolean`): Opens or closes the suggestions. Returns false when the change was canceled or it was already open or closed.
- `open(options?)` (`(options?: (AutocompleteChangeOptions<AutocompleteOpenChangeReason> & { signal?: AbortSignal | undefined; }) | undefined) => Promise<...>`): Opens the suggestions, and resolves once they close, with why and how. Resolves exactly once and never rejects: on the next close, when `signal` aborts, or with reason `"unmount"`.
- `close(options?)` (`(options?: AutocompleteChangeOptions<AutocompleteOpenChangeReason> | undefined) => boolean`): Closes the suggestions. Returns false when the close was canceled or it was already closed.
- `toggle(options?)` (`(options?: AutocompleteChangeOptions<AutocompleteOpenChangeReason> | undefined) => boolean`): Opens the suggestions when they're closed, and closes them when they're open. Returns false when the change was canceled.
- `getValue()` (`() => string`): The text.
- `setValue(value, options?)` (`(value: string, options?: AutocompleteChangeOptions<AutocompleteValueChangeReason> | undefined) => boolean`): Changes the text, which filters the suggestions. Returns false when the change was canceled or nothing changed.
- `clear(options?)` (`(options?: AutocompleteChangeOptions<AutocompleteValueChangeReason> | undefined) => boolean`): Empties the field. Returns false when the change was canceled or nothing changed.
- `getHighlighted()` (`() => string | null`): The value of the highlighted suggestion, or null when none is.
- `highlight(value)` (`(value: string | null) => boolean`): Highlights the suggestion with this value in the open list, scrolled into view, or none with null. Returns false when the suggestions are closed, or no enabled suggestion has the value.
- `focus()` (`() => void`): Moves focus to the field.

### Events

Callbacks get the new state first, then the details.

| Prop                   | On             | Receives                                                     |
| ---------------------- | -------------- | ------------------------------------------------------------ |
| `onValueChange`        | `Autocomplete` | `(value, details)`: the new text, and the [reason](#reasons) |
| `onOpenChange`         | `Autocomplete` | `(open, details)`: the new state, and the [reason](#reasons) |
| `onOpenChangeComplete` | `Autocomplete` | `(open)`, after the animation                                |
| `onSubmit`             | `Autocomplete` | `(value, { event })`: the text, when Enter submits           |
| `onHighlight`          | `Autocomplete` | `(value, { index, event })`: the highlighted suggestion      |
| `onLoadMore`           | `Autocomplete` | `()`, when the last suggestion is reached                    |
| `onDismissAttempt`     | `Autocomplete` | `({ reason, event })`, when a dismissal was refused          |

## Accessibility

The autocomplete follows the [WAI-ARIA combobox pattern with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/), and [list and inline](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-both/) with `inlineComplete`.

Typing filters the suggestions. Arrow keys move the highlight; Enter fills in the highlighted text and Escape closes the list. Focus usually stays in the input while `aria-activedescendant` identifies the highlighted suggestion. A touch screen-reader trigger can move focus into the list, and a sheet has its own [focus behavior](#presentation).

Every line below is an automated test.

**Field**

- Is a combobox named by its label, with list autocomplete.
- Typing opens the suggestions that match, and the text stays what was typed.
- Text that matches nothing stays, with the empty message.
- Typing in the middle of the text keeps the caret where it was.

**Choosing**

- Arrow keys move the highlight while focus stays in the field.
- Enter fills in the highlighted suggestion and closes, without submitting.
- Clicking a suggestion fills it in and keeps focus in the field.
- A disabled suggestion can't be chosen.
- Escape takes an inline completion back out.
- Escape closes the suggestions and keeps the text.

**Forms**

- Enter with nothing highlighted submits the text as typed.
- The field submits a chosen suggestion's text under its name.
- Required blocks submitting an empty field.
- A disabled field can't be focused or changed.

**Clear**

- The clear button empties the field and keeps focus in it.

Runs in React, Vue and web components.

Also tested:

**Enhancements**

- Inline completion fills in the first match with the rest selected after the caret.
- Backspace takes an inline completion out and doesn't complete again.
- ArrowRight accepts an inline completion.
- With inline completion, arrow keys fill in the suggestion they highlight.
- The suggestions open when the field gets focus.
- Enter with nothing highlighted runs onSubmit with the text.
- Filtering matches a suggestion's keywords.
- A form reset puts the default text back.
- The list is named by the field's label.
- An immediate search runs once when the autocomplete mounts.
- A newer search aborts the older one, and only its results land.
- Arrow keys keep the highlighted item in view when the … scrolls.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while typing and choosing with a keyboard.

Runs in React, Vue and web components.
