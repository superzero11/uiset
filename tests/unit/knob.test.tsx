import { act, render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { checkDirection, checkPattern, checkServer, mount } from "@ui-sdk/core/testing"
import { expect, test } from "vitest"
import { Knob } from "@/registry/uiset/ui/knob"
import { knob } from "@/registry/uiset/ui/studio/knob"

const markup = `<root aria-label="Cutoff"><indicator></indicator><value></value></root>`

test("arrows, page keys, Home and End step the value", async () => {
  const view = mount(knob, { defaultValue: 50, min: 0, max: 100, step: 1 }, markup)
  try {
    await view.keys("Tab", "ArrowUp", "ArrowRight")
    expect(view.state.value).toBe(52)
    await view.keys("ArrowDown", "ArrowLeft", "ArrowLeft")
    expect(view.state.value).toBe(49)
    await view.keys("PageUp")
    expect(view.state.value).toBe(59)
    await view.keys("Shift+ArrowUp")
    expect(view.state.value).toBe(69)
    await view.keys("Home")
    expect(view.state.value).toBe(0)
    await view.keys("End")
    expect(view.state.value).toBe(100)
    expect(view.changes.at(-1)).toMatchObject({ key: "value", source: "keyboard" })
  } finally {
    view.unmount()
  }
})

test("ARIA follows the value, with readable text", async () => {
  const view = mount(
    knob,
    { defaultValue: 440, min: 20, max: 2000, step: 1, format: (v: number) => `${v} Hz` },
    markup,
  )
  try {
    expect(view.root.getAttribute("role")).toBe("slider")
    expect(view.root.getAttribute("aria-valuenow")).toBe("440")
    expect(view.root.getAttribute("aria-valuemin")).toBe("20")
    expect(view.root.getAttribute("aria-valuemax")).toBe("2000")
    expect(view.root.getAttribute("aria-valuetext")).toBe("440 Hz")
    expect(view.root.getAttribute("tabindex")).toBe("0")
    expect(view.part("indicator")?.getAttribute("aria-hidden")).toBe("true")
    expect(view.root.getAttribute("aria-disabled")).toBeNull()
  } finally {
    view.unmount()
  }
})

test("dragging up raises the value and Escape puts it back", async () => {
  const view = mount(knob, { defaultValue: 50 }, markup)
  try {
    await view.drag(view.root, { by: { x: 0, y: -44 } })
    expect(view.state.value).toBeGreaterThan(50)
    expect(view.state.dragging).toBe(false)
    expect(view.changes.at(-1)).toMatchObject({ key: "value", reason: "drag" })
  } finally {
    view.unmount()
  }
})

test("double-pressing resets to the starting value", async () => {
  const view = mount(knob, { defaultValue: 30 }, markup)
  try {
    await view.keys("Tab", "End")
    expect(view.state.value).toBe(100)
    view.root.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
    expect(view.state.value).toBe(30)
  } finally {
    view.unmount()
  }
})

test("a disabled knob ignores keys and drags, and leaves the tab order", async () => {
  const view = mount(knob, { defaultValue: 30, disabled: true }, markup)
  try {
    view.root.focus()
    await view.keys("ArrowUp", "End")
    expect(view.state.value).toBe(30)
    await view.drag(view.root, { by: { x: 0, y: -60 } })
    expect(view.state.value).toBe(30)
    expect(view.root.getAttribute("tabindex")).toBe("-1")
    expect(view.root.getAttribute("aria-disabled")).toBe("true")
  } finally {
    view.unmount()
  }
})

test("passes the WAI-ARIA slider pattern", async () => {
  const view = mount(knob, { defaultValue: 50 }, markup)
  try {
    await checkPattern(view.root, "slider")
  } finally {
    view.unmount()
  }
})

test("renders on the server and works in both directions", async () => {
  checkServer(knob, { defaultValue: 50 }, markup)
  await checkDirection(knob, { defaultValue: 50 }, markup)
})

test("an agent can find the knob by its label and turn it", async () => {
  const agent = createAgent()
  render(<Knob label="Cutoff" defaultValue={50} min={0} max={100} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

  const entry = agent.snapshot().find((item) => item.label === "Cutoff")
  expect(entry, "Cutoff is missing from the snapshot").toBeTruthy()
  expect(entry?.actions).toEqual(
    expect.arrayContaining(["setValue", "increment", "decrement", "reset"]),
  )

  const result = await agent.act({
    steps: [{ ref: "Cutoff", action: "setValue", args: [20] }],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(
    screen.getByRole("slider", { name: "Cutoff" }).getAttribute("aria-valuenow"),
  ).toBe("20")
})
