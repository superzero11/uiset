import { fireEvent, render, screen } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { Button } from "@ui-sdk/solid/button"
import { Switch, SwitchThumb } from "@ui-sdk/solid/switch"
import { createSignal, flush } from "solid-js"
import { beforeEach, expect, test, vi } from "vitest"
import { play } from "@/registry/uiset/ui/uiset/sound"
import { UISet, type KeyColor, type Skin } from "@/solid/src/uiset"
import { createSolidBridge, settle } from "./solid-bridge"

// The UISet root in Solid: the same attributes as React's, following its props as they
// change, and the same cues through UI SDK's observe() for Solid's components.

vi.mock("@/registry/uiset/ui/uiset/sound", () => ({
  play: vi.fn(),
  unlockAudio: vi.fn(),
  isProfile: (value: string) => ["soft", "mechanical", "beep", "paper"].includes(value),
}))

const played = () => vi.mocked(play).mock.calls.map(([cue]) => cue)
const root = () => document.querySelector<HTMLElement>("[data-uiset]")!

beforeEach(() => {
  vi.mocked(play).mockClear()
})

test("the root's attributes by default: Base, the system's scheme, sound off, haptics on", () => {
  render(() => <UISet id="app" aria-label="App" />)
  expect({ ...root().dataset }).toEqual({ uiset: "", skin: "base", sound: "off", haptics: "on" })
  expect(root().id).toBe("app")
  expect(root().getAttribute("aria-label")).toBe("App")
})

test("the root follows its props as they change: skin, theme, motion, sound, haptics", () => {
  const [skin, setSkin] = createSignal<Skin>("base")
  const [theme, setTheme] = createSignal<"light" | "dark" | "system">("system")
  const [motion, setMotion] = createSignal<"system" | "reduce">("system")
  const [sound, setSound] = createSignal(false)
  const [haptics, setHaptics] = createSignal(true)
  render(() => <UISet skin={skin()} theme={theme()} motion={motion()} sound={sound()} haptics={haptics()} />)
  setSkin("blueprint")
  setTheme("dark")
  setMotion("reduce")
  setSound(true)
  setHaptics(false)
  flush()
  expect({ ...root().dataset }).toEqual({ uiset: "", skin: "blueprint", theme: "dark", motion: "reduce", sound: "on", haptics: "off" })
  setTheme("system")
  setMotion("system")
  flush()
  expect(root().hasAttribute("data-theme")).toBe(false)
  expect(root().hasAttribute("data-motion")).toBe(false)
})

test("a key color marks the root and sets its variables, beside a style of the page's own", () => {
  const [key, setKey] = createSignal<KeyColor | undefined>({ l: 0.6, c: 0.15, h: 250 })
  render(() => <UISet keyColor={key()} style={{ "max-width": "40rem" }} />)
  expect(root().hasAttribute("data-key")).toBe(true)
  expect(root().style.getPropertyValue("--uiset-key-h")).toBe("250")
  expect(root().style.maxWidth).toBe("40rem")
  setKey(undefined)
  flush()
  expect(root().hasAttribute("data-key")).toBe(false)
  expect(root().style.getPropertyValue("--uiset-key-h")).toBe("")
  expect(root().style.maxWidth).toBe("40rem")
})

test("a style given as text keeps the key color's variables", () => {
  render(() => <UISet keyColor={{ l: 0.6, c: 0.15, h: 30 }} style="max-width: 30rem" />)
  expect(root().style.getPropertyValue("--uiset-key-h")).toBe("30")
  expect(root().style.maxWidth).toBe("30rem")
})

test("a switch plays on and off cues when sound is on", async () => {
  render(() => (
    <UISet sound>
      <Switch aria-label="Night mode">
        <SwitchThumb />
      </Switch>
    </UISet>
  ))
  await settle(0)
  const toggle = screen.getByRole("switch", { name: "Night mode" })
  await userEvent.click(toggle)
  await userEvent.click(toggle)
  expect(played()).toEqual(["on", "off"])
})

test("a button plays a press on pointer down and a release on pointer up; nothing with sound off", async () => {
  const [sound, setSound] = createSignal(true)
  render(() => (
    <UISet sound={sound()}>
      <Button>Save</Button>
    </UISet>
  ))
  await settle(0)
  const button = screen.getByRole("button", { name: "Save" })
  fireEvent.pointerDown(button)
  fireEvent.pointerUp(button)
  expect(played()).toEqual(["press", "release"])
  setSound(false)
  flush()
  fireEvent.pointerDown(button)
  fireEvent.pointerUp(button)
  expect(played()).toEqual(["press", "release"])
})

test("components outside a UISet root stay silent", async () => {
  render(() => (
    <Switch aria-label="Outside">
      <SwitchThumb />
    </Switch>
  ))
  await settle(0)
  await userEvent.click(screen.getByRole("switch", { name: "Outside" }))
  expect(play).not.toHaveBeenCalled()
})

test("agents: what's inside the root is named and pressed through UI SDK's bridge for Solid", async () => {
  const bridge = createSolidBridge()
  const saved = vi.fn()
  render(() => (
    <UISet>
      <Button onClick={saved}>Save</Button>
    </UISet>
  ))
  await settle()
  expect(bridge.entry("Save").component).toBe("button")
  const result = await bridge.press("Save")
  expect(result.ok, result.error?.message).toBe(true)
  expect(saved).toHaveBeenCalledTimes(1)
})
