# Rich text

A rich text editor on UI SDK: headings, lists (nested, numbered, to-dos), quotes, code,
links, mentions, dividers and images, with a toolbar, Markdown as you type, "/" for blocks
and "@" for people. Its value is a small document you can save as Markdown or clean HTML,
and agents read and write it as Markdown through UI SDK's bridge.

```bash
npx shadcn@latest add superzero11/uiset/rich-text
```

It has no editor library underneath. The toolbar is UI SDK's Toolbar, Toggles, Select and
Popover; "/" and "@" are UI SDK's TriggerMenu, connected through an editor adapter; undo
is UI SDK's `createUndoStack`. The editing itself (`rich-text/view.ts`, `model.ts`) is
shared by React and Web Components.

## Parts

| Part               | What it is                                                                 |
| ------------------ | -------------------------------------------------------------------------- |
| `RichTextEditor`   | The editor: toolbar, text, "/" and "@" menus, an optional count, a form value |
| `RichTextContent`  | Saved text, read-only, in the editor's styles (rendered as React, never as an HTML string) |
| `toMarkdown`, `fromMarkdown`, `toHTML`, `fromHTML`, `toText` | The document to and from Markdown, HTML and plain text |
| `richTextCommands` | What "/" offers by default, to extend or reorder                           |

## Use

```tsx
const [doc, setDoc] = useState(() => fromMarkdown(saved))

<RichTextEditor
  label="Release notes"
  value={doc}
  onValueChange={setDoc}
  placeholder="Write the release notes…"
  mentions={[{ value: "ada", label: "Ada Lovelace" }]}
  maxLength={2000}
/>

// Later: save it.
await save({ markdown: toMarkdown(doc), html: toHTML(doc) })
```

- `defaultValue` takes Markdown or a document, for an editor you don't control. `value`
  takes a document; pass back what `onValueChange` gives you (it fires for edits, not for
  caret moves).
- In a form, `name="notes"` adds a hidden field with the HTML (or Markdown, with
  `format="markdown"`).
- `maxLength` shows a count. Going over is allowed and says so in words ("12 over the limit
  of 2000 characters"), so nothing typed is lost; the field is described by the count.
- `commands` replaces what "/" offers: `{ value, label, description?, icon? | glyph?,
  run(state) }`, where `run` returns the next editor state (`setBlock`, `insertBlock` and
  the rest of `rich-text/model` are there for it). `commands={[]}` turns "/" off.
- `uploadImage(file)` takes pasted, dropped and chosen images; return `{ src, alt? }` or
  `null`. Without it, the toolbar has no image button and image files aren't taken.
- `readOnly` hides the toolbar and refuses edits from people and agents; `disabled` also
  dims it.
- `messages` changes what's announced (marks and blocks turning on and off), for other
  languages.
- `onSubmit` runs on Mod+Enter outside a to-do, for a comment box that sends.

## Safety

Everything that comes in is checked the same way typing is: pasted HTML and Markdown, the
editor's own clipboard format (any page can put it on the clipboard), a `value` or
`defaultValue` document, and what `RichTextContent` shows. Unknown block types become
paragraphs, heading levels and list depths are clamped, and links and images that aren't
`http(s)`, `mailto:`, `tel:` or a path (not `//host`) are dropped, also when a link is
added at a caret with nothing selected. `sanitizeDoc` from `rich-text/model` does it for
your own code.

## The document

A flat list of blocks, each `{ id, type, content }`: `paragraph`, `heading` (`level` 1–3),
`quote`, `code` (`language`), `bullet`, `ordered`, `task` (`checked`) with `indent` 0–4,
`divider` and `image` (`src`, `alt`). `content` is text runs with `marks` (`bold`,
`italic`, `underline`, `strike`, `code`, `link`) and mentions (`{ type: "mention", id,
label }`). It's plain JSON: store it as is, or store Markdown or HTML and read it back.

- **Markdown out** is GitHub-flavored: `- [ ]` tasks, fenced code, `~~strike~~`, nested
  lists by two spaces. Underline has no Markdown; it's kept in HTML only.
- **HTML out** is a small, fixed set of tags (`p`, `h1`–`h3`, `ul`/`ol`/`li`, `blockquote`,
  `pre`/`code`, `strong`, `em`, `u`, `s`, `a`, `hr`, `img`, `br`), with tasks as
  `<li data-checked>`. Text is escaped; links are `http(s)`, `mailto:`, `tel:` or a path.
- **Mentions** are `<span data-mention="id">@Name</span>` in HTML and read back as
  mentions; Markdown has no mention syntax, so there they're plain `@Name` text. Store the
  document or HTML to keep them.
- **HTML in** (paste, `fromHTML`) keeps only what the editor can show. A table's rows
  become lines with their cells apart by tabs. Images in pasted pages come in only when
  you pass `uploadImage` (no hotlinks or tracking pixels otherwise). Scripts, styles,
  event attributes, `javascript:` links and unsafe images are dropped. Bold, italics and
  strikethrough set by Google Docs' and Word's inline styles are read as marks.

## Keys

| Keys                       | Does                                                  |
| -------------------------- | ----------------------------------------------------- |
| Mod+B, Mod+I, Mod+U        | Bold, italic, underline (on the selection, or for what you type next) |
| Mod+Shift+X, Mod+E         | Strikethrough, inline code                            |
| Mod+K                      | Add, edit or remove the link at the selection         |
| Mod+Alt+0, 1, 2, 3         | Text, Heading 1, 2, 3                                 |
| Mod+Shift+7, 8, 9          | Numbered, bulleted, to-do list                        |
| Tab, Shift+Tab             | In a list: nest the item one level deeper, or less    |
| Enter                      | New block; on an empty item, out one level, then out of the list; twice at the end of a code block, out of the code |
| Shift+Enter                | A line break in the same block                        |
| Mod+Enter                  | Check a to-do off, or `onSubmit` elsewhere             |
| Mod+Z, Mod+Shift+Z         | Undo, redo (typing is grouped; an agent's edit is one step) |
| "/" at the start of a line | The block menu: arrows, Enter or Tab, Escape          |
| "@"                        | Mention someone from `mentions`                       |

Markdown as you type: `#`, `##`, `###`, `-`, `1.`, `[ ]`, `[x]`, `>` and a space at the
start of a line; `---` or three backticks then Enter; `**bold**`, `*italic*`, `` `code` ``
and `~~strike~~` as you close them. Pasting Markdown text turns it into blocks.

A to-do's box is a checkbox named by its task; a click or a screen reader's activation
checks it off. Each block takes its own text direction (`dir="auto"`), so Arabic or Hebrew
reads right in a left-to-right app. A read-only editor stays in the Tab order so its text
can be read and copied. Text from an input method takes the marks typing would there.

The toolbar is one Tab stop; arrows move along it. Pressing a button keeps the selection
and puts focus back in the text. Marks and blocks turning on and off are announced.

## For agents

The editor is one component, named by its `label`, with its value as Markdown.
`setValue(markdown)` replaces the text (unchanged Markdown changes nothing),
`insert(markdown)` adds blocks at the end without re-reading what's there, so mentions and
line breaks inside items survive, and `clear()` empties it. Each is one undo step for the person, and read-only or disabled
editors refuse them with a reason. The toolbar is hidden from agents (it acts on a
person's selection); agents format through Markdown instead.

## Web Components

`<uiset-rich-text>` is the same editor, built from UI SDK's own elements. See
[Web Components](./web-components.md#rich-text).
