"use client"

import { announce, createUndoStack, keepFocus, matchesShortcut } from "@ui-sdk/core"
import { fuzzyScore, matchRanges, matchSegments } from "@ui-sdk/core/text-match"
import { flushSync } from "react-dom"
import {
  memo,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from "react"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "./alert-dialog"
import { Button } from "./button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandShortcut, type CommandData } from "./command"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  createDialogController,
} from "./dialog"
import { Field, FieldError, FieldLabel, Input } from "./field"
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./menu"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"
import { ScrollBox } from "./scroll-area"
import { Icon } from "./shell/icons"
import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs"
import { Textarea } from "./textarea"
import {
  Tree,
  TreeGroup,
  TreeItem,
  TreeItemIndicator,
  TreeItemLabel,
  createTreeController,
  treeFromPaths,
  visibleTreeRows,
  type TreeController,
  type TreeItemData,
} from "./tree"
import { languageOf, tokenize, type Token } from "./code/highlight"
import { indent, lineCol, moveLines, newline, offsetOf, outdent, type Edit, type Problem } from "./ide/editing"
import { bindFileDrag, type FileDragOptions } from "./ide/file-drag"
import "./shell/shell.css"
import "./code/code.css"
import "./ide/ide.css"

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
  className?: string
}

type NameDialog = { mode: "file" | "folder" | "rename" | "move"; path: string }

/** The tree's rows, defined once so a re-render keeps every item, and the focused one. */
function FileItems({
  list,
  folders,
  status,
  changed,
}: {
  list: TreeItemData[]
  folders: Set<string>
  status: Record<string, FileStatus>
  changed: Set<string>
}) {
  return list.map((item) => {
    const branch = folders.has(item.value)
    const mark = status[item.value]
    // The mark is a letter on screen; its name says it in words, after the file's name.
    const note = mark ? `, ${statusMark[mark][1]}` : branch && changed.has(item.value) ? ", has changes" : ""
    return (
      <TreeItem key={item.value} value={item.value} label={item.label} className="ide-tree-item" data-status={mark} data-path={item.value}>
        {/* The item takes its name from its label part. */}
        <TreeItemLabel className="ide-tree-label" aria-label={note ? `${item.label}${note}` : undefined}>
          {branch ? (
            <TreeItemIndicator className="ide-tree-chevron">
              <Icon name="chevron" />
            </TreeItemIndicator>
          ) : (
            <span className="ide-tree-chevron" />
          )}
          <Icon name={branch ? "folder" : "file"} className="ide-tree-icon" />
          <span className="ide-tree-name">{item.label}</span>
          {mark ? (
            <span className="ide-tree-mark" aria-hidden="true">
              {statusMark[mark][0]}
            </span>
          ) : branch && changed.has(item.value) ? (
            <span className="ide-tree-dot" aria-hidden="true" />
          ) : null}
        </TreeItemLabel>
        {item.children && (
          <TreeGroup>
            <FileItems list={item.children} folders={folders} status={status} changed={changed} />
          </TreeGroup>
        )}
      </TreeItem>
    )
  })
}

/**
 * A project's files on UI SDK's Tree: folders first, version control marks, and New file,
 * New folder, Rename (F2), Move and Delete (Delete key) for the selected item.
 */
