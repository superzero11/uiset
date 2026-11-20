// UI SDK's stickToEnd lets go of the end when the view moves toward the top. Content with a
// fractional height (977.6px, say) puts the true end between two pixels; a wheel at the end
// settles on the lower whole pixel, a 1px move up that lets go. Once let go, a wheel, End or
// PageDown at the end moves nothing, so no scroll event re-arms it, and new messages arrive
// out of view (the same as shadcn-ui/ui#12766). Until UI SDK handles it, a downward wheel or
// key while the view is at the end sticks to the end again.

type EndController = { isAtEnd(): boolean; isSticking(): boolean; scrollToEnd(options?: { behavior?: "instant" | "smooth" | "auto" }): void }

const DOWN_KEYS = new Set(["End", "PageDown", "ArrowDown", " "])
/** How long after a downward wheel or key a let-go still counts as the browser's rounding. */
const WINDOW = 400
/** Within this many pixels of the end counts as at the end, whatever the rounding. */
const SLACK = 2

/** Re-arms following when a downward wheel or key at the end let it go. Returns a cleanup. */
function rearmAtEnd(viewport: HTMLElement, controller: () => EndController | undefined) {
  let downAt = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined
  const atEnd = () => viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= SLACK
  const check = () => {
    const c = controller()
    if (!c || performance.now() - downAt > WINDOW || c.isSticking() || !atEnd()) return
    c.scrollToEnd({ behavior: "instant" })
  }
  const down = () => {
    downAt = performance.now()
    clearTimeout(timer)
    // The input may move nothing at all: look again once it has had time to land.
    timer = setTimeout(check, 150)
  }
  const wheel = (event: WheelEvent) => {
    if (event.deltaY > 0) down()
  }
  const key = (event: KeyboardEvent) => {
    if (DOWN_KEYS.has(event.key) && !event.shiftKey && !event.altKey) down()
  }
  // After UI SDK has had its say on this scroll.
  const scroll = () => requestAnimationFrame(check)
  viewport.addEventListener("wheel", wheel, { passive: true })
  viewport.addEventListener("keydown", key)
  viewport.addEventListener("scroll", scroll, { passive: true })
  return () => {
    clearTimeout(timer)
    viewport.removeEventListener("wheel", wheel)
    viewport.removeEventListener("keydown", key)
    viewport.removeEventListener("scroll", scroll)
  }
}

export { rearmAtEnd }
export type { EndController }
