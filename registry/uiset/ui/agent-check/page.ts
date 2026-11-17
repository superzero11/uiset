import { formatAgentReadiness } from "./check"

// Whether an agent that reads the page itself can use it: the controls and names in the
// accessibility tree, which browser agents read (Claude in Chrome, Playwright MCP and others).
// It needs no UI SDK bridge, so it checks any site. On a UI SDK page `checkAgentReadiness`
// asks the bridge instead, and knows more.

type PageReadinessProblem =
  | { kind: "unnamed"; severity: "error"; control: string; near?: string; message: string; elements?: Element[] }
  | { kind: "ambiguous"; severity: "error"; role: string; name: string; count: number; near?: string; message: string; elements?: Element[] }
  | { kind: "unseen"; severity: "error"; control: string; near?: string; message: string; elements?: Element[] }

type PageReadinessReport = {
  /** How it was read: from the page's accessibility tree, with no bridge. */
  mode: "page"
  /** 0 to 100: the share of controls an agent can find by a name of their own. */
  score: number
  /** The controls counted: every button, link, field and widget, and what only looks clickable. */
  controls: number
  /** Those an agent can find by name: named, and no other control of their kind shares the name. */
  ready: number
  problems: PageReadinessProblem[]
}

/**
 * Checks a page as an agent that reads its accessibility tree would use it. Errors: a control
 * with no name, controls of one kind sharing a name (links only when they go to different
 * places, and radios, tabs, options and menu items only within one group), and an element
 * that looks clickable (a pointer cursor, or an `onclick`) but isn't a control. Names follow
 * the browser's rules closely but not completely: `aria-labelledby`, `aria-label`, a label,
 * the text inside, then `title` or `placeholder`.
 *
 * Self-contained, so a test runner can run it in the page; `elements: true` adds each
 * problem's elements, for a report drawn on the page itself.
 */
