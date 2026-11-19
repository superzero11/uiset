# IDE

The parts of a code editor, on UI SDK's Tree, Tabs, Command, Dialog and Textarea, plus an
**IDE page** template that puts them together in resizable panes.

```bash
npx shadcn@latest add @uiset/ide       # the parts
npx shadcn@latest add @uiset/ide-app   # the whole page
```

## Parts

| Part             | What it is                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `FileTree`       | Files on UI SDK's Tree, folders first, version control marks; New file, New folder, Rename, Move (or drag onto a folder), Delete |
| `EditorTabs`     | Open files on UI SDK's Tabs: unsaved dots, same-named files told apart by folder, closing             |
| `CodeEditor`     | A textarea with line numbers, syntax colors (shiki, themed by every skin), indenting and problems    |
| `CommandPalette` | Go to a file (⌘P), run a command (⌘⇧P, or start with `>`), go to a line (start with `:`)              |
| `ProblemsList`   | Problems worst first; choosing one opens its file at the line                                         |
| `StatusBar`      | The bottom strip: `StatusBarItem`s as text or buttons                                                 |
| `IdeTemplate`    | All of it, with a sample project, a tiny linter, an outline, save and unsaved-close prompts           |

## Use

```tsx
<FileTree label="Files" paths={paths} value={selected} onValueChange={setSelected}
  onOpen={openFile} status={{ "src/app.ts": "modified" }}
  onCreate={create} onRename={rename} onMove={move} onDelete={remove} />

<EditorTabs files={open.map((path) => ({ path, dirty: isDirty(path) }))} value={active}
  onValueChange={setActive}
  onClose={(path) => (isDirty(path) ? askFirst(path) : closeTab(path, nextTab(open, path)))}>
  {(path) => (
    <CodeEditor ref={(handle) => editors.set(path, handle)} label={path} path={path} value={files[path]}
      onValueChange={(text) => write(path, text)} onCursorChange={setCursor}
      problems={problems.filter((p) => p.path === path)} />
  )}
</EditorTabs>

<CommandPalette files={paths} recent={recent} commands={commands}
  onOpenFile={openFile} onCommand={run} onGoToLine={(line) => editor.current?.goTo(line)} />
```

- `paths` lists files; a path ending in `/` is an empty folder. Folders come from the paths.
- `onCreate`, `onRename` and `onMove` get the full new path (or the target folder) and may
  return a message to refuse; the dialog shows it. Names that exist or hold a slash are
  refused before your handler runs. Deleting asks first (`data-agent-confirm`).
- With `onMove`, a file or folder can also be dragged onto a folder. Files sort by name, so
  a drop says which folder and not where in it: onto a folder, into it; onto a file, into
  that file's folder; onto the room under the last row, to the top. The folder is ringed
  while the drag is over it, a closed one opens if the drag rests on it, and a folder can't
  go inside itself. A drop runs `onMove` with the same checks as Move to…, then selects the
  file and says where it went, or why not. Escape cancels a drag. A finger scrolls the tree
  instead, and Move to… moves on a touch screen and from the keyboard.
- `status` marks files `modified`, `added`, `deleted`, `untracked` or `conflict`: a letter
  and a color on screen, the word in the item's name. Folders say "has changes".
- `EditorTabs` asks to close through `onClose`; the file closes when you drop it from
  `files` and pick the next `value` (`nextTab(paths, path)` gives the neighbor). So `onClose`
  can ask about unsaved changes first. Once it's gone, focus goes to the tab that took
  over, or to the empty pane. Every open file keeps its own panel, so each editor keeps its
  caret, scroll and undo while another tab shows.
- `CodeEditor` takes `path` or `language` for colors, `readOnly`, `tabSize` and `problems`.
  Its handle has `focus()` and `goTo(line, col)`. It keeps its own undo (UI SDK's
  `createUndoStack`): a run of typing is one step until a pause or a caret move, and Tab,
  Enter and outside changes are steps of their own. In Chrome any text change on the page
  while typing ends the browser's own undo step, so a colored editor can't rely on it.
- The text stays the textarea's own while you type and reaches `onValueChange` once a
  frame; text you change from outside is written back. Lines keep their colors while an
  edit is being colored. The colors come from `--shiki-*` variables in `code/code.css`,
  checked at 4.5:1 in every skin, and still 4.5:1 under the selection (`--code-selection`).
- The editor is a plain textarea underneath, so screen readers, spell check (off by
  default), autofill and agents all treat it as text.

## Keys

| Where       | Keys                         | Does                                                     |
| ----------- | ---------------------------- | -------------------------------------------------------- |
| Anywhere    | ⌘P / Ctrl+P                  | Go to a file                                             |
| Anywhere    | ⌘⇧P / Ctrl+Shift+P           | Run a command; `:` then a number goes to a line          |
| File tree   | Arrows, Home, End, Enter     | UI SDK's Tree; Enter opens a file                        |
| File tree   | F2, Delete                   | Rename, delete (asks first)                              |
| File tree   | Escape, while dragging       | Put the dragged file back                                |
| Tabs        | Arrows, Delete               | UI SDK's Tabs; Delete closes the focused tab             |
| Editor      | Tab, Shift+Tab               | Indent, outdent (every selected line)                    |
| Editor      | Enter                        | New line, keeping the indent; one deeper after `{`       |
| Editor      | Escape, then Tab             | Leave the editor (Tab moves focus on like anywhere else) |
| Editor      | F8, Shift+F8                 | Next and previous problem, read out                      |
| Editor      | Page Up, Page Down           | The caret by a screenful (Shift selects)                 |
| Editor      | ⌘Z, ⌘⇧Z (Ctrl+Z, Ctrl+Y)     | Undo and redo, a run of typing at a time                 |
| IDE page    | ⌘S / Ctrl+S                  | Save                                                     |

## For agents

Every part is a UI SDK component, so agents use it by name: choosing a file in **Files**
(`setValue`) opens it, as Enter does for a person; switch tabs, write code in the editor
named by its path (`setValue`), press New file and fill the dialog, or choose a problem.
Deleting goes through the confirm. UI SDK's Command doesn't yet let agents run a
command (reported upstream), so palette commands are people-only for now.

## Known limits

The editor draws every line, so it suits files up to about a thousand lines; it isn't a
full code editor engine (no virtualized lines, multiple cursors, folding or completion).
The template keeps files in memory: pass `onSave` to write them, and `lint` for your own
linter or language server's problems.
