<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.5, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### TokenInput

- `value?` (`TokenInputValue`): The value. Pass it to control the input.
- `defaultValue?` (`TokenInputValue`): The value at first, when uncontrolled. A form reset returns to it.
- `onValueChange?` (`((value: TokenInputValue, details: TokenInputValueChangeDetails) => void)`): Runs when typing, pasting, a menu, undo or a controller wants to change the value. `details.reason` says why, `details.removed` lists removed tokens, and `details.cancel()` stops it.
- `onSubmit?` (`((value: TokenInputValue, details: TokenInputSubmitDetails) => void)`): Runs on the submit shortcut, unless an input method is composing or a trigger menu is open. Without it, the shortcut submits the form the input is in. With neither, the key is left alone, so Enter starts a new line.
- `submitShortcut?` (`"enter" | "mod+enter"`): Which keys submit: `"enter"`, with Shift+Enter for a new line, or `"mod+enter"`, with Enter for a new line, which many Japanese and Chinese writers prefer.
- `tokenDeletion?` (`TokenDeletion`): How Backspace and Delete treat a token next to the caret. `"whole"` removes it in one press, `"select"` selects it first and removes it on the second, and `"revert"` turns it back into its text, so a trigger menu opens on it again.
- `copy?` (`"codec" | "label"`): What copying writes as plain text: `"codec"` keeps tokens through any app that pastes text, `"label"` writes what people read.
- `codec?` (`TokenCodec`): How tokens become text and back, for the clipboard and forms.
- `getTokenDescription?` (`((token: Token) => string)`): What a token says to screen readers besides its label, like its kind and status.
- `history?` (`UndoStackOptions`): Undo history: how many steps it keeps, and how long a typing pause starts a new step.
- `disabled?` (`boolean`): Disables the input: it can't be focused or changed, and isn't submitted.
- `readOnly?` (`boolean`): Keeps the input focusable and submitted, but stops changes.
- `required?` (`boolean`): Blocks form submission while the input is empty.
- `name?` (`string`): The name the codec text submits under. Without one, the input submits nothing.
- `form?` (`string`): The id of a form to belong to, when the input isn't inside it.
- `controller?` (`object`): Reads, edits and focuses the input from anywhere. Create one with `createTokenInputController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

`renderToken` receives each token and returns its content, usually a `TokenInputToken`.

### TokenInputEditor

- `placeholder?` (`string`): Text shown while the input is empty, through `aria-placeholder`. Show it with `data-empty:before:content-[attr(aria-placeholder)]`.

### TokenInputToken

A token's content, inside `renderToken`, with its state for styling. Renders a `span`.

### TokenInputTokenRemove

Removes its token when pressed and keeps focus in the editor. Renders a `span`, hidden from assistive technology, since keyboard users remove tokens with Backspace.

### Token

- `type` (`string`): Kind, like `"mention"`, `"file"` or `"skill"`.
- `value` (`string`): The id it stands for.
- `label` (`string`): The text it shows, reads as and falls back to.
- `id?` (`string`): Stable identity, generated when missing.
- `status?` (`"pending" | "unresolved"`): `"pending"` while it loads, `"unresolved"` when it needs the user, like an ambiguous mention.
- `data?` (`Record<string, unknown>`): What the chip renders from, like an icon or a run state. Never serialized.

### Codec

- `format` (`(token: Token) => string`): The text a token is written as.
- `parse` (`(text: string) => TokenInputValue`): Text back into a value, with tokens wherever their text appears.
- `escape?` (`((text: string, next: Token | undefined) => string)`): How plain text is written so `parse` reads it back as text. `next` is the token that follows it, if any. Defaults to the text as is.

### State

`TokenInputEditor`:

- `empty` (`boolean`): Whether the input holds nothing.
- `disabled` (`boolean`): Whether the input is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the input is read-only: it stays focusable, but typing, pastes and drops don't change it.

`TokenInputToken`:

- `token` (`Token`): The token this part shows: the one the token input renders its content for.
- `selected` (`boolean`): Whether the token is in the selection, or selected for removal.
- `pending` (`boolean`): Whether the token is loading.
- `unresolved` (`boolean`): Whether the token needs the user, like an ambiguous mention.
- `disabled` (`boolean`): Whether the input is disabled, by itself or by a `<fieldset>`.
- `readOnly` (`boolean`): Whether the input is read-only, so the token's remove button does nothing.

### Reasons

- `input-change` (`Event`): Typing, pasting or dropping changed a text field's value; in a combobox it can also open or close it, or Enter keeps the typed text as the value.
- `paste` (`ClipboardEvent`): Files were pasted, like a screenshot, or text and tokens into a token input.
- `drop` (`DragEvent`): Files were dropped on a drop zone, or text and tokens on a token input.
- `cut` (`ClipboardEvent`): A selection was cut from a token input.
- `undo` (`KeyboardEvent | InputEvent`): Undo, from the keyboard, the Edit menu or a controller.
- `redo` (`KeyboardEvent | InputEvent`): Redo, from the keyboard, the Edit menu or a controller.
- `remove-press` (`MouseEvent | KeyboardEvent`): A chip's remove part was pressed, or Backspace or Delete removed a chip or a span.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `reset` (`none`): A form reset.
- `restore` (`none`): The browser restored state, like after going back, or a saved value was read back from storage.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createTokenInputController()` and pass it as `controller`.

