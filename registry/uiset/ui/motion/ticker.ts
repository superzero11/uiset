// A number that moves to its new value, each skin its own way (design/motion-pieces-plan.md).
// The skin's --uiset-ticker-mode is `roll` (digits roll like an odometer), `count` (it counts
// through the values on --uiset-ticker-ease: linear, an ease or steps(n)), `type` (typed from
// the left, with a caret) or `none`. People and agents read the value itself; the moving face
// is hidden from them. Under reduced motion and motion="reduce" it shows the new value at once.

type TickerOptions = {
  value: number
  /** Count from this, once, when the ticker first scrolls into view. */
  from?: number
  format?: (value: number) => string
}

type State = {
  shown?: number
  target: number
  format: (value: number) => string
  text: HTMLElement
  face: HTMLElement
  stop: () => void
  watching?: IntersectionObserver
}

const reduced = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null
const states = new WeakMap<HTMLElement, State>()

const ms = (value: string) => {
  const v = value.trim()
  return v.endsWith("ms") ? Number.parseFloat(v) : Number.parseFloat(v) * 1000 || 0
}

/** p in 0–1, eased as CSS would: linear, steps(n), or a cubic-bezier's ease-out shape. */
function eased(p: number, ease: string) {
  const steps = /steps\(\s*(\d+)/.exec(ease)
  if (steps) return Math.min(1, Math.floor(p * Number(steps[1])) / Number(steps[1]))
  if (ease === "linear") return p
  return 1 - (1 - p) ** 3
}

function settings(root: HTMLElement) {
  const style = getComputedStyle(root)
  const off = reduced?.matches || !!root.closest('[data-motion="reduce"]')
  const speed = Number.parseFloat(style.getPropertyValue("--uiset-motion-speed")) || 1
  const duration = ms(style.getPropertyValue("--uiset-ticker-duration")) * speed
  const mode = off || duration <= 0 ? "none" : style.getPropertyValue("--uiset-ticker-mode").trim() || "roll"
  return { mode, duration, ease: style.getPropertyValue("--uiset-ticker-ease").trim() }
}

const digit = (char: string) => char >= "0" && char <= "9"

/** The odometer: a reel of 0–9 per digit, rolled with a transition to the digit it shows. */
function rollTo(face: HTMLElement, from: string, to: string) {
  const reel = (target: string, start: string) => {
    const box = document.createElement("span")
    box.className = "number-ticker-digit"
    const strip = document.createElement("span")
    strip.className = "number-ticker-reel"
    for (let d = 0; d <= 9; d++) strip.append(Object.assign(document.createElement("span"), { textContent: String(d) }))
    strip.style.setProperty("--digit", digit(start) ? start : "0")
    box.append(strip)
    requestAnimationFrame(() => requestAnimationFrame(() => strip.style.setProperty("--digit", target)))
    return box
  }
  // Digits line up from the right, so 99 → 100 rolls each place to its new digit.
  const pad = (s: string) => s.padStart(to.length, " ").slice(-to.length)
  const before = pad(from)
  face.replaceChildren(
    ...[...to].map((char, i) =>
      digit(char) ? reel(char, before[i]!) : Object.assign(document.createElement("span"), { className: "number-ticker-mark", textContent: char }),
    ),
  )
}

function countTo(state: State, from: number, to: number, format: (v: number) => string, duration: number, ease: string) {
  const decimals = Math.max(0, (String(to).split(".")[1] ?? "").length)
  const start = performance.now()
  let frame = 0
  state.face.dataset.counting = ""
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration)
    const value = from + (to - from) * eased(p, ease)
    state.face.textContent = format(Number(value.toFixed(decimals)))
    if (p < 1) frame = requestAnimationFrame(tick)
    else delete state.face.dataset.counting
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

function typeIn(state: State, text: string, duration: number) {
  const caret = Object.assign(document.createElement("span"), { className: "number-ticker-caret" })
  let shown = 0
  state.face.replaceChildren(caret)
  const step = Math.max(16, duration / Math.max(1, text.length))
  const timer = setInterval(() => {
    shown += 1
    state.face.replaceChildren(text.slice(0, shown), ...(shown < text.length ? [caret] : []))
    if (shown >= text.length) clearInterval(timer)
  }, step)
  return () => clearInterval(timer)
}

/** Draws `value` into `root`, moving from what it showed before. Returns a cleanup. */
function setTicker(root: HTMLElement, { value, from, format = (v) => v.toLocaleString() }: TickerOptions) {
  let state = states.get(root)
  if (!state) {
    root.dataset.slot = "number-ticker"
    const text = Object.assign(document.createElement("span"), { className: "uiset-visually-hidden" })
    const face = Object.assign(document.createElement("span"), { className: "number-ticker-face" })
    face.setAttribute("aria-hidden", "true")
    root.replaceChildren(text, face)
    state = { text, face, target: value, format, stop: () => {} }
    states.set(root, state)
  }
  const s = state
  s.target = value
  s.format = format
  s.text.textContent = format(value)
  const play = (start: number | undefined) => {
    s.stop()
    s.stop = () => {}
    const { mode, duration, ease } = settings(root)
    const to = s.format(s.target)
    root.dataset.mode = mode
    if (start === undefined || start === s.target || mode === "none") s.face.textContent = to
    else if (mode === "roll") rollTo(s.face, s.format(start), to)
    else if (mode === "type") s.stop = typeIn(s, to, duration)
    else s.stop = countTo(s, start, s.target, s.format, duration, ease)
    s.shown = s.target
  }
  if (s.shown === undefined && from !== undefined && typeof IntersectionObserver === "function") {
    // Counting up is for when it's seen: until then it shows where it starts.
    s.face.textContent = format(from)
    s.watching?.disconnect()
    s.watching = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      s.watching?.disconnect()
      s.watching = undefined
      play(from)
    })
    s.watching.observe(root)
    s.shown = from
    // Undone (React runs effects twice in development), it waits to be seen again.
    return () => {
      s.watching?.disconnect()
      s.watching = undefined
      s.shown = undefined
    }
  }
  if (!s.watching) play(s.shown)
  return () => s.stop()
}

export { setTicker }
export type { TickerOptions }
