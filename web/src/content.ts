// Content parts for Web Components, the twins of React's `table`, `avatar-group`,
// `CountBadge` and `code-block`: <uiset-table> around a table of yours, <uiset-avatar-group>
// around UI SDK's avatars, <uiset-count-badge> on a button or avatar, and
// <uiset-code-block>, <uiset-code-tabs> and <uiset-package-command> for code.
import "@ui-sdk/web/avatar"
import "@ui-sdk/web/scroll-area"
import "@ui-sdk/web/tabs"
import { packageCommands, packageManager, type CodeTab, type PackageManager } from "@/registry/uiset/ui/code-block/commands"
import { tokenize, type Token } from "@/registry/uiset/ui/code/highlight"
import "@/registry/uiset/ui/code/code.css"
import "@/registry/uiset/ui/code-block/code-block.css"
import "@/registry/uiset/ui/table/table.css"
import { attr, defineElement, ElementBase, Evented, h, isOn, place, reportInput, showIn, upgradeProperties } from "./dom"

/** A UI SDK scroll area around `child`, with both scrollbars. */
function scrollArea(className: string, child: Node, viewport: Record<string, string>) {
  const content = h("ui-scroll-area-content", null, child)
  const bar = (orientation: string) => h("ui-scroll-area-scrollbar", { orientation }, h("ui-scroll-area-thumb"))
  const view = h("ui-scroll-area-viewport", viewport, content)
  return { frame: h("ui-scroll-area", { class: className }, view, bar("horizontal"), bar("vertical")), view, content }
}

/* ------------------------------------------------------------------- Table */

// Browsers have dropped a table's roles when CSS changes its display, which stacking does,
// so a table that stacks states each role itself.
const roles: [string, string][] = [
  [":scope", "table"],
  [":scope > :is(thead, tbody, tfoot)", "rowgroup"],
  [":scope > :is(thead, tbody, tfoot) > tr", "row"],
  [":scope > :is(thead, tbody, tfoot) > tr > td", "cell"],
  [":scope > :is(thead, tbody, tfoot) > tr > th:not([scope=row])", "columnheader"],
  [":scope > :is(thead, tbody, tfoot) > tr > th[scope=row]", "rowheader"],
]

/**
 * <uiset-table label="Invoices" stack sticky-header max-height="20rem"> around your own
 * `<table>`: a scroll area named by `label`, headings that stay in view, a first column
 * that stays in view (`sticky-column`), and with `stack`, rows that become labelled blocks
 * below 30rem of the table's own width. Each cell is labelled by its column's heading; a
 * cell with its own `data-label` keeps it.
 */
class UISetTable extends ElementBase {
  static observedAttributes = ["label", "stack", "sticky-header", "sticky-column", "max-height", "min-width"]
  #dom?: { frame: HTMLElement; view: HTMLElement; content: HTMLElement }
  #watch?: MutationObserver
  // What this element set, so it never overwrites a role or label of yours.
  #roled = new WeakSet<Element>()
  #labelled = new WeakSet<Element>()

  connectedCallback() {
    if (!this.#dom) {
      const content = scrollArea("table-frame", document.createDocumentFragment(), { role: "region" })
      content.content.append(...this.childNodes)
      this.appendChild(content.frame)
      this.#dom = content
    }
    this.#watch ??= new MutationObserver(() => this.sync())
    this.#watch.observe(this, { childList: true, subtree: true, characterData: true })
    this.sync()
  }

  disconnectedCallback() {
    this.#watch?.disconnect()
  }

