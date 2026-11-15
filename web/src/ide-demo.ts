// The IDE page's own script: the React IDE template's project, joined from the web
// elements as an app would. Files are kept in memory: text by path, what was last saved,
// and what the branch had, for unsaved dots and version control marks.
import { announce, matchesShortcut } from "@ui-sdk/core"
import { createAgent } from "@ui-sdk/web/agent"
import { languageOf } from "@/registry/uiset/ui/code/highlight"
import type { Problem } from "@/registry/uiset/ui/ide/editing"
import { sampleLint, sampleProject } from "@/registry/uiset/ui/templates/ide-sample"
import "@/registry/uiset/ui/templates/templates.css"
import type { EditorFile, FileStatus, PaletteCommand } from "./ide"
import { nextTab } from "./ide"
import { iconElement } from "./uiset"

type Editor = HTMLElement & { value: string; problems: Problem[]; goTo: (line: number, col?: number) => void }
type Tabs = HTMLElement & { files: EditorFile[]; value: string | null; renderPanel: (path: string) => Node; tabFor: (path: string) => HTMLElement | undefined }
type Tree = HTMLElement & { paths: string[]; status: Record<string, FileStatus>; value: string | null }
type Palette = HTMLElement & { files: string[]; recent: string[]; commands: PaletteCommand[] }
type Alert = HTMLElement & { api: { open: () => Promise<unknown> } }

let files: Record<string, string> = { ...sampleProject }
let saved: Record<string, string> = { ...sampleProject }
const base: Record<string, string> = { ...sampleProject }
let open: string[] = ["src/index.ts"]
let active: string | null = "src/index.ts"
let recent: string[] = [...open]
let closing: string | null = null
let cursor = { line: 1, col: 1 }

const tree = document.getElementById("files") as Tree
const tabs = document.getElementById("tabs") as Tabs
const palette = document.getElementById("palette") as Palette
const problemsList = document.getElementById("problems") as HTMLElement & { problems: Problem[] }
const status = document.getElementById("status")!
const editors = new Map<string, Editor>()
const lintCache = new Map<string, { text: string; problems: Problem[] }>()

const paths = () => Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
const dirty = (p: string) => files[p] !== saved[p]
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
const languageNames: Record<string, string> = { typescript: "TypeScript", tsx: "TypeScript JSX", javascript: "JavaScript", jsx: "JavaScript JSX", json: "JSON", markdown: "Markdown", css: "CSS", html: "HTML" }
const languageName = (path: string) => {
  const id = languageOf(path)
  return id ? (languageNames[id] ?? id) : "Plain text"
}
const commands: PaletteCommand[] = [
  { value: "save", label: "Save", shortcut: "mod+s" },
  { value: "save-all", label: "Save all", keywords: ["write"] },
  { value: "close", label: "Close editor" },
  { value: "close-all", label: "Close all editors" },
  { value: "trim", label: "Trim trailing spaces", keywords: ["format", "whitespace"] },
  { value: "problems", label: "Show problems" },
]

// Each file is linted again only when its text changes.
function problems() {
  return paths().flatMap((p) => {
    const text = files[p]!
    const cached = lintCache.get(p)
    if (cached?.text === text) return cached.problems
    const found = sampleLint(p, text)
    lintCache.set(p, { text, problems: found })
    return found
  })
}

function render() {
  const all = paths()
  const found = problems()
  const marks: Record<string, FileStatus> = {}
  for (const p of all) if (!(p in base)) marks[p] = "untracked"
  else if (files[p] !== base[p]) marks[p] = "modified"
  tree.paths = all
  tree.status = marks
  palette.files = all.filter((p) => !p.endsWith("/"))
  palette.recent = recent
  tabs.files = open.map((path) => ({ path, dirty: dirty(path) }))
  tabs.value = active
  for (const [path, editor] of editors) {
    if (!open.includes(path)) editors.delete(path)
    else {
      if (editor.value !== files[path]) editor.value = files[path] ?? ""
      editor.problems = found.filter((p) => p.path === path)
    }
  }
  problemsList.problems = found
  document.getElementById("problem-count")!.textContent = found.length ? String(found.length) : ""
  renderStatus(found)
}