- `getValue()` (`() => TokenInputValue`): The value: text and tokens.
- `setValue(value, options?)` (`(value: TokenInputValue, options?: TokenInputChangeOptions | undefined) => boolean`): Replaces the value as one undoable step. Returns false when the change was canceled or nothing changed.
- `getText(codec?)` (`(codec?: TokenCodec | undefined) => string`): The value as codec text, like `Ask [@Ada](mention:ada)`.
- `getLabel()` (`() => string`): The value as people read it, with each token's label.
- `insert(content, options?)` (`(content: string | Token | TokenInputValue, options?: (TokenInputChangeOptions & { at?: TextRange | "caret" | "end" | undefined; resolve?: PromiseLike<...> | undefined; }) | undefined) => boolean`): Inserts text, a token or a value at the caret, the end or a range, as one undoable step. With `resolve`, a token is pending until it settles: updated with what it resolves to, removed if it rejects. Returns false when the change was canceled.
- `updateToken(id, patch)` (`(id: string, patch: Partial<Omit<Token, "id">>) => boolean`): Changes a token's status, data or label without an undo step or a caret move. Returns false when there's no such token or nothing changed.
- `removeToken(id, options?)` (`(id: string, options?: TokenInputChangeOptions | undefined) => boolean`): Removes a token as one undoable step. Returns false when the change was canceled or nothing changed.
- `undo()` (`() => boolean`): Undoes the last step. Returns false when there was none or the change was canceled.
- `redo()` (`() => boolean`): Redoes the last undone step. Returns false when there was none or the change was canceled.
- `canUndo()` (`() => boolean`): Whether there's a step to undo.
- `canRedo()` (`() => boolean`): Whether there's a step to redo.
- `clear(options?)` (`(options?: TokenInputChangeOptions | undefined) => boolean`): Empties the input as one undoable step. Returns false when the change was canceled or nothing changed.
- `focus(options?)` (`(options?: { at?: "end" | "start" | undefined; } | undefined) => void`): Focuses the editor, with the caret at its start or end.
- `editor` (`TextEditorAdapter`): The editor a TriggerMenu outside the token input reads and writes. A menu inside it finds it on its own.

### Events

Callbacks get the new state first, then the details.

| Prop            | On           | Receives                                                                         |
| --------------- | ------------ | -------------------------------------------------------------------------------- |
| `onValueChange` | `TokenInput` | `(value, details)`: the value, the [reason](#reasons), `inputType` and `removed` |
| `onSubmit`      | `TokenInput` | `(value, details)`: the value, and the key press or menu choice that submitted   |

## Accessibility

The editor is a multiline text box: it has the `textbox` role with `aria-multiline`, and a Trigger Menu inside it adds `aria-autocomplete` and `aria-haspopup` for its suggestions. Give it a visible label through a [Field](/docs/components/field), or an `aria-label`. Each token reads as its label and its kind, like "routes.ts file", and inserting or removing one is announced. Typing keeps the browser's spelling, autocorrect, and input method support.

### Keyboard

| Key                          | Does                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Backspace, Delete            | Removes the token before or after the caret, as `tokenDeletion` says         |
| ArrowLeft, ArrowRight        | Moves the caret past a token in one press; the caret never stops inside one  |
| Enter                        | Submits. While a trigger menu is open, chooses the highlighted suggestion    |
| Shift+Enter                  | Starts a new line                                                            |
| Command+Enter, Control+Enter | Submits when `submitShortcut` is `"mod+enter"`; Enter then starts a new line |
| Command+Z, Control+Z         | Undoes the last step. Typing is grouped; pastes and token changes are steps  |
| Shift+Command+Z, Control+Y   | Redoes the last undone step                                                  |

### Tested Behavior

Every line below is an automated test.

**Value**

- Renders text and tokens, each token as one chip.
- Tokens it starts with show their rendered content once, and read as their label and kind.
- Tokens and their remove parts mark a read-only or disabled input.
- Is empty with a placeholder until something is typed.
- Typing after a token goes after it.
- Shift+Enter starts a new line.

**Tokens**

- @ opens the menu inside the input, and choosing inserts a token and a space.
- A controlled input takes tokens from its menu and keeps typing in order.
- Enter in an open menu chooses and doesn't submit.
- One Backspace removes a whole token, and says so.
- Backspace removes tokens one by one, with no keystroke spent on anchors.
- Delete removes the token after the caret.
- The caret crosses a token with one arrow press each way.
- The caret can sit between two adjacent tokens.
- Clicking past a final token and typing lands after it.
- Word deletion stops at a token.
- The remove button removes its token and keeps focus.
- With tokenDeletion select, the first Backspace selects the token and the second removes it.
- With tokenDeletion revert, Backspace turns the token back into text and the menu opens on it.

**History**

- Undo and Redo step through edits, a token insertion on its own.
- Undo brings back a removed token.
- A pending token shows loading, then settles without an undo step.
- A pending token whose load fails is removed.

**Clipboard**

- Copying tokens into plain text and back keeps them.
- Copy writes codec text and HTML with the tokens.
- Pasting codec text makes tokens.
- With copy label, plain text gets what people read.

**Submit**

- Enter submits the codec text.
- With mod+enter, Enter is a new line and Cmd or Ctrl+Enter submits.
- A form submits the codec text under the input's name.
- Enter submits the form the input's form attribute names, not the one it's in.
- Enter while an input method composes doesn't submit.

Runs in React, Vue and web components.
