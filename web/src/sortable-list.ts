// The sortable list for Web Components, on the same primitive as React's SortableList:
// <uiset-sortable-list label="Playlist"> draws its `items` and keeps them in the order people
// put them in. Its live `value` is that order; with `multiple`, `selected` moves together.
import type { ReorderReason } from "@ui-sdk/core"
import { createParts, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import { keepDragPreviewInside } from "@/registry/uiset/ui/shell/drag-preview"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import { sortableList, type SortableListSelectReason } from "@/registry/uiset/ui/sortable-list/sortable-list"
import "@/registry/uiset/ui/sortable-list/sortable-list.css"
import { attr, h, holdRender, isOn, place, uid } from "./dom"

type SortableListItemData = {
  value: string
  label: string
  description?: string
  /** Stays where it is. Other items move past it. */
  locked?: boolean
}

/** What `<uiset-sortable-list>` fires. `preventDefault()` refuses the change. */
type UISetSortableListEvents = {
  /** The order changed: `value` is every key in its new place. */
  valuechange: UiChangeEvent<string[], ReorderReason>
  /** The selection changed, with `multiple`. */
  selectedchange: UiChangeEvent<string[], SortableListSelectReason>
}

type SortableListElement = UiElement<UISetSortableListEvents> & {
  items?: SortableListItemData[]
  /** The keys in their order. Setting it fires nothing. */
  value: string[]
  /** The selected keys, with `multiple`. Setting it fires nothing. */
  selected: string[]
  multiple: boolean
  /** Moves items from code or by agents, by key or name, to a position from 1. */
  api?: { moveItem(item: string | string[], position: number): boolean; selectItems(items: string[]): boolean }
}

type SortableListInstance = {
  get: () => object
  subscribe: (run: () => void) => () => void
  api: { reorder: { order: (state: object) => string[] } }
}

const helpText = (multiple: boolean) =>
  "Space picks an item up, the arrow keys move it, Space drops it and Escape puts it back." +
  (multiple ? " Shift+Space selects items to move together, and Shift with the arrow keys selects a run." : "")

type ItemView = { part: HTMLElement; el: HTMLElement; sig: string; position?: HTMLElement }

// Each list keeps its item elements across renders, so focus and a move in progress stay.
const views = new WeakMap<SortableListElement, ListView>()

class ListView {
  private items = new Map<string, ItemView>()
  private help = h("p", { id: uid("sortable-list-help"), hidden: true })
  private instance?: SortableListInstance
  private queued = false

  constructor(private el: SortableListElement) {
    el.classList.add("sortable-list")
    keepDragPreviewInside(el)
    new MutationObserver(() => this.schedule()).observe(el, { attributes: true, attributeFilter: ["label", "numbered", "multiple", "help", "aria-describedby"] })
  }

  attach(instance: SortableListInstance) {
    this.instance = instance
    this.schedule()
    // The order as drawn follows the draft while an item moves, at once.
    let last = instance.api.reorder.order(instance.get())
    return instance.subscribe(() => {
      const now = instance.api.reorder.order(instance.get())
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

  private itemView(item: SortableListItemData, multiple: boolean, numbered: boolean) {
    const sig = JSON.stringify([item, multiple, numbered])
    let view = this.items.get(item.value)
    if (!view) {
      const inner = h("div", { class: "sortable-list-item" })
      const part = h("uiset-sortable-list-item", { value: item.value }, inner)
      this.items.set(item.value, (view = { part, el: inner, sig: "" }))
    }
    if (view.sig !== sig) {
      view.sig = sig
      const descriptionId = item.description ? uid("sortable-list-item") : null
      view.el.setAttribute("aria-label", item.label)
      attr(view.el, "aria-describedby", descriptionId)
      view.position = numbered ? h("span", { class: "sortable-list-position", "aria-hidden": "true" }) : undefined
      view.el.replaceChildren(
        h("span", { class: "sortable-list-handle", "data-sortable-handle": "", "aria-hidden": "true" }, iconElement(item.locked ? "lock" : "grip")),
        ...(multiple && !item.locked ? [h("span", { class: "sortable-list-check", "data-sortable-check": "", "aria-hidden": "true" }, iconElement("check"))] : []),
        ...(view.position ? [view.position] : []),
        h(
          "span",
          { class: "sortable-list-text" },
          h("span", { class: "sortable-list-label" }, item.label),
          // A space between them, for text read as one line, like the agent's item names.
          ...(item.description ? [" ", h("span", { id: descriptionId, class: "sortable-list-description" }, item.description)] : []),
        ),
      )
    }
    return view
  }

  draw() {
    const { el, instance } = this
    if (!instance) return
    const multiple = isOn(el, "multiple")
    const numbered = isOn(el, "numbered")
    attr(el, "aria-label", el.getAttribute("label") ?? "Items")
    attr(el, "class", ["sortable-list", numbered && "sortable-list-numbered"].filter(Boolean).join(" "))
    this.help.textContent = el.getAttribute("help") ?? helpText(multiple)
    if (!this.help.isConnected) el.prepend(this.help)
    // The page's own description stays; the list's help goes after it.
    const described = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== this.help.id)
    attr(el, "aria-describedby", [...described, this.help.id].join(" "))
    const byKey = new Map((el.items ?? []).map((item) => [item.value, item]))
    const order = instance.api.reorder.order(instance.get()).filter((key) => byKey.has(key))
    const views = order.map((key, index) => {
      const view = this.itemView(byKey.get(key)!, multiple, numbered)
      if (view.position) view.position.textContent = String(index + 1)
      return view.part
    })
    place(el, views, (child) => child.localName === "uiset-sortable-list-item")
    for (const [key, view] of this.items) if (!view.part.isConnected) this.items.delete(key)
  }
}

function defineSortableList() {
  createParts(sortableList, {
    root: {
      tag: "uiset-sortable-list",
      properties: ["items"],
      // Read from `items`, not attributes.
      kinds: { keys: null, itemLabel: null, locked: null, itemData: null, value: null, selected: null, label: "string", numbered: "boolean", help: "string" },
      // The order and the selection as they are now. Reading gives a copy; setting fires nothing.
      state: {
        value: { get: (api) => [...api.order()], set: (api, value: string[]) => api.writeOrder(value) },
        selected: { get: (api) => [...api.selectedKeys()], set: (api, value: string[]) => api.writeSelected(value) },
      },
      api: ["moveItem", "selectItems"],
      options: (el) => {
        const list = el as SortableListElement
        const find = (key: string) => list.items?.find((item) => item.value === key)
        return {
          keys: (list.items ?? []).map((item) => item.value),
          itemLabel: (key: string) => find(key)?.label ?? key,
          locked: (key: string) => !!find(key)?.locked,
        }
      },
      render: holdRender((el, instance) => {
        const list = el as SortableListElement
        let view = views.get(list)
        if (!view) views.set(list, (view = new ListView(list)))
        return view.attach(instance as unknown as SortableListInstance)
      }),
    },
    // The item's behavior sits on an inner element: the drag preview is a copy of that, not
    // of a part, so it doesn't look for a list it isn't in.
    item: { tag: "uiset-sortable-list-item", target: (el) => el.firstElementChild as HTMLElement | null, display: "contents" },
  })
}

export { defineSortableList }
export type { SortableListElement, SortableListItemData, UISetSortableListEvents }
