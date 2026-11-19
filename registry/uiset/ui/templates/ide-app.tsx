"use client"

import { announce, matchesShortcut } from "@ui-sdk/core"
import { useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../alert-dialog"
import { Button } from "../button"
import {
  CodeEditor,
  CommandPalette,
  EditorTabs,
  FileTree,
  nextTab,
  ProblemsList,
  StatusBar,
  StatusBarItem,
  type CodeEditorHandle,
  type FileStatus,
  type Problem,
} from "../ide"
import { languageOf } from "../code/highlight"
import { Resizable, ResizableHandle, ResizablePanel } from "../resizable"
import { ScrollBox } from "../scroll-area"
import { Icon } from "../shell/icons"
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs"
import { sampleLint, sampleProject } from "./ide-sample"
import "./templates.css"

/** The caret's place, in a tiny store only the status bar reads, so a caret move renders just that. */
function createCursorStore() {
  let at = { line: 1, col: 1 }
  const listeners = new Set<() => void>()
  return {
    get: () => at,
    set: (next: { line: number; col: number }) => {
      at = next
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function CursorStatus({ store }: { store: ReturnType<typeof createCursorStore> }) {
  const at = useSyncExternalStore(store.subscribe, store.get, store.get)
  return (
    <StatusBarItem>
      Ln {at.line}, Col {at.col}
    </StatusBarItem>
  )
}

const languageNames: Record<string, string> = {
  typescript: "TypeScript",
  tsx: "TypeScript JSX",
  javascript: "JavaScript",
  jsx: "JavaScript JSX",
  json: "JSON",
  markdown: "Markdown",
  css: "CSS",
  html: "HTML",
}
const languageName = (path: string) => {
  const id = languageOf(path)
  return id ? (languageNames[id] ?? id) : "Plain text"
}

const commands = [
  { value: "save", label: "Save", shortcut: "mod+s" },
  { value: "save-all", label: "Save all", keywords: ["write"] },
  { value: "close", label: "Close editor" },
  { value: "close-all", label: "Close all editors" },
  { value: "trim", label: "Trim trailing spaces", keywords: ["format", "whitespace"] },
  { value: "problems", label: "Show problems" },
]

/**
 * A code editor in panes: files with version control marks, tabs, an editor with syntax
 * colors, a command palette (⌘P files, ⌘⇧P commands, : for a line), problems and a status
 * bar. Files are kept in memory; pass `onSave` to write them somewhere.
 */
const narrowQuery = "(max-width: 40rem)"
const watchNarrow = (onChange: () => void) => {
  const query = matchMedia(narrowQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}
/** Whether the screen is phone-narrow: the files then sit above the editor, not beside it. */
const useNarrow = () => useSyncExternalStore(watchNarrow, () => matchMedia(narrowQuery).matches, () => false)

function IdeTemplate({
  defaultFiles = sampleProject,
  defaultOpen = ["src/index.ts"],
  branch = "main",
  onSave,
  lint = sampleLint,
  headingLevel,
}: {
  /** Paths to text. Folders come from the paths; a path ending in "/" is an empty folder. */
  defaultFiles?: Record<string, string>
  defaultOpen?: string[]
  branch?: string
  onSave?: (path: string, text: string) => void
  /** Finds a file's problems: your linter or language server. Defaults to a tiny sample one. */
  lint?: (path: string, text: string) => Problem[]
  /** The level of the files pane's heading, to fit the page's outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
}) {
  const narrow = useNarrow()
  const [files, setFiles] = useState(defaultFiles)
  // What was last saved, and what the branch had: dirty tabs and version control marks.
  const [saved, setSaved] = useState(defaultFiles)
  const [base] = useState(defaultFiles)
  // Open tabs and the active one change together, so a close never reads a stale list.
  const [tabs, setTabs] = useState<{ open: string[]; active: string | null }>(() => {
    const open = defaultOpen.filter((p) => p in defaultFiles)
    return { open, active: open[0] ?? null }
  })
  const { open, active } = tabs
  const activeRef = useRef(active)
  activeRef.current = active
  const [recent, setRecent] = useState<string[]>(open)
  const [selected, setSelected] = useState<string | null>(active)
  const [panel, setPanel] = useState("problems")
  const [closing, setClosing] = useState<string | null>(null)
  const editors = useRef(new Map<string, CodeEditorHandle>())
  const [cursor] = useState(createCursorStore)
  const problemsTab = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLDivElement>(null)

  const paths = Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  // Each file is linted again only when its text changes.
  const lintCache = useRef(new Map<string, { text: string; problems: Problem[] }>())
  const problems = useMemo(
    () =>
      paths.flatMap((p) => {
        const text = files[p]!
        const cached = lintCache.current.get(p)
        if (cached?.text === text) return cached.problems
        const found = lint(p, text)
        lintCache.current.set(p, { text, problems: found })
        return found
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, lint],
  )
  const status: Record<string, FileStatus> = {}
  for (const p of paths) if (!(p in base)) status[p] = "untracked"
  else if (files[p] !== base[p]) status[p] = "modified"
  const dirty = (p: string) => files[p] !== saved[p]

  // Shows a file in a tab; `openFile` first checks it exists, `show` trusts a file just made.
  const show = (path: string, at?: { line: number; col?: number }) => {
    setTabs((t) => ({ open: t.open.includes(path) ? t.open : [...t.open, path], active: path }))
    setSelected(path)
    setRecent((all) => [path, ...all.filter((p) => p !== path)].slice(0, 8))
    if (at) requestAnimationFrame(() => editors.current.get(path)?.goTo(at.line, at.col))
  }
  const openFile = (path: string, at?: { line: number; col?: number }) => {
    if (path in files && !path.endsWith("/")) show(path, at)
  }
  const save = (path: string | null) => {
    if (!path || !dirty(path)) return
    setSaved((all) => ({ ...all, [path]: files[path]! }))
    onSave?.(path, files[path]!)
    announce(`Saved ${path.split("/").pop()}.`)
  }
  const closeAll = (gone: (path: string) => boolean) =>
    setTabs((t) => {
      const openNow = t.open.filter((p) => !gone(p))
      let active = t.active
      if (active && gone(active)) {
        // The neighbor that's still open, walking out from the closed tab.
        const at = t.open.indexOf(active)
        active = [...t.open.slice(at + 1), ...t.open.slice(0, at).reverse()].find((p) => !gone(p)) ?? null
      }
      return { open: openNow, active }
    })
  const close = (path: string) =>
    setTabs((t) => ({ open: t.open.filter((p) => p !== path), active: t.active === path ? nextTab(t.open, path) : t.active }))
  const askClose = (path: string) => (dirty(path) ? setClosing(path) : close(path))
  const tabElement = (path: string | null) =>
    path ? (root.current?.querySelector<HTMLElement>(`[role="tab"][title="${CSS.escape(path)}"]`) ?? undefined) : undefined

  const run = (command: string) => {
    if (command === "save") save(active)
    else if (command === "save-all") open.forEach(save)
    else if (command === "close" && active) askClose(active)
    else if (command === "close-all") closeAll((p) => !dirty(p))
    else if (command === "trim" && active) setFiles((all) => ({ ...all, [active]: all[active]!.replace(/[ \t]+$/gm, "") }))
    else if (command === "problems") {
      setPanel("problems")
      requestAnimationFrame(() => problemsTab.current?.focus())
    }
  }

  const keyDown = (event: KeyboardEvent) => {
    if (matchesShortcut(event.nativeEvent, "mod+s")) {
      event.preventDefault()
      save(active)
    }
  }

  const errors = problems.filter((p) => p.severity === "error").length
  const warnings = problems.filter((p) => p.severity === "warning").length
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

  return (
    <div className="template-ide" ref={root} onKeyDown={keyDown}>
      <header className="template-ide-header">
        <span className="template-ide-project">
          <Icon name="folder" />
          greeter
        </span>
        <CommandPalette
          files={paths.filter((p) => !p.endsWith("/"))}
          recent={recent}
          commands={commands}
          onOpenFile={(path) => {
            openFile(path)
            // Like any editor: a file opened from the palette is ready to type in.
            requestAnimationFrame(() => editors.current.get(path)?.focus())
          }}
          onCommand={run}
          onGoToLine={(line) => requestAnimationFrame(() => active && editors.current.get(active)?.goTo(line))}
        />
      </header>
      {/* Files beside the editor; on a phone, above it (a new layout, so sizes start over). */}
      <Resizable
        key={narrow ? "stacked" : "side"}
        orientation={narrow ? "vertical" : "horizontal"}
        className="template-ide-layout"
        aria-label="Editor layout"
      >
        <ResizablePanel defaultSize={narrow ? 30 : 24} minSize={narrow ? "6rem" : "12rem"} className="template-ide-side">
          <FileTree
            label="Project files"
            headingLevel={headingLevel}
            paths={paths}
            value={selected}
            onValueChange={setSelected}
            onOpen={(path) => openFile(path)}
            status={status}
            defaultExpanded={["src", "src/lib"]}
            onCreate={(path, kind) => {
              if (kind === "folder") setFiles((all) => ({ ...all, [`${path}/`]: "" }))
              else {
                setFiles((all) => {
                  const next = { ...all, [path]: "" }
                  // A file in an empty folder stands in for the folder now.
                  delete next[`${path.split("/").slice(0, -1).join("/")}/`]
                  return next
                })
                setSaved((all) => ({ ...all, [path]: "" }))
                show(path)
              }
            }}
            onRename={(from, to) => {
              const move = (p: string) => (p === from ? to : p.startsWith(`${from}/`) ? to + p.slice(from.length) : p)
              const remap = (all: Record<string, string>) => Object.fromEntries(Object.entries(all).map(([p, t]) => [move(p), t]))
              setFiles(remap)
              setSaved(remap)
              setTabs((t) => ({ open: t.open.map(move), active: t.active && move(t.active) }))
            }}
            onMove={(from, folder) => {
              const name = from.split("/").pop()!
              const to = folder ? `${folder}/${name}` : name
              const move = (p: string) => (p === from ? to : p.startsWith(`${from}/`) ? to + p.slice(from.length) : p)
              const remap = (all: Record<string, string>) => Object.fromEntries(Object.entries(all).map(([p, t]) => [move(p), t]))
              setFiles(remap)
              setSaved(remap)
              setTabs((t) => ({ open: t.open.map(move), active: t.active && move(t.active) }))
            }}
            onDelete={(path) => {
              const gone = (p: string) => p === path || p.startsWith(`${path}/`)
              const drop = (all: Record<string, string>) => Object.fromEntries(Object.entries(all).filter(([p]) => !gone(p)))
              setFiles(drop)
              setSaved(drop)
              closeAll(gone)
            }}
          />
        </ResizablePanel>
        <ResizableHandle aria-label="Resize files" />
        <ResizablePanel minSize={40}>
          <Resizable orientation="vertical" className="template-ide-main" aria-label="Editor and panel">
            <ResizablePanel defaultSize={68} minSize={25}>
              <EditorTabs
                files={open.map((path) => ({ path, dirty: dirty(path) }))}
                value={active}
                onValueChange={(path) => {
                  setTabs((t) => ({ ...t, active: path }))
                  setSelected(path)
                }}
                onClose={askClose}
                empty={
                  <p>
                    Open a file from the list, or press <kbd>⌘P</kbd> / <kbd>Ctrl+P</kbd>.
                  </p>
                }
              >
                {(path) => (
                  <CodeEditor
                    ref={(handle: CodeEditorHandle | null) => {
                      if (handle) editors.current.set(path, handle)
                      else editors.current.delete(path)
                    }}
                    label={path}
                    path={path}
                    value={files[path] ?? ""}
                    onValueChange={(text) => setFiles((all) => ({ ...all, [path]: text }))}
                    // Only the shown file's caret reaches the status bar.
                    onCursorChange={(at) => path === activeRef.current && cursor.set(at)}
                    problems={problems.filter((p) => p.path === path)}
                  />
                )}
              </EditorTabs>
            </ResizablePanel>
            <ResizableHandle aria-label="Resize panel" />
            <ResizablePanel defaultSize={32} minSize={15}>
              <Tabs className="template-ide-panel" value={panel} onValueChange={(v: unknown) => setPanel(String(v))}>
                <TabsList aria-label="Bottom panel">
                  <TabsTab value="problems" ref={problemsTab}>
                    Problems {problems.length > 0 && <span className="template-ide-count">{problems.length}</span>}
                  </TabsTab>
                  <TabsTab value="outline">Outline</TabsTab>
                </TabsList>
                <TabsPanel value="problems" className="template-ide-panel-body">
                  <ScrollBox data-frame="none" className="template-ide-panel-frame" viewport={{ role: "group", "aria-label": "Panel" }}>
                    <ProblemsList problems={problems} onChoose={(p) => openFile(p.path, { line: p.line, col: p.col })} />
                  </ScrollBox>
                </TabsPanel>
                <TabsPanel value="outline" className="template-ide-panel-body">
                  <ScrollBox data-frame="none" className="template-ide-panel-frame" viewport={{ role: "group", "aria-label": "Panel" }}>
                    {active ? (
                      <ul className="template-ide-outline">
                        {(files[active] ?? "")
                          .split("\n")
                          .map((line, i) => ({ line: i + 1, match: line.match(/^(?:export\s+)?(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/) }))
                          .filter((entry) => entry.match)
                          .map((entry) => (
                            <li key={entry.line}>
                              <Button variant="ghost" onClick={() => active && editors.current.get(active)?.goTo(entry.line)}>
                                {entry.match![1]}
                                <span className="template-ide-line">line {entry.line}</span>
                              </Button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="ide-problems-empty">Open a file to see its outline.</p>
                    )}
                  </ScrollBox>
                </TabsPanel>
              </Tabs>
            </ResizablePanel>
          </Resizable>
        </ResizablePanel>
      </Resizable>
      <StatusBar>
        <StatusBarItem>
          <Icon name="branch" />
          {branch}
        </StatusBarItem>
        <StatusBarItem onClick={() => run("problems")}>
          <Icon name="danger" /> {count(errors, "error")} <Icon name="warning" /> {count(warnings, "warning")}
        </StatusBarItem>
        {active && (
          <>
            <CursorStatus store={cursor} />
            <StatusBarItem>{languageName(active)}</StatusBarItem>
          </>
        )}
      </StatusBar>

      <AlertDialog open={closing !== null} onOpenChange={(next: boolean) => !next && setClosing(null)}>
        <AlertDialogBackdrop />
        {/* Back to the file's tab if it stayed open, else the tab that took over. */}
        <AlertDialogContent finalFocus={() => tabElement(closing) ?? tabElement(activeRef.current) ?? root.current ?? undefined}>
          <AlertDialogTitle>Save changes to {closing?.split("/").pop()}?</AlertDialogTitle>
          <AlertDialogDescription>Your changes are lost if you don't save them.</AlertDialogDescription>
          <div className="ide-dialog-actions">
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              data-variant="ghost"
              onClick={() => {
                if (!closing) return
                setFiles((all) => ({ ...all, [closing]: saved[closing] ?? "" }))
                close(closing)
                const next = nextTab(open, closing)
                requestAnimationFrame(() => (tabElement(next) ?? root.current?.querySelector<HTMLElement>(".ide-editor-empty"))?.focus())
              }}
            >
              Don't save
            </AlertDialogClose>
            <AlertDialogClose
              onClick={() => {
                if (!closing) return
                save(closing)
                close(closing)
                const next = nextTab(open, closing)
                requestAnimationFrame(() => (tabElement(next) ?? root.current?.querySelector<HTMLElement>(".ide-editor-empty"))?.focus())
              }}
            >
              Save
            </AlertDialogClose>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export { IdeTemplate, sampleLint as lint, sampleProject }
