import { announce, matchesShortcut } from "@ui-sdk/core"
import { createMemo, createSignal, For, onSettled, Show, untrack } from "solid-js"
import { AlertDialog, AlertDialogBackdrop, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "../alert-dialog"
import { Button } from "../button"
import { CodeEditor, CommandPalette, EditorTabs, FileTree, nextTab, ProblemsList, StatusBar, StatusBarItem, type CodeEditorHandle, type FileStatus, type Problem } from "../ide"
import { Resizable, ResizableHandle, ResizablePanel } from "../resizable"
import { ScrollBox } from "../scroll-area"
import { Icon } from "../shell/icons"
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs"
import { languageOf } from "../../../registry/uiset/ui/code/highlight"
import { sampleLint, sampleProject } from "../../../registry/uiset/ui/templates/ide-sample"
import "../../../registry/uiset/ui/templates/templates.css"

// The IDE app template in Solid, as React's (registry/uiset/ui/templates/ide-app.tsx), on the
// Solid IDE parts, with the same sample project and linter.

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

const narrowQuery = "(max-width: 40rem)"

/**
 * Whether the screen is phone-narrow: the files then sit above the editor, not beside it.
 * False on the server and in the first draw, so both match.
 */
function createNarrow() {
  const [narrow, setNarrow] = createSignal(false, { ownedWrite: true })
  onSettled(() => {
    const query = matchMedia(narrowQuery)
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  })
  return narrow
}

type Tabset = { open: string[]; active: string | null }

/**
 * A code editor in panes: files with version control marks, tabs, an editor with syntax
 * colors, a command palette (⌘P files, ⌘⇧P commands, : for a line), problems and a status
 * bar. Files are kept in memory; pass `onSave` to write them somewhere.
 */
function IdeTemplate(props: {
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
  const narrow = createNarrow()
  const start = untrack(() => props.defaultFiles ?? sampleProject)
  const [files, setFiles] = createSignal<Record<string, string>>(start)
  // What was last saved, and what the branch had: dirty tabs and version control marks.
  const [saved, setSaved] = createSignal<Record<string, string>>(start)
  const base = start
  // Open tabs and the active one change together, so a close never reads a stale list.
  const [tabs, setTabs] = createSignal<Tabset>(
    untrack(() => {
      const open = (props.defaultOpen ?? ["src/index.ts"]).filter((p) => p in start)
      return { open, active: open[0] ?? null }
    }),
  )
  const open = () => tabs().open
  const active = () => tabs().active
  const [recent, setRecent] = createSignal<string[]>(untrack(open))
  const [selected, setSelected] = createSignal<string | null>(untrack(active))
  const [panel, setPanel] = createSignal("problems")
  const [closing, setClosing] = createSignal<string | null>(null)
  const editors = new Map<string, CodeEditorHandle>()
  // The caret's place: only the status bar reads it, so a caret move redraws just that.
  const [cursor, setCursor] = createSignal({ line: 1, col: 1 }, { ownedWrite: true })
  let problemsTab: HTMLButtonElement | undefined
  let root: HTMLDivElement | undefined

  const paths = createMemo(() => Object.keys(files()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })))
  // Each file is linted again only when its text changes.
  const lintCache = new Map<string, { text: string; problems: Problem[] }>()
  const problems = createMemo(() => {
    const lint = props.lint ?? sampleLint
    return paths().flatMap((p) => {
      const text = files()[p]!
      const cached = lintCache.get(p)
      if (cached?.text === text) return cached.problems
      const found = lint(p, text)
      lintCache.set(p, { text, problems: found })
      return found
    })
  })
  const status = createMemo(() => {
    const out: Record<string, FileStatus> = {}
    for (const p of paths())
      if (!(p in base)) out[p] = "untracked"
      else if (files()[p] !== base[p]) out[p] = "modified"
    return out
  })
  const dirty = (p: string) => files()[p] !== saved()[p]

  // Shows a file in a tab; `openFile` first checks it exists, `show` trusts a file just made.
  const show = (path: string, at?: { line: number; col?: number }) => {
    setTabs((t) => ({ open: t.open.includes(path) ? t.open : [...t.open, path], active: path }))
    setSelected(path)
    setRecent((all) => [path, ...all.filter((p) => p !== path)].slice(0, 8))
    if (at) requestAnimationFrame(() => editors.get(path)?.goTo(at.line, at.col))
  }
  const openFile = (path: string, at?: { line: number; col?: number }) => {
    if (path in files() && !path.endsWith("/")) show(path, at)
  }
  const save = (path: string | null) => {
    if (!path || !dirty(path)) return
    const text = files()[path]!
    setSaved((all) => ({ ...all, [path]: text }))
    props.onSave?.(path, text)
    announce(`Saved ${path.split("/").pop()}.`)
  }
  const closeAll = (gone: (path: string) => boolean) =>
    setTabs((t) => {
      const openNow = t.open.filter((p) => !gone(p))
      let next = t.active
      if (next && gone(next)) {
        // The neighbor that's still open, walking out from the closed tab.
        const at = t.open.indexOf(next)
        next = [...t.open.slice(at + 1), ...t.open.slice(0, at).reverse()].find((p) => !gone(p)) ?? null
      }
      return { open: openNow, active: next }
    })
  const close = (path: string) => setTabs((t) => ({ open: t.open.filter((p) => p !== path), active: t.active === path ? nextTab(t.open, path) : t.active }))
  const askClose = (path: string) => (dirty(path) ? setClosing(path) : close(path))
  const tabElement = (path: string | null) => (path ? (root?.querySelector<HTMLElement>(`[role="tab"][title="${CSS.escape(path)}"]`) ?? undefined) : undefined)

  const run = (command: string) => {
    const path = active()
    if (command === "save") save(path)
    else if (command === "save-all") open().forEach(save)
    else if (command === "close" && path) askClose(path)
    else if (command === "close-all") closeAll((p) => !dirty(p))
    else if (command === "trim" && path) setFiles((all) => ({ ...all, [path]: all[path]!.replace(/[ \t]+$/gm, "") }))
    else if (command === "problems") {
      setPanel("problems")
      requestAnimationFrame(() => problemsTab?.focus())
    }
  }

  const errors = () => problems().filter((p) => p.severity === "error").length
  const warnings = () => problems().filter((p) => p.severity === "warning").length
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
  const outline = createMemo(() => {
    const path = active()
    if (!path) return []
    return (files()[path] ?? "")
      .split("\n")
      .map((line, i) => ({ line: i + 1, match: line.match(/^(?:export\s+)?(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/) }))
      .filter((entry) => entry.match)
      .map((entry) => ({ line: entry.line, name: entry.match![1]! }))
  })
  // After a choice in the save dialog, the tab that takes over, or the empty pane.
  const closeAndFocus = (path: string) => {
    const next = nextTab(open(), path)
    close(path)
    requestAnimationFrame(() => (tabElement(next) ?? root?.querySelector<HTMLElement>(".ide-editor-empty"))?.focus())
  }

  return (
    <div
      class="template-ide"
      ref={(el: HTMLDivElement) => {
        root = el
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (matchesShortcut(event, "mod+s")) {
          event.preventDefault()
          save(active())
        }
      }}
    >
      <header class="template-ide-header">
        <span class="template-ide-project">
          <Icon name="folder" />
          greeter
        </span>
        <CommandPalette
          files={paths().filter((p) => !p.endsWith("/"))}
          recent={recent()}
          commands={commands}
          onOpenFile={(path) => {
            openFile(path)
            // Like any editor: a file opened from the palette is ready to type in.
            requestAnimationFrame(() => editors.get(path)?.focus())
          }}
          onCommand={run}
          onGoToLine={(line) =>
            requestAnimationFrame(() => {
              const path = active()
              if (path) editors.get(path)?.goTo(line)
            })
          }
        />
      </header>
      {/* Files beside the editor; on a phone, above it (a new layout, so sizes start over). */}
      <Show when={narrow() ? "stacked" : "side"} keyed>
        {(layout: string) => {
          const stacked = layout === "stacked"
          return (
            <Resizable orientation={stacked ? "vertical" : "horizontal"} class="template-ide-layout" aria-label="Editor layout">
              <ResizablePanel defaultSize={stacked ? 30 : 24} minSize={stacked ? "6rem" : "12rem"} class="template-ide-side">
                <FileTree
                  label="Project files"
                  headingLevel={props.headingLevel}
                  paths={paths()}
                  value={selected()}
                  onValueChange={setSelected}
                  onOpen={(path) => openFile(path)}
                  status={status()}
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
                <Resizable orientation="vertical" class="template-ide-main" aria-label="Editor and panel">
                  <ResizablePanel defaultSize={68} minSize={25}>
                    <EditorTabs
                      files={open().map((path) => ({ path, dirty: dirty(path) }))}
                      value={active()}
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
                          ref={(handle) => {
                            if (handle) editors.set(path, handle)
                            else editors.delete(path)
                          }}
                          label={path}
                          path={path}
                          value={files()[path] ?? ""}
                          onValueChange={(text) => setFiles((all) => ({ ...all, [path]: text }))}
                          // Only the shown file's caret reaches the status bar.
                          onCursorChange={(at) => {
                            if (path === untrack(active)) setCursor(at)
                          }}
                          problems={problems().filter((p) => p.path === path)}
                        />
                      )}
                    </EditorTabs>
                  </ResizablePanel>
                  <ResizableHandle aria-label="Resize panel" />
                  <ResizablePanel defaultSize={32} minSize={15}>
                    <Tabs
                      class="template-ide-panel"
                      value={panel()}
                      onValueChange={(v: unknown) => {
                        setPanel(String(v))
                      }}
                    >
                      <TabsList aria-label="Bottom panel">
                        <TabsTab
                          value="problems"
                          ref={(el: HTMLButtonElement) => {
                            problemsTab = el
                          }}
                        >
                          Problems{" "}
                          <Show when={problems().length > 0}>
                            <span class="template-ide-count">{problems().length}</span>
                          </Show>
                        </TabsTab>
                        <TabsTab value="outline">Outline</TabsTab>
                      </TabsList>
                      <TabsPanel value="problems" class="template-ide-panel-body">
                        <ScrollBox data-frame="none" class="template-ide-panel-frame" viewport={{ role: "group", "aria-label": "Panel" }}>
                          <ProblemsList problems={problems()} onChoose={(p) => openFile(p.path, { line: p.line, col: p.col })} />
                        </ScrollBox>
                      </TabsPanel>
                      <TabsPanel value="outline" class="template-ide-panel-body">
                        <ScrollBox data-frame="none" class="template-ide-panel-frame" viewport={{ role: "group", "aria-label": "Panel" }}>
                          <Show when={active()} fallback={<p class="ide-problems-empty">Open a file to see its outline.</p>}>
                            <ul class="template-ide-outline">
                              <For each={outline()} keyed={(entry) => entry.line}>
                                {(entry) => (
                                  <li>
                                    <Button
                                      variant="ghost"
                                      onClick={() => {
                                        const path = active()
                                        if (path) editors.get(path)?.goTo(entry().line)
                                      }}
                                    >
                                      {entry().name}
                                      <span class="template-ide-line">line {entry().line}</span>
                                    </Button>
                                  </li>
                                )}
                              </For>
                            </ul>
                          </Show>
                        </ScrollBox>
                      </TabsPanel>
                    </Tabs>
                  </ResizablePanel>
                </Resizable>
              </ResizablePanel>
            </Resizable>
          )
        }}
      </Show>
      <StatusBar>
        <StatusBarItem>
          <Icon name="branch" />
          {props.branch ?? "main"}
        </StatusBarItem>
        <StatusBarItem onClick={() => run("problems")}>
          <Icon name="danger" /> {count(errors(), "error")} <Icon name="warning" /> {count(warnings(), "warning")}
        </StatusBarItem>
        <Show when={active()}>
          {(path) => (
            <>
              <StatusBarItem>
                Ln {cursor().line}, Col {cursor().col}
              </StatusBarItem>
              <StatusBarItem>{languageName(path())}</StatusBarItem>
            </>
          )}
        </Show>
      </StatusBar>

      <AlertDialog
        open={closing() !== null}
        onOpenChange={(next: boolean) => {
          if (!next) setClosing(null)
        }}
      >
        <AlertDialogBackdrop />
        {/* Back to the file's tab if it stayed open, else the tab that took over. */}
        <AlertDialogContent finalFocus={() => tabElement(closing()) ?? tabElement(active()) ?? root ?? undefined}>
          <AlertDialogTitle>Save changes to {closing()?.split("/").pop()}?</AlertDialogTitle>
          <AlertDialogDescription>Your changes are lost if you don't save them.</AlertDialogDescription>
          <div class="ide-dialog-actions">
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              data-variant="ghost"
              onClick={() => {
                const path = closing()
                if (!path) return
                setFiles((all) => ({ ...all, [path]: saved()[path] ?? "" }))
                closeAndFocus(path)
              }}
            >
              Don't save
            </AlertDialogClose>
            <AlertDialogClose
              onClick={() => {
                const path = closing()
                if (!path) return
                save(path)
                closeAndFocus(path)
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
