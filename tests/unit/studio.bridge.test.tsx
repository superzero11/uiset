import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import { synth } from "@/src/site/studio-device"
import { StudioKit } from "@/src/site/studio-kit"
import { createBridge, settle } from "./bridge"

// The Studio kit's demo (src/site/studio-kit.tsx): the rack, and the prompts under it that
// the site's agent plays it by, through the bridge. The prompts are the person's buttons
// (hidden from agents), so they're clicked; the rack's state is read by its names. Moved from
// the "Studio" tests of tests/e2e/site.spec.ts.

const bridge = createBridge()

// jsdom has no media queries (the browser tests ran with reduced motion, as here) and no Web
// Audio. The rack's sound isn't under test, only that Play starts it: a stand-in context whose
// nodes take every call and make no sound.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} })
  const node = (): Record<string, unknown> =>
    new Proxy({ connect: (next: unknown) => next, disconnect() {}, start() {}, stop() {}, getFloatTimeDomainData() {}, getChannelData: () => new Float32Array(1) } as Record<string, unknown>, {
      get: (target, key) => (typeof key !== "string" || key in target ? target[key as string] : (target[key] = param())),
      set: (target, key, value) => ((target[key as string] = value), true),
    })
  class AudioContextStandIn {
    state = "running"
    currentTime = 0
    sampleRate = 44100
    destination = node()
    resume = () => Promise.resolve()
    createGain = node
    createAnalyser = node
    createOscillator = node
    createBiquadFilter = node
    createBufferSource = node
    createDynamicsCompressor = node
    createBuffer = node
  }
  globalThis.AudioContext = AudioContextStandIn as unknown as typeof AudioContext
})
afterEach(() => synth.stop())

test("an agent plays the rack: beat, filter, cable, pattern", async () => {
  render(
    <UISet>
      <StudioKit />
    </UISet>,
  )
  await settle()
  const panel = document.querySelector<HTMLElement>(".agent-panel")!
  for (const prompt of ["Start the beat", "Make it darker", "Add a slow wobble to the filter", "Four on the floor"]) {
    await userEvent.click(within(panel).getByRole("button", { name: prompt }))
  }
  await waitFor(() => expect(panel.querySelectorAll(".agent-log span")).toHaveLength(4))
  expect([...panel.querySelectorAll(".agent-log span")].map((line) => line.textContent).filter((line) => line?.includes("✕"))).toEqual([])
  expect(bridge.entry("Play").checked).toBe(true)
  expect(screen.getByRole("switch", { name: "Play" }).getAttribute("aria-checked")).toBe("true")
  expect(screen.getByRole("slider", { name: "Cutoff" }).getAttribute("aria-valuetext")).toBe("260 Hz")
  expect(screen.getByRole("button", { name: "Filter mod in" }).getAttribute("aria-description")).toBe("Patched to LFO out")
  expect(screen.getByRole("button", { name: "Step 5" }).getAttribute("aria-pressed")).toBe("true")
  expect(synth.playing).toBe(true)
  await bridge.run("Play", "setChecked", false)
  expect(synth.playing).toBe(false)
})
