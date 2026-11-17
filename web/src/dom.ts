// A small element builder for the web elements' own markup: attributes, listeners and
// children in one call, so a kit's rendering reads like its React twin's JSX.
import type { UiElement } from "@ui-sdk/web"

type Child = Node | string | number | null | undefined | false
type Attrs = Record<string, unknown>

/**
 * h("button", { type: "button", class: "x", "aria-label": "Add", onclick: run }, "Add")
 * `true` writes an empty attribute; `false`, null and undefined leave it out; a function
 * under "on…" is a listener.
 */
function h(tag: string, attrs?: Attrs | null, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === false || value == null) continue
    if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value as EventListener)
    else if (key === "class") el.className = String(value)
    else el.setAttribute(key, value === true ? "" : String(value))
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(child as Node | string)
  return el
}

/** Sets or removes an attribute, the way `h` writes one, and leaves one that's already right. */
function attr(el: Element, name: string, value: unknown) {
  if (value === false || value == null) {
    if (el.hasAttribute(name)) el.removeAttribute(name)
    return
  }
  const text = value === true ? "" : String(value)
  if (el.getAttribute(name) !== text) el.setAttribute(name, text)
}

/**
 * What every UISet element extends: the browser's HTMLElement, or an empty class where there
 * is none, so the module can be imported on a server (it defines nothing there).
 */
const ElementBase: typeof HTMLElement = globalThis.HTMLElement ?? (class {} as unknown as typeof HTMLElement)

/* ------------------------------------------------------------- hydration */

// Server-rendered HTML that a framework hydrates: elements under an ancestor with
// `data-uiset-hydrating` are defined, so the framework finds their properties and sets data
// on them, but they wait to draw until the attribute goes. Until then the framework sees the
// HTML it rendered.
const HYDRATING = "data-uiset-hydrating"
const waiting = new Map<HTMLElement, () => void>()
let watch: MutationObserver | undefined

const isHydrating = (el: Element) => el.closest(`[${HYDRATING}]`) !== null

function release() {
  // In the order they were connected: parents draw before their children.
  for (const [el, draw] of [...waiting]) {
    if (el.isConnected && isHydrating(el)) continue
    waiting.delete(el)
    if (el.isConnected) draw()
  }
  if (!waiting.size) {
    watch?.disconnect()
    watch = undefined
  }
}

function afterHydration(el: HTMLElement, draw: () => void) {
  waiting.set(el, draw)
  watch ??= new MutationObserver(release)
  watch.observe(document.documentElement, { subtree: true, attributeFilter: [HYDRATING] })
}

/** `customElements.define`, with an element's first draw held while a framework hydrates. */
function defineElement(tag: string, element: CustomElementConstructor) {
  const proto = element.prototype as { connectedCallback?: () => void }
  const connected = proto.connectedCallback
  if (connected) {
    proto.connectedCallback = function (this: HTMLElement) {
      // One taken out before it drew is dropped as the attribute goes.
      if (isHydrating(this)) afterHydration(this, () => connected.call(this))
      else connected.call(this)
    }
  }
  customElements.define(tag, element)
}

/** A createParts root's `render`, held the same way while a framework hydrates. */
function holdRender<Instance>(render: (el: HTMLElement, instance: Instance) => void | (() => void)) {
  return (el: HTMLElement, instance: Instance) => {
    let cleanup: void | (() => void)
    let gone = false
    const draw = () => {
      if (!gone) cleanup = render(el, instance)
    }
    if (isHydrating(el)) afterHydration(el, draw)
    else draw()
    return () => {
      gone = true
      waiting.delete(el)
      if (cleanup) cleanup()
    }
  }
}

/**
 * The base for an element that fires events of its own: `addEventListener` on it types
 * each one's `detail`, as on UI SDK's elements, and the DOM's events stay as they are.
 */
const Evented = <Events>() => ElementBase as unknown as { new (): UiElement<Events>; prototype: UiElement<Events> }

/**
 * Whether a presence attribute is on. `toolbar="false"` is off: frameworks write that for a
 * binding whose value is false, where HTML alone would just leave the attribute out.
 */
const isOn = (el: Element, name: string) => el.hasAttribute(name) && el.getAttribute(name) !== "false"

/** What a presence attribute's property was set to, as on or off. Frameworks pass "" for a bare attribute. */
const asFlag = (value: unknown) => value !== false && value != null && value !== "false"

let next = 0
/** A page-unique id. */
const uid = (prefix = "uiset") => `${prefix}-${++next}`

