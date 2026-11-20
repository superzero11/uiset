import { elementOf, observe, type ObservedChange } from "@ui-sdk/core/observe"
import { haptic, type Strength } from "./haptics"
import { isProfile, play, unlockAudio, type Cue } from "./sound"

type Feedback = { cue: Cue; pitch?: number; strength?: Strength | null }

const continuous = new Set(["slider", "number-input", "color-picker", "resizable"])
const textual = new Set([
  "input",
  "textarea",
  "password-input",
  "autocomplete",
  "token-input",
  "date-input",
  "time-input",
  "otp-input",
  "trigger-menu",
])
const pressable =
  '[data-slot="button"], [data-slot$="-trigger"], [data-slot$="-close"], [data-uiset-press]'

let installed = false
const lastTick = new WeakMap<Element, number>()
const reducedMotion =
  typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null

function rootOf(element: Element | null) {
  return element?.closest<HTMLElement>("[data-uiset]") ?? null
}

function settingsAt(element: Element) {
  const root = rootOf(element)
  if (!root) return null
  const style = getComputedStyle(element)
  const profile = style.getPropertyValue("--uiset-sound").trim() || "soft"
  const volume = Number.parseFloat(style.getPropertyValue("--uiset-sound-volume"))
  return {
    sound: root.dataset.sound === "on" && profile !== "none" && isProfile(profile),
    haptics: root.dataset.haptics !== "off" && !reducedMotion?.matches,
    typing: style.getPropertyValue("--uiset-typing").trim() === "on",
    profile: isProfile(profile) ? profile : "soft",
    volume: Number.isFinite(volume) ? volume : 0.6,
  }
}

function cue(element: Element | null, feedback: Feedback) {
  if (!element) return
  const settings = settingsAt(element)
  if (!settings) return
  if (feedback.cue === "tick") {
    const now = performance.now()
    if (now - (lastTick.get(element) ?? 0) < 28) return
    lastTick.set(element, now)
  }
  if (feedback.cue === "key" && !settings.typing) return
  if (settings.sound) {
    play(feedback.cue, {
      profile: settings.profile,
      volume: settings.volume,
      pitch: feedback.pitch,
    })
  }
  if (settings.haptics && feedback.strength !== null) {
    haptic(feedback.strength ?? (feedback.cue === "tick" ? "light" : "medium"))
  }
}

function fraction(element: Element, value: unknown) {
  const input = element.querySelector<HTMLInputElement>('input[type="range"]')
  const current = Array.isArray(value) ? value[0] : value
  if (!input || typeof current !== "number") return 0.5
  const min = Number(input.min || 0)
  const max = Number(input.max || 100)
  return max > min ? (current - min) / (max - min) : 0.5
}

function feedbackFor(change: ObservedChange, element: Element): Feedback | null {
  const { key, value, component } = change
  if (key === "open") return { cue: value ? "open" : "close", strength: null }
  if (key === "checked" || key === "pressed") return { cue: value ? "on" : "off" }
  if (key !== "value") return null
  if (continuous.has(component)) return { cue: "tick", pitch: fraction(element, value) }
  if (textual.has(component)) return { cue: "key", strength: null }
  return { cue: "select" }
}

function onChange(change: ObservedChange) {
  const element = elementOf(change.ref)
  if (!element) return
  const feedback = feedbackFor(change, element)
  if (feedback) cue(element, feedback)
}

function pressTarget(event: Event) {
  const target = event.target instanceof Element ? event.target.closest(pressable) : null
  if (!target || !rootOf(target)) return null
  if (target.matches(':disabled, [data-disabled], [aria-disabled="true"]')) return null
  return target
}

// An alert dialog never closes on a press outside it. The dialog nudges (base.css, per skin)
// so the press visibly did something; restarting it lets each press nudge again.
function nudgeIfRefused(event: PointerEvent) {
  const dialog = [...document.querySelectorAll<HTMLElement>('[data-slot="alert-dialog-content"][data-open]')].pop()
  if (!dialog || !rootOf(dialog) || dialog.contains(event.target as Node)) return
  dialog.removeAttribute("data-refused")
  void dialog.offsetWidth
  dialog.setAttribute("data-refused", "")
  dialog.addEventListener("animationend", () => dialog.removeAttribute("data-refused"), { once: true })
}

function onPointerDown(event: PointerEvent) {
  if (rootOf(event.target as Element | null)?.dataset.sound === "on") unlockAudio()
  nudgeIfRefused(event)
  const target = pressTarget(event)
  if (target) cue(target, { cue: "press" })
}

function onPointerUp(event: PointerEvent) {
  const target = pressTarget(event)
  if (target) cue(target, { cue: "release", strength: null })
}

function onKeyDown(event: KeyboardEvent) {
  if (rootOf(event.target as Element | null)?.dataset.sound === "on") unlockAudio()
  if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return
  const target = pressTarget(event)
  if (target) cue(target, { cue: "press" })
}

// observe() only sees components created after it starts, so this runs when the
// module is first imported, before the app renders.
function installUISet() {
  if (installed || typeof document === "undefined") return
  installed = true
  observe(onChange, { live: true })
  document.addEventListener("pointerdown", onPointerDown, {
    capture: true,
    passive: true,
  })
  document.addEventListener("pointerup", onPointerUp, { capture: true, passive: true })
  document.addEventListener("keydown", onKeyDown, { capture: true })
}

export { cue, installUISet }
export type { Feedback }