function FileTree({
  label,
  paths,
  value,
  defaultValue = null,
  onValueChange,
  onOpen,
  status = {},
  defaultExpanded,
  onCreate,
  onRename,
  onMove,
  onDelete,
  controller,
  headingLevel = 2,
  className,
}: FileTreeProps) {
  const Heading = `h${headingLevel}` as "h2"
  const titleId = useId()
  const [own, setOwn] = useState<string | null>(defaultValue)
  const selected = value === undefined ? own : value
  const select = (path: string | null) => {
    if (value === undefined) setOwn(path)
    onValueChange?.(path)
  }
  const [tree] = useState(() => controller ?? createTreeController())
  // Folders first, then names without regard to case, as file managers sort.
  const items = treeFromPaths([...paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })))
  const files = new Set(paths.filter((p) => !p.endsWith("/")))
  const folders = new Set<string>()
  for (const p of paths) {
    const parts = p.replace(/\/$/, "").split("/")
    for (let i = 1; i < (p.endsWith("/") ? parts.length + 1 : parts.length); i++) folders.add(parts.slice(0, i).join("/"))
  }
  const isFolder = (path: string) => folders.has(path)
  const changedFolders = new Set<string>()
  for (const p of Object.keys(status)) {
    const parts = p.split("/")
    for (let i = 1; i < parts.length; i++) changedFolders.add(parts.slice(0, i).join("/"))
  }
  const [dialog, setDialog] = useState<NameDialog | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Focus follows a new, renamed or moved item once the tree has rendered it.
  const reveal = useRef<string | null>(null)
  useEffect(() => {
    const path = reveal.current
    if (!path || !(files.has(path) || folders.has(path))) return
    reveal.current = null
    // A frame later, after a closing dialog has handed focus back to its trigger.
    const frame = requestAnimationFrame(() => tree.reveal(path))
    return () => cancelAnimationFrame(frame)
  })

  const folderOf = (path: string | null) => (!path ? "" : isFolder(path) ? path : dirName(path))
  const join = (folder: string, name: string) => (folder ? `${folder}/${name}` : name)
  const exists = (path: string) => files.has(path) || folders.has(path)
  const neighbor = (path: string) => {
    const rows = visibleTreeRows(items, tree.getExpanded()).map((row) => row.item.value)
    const at = rows.indexOf(path)
    return rows.slice(at + 1).find((v) => !v.startsWith(`${path}/`)) ?? rows.slice(0, Math.max(0, at)).at(-1) ?? null
  }

  const submit = (name: string, to?: string) => {
    if (!dialog) return
    const clean = name.trim()
    if (dialog.mode !== "move") {
      if (!clean) return setError("Give it a name.")
      if (/[/\\]/.test(clean)) return setError("A name can't have slashes.")
    }
    const target =
      dialog.mode === "rename"
        ? join(dirName(dialog.path), clean)
        : dialog.mode === "move"
          ? join(to ?? "", baseName(dialog.path))
          : join(dialog.path, clean)
    if (target === dialog.path) return setDialog(null)
    if (exists(target)) return setError(`${baseName(target)} already exists there.`)
    const refused =
      dialog.mode === "rename"
        ? onRename?.(dialog.path, target)
        : dialog.mode === "move"
          ? onMove?.(dialog.path, to ?? "")
          : onCreate?.(target, dialog.mode)
    if (refused) return setError(refused)
    setError(null)
    setDialog(null)
    reveal.current = target
    select(target)
  }

  // F2 and Delete act on the item with focus, which can differ from the selection.
  const keyDown = (event: ReactKeyboardEvent) => {
    const target = event.target as HTMLElement
    if (target.closest("input, textarea")) return
    const path = target.closest<HTMLElement>("[data-path]")?.dataset.path
    if (!path) return
    if (event.key === "F2" && onRename) {
      event.preventDefault()
      setDialog({ mode: "rename", path })
    } else if ((event.key === "Delete" || (event.key === "Backspace" && event.metaKey)) && onDelete) {
      event.preventDefault()
      setDeleting(path)
    }
  }

  // A file or folder dragged onto a folder moves there, through the same checks as Move to….
  const section = useRef<HTMLElement>(null)
  const drag = useRef<FileDragOptions | null>(null)
  useLayoutEffect(() => {
    drag.current = {
      isFolder,
      isExpanded: (folder) => tree.getExpanded().includes(folder),
      expand: (folder) => void tree.expand(folder),
      move: (from, to) => {
        const target = join(to, baseName(from))
        if (exists(target)) return `${baseName(target)} already exists there.`
        const refused = onMove?.(from, to)
        if (refused) return refused
        reveal.current = target
        select(target)
      },
    }
  })
  const movable = !!onMove
  useEffect(() => {
    const root = section.current
    const list = root?.querySelector<HTMLElement>(".ide-tree")
    const area = root?.querySelector<HTMLElement>(".ide-tree-scroller")
    if (!movable || !root || !list || !area) return
    return bindFileDrag(root, list, area, () => drag.current!)
  }, [movable])

  const canEdit = onCreate || onRename || onMove || onDelete
  const allFolders = ["", ...[...folders].sort()]

  return (
    <section ref={section} className={["ide-files", className].filter(Boolean).join(" ")} aria-labelledby={titleId} data-movable={onMove ? "" : undefined}>
      <div className="ide-pane-header">
        <Heading id={titleId} className="ide-pane-title">
          {label}
        </Heading>
        {canEdit && (
          <div className="ide-pane-actions">
            {onCreate && (
              <>
                <Button variant="ghost" aria-label="New file" onClick={() => setDialog({ mode: "file", path: folderOf(selected) })}>
                  <Icon name="file" />
                </Button>
                <Button variant="ghost" aria-label="New folder" onClick={() => setDialog({ mode: "folder", path: folderOf(selected) })}>
                  <Icon name="folder" />
                </Button>
              </>
            )}
            {/* Menu items run through the menu's onAction: Enter, Space or a click. */}
            <Menu
              onAction={(action: unknown) => {
                if (action === "collapse") tree.collapseAll()
                else if (!selected) return
                else if (action === "rename") setDialog({ mode: "rename", path: selected })
                else if (action === "move") setDialog({ mode: "move", path: selected })
                else if (action === "copy") void navigator.clipboard?.writeText(selected)
                else if (action === "delete") setDeleting(selected)
              }}
            >
              <MenuTrigger data-variant="ghost" aria-label={`More file actions${selected ? ` for ${baseName(selected)}` : ""}`}>
                <Icon name="more" />
              </MenuTrigger>
              <MenuContent>
                {onRename && (
                  <MenuItem value="rename" disabled={!selected}>
                    Rename… <span className="ide-menu-key">F2</span>
                  </MenuItem>
                )}
                {onMove && (
                  <MenuItem value="move" disabled={!selected}>
                    Move to…
                  </MenuItem>
                )}
                <MenuItem value="copy" disabled={!selected}>
                  Copy path
                </MenuItem>
                <MenuItem value="collapse">Collapse folders</MenuItem>
                {onDelete && (
                  <>
                    <MenuSeparator />
                    <MenuItem value="delete" destructive disabled={!selected}>
                      Delete…
                    </MenuItem>
                  </>
                )}
              </MenuContent>
            </Menu>
          </div>
        )}
      </div>
      <ScrollBox axis="both" data-frame="none" className="ide-tree-frame" viewport={{ className: "ide-tree-scroller", role: "group", "aria-label": "Files" }}>
        <Tree
          aria-labelledby={titleId}
          className="ide-tree"
          items={items}
          controller={tree}
          value={selected}
          onValueChange={(next, details) => {
            select(next as string | null)
            // An agent's choice of a file opens it, as Enter or a click would for a person.
            if (details?.reason === "imperative" && typeof next === "string" && files.has(next)) onOpen?.(next)
          }}
          activation="automatic"
          defaultExpanded={defaultExpanded}
          onAction={(path) => {
            if (files.has(path)) onOpen?.(path)
          }}
          onKeyDown={keyDown}
        >
          <FileItems list={items} folders={folders} status={status} changed={changedFolders} />
        </Tree>
      </ScrollBox>

      <Dialog open={dialog !== null} onOpenChange={(open: boolean) => !open && (setDialog(null), setError(null))}>
        <DialogBackdrop />
        <DialogContent className="ide-dialog">
          {dialog && (
            <form
              key={`${dialog.mode}:${dialog.path}`}
              className="ide-dialog-form"
              aria-labelledby={`${titleId}-dialog`}
              onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                submit(String(data.get("name") ?? ""), String(data.get("folder") ?? ""))
              }}
            >
              <DialogTitle id={`${titleId}-dialog`}>
                {dialog.mode === "file"
                  ? "New file"
                  : dialog.mode === "folder"
                    ? "New folder"
                    : dialog.mode === "rename"
                      ? `Rename ${baseName(dialog.path)}`
                      : `Move ${baseName(dialog.path)}`}
              </DialogTitle>
              <DialogDescription>
                {dialog.mode === "move" ? `From ${dirName(dialog.path) || "the top"}.` : `In ${(dialog.mode === "rename" ? dirName(dialog.path) : dialog.path) || "the top folder"}.`}
              </DialogDescription>
              {dialog.mode === "move" ? (
                <Field name="folder">
                  <Select name="folder" defaultValue={dirName(dialog.path)}>
                    <SelectLabel>Folder</SelectLabel>
                    <SelectTrigger />
                    <SelectContent>
                      {allFolders
                        .filter((f) => f !== dialog.path && !f.startsWith(`${dialog.path}/`))
                        .map((f) => (
                          <SelectItem key={f || "top"} value={f}>
                            {f || "Top folder"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field name="name" invalid={error ? true : undefined}>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    required
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={dialog.mode === "rename" ? baseName(dialog.path) : ""}
                    placeholder={dialog.mode === "folder" ? "components" : "index.ts"}
                    onChange={() => setError(null)}
                  />
                  <FieldError match="valueMissing">Give it a name.</FieldError>
                  {error && <FieldError>{error}</FieldError>}
                </Field>
              )}
              {dialog.mode === "move" && error && (
                <p className="ide-error" role="alert">
                  {error}
                </p>
              )}
              <div className="ide-dialog-actions">
                <DialogClose>Cancel</DialogClose>
                <Button type="submit">
                  {dialog.mode === "rename" ? "Rename" : dialog.mode === "move" ? "Move" : "Create"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open: boolean) => !open && setDeleting(null)}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleting ? baseName(deleting) : ""}?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleting && isFolder(deleting) ? "The folder goes with everything in it." : "It can't be brought back here."}
          </AlertDialogDescription>
          <div className="ide-dialog-actions">
            <AlertDialogClose>Keep it</AlertDialogClose>
            <AlertDialogClose
              data-variant="destructive"
              data-agent-confirm={`Deletes ${deleting ?? "the file"}`}
              onClick={() => {
                if (!deleting) return
                const next = neighbor(deleting)
                onDelete?.(deleting)
                announce(`Deleted ${baseName(deleting)}.`)
                select(next)
                reveal.current = next
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
function EditorTabs({
  label = "Open files",
  files,
  value,
  onValueChange,
  onClose,
  children,
  empty,
  className,
}: {
  label?: string
  files: EditorFile[]
  value: string | null
  onValueChange: (path: string) => void
  /** Asks to close a file. Remove it from `files` (and pick the next `value`, see `nextTab`) to close it. */
  onClose: (path: string) => void
  /** A file's content, like a CodeEditor; rendered for every open file and kept while hidden. */
  children: (path: string) => ReactNode
  /** Shown with no files open. */
  empty?: ReactNode
  className?: string
}) {
  const tabs = useRef(new Map<string, HTMLElement>())
  const emptyPane = useRef<HTMLDivElement>(null)
  const closing = useRef<string | null>(null)
  const names = new Map<string, number>()
  for (const f of files) names.set(baseName(f.path), (names.get(baseName(f.path)) ?? 0) + 1)
  // The tab shown: the chosen one while it's open, else the first.
  const current = value && files.some((f) => f.path === value) ? value : (files[0]?.path ?? null)
  const close = (path: string) => {
    closing.current = path
    onClose(path)
  }
  // Once a closed file has gone, focus the tab that took over, or the empty pane. A close
  // that was refused (a dialog asking first) leaves focus to that dialog.
  useEffect(() => {
    const gone = closing.current
    if (!gone || files.some((f) => f.path === gone)) return
    closing.current = null
    keepFocus(() => (current ? tabs.current.get(current) : emptyPane.current) ?? undefined)
  })
  if (!files.length)
    return (
      <div ref={emptyPane} tabIndex={-1} className={["ide-editor-empty", className].filter(Boolean).join(" ")}>
        {empty}
      </div>
    )
  return (
    <Tabs
      className={["ide-tabs", className].filter(Boolean).join(" ")}
      value={current}
      onValueChange={(next: unknown) => onValueChange(String(next))}
    >
      <ScrollBox axis="x" data-frame="none" className="ide-tab-strip" viewport={{ className: "ide-tab-scroller", role: "group", "aria-label": "Tabs" }}>
        <TabsList className="ide-tab-list" aria-label={label}>
          {files.map((file) => {
            const name = baseName(file.path)
            const twin = (names.get(name) ?? 0) > 1
            return (
              <span key={file.path} className="ide-tab" role="presentation" data-dirty={file.dirty ? "" : undefined}>
                <TabsTab
                  value={file.path}
                  ref={(el: HTMLElement | null) => {
                    if (el) tabs.current.set(file.path, el)
                    else tabs.current.delete(file.path)
                  }}
                  className="ide-tab-button"
                  title={file.path}
                  // Visible text first, then what the dot means.
                  aria-label={`${name}${twin ? ` ${dirName(file.path)}` : ""}${file.dirty ? ", unsaved" : ""}`}
                  onKeyDown={(event: ReactKeyboardEvent) => {
                    if (event.key === "Delete") {
                      event.preventDefault()
                      close(file.path)
                    }
                  }}
                  onAuxClick={(event: React.MouseEvent) => {
                    if (event.button === 1) close(file.path)
                  }}
                >
                  <Icon name="file" className="ide-tab-icon" />
                  <span className="ide-tab-name">{name}</span>
                  {twin && <span className="ide-tab-dir">{dirName(file.path)}</span>}
                </TabsTab>
                {/* The keyboard closes a tab with Delete; this button is for the pointer, and never takes focus. */}
                <button
                  type="button"
                  className="ide-tab-close"
                  tabIndex={-1}
                  aria-hidden="true"
                  title={`Close ${name}`}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => close(file.path)}
                >
                  <Icon name="close" />
                </button>
              </span>
            )
          })}
        </TabsList>
      </ScrollBox>
      {files.map((file) => (
        <TabsPanel key={file.path} value={file.path} className="ide-tab-panel" keepMounted>
          {children(file.path)}
        </TabsPanel>
      ))}
    </Tabs>
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
  ref?: Ref<CodeEditorHandle>
  className?: string
}

const LINE = 20 // px: --code-line in ide.css
const PAD = 12 // px: --code-pad

const glyph = { error: "●", warning: "▲", info: "■" } as const

/** The colored text, memoized so caret moves don't redraw it. */
const CodeColors = memo(function CodeColors({ lines, colored }: { lines: string[]; colored: Map<string, Token[]> | null }) {
  return (
    <pre className="ide-code-colors" aria-hidden="true">
      {lines.map((line, i) => {
        // Lines whose tokens are known keep their colors while an edit is being colored.
        const tokens = colored?.get(line)
        return (
          <span key={i} className="ide-code-line">
            {tokens
              ? tokens.map((token, j) => (
                  <span key={j} style={token.color ? { color: token.color } : undefined}>
                    {token.content}
                  </span>
                ))
              : line}
            {"\n"}
          </span>
        )
      })}
    </pre>
  )
})

const CodeGutter = memo(function CodeGutter({ count, marks }: { count: number; marks: Map<number, Problem["severity"]> }) {
  return (
    <div className="ide-code-gutter" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const mark = marks.get(i + 1)
        return (
          <span key={i} className="ide-code-number" data-problem={mark}>
            {mark && <span className="ide-code-mark">{glyph[mark]}</span>}
            {i + 1}
          </span>
        )
      })}
    </div>
  )
})

/**
 * A code editor on a native textarea (UI SDK's Textarea, so agents can read and write it)
 * with line numbers and syntax colors drawn behind the text. Tab indents and Shift+Tab
 * outdents; press Escape first to let Tab leave the editor. Enter keeps the indent.
 */
function CodeEditor({
  label,
  value,
  defaultValue = "",
  onValueChange,
  path,
  language,
  readOnly = false,
  tabSize = 2,
  onCursorChange,
  problems = [],
  ref,
  className,
}: CodeEditorProps) {
  const hintId = useId()
  const [own, setOwn] = useState(value ?? defaultValue)
  const text = value ?? own
  // React writes a changed defaultValue into the textarea's own text node, which ends the
  // browser's undo step; the first text is the only one it's given.
  const [initial] = useState(text)
  const input = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const escaped = useRef(false)
  const unit = " ".repeat(tabSize)
  const lang = language ?? (path ? languageOf(path) : undefined)

  // The textarea keeps its own text, so the browser's typing and undo stay whole: React
  // writing to the page during an input event would end the undo step at every key. New
  // text reaches the app a frame later; text the app changes is written back here.
  const pending = useRef<number | null>(null)
  // The texts this editor sent up and hasn't seen back: when one comes back as `value`,
  // it's an echo, not news, even if renders lag behind the typing.
  const sent = useRef<string[]>([])
  const report = () => {
    pending.current = null
    const next = input.current?.value ?? ""
    sent.current.push(next)
    // Rendered here, inside the frame: React writing the page in a task between two keys
    // would end the browser's undo step, as writing during a key does.
    flushSync(() => {
      if (value === undefined) setOwn(next)
      onValueChange?.(next)
    })
  }
  const applying = useRef(false)
  const changed = () => {
    // An edit the editor makes (Tab, Enter) records itself, as one step.
    if (!applying.current) remember("typing")
    if (pending.current === null) pending.current = requestAnimationFrame(report)
  }

  // Undo is the editor's own. In Chrome any text change on the page while typing (the
  // colors here) ends the browser's undo step at every key, so a run of typing couldn't be
  // one step. Typing joins one step until a pause or a caret move; Tab, Enter and changes
  // from outside are steps of their own; the caret comes back with the text.
  type Snapshot = { text: string; start: number; end: number }
  const [history] = useState(() => createUndoStack<Snapshot>({ text, start: 0, end: 0 }, { limit: 500, groupDelay: 800 }))
  // Where the last edit left the caret: a caret anywhere else moved on its own.
  const editedAt = useRef(-1)
  const remember = (group: string) => {
    const el = input.current
    if (!el) return
    editedAt.current = el.selectionEnd
    history.record({ text: el.value, start: el.selectionStart, end: el.selectionEnd }, { group })
  }
  const restore = (snapshot: Snapshot | undefined) => {
    const el = input.current
    if (!snapshot || !el) return
    el.value = snapshot.text
    el.setSelectionRange(snapshot.start, snapshot.end)
    if (pending.current === null) pending.current = requestAnimationFrame(report)
    track()
    showCaret()
  }
  const step = (back: boolean) => {
    history.seal()
    restore(back ? history.undo() : history.redo())
  }
  useEffect(() => () => void (pending.current !== null && cancelAnimationFrame(pending.current)), [])
  // Text from elsewhere (a command, an agent) is written in; an echo of typing that has
  // since moved on is not.
  useLayoutEffect(() => {
    const el = input.current
    if (!el) return
    const echo = sent.current.indexOf(text)
    if (echo >= 0) {
      sent.current = sent.current.slice(echo + 1)
      return
    }
    sent.current = []
    if (el.value === text) return
    el.value = text
    // A change from outside (a command, an agent) is an undo step of its own.
    history.seal()
    remember("outside")
    history.seal()
  }, [text])

  // Colors arrive after typing pauses, longer for long files; meanwhile, lines that haven't
  // changed keep theirs.
  const [colored, setColored] = useState<Map<string, Token[]> | null>(null)
  const lines = text.split("\n")
  useEffect(() => {
    if (!lang) return
    let current = true
    const timer = setTimeout(
      () => {
        tokenize(text, lang)
          .then((tokens) => {
            if (!current || !tokens) return
            const byLine = new Map<string, Token[]>()
            text.split("\n").forEach((line, i) => !byLine.has(line) && tokens[i] && byLine.set(line, tokens[i]!))
            setColored(byLine)
          })
          .catch(() => {})
      },
      Math.min(400, 40 + lines.length / 10),
    )
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [text, lang, lines.length])

  const marks = useMemo(() => {
    const map = new Map<number, Problem["severity"]>()
    const rank = { error: 3, warning: 2, info: 1 }
    for (const p of problems) {
      const was = map.get(p.line)
      if (!was || rank[p.severity] > rank[was]) map.set(p.line, p.severity)
    }
    return map
  }, [problems])

  // The caret's line is one bar moved under the text, so a caret move redraws nothing.
  const cursor = useRef({ line: 1, col: 1 })
  const cursorFrame = useRef<number | null>(null)
  const track = () => {
    const el = input.current
    if (!el) return
    const at = lineCol(el.value, el.selectionStart)
    if (bar.current) bar.current.style.translate = `0 ${(at.line - 1) * LINE}px`
    if (at.line !== cursor.current.line || at.col !== cursor.current.col) {
      cursor.current = at
      // Reported once a frame, inside it, for the same reason as the text.
      if (cursorFrame.current === null)
        cursorFrame.current = requestAnimationFrame(() => {
          cursorFrame.current = null
          flushSync(() => onCursorChange?.(cursor.current))
        })
    }
  }
  const showCaret = () => {
    const el = input.current
    const frame = scroller.current
    if (!el || !frame) return
    const at = lineCol(el.value, el.selectionEnd)
    const top = (at.line - 1) * LINE + PAD
    const pad = LINE * 2
    if (top < frame.scrollTop + pad) frame.scrollTop = Math.max(0, top - pad)
    else if (top + LINE > frame.scrollTop + frame.clientHeight - pad) frame.scrollTop = top + LINE - frame.clientHeight + pad
  }
  const goTo = (line: number, col = 1) => {
    const el = input.current
    if (!el) return
    const at = offsetOf(el.value, line, col)
    el.focus()
    el.setSelectionRange(at, at)
    track()
    showCaret()
  }
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus(), goTo }), [])
  useEffect(() => {
    onCursorChange?.(cursor.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The caret's line and column, however it moved: keys, the pointer, or an edit.
  useEffect(() => {
    const moved = () => {
      const el = input.current
      if (!el || document.activeElement !== el) return
      // The caret moving on its own (arrows, a click) ends a run of typing.
      if (el.selectionEnd !== editedAt.current || el.selectionStart !== el.selectionEnd) history.seal()
      track()
      showCaret()
    }
    document.addEventListener("selectionchange", moved)
    return () => document.removeEventListener("selectionchange", moved)
  })

  // One native edit, so the browser's own undo keeps working.
  const apply = (edit: Edit) => {
    const el = input.current!
    history.seal()
    el.setSelectionRange(edit.from, edit.to)
    applying.current = true
    const done = document.execCommand?.("insertText", false, edit.insert)
    if (!done) {
      el.setRangeText(edit.insert, edit.from, edit.to, "end")
      changed()
    }
    applying.current = false
    el.setSelectionRange(edit.start, edit.end)
    remember("edit")
    history.seal()
    track()
    showCaret()
  }

  const keyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget
    if (event.nativeEvent.isComposing) return
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey
    if (!readOnly && (matchesShortcut(event.nativeEvent, "mod+shift+z") || matchesShortcut(event.nativeEvent, "mod+y"))) {
      event.preventDefault()
      step(false)
      return
    }
    if (!readOnly && matchesShortcut(event.nativeEvent, "mod+z")) {
      event.preventDefault()
      step(true)
      return
    }
    if (event.key === "Escape") {
      escaped.current = true
      return
    }
    // After Escape, Tab moves focus on like anywhere else.
    if (event.key === "Tab" && plain && escaped.current) {
      escaped.current = false
      return
    }
    escaped.current = false
    if (event.key === "F8" && problems.length) {
      event.preventDefault()
      const sorted = [...problems].sort((a, b) => a.line - b.line || (a.col ?? 1) - (b.col ?? 1))
      const line = lineCol(el.value, el.selectionStart).line
      const next = event.shiftKey
        ? ([...sorted].reverse().find((p) => p.line < line) ?? sorted.at(-1)!)
        : (sorted.find((p) => p.line > line) ?? sorted[0]!)
      goTo(next.line, next.col)
      announce(`Line ${next.line}: ${next.severity}, ${next.message}`)
      return
    }
    // The textarea is as tall as its text, so Page Up and Page Down move the caret by a
    // frame's worth of lines, as editors do; the frame follows it.
    if ((event.key === "PageDown" || event.key === "PageUp") && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const page = Math.max(1, Math.floor((scroller.current?.clientHeight ?? LINE * 10) / LINE) - 1)
      const to = moveLines(el.value, el.selectionEnd, event.key === "PageDown" ? page : -page)
      el.setSelectionRange(event.shiftKey ? Math.min(el.selectionStart, to) : to, event.shiftKey ? Math.max(el.selectionStart, to) : to)
      return
    }
    if (readOnly) return
    if (event.key === "Tab" && plain) {
      event.preventDefault()
      apply((event.shiftKey ? outdent : indent)(el.value, el.selectionStart, el.selectionEnd, unit))
      return
    }
    if (event.key === "Enter" && plain && !event.shiftKey) {
      event.preventDefault()
      apply(newline(el.value, el.selectionStart, el.selectionEnd, unit))
    }
  }

  const width = lines.reduce((most, line) => Math.max(most, line.length), 1)

  return (
    // Code reads left to right and isn't translated, whatever the page's language does.
    <div className={["ide-code", className].filter(Boolean).join(" ")} data-readonly={readOnly ? "" : undefined} dir="ltr" translate="no">
      <ScrollBox
        axis="both"
        data-frame="none"
        className="ide-code-frame"
        viewport={{
          className: "ide-code-scroll",
          role: "group",
          "aria-label": "Lines",
          ref: scroller,
          style: { "--code-digits": String(lines.length).length } as React.CSSProperties,
        }}
      >
        <div className="ide-code-lines">
          <CodeGutter count={lines.length} marks={marks} />
          <div className="ide-code-body" style={{ "--code-columns": width } as React.CSSProperties}>
            <div ref={bar} className="ide-code-current" aria-hidden="true" />
            <CodeColors lines={lines} colored={lang ? colored : null} />
            <Textarea
              ref={input}
              className="ide-code-input"
              aria-label={label}
              aria-describedby={hintId}
              defaultValue={initial}
              onValueChange={changed}
              readOnly={readOnly}
              wrap="off"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              onKeyDown={keyDown}
              // Undo and Redo from the Edit menu or a gesture take the same steps.
              onBeforeInput={(event: React.FormEvent<HTMLTextAreaElement>) => {
                const kind = (event.nativeEvent as InputEvent).inputType
                if (kind === "historyUndo" || kind === "historyRedo") {
                  event.preventDefault()
                  step(kind === "historyUndo")
                }
              }}
              onFocus={() => {
                escaped.current = false
                onCursorChange?.(cursor.current)
              }}
              onPointerDown={() => {
                escaped.current = false
              }}
            />
          </div>
        </div>
      </ScrollBox>
      <p id={hintId} hidden>
        {readOnly
          ? "Read only."
          : `Tab indents and Shift+Tab outdents; press Escape, then Tab, to leave the editor.${
              problems.length
                ? ` ${problems.length} ${problems.length === 1 ? "problem" : "problems"}; F8 goes to the next.`
                : ""
            }`}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------- Command palette */

type PaletteCommand = { value: string; label: string; shortcut?: string; keywords?: string[] }

/**
 * Go to a file, run a command (start with >) or go to a line (start with :), on UI SDK's
 * Command in a Dialog. Two triggers open it: files with ⌘P / Ctrl+P, commands with
 * ⌘⇧P / Ctrl+Shift+P.
 */
function CommandPalette({
  files,
  recent = [],
  commands = [],
  onOpenFile,
  onCommand,
  onGoToLine,
  className,
}: {
  files: string[]
  /** Shown first while nothing is typed. */
  recent?: string[]
  commands?: PaletteCommand[]
  onOpenFile: (path: string) => void
  onCommand?: (value: string) => void
  /** Without it, ":" doesn't go to lines. */
  onGoToLine?: (line: number) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  // Each trigger says what it opens, so its shortcut starts the right search too.
  const [palette] = useState(() => createDialogController<"files" | "commands">())
  const start = (what: unknown) => setQuery(what === "commands" ? "> " : "")
  // Escape goes back where you were (the editor, say), not to the trigger.
  const returnTo = useRef<HTMLElement | null>(null)
  const mode = query.startsWith(">") ? "commands" : query.startsWith(":") && onGoToLine ? "line" : "files"
  const text = query.replace(/^[>:]\s*/, "")
  const line = Number.parseInt(text, 10)

  const items: CommandData =
    mode === "commands"
      ? commands.map((c) => ({ value: `cmd:${c.value}`, label: c.label, keywords: c.keywords, shortcut: c.shortcut }))
      : mode === "line"
        ? Number.isFinite(line) && line > 0
          ? [{ value: `line:${line}`, label: `Go to line ${line}` }]
          : []
        : [
            ...(text ? [] : recent.filter((p) => files.includes(p)).map((p) => ({ value: `file:${p}`, label: p, keywords: ["recent"] }))),
            ...files
              .filter((p) => text || !recent.includes(p))
              .map((p) => ({ value: `file:${p}`, label: p })),
          ]

  const run = (value: string) => {
    setOpen(false)
    if (value.startsWith("file:")) onOpenFile(value.slice(5))
    else if (value.startsWith("cmd:")) onCommand?.(value.slice(4))
    else if (value.startsWith("line:")) onGoToLine?.(Number(value.slice(5)))
  }

  return (
    <Dialog
      controller={palette}
      open={open}
      onOpenChange={(next: boolean) => {
        if (next) {
          start(palette.getPayload())
          const was = document.activeElement
          returnTo.current = was instanceof HTMLElement && was !== document.body ? was : null
        }
        setOpen(next)
      }}
      onPayloadChange={(what: unknown) => start(what)}
    >
      <div className={["ide-palette-triggers", className].filter(Boolean).join(" ")}>
        <DialogTrigger className="ide-palette-trigger" shortcut="mod+p" payload="files">
          <Icon name="search" />
          <span>Go to file…</span>
        </DialogTrigger>
        {commands.length > 0 && (
          <DialogTrigger data-variant="ghost" shortcut="mod+shift+p" payload="commands">
            Commands…
          </DialogTrigger>
        )}
      </div>
      <DialogBackdrop />
      {/* Kept in the page, so its title names the dialog while it's closed: with two triggers it
          takes no name from either (UI SDK's advice for a dialog with several triggers). */}
      <DialogContent className="ide-palette" keepMounted initialFocus="input" finalFocus={() => (returnTo.current?.isConnected ? returnTo.current : undefined)}>
        <DialogTitle className="uiset-visually-hidden">
          {mode === "commands" ? "Run a command" : mode === "line" ? "Go to line" : "Go to file"}
        </DialogTitle>
        <Command
          items={items}
          query={query}
          onQueryChange={(next: string, details: { reason?: string }) => {
            // Escape closes the palette, rather than first clearing a ">" or ":".
            if (details?.reason === "escape-key") setOpen(false)
            else setQuery(next)
          }}
          filter={(item: { label: string; keywords?: string[] }) =>
            mode === "line" || !text ? 1 : fuzzyScore([item.label, ...(item.keywords ?? [])].join(" "), text)
          }
          onAction={(value: string) => run(value)}
        >
          <div className="ide-palette-search">
            <Icon name="search" />
            <CommandInput
              // The shortcuts switch modes here too, instead of reaching the browser's Print.
              onKeyDown={(event: ReactKeyboardEvent) => {
                const native = event.nativeEvent
                if (matchesShortcut(native, "mod+shift+p")) {
                  event.preventDefault()
                  setQuery("> ")
                } else if (matchesShortcut(native, "mod+p")) {
                  event.preventDefault()
                  setQuery("")
                }
              }}
              aria-label="Go to a file, a command after >, or a line after :"
              placeholder={commands.length ? "Search files, > for commands, : for a line" : "Search files"}
            />
          </div>
          <CommandEmpty className="ide-palette-empty">
            {mode === "line" ? "Type a line number." : "Nothing matches."}
          </CommandEmpty>
          <CommandList className="ide-palette-list">
            {(state: { items: CommandData }) =>
              (state.items as { value: string; label: string; shortcut?: string; keywords?: string[] }[]).map((item) => {
                const isFile = item.value.startsWith("file:")
                const label = isFile ? baseName(item.label) : item.label
                return (
                  <CommandItem key={item.value} value={item.value} shortcut={item.shortcut} className="ide-palette-item">
                    {isFile && <Icon name="file" />}
                    <span className="ide-palette-label">
                      {matchSegments(label, text ? matchRanges(label, text, "fuzzy") : []).map((part, i) =>
                        part.match ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>,
                      )}
                    </span>
                    {isFile && dirName(item.label) && <span className="ide-palette-dir">{dirName(item.label)}</span>}
                    {isFile && !text && item.keywords?.includes("recent") && <span className="ide-palette-dir">recent</span>}
                    {item.shortcut && <CommandShortcut className="ide-palette-key">{(s: { text: string }) => s.text}</CommandShortcut>}
                  </CommandItem>
                )
              })
            }
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
function ProblemsList({
  problems,
  onChoose,
  empty = "No problems found.",
}: {
  problems: Problem[]
  onChoose: (problem: Problem) => void
  empty?: string
}) {
  if (!problems.length) return <p className="ide-problems-empty">{empty}</p>
  const rank = { error: 0, warning: 1, info: 2 }
  const sorted = [...problems].sort((a, b) => rank[a.severity] - rank[b.severity] || a.path.localeCompare(b.path) || a.line - b.line)
  return (
    <ul className="ide-problems">
      {sorted.map((p, i) => (
        <li key={`${p.path}:${p.line}:${i}`}>
          <Button variant="ghost" className="ide-problem" data-severity={p.severity} onClick={() => onChoose(p)}>
            <Icon name={severityIcon[p.severity]} className="ide-problem-icon" />
            <span className="uiset-visually-hidden">{severityName[p.severity]}: </span>
            <span className="ide-problem-message">{p.message}</span>
            {/* A space in the name, which the layout's columns don't need. */}
            <span className="uiset-visually-hidden"> </span>
            {/* The file's name, not its path: an agent naming the editor by path finds only it. */}
            <span className="ide-problem-where" title={p.path}>
              {baseName(p.path)}:{p.line}
              {p.col ? `:${p.col}` : ""}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** The strip along the bottom: branch, problems, cursor, language. Items are text or buttons. */
function StatusBar({ label = "Status", children }: { label?: string; children: ReactNode }) {
  return (
    <div className="ide-status" role="group" aria-label={label}>
      {children}
    </div>
  )
}

function StatusBarItem({ children, onClick, label }: { children: ReactNode; onClick?: () => void; label?: string }) {
  return onClick ? (
    <Button variant="ghost" className="ide-status-item" onClick={onClick} aria-label={label}>
      {children}
    </Button>
  ) : (
    <span className="ide-status-item">{children}</span>
  )
}

export { CodeEditor, CommandPalette, EditorTabs, FileTree, nextTab, ProblemsList, StatusBar, StatusBarItem }
export type { CodeEditorHandle, CodeEditorProps, EditorFile, FileStatus, FileTreeProps, PaletteCommand, Problem }
