// Where UISet's cascade layer sits in a page that uses Tailwind CSS 4.
//
// Tailwind declares `theme, base, components, utilities`, with its reset in `base`. UI SDK puts
// its own layer first in the page, and UISet's layers land wherever its stylesheet is first
// read: after Tailwind's when the app's stylesheet loads first, so UISet outranks Tailwind's
// utility classes, or before them when UISet's loads first, so Tailwind's reset strips UISet's
// controls. Neither is what an app wants. A component library belongs between the reset and the
// utilities, like Tailwind's own `components` layer.
//
// So on a page with Tailwind's layers, UISet restates the page's layer order with `uiset` moved
// to just after `base`, in a style element at the top of <head>. Every other layer keeps its
// place, because the statement lists them in the order the page already has. A page without
// Tailwind's layers is left alone.

const id = "uiset-layer-order"
const ours = "uiset"
const sdk = "ui-sdk"

/**
 * The page's layer order with `uiset` just after `base`, or null when it isn't Tailwind's.
 * UI SDK's layer stays first, the lowest, as UI SDK means it to be: its stylesheet may not be on
 * the page yet when this runs.
 */
function tailwindLayerOrder(names: readonly string[]): string[] | null {
  const order = [...new Set(names)].filter((name) => name !== ours && name !== sdk)
  const base = order.indexOf("base")
  if (!order.includes("theme") || base < 0 || order.indexOf("utilities") < base) return null
  order.splice(base + 1, 0, ours)
  return [sdk, ...order]
}

/** "uiset.base" is in the "uiset" layer. */
const topLevel = (name: string) => name.split(".")[0] ?? name

/** Top-level layer names in the order the sheets declare them. */
function layerNames(sheets: Iterable<CSSStyleSheet>, into: string[] = [], depth = 0): string[] {
  const Block = typeof CSSLayerBlockRule === "undefined" ? undefined : CSSLayerBlockRule
  for (const sheet of sheets) {
    if (sheet.ownerNode instanceof Element && sheet.ownerNode.id === id) continue
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue // a stylesheet from another origin
    }
    for (const rule of Array.from(rules)) {
      if ("nameList" in rule) {
        for (const name of (rule as CSSLayerStatementRule).nameList) into.push(topLevel(name))
      } else if (Block && rule instanceof Block) {
        if (rule.name) into.push(topLevel(rule.name))
      } else if ("styleSheet" in rule && depth < 3) {
        const imported = rule as CSSImportRule
        if (imported.layerName) into.push(topLevel(imported.layerName))
        else if (imported.styleSheet) layerNames([imported.styleSheet], into, depth + 1)
      }
    }
  }
  return into
}

function nonce(doc: Document): string | undefined {
  const meta = doc.head?.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')
  return meta ? meta.nonce || meta.getAttribute("nonce") || undefined : undefined
}

/**
 * On a page with Tailwind CSS 4, puts UISet's layer between Tailwind's `base` and `components`.
 * Safe to call often: it does nothing without Tailwind, and rewrites its statement only when
 * the page's layers change.
 */
function orderLayers(doc: Document | undefined = typeof document === "undefined" ? undefined : document) {
  if (!doc?.head) return
  const order = tailwindLayerOrder(layerNames([...Array.from(doc.styleSheets), ...(doc.adoptedStyleSheets ?? [])]))
  const existing = doc.getElementById(id)
  if (!order) return
  const css = `@layer ${order.join(", ")};`
  if (existing) {
    if (existing.textContent !== css) existing.textContent = css
    return
  }
  const style = doc.createElement("style")
  style.id = id
  const value = nonce(doc)
  if (value) style.nonce = value
  style.textContent = css
  doc.head.prepend(style)
}

export { orderLayers, tailwindLayerOrder }
