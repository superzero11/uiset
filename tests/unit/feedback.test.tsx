import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, test, vi } from "vitest"
import { play } from "@/registry/uiset/ui/uiset/sound"
import { Button } from "@/registry/uiset/ui/button"
import { Slider } from "@/registry/uiset/ui/slider"
import { Switch } from "@/registry/uiset/ui/switch"
import { UISet } from "@/registry/uiset/ui/uiset"

vi.mock("@/registry/uiset/ui/uiset/sound", () => ({
  play: vi.fn(),
  unlockAudio: vi.fn(),
  isProfile: (value: string) => ["soft", "mechanical", "beep", "paper"].includes(value),
}))

const played = () => vi.mocked(play).mock.calls.map(([cue]) => cue)

beforeEach(() => {
  vi.mocked(play).mockClear()
})

async function settle() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

test("a switch plays on and off cues when sound is on", async () => {
  render(
    <UISet sound>
      <Switch aria-label="Night mode" />
    </UISet>,
  )
  await settle()
  const toggle = screen.getByRole("switch", { name: "Night mode" })
  await userEvent.click(toggle)
  await userEvent.click(toggle)
  expect(played()).toEqual(["on", "off"])
})

test("nothing plays when sound is off", async () => {
  render(
    <UISet sound={false}>
      <Switch aria-label="Night mode" />
      <Button>Save</Button>
    </UISet>,
  )
  await settle()
  await userEvent.click(screen.getByRole("switch", { name: "Night mode" }))
  await userEvent.click(screen.getByRole("button", { name: "Save" }))
  expect(play).not.toHaveBeenCalled()
})

test("a button plays a press on pointer down and a release on pointer up", async () => {
  render(
    <UISet sound>
      <Button>Save</Button>
    </UISet>,
  )
  await settle()
  const button = screen.getByRole("button", { name: "Save" })
  fireEvent.pointerDown(button)
  fireEvent.pointerUp(button)
  expect(played()).toEqual(["press", "release"])
})

test("components outside a UISet root stay silent", async () => {
  render(<Switch aria-label="Outside" />)
  await settle()
  await userEvent.click(screen.getByRole("switch", { name: "Outside" }))
  expect(play).not.toHaveBeenCalled()
})

test("slider steps tick with a pitch that follows the value", async () => {
  render(
    <UISet sound>
      <Slider aria-label="Volume" defaultValue={10} />
    </UISet>,
  )
  await settle()
  const thumb = screen.getByRole("slider", { name: "Volume" })
  thumb.focus()
  fireEvent.keyDown(thumb, { key: "End" })
  await settle()
  const [cue, options] = vi.mocked(play).mock.calls.at(-1) ?? []
  expect(cue).toBe("tick")
  expect(options?.pitch).toBeCloseTo(1)
})
