// Moves, per skin (design/motion-plan.md): when items are put in a new order, each slides from
// where it was to its new place on the skin's --uiset-move-duration and --uiset-move-ease.
// The items stay the real elements, so focus and a second move work while they slide (the
// browser's View Transitions would block the page meanwhile). Under reduced motion, with
// motion="reduce" and in Ink, they jump.

type Spot = { x: number; y: number }

const reduced = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null

/** The slide an item is mid-way through, from its computed translate. */
function offsetOf(el: Element): Spot {
  const [x = "0", y = "0"] = getComputedStyle(el).translate.split(" ")
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
}

function timing(container: HTMLElement) {
  const style = getComputedStyle(container)
  const ms = (value: string) => (value.trim().endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000) || 0
  const speed = Number.parseFloat(style.getPropertyValue("--uiset-motion-speed")) || 1
  const off = reduced?.matches || !!container.closest('[data-motion="reduce"]')
  return {
    duration: off ? 0 : ms(style.getPropertyValue("--uiset-move-duration")) * speed,
    easing: style.getPropertyValue("--uiset-move-ease").trim() || "ease",
  }
}

/**
 * Slides the items matching `selector` inside `container` to their new places whenever they're
 * reordered, moved between groups or pushed aside. Returns a cleanup.
 */
function glide(container: HTMLElement, selector: string) {
  let spots = new Map<Element | string, Spot>()
  const slides = new WeakMap<Element, Animation>()
  const items = () => [...container.querySelectorAll<HTMLElement>(selector)].filter((el) => !el.closest("[data-drag-preview]"))
  // Relative to the container's scrolled content, so scrolling moves nothing.
  const origin = () => {
    const box = container.getBoundingClientRect()
    return { x: box.left - container.scrollLeft, y: box.top - container.scrollTop }
  }
  // Where an item sits, less the slide it's in the middle of.
  const spotOf = (el: Element, at: Spot, offset = offsetOf(el)) => {
    const box = el.getBoundingClientRect()
    return { x: box.left - at.x - offset.x, y: box.top - at.y - offset.y }
  }
  const nameOf = (el: Element) => el.getAttribute("aria-label")

  const note = () => {
    const at = origin()
    spots = new Map()
    for (const el of items()) {
      const spot = spotOf(el, at)
      spots.set(el, spot)
      const name = nameOf(el)
      if (name) spots.set(name, spot)
    }
  }

  const slide = () => {
    const { duration, easing } = timing(container)
    const at = origin()
    const next = new Map<Element | string, Spot>()
    for (const el of items()) {
      const offset = offsetOf(el)
      const now = spotOf(el, at, offset)
      // A card moved to another column is a new element: it's found by its name.
      const before = spots.get(el) ?? (nameOf(el) ? spots.get(nameOf(el)!) : undefined)
      next.set(el, now)
      if (nameOf(el)) next.set(nameOf(el)!, now)
      if (!before || duration <= 0 || el.hasAttribute("data-dragging")) continue
      const dx = before.x + offset.x - now.x
      const dy = before.y + offset.y - now.y
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      slides.get(el)?.cancel()
      slides.set(el, el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { duration, easing }))
    }
    spots = next
  }

  note()
  const mutations = new MutationObserver(slide)
  mutations.observe(container, { childList: true, subtree: true })
  const resizes = new ResizeObserver(note)
  resizes.observe(container)
  return () => {
    mutations.disconnect()
    resizes.disconnect()
  }
}

export { glide }
