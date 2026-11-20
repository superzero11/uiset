// The chat and terminal keep following the end after a downward wheel or key at the end,
// where UI SDK's stickToEnd let go over a one-pixel rounding (shell/rearm-end.ts).
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { rearmAtEnd, type EndController } from "@/registry/uiset/ui/shell/rearm-end"

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "requestAnimationFrame"] }))
afterEach(() => vi.useRealTimers())

function setup({ gap = 1, sticking = false } = {}) {
  const view = document.createElement("div")
  Object.defineProperties(view, {
    scrollHeight: { value: 1000 },
    clientHeight: { value: 200 },
    scrollTop: { value: 800 - gap, writable: true },
  })
  const controller: EndController = { isAtEnd: () => gap <= 2, isSticking: () => sticking, scrollToEnd: vi.fn() }
  const stop = rearmAtEnd(view, () => controller)
  return { view, controller, stop }
}

test("a downward wheel or key at the end sticks to the end again", () => {
  for (const event of [new WheelEvent("wheel", { deltaY: 120 }), new KeyboardEvent("keydown", { key: "End" }), new KeyboardEvent("keydown", { key: "PageDown" })]) {
    const { view, controller, stop } = setup()
    view.dispatchEvent(event)
    vi.advanceTimersByTime(200)
    expect(controller.scrollToEnd, event.type).toHaveBeenCalledWith({ behavior: "instant" })
    stop()
  }
})

test("it leaves alone a wheel up, a view away from the end, and one still following", () => {
  const up = setup()
  up.view.dispatchEvent(new WheelEvent("wheel", { deltaY: -120 }))
  const away = setup({ gap: 40 })
  away.view.dispatchEvent(new WheelEvent("wheel", { deltaY: 120 }))
  const following = setup({ sticking: true })
  following.view.dispatchEvent(new WheelEvent("wheel", { deltaY: 120 }))
  vi.advanceTimersByTime(200)
  for (const { controller } of [up, away, following]) expect(controller.scrollToEnd).not.toHaveBeenCalled()
})
