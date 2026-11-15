// A small element builder for the web elements' own markup: attributes, listeners and
// children in one call, so a kit's rendering reads like its React twin's JSX.

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

export { attr, h, move, place, uid, upgradeProperties }
export type { Attrs, Child }