function renderStatus(found: Problem[]) {
  const errors = found.filter((p) => p.severity === "error").length
  const warnings = found.filter((p) => p.severity === "warning").length
  const problemsButton = document.createElement("button")
  problemsButton.type = "button"
  problemsButton.dataset.variant = "ghost"
  problemsButton.className = "ide-status-item"
  problemsButton.append(iconElement("danger"), ` ${count(errors, "error")} `, iconElement("warning"), ` ${count(warnings, "warning")}`)
  problemsButton.addEventListener("click", () => run("problems"))
  const wrap = document.createElement("ui-button")
  wrap.append(problemsButton)
  const item = (text: string, icon?: Parameters<typeof iconElement>[0]) => {
    const span = document.createElement("span")
    span.className = "ide-status-item"
    if (icon) span.append(iconElement(icon))
    span.append(text)
    return span
  }
  const focusedHere = status.contains(document.activeElement)
  status.replaceChildren(item("main", "branch"), wrap, ...(active ? [item(`Ln ${cursor.line}, Col ${cursor.col}`), item(languageName(active))] : []))
  if (focusedHere) problemsButton.focus()
}

// Shows a file in a tab; `openFile` first checks it exists.
function show(path: string, at?: { line: number; col?: number }) {
  if (!open.includes(path)) open = [...open, path]
  active = path
  tree.value = path
  recent = [path, ...recent.filter((p) => p !== path)].slice(0, 8)
  render()
  if (at) requestAnimationFrame(() => requestAnimationFrame(() => editors.get(path)?.goTo(at.line, at.col)))
}
const openFile = (path: string, at?: { line: number; col?: number }) => path in files && !path.endsWith("/") && show(path, at)

function save(path: string | null) {
  if (!path || !dirty(path)) return
  saved = { ...saved, [path]: files[path]! }
  announce(`Saved ${path.split("/").pop()}.`)
  render()
}

function close(path: string) {
  const next = active === path ? nextTab(open, path) : active
  open = open.filter((p) => p !== path)
  active = next
  render()
}
function closeAll(gone: (path: string) => boolean) {
  if (active && gone(active)) {
    const at = open.indexOf(active)
    active = [...open.slice(at + 1), ...open.slice(0, at).reverse()].find((p) => !gone(p)) ?? null
  }
  open = open.filter((p) => !gone(p))
  render()
}
function askClose(path: string) {
  if (!dirty(path)) return close(path)
  closing = path
  document.getElementById("close-title")!.textContent = `Save changes to ${path.split("/").pop()}?`
  void (document.getElementById("close-dialog") as Alert).api.open().then(() => {
    // Back to the file's tab if it stayed open, else the tab that took over.
    requestAnimationFrame(() => (tabs.tabFor(closing ?? "") ?? (active ? tabs.tabFor(active) : undefined) ?? tabs.querySelector<HTMLElement>(".ide-editor-empty"))?.focus())
    closing = null
  })
}
document.getElementById("close-discard")!.addEventListener("click", () => {
  if (!closing) return
  files = { ...files, [closing]: saved[closing] ?? "" }
  close(closing)
})
document.getElementById("close-save")!.addEventListener("click", () => {
  if (!closing) return
  save(closing)
  close(closing)
})

function run(command: string) {
  if (command === "save") save(active)
  else if (command === "save-all") open.forEach(save)
  else if (command === "close" && active) askClose(active)
  else if (command === "close-all") closeAll((p) => !dirty(p))
  else if (command === "trim" && active) {
    files = { ...files, [active]: files[active]!.replace(/[ \t]+$/gm, "") }
    render()
  } else if (command === "problems") requestAnimationFrame(() => document.querySelector<HTMLElement>("#problems button, #problems")?.focus())
}

