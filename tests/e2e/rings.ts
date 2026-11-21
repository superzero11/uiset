import type { Page } from "@playwright/test"

/**
 * Focuses each control inside `scope` and lists the ones whose focus ring reaches past the
 * nearest box that clips it (overflow, paint containment, content-visibility), by how much.
 */
export async function clippedRings(page: Page, scope: string) {
  return page.evaluate((scope) => {
    const root = document.querySelector(scope)
    if (!root) throw new Error(`No ${scope} on the page`)
    const cut: string[] = []
    const controls = [...root.querySelectorAll<HTMLElement>("button, a[href], [tabindex='0'], input, textarea")].filter((el) => el.getClientRects().length)
    for (const el of controls) {
      el.focus({ focusVisible: true } as FocusOptions)
      const style = getComputedStyle(el)
      const width = parseFloat(style.outlineWidth) || 0
      if (style.outlineStyle === "none" || !width) continue
      const reach = width + (parseFloat(style.outlineOffset) || 0)
      const box = el.getBoundingClientRect()
      for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const p = getComputedStyle(parent)
        const clips = p.overflowX !== "visible" || p.overflowY !== "visible" || /paint|strict|content/.test(p.contain) || p.contentVisibility === "auto"
        if (!clips) continue
        const c = parent.getBoundingClientRect()
        const worst = Math.max(c.left - (box.left - reach), box.right + reach - c.right, c.top - (box.top - reach), box.bottom + reach - c.bottom)
        if (worst > 0.5) cut.push(`${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40)}: ${Math.round(worst * 10) / 10}px`)
        break
      }
    }
    return { controls: controls.length, cut }
  }, scope)
}
