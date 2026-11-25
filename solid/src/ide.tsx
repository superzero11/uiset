import { Dynamic, type JSX } from "@solidjs/web"
import { announce, createUndoStack, keepFocus, matchesShortcut } from "@ui-sdk/core"
import { fuzzyScore, matchRanges, matchSegments } from "@ui-sdk/core/text-match"
import { createEffect, createMemo, createSignal, createUniqueId, For, onCleanup, onSettled, Show, untrack } from "solid-js"
import { AlertDialog, AlertDialogBackdrop, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "./alert-dialog"
import { Button } from "./button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandShortcut, type CommandData } from "./command"
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger, createDialogController } from "./dialog"
import { Field, FieldError, FieldLabel, Input } from "./field"
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./menu"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"
import { ScrollBox } from "./scroll-area"
import { Icon } from "./shell/icons"
import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs"
import { Textarea } from "./textarea"
import { Tree, TreeGroup, TreeItem, TreeItemIndicator, TreeItemLabel, createTreeController, treeFromPaths, visibleTreeRows, type TreeController, type TreeItemData } from "./tree"
import { languageOf, tokenize, type Token } from "../../registry/uiset/ui/code/highlight"
import { indent, lineCol, moveLines, newline, offsetOf, outdent, type Edit, type Problem } from "../../registry/uiset/ui/ide/editing"
import { bindFileDrag, type FileDragOptions } from "../../registry/uiset/ui/ide/file-drag"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/code/code.css"
import "../../registry/uiset/ui/ide/ide.css"

// The IDE kit's parts in Solid, as React's: UI SDK's Tree, Tabs, Command and Dialog underneath,
// and the editing and file-drag logic shared (ide/editing.ts, ide/file-drag.ts).

const baseName = (path: string) => path.split("/").pop() ?? path
const dirName = (path: string) => path.split("/").slice(0, -1).join("/")

/* ------------------------------------------------------------------ File tree */

type FileStatus = "modified" | "added" | "deleted" | "untracked" | "conflict"

const statusMark: Record<FileStatus, [string, string]> = {
  modified: ["M", "modified"],
  added: ["A", "added"],
  deleted: ["D", "deleted"],
  untracked: ["U", "untracked"],
  conflict: ["!", "has conflicts"],
}

