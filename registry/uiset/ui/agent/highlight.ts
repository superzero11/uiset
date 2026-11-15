import { elementOf, observe } from "@ui-sdk/core/observe"

type HighlightOptions = { duration?: number; scroll?: boolean }

const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()

function inView(el: Element) {
  const box = el.getBoundingClientRect()
  return box.bottom > 0 && box.top < window.innerHeight
}

function highlightElement(
  el: Element | null | undefined,
  { duration = 1800, scroll = true }: HighlightOptions = {},
) {
  if (!el) return
  el.removeAttribute("data-agent-touched")
  // Re-adding the attribute in the same frame wouldn't restart the animation.
  requestAnimationFrame(() => {
    el.setAttribute("data-agent-touched", "")
    clearTimeout(timers.get(el))
    timers.set(
      el,
      setTimeout(() => el.removeAttribute("data-agent-touched"), duration),
    )
  })
  if (scroll && !inView(el)) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" })
  }
}

// observe() only sees components created after it starts: call this before rendering.
function highlightAgent(options: HighlightOptions = {}) {
  return observe((change) => {
    if (change.source === "agent") highlightElement(elementOf(change.ref), options)
  })
}

export { highlightAgent, highlightElement }
export type { HighlightOptions }