// The editor for a file, made once while its tab is open.
tabs.renderPanel = (path) => {
  const editor = document.createElement("uiset-code-editor") as Editor
  editor.setAttribute("label", path)
  editor.setAttribute("path", path)
  editor.value = files[path] ?? ""
  editor.addEventListener("valuechange", (event) => {
    files = { ...files, [path]: (event as CustomEvent<{ value: string }>).detail.value }
    render()
  })
  // Only the shown file's caret reaches the status bar.
  editor.addEventListener("cursorchange", (event) => {
    if (path !== active) return
    cursor = (event as CustomEvent<{ line: number; col: number }>).detail
    renderStatus(problems())
  })
  editors.set(path, editor)
  return editor
}
tabs.addEventListener("valuechange", (event) => {
  active = (event as CustomEvent<{ value: string }>).detail.value
  tree.value = active
  render()
})
tabs.addEventListener("close", (event) => askClose((event as CustomEvent<{ value: string }>).detail.value))

tree.addEventListener("open", (event) => openFile((event as CustomEvent<{ value: string }>).detail.value))
tree.addEventListener("create", (event) => {
  const { value: path, kind } = (event as CustomEvent<{ value: string; kind: "file" | "folder" }>).detail
  if (kind === "folder") files = { ...files, [`${path}/`]: "" }
  else {
    const next = { ...files, [path]: "" }
    // A file in an empty folder stands in for the folder now.
    delete next[`${path.split("/").slice(0, -1).join("/")}/`]
    files = next
    saved = { ...saved, [path]: "" }
    show(path)
  }
  render()
})
const remap = (from: string, to: string) => {
  const move = (p: string) => (p === from ? to : p.startsWith(`${from}/`) ? to + p.slice(from.length) : p)
  const each = (all: Record<string, string>) => Object.fromEntries(Object.entries(all).map(([p, t]) => [move(p), t]))
  files = each(files)
  saved = each(saved)
  open = open.map(move)
  active = active && move(active)
  render()
}
tree.addEventListener("rename", (event) => {
  const { from, value } = (event as CustomEvent<{ from: string; value: string }>).detail
  remap(from, value)
})
tree.addEventListener("move", (event) => {
  const { from, value: folder } = (event as CustomEvent<{ from: string; value: string }>).detail
  const name = from.split("/").pop()!
  remap(from, folder ? `${folder}/${name}` : name)
})
tree.addEventListener("delete", (event) => {
  const path = (event as CustomEvent<{ value: string }>).detail.value
  const gone = (p: string) => p === path || p.startsWith(`${path}/`)
  const drop = (all: Record<string, string>) => Object.fromEntries(Object.entries(all).filter(([p]) => !gone(p)))
  files = drop(files)
  saved = drop(saved)
  closeAll(gone)
})

palette.commands = commands
palette.addEventListener("openfile", (event) => {
  const path = (event as CustomEvent<{ value: string }>).detail.value
  openFile(path)
  // Like any editor: a file opened from the palette is ready to type in.
  requestAnimationFrame(() => requestAnimationFrame(() => editors.get(path)?.focus()))
})
palette.addEventListener("command", (event) => run((event as CustomEvent<{ value: string }>).detail.value))
palette.addEventListener("gotoline", (event) => {
  const line = (event as CustomEvent<{ value: number }>).detail.value
  requestAnimationFrame(() => requestAnimationFrame(() => active && editors.get(active)?.goTo(line)))
})

problemsList.addEventListener("choose", (event) => {
  const p = (event as CustomEvent<{ value: Problem }>).detail.value
  openFile(p.path, { line: p.line, col: p.col })
})

document.getElementById("ide")!.addEventListener("keydown", (event) => {
  if (matchesShortcut(event, "mod+s")) {
    event.preventDefault()
    save(active)
  }
})

document.getElementById("project")!.prepend(iconElement("folder"))
render()
Object.assign(window, { agent: createAgent() })