/**
 * Puts `children` into `parent` in this order, moving only what's out of place and leaving
 * every other child of `parent` (one the page added, say) where it is relative to them.
 */
function place(parent: Element, children: Element[], isOurs: (el: Element) => boolean) {
  const nextOurs = (from: Element | null) => {
    let node = from
    while (node && !isOurs(node)) node = node.nextElementSibling
    return node
  }
  const keep = new Set(children)
  for (const child of [...parent.children]) if (isOurs(child) && !keep.has(child)) child.remove()
  let current = nextOurs(parent.firstElementChild)
  for (const child of children) {
    if (child === current) current = nextOurs(child.nextElementSibling)
    else move(parent, child, current)
  }
}

/**
 * Puts `node` in `parent` (before `before`), or takes it out. Showing by presence: a part's
 * own `display`, like a button's, would outrank the `hidden` attribute.
 */
function showIn(parent: Element, node: Element, on: boolean, before: Node | null = null) {
  if (!on) node.remove()
  else if (node.parentNode !== parent) parent.insertBefore(node, before && before.parentNode === parent ? before : null)
}

type MovingParent = Element & { moveBefore?: (node: Node, child: Node | null) => void }

/**
 * Moves `child` before `ref` without dropping focus: `moveBefore` keeps an element's state
 * where the browser has it; elsewhere, focus inside the moved element is put back.
 */
function move(parent: Element, child: Element, ref: Element | null) {
  const p = parent as MovingParent
  if (typeof p.moveBefore === "function" && child.isConnected && parent.isConnected && child.getRootNode() === parent.getRootNode()) {
    try {
      p.moveBefore(child, ref)
      return
    } catch {
      // Falls back to an ordinary move below.
    }
  }
  const active = document.activeElement
  const focused = active instanceof HTMLElement && child.contains(active) ? active : null
  parent.insertBefore(child, ref)
  if (focused && document.activeElement !== focused) focused.focus({ preventScroll: true })
}

/**
 * Tells two-way bindings that a person or agent changed the value. Vue's `v-model` on a
 * custom element works as on a text field: it sets `value` and listens for `input`. A
 * finished choice fires `change` too, as a select does.
 */
function reportInput(el: HTMLElement, change = true) {
  el.dispatchEvent(new Event("input", { bubbles: true }))
  if (change) el.dispatchEvent(new Event("change", { bubbles: true }))
}

/**
 * Keeps the `input` and `change` of the controls inside `part` (a select, a link field) from
 * reaching the element, which reports its own value once with `reportInput`.
 */
function keepInputInside(part: HTMLElement) {
  const stop = (event: Event) => event.stopPropagation()
  part.addEventListener("input", stop)
  part.addEventListener("change", stop)
}

const reporting = new WeakSet<HTMLElement>()

/**
 * The same for an element made with createParts, whose change events are UI SDK's: call it
 * from the root's `render` (it wires each element once). Once `changeEvent` has gone by
 * unrefused, and the value is in, `input` fires; `change` fires then too, or after
 * `commitEvent`. With `follow`, a `value` the element is controlled by takes the change
 * first, so it stays live, as on UI SDK's own elements.
 */
function reportPartInput(el: HTMLElement, changeEvent: string, commitEvent = changeEvent, { follow = false } = {}) {
  if (reporting.has(el)) return
  reporting.add(el)
  // After every listener has had its say: a refused change fires nothing.
  const after = (type: "input" | "change") => (event: Event) =>
    queueMicrotask(() => {
      if (event.defaultPrevented) return
      if (follow && type === "input") (el as HTMLElement & { value: unknown }).value = (event as CustomEvent<{ value: unknown }>).detail.value
      el.dispatchEvent(new Event(type, { bubbles: true }))
    })
  el.addEventListener(changeEvent, after("input"))
  el.addEventListener(commitEvent, after("change"))
}

/**
 * Properties a page set before the element was defined are own properties that hide the
 * class's accessors (a framework, or a script that ran first): each is taken off and set
 * again through its accessor.
 */
function upgradeProperties(el: HTMLElement, names: readonly string[]) {
  for (const name of names) {
    if (!Object.prototype.hasOwnProperty.call(el, name)) continue
    const value = (el as unknown as Record<string, unknown>)[name]
    delete (el as unknown as Record<string, unknown>)[name]
    ;(el as unknown as Record<string, unknown>)[name] = value
  }
}

export { asFlag, attr, defineElement, ElementBase, Evented, h, holdRender, isOn, keepInputInside, move, place, reportInput, reportPartInput, showIn, uid, upgradeProperties }
export type { Attrs, Child }
