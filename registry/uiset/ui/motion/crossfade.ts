// Content swapped in place (design/motion-pieces-plan.md): the old content leaves and the new
// arrives on the skin's --uiset-swap-* (motion.css), while the box moves to the new content's
// height on the move timing. The leaving content can't be reached or read meanwhile. Under
// reduced motion the content swaps at once.

const reduced = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null

const ms = (value: string) => {
  const v = value.trim()
  return v.endsWith("ms") ? Number.parseFloat(v) : Number.parseFloat(v) * 1000 || 0
}

/**
 * Plays the swap from `outgoing` to `incoming`, two children of `root` laid in the same grid
 * cell, and calls `done` when it's over. Returns a cleanup that ends it at once.
 */
function swap(root: HTMLElement, incoming: HTMLElement, outgoing: HTMLElement | null, done: () => void) {
  const style = getComputedStyle(root)
  const speed = Number.parseFloat(style.getPropertyValue("--uiset-motion-speed")) || 1
  const off = reduced?.matches || !!root.closest('[data-motion="reduce"]')
  const fade = ms(style.getPropertyValue("--uiset-swap-duration")) * speed
  const move = ms(style.getPropertyValue("--uiset-move-duration")) * speed
  if (!outgoing || off || (fade <= 0 && move <= 0)) {
    done()
    return () => {}
  }
  outgoing.inert = true
  outgoing.setAttribute("aria-hidden", "true")
  const from = outgoing.offsetHeight
  const to = incoming.offsetHeight
  root.dataset.swapping = ""
  incoming.dataset.entering = ""
  outgoing.dataset.leaving = ""
  root.style.height = `${from}px`
  void root.offsetHeight
  root.style.height = `${to}px`
  let over = false
  const finish = () => {
    if (over) return
    over = true
    root.style.height = ""
    delete root.dataset.swapping
    delete incoming.dataset.entering
    delete outgoing.dataset.leaving
    done()
  }
  const timer = setTimeout(finish, Math.max(fade, move))
  return () => {
    clearTimeout(timer)
    over = true
    root.style.height = ""
    delete root.dataset.swapping
    delete incoming.dataset.entering
  }
}

export { swap }
