// The App Shell for Web Components, as the React AppShell: a sidebar layout whose sidebar
// collapses to icons on wide screens (Mod+B, remembered in the same storage as React's)
// and moves into a drawer opened from the header on narrow ones. <uiset-page-header> and
// <uiset-empty-state> are the React PageHeader and EmptyState.
import { ariaKeyshortcuts, createLocalStorage, createPreference, matchesShortcut } from "@ui-sdk/core"
import "@ui-sdk/web/button"
import "@ui-sdk/web/drawer"
import "@ui-sdk/web/tooltip"
import { iconElement, type IconName } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/shell/shell.css"
import { attr, h, move } from "./dom"

const sidebar = createPreference({
  values: ["expanded", "collapsed"],
  defaultValue: "expanded",
  attribute: "data-sidebar",
  storage: createLocalStorage("uiset-sidebar"),
})

/**
 * <uiset-app-shell label="Navigation" narrow-below="48rem" content="main"> lays out its
 * children: the one with `data-part="brand"` at the top of the sidebar, `data-part="sidebar"`
 * (your <nav class="sidebar-nav">) under it, `data-part="header"` in the header, and the
 * rest as the page's content, in a <main> (or a <div> with `content="div"`, when the page
 * has its own). Sidebar links (`a.sidebar-link`) get a tooltip while it's collapsed.
 */