type FileTreeProps = {
  /** The tree's name, like "Files". */
  label: string
  /** Every file's path; a path ending in "/" is an empty folder. */
  paths: string[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (path: string | null) => void
  /** Enter or a click on a file. */
  onOpen?: (path: string) => void
  /** Version control marks, by path. Folders show when anything inside them changed. */
  status?: Record<string, FileStatus>
  defaultExpanded?: string[]
  /** Creates a file or folder at a path; return a message to refuse it. */
  onCreate?: (path: string, kind: "file" | "folder") => string | void
  /** Renames a file or folder; return a message to refuse it. */
  onRename?: (from: string, to: string) => string | void
  /** Moves a file or folder into a folder ("" for the top); return a message to refuse it. */
  onMove?: (from: string, toFolder: string) => string | void
  onDelete?: (path: string) => void
  /** Drives the tree from elsewhere: `createTreeController()`. */
  controller?: TreeController
  /** The level of the pane's heading, to fit the page's outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  class?: string
}

type NameDialog = { mode: "file" | "folder" | "rename" | "move"; path: string }

/** The tree's rows, keyed by path, so a change keeps every item, and the focused one. */
function FileItems(props: { list: TreeItemData[]; folders: Set<string>; status: Record<string, FileStatus>; changed: Set<string> }) {
  return (
    <For each={props.list} keyed={(item) => item.value}>
      {(item) => {
        const branch = () => props.folders.has(item().value)
        const mark = () => props.status[item().value]
        // The mark is a letter on screen; its name says it in words, after the file's name.
        const note = () => (mark() ? `, ${statusMark[mark()!][1]}` : branch() && props.changed.has(item().value) ? ", has changes" : "")
        return (
          <TreeItem value={item().value} label={item().label} class="ide-tree-item" data-status={mark()} data-path={item().value}>
            {/* The item takes its name from its label part. */}
            <TreeItemLabel class="ide-tree-label" aria-label={note() ? `${item().label}${note()}` : undefined}>
              <Show when={branch()} fallback={<span class="ide-tree-chevron" />}>
                <TreeItemIndicator class="ide-tree-chevron">
                  <Icon name="chevron" />
                </TreeItemIndicator>
              </Show>
              <Icon name={branch() ? "folder" : "file"} class="ide-tree-icon" />
              <span class="ide-tree-name">{item().label}</span>
              <Show when={mark()} fallback={<Show when={branch() && props.changed.has(item().value)}>{<span class="ide-tree-dot" aria-hidden="true" />}</Show>}>
                {(m) => (
                  <span class="ide-tree-mark" aria-hidden="true">
                    {statusMark[m()][0]}
                  </span>
                )}
              </Show>
            </TreeItemLabel>
            <Show when={item().children}>
              {(children) => (
                <TreeGroup>
                  <FileItems list={children()} folders={props.folders} status={props.status} changed={props.changed} />
                </TreeGroup>
              )}
            </Show>
          </TreeItem>
        )
      }}
    </For>
  )
}

/**
 * A project's files on UI SDK's Tree: folders first, version control marks, and New file,
 * New folder, Rename (F2), Move and Delete (Delete key) for the selected item.
 */
function FileTree(props: FileTreeProps) {
  const titleId = createUniqueId()
  const [own, setOwn] = createSignal<string | null>(untrack(() => props.defaultValue ?? null), { ownedWrite: true })
  const selected = () => (props.value === undefined ? own() : props.value)
  const select = (path: string | null) => {
    if (props.value === undefined) setOwn(path)
    props.onValueChange?.(path)
  }
  const tree = untrack(() => props.controller) ?? createTreeController()
  const status = () => props.status ?? {}
  // Folders first, then names without regard to case, as file managers sort.
  const items = createMemo(() => treeFromPaths([...props.paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))))
  const files = createMemo(() => new Set(props.paths.filter((p) => !p.endsWith("/"))))
  const folders = createMemo(() => {
    const set = new Set<string>()
    for (const p of props.paths) {
      const parts = p.replace(/\/$/, "").split("/")
      for (let i = 1; i < (p.endsWith("/") ? parts.length + 1 : parts.length); i++) set.add(parts.slice(0, i).join("/"))
    }
    return set
  })
  const isFolder = (path: string) => folders().has(path)
  const changedFolders = createMemo(() => {
    const set = new Set<string>()
    for (const p of Object.keys(status())) {
      const parts = p.split("/")
      for (let i = 1; i < parts.length; i++) set.add(parts.slice(0, i).join("/"))
    }
    return set
  })
  const [dialog, setDialog] = createSignal<NameDialog | null>(null)
  const [deleting, setDeleting] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const exists = (path: string) => files().has(path) || folders().has(path)
  // Focus follows a new, renamed or moved item once the tree has drawn it, opening folders
  // to show it: a frame later, after a closing dialog has handed focus back to its trigger.
  let revealing: string | null = null
  const [revealAsked, setRevealAsked] = createSignal(0)
  const setReveal = (path: string | null) => {
    revealing = path
    setRevealAsked((n) => n + 1)
  }
  let frame = 0
  // Only the browser sets a frame; the server runs cleanups too.
  onCleanup(() => {
    if (frame) cancelAnimationFrame(frame)
  })
  createEffect(
    () => {
      const asked = revealAsked()
      const path = revealing
      return { asked, path: path && exists(path) ? path : null }
    },
    ({ path }) => {
      if (!path || revealing !== path) return
      revealing = null
      frame = requestAnimationFrame(() => tree.reveal(path))
    },
  )

  const folderOf = (path: string | null) => (!path ? "" : isFolder(path) ? path : dirName(path))
  const join = (folder: string, name: string) => (folder ? `${folder}/${name}` : name)
  const neighbor = (path: string) => {
    const rows = visibleTreeRows(items(), tree.getExpanded()).map((row) => row.item.value)
    const at = rows.indexOf(path)
    return rows.slice(at + 1).find((v) => !v.startsWith(`${path}/`)) ?? rows.slice(0, Math.max(0, at)).at(-1) ?? null
  }

  const submit = (name: string, to?: string) => {
    const current = dialog()
    if (!current) return
    const clean = name.trim()
    if (current.mode !== "move") {
      if (!clean) return setError("Give it a name.")
      if (/[/\\]/.test(clean)) return setError("A name can't have slashes.")
    }
    const target =
      current.mode === "rename" ? join(dirName(current.path), clean) : current.mode === "move" ? join(to ?? "", baseName(current.path)) : join(current.path, clean)
    if (target === current.path) return setDialog(null)
    if (exists(target)) return setError(`${baseName(target)} already exists there.`)
    const refused =
      current.mode === "rename" ? props.onRename?.(current.path, target) : current.mode === "move" ? props.onMove?.(current.path, to ?? "") : props.onCreate?.(target, current.mode)
    if (refused) return setError(refused)
    setError(null)
    select(target)
    setReveal(target)
    setDialog(null)
  }

  // F2 and Delete act on the item with focus, which can differ from the selection.
  const keyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    if (target.closest("input, textarea")) return
    const path = target.closest<HTMLElement>("[data-path]")?.dataset.path
    if (!path) return
    if (event.key === "F2" && props.onRename) {
      event.preventDefault()
      setDialog({ mode: "rename", path })
    } else if ((event.key === "Delete" || (event.key === "Backspace" && event.metaKey)) && props.onDelete) {
      event.preventDefault()
      setDeleting(path)
    }
  }

  // A file or folder dragged onto a folder moves there, through the same checks as Move to….
  let section: HTMLElement | undefined
  const drag: FileDragOptions = {
    isFolder,
    isExpanded: (folder) => tree.getExpanded().includes(folder),
    expand: (folder) => void tree.expand(folder),
    move: (from, to) => {
      const target = join(to, baseName(from))
      if (exists(target)) return `${baseName(target)} already exists there.`
      const refused = props.onMove?.(from, to)
      if (refused) return refused
      setReveal(target)
      select(target)
    },
  }
  onSettled(() => {
    const list = section?.querySelector<HTMLElement>(".ide-tree")
    const area = section?.querySelector<HTMLElement>(".ide-tree-scroller")
    if (!props.onMove || !section || !list || !area) return
    return bindFileDrag(section, list, area, () => drag)
  })

  const canEdit = () => !!(props.onCreate || props.onRename || props.onMove || props.onDelete)
  const allFolders = () => ["", ...[...folders()].sort()]
  const dialogKey = createMemo(() => {
    const current = dialog()
    return current ? `${current.mode}:${current.path}` : null
  })
  const heading = () => `h${props.headingLevel ?? 2}`

  return (
    <section
      ref={(el: HTMLElement) => {
        section = el
      }}
      class={["ide-files", props.class].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
      data-movable={props.onMove ? "" : undefined}
    >
      <div class="ide-pane-header">
        <Heading level={heading()} id={titleId} class="ide-pane-title">
          {props.label}
        </Heading>
        <Show when={canEdit()}>
          <div class="ide-pane-actions">
            <Show when={props.onCreate}>
              <Button variant="ghost" aria-label="New file" onClick={() => setDialog({ mode: "file", path: folderOf(selected()) })}>
                <Icon name="file" />
              </Button>
              <Button variant="ghost" aria-label="New folder" onClick={() => setDialog({ mode: "folder", path: folderOf(selected()) })}>
                <Icon name="folder" />
              </Button>
            </Show>
            {/* Menu items run through the menu's onAction: Enter, Space or a click. */}
            <Menu
              onAction={(action: unknown) => {
                const path = selected()
                if (action === "collapse") tree.collapseAll()
                else if (!path) return
                else if (action === "rename") setDialog({ mode: "rename", path })
                else if (action === "move") setDialog({ mode: "move", path })
                else if (action === "copy") void navigator.clipboard?.writeText(path)
                else if (action === "delete") setDeleting(path)
              }}
            >
              <MenuTrigger data-variant="ghost" aria-label={`More file actions${selected() ? ` for ${baseName(selected()!)}` : ""}`}>
                <Icon name="more" />
              </MenuTrigger>
              <MenuContent>
                <Show when={props.onRename}>
                  <MenuItem value="rename" disabled={!selected()}>
                    Rename… <span class="ide-menu-key">F2</span>
                  </MenuItem>
                </Show>
                <Show when={props.onMove}>
                  <MenuItem value="move" disabled={!selected()}>
                    Move to…
                  </MenuItem>
                </Show>
                <MenuItem value="copy" disabled={!selected()}>
                  Copy path
                </MenuItem>
                <MenuItem value="collapse">Collapse folders</MenuItem>
                <Show when={props.onDelete}>
                  <MenuSeparator />
                  <MenuItem value="delete" destructive disabled={!selected()}>
                    Delete…
                  </MenuItem>
                </Show>
              </MenuContent>
            </Menu>
          </div>
        </Show>
      </div>
      <ScrollBox axis="both" data-frame="none" class="ide-tree-frame" viewport={{ class: "ide-tree-scroller", role: "group", "aria-label": "Files" }}>
        <Tree
          aria-labelledby={titleId}
          class="ide-tree"
          items={items()}
          controller={tree}
          value={selected()}
          onValueChange={(next: unknown, details?: { reason?: string }) => {
            select(next as string | null)
            // An agent's choice of a file opens it, as Enter or a click would for a person.
            if (details?.reason === "imperative" && typeof next === "string" && files().has(next)) props.onOpen?.(next)
          }}
          activation="automatic"
          defaultExpanded={props.defaultExpanded}
          onAction={(path: string) => {
            if (files().has(path)) props.onOpen?.(path)
          }}
          onKeyDown={keyDown}
        >
          <FileItems list={items()} folders={folders()} status={status()} changed={changedFolders()} />
        </Tree>
      </ScrollBox>

      <Dialog
        open={dialog() !== null}
        onOpenChange={(open: boolean) => {
          if (open) return
          setDialog(null)
          setError(null)
        }}
      >
        <DialogBackdrop />
        <DialogContent class="ide-dialog">
          <Show when={dialogKey()} keyed>
            {(_key: string) => {
              const current = untrack(dialog)!
              return (
                <form
                  class="ide-dialog-form"
                  aria-labelledby={`${titleId}-dialog`}
                  onSubmit={(event) => {
                    event.preventDefault()
                    const data = new FormData(event.currentTarget)
                    submit(String(data.get("name") ?? ""), String(data.get("folder") ?? ""))
                  }}
                >
                  <DialogTitle id={`${titleId}-dialog`}>
                    {current.mode === "file"
                      ? "New file"
                      : current.mode === "folder"
                        ? "New folder"
                        : current.mode === "rename"
                          ? `Rename ${baseName(current.path)}`
                          : `Move ${baseName(current.path)}`}
                  </DialogTitle>
                  <DialogDescription>
                    {current.mode === "move"
                      ? `From ${dirName(current.path) || "the top"}.`
                      : `In ${(current.mode === "rename" ? dirName(current.path) : current.path) || "the top folder"}.`}
                  </DialogDescription>
                  <Show
                    when={current.mode === "move"}
                    fallback={
                      <Field name="name" invalid={error() ? true : undefined}>
                        <FieldLabel>Name</FieldLabel>
                        <Input
                          required
                          autofocus
                          autocomplete="off"
                          spellcheck={false}
                          defaultValue={current.mode === "rename" ? baseName(current.path) : ""}
                          placeholder={current.mode === "folder" ? "components" : "index.ts"}
                          onInput={() => setError(null)}
                        />
                        <FieldError match="valueMissing">Give it a name.</FieldError>
                        <Show when={error()}>
                          <FieldError>{error()}</FieldError>
                        </Show>
                      </Field>
                    }
                  >
                    <Field name="folder">
                      <Select name="folder" defaultValue={dirName(current.path)}>
                        <SelectLabel>Folder</SelectLabel>
                        <SelectTrigger />
                        <SelectContent>
                          <For each={allFolders().filter((f) => f !== current.path && !f.startsWith(`${current.path}/`))}>
                            {(folder) => <SelectItem value={folder}>{folder || "Top folder"}</SelectItem>}
                          </For>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Show when={error()}>
                      <p class="ide-error" role="alert">
                        {error()}
                      </p>
                    </Show>
                  </Show>
                  <div class="ide-dialog-actions">
                    <DialogClose>Cancel</DialogClose>
                    <Button type="submit">{current.mode === "rename" ? "Rename" : current.mode === "move" ? "Move" : "Create"}</Button>
                  </div>
                </form>
              )
            }}
          </Show>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting() !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleting() ? baseName(deleting()!) : ""}?</AlertDialogTitle>
          <AlertDialogDescription>{deleting() && isFolder(deleting()!) ? "The folder goes with everything in it." : "It can't be brought back here."}</AlertDialogDescription>
          <div class="ide-dialog-actions">
            <AlertDialogClose>Keep it</AlertDialogClose>
            <AlertDialogClose
              data-variant="destructive"
              data-agent-confirm={`Deletes ${deleting() ?? "the file"}`}
              onClick={() => {
                const path = deleting()
                if (!path) return
                const next = neighbor(path)
                props.onDelete?.(path)
                announce(`Deleted ${baseName(path)}.`)
                select(next)
                setReveal(next)
              }}
            >
              Delete
            </AlertDialogClose>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

/** A heading at a level chosen at runtime. */
function Heading(props: { level: string; id: string; class: string; children: JSX.Element }) {
  return (
    <Dynamic component={props.level} id={props.id} class={props.class}>
      {props.children}
    </Dynamic>
  )
}

/* ---------------------------------------------------------------- Editor tabs */

type EditorFile = { path: string; dirty?: boolean }

/** The tab that takes over when `path` closes: the one after it, else the one before. */
function nextTab(paths: string[], path: string) {
  const at = paths.indexOf(path)
  return paths[at + 1] ?? paths[at - 1] ?? null
}

/**
 * Open files as tabs on UI SDK's Tabs. Delete on a tab, a middle click or its × asks to
 * close it through `onClose`, which may refuse (to ask about unsaved changes first); once
 * the file leaves `files`, focus goes to the tab that took over, or to the empty pane.
 * Every open file keeps its own panel, so an editor keeps its caret, scroll and undo.
 */
function EditorTabs(props: {
  label?: string
  files: EditorFile[]
  value: string | null
  onValueChange: (path: string) => void
  /** Asks to close a file. Remove it from `files` (and pick the next `value`, see `nextTab`) to close it. */
  onClose: (path: string) => void
  /** A file's content, like a CodeEditor: drawn once for each open file and kept while hidden. */
  children: (path: string) => JSX.Element
  /** Shown with no files open. */
  empty?: JSX.Element
  class?: string
}) {
  const tabs = new Map<string, HTMLElement>()
  let emptyPane: HTMLDivElement | undefined
  let closing: string | null = null
  const names = createMemo(() => {
    const map = new Map<string, number>()
    for (const f of props.files) map.set(baseName(f.path), (map.get(baseName(f.path)) ?? 0) + 1)
    return map
  })
  // The tab shown: the chosen one while it's open, else the first.
  const current = createMemo(() => (props.value && props.files.some((f) => f.path === props.value) ? props.value : (props.files[0]?.path ?? null)))
  const close = (path: string) => {
    closing = path
    props.onClose(path)
  }
  // Once a closed file has gone, focus the tab that took over, or the empty pane. A close
  // that was refused (a dialog asking first) leaves focus to that dialog.
  createEffect(
    () => ({ paths: props.files.map((f) => f.path), shown: current() }),
    ({ paths, shown }) => {
      const gone = closing
      if (!gone || paths.includes(gone)) return
      closing = null
      keepFocus(() => (shown ? tabs.get(shown) : emptyPane) ?? undefined)
    },
  )
  const classes = (base: string) => [base, props.class].filter(Boolean).join(" ")
  return (
    <Show
      when={props.files.length}
      fallback={
        <div
          ref={(el: HTMLDivElement) => {
            emptyPane = el
          }}
          tabindex={-1}
          class={classes("ide-editor-empty")}
        >
          {props.empty}
        </div>
      }
    >
      <Tabs
        class={classes("ide-tabs")}
        value={current()}
        onValueChange={(next: unknown) => {
          props.onValueChange(String(next))
        }}
      >
        <ScrollBox axis="x" data-frame="none" class="ide-tab-strip" viewport={{ class: "ide-tab-scroller", role: "group", "aria-label": "Tabs" }}>
          <TabsList class="ide-tab-list" aria-label={props.label ?? "Open files"}>
            <For each={props.files} keyed={(file) => file.path}>
              {(file) => {
                // Memos, so a new list with the same tab in it doesn't redraw the tab: Tabs
                // redraws the ones whose selection changed, once.
                const path = untrack(() => file().path)
                const name = baseName(path)
                const twin = createMemo(() => (names().get(name) ?? 0) > 1)
                const dirty = createMemo(() => !!file().dirty)
                const label = createMemo(() => `${name}${twin() ? ` ${dirName(path)}` : ""}${dirty() ? ", unsaved" : ""}`)
                onCleanup(() => tabs.delete(path))
                return (
                  <span class="ide-tab" role="presentation" data-dirty={dirty() ? "" : undefined}>
                    <TabsTab
                      value={path}
                      ref={(el: HTMLElement) => {
                        tabs.set(path, el)
                      }}
                      class="ide-tab-button"
                      title={path}
                      // Visible text first, then what the dot means.
                      aria-label={label()}
                      onKeyDown={(event: KeyboardEvent) => {
                        if (event.key === "Delete") {
                          event.preventDefault()
                          close(path)
                        }
                      }}
                      onAuxClick={(event: MouseEvent) => {
                        if (event.button === 1) close(path)
                      }}
                    >
                      <Icon name="file" class="ide-tab-icon" />
                      <span class="ide-tab-name">{name}</span>
                      <Show when={twin()}>
                        <span class="ide-tab-dir">{dirName(path)}</span>
                      </Show>
                    </TabsTab>
                    {/* The keyboard closes a tab with Delete; this button is for the pointer, and never takes focus. */}
                    <button
                      type="button"
                      class="ide-tab-close"
                      tabindex={-1}
                      aria-hidden="true"
                      title={`Close ${name}`}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => close(path)}
                    >
                      <Icon name="close" />
                    </button>
                  </span>
                )
              }}
            </For>
          </TabsList>
        </ScrollBox>
        <For each={props.files} keyed={(file) => file.path}>
          {(file) => {
            const path = untrack(() => file().path)
            return (
              <TabsPanel value={path} class="ide-tab-panel" keepMounted>
                {untrack(() => props.children(path))}
              </TabsPanel>
            )
          }}
        </For>
      </Tabs>
    </Show>
  )
}

/* ---------------------------------------------------------------- Code editor */

type CodeEditorHandle = {
  focus(): void
  /** Puts the caret at a line and column (from 1) and scrolls it into view. */
  goTo(line: number, col?: number): void
}

type CodeEditorProps = {
  /** The editor's name, like the file's path. */
  label: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** For syntax colors: a path ("app.tsx") or a language ("tsx"). */
  path?: string
  language?: string
  readOnly?: boolean
  /** Spaces per indent. */
  tabSize?: number
  /** Where the caret is: on every move, on focus, and when it mounts. */
  onCursorChange?: (cursor: { line: number; col: number }) => void
  /** This file's problems: marked in the gutter; F8 and Shift+F8 go between them. */
  problems?: Problem[]
  /** Gets the editor's handle once it's on the page, and null when it leaves. */
  ref?: (handle: CodeEditorHandle | null) => void
  class?: string
}

const LINE = 20 // px: --code-line in ide.css
const PAD = 12 // px: --code-pad

const glyph = { error: "●", warning: "▲", info: "■" } as const

/**
 * A code editor on a native textarea (UI SDK's Textarea, so agents can read and write it)
 * with line numbers and syntax colors drawn behind the text. Tab indents and Shift+Tab
 * outdents; press Escape first to let Tab leave the editor. Enter keeps the indent.
 */
function CodeEditor(props: CodeEditorProps) {
  const hintId = createUniqueId()
  const [own, setOwn] = createSignal(untrack(() => props.value ?? props.defaultValue ?? ""), { ownedWrite: true })
  const text = () => props.value ?? own()
  // The textarea keeps its own text: the first is the only one it's given as a default.
  const initial = untrack(text)
  let input: HTMLTextAreaElement | undefined
  let scroller: HTMLDivElement | undefined
  let bar: HTMLDivElement | undefined
  let escaped = false
  const unit = () => " ".repeat(props.tabSize ?? 2)
  const lang = () => props.language ?? (props.path ? languageOf(props.path) : undefined)
  const problems = () => props.problems ?? []

  // The textarea keeps its own text, so the browser's typing and undo stay whole. New text
  // reaches the app a frame later; text the app changes is written back here.
  let pending: number | null = null
  // The texts this editor sent up and hasn't seen back: when one comes back as `value`,
  // it's an echo, not news, even if updates lag behind the typing.
  let sent: string[] = []
  const report = () => {
    pending = null
    const next = input?.value ?? ""
    sent.push(next)
    if (props.value === undefined) setOwn(next)
    props.onValueChange?.(next)
  }
  let applying = false
  const changed = () => {
    // An edit the editor makes (Tab, Enter) records itself, as one step.
    if (!applying) remember("typing")
    if (pending === null) pending = requestAnimationFrame(report)
  }

  // Undo is the editor's own. In Chrome any text change on the page while typing (the
  // colors here) ends the browser's undo step at every key, so a run of typing couldn't be
  // one step. Typing joins one step until a pause or a caret move; Tab, Enter and changes
  // from outside are steps of their own; the caret comes back with the text.
  type Snapshot = { text: string; start: number; end: number }
  const history = createUndoStack<Snapshot>({ text: initial, start: 0, end: 0 }, { limit: 500, groupDelay: 800 })
  // Where the last edit left the caret: a caret anywhere else moved on its own.
  let editedAt = -1
  const remember = (group: string) => {
    const el = input
    if (!el) return
    editedAt = el.selectionEnd
    history.record({ text: el.value, start: el.selectionStart, end: el.selectionEnd }, { group })
  }
  const restore = (snapshot: Snapshot | undefined) => {
    const el = input
    if (!snapshot || !el) return
    el.value = snapshot.text
    el.setSelectionRange(snapshot.start, snapshot.end)
    if (pending === null) pending = requestAnimationFrame(report)
    track()
    showCaret()
  }
  const step = (back: boolean) => {
    history.seal()
    restore(back ? history.undo() : history.redo())
  }
  onCleanup(() => {
    if (pending !== null) cancelAnimationFrame(pending)
    if (cursorFrame !== null) cancelAnimationFrame(cursorFrame)
  })
  // Text from elsewhere (a command, an agent) is written in; an echo of typing that has
  // since moved on is not.
  createEffect(text, (next) => {
    const el = input
    if (!el) return
    const echo = sent.indexOf(next)
    if (echo >= 0) {
      sent = sent.slice(echo + 1)
      return
    }
    sent = []
    if (el.value === next) return
    el.value = next
    // A change from outside (a command, an agent) is an undo step of its own.
    history.seal()
    remember("outside")
    history.seal()
  })

  // Colors arrive after typing pauses, longer for long files; meanwhile, lines that haven't
  // changed keep theirs.
  const [colored, setColored] = createSignal<Map<string, Token[]> | null>(null, { ownedWrite: true })
  const lines = createMemo(() => text().split("\n"))
  createEffect(
    () => ({ source: text(), language: lang(), count: lines().length }),
    ({ source, language, count }) => {
      if (!language) return
      let current = true
      const timer = setTimeout(
        () => {
          tokenize(source, language)
            .then((tokens) => {
              if (!current || !tokens) return
              const byLine = new Map<string, Token[]>()
              source.split("\n").forEach((line, i) => !byLine.has(line) && tokens[i] && byLine.set(line, tokens[i]!))
              setColored(byLine)
            })
            .catch(() => {})
        },
        Math.min(400, 40 + count / 10),
      )
      return () => {
        current = false
        clearTimeout(timer)
      }
    },
  )

  const marks = createMemo(() => {
    const map = new Map<number, Problem["severity"]>()
    const rank = { error: 3, warning: 2, info: 1 }
    for (const p of problems()) {
      const was = map.get(p.line)
      if (!was || rank[p.severity] > rank[was]) map.set(p.line, p.severity)
    }
    return map
  })

  // The caret's line is one bar moved under the text, so a caret move redraws nothing.
  let cursor = { line: 1, col: 1 }
  let cursorFrame: number | null = null
  const track = () => {
    const el = input
    if (!el) return
    const at = lineCol(el.value, el.selectionStart)
    if (bar) bar.style.translate = `0 ${(at.line - 1) * LINE}px`
    if (at.line !== cursor.line || at.col !== cursor.col) {
      cursor = at
      // Reported once a frame.
      if (cursorFrame === null)
        cursorFrame = requestAnimationFrame(() => {
          cursorFrame = null
          props.onCursorChange?.(cursor)
        })
    }
  }
  const showCaret = () => {
    const el = input
    const frame = scroller
    if (!el || !frame) return
    const at = lineCol(el.value, el.selectionEnd)
    const top = (at.line - 1) * LINE + PAD
    const pad = LINE * 2
    if (top < frame.scrollTop + pad) frame.scrollTop = Math.max(0, top - pad)
    else if (top + LINE > frame.scrollTop + frame.clientHeight - pad) frame.scrollTop = top + LINE - frame.clientHeight + pad
  }
  const goTo = (line: number, col = 1) => {
    const el = input
    if (!el) return
    const at = offsetOf(el.value, line, col)
    el.focus()
    el.setSelectionRange(at, at)
    track()
    showCaret()
  }
  untrack(() => props.ref?.({ focus: () => input?.focus(), goTo }))
  onCleanup(() => untrack(() => props.ref?.(null)))

  // The caret's line and column, however it moved: keys, the pointer, or an edit.
  onSettled(() => {
    props.onCursorChange?.(cursor)
    const moved = () => {
      const el = input
      if (!el || document.activeElement !== el) return
      // The caret moving on its own (arrows, a click) ends a run of typing.
      if (el.selectionEnd !== editedAt || el.selectionStart !== el.selectionEnd) history.seal()
      track()
      showCaret()
    }
    document.addEventListener("selectionchange", moved)
    return () => document.removeEventListener("selectionchange", moved)
  })

  // One native edit, so the browser's own undo keeps working.
  const apply = (edit: Edit) => {
    const el = input!
    history.seal()
    el.setSelectionRange(edit.from, edit.to)
    applying = true
    const done = document.execCommand?.("insertText", false, edit.insert)
    if (!done) {
      el.setRangeText(edit.insert, edit.from, edit.to, "end")
      changed()
    }
    applying = false
    el.setSelectionRange(edit.start, edit.end)
    remember("edit")
    history.seal()
    track()
    showCaret()
  }

  const keyDown = (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const el = event.currentTarget
    if (event.isComposing) return
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey
    const readOnly = props.readOnly ?? false
    if (!readOnly && (matchesShortcut(event, "mod+shift+z") || matchesShortcut(event, "mod+y"))) {
      event.preventDefault()
      step(false)
      return
    }
    if (!readOnly && matchesShortcut(event, "mod+z")) {
      event.preventDefault()
      step(true)
      return
    }
    if (event.key === "Escape") {
      escaped = true
      return
    }
    // After Escape, Tab moves focus on like anywhere else.
    if (event.key === "Tab" && plain && escaped) {
      escaped = false
      return
    }
    escaped = false
    const list = problems()
    if (event.key === "F8" && list.length) {
      event.preventDefault()
      const sorted = [...list].sort((a, b) => a.line - b.line || (a.col ?? 1) - (b.col ?? 1))
      const line = lineCol(el.value, el.selectionStart).line
      const next = event.shiftKey ? ([...sorted].reverse().find((p) => p.line < line) ?? sorted.at(-1)!) : (sorted.find((p) => p.line > line) ?? sorted[0]!)
      goTo(next.line, next.col)
      announce(`Line ${next.line}: ${next.severity}, ${next.message}`)
      return
    }
    // The textarea is as tall as its text, so Page Up and Page Down move the caret by a
    // frame's worth of lines, as editors do; the frame follows it.
    if ((event.key === "PageDown" || event.key === "PageUp") && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const page = Math.max(1, Math.floor((scroller?.clientHeight ?? LINE * 10) / LINE) - 1)
      const to = moveLines(el.value, el.selectionEnd, event.key === "PageDown" ? page : -page)
      el.setSelectionRange(event.shiftKey ? Math.min(el.selectionStart, to) : to, event.shiftKey ? Math.max(el.selectionStart, to) : to)
      return
    }
    if (readOnly) return
    if (event.key === "Tab" && plain) {
      event.preventDefault()
      apply((event.shiftKey ? outdent : indent)(el.value, el.selectionStart, el.selectionEnd, unit()))
      return
    }
    if (event.key === "Enter" && plain && !event.shiftKey) {
      event.preventDefault()
      apply(newline(el.value, el.selectionStart, el.selectionEnd, unit()))
    }
  }

  const width = createMemo(() => lines().reduce((most, line) => Math.max(most, line.length), 1))
  const numbers = createMemo(() => Array.from({ length: lines().length }, (_, i) => i + 1))

  return (
    // Code reads left to right and isn't translated, whatever the page's language does.
    <div class={["ide-code", props.class].filter(Boolean).join(" ")} data-readonly={props.readOnly ? "" : undefined} dir="ltr" translate="no">
      <ScrollBox
        axis="both"
        data-frame="none"
        class="ide-code-frame"
        viewport={{
          class: "ide-code-scroll",
          role: "group",
          "aria-label": "Lines",
          ref: (el: HTMLDivElement) => {
            scroller = el
          },
          get style() {
            return { "--code-digits": String(String(lines().length).length) }
          },
        }}
      >
        <div class="ide-code-lines">
          <div class="ide-code-gutter" aria-hidden="true">
            <For each={numbers()}>
              {(number) => (
                <span class="ide-code-number" data-problem={marks().get(number)}>
                  <Show when={marks().get(number)}>{(mark) => <span class="ide-code-mark">{glyph[mark()]}</span>}</Show>
                  {number}
                </span>
              )}
            </For>
          </div>
          <div class="ide-code-body" style={{ "--code-columns": String(width()) }}>
            <div
              ref={(el: HTMLDivElement) => {
                bar = el
              }}
              class="ide-code-current"
              aria-hidden="true"
            />
            <pre class="ide-code-colors" aria-hidden="true">
              <For each={lines()} keyed={false}>
                {(line) => (
                  // Lines whose tokens are known keep their colors while an edit is being colored.
                  <span class="ide-code-line">
                    <Show when={lang() ? colored()?.get(line()) : undefined} fallback={line()}>
                      {(tokens) => (
                        <For each={tokens()} keyed={false}>
                          {(token) => <span style={token().color ? { color: token().color } : undefined}>{token().content}</span>}
                        </For>
                      )}
                    </Show>
                    {"\n"}
                  </span>
                )}
              </For>
            </pre>
            <Textarea
              ref={(el: HTMLTextAreaElement) => {
                input = el
              }}
              class="ide-code-input"
              aria-label={props.label}
              aria-describedby={hintId}
              defaultValue={initial}
              onValueChange={changed}
              readonly={props.readOnly ?? false}
              wrap="off"
              spellcheck={false}
              autocapitalize="off"
              autocomplete="off"
              autocorrect="off"
              onKeyDown={keyDown}
              // Undo and Redo from the Edit menu or a gesture take the same steps.
              onBeforeInput={(event: InputEvent) => {
                if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
                  event.preventDefault()
                  step(event.inputType === "historyUndo")
                }
              }}
              onFocus={() => {
                escaped = false
                props.onCursorChange?.(cursor)
              }}
              onPointerDown={() => {
                escaped = false
              }}
            />
          </div>
        </div>
      </ScrollBox>
      <p id={hintId} hidden>
        {props.readOnly
          ? "Read only."
          : `Tab indents and Shift+Tab outdents; press Escape, then Tab, to leave the editor.${
              problems().length ? ` ${problems().length} ${problems().length === 1 ? "problem" : "problems"}; F8 goes to the next.` : ""
            }`}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------- Command palette */

type PaletteCommand = { value: string; label: string; shortcut?: string; keywords?: string[] }
type PaletteItem = { value: string; label: string; shortcut?: string; keywords?: string[] }

/**
 * Go to a file, run a command (start with >) or go to a line (start with :), on UI SDK's
 * Command in a Dialog. Two triggers open it: files with ⌘P / Ctrl+P, commands with
 * ⌘⇧P / Ctrl+Shift+P.
 */
function CommandPalette(props: {
  files: string[]
  /** Shown first while nothing is typed. */
  recent?: string[]
  commands?: PaletteCommand[]
  onOpenFile: (path: string) => void
  onCommand?: (value: string) => void
  /** Without it, ":" doesn't go to lines. */
  onGoToLine?: (line: number) => void
  class?: string
}) {
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal("")
  // Each trigger says what it opens, so its shortcut starts the right search too.
  const palette = createDialogController<"files" | "commands">()
  const start = (what: unknown) => setQuery(what === "commands" ? "> " : "")
  // Escape goes back where you were (the editor, say), not to the trigger.
  let returnTo: HTMLElement | null = null
  const commands = () => props.commands ?? []
  const mode = () => (query().startsWith(">") ? "commands" : query().startsWith(":") && props.onGoToLine ? "line" : "files")
  const text = () => query().replace(/^[>:]\s*/, "")
  const items = createMemo<PaletteItem[]>(() => {
    const line = Number.parseInt(text(), 10)
    const recent = props.recent ?? []
    if (mode() === "commands") return commands().map((c) => ({ value: `cmd:${c.value}`, label: c.label, keywords: c.keywords, shortcut: c.shortcut }))
    if (mode() === "line") return Number.isFinite(line) && line > 0 ? [{ value: `line:${line}`, label: `Go to line ${line}` }] : []
    return [
      ...(text() ? [] : recent.filter((p) => props.files.includes(p)).map((p) => ({ value: `file:${p}`, label: p, keywords: ["recent"] }))),
      ...props.files.filter((p) => text() || !recent.includes(p)).map((p) => ({ value: `file:${p}`, label: p })),
    ]
  })

  const run = (value: string) => {
    setOpen(false)
    if (value.startsWith("file:")) props.onOpenFile(value.slice(5))
    else if (value.startsWith("cmd:")) props.onCommand?.(value.slice(4))
    else if (value.startsWith("line:")) props.onGoToLine?.(Number(value.slice(5)))
  }

  return (
    <Dialog
      controller={palette}
      open={open()}
      onOpenChange={(next: boolean) => {
        if (next) {
          start(palette.getPayload())
          const was = document.activeElement
          returnTo = was instanceof HTMLElement && was !== document.body ? was : null
        }
        setOpen(next)
      }}
      onPayloadChange={(what: unknown) => start(what)}
    >
      <div class={["ide-palette-triggers", props.class].filter(Boolean).join(" ")}>
        <DialogTrigger class="ide-palette-trigger" shortcut="mod+p" payload="files">
          <Icon name="search" />
          <span>Go to file…</span>
        </DialogTrigger>
        <Show when={commands().length > 0}>
          <DialogTrigger data-variant="ghost" shortcut="mod+shift+p" payload="commands">
            Commands…
          </DialogTrigger>
        </Show>
      </div>
      <DialogBackdrop />
      {/* Kept in the page, so its title names the dialog while it's closed: with two triggers it
          takes no name from either (UI SDK's advice for a dialog with several triggers). */}
      <DialogContent class="ide-palette" keepMounted initialFocus="input" finalFocus={() => (returnTo?.isConnected ? returnTo : undefined)}>
        <DialogTitle class="uiset-visually-hidden">{mode() === "commands" ? "Run a command" : mode() === "line" ? "Go to line" : "Go to file"}</DialogTitle>
        <Command
          items={items() as CommandData}
          query={query()}
          onQueryChange={(next: string, details?: { reason?: string; cancel?: () => void }) => {
            // Escape closes the palette, rather than first clearing a ">" or ":": the clear is
            // refused, so UI SDK doesn't wait for a query that won't come.
            if (details?.reason === "escape-key") {
              details.cancel?.()
              setOpen(false)
            } else setQuery(next)
          }}
          filter={(item: { label: string; keywords?: string[] }) => (mode() === "line" || !text() ? 1 : fuzzyScore([item.label, ...(item.keywords ?? [])].join(" "), text()))}
          onAction={(value: string) => run(value)}
        >
          <div class="ide-palette-search">
            <Icon name="search" />
            <CommandInput
              // The shortcuts switch modes here too, instead of reaching the browser's Print.
              onKeyDown={(event: KeyboardEvent) => {
                if (matchesShortcut(event, "mod+shift+p")) {
                  event.preventDefault()
                  setQuery("> ")
                } else if (matchesShortcut(event, "mod+p")) {
                  event.preventDefault()
                  setQuery("")
                }
              }}
              aria-label="Go to a file, a command after >, or a line after :"
              placeholder={commands().length ? "Search files, > for commands, : for a line" : "Search files"}
            />
          </div>
          <CommandEmpty class="ide-palette-empty">{mode() === "line" ? "Type a line number." : "Nothing matches."}</CommandEmpty>
          <CommandList class="ide-palette-list">
            {(state: { items: CommandData }) => (
              <For each={state.items as PaletteItem[]} keyed={(item) => item.value}>
                {(item) => {
                  const isFile = () => item().value.startsWith("file:")
                  const label = () => (isFile() ? baseName(item().label) : item().label)
                  return (
                    <CommandItem value={item().value} shortcut={item().shortcut} class="ide-palette-item">
                      <Show when={isFile()}>
                        <Icon name="file" />
                      </Show>
                      <span class="ide-palette-label">
                        <For each={matchSegments(label(), text() ? matchRanges(label(), text(), "fuzzy") : [])} keyed={false}>
                          {(part) => (
                            <Show when={part().match} fallback={<span>{part().text}</span>}>
                              <mark>{part().text}</mark>
                            </Show>
                          )}
                        </For>
                      </span>
                      <Show when={isFile() && dirName(item().label)}>
                        <span class="ide-palette-dir">{dirName(item().label)}</span>
                      </Show>
                      <Show when={isFile() && !text() && item().keywords?.includes("recent")}>
                        <span class="ide-palette-dir">recent</span>
                      </Show>
                      <Show when={item().shortcut}>
                        <CommandShortcut class="ide-palette-key">{(s: { text: string }) => s.text}</CommandShortcut>
                      </Show>
                    </CommandItem>
                  )
                }}
              </For>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------- Problems and status bar */

const severityName = { error: "Error", warning: "Warning", info: "Note" } as const
const severityIcon = { error: "danger", warning: "warning", info: "info" } as const

/** Every problem, worst first; choosing one opens its file at the line. */
function ProblemsList(props: { problems: Problem[]; onChoose: (problem: Problem) => void; empty?: string }) {
  const rank = { error: 0, warning: 1, info: 2 }
  const sorted = createMemo(() => [...props.problems].sort((a, b) => rank[a.severity] - rank[b.severity] || a.path.localeCompare(b.path) || a.line - b.line))
  return (
    <Show when={props.problems.length} fallback={<p class="ide-problems-empty">{props.empty ?? "No problems found."}</p>}>
      <ul class="ide-problems">
        <For each={sorted()} keyed={false}>
          {(p) => (
            <li>
              <Button variant="ghost" class="ide-problem" data-severity={p().severity} onClick={() => props.onChoose(p())}>
                <Icon name={severityIcon[p().severity]} class="ide-problem-icon" />
                <span class="uiset-visually-hidden">{severityName[p().severity]}: </span>
                <span class="ide-problem-message">{p().message}</span>
                {/* A space in the name, which the layout's columns don't need. */}
                <span class="uiset-visually-hidden"> </span>
                {/* The file's name, not its path: an agent naming the editor by path finds only it. */}
                <span class="ide-problem-where" title={p().path}>
                  {baseName(p().path)}:{p().line}
                  {p().col ? `:${p().col}` : ""}
                </span>
              </Button>
            </li>
          )}
        </For>
      </ul>
    </Show>
  )
}

/** The strip along the bottom: branch, problems, cursor, language. Items are text or buttons. */
function StatusBar(props: { label?: string; children: JSX.Element }) {
  return (
    <div class="ide-status" role="group" aria-label={props.label ?? "Status"}>
      {props.children}
    </div>
  )
}

function StatusBarItem(props: { children: JSX.Element; onClick?: () => void; label?: string }) {
  return (
    <Show when={props.onClick} fallback={<span class="ide-status-item">{props.children}</span>}>
      {(onClick) => (
        <Button variant="ghost" class="ide-status-item" onClick={() => onClick()()} aria-label={props.label}>
          {props.children}
        </Button>
      )}
    </Show>
  )
}

export { CodeEditor, CommandPalette, EditorTabs, FileTree, nextTab, ProblemsList, StatusBar, StatusBarItem }
export type { CodeEditorHandle, CodeEditorProps, EditorFile, FileStatus, FileTreeProps, PaletteCommand, Problem }
