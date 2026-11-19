// The sortable tree for Web Components, on the same primitive as React's SortableTree:
// <uiset-sortable-tree label="Project files" icons> draws its nested `items` as rows people
// reorder and nest. `items` stays live: after a move it reads the tree as it is now.
import type { TreeReorderReason } from "@ui-sdk/core"
import { createParts, type UiDetailedChangeEvent, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import { keepDragPreviewInside } from "@/registry/uiset/ui/shell/drag-preview"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import { sortableTree, type SortableTreeExpandReason, type SortableTreeItem, type SortableTreeItemsDetails, type SortableTreeRow } from "@/registry/uiset/ui/sortable-tree/sortable-tree"
import "@/registry/uiset/ui/sortable-tree/sortable-tree.css"
import { attr, h, holdRender, isOn, place, uid } from "./dom"

/** What `<uiset-sortable-tree>` fires. A change event's `preventDefault()` refuses it. */
type UISetSortableTreeEvents = {
  /** A move was dropped: `value` is the items as they are now; `key`, `parent` and `index` say which and where. */
  itemschange: UiDetailedChangeEvent<SortableTreeItem[], SortableTreeItemsDetails>
  /** A branch opened or closed: `value` is the open branches' keys. */
  expandedchange: UiChangeEvent<string[], SortableTreeExpandReason>
  /** Enter or a press on an item that isn't a branch. */
  action: CustomEvent<{ value: string }>
}

type SortableTreeElement = UiElement<UISetSortableTreeEvents> & {
  /** The items, nested. Live: after a move it reads the tree as it is. Setting it fires nothing. */
  items: SortableTreeItem[]
  /** The open branches' keys. Live; setting it fires nothing. */
  expanded: string[]
  /** Moves, opens and closes items from code or by agents, by key or name. */
  api?: {
    moveItem(item: string, into?: string | null, position?: number): boolean
    expandItem(item: string): boolean
    collapseItem(item: string): boolean
  }
}

type TreeInstance = {
  get: () => object
  subscribe: (run: () => void) => () => void
  api: { shown: (state: object) => SortableTreeRow[]; itemsNow: () => SortableTreeItem[] }
}

const help =
  "Arrow keys move between rows; Right opens a branch and Left closes it. Space picks a row up with what's under it, Up and Down move it, Left and Right change its level, Space drops it and Escape puts it back."

type RowView = { part: HTMLElement; el: HTMLElement; sig: string }

const views = new WeakMap<SortableTreeElement, TreeView>()

class TreeView {
  private rows = new Map<string, RowView>()
  private help = h("p", { id: uid("sortable-tree-help"), hidden: true })
  private instance?: TreeInstance
  private queued = false

  constructor(private el: SortableTreeElement) {
    el.classList.add("sortable-tree")
    keepDragPreviewInside(el)
    new MutationObserver(() => this.schedule()).observe(el, { attributes: true, attributeFilter: ["label", "icons", "help", "aria-describedby"] })
  }

  attach(instance: TreeInstance) {
    this.instance = instance
    this.schedule()
    // The rows as drawn follow the draft while one moves, at once.
    let last = instance.api.shown(instance.get())
    return instance.subscribe(() => {
      const now = instance.api.shown(instance.get())
      if (now === last) return
      last = now
      this.draw()
    })
  }

  schedule() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      this.draw()
    })
  }

  private rowView(item: SortableTreeItem, row: SortableTreeRow, icons: boolean) {
    const sig = JSON.stringify([item.label, item.locked, row.branch, icons])
    let view = this.rows.get(item.value)
    if (!view) {
      const inner = h("div", { class: "sortable-tree-row" })
      const part = h("uiset-sortable-tree-row", { value: item.value }, inner)
      this.rows.set(item.value, (view = { part, el: inner, sig: "" }))
    }
    view.el.style.setProperty("--sortable-tree-depth", String(row.depth))
    if (view.sig !== sig) {
      view.sig = sig
      view.el.setAttribute("aria-label", item.label)
      view.el.replaceChildren(
        h("span", { class: "sortable-tree-toggle", "data-sortable-tree-toggle": "", "aria-hidden": "true" }, row.branch ? iconElement("chevron") : null),
        ...(icons ? [iconElement(row.branch ? "folder" : "file", "sortable-tree-icon")] : []),
        h("span", { class: "sortable-tree-name" }, item.label),
        ...(item.locked ? [iconElement("lock", "sortable-tree-lock")] : []),
        // Where it can't be dropped, a mark in place of the grip: the reason isn't only a color.
        h("span", { class: "sortable-tree-refuse", "aria-hidden": "true" }, iconElement("close")),
        h("span", { class: "sortable-tree-handle", "data-sortable-handle": "", "aria-hidden": "true" }, iconElement("grip")),
      )
    }
    return view.part
  }

  draw() {
    const { el, instance } = this
    if (!instance) return
    attr(el, "aria-label", el.getAttribute("label") ?? "Items")
    this.help.textContent = el.getAttribute("help") ?? help
    if (!this.help.isConnected) el.prepend(this.help)
    const described = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== this.help.id)
    attr(el, "aria-describedby", [...described, this.help.id].join(" "))
    const nodes = new Map<string, SortableTreeItem>()
    const add = (list: SortableTreeItem[]) => list.forEach((item) => (nodes.set(item.value, item), item.children && add(item.children)))
    add(instance.api.itemsNow())
    const icons = isOn(el, "icons")
    const parts = instance.api
      .shown(instance.get())
      .filter((row) => nodes.has(row.key))
      .map((row) => this.rowView(nodes.get(row.key)!, row, icons))
    place(el, parts, (child) => child.localName === "uiset-sortable-tree-row")
    for (const [key, view] of this.rows) if (!view.part.isConnected) this.rows.delete(key)
  }
}

function defineSortableTree() {
  createParts(sortableTree, {
    root: {
      tag: "uiset-sortable-tree",
      kinds: { items: null, expanded: null, label: "string", icons: "boolean", help: "string" },
      // The items and the open branches as they are now. Reading gives the tree's own data;
      // setting fires nothing.
      state: {
        items: { get: (api) => api.itemsNow(), set: (api, items: SortableTreeItem[]) => api.writeItems(items) },
        expanded: { get: (api) => [...api.expandedNow()], set: (api, expanded: string[]) => api.writeExpanded(expanded) },
      },
      api: ["moveItem", "openItem", "expandItem", "collapseItem"],
      render: holdRender((el, instance) => {
        const tree = el as SortableTreeElement
        let view = views.get(tree)
        if (!view) views.set(tree, (view = new TreeView(tree)))
        return view.attach(instance as unknown as TreeInstance)
      }),
    },
    // The row's behavior sits on an inner element: the drag preview is a copy of that.
    row: { tag: "uiset-sortable-tree-row", target: (el) => el.firstElementChild as HTMLElement | null, display: "contents" },
  })
}

export { defineSortableTree }
export type { SortableTreeElement, UISetSortableTreeEvents }
export type { SortableTreeItem as SortableTreeItemData }