class UISetAppShell extends HTMLElement {
  static observedAttributes = ["label", "narrow-below"]
  #dom?: {
    shell: HTMLElement
    aside: HTMLElement
    brandSlot: HTMLElement
    toggle: HTMLButtonElement
    main: HTMLElement
    header: HTMLElement
    headerSlot: HTMLElement
    drawer: HTMLElement
    drawerTitle: HTMLElement
    drawerNav: HTMLElement
    content: HTMLElement
  }
  #nav?: HTMLElement
  #media?: MediaQueryList
  #stops: (() => void)[] = []
  #onMedia = () => this.layout()
  #onKey = (event: KeyboardEvent) => {
    if (this.#media?.matches || !matchesShortcut(event, "mod+b")) return
    event.preventDefault()
    this.toggle()
  }

  connectedCallback() {
    if (!this.#dom) this.build()
    this.#media = matchMedia(`(max-width: ${this.getAttribute("narrow-below") ?? "48rem"})`)
    this.#media.addEventListener("change", this.#onMedia)
    document.addEventListener("keydown", this.#onKey)
    this.#stops.push(sidebar.subscribe(() => this.sync()) as () => void)
    this.layout()
  }

  disconnectedCallback() {
    this.#media?.removeEventListener("change", this.#onMedia)
    document.removeEventListener("keydown", this.#onKey)
    for (const stop of this.#stops.splice(0)) stop()
  }

  attributeChangedCallback(name: string) {
    if (!this.#dom) return
    if (name === "narrow-below" && this.isConnected) {
      this.#media?.removeEventListener("change", this.#onMedia)
      this.#media = matchMedia(`(max-width: ${this.getAttribute("narrow-below") ?? "48rem"})`)
      this.#media.addEventListener("change", this.#onMedia)
    }
    this.layout()
  }

  /** Collapses the sidebar to icons, or expands it. */
  toggle() {
    sidebar.set(sidebar.get().value === "expanded" ? "collapsed" : "expanded")
  }

  private build() {
    const parts = (name: string) => [...this.children].filter((child) => (child as HTMLElement).dataset.part === name) as HTMLElement[]
    const brand = parts("brand")
    const nav = parts("sidebar")[0]
    const header = parts("header")
    const content = [...this.children].filter((child) => !(child as HTMLElement).dataset.part)
    this.#nav = nav
    const toggle = h("button", { type: "button", "data-variant": "ghost", class: "app-sidebar-toggle", "aria-keyshortcuts": ariaKeyshortcuts("mod+b"), onclick: () => this.toggle() }, iconElement("sidebar")) as HTMLButtonElement
    const brandSlot = h("div", { class: "app-brand" }, ...brand)
    const aside = h("aside", { class: "app-sidebar" }, h("div", { class: "app-sidebar-top" }, brandSlot, h("ui-button", null, toggle)))
    const drawerTitle = h("ui-drawer-title", { class: "app-brand" })
    const drawerNav = h("div", { class: "app-drawer-nav" })
    const drawer = h(
      "ui-drawer",
      { side: "start" },
      h("ui-drawer-trigger", null, h("button", { type: "button", class: "app-menu-button", "aria-label": "Open navigation" }, iconElement("menu"))),
      h("ui-drawer-backdrop", { hidden: true }),
      h(
        "ui-drawer-content",
        { class: "app-drawer", hidden: true },
        h("div", { class: "app-sidebar-top" }, drawerTitle, h("ui-drawer-close", null, h("button", { type: "button", class: "app-sidebar-toggle", "aria-label": "Close navigation" }, iconElement("close")))),
        drawerNav,
      ),
    )
    const headerSlot = h("div", { class: "app-header-content" }, ...header)
    const headerEl = h("header", { class: "app-header" }, drawer, headerSlot)
    const main = h(this.getAttribute("content") === "div" ? "div" : "main", { class: "app-content" }, ...content)
    const mainCol = h("div", { class: "app-main" }, headerEl, main)
    const shell = h("div", { class: "app-shell" }, aside, mainCol)
    this.replaceChildren(shell)
    this.#dom = { shell, aside, brandSlot, toggle, main: mainCol, header: headerEl, headerSlot, drawer, drawerTitle, drawerNav, content: main }
    this.tooltips()
    // Links the page adds later get their tooltips too.
    if (nav) new MutationObserver(() => this.tooltips()).observe(nav, { childList: true, subtree: true })
  }

  // A collapsed sidebar shows icons; each link's tooltip says its name.
  private tooltips() {
    for (const link of this.#nav?.querySelectorAll<HTMLAnchorElement>("a.sidebar-link") ?? []) {
      if (link.closest("ui-tooltip")) continue
      const label = link.querySelector(".sidebar-label")?.textContent ?? link.textContent ?? ""
      const tooltip = h("ui-tooltip", null)
      link.replaceWith(tooltip)
      tooltip.append(h("ui-tooltip-trigger", null, link), h("ui-tooltip-content", { class: "sidebar-tooltip", side: "right" }, label))
    }
  }

  private layout() {
    const dom = this.#dom
    if (!dom) return
    const narrow = !!this.#media?.matches
    const label = this.getAttribute("label") ?? "Navigation"
    attr(dom.shell, "data-narrow", narrow)
    attr(dom.aside, "aria-label", label)
    dom.aside.style.display = narrow ? "none" : ""
    // The header shows for its own content, or for the menu button on a narrow screen.
    dom.header.style.display = narrow || dom.headerSlot.childElementCount ? "" : "none"
    dom.drawer.style.display = narrow ? "" : "none"
    dom.drawerTitle.textContent = dom.brandSlot.textContent?.trim() || label
    const nav = this.#nav
    if (nav) {
      const home = narrow ? dom.drawerNav : dom.aside
      if (nav.parentElement !== home) move(home, nav, null)
    }
    // A drawer left open while the screen widened closes.
    if (!narrow) (dom.drawer as HTMLElement & { open?: boolean }).open = false
    this.sync()
  }

  private sync() {
    const value = sidebar.get().value
    this.setAttribute("data-sidebar", value)
    this.#dom?.toggle.setAttribute("aria-label", value === "expanded" ? "Collapse sidebar" : "Expand sidebar")
  }
}

/** <uiset-page-header title description level="1|2">: the page's heading, with your actions as children. */
class UISetPageHeader extends HTMLElement {
  static observedAttributes = ["title", "description", "level"]
  #actions?: HTMLElement
  connectedCallback() {
    if (!this.#actions) this.#actions = h("div", { class: "page-header-actions" }, ...this.childNodes)
    this.render()
  }
  attributeChangedCallback() {
    if (this.#actions) this.render()
  }
  private render() {
    // `title` names the page here; it isn't a tooltip.
    const title = this.getAttribute("title")
    if (title !== null) {
      this.dataset.title = title
      this.removeAttribute("title")
      return
    }
    const description = this.getAttribute("description")
    const heading = h(this.getAttribute("level") === "2" ? "h2" : "h1", { class: "page-header-title" }, this.dataset.title ?? "")
    this.classList.add("page-header")
    this.replaceChildren(
      h("div", { class: "page-header-row" }, h("div", { class: "page-header-text" }, heading, description ? h("p", { class: "page-header-description" }, description) : null), ...(this.#actions!.childNodes.length ? [this.#actions!] : [])),
    )
  }
  /** The description, as text. */
  set description(text: string) {
    this.setAttribute("description", text)
  }
}

/** <uiset-empty-state title description icon level="2|3|4">: what to do when there's nothing yet; actions as children. */
class UISetEmptyState extends HTMLElement {
  static observedAttributes = ["title", "description", "icon", "level"]
  #actions?: HTMLElement
  connectedCallback() {
    if (!this.#actions) this.#actions = h("div", { class: "empty-state-actions" }, ...this.childNodes)
    this.render()
  }
  attributeChangedCallback() {
    if (this.#actions) this.render()
  }
  private render() {
    const title = this.getAttribute("title")
    if (title !== null) {
      this.dataset.title = title
      this.removeAttribute("title")
      return
    }
    const level = Math.min(4, Math.max(2, Number(this.getAttribute("level")) || 2))
    const icon = this.getAttribute("icon")
    const description = this.getAttribute("description")
    this.classList.add("empty-state")
    this.replaceChildren(
      ...(icon === "none" ? [] : [iconElement((icon ?? "inbox") as IconName, "empty-state-icon")]),
      h(`h${level}`, { class: "empty-state-title" }, this.dataset.title ?? ""),
      ...(description ? [h("p", { class: "empty-state-description" }, description)] : []),
      ...(this.#actions!.childNodes.length ? [this.#actions!] : []),
    )
  }
}

function defineAppShell() {
  customElements.define("uiset-app-shell", UISetAppShell)
  customElements.define("uiset-page-header", UISetPageHeader)
  customElements.define("uiset-empty-state", UISetEmptyState)
}

export { defineAppShell }
