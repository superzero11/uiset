// The IDE for Web Components: a file tree, editor tabs, a code editor, a command palette,
// problems and a status bar, each its own element, doing what the React IDE parts do (the
// same editing rules, ide/editing.ts, and the same colors, code/highlight.ts) on UI SDK's
// tree, tabs, textarea, command and dialogs. They take data as properties and report
// what people do as events; web/ide.html joins them into an editor.
import { announce, createUndoStack, matchesShortcut } from "@ui-sdk/core"
import { fuzzyScore } from "@ui-sdk/core/text-match"
import { treeFromPaths, visibleTreeRows, type TreeItemData } from "@ui-sdk/core/tree"
import "@ui-sdk/web/alert-dialog"
import "@ui-sdk/web/button"
import "@ui-sdk/web/command"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/menu"
import "@ui-sdk/web/select"
import "@ui-sdk/web/tabs"
import "@ui-sdk/web/textarea"
import "@ui-sdk/web/tree"
import { languageOf, tokenize, type Token } from "@/registry/uiset/ui/code/highlight"
import { indent, lineCol, moveLines, newline, offsetOf, outdent, type Edit, type Problem } from "@/registry/uiset/ui/ide/editing"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/code/code.css"
import "@/registry/uiset/ui/ide/ide.css"
import { attr, defineElement, ElementBase, Evented, h, isOn, place, reportInput, uid, upgradeProperties } from "./dom"
import { returnFocus } from "@/registry/uiset/ui/uiset/focus"

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

type TreeElement = HTMLElement & {
  paths?: string[]
  value?: string | null
  api?: { reveal: (value: string) => void; collapseAll: () => boolean; getExpanded: () => string[]; setValue: (value: string | null) => boolean }
}
type DialogElement = HTMLElement & { open: boolean; api?: { open: () => Promise<unknown>; close: () => boolean; getPayload: () => unknown } }
type NameDialog = { mode: "file" | "folder" | "rename" | "move"; path: string }

/**
 * <uiset-file-tree label="Files" creatable renamable movable deletable> shows `paths` on
 * UI SDK's tree: folders first, version control marks from `status`, and New file, New
 * folder, Rename (F2), Move and Delete (the Delete key). It fires `open` for a file,
 * `valuechange` as the selection moves, and `create`, `rename`, `move` and `delete`: the
 * page changes `paths` (or calls `event.detail.refuse(message)` to say why not).
 */
/** What `<uiset-file-tree>` fires. A rename, move or create can `refuse("why")`. */
type UISetFileTreeEvents = {
  valuechange: CustomEvent<{ value: string | null; reason?: string }>
  /** Enter or a click on a file, or an agent choosing one. */
  open: CustomEvent<{ value: string }>
  rename: CustomEvent<{ value: string; from: string; refuse: (message: string) => void }>
  /** `value` is the folder it moves to. */
  move: CustomEvent<{ value: string; from: string; refuse: (message: string) => void }>
  create: CustomEvent<{ value: string; kind: "file" | "folder"; refuse: (message: string) => void }>
  delete: CustomEvent<{ value: string }>
}