  attributeChangedCallback() {
    if (this.#dom) this.sync()
  }

  // A framework adds and removes the table where it put it; it lives in the scroll area now.
  override appendChild<T extends Node>(node: T): T {
    if (!this.#dom) return super.appendChild(node)
    return this.#dom.content.appendChild(node)
  }
  override insertBefore<T extends Node>(node: T, before: Node | null): T {
    if (!this.#dom) return super.insertBefore(node, before)
    const content = this.#dom.content
    return content.insertBefore(node, before && before.parentNode === content ? before : null)
  }
  override removeChild<T extends Node>(child: T): T {
    const parent = child.parentNode
    if (parent && parent !== this && this.contains(child)) return parent.removeChild(child)
    return super.removeChild(child)
  }

  private sync() {
    const { frame, view, content } = this.#dom!
    // Anything put straight into the element (innerHTML, `append`) joins the table.
    for (const node of [...this.childNodes]) if (node !== frame) content.appendChild(node)
    attr(view, "aria-label", this.getAttribute("label") ?? "Table")
    const stack = isOn(this, "stack")
    attr(frame, "data-stack", stack)
    attr(frame, "data-sticky-header", isOn(this, "sticky-header"))
    attr(frame, "data-sticky-column", isOn(this, "sticky-column"))
    frame.style.setProperty("--table-max-height", this.getAttribute("max-height"))
    frame.style.setProperty("--table-min-width", this.getAttribute("min-width"))
    for (const table of content.querySelectorAll<HTMLTableElement>(":scope > table")) {
      table.classList.add("table")
      this.setRoles(table, stack)
      if (stack) this.labelCells(table)
    }
  }

  private setRoles(table: HTMLTableElement, on: boolean) {
    for (const [selector, role] of roles) {
      for (const el of selector === ":scope" ? [table] : table.querySelectorAll(selector)) {
        if (on && !el.hasAttribute("role")) {
          el.setAttribute("role", role)
          this.#roled.add(el)
        } else if (!on && this.#roled.has(el)) {
          el.removeAttribute("role")
          this.#roled.delete(el)
        }
      }
    }
  }

  /** Copies each column's heading onto its cells, for the stacked layout to print beside them. */
  private labelCells(table: HTMLTableElement) {
    const headings = [...table.querySelectorAll(":scope > thead > tr:last-child > *")].map((cell) => cell.textContent?.trim() ?? "")
    for (const row of table.querySelectorAll(":scope > :is(tbody, tfoot) > tr")) {
      ;[...row.children].forEach((cell, index) => {
        if (cell.hasAttribute("data-label") && !this.#labelled.has(cell)) return
        const heading = headings[index]
        if (heading && cell.getAttribute("data-label") !== heading) {
          cell.setAttribute("data-label", heading)
          this.#labelled.add(cell)
        }
      })
    }
  }
}

/* ------------------------------------------------------------- Avatar group */

/**
 * <uiset-avatar-group label="Reviewers" max="3"> around UI SDK's `<ui-avatar>`s: they
 * overlap in a row, and past `max` the rest are a count ("+2", named "2 more"). `total` is
 * how many there are in all, when you render only the first few; `more-label` words the
 * count, with `{count}` where the number goes.
 */
class UISetAvatarGroup extends ElementBase {
  static observedAttributes = ["label", "max", "total", "more-label"]
  #more?: HTMLElement
  #watch?: MutationObserver

  connectedCallback() {
    this.#watch ??= new MutationObserver(() => this.sync())
    this.#watch.observe(this, { childList: true })
    this.sync()
  }

  disconnectedCallback() {
    this.#watch?.disconnect()
  }

  attributeChangedCallback() {
    if (this.isConnected) this.sync()
  }

  private sync() {
    this.classList.add("avatar-group")
    attr(this, "role", "group")
    attr(this, "aria-label", this.getAttribute("label") ?? "People")
    const avatars = [...this.children].filter((child) => child !== this.#more)
    const max = this.getAttribute("max") === null ? avatars.length : Math.max(0, Number(this.getAttribute("max")) || 0)
    avatars.forEach((avatar, index) => attr(avatar, "data-overflow", index >= max))
    const shown = Math.min(max, avatars.length)
    const total = Number(this.getAttribute("total")) || 0
    const more = Math.max(total, avatars.length) - shown
    if (more <= 0) {
      this.#more?.remove()
      return
    }
    if (!this.#more) {
      // Named in words, like the avatars beside it: "+2" alone reads as "plus two".
      this.#more = h("ui-avatar", { class: "avatar-group-more", role: "img" }, h("ui-avatar-fallback"))
    }
    attr(this.#more, "aria-label", (this.getAttribute("more-label") ?? "{count} more").replace("{count}", String(more)))
    const text = `+${more}`
    const fallback = this.#more.firstElementChild!
    if (fallback.textContent !== text) fallback.textContent = text
    if (this.lastElementChild !== this.#more) this.append(this.#more)
  }
}

/* -------------------------------------------------------------- Count badge */

/**
 * <uiset-count-badge count="3" label="3 unread"> around an icon button or avatar: the count
 * on its corner, "99+" past `max`, a dot with `dot`, and nothing at 0 unless `show-zero`.
 * People see the number; screen readers and agents read `label`, so say what's counted.
 */
class UISetCountBadge extends ElementBase {
  static observedAttributes = ["count", "max", "dot", "show-zero", "label"]
  #count = h("span", { class: "count-badge-count", "aria-hidden": "true" })
  #label = h("span", { class: "uiset-visually-hidden" })

  /** The number. An attribute and a property. */
  get count() {
    return Number(this.getAttribute("count")) || 0
  }
  set count(value: number) {
    attr(this, "count", String(Number(value) || 0))
  }

  connectedCallback() {
    upgradeProperties(this, ["count"])
    this.sync()
  }

  attributeChangedCallback() {
    if (this.isConnected) this.sync()
  }

  private sync() {
    this.classList.add("count-badge")
    const count = this.count
    const max = Number(this.getAttribute("max") ?? 99)
    const dot = isOn(this, "dot")
    const visible = count > 0 || isOn(this, "show-zero")
    if (!visible) {
      this.#count.remove()
      this.#label.remove()
      return
    }
    attr(this.#count, "data-dot", dot)
    const text = dot ? "" : count > max ? `${max}+` : String(count)
    if (this.#count.textContent !== text) this.#count.textContent = text
    if (this.#count.parentNode !== this) this.append(this.#count)
    const label = this.getAttribute("label")
    if (label) {
      if (this.#label.textContent !== label) this.#label.textContent = label
      if (this.#label.parentNode !== this) this.append(this.#label)
    } else this.#label.remove()
  }
}

/* ----------------------------------------------------------------- Code */

const trimmed = (code: string) => code.replace(/\n$/, "")

type LineOptions = { language?: string; lineNumbers: boolean; highlight: number[]; wrap: boolean; maxHeight: string | null }

/** Lines of code in a scroll area, plain at once and in the language's colors once loaded. */
class CodeLines {
  readonly el: HTMLElement
  #code: HTMLElement
  #view: HTMLElement
  #drawn = ""

  constructor() {
    this.#code = h("code")
    const area = scrollArea("code-block-scroll", h("pre", { translate: "no" }, this.#code), { role: "group" })
    this.el = area.frame
    this.#view = area.view
  }

  draw(code: string, label: string, options: LineOptions) {
    // A group, not a region: a page of code blocks shouldn't be a page of landmarks.
    attr(this.#view, "aria-label", label)
    attr(this.el, "data-line-numbers", options.lineNumbers)
    attr(this.el, "data-wrap", options.wrap)
    this.el.style.setProperty("--code-block-max-height", options.maxHeight)
    const text = trimmed(code)
    const key = JSON.stringify([text, options.language, options.highlight])
    if (key === this.#drawn) return
    this.#drawn = key
    this.lines(text.split("\n"), options.highlight)
    if (!options.language) return
    tokenize(text, options.language)
      .then((tokens) => {
        if (tokens && this.#drawn === key) this.lines(tokens, options.highlight)
      })
      // An unknown language or a failed load leaves the code plain.
      .catch(() => {})
  }

  private lines(lines: (string | Token[])[], highlight: number[]) {
    const nodes: Node[] = []
    lines.forEach((line, index) => {
      // Each newline sits between the lines, not inside one: a marked line is a box of its
      // own, and a newline inside it wouldn't break the row.
      if (index > 0) nodes.push(document.createTextNode("\n"))
      const content = typeof line === "string" ? [line] : line.map((token) => h("span", { style: token.color ? `color: ${token.color}` : null }, token.content))
      nodes.push(h("span", { class: "code-line", "data-highlighted": highlight.includes(index + 1) }, ...content))
    })
    this.#code.replaceChildren(...nodes)
  }
}

const lineOptions = (el: HTMLElement, language?: string): LineOptions => ({
  language,
  lineNumbers: isOn(el, "line-numbers"),
  highlight: (el.getAttribute("highlight") ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0),
  wrap: isOn(el, "wrap"),
  maxHeight: el.getAttribute("max-height"),
})

const copyButton = () => h("uiset-copy-button") as HTMLElement

/**
 * <uiset-code-block language="tsx" caption="app.tsx" line-numbers highlight="2,4"> with the
 * code in `code`, or as its text: the code in its language's colors (with shiki on the
 * page), a caption (the language without one), and a copy button unless `copy="false"`.
 * `wrap` wraps long lines; `max-height` scrolls past a height.
 */
class UISetCodeBlock extends ElementBase {
  static observedAttributes = ["language", "caption", "copy", "line-numbers", "highlight", "wrap", "max-height"]
  #code: string | null = null
  #dom?: { figure: HTMLElement; head: HTMLElement; title: HTMLElement; copy: HTMLElement; lines: CodeLines }

  /** The code. Text inside the element is its first value. */
  get code() {
    return this.#code ?? ""
  }
  set code(value: string) {
    this.#code = String(value ?? "")
    if (this.#dom) this.draw()
  }

  connectedCallback() {
    upgradeProperties(this, ["code"])
    if (!this.#dom) {
      // Text written in the HTML, without the line break after the opening tag.
      if (this.#code === null) this.#code = (this.textContent ?? "").replace(/^\n/, "")
      const title = h("span", { class: "code-block-title" })
      const copy = copyButton()
      const head = h("figcaption", { class: "code-block-head" }, title, copy)
      const lines = new CodeLines()
      const figure = h("figure", { class: "code-block" }, head, lines.el)
      this.replaceChildren(figure)
      this.#dom = { figure, head, title, copy, lines }
    }
    this.draw()
  }

  attributeChangedCallback() {
    if (this.#dom) this.draw()
  }

  private draw() {
    const { figure, head, title, copy, lines } = this.#dom!
    const caption = this.getAttribute("caption")
    const language = this.getAttribute("language") ?? undefined
    const name = caption ?? language ?? ""
    const copies = this.getAttribute("copy") !== "false"
    showIn(figure, head, !!name || copies, figure.firstChild)
    title.textContent = name
    showIn(head, copy, copies)
    copy.setAttribute("value", trimmed(this.code))
    copy.setAttribute("full-label", `Copy ${caption ?? "the code"}`)
    lines.draw(this.code, caption ? `${caption} code` : "Code", lineOptions(this, language))
  }
}

/** What `<uiset-code-tabs>` fires when another tab is chosen. */
type UISetCodeTabsEvents = { valuechange: CustomEvent<{ value: string }> }

type TabsElement = HTMLElement & { value?: unknown }

/**
 * <uiset-code-tabs label="Package manager"> with `items` (`{ value, label, code, language? }`):
 * versions of the same code, one tab each, with a copy button for the one showing. `value`
 * is the tab showing, an attribute and a property; choosing a tab fires `valuechange`.
 */
class UISetCodeTabs extends Evented<UISetCodeTabsEvents>() {
  static observedAttributes = ["label", "value", "line-numbers", "highlight", "wrap", "max-height"]
  #items: CodeTab[] = []
  #dom?: { tabs: TabsElement; head: HTMLElement; list: HTMLElement; copy: HTMLElement; panels: Map<string, { tab: HTMLElement; panel: HTMLElement; lines: CodeLines }> }

  get items() {
    return this.#items
  }
  set items(value: CodeTab[]) {
    this.#items = value ?? []
    if (this.#dom) this.draw()
  }
  /** The tab showing. An attribute and a property. */
  get value() {
    return this.getAttribute("value") ?? this.#items[0]?.value ?? ""
  }
  set value(value: string | null) {
    attr(this, "value", value)
  }

  connectedCallback() {
    upgradeProperties(this, ["items", "value"])
    if (!this.#dom) {
      const list = h("ui-tabs-list")
      const copy = copyButton()
      const head = h("div", { class: "code-block-head" }, list, copy)
      const tabs = h("ui-tabs", { class: "code-block" }, head) as TabsElement
      tabs.addEventListener("valuechange", (event) => {
        const value = (event as CustomEvent<{ value: unknown }>).detail.value
        if (typeof value !== "string" || value === this.value) return
        this.setAttribute("value", value)
        this.dispatchEvent(new CustomEvent("valuechange", { detail: { value } }))
        reportInput(this)
      })
      this.replaceChildren(tabs)
      this.#dom = { tabs, head, list, copy, panels: new Map() }
    }
    this.draw()
  }

  attributeChangedCallback() {
    if (this.#dom) this.draw()
  }

  private draw() {
    const { tabs, head, list, copy, panels } = this.#dom!
    attr(list, "aria-label", this.getAttribute("label") ?? "Versions")
    const keep = new Set(this.#items.map((item) => item.value))
    for (const [value, view] of panels) {
      if (keep.has(value)) continue
      view.tab.remove()
      view.panel.remove()
      panels.delete(value)
    }
    for (const item of this.#items) {
      let view = panels.get(item.value)
      if (!view) {
        const lines = new CodeLines()
        view = { tab: h("ui-tabs-tab", { value: item.value }, h("button", { type: "button" })), panel: h("ui-tabs-panel", { value: item.value }, lines.el), lines }
        panels.set(item.value, view)
      }
      const button = view.tab.firstElementChild!
      if (button.textContent !== item.label) button.textContent = item.label
      view.lines.draw(item.code, `${item.label} code`, lineOptions(this, item.language))
    }
    // In the items' order, moving only what's out of place, so a focused tab keeps focus.
    const views = this.#items.map((item) => panels.get(item.value)!)
    place(list, views.map((view) => view.tab), (child) => child.localName === "ui-tabs-tab")
    place(tabs, views.map((view) => view.panel), (child) => child.localName === "ui-tabs-panel")
    const active = this.#items.find((item) => item.value === this.value) ?? this.#items[0]
    if (active && tabs.value !== active.value) tabs.value = active.value
    showIn(head, copy, !!active)
    if (active) {
      copy.setAttribute("value", trimmed(active.code))
      copy.setAttribute("full-label", `Copy the ${active.label} code`)
    }
  }
}

/**
 * <uiset-package-command install="@uiset/web"> (add `dev` for a dev dependency), or
 * run="shadcn@latest add …": the command for npm, pnpm, yarn and bun, one tab each. The
 * choice is shared by every package command on the page and remembered for the next visit,
 * as React's `PackageCommand` does (the two share it).
 */
class UISetPackageCommand extends ElementBase {
  static observedAttributes = ["install", "run", "dev", "label"]
  #tabs?: UISetCodeTabs
  #stop?: () => void

  connectedCallback() {
    if (!this.#tabs) {
      this.#tabs = h("uiset-code-tabs", { wrap: true }) as UISetCodeTabs
      this.#tabs.addEventListener("valuechange", (event) => packageManager.set(event.detail.value as PackageManager))
      this.replaceChildren(this.#tabs)
    }
    this.#stop?.()
    this.#stop = packageManager.subscribe(({ value }) => (this.#tabs!.value = value))
    this.draw()
  }

  disconnectedCallback() {
    this.#stop?.()
    this.#stop = undefined
  }

  attributeChangedCallback() {
    if (this.#tabs) this.draw()
  }

  private draw() {
    const tabs = this.#tabs!
    const install = this.getAttribute("install")
    tabs.setAttribute("label", this.getAttribute("label") ?? "Package manager")
    tabs.items = packageCommands(install !== null ? { install, dev: isOn(this, "dev") } : { run: this.getAttribute("run") ?? "" })
    tabs.value = packageManager.get().value
  }
}

function defineContent() {
  defineElement("uiset-table", UISetTable)
  defineElement("uiset-avatar-group", UISetAvatarGroup)
  defineElement("uiset-count-badge", UISetCountBadge)
  defineElement("uiset-code-block", UISetCodeBlock)
  defineElement("uiset-code-tabs", UISetCodeTabs)
  defineElement("uiset-package-command", UISetPackageCommand)
}

export { defineContent, UISetAvatarGroup, UISetCodeBlock, UISetCodeTabs, UISetCountBadge, UISetPackageCommand, UISetTable }
export type { UISetCodeTabsEvents }