function checkPageReadiness(
  root?: ParentNode | string | null,
  options: { elements?: boolean; ignore?: (problem: PageReadinessProblem) => boolean } = {},
): PageReadinessReport {
  const scope: ParentNode | null = typeof root === "string" ? document.querySelector(root) : (root ?? document)
  // Each problem with its elements, kept whether or not the report shows them.
  const found: { problem: PageReadinessProblem; elements: Element[] }[] = []
  if (!scope) return { mode: "page", score: 100, controls: 0, ready: 0, problems: [] }

  const widgetRoles = [
    "button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "menuitemcheckbox", "menuitemradio",
    "option", "slider", "spinbutton", "combobox", "textbox", "searchbox", "treeitem", "listbox",
  ]
  // Roles whose name comes from the text inside them.
  const fromContent = new Set(["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "treeitem"])
  // Roles that only need a name of their own within their group (a question's Yes and No).
  const grouped: Record<string, string> = {
    radio: '[role="radiogroup"], fieldset',
    tab: '[role="tablist"]',
    option: '[role="listbox"], select',
    menuitem: '[role="menu"], [role="menubar"]',
    menuitemcheckbox: '[role="menu"], [role="menubar"]',
    menuitemradio: '[role="menu"], [role="menubar"]',
    treeitem: '[role="tree"], [role="group"]',
  }
  const blocks = /^(address|article|aside|blockquote|br|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|td|th|tr|ul)$/

  const isHidden = (el: Element) =>
    !!el.closest('[hidden], [inert], [aria-hidden="true"], [data-agent-hidden]') ||
    (typeof (el as HTMLElement).checkVisibility === "function" && !(el as HTMLElement).checkVisibility())

  const roleOf = (el: Element): string | null => {
    const explicit = el.getAttribute("role")?.trim().split(/\s+/)[0]
    if (explicit) return widgetRoles.includes(explicit) ? explicit : null
    const tag = el.localName
    if ((tag === "a" || tag === "area") && el.hasAttribute("href")) return "link"
    if (tag === "button" || tag === "summary") return "button"
    if (tag === "textarea") return "textbox"
    if (tag === "select") return (el as HTMLSelectElement).multiple || (el as HTMLSelectElement).size > 1 ? "listbox" : "combobox"
    if (tag === "input") {
      const type = (el as HTMLInputElement).type
      if (type === "hidden") return null
      if (type === "checkbox" || type === "radio") return type
      if (type === "range") return "slider"
      if (type === "number") return "spinbutton"
      if (type === "search") return "searchbox"
      if (["button", "submit", "reset", "image", "color", "file"].includes(type)) return "button"
      return "textbox"
    }
    const editable = el.getAttribute("contenteditable")
    if (editable === "" || editable === "true") return "textbox"
    return null
  }

  // The text a person reads in it, the way a name from content is built: hidden parts left
  // out, images by their alt, icons by their title, fields left out.
  const textOf = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ""
    if (node.nodeType !== Node.ELEMENT_NODE) return ""
    const el = node as Element
    if (el.closest('[hidden], [aria-hidden="true"]') || (typeof (el as HTMLElement).checkVisibility === "function" && !(el as HTMLElement).checkVisibility())) return ""
    const label = el.getAttribute("aria-label")?.trim()
    if (label) return ` ${label} `
    const tag = el.localName
    if (tag === "img" || (tag === "input" && (el as HTMLInputElement).type === "image")) return ` ${el.getAttribute("alt") ?? ""} `
    if (tag === "svg") return ` ${el.querySelector(":scope > title")?.textContent ?? ""} `
    if (tag === "input" || tag === "select" || tag === "textarea" || tag === "script" || tag === "style") return ""
    // An element with no text of its own is read by its title, like an icon inside a link.
    const inside = Array.from(el.childNodes, textOf).join("") || el.getAttribute("title") || ""
    return blocks.test(tag) ? ` ${inside} ` : inside
  }
  const clean = (text: string) => text.replace(/\s+/g, " ").trim()

  const nameOf = (el: Element, role: string): string => {
    const labelledBy = clean(
      (el.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .map((id) => {
          const target = id ? document.getElementById(id) : null
          return target ? textOf(target) : ""
        })
        .join(" "),
    )
    if (labelledBy) return labelledBy
    const label = clean(el.getAttribute("aria-label") ?? "")
    if (label) return label
    const tag = el.localName
    if (tag === "input") {
      const type = (el as HTMLInputElement).type
      if (type === "submit" || type === "reset" || type === "button") return clean((el as HTMLInputElement).value) || (type === "submit" ? "Submit" : type === "reset" ? "Reset" : "")
      if (type === "image") return clean(el.getAttribute("alt") ?? "") || clean((el as HTMLInputElement).value)
    }
    const labels = (el as HTMLInputElement).labels
    if (labels?.length) {
      const fromLabels = clean(Array.from(labels, textOf).join(" "))
      if (fromLabels) return fromLabels
    }
    if (fromContent.has(role) || tag === "summary") {
      const inside = clean(textOf(el))
      if (inside) return inside
    }
    return clean(el.getAttribute("title") ?? "") || clean(el.getAttribute("placeholder") ?? "")
  }

  // Where it is, in words a person finds on the page: an id, a name, or a heading around it.
  const nearOf = (el: Element): string | undefined => {
    for (let at = el.parentElement; at && at !== document.body; at = at.parentElement) {
      if (at.id) return `#${at.id}`
      const heading = at.querySelector(
        ":scope > :is(h1, h2, h3, h4, h5, h6, figcaption, legend), :scope > :is(header, :first-child) :is(h1, h2, h3, h4, h5, h6)",
      )
      const named = clean(at.getAttribute("aria-label") ?? "") || clean(heading?.textContent ?? "")
      if (named) return `"${named.slice(0, 40)}"`
    }
    return undefined
  }
  const describe = (role: string, name: string) => (name ? `${role} "${name.slice(0, 60)}"` : role)

  const selector = [
    "a[href]", "area[href]", "button", 'input:not([type="hidden"])', "select", "textarea", "summary",
    '[contenteditable=""]', '[contenteditable="true"]', ...widgetRoles.map((role) => `[role="${role}"]`),
  ].join(", ")

  type Control = { el: Element; role: string; name: string }
  const controls: Control[] = []
  for (const el of Array.from(scope.querySelectorAll(selector))) {
    if (isHidden(el)) continue
    if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") continue
    const role = roleOf(el)
    if (!role) continue
    controls.push({ el, role, name: nameOf(el, role) })
  }

  for (const control of controls) {
    if (control.name) continue
    const near = nearOf(control.el)
    found.push({ elements: [control.el], problem: {
      kind: "unnamed",
      severity: "error",
      control: describe(control.role, "") + (control.el.localName === control.role ? "" : ` (${control.el.localName})`),
      near,
      message: `A ${control.role}${near ? ` in ${near}` : ""} has no name, so an agent can't tell what it does. Give it visible text, a label, or aria-label.`,
    } })
  }

  // Controls of one kind with one name, within their group where that's where names count.
  const groupIds = new Map<Element, number>()
  const groups = new Map<string, Control[]>()
  for (const control of controls) {
    if (!control.name) continue
    const within = grouped[control.role]
    let group = ""
    if (within) {
      const container =
        control.el.localName === "input" && (control.el as HTMLInputElement).name
          ? (control.el as HTMLInputElement).form ?? document.body
          : control.el.closest(within)
      if (container) {
        if (!groupIds.has(container)) groupIds.set(container, groupIds.size)
        group = `${groupIds.get(container)}:${(control.el as HTMLInputElement).name ?? ""}`
      }
    }
    const key = `${control.role}\u0000${group}\u0000${control.name.toLowerCase()}`
    groups.set(key, [...(groups.get(key) ?? []), control])
  }
  for (const same of groups.values()) {
    if (same.length < 2) continue
    const { role, name } = same[0]!
    // Links that go to the same place do the same thing, whatever an agent picks.
    if (role === "link" && new Set(same.map((control) => (control.el as HTMLAnchorElement).href)).size === 1) continue
    const near = nearOf(same[0]!.el)
    found.push({ elements: same.map((control) => control.el), problem: {
      kind: "ambiguous",
      severity: "error",
      role,
      name,
      count: same.length,
      near,
      message: `${same.length} ${role}s are named "${name.slice(0, 60)}"${role === "link" ? " but go to different places" : ""}, so an agent can't tell which is which. Give each a name of its own, like "${name.slice(0, 30)} for …" with what it's about, using aria-label if the visible text stays the same.`,
    } })
  }

  // What looks clickable but isn't a control: a pointer cursor that starts on it, or an
  // onclick, on an element that is no control, holds none and sits in none.
  const isControl = new Set(controls.map((control) => control.el))
  const looksClickable: Element[] = []
  for (const el of Array.from(scope.querySelectorAll("*"))) {
    if (isControl.has(el) || /^(html|body|label|option|svg|path|use|g|circle|rect|line|polyline|polygon|img|input|select|textarea)$/.test(el.localName)) continue
    if (el.closest(`${selector}, label`) !== null || el.querySelector(selector) !== null) continue
    const clicks = el.hasAttribute("onclick")
    const pointer = getComputedStyle(el).cursor === "pointer" && (!el.parentElement || getComputedStyle(el.parentElement).cursor !== "pointer")
    if (!clicks && !pointer) continue
    if (isHidden(el)) continue
    looksClickable.push(el)
  }
  for (const el of looksClickable) {
    const text = clean(textOf(el)).slice(0, 60)
    const near = nearOf(el)
    found.push({ elements: [el], problem: {
      kind: "unseen",
      severity: "error",
      control: text ? `${el.localName} "${text}"` : el.localName,
      near,
      message: `${text ? `"${text}"` : `A ${el.localName}`}${near ? ` (in ${near})` : ""} looks clickable but isn't a button or link, so an agent reading the page doesn't see a control there. Use a <button> or <a href>, or give it role="button" and tabindex="0" with keyboard handling.`,
    } })
  }

  // Problems you've accepted count as fine: their controls are ready, and what only looks
  // clickable isn't counted.
  const kept = options.ignore ? found.filter(({ problem }) => !options.ignore!(problem)) : found
  const notReady = new Set(kept.flatMap(({ problem, elements }) => (problem.kind === "unseen" ? [] : elements)))
  const total = controls.length + kept.filter(({ problem }) => problem.kind === "unseen").length
  const ready = controls.filter((control) => !notReady.has(control.el)).length
  return {
    mode: "page",
    score: total ? Math.floor((100 * ready) / total) : 100,
    controls: total,
    ready,
    problems: kept.map(({ problem, elements }) => (options.elements ? { ...problem, elements } : problem)),
  }
}

/**
 * For tests in any app: checks the page and throws, with the report, when the score is under
 * `minScore` (100 by default). `ignore` leaves out problems you've decided to keep.
 */
function expectPageReady(root?: ParentNode | string | null, options: { minScore?: number; ignore?: (problem: PageReadinessProblem) => boolean } = {}) {
  const report = checkPageReadiness(root, { ignore: options.ignore })
  if (report.score < (options.minScore ?? 100)) throw new Error(formatAgentReadiness(report))
  return report
}

export { checkPageReadiness, expectPageReady }
export type { PageReadinessProblem, PageReadinessReport }