class UISetFileTree extends Evented<UISetFileTreeEvents>() {
  static observedAttributes = ["label", "heading-level", "creatable", "renamable", "movable", "deletable", "default-expanded"]
  #paths: string[] = []
  #status: Record<string, FileStatus> = {}
  #value: string | null = null
  #items = new Map<string, { item: HTMLElement; label: HTMLElement; group?: HTMLElement; sig: string }>()
  #dom?: {
    title: HTMLElement
    actions: HTMLElement
    newFile: HTMLElement
    newFolder: HTMLElement
    more: HTMLButtonElement
    menuContent: HTMLElement
    tree: TreeElement
    dialog: DialogElement
    dialogContent: HTMLElement
    alert: DialogElement
    alertTitle: HTMLElement
    alertText: HTMLElement
  }
  #dialog: NameDialog | null = null
  #deleting: string | null = null
  #reveal: string | null = null
  #queued = false

  get paths() {
    return this.#paths
  }
  set paths(v: string[]) {
    this.#paths = v ?? []
    this.schedule()
  }
  get status() {
    return this.#status
  }
  set status(v: Record<string, FileStatus>) {
    this.#status = v ?? {}
    this.schedule()
  }
  /** The selected path. Setting it fires no event. */
  get value() {
    return this.#value
  }
  set value(v: string | null) {
    this.#value = v
    if (this.#dom && this.#dom.tree.value !== v) this.#dom.tree.value = v
  }

  connectedCallback() {
    upgradeProperties(this, ["paths", "status", "value"])
    if (!this.#dom) this.build()
    this.schedule()
  }
  attributeChangedCallback() {
    this.schedule()
  }

  private schedule() {
    if (this.#queued) return
    this.#queued = true
    queueMicrotask(() => {
      this.#queued = false
      if (this.#dom) this.render()
    })
  }

  private model() {
    const paths = [...this.#paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    const files = new Set(paths.filter((p) => !p.endsWith("/")))
    const folders = new Set<string>()
    for (const p of paths) {
      const parts = p.replace(/\/$/, "").split("/")
      for (let i = 1; i < (p.endsWith("/") ? parts.length + 1 : parts.length); i++) folders.add(parts.slice(0, i).join("/"))
    }
    const changed = new Set<string>()
    for (const p of Object.keys(this.#status)) {
      const parts = p.split("/")
      for (let i = 1; i < parts.length; i++) changed.add(parts.slice(0, i).join("/"))
    }
    return { paths, items: treeFromPaths(paths), files, folders, changed }
  }

  private build() {
    const titleId = uid("ide-files")
    const button = (label: string, icon: Parameters<typeof iconElement>[0], run: () => void) =>
      h("ui-button", null, h("button", { type: "button", "data-variant": "ghost", "aria-label": label, onclick: run }, iconElement(icon)))
    const newFile = button("New file", "file", () => this.openDialog({ mode: "file", path: this.folderOf(this.#value) }))
    const newFolder = button("New folder", "folder", () => this.openDialog({ mode: "folder", path: this.folderOf(this.#value) }))
    const more = h("button", { type: "button", "data-variant": "ghost" }, iconElement("more")) as HTMLButtonElement
    const menuContent = h("ui-menu-content")
    const menu = h("ui-menu", null, h("ui-menu-trigger", null, more), menuContent)
    // Menu items run through the menu's action: Enter, Space or a click.
    menu.addEventListener("action", (event) => {
      const action = (event as CustomEvent<{ value: unknown }>).detail.value
      const selected = this.#value
      if (action === "collapse") this.#dom?.tree.api?.collapseAll()
      else if (!selected) return
      else if (action === "rename") this.openDialog({ mode: "rename", path: selected })
      else if (action === "move") this.openDialog({ mode: "move", path: selected })
      else if (action === "copy") void navigator.clipboard?.writeText(selected)
      else if (action === "delete") this.askDelete(selected)
    })
    const actions = h("div", { class: "ide-pane-actions" }, newFile, newFolder, menu)
    const title = h("h2", { id: titleId, class: "ide-pane-title" })
    // Read as the tree starts: folders open from the first draw.
    const tree = h("ui-tree", { class: "ide-tree", "aria-labelledby": titleId, activation: "automatic", "default-expanded": this.getAttribute("default-expanded") }) as TreeElement
    tree.addEventListener("valuechange", (event) => {
      const { value, reason } = (event as CustomEvent<{ value: string | null; reason?: string }>).detail
      this.#value = value
      this.dispatchEvent(new CustomEvent("valuechange", { detail: { value, reason } }))
      reportInput(this)
      // An agent's choice of a file opens it, as Enter or a click would for a person.
      if (reason === "imperative" && typeof value === "string" && this.model().files.has(value)) this.dispatchEvent(new CustomEvent("open", { detail: { value } }))
    })
    tree.addEventListener("action", (event) => {
      const value = (event as CustomEvent<{ value: string }>).detail.value
      if (this.model().files.has(value)) this.dispatchEvent(new CustomEvent("open", { detail: { value } }))
    })
    // F2 and Delete act on the item with focus, which can differ from the selection.
    tree.addEventListener("keydown", (event) => {
      const target = event.target as HTMLElement
      if (target.closest("input, textarea")) return
      const path = target.closest<HTMLElement>("[data-path]")?.dataset.path
      if (!path) return
      if (event.key === "F2" && isOn(this, "renamable")) {
        event.preventDefault()
        this.openDialog({ mode: "rename", path })
      } else if ((event.key === "Delete" || (event.key === "Backspace" && event.metaKey)) && isOn(this, "deletable")) {
        event.preventDefault()
        this.askDelete(path)
      }
    })
    const dialogContent = h("ui-dialog-content", { class: "ide-dialog", hidden: true })
    const dialog = h("ui-dialog", null, h("ui-dialog-backdrop", { hidden: true }), dialogContent) as DialogElement
    dialog.addEventListener("openchange", (event) => {
      if (!(event as CustomEvent<{ value: boolean }>).detail.value) this.#dialog = null
    })
    const alertTitle = h("ui-alert-dialog-title")
    const alertText = h("ui-alert-dialog-description")
    const confirm = h("button", { type: "button", "data-variant": "destructive" }, "Delete")
    confirm.addEventListener("click", () => this.confirmDelete())
    const alert = h(
      "ui-alert-dialog",
      null,
      h("ui-alert-dialog-backdrop", { hidden: true }),
      h("ui-alert-dialog-content", { hidden: true }, alertTitle, alertText, h("div", { class: "ide-dialog-actions" }, h("ui-alert-dialog-close", null, h("button", { type: "button" }, "Keep it")), h("ui-alert-dialog-close", null, confirm))),
    ) as DialogElement
    this.classList.add("ide-files")
    this.replaceChildren(h("section", { class: "ide-files-section", "aria-labelledby": titleId }, h("div", { class: "ide-pane-header" }, title, actions), tree), dialog, alert)
    this.#dom = { title, actions, newFile, newFolder, more, menuContent, tree, dialog, dialogContent, alert, alertTitle, alertText }
  }

  private render() {
    const dom = this.#dom!
    const { paths, items, folders, changed } = this.model()
    // The heading fits the page's outline.
    const level = Math.min(6, Math.max(2, Number(this.getAttribute("heading-level")) || 2))
    if (dom.title.localName !== `h${level}`) {
      const heading = h(`h${level}`, { id: dom.title.id, class: "ide-pane-title" })
      dom.title.replaceWith(heading)
      dom.title = heading
    }
    dom.title.textContent = this.getAttribute("label") ?? "Files"
    const creatable = isOn(this, "creatable")
    const editable = creatable || isOn(this, "renamable") || isOn(this, "movable") || isOn(this, "deletable")
    dom.actions.style.display = editable ? "" : "none"
    dom.newFile.style.display = dom.newFolder.style.display = creatable ? "" : "none"
    const selected = this.#value
    dom.more.setAttribute("aria-label", `More file actions${selected ? ` for ${baseName(selected)}` : ""}`)
    const item = (value: string, text: string, disabled = false, key?: string) => h("ui-menu-item", { value, disabled }, text, key ? h("span", { class: "ide-menu-key" }, key) : null)
    dom.menuContent.replaceChildren(
      ...(isOn(this, "renamable") ? [item("rename", "Rename… ", !selected, "F2")] : []),
      ...(isOn(this, "movable") ? [item("move", "Move to…", !selected)] : []),
      item("copy", "Copy path", !selected),
      item("collapse", "Collapse folders"),
      ...(isOn(this, "deletable") ? [h("ui-menu-separator"), h("ui-menu-item", { value: "delete", destructive: true, disabled: !selected }, "Delete…")] : []),
    )
    // The tree's items, kept by path, so a redraw keeps the focused item and open folders.
    this.renderItems(items, dom.tree, folders, changed)
    for (const [path, view] of this.#items) if (!view.item.isConnected) this.#items.delete(path)
    dom.tree.paths = paths
    if (dom.tree.value !== selected) dom.tree.value = selected
    // Focus follows a new, renamed or moved item once the tree has it.
    const reveal = this.#reveal
    if (reveal && this.#items.has(reveal)) {
      this.#reveal = null
      // A frame later, after a closing dialog has handed focus back to its trigger.
      requestAnimationFrame(() => requestAnimationFrame(() => dom.tree.api?.reveal(reveal)))
    }
  }

  private renderItems(list: TreeItemData[], container: HTMLElement, folders: Set<string>, changed: Set<string>) {
    place(
      container,
      list.map((item) => this.itemFor(item, folders, changed)),
      (child) => child.localName === "ui-tree-item",
    )
  }

  private itemFor(item: TreeItemData, folders: Set<string>, changed: Set<string>) {
    const branch = folders.has(item.value)
    const mark = this.#status[item.value]
    // The mark is a letter on screen; its name says it in words, after the file's name.
    const note = mark ? `, ${statusMark[mark][1]}` : branch && changed.has(item.value) ? ", has changes" : ""
    const sig = JSON.stringify([item.label, branch, mark, note])
    let view = this.#items.get(item.value)
    if (!view) {
      const label = h("ui-tree-item-label", { class: "ide-tree-label" })
      view = { item: h("ui-tree-item", { value: item.value, class: "ide-tree-item", "data-path": item.value }, label), label, sig: "" }
      this.#items.set(item.value, view)
    }
    attr(view.item, "label", item.label)
    attr(view.item, "data-status", mark)
    if (view.sig !== sig) {
      view.sig = sig
      attr(view.label, "aria-label", note ? `${item.label}${note}` : null)
      view.label.replaceChildren(
        branch ? h("ui-tree-item-indicator", { class: "ide-tree-chevron" }, iconElement("chevron")) : h("span", { class: "ide-tree-chevron" }),
        iconElement(branch ? "folder" : "file", "ide-tree-icon"),
        h("span", { class: "ide-tree-name" }, item.label),
        ...(mark ? [h("span", { class: "ide-tree-mark", "aria-hidden": "true" }, statusMark[mark][0])] : branch && changed.has(item.value) ? [h("span", { class: "ide-tree-dot", "aria-hidden": "true" })] : []),
      )
    }
    if (item.children) {
      if (!view.group) view.item.append((view.group = h("ui-tree-group")))
      this.renderItems(item.children, view.group, folders, changed)
    } else if (view.group) {
      view.group.remove()
      view.group = undefined
    }
    return view.item
  }

  private folderOf(path: string | null) {
    const { folders } = this.model()
    return !path ? "" : folders.has(path) ? path : dirName(path)
  }

  private neighbor(path: string) {
    const { items } = this.model()
    const rows = visibleTreeRows(items, this.#dom?.tree.api?.getExpanded() ?? []).map((row) => row.item.value)
    const at = rows.indexOf(path)
    return rows.slice(at + 1).find((v) => !v.startsWith(`${path}/`)) ?? rows.slice(0, Math.max(0, at)).at(-1) ?? null
  }

  private openDialog(dialog: NameDialog) {
    const dom = this.#dom!
    this.#dialog = dialog
    const { folders } = this.model()
    const formId = uid("ide-dialog")
    const error = h("p", { class: "ide-error", role: "alert", hidden: true })
    const fail = (message: string) => {
      error.textContent = message
      error.hidden = false
      input?.setAttribute("aria-invalid", "true")
      input?.focus()
    }
    let input: HTMLInputElement | null = null
    let folder: (HTMLElement & { value?: string | null }) | null = null
    const title =
      dialog.mode === "file" ? "New file" : dialog.mode === "folder" ? "New folder" : dialog.mode === "rename" ? `Rename ${baseName(dialog.path)}` : `Move ${baseName(dialog.path)}`
    const description =
      dialog.mode === "move" ? `From ${dirName(dialog.path) || "the top"}.` : `In ${(dialog.mode === "rename" ? dirName(dialog.path) : dialog.path) || "the top folder"}.`
    let field: HTMLElement
    if (dialog.mode === "move") {
      folder = h(
        "ui-select",
        { name: "folder", "default-value": dirName(dialog.path) },
        h("ui-select-label", null, "Folder"),
        h("ui-select-trigger", null, h("button", { type: "button" }, h("ui-select-value"))),
        h(
          "ui-select-content",
          null,
          ...["", ...[...folders].sort()]
            .filter((f) => f !== dialog.path && !f.startsWith(`${dialog.path}/`))
            .map((f) => h("ui-select-item", { value: f }, f || "Top folder")),
        ),
      )
      field = folder
    } else {
      const inputId = uid("ide-name")
      input = h("input", {
        id: inputId,
        name: "name",
        required: true,
        autocomplete: "off",
        spellcheck: "false",
        placeholder: dialog.mode === "folder" ? "components" : "index.ts",
        "aria-describedby": error.id || (error.id = uid("ide-error")),
      }) as HTMLInputElement
      input.value = dialog.mode === "rename" ? baseName(dialog.path) : ""
      input.addEventListener("input", () => {
        error.hidden = true
        input!.removeAttribute("aria-invalid")
      })
      field = h("ui-field", { name: "name" }, h("ui-field-label", { for: inputId }, "Name"), h("ui-input", null, input))
    }
    const form = h(
      "form",
      {
        class: "ide-dialog-form",
        "aria-labelledby": `${formId}-title`,
        novalidate: true,
        onsubmit: (event: Event) => {
          event.preventDefault()
          this.submit(input?.value ?? "", folder?.value ?? "", fail)
        },
      },
      h("ui-dialog-title", { id: `${formId}-title` }, title),
      h("ui-dialog-description", null, description),
      field,
      error,
      h(
        "div",
        { class: "ide-dialog-actions" },
        h("ui-dialog-close", null, h("button", { type: "button" }, "Cancel")),
        h("ui-button", null, h("button", { type: "submit" }, dialog.mode === "rename" ? "Rename" : dialog.mode === "move" ? "Move" : "Create")),
      ),
    )
    dom.dialogContent.replaceChildren(form)
    void dom.dialog.api?.open()
    requestAnimationFrame(() => (input ?? form.querySelector<HTMLElement>("button"))?.focus())
  }

  private submit(name: string, to: string, fail: (message: string) => void) {
    const dialog = this.#dialog
    if (!dialog) return
    const { files, folders } = this.model()
    const clean = name.trim()
    if (dialog.mode !== "move") {
      if (!clean) return fail("Give it a name.")
      if (/[/\\]/.test(clean)) return fail("A name can't have slashes.")
    }
    const join = (folder: string, base: string) => (folder ? `${folder}/${base}` : base)
    const target = dialog.mode === "rename" ? join(dirName(dialog.path), clean) : dialog.mode === "move" ? join(to, baseName(dialog.path)) : join(dialog.path, clean)
    if (target === dialog.path) return this.closeDialog()
    if (files.has(target) || folders.has(target)) return fail(`${baseName(target)} already exists there.`)
    let refused: string | null = null
    const refuse = (message: string) => (refused = message)
    const detail =
      dialog.mode === "rename"
        ? { value: target, from: dialog.path, refuse }
        : dialog.mode === "move"
          ? { value: to, from: dialog.path, refuse }
          : { value: target, kind: dialog.mode, refuse }
    this.dispatchEvent(new CustomEvent(dialog.mode === "rename" ? "rename" : dialog.mode === "move" ? "move" : "create", { detail }))
    if (refused) return fail(refused)
    this.closeDialog()
    this.#reveal = target
    this.select(target)
  }

  private closeDialog() {
    this.#dialog = null
    this.#dom?.dialog.api?.close()
  }

  private select(path: string | null) {
    this.#value = path
    this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: path, reason: "imperative" } }))
    reportInput(this)
    this.schedule()
  }

  private askDelete(path: string) {
    const dom = this.#dom!
    this.#deleting = path
    dom.alertTitle.textContent = `Delete ${baseName(path)}?`
    dom.alertText.textContent = this.model().folders.has(path) ? "The folder goes with everything in it." : "It can't be brought back here."
    dom.alert.querySelector("[data-variant=destructive]")?.setAttribute("data-agent-confirm", `Deletes ${path}`)
    void dom.alert.api?.open()
  }

  private confirmDelete() {
    const path = this.#deleting
    if (!path) return
    this.#deleting = null
    const next = this.neighbor(path)
    this.dispatchEvent(new CustomEvent("delete", { detail: { value: path } }))
    announce(`Deleted ${baseName(path)}.`)
    this.#reveal = next
    this.select(next)
  }
}

/* ---------------------------------------------------------------- Editor tabs */

type EditorFile = { path: string; dirty?: boolean }

/** The tab that takes over when `path` closes: the one after it, else the one before. */
function nextTab(paths: string[], path: string) {
  const at = paths.indexOf(path)
  return paths[at + 1] ?? paths[at - 1] ?? null
}

/**
 * <uiset-editor-tabs label="Open files"> shows `files` as tabs on UI SDK's tabs, each with
 * a panel `renderPanel(path)` fills once and keeps while it's open, so an editor keeps its
 * caret, scroll and undo. Delete on a tab, a middle click or its × fires `close`; once the
 * file leaves `files`, focus goes to the tab that took over, or the empty pane.
 */
/** What `<uiset-editor-tabs>` fires, each with a file's path. */
type UISetEditorTabsEvents = {
  valuechange: CustomEvent<{ value: string }>
  close: CustomEvent<{ value: string }>
}

class UISetEditorTabs extends Evented<UISetEditorTabsEvents>() {
  static observedAttributes = ["label", "empty"]
  #files: EditorFile[] = []
  #value: string | null = null
  #renderPanel?: (path: string) => Node
  #closing: string | null = null
  #queued = false
  #views = new Map<string, { wrap: HTMLElement; tab: HTMLElement; name: HTMLElement; dir: HTMLElement; panel: HTMLElement }>()
  #dom?: { tabs: HTMLElement & { value?: string | null }; list: HTMLElement; empty: HTMLElement }

  get files() {
    return this.#files
  }
  set files(v: EditorFile[]) {
    this.#files = v ?? []
    this.schedule()
  }
  /** The open file's path. Setting it fires no event. */
  get value() {
    return this.#value
  }
  set value(v: string | null) {
    this.#value = v
    this.schedule()
  }
  get renderPanel() {
    return this.#renderPanel
  }
  set renderPanel(fn: ((path: string) => Node) | undefined) {
    this.#renderPanel = fn
    this.schedule()
  }

  connectedCallback() {
    upgradeProperties(this, ["files", "value", "renderPanel"])
    if (!this.#dom) {
      const list = h("ui-tabs-list", { class: "ide-tab-list" })
      const tabs = h("ui-tabs", { class: "ide-tabs" }, list) as HTMLElement & { value?: string | null }
      tabs.addEventListener("valuechange", (event) => {
        const value = String((event as CustomEvent<{ value: unknown }>).detail.value)
        this.#value = value
        this.dispatchEvent(new CustomEvent("valuechange", { detail: { value } }))
        reportInput(this)
      })
      const empty = h("div", { class: "ide-editor-empty", tabindex: "-1" })
      this.#dom = { tabs, list, empty }
      this.replaceChildren(tabs, empty)
    }
    this.schedule()
  }
  attributeChangedCallback() {
    this.schedule()
  }

  private schedule() {
    if (this.#queued) return
    this.#queued = true
    queueMicrotask(() => {
      this.#queued = false
      if (this.#dom) this.render()
    })
  }

  private close(path: string) {
    this.#closing = path
    this.dispatchEvent(new CustomEvent("close", { detail: { value: path } }))
  }

  private render() {
    const dom = this.#dom!
    const files = this.#files
    const current = this.#value && files.some((f) => f.path === this.#value) ? this.#value : (files[0]?.path ?? null)
    const names = new Map<string, number>()
    for (const f of files) names.set(baseName(f.path), (names.get(baseName(f.path)) ?? 0) + 1)
    dom.empty.textContent = this.getAttribute("empty") ?? "No file open."
    dom.empty.style.display = files.length ? "none" : ""
    dom.tabs.style.display = files.length ? "" : "none"
    attr(dom.list, "aria-label", this.getAttribute("label") ?? "Open files")
    const open = new Set(files.map((f) => f.path))
    for (const [path, view] of this.#views) if (!open.has(path)) (view.wrap.remove(), view.panel.remove(), this.#views.delete(path))
    const wraps: HTMLElement[] = []
    const panels: HTMLElement[] = []
    for (const file of files) {
      let view = this.#views.get(file.path)
      if (!view) {
        const path = file.path
        const name = h("span", { class: "ide-tab-name" })
        const dir = h("span", { class: "ide-tab-dir" })
        // UI SDK's tab is the button inside it.
        const tab = h("button", { type: "button", class: "ide-tab-button", title: path }, iconElement("file", "ide-tab-icon"), name, dir)
        tab.addEventListener("keydown", (event) => {
          if (event.key === "Delete") {
            event.preventDefault()
            this.close(path)
          }
        })
        tab.addEventListener("auxclick", (event) => event.button === 1 && this.close(path))
        // The keyboard closes a tab with Delete; this button is for the pointer, and never takes focus.
        const closeButton = h("button", { type: "button", class: "ide-tab-close", tabindex: "-1", "aria-hidden": "true", title: `Close ${baseName(path)}` }, iconElement("close"))
        closeButton.addEventListener("pointerdown", (event) => event.preventDefault())
        closeButton.addEventListener("click", () => this.close(path))
        const wrap = h("span", { class: "ide-tab", role: "presentation" }, h("ui-tabs-tab", { value: path, class: "ide-tab-part" }, tab), closeButton)
        const panel = h("ui-tabs-panel", { value: path, class: "ide-tab-panel", "keep-mounted": true })
        const content = this.#renderPanel?.(path)
        if (content) panel.append(content)
        this.#views.set(path, (view = { wrap, tab, name, dir, panel }))
      }
      const name = baseName(file.path)
      const twin = (names.get(name) ?? 0) > 1
      view.name.textContent = name
      view.dir.textContent = twin ? dirName(file.path) : ""
      view.dir.style.display = twin ? "" : "none"
      attr(view.wrap, "data-dirty", !!file.dirty)
      // Visible text first, then what the dot means.
      attr(view.tab, "aria-label", `${name}${twin ? ` ${dirName(file.path)}` : ""}${file.dirty ? ", unsaved" : ""}`)
      wraps.push(view.wrap)
      panels.push(view.panel)
    }
    place(dom.list, wraps, (child) => child.classList.contains("ide-tab"))
    place(dom.tabs, panels, (child) => child.localName === "ui-tabs-panel")
    if (current && dom.tabs.value !== current) dom.tabs.value = current
    // Once a closed file has gone, focus the tab that took over, or the empty pane. A close
    // that was refused (a dialog asking first) leaves focus to that dialog.
    const gone = this.#closing
    if (gone && !open.has(gone)) {
      this.#closing = null
      returnFocus(() => (current ? this.#views.get(current)?.tab : dom.empty) ?? undefined)
    }
  }

  /** The tab element for a path, for focus. */
  tabFor(path: string) {
    return this.#views.get(path)?.tab
  }
}

/* ---------------------------------------------------------------- Code editor */


const LINE = 20 // px: --code-line in ide.css
const PAD = 12 // px: --code-pad
const glyph = { error: "●", warning: "▲", info: "■" } as const

/**
 * <uiset-code-editor label="src/app.ts" path="src/app.ts"> is a code editor on UI SDK's
 * textarea (so agents read and write it) with line numbers and syntax colors drawn behind
 * the text. Tab indents and Shift+Tab outdents; Escape, then Tab, leaves the editor; Enter
 * keeps the indent; F8 walks `problems`. `value` is live and `valuechange` reports typing;
 * `cursorchange` reports the caret; `goTo(line, col)` moves it.
 */
/** What `<uiset-code-editor>` fires: the text as it's typed, and where the caret is. */
type UISetCodeEditorEvents = {
  valuechange: CustomEvent<{ value: string }>
  cursorchange: CustomEvent<{ line: number; col: number }>
}

class UISetCodeEditor extends Evented<UISetCodeEditorEvents>() {
  static observedAttributes = ["label", "path", "language", "readonly", "tab-size"]
  #initial: string | null = null
  #problems: Problem[] = []
  #dom?: { scroll: HTMLElement; gutter: HTMLElement; body: HTMLElement; bar: HTMLElement; colors: HTMLElement; field: HTMLElement; input: HTMLTextAreaElement; hint: HTMLElement }
  // Undo is the editor's own: typing joins one step until a pause or a caret move; Tab,
  // Enter and changes from outside are steps of their own; the caret comes back with the text.
  #history = createUndoStack<{ text: string; start: number; end: number }>({ text: "", start: 0, end: 0 }, { limit: 500, groupDelay: 800 })
  #editedAt = -1
  #escaped = false
  #applying = false
  #reported = ""
  #colored: Map<string, Token[]> | null = null
  #colorTimer?: ReturnType<typeof setTimeout>
  #colorRun = 0
  #cursor = { line: 1, col: 1 }
  #cursorFrame: number | null = null
  #onSelection = () => this.caretMoved()

  get value() {
    return this.#dom?.input.value ?? this.#initial ?? ""
  }
  /** Text from elsewhere (a command, an agent) is written in, as an undo step of its own. */
  set value(text: string) {
    text = String(text ?? "")
    const input = this.#dom?.input
    if (!input) {
      this.#initial = text
      return
    }
    if (input.value === text) return
    input.value = text
    this.#reported = text
    this.#history.seal()
    this.remember("outside")
    this.#history.seal()
    this.redraw()
  }
  get problems() {
    return this.#problems
  }
  set problems(v: Problem[]) {
    this.#problems = v ?? []
    if (this.#dom) this.drawGutter()
  }

  connectedCallback() {
    upgradeProperties(this, ["value", "problems"])
    if (!this.#dom) this.build()
    document.addEventListener("selectionchange", this.#onSelection)
    this.redraw()
  }
  disconnectedCallback() {
    document.removeEventListener("selectionchange", this.#onSelection)
    clearTimeout(this.#colorTimer)
  }
  attributeChangedCallback() {
    if (!this.#dom) return
    const input = this.#dom.input
    attr(input, "aria-label", this.getAttribute("label") ?? "Code")
    input.readOnly = isOn(this, "readonly")
    attr(this, "data-readonly", isOn(this, "readonly"))
    this.#colored = null
    this.redraw()
  }

  private get unit() {
    return " ".repeat(Math.max(1, Number(this.getAttribute("tab-size")) || 2))
  }
  private get codeLanguage() {
    return this.getAttribute("language") ?? (this.getAttribute("path") ? languageOf(this.getAttribute("path")!) : undefined)
  }

  private build() {
    // A first text written inside the element, as plain HTML would give it.
    const initial = this.#initial ?? this.textContent ?? ""
    const hint = h("p", { id: uid("ide-code-hint"), hidden: true })
    const input = h("textarea", {
      class: "ide-code-input",
      "aria-label": this.getAttribute("label") ?? "Code",
      "aria-describedby": hint.id,
      wrap: "off",
      spellcheck: "false",
      autocapitalize: "off",
      autocomplete: "off",
      autocorrect: "off",
    }) as HTMLTextAreaElement
    input.value = initial
    input.readOnly = isOn(this, "readonly")
    this.#reported = initial
    this.#history = createUndoStack({ text: initial, start: 0, end: 0 }, { limit: 500, groupDelay: 800 })
    const field = h("ui-textarea", { class: "ide-code-field" }, input)
    // Typing, and an agent's setValue on the textarea, which fires input too.
    input.addEventListener("input", () => this.changed(true))
    input.addEventListener("keydown", (event) => this.keyDown(event))
    // Undo and Redo from the Edit menu or a gesture take the same steps.
    input.addEventListener("beforeinput", (event) => {
      if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
        event.preventDefault()
        this.step(event.inputType === "historyUndo")
      }
    })
    input.addEventListener("focus", () => {
      this.#escaped = false
      this.dispatchEvent(new CustomEvent("cursorchange", { detail: { ...this.#cursor } }))
    })
    input.addEventListener("pointerdown", () => (this.#escaped = false))
    const bar = h("div", { class: "ide-code-current", "aria-hidden": "true" })
    const colors = h("pre", { class: "ide-code-colors", "aria-hidden": "true" })
    const body = h("div", { class: "ide-code-body" }, bar, colors, field)
    const gutter = h("div", { class: "ide-code-gutter", "aria-hidden": "true" })
    const scroll = h("div", { class: "ide-code-scroll" }, gutter, body)
    this.classList.add("ide-code")
    attr(this, "data-readonly", isOn(this, "readonly"))
    // Code reads left to right and isn't translated, whatever the page's language does.
    this.setAttribute("dir", "ltr")
    this.setAttribute("translate", "no")
    this.replaceChildren(scroll, hint)
    this.#dom = { scroll, gutter, body, bar, colors, field, input, hint }
  }

  focus(options?: FocusOptions) {
    this.#dom?.input.focus(options)
  }

  /** Puts the caret at a line and column (from 1) and scrolls it into view. */
  goTo(line: number, col = 1) {
    const input = this.#dom?.input
    if (!input) return
    const at = offsetOf(input.value, line, col)
    input.focus()
    input.setSelectionRange(at, at)
    this.track()
    this.showCaret()
  }

  /** `typed`: the textarea's own `input` is on its way up; otherwise the editor fires one. */
  private changed(typed = false) {
    const input = this.#dom!.input
    if (input.value === this.#reported) return
    this.#reported = input.value
    // An edit the editor makes (Tab, Enter) records itself, as one step.
    if (!this.#applying) this.remember("typing")
    this.redraw()
    this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: input.value } }))
    if (!typed) reportInput(this, false)
  }

  private remember(group: string) {
    const input = this.#dom?.input
    if (!input) return
    this.#editedAt = input.selectionEnd
    this.#history.record({ text: input.value, start: input.selectionStart, end: input.selectionEnd }, { group })
  }

  private step(back: boolean) {
    const input = this.#dom!.input
    this.#history.seal()
    const snapshot = back ? this.#history.undo() : this.#history.redo()
    if (!snapshot) return
    input.value = snapshot.text
    input.setSelectionRange(snapshot.start, snapshot.end)
    this.#reported = snapshot.text
    this.redraw()
    this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: snapshot.text } }))
    reportInput(this, false)
    this.track()
    this.showCaret()
  }

  // One native edit, so the browser's own undo keeps working.
  private apply(edit: Edit) {
    const input = this.#dom!.input
    this.#history.seal()
    input.setSelectionRange(edit.from, edit.to)
    this.#applying = true
    const done = document.execCommand?.("insertText", false, edit.insert)
    if (!done) {
      input.setRangeText(edit.insert, edit.from, edit.to, "end")
      this.changed()
    }
    this.#applying = false
    input.setSelectionRange(edit.start, edit.end)
    this.remember("edit")
    this.#history.seal()
    this.track()
    this.showCaret()
  }

  private keyDown(event: KeyboardEvent) {
    const input = this.#dom!.input
    if (event.isComposing) return
    const readOnly = isOn(this, "readonly")
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey
    if (!readOnly && (matchesShortcut(event, "mod+shift+z") || matchesShortcut(event, "mod+y"))) {
      event.preventDefault()
      this.step(false)
      return
    }
    if (!readOnly && matchesShortcut(event, "mod+z")) {
      event.preventDefault()
      this.step(true)
      return
    }
    if (event.key === "Escape") {
      this.#escaped = true
      return
    }
    // After Escape, Tab moves focus on like anywhere else.
    if (event.key === "Tab" && plain && this.#escaped) {
      this.#escaped = false
      return
    }
    this.#escaped = false
    const problems = this.#problems
    if (event.key === "F8" && problems.length) {
      event.preventDefault()
      const sorted = [...problems].sort((a, b) => a.line - b.line || (a.col ?? 1) - (b.col ?? 1))
      const line = lineCol(input.value, input.selectionStart).line
      const next = event.shiftKey ? ([...sorted].reverse().find((p) => p.line < line) ?? sorted.at(-1)!) : (sorted.find((p) => p.line > line) ?? sorted[0]!)
      this.goTo(next.line, next.col)
      announce(`Line ${next.line}: ${next.severity}, ${next.message}`)
      return
    }
    // The textarea is as tall as its text, so Page Up and Page Down move the caret by a
    // frame's worth of lines, as editors do; the frame follows it.
    if ((event.key === "PageDown" || event.key === "PageUp") && plain) {
      event.preventDefault()
      const page = Math.max(1, Math.floor((this.#dom!.scroll.clientHeight || LINE * 10) / LINE) - 1)
      const to = moveLines(input.value, input.selectionEnd, event.key === "PageDown" ? page : -page)
      input.setSelectionRange(event.shiftKey ? Math.min(input.selectionStart, to) : to, event.shiftKey ? Math.max(input.selectionStart, to) : to)
      return
    }
    if (readOnly) return
    if (event.key === "Tab" && plain) {
      event.preventDefault()
      this.apply((event.shiftKey ? outdent : indent)(input.value, input.selectionStart, input.selectionEnd, this.unit))
      return
    }
    if (event.key === "Enter" && plain && !event.shiftKey) {
      event.preventDefault()
      this.apply(newline(input.value, input.selectionStart, input.selectionEnd, this.unit))
    }
  }

  // The caret's line and column, however it moved: keys, the pointer, or an edit.
  private caretMoved() {
    const input = this.#dom?.input
    if (!input || document.activeElement !== input) return
    // The caret moving on its own (arrows, a click) ends a run of typing.
    if (input.selectionEnd !== this.#editedAt || input.selectionStart !== input.selectionEnd) this.#history.seal()
    this.track()
    this.showCaret()
  }

  // The caret's line is one bar moved under the text, so a caret move redraws nothing.
  private track() {
    const input = this.#dom?.input
    if (!input) return
    const at = lineCol(input.value, input.selectionStart)
    this.#dom!.bar.style.translate = `0 ${(at.line - 1) * LINE}px`
    if (at.line === this.#cursor.line && at.col === this.#cursor.col) return
    this.#cursor = at
    if (this.#cursorFrame === null)
      this.#cursorFrame = requestAnimationFrame(() => {
        this.#cursorFrame = null
        this.dispatchEvent(new CustomEvent("cursorchange", { detail: { ...this.#cursor } }))
      })
  }

  private showCaret() {
    const dom = this.#dom
    if (!dom) return
    const at = lineCol(dom.input.value, dom.input.selectionEnd)
    const top = (at.line - 1) * LINE + PAD
    const pad = LINE * 2
    const frame = dom.scroll
    if (top < frame.scrollTop + pad) frame.scrollTop = Math.max(0, top - pad)
    else if (top + LINE > frame.scrollTop + frame.clientHeight - pad) frame.scrollTop = top + LINE - frame.clientHeight + pad
  }

  private redraw() {
    const dom = this.#dom
    if (!dom) return
    const text = dom.input.value
    const lines = text.split("\n")
    dom.scroll.style.setProperty("--code-digits", String(String(lines.length).length))
    dom.body.style.setProperty("--code-columns", String(lines.reduce((most, line) => Math.max(most, line.length), 1)))
    this.drawColors(lines)
    this.drawGutter()
    // Colors arrive after typing pauses, longer for long files; meanwhile, lines that
    // haven't changed keep theirs.
    const lang = this.codeLanguage
    clearTimeout(this.#colorTimer)
    if (!lang) return
    const run = ++this.#colorRun
    this.#colorTimer = setTimeout(
      () => {
        tokenize(text, lang)
          .then((tokens) => {
            if (run !== this.#colorRun || !tokens) return
            const byLine = new Map<string, Token[]>()
            text.split("\n").forEach((line, i) => !byLine.has(line) && tokens[i] && byLine.set(line, tokens[i]!))
            this.#colored = byLine
            this.drawColors(dom.input.value.split("\n"))
          })
          .catch(() => {})
      },
      Math.min(400, 40 + lines.length / 10),
    )
  }

  private drawColors(lines: string[]) {
    const colored = this.codeLanguage ? this.#colored : null
    this.#dom!.colors.replaceChildren(
      ...lines.map((line) => {
        const tokens = colored?.get(line)
        return h(
          "span",
          { class: "ide-code-line" },
          ...(tokens
            ? tokens.map((token) => {
                const span = h("span", null, token.content)
                if (token.color) span.style.color = token.color
                return span
              })
            : [line]),
          "\n",
        )
      }),
    )
  }

  private drawGutter() {
    const dom = this.#dom!
    const count = dom.input.value.split("\n").length
    const marks = new Map<number, Problem["severity"]>()
    const rank = { error: 3, warning: 2, info: 1 }
    for (const p of this.#problems) {
      const was = marks.get(p.line)
      if (!was || rank[p.severity] > rank[was]) marks.set(p.line, p.severity)
    }
    dom.gutter.replaceChildren(
      ...Array.from({ length: count }, (_, i) => {
        const mark = marks.get(i + 1)
        return h("span", { class: "ide-code-number", "data-problem": mark }, mark ? h("span", { class: "ide-code-mark" }, glyph[mark]) : null, String(i + 1))
      }),
    )
    const problems = this.#problems.length
    dom.hint.textContent = isOn(this, "readonly")
      ? "Read only."
      : `Tab indents and Shift+Tab outdents; press Escape, then Tab, to leave the editor.${problems ? ` ${problems} ${problems === 1 ? "problem" : "problems"}; F8 goes to the next.` : ""}`
  }
}

/* ------------------------------------------------------------- Command palette */

type PaletteCommand = { value: string; label: string; shortcut?: string; keywords?: string[] }
type CommandElement = HTMLElement & { items?: unknown[]; query?: string; filter?: (item: { label: string; keywords?: string[] }) => number }

/**
 * <uiset-command-palette lines> goes to a file (`files`, `recent` first), runs a command
 * (`commands`, after >) or goes to a line (after :, with `lines`), on UI SDK's command in a
 * dialog. ⌘P / Ctrl+P opens files, ⌘⇧P / Ctrl+Shift+P commands. It fires `openfile`,
 * `command` and `gotoline`.
 */
/** What `<uiset-command-palette>` fires for the item chosen. */
type UISetCommandPaletteEvents = {
  openfile: CustomEvent<{ value: string }>
  command: CustomEvent<{ value: string }>
  gotoline: CustomEvent<{ value: number }>
}

class UISetCommandPalette extends Evented<UISetCommandPaletteEvents>() {
  static observedAttributes = ["lines"]
  #files: string[] = []
  #recent: string[] = []
  #commands: PaletteCommand[] = []
  #query = ""
  #returnTo: HTMLElement | null = null
  #ran = false
  #dom?: { dialog: DialogElement; title: HTMLElement; command: CommandElement; input: HTMLInputElement; empty: HTMLElement; list: HTMLElement; commandsTrigger: HTMLElement }

  get files() {
    return this.#files
  }
  set files(v: string[]) {
    this.#files = v ?? []
    this.update()
  }
  get recent() {
    return this.#recent
  }
  set recent(v: string[]) {
    this.#recent = v ?? []
    this.update()
  }
  get commands() {
    return this.#commands
  }
  set commands(v: PaletteCommand[]) {
    this.#commands = v ?? []
    this.update()
  }

  connectedCallback() {
    upgradeProperties(this, ["files", "recent", "commands"])
    if (!this.#dom) this.build()
    this.update()
  }
  attributeChangedCallback() {
    this.update()
  }

  private get mode() {
    const q = this.#query
    return q.startsWith(">") ? "commands" : q.startsWith(":") && isOn(this, "lines") ? "line" : "files"
  }
  private get text() {
    return this.#query.replace(/^[>:]\s*/, "")
  }

  private build() {
    const dialogId = uid("ide-palette")
    const trigger = (shortcut: string, payload: string, button: HTMLElement) => {
      const el = h("ui-dialog-trigger", { for: dialogId, shortcut }, button) as HTMLElement & { payload?: unknown }
      el.payload = payload
      return el
    }
    const commandsTrigger = trigger("mod+shift+p", "commands", h("button", { type: "button", "data-variant": "ghost" }, "Commands…"))
    const triggers = h(
      "div",
      { class: "ide-palette-triggers" },
      trigger("mod+p", "files", h("button", { type: "button", class: "ide-palette-trigger" }, iconElement("search"), h("span", null, "Go to file…"))),
      commandsTrigger,
    )
    const title = h("ui-dialog-title", { class: "uiset-visually-hidden" })
    const input = h("input", { "aria-label": "Go to a file, a command after >, or a line after :" }) as HTMLInputElement
    // The shortcuts switch modes here too, instead of reaching the browser's Print.
    input.addEventListener("keydown", (event) => {
      if (matchesShortcut(event, "mod+shift+p")) {
        event.preventDefault()
        this.setQuery("> ")
      } else if (matchesShortcut(event, "mod+p")) {
        event.preventDefault()
        this.setQuery("")
      }
    })
    const empty = h("ui-command-empty", { class: "ide-palette-empty" })
    const list = h("ui-command-list", { class: "ide-palette-list" })
    const template = document.createElement("template")
    template.innerHTML = `<ui-command-item class="ide-palette-item"><ui-command-item-text class="ide-palette-label"></ui-command-item-text><ui-command-shortcut class="ide-palette-key"></ui-command-shortcut></ui-command-item>`
    const command = h("ui-command", null, h("div", { class: "ide-palette-search" }, iconElement("search"), h("ui-command-input", null, input)), empty, list, template) as CommandElement
    command.addEventListener("querychange", (event) => {
      const { value, reason } = (event as CustomEvent<{ value: string; reason?: string }>).detail
      // Escape closes the palette, rather than first clearing a ">" or ":".
      if (reason === "escape-key") return this.close()
      this.#query = value
      this.update()
    })
    command.addEventListener("action", (event) => this.run(String((event as CustomEvent<{ value: unknown }>).detail.value)))
    // Files show their name, then their folder, as in React.
    new MutationObserver(() => this.decorate()).observe(list, { childList: true, subtree: true })
    const dialog = h("ui-dialog", { id: dialogId }, h("ui-dialog-backdrop", { hidden: true }), h("ui-dialog-content", { class: "ide-palette", hidden: true }, title, command)) as DialogElement
    dialog.addEventListener("openchange", (event) => {
      const open = (event as CustomEvent<{ value: boolean }>).detail.value
      if (open) {
        const was = document.activeElement
        this.#returnTo = was instanceof HTMLElement && was !== document.body && !this.contains(was) ? was : this.#returnTo
        this.#ran = false
        // Each opening starts the search its trigger stands for: files, or commands after ">".
        this.setQuery(dialog.api?.getPayload() === "commands" ? "> " : "")
        requestAnimationFrame(() => input.focus())
        return
      }
      // Escape goes back where you were (the editor, say), not to the trigger; a choice
      // leaves focus to what it opened.
      const back = this.#returnTo
      if (!this.#ran && back?.isConnected) requestAnimationFrame(() => back.focus())
    })
    dialog.addEventListener("payloadchange", (event) => this.setQuery((event as CustomEvent<{ value: unknown }>).detail.value === "commands" ? "> " : ""))
    this.replaceChildren(triggers, dialog)
    this.#dom = { dialog, title, command, input, empty, list, commandsTrigger }
  }

  private setQuery(query: string) {
    this.#query = query
    if (this.#dom && this.#dom.command.query !== query) this.#dom.command.query = query
    this.update()
  }

  // Closed through the dialog's api, so it reports the close (and focus goes back).
  private close() {
    this.#dom?.dialog.api?.close()
  }

  private run(value: string) {
    this.#ran = true
    this.close()
    if (value.startsWith("file:")) this.dispatchEvent(new CustomEvent("openfile", { detail: { value: value.slice(5) } }))
    else if (value.startsWith("cmd:")) this.dispatchEvent(new CustomEvent("command", { detail: { value: value.slice(4) } }))
    else if (value.startsWith("line:")) this.dispatchEvent(new CustomEvent("gotoline", { detail: { value: Number(value.slice(5)) } }))
  }

  private update() {
    const dom = this.#dom
    if (!dom) return
    const mode = this.mode
    const text = this.text
    dom.commandsTrigger.style.display = this.#commands.length ? "" : "none"
    dom.title.textContent = mode === "commands" ? "Run a command" : mode === "line" ? "Go to line" : "Go to file"
    dom.input.placeholder = this.#commands.length ? "Search files, > for commands, : for a line" : "Search files"
    dom.empty.textContent = mode === "line" ? "Type a line number." : "Nothing matches."
    const line = Number.parseInt(text, 10)
    const files = this.#files
    dom.command.items =
      mode === "commands"
        ? this.#commands.map((c) => ({ value: `cmd:${c.value}`, label: c.label, keywords: c.keywords, shortcut: c.shortcut }))
        : mode === "line"
          ? Number.isFinite(line) && line > 0
            ? [{ value: `line:${line}`, label: `Go to line ${line}` }]
            : []
          : [
              ...(text ? [] : this.#recent.filter((p) => files.includes(p)).map((p) => ({ value: `file:${p}`, label: baseName(p), keywords: [p, "recent"] }))),
              ...files.filter((p) => text || !this.#recent.includes(p)).map((p) => ({ value: `file:${p}`, label: baseName(p), keywords: [p] })),
            ]
    dom.command.filter = (item) => (mode === "line" || !text ? 1 : fuzzyScore([item.label, ...(item.keywords ?? [])].join(" "), text))
  }

  private decorate() {
    const text = this.text
    for (const item of this.#dom?.list.querySelectorAll<HTMLElement>("ui-command-item") ?? []) {
      const value = item.getAttribute("value") ?? ""
      if (!value.startsWith("file:") || item.querySelector(":scope > .ide-palette-dir, :scope > .uiset-icon")) continue
      const path = value.slice(5)
      item.prepend(iconElement("file"))
      if (dirName(path)) item.append(h("span", { class: "ide-palette-dir" }, dirName(path)))
      else if (!text && this.#recent.includes(path)) item.append(h("span", { class: "ide-palette-dir" }, "recent"))
    }
  }
}

/* ------------------------------------------------------- Problems and status bar */

const severityName = { error: "Error", warning: "Warning", info: "Note" } as const
const severityIcon = { error: "danger", warning: "warning", info: "info" } as const

/** <uiset-problems empty="…"> lists `problems`, worst first; choosing one fires `choose`. */
/** What `<uiset-problems>` fires when a problem is chosen. */
type UISetProblemsEvents = { choose: CustomEvent<{ value: Problem }> }

class UISetProblems extends Evented<UISetProblemsEvents>() {
  static observedAttributes = ["empty"]
  #problems: Problem[] = []
  get problems() {
    return this.#problems
  }
  set problems(v: Problem[]) {
    this.#problems = v ?? []
    this.render()
  }
  connectedCallback() {
    upgradeProperties(this, ["problems"])
    this.render()
  }
  attributeChangedCallback() {
    this.render()
  }
  private render() {
    if (!this.isConnected) return
    const problems = this.#problems
    if (!problems.length) return this.replaceChildren(h("p", { class: "ide-problems-empty" }, this.getAttribute("empty") ?? "No problems found."))
    const rank = { error: 0, warning: 1, info: 2 }
    const sorted = [...problems].sort((a, b) => rank[a.severity] - rank[b.severity] || a.path.localeCompare(b.path) || a.line - b.line)
    // Focus stays on the problem it was on, by place, as the list changes.
    const focused = [...this.querySelectorAll("button")].indexOf(document.activeElement as HTMLButtonElement)
    this.replaceChildren(
      h(
        "ul",
        { class: "ide-problems" },
        ...sorted.map((p) =>
          h(
            "li",
            null,
            h(
              "ui-button",
              null,
              h(
                "button",
                { type: "button", "data-variant": "ghost", class: "ide-problem", "data-severity": p.severity, onclick: () => this.dispatchEvent(new CustomEvent("choose", { detail: { value: p } })) },
                iconElement(severityIcon[p.severity], "ide-problem-icon"),
                h("span", { class: "uiset-visually-hidden" }, `${severityName[p.severity]}: `),
                h("span", { class: "ide-problem-message" }, p.message),
                // The file's name, not its path: an agent naming the editor by path finds only it.
                h("span", { class: "ide-problem-where", title: p.path }, `${baseName(p.path)}:${p.line}${p.col ? `:${p.col}` : ""}`),
              ),
            ),
          ),
        ),
      ),
    )
    if (focused >= 0) this.querySelectorAll("button")[Math.min(focused, sorted.length - 1)]?.focus()
  }
}

/** <uiset-status-bar label="Status"> is the strip along the bottom; its items are your text and buttons. */
class UISetStatusBar extends ElementBase {
  static observedAttributes = ["label"]
  connectedCallback() {
    this.classList.add("ide-status")
    this.setAttribute("role", "group")
    this.attributeChangedCallback()
  }
  attributeChangedCallback() {
    this.setAttribute("aria-label", this.getAttribute("label") ?? "Status")
  }
}

function defineIde() {
  defineElement("uiset-file-tree", UISetFileTree)
  defineElement("uiset-editor-tabs", UISetEditorTabs)
  defineElement("uiset-code-editor", UISetCodeEditor)
  defineElement("uiset-command-palette", UISetCommandPalette)
  defineElement("uiset-problems", UISetProblems)
  defineElement("uiset-status-bar", UISetStatusBar)
}

export { defineIde, nextTab }
export type { EditorFile, FileStatus, PaletteCommand, Problem }
export { UISetFileTree, UISetEditorTabs, UISetCodeEditor, UISetCommandPalette, UISetProblems, UISetStatusBar }
export type { UISetFileTreeEvents, UISetEditorTabsEvents, UISetCodeEditorEvents, UISetCommandPaletteEvents, UISetProblemsEvents }
