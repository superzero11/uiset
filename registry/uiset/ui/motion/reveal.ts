// Text that arrives a word or a letter at a time (design/motion-pieces-plan.md). The text is
// whole in the page from the start, for people, screen readers and agents; each new piece
// is drawn in on the skin's --uiset-reveal-* (motion.css). Text that grows, like a streamed
// answer, reveals only what's new. Under reduced motion it appears whole.

type RevealBy = "word" | "letter"
type State = { pieces: string[]; caret?: HTMLElement; timer?: ReturnType<typeof setTimeout> }

const reduced = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null
const states = new WeakMap<HTMLElement, State>()

const ms = (value: string) => {
  const v = value.trim()
  return v.endsWith("ms") ? Number.parseFloat(v) : Number.parseFloat(v) * 1000 || 0
}

/** Words with the space after them, or single letters (spaces on their own). */
function split(text: string, by: RevealBy) {
  if (by === "letter") return [...text]
  return text.match(/\S+|\s+/g) ?? []
}

function setReveal(root: HTMLElement, text: string, by?: RevealBy) {
  const style = getComputedStyle(root)
  const unit: RevealBy = by ?? (style.getPropertyValue("--uiset-reveal-by").trim() === "letter" ? "letter" : "word")
  root.dataset.slot = "text-reveal"
  root.dataset.by = unit
  const state = states.get(root) ?? { pieces: [] }
  states.set(root, state)
  const pieces = split(text, unit)
  // What's the same as before stays; the rest is new and drawn in.
  let same = 0
  while (same < pieces.length && same < state.pieces.length && pieces[same] === state.pieces[same]) same++
  const nodes = [...root.childNodes].filter((n) => n !== state.caret)
  for (const node of nodes.slice(same)) node.remove()
  const off = reduced?.matches || !!root.closest('[data-motion="reduce"]')
  let fresh = 0
  for (const piece of pieces.slice(same)) {
    if (/^\s+$/.test(piece)) {
      root.append(piece)
      continue
    }
    const span = Object.assign(document.createElement("span"), { className: "text-reveal-piece", textContent: piece })
    if (!off) {
      span.dataset.new = ""
      span.style.setProperty("--i", String(fresh++))
    }
    root.append(span)
  }
  state.pieces = pieces
  // A skin that types (Phosphor) shows a caret at the end until the last piece is in.
  clearTimeout(state.timer)
  state.caret?.remove()
  if (fresh > 0 && style.getPropertyValue("--uiset-reveal-caret").trim() === "on") {
    const speed = Number.parseFloat(style.getPropertyValue("--uiset-motion-speed")) || 1
    const total = (ms(style.getPropertyValue("--uiset-reveal-stagger")) * fresh + ms(style.getPropertyValue("--uiset-reveal-duration"))) * speed
    state.caret ??= Object.assign(document.createElement("span"), { className: "text-reveal-caret" })
    state.caret.setAttribute("aria-hidden", "true")
    root.append(state.caret)
    state.timer = setTimeout(() => state.caret?.remove(), total)
  }
}

export { setReveal }
export type { RevealBy }
