import { act, render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { checkServer, mount } from "@ui-sdk/core/testing"
import { expect, test } from "vitest"
import { PatchBay, PatchBayJack } from "@/registry/uiset/ui/patch-bay"
import { patchBay } from "@/registry/uiset/ui/studio/patch-bay"

const labels = {
  "lfo:out": "LFO out",
  "env:out": "Envelope out",
  "cutoff:in": "Cutoff in",
  "pitch:in": "Pitch in",
}
const markup = `<root aria-label="Patch bay">
  <jack value="lfo:out" aria-label="LFO out"></jack>
  <jack value="env:out" aria-label="Envelope out"></jack>
  <jack value="cutoff:in" aria-label="Cutoff in"></jack>
  <jack value="pitch:in" aria-label="Pitch in"></jack>
</root>`

test("an output connects to an input, and the same pair again unplugs it", async () => {
  const view = mount(patchBay, { labels }, markup)
  try {
    expect(view.api.wiring.start("lfo:out")).toBe(true)
    view.api.wiring.target("cutoff:in")
    view.api.wiring.commit({ reason: "connect-key" })
    expect(view.state.value).toEqual([{ from: "lfo:out", to: "cutoff:in" }])
    expect(view.part("jack", "cutoff:in")?.getAttribute("aria-description")).toBe(
      "Patched to LFO out",
    )
    expect(view.part("jack", "lfo:out")?.hasAttribute("data-patched")).toBe(true)

    view.api.wiring.start("lfo:out")
    view.api.wiring.target("cutoff:in")
    view.api.wiring.commit({ reason: "connect-key" })
    expect(view.state.value).toEqual([])
    expect(view.part("jack", "cutoff:in")?.getAttribute("aria-description")).toBe(
      "Not patched",
    )
  } finally {
    view.unmount()
  }
})

test("inputs never start a cable and outputs never receive one", async () => {
  const view = mount(patchBay, { labels }, markup)
  try {
    expect(view.api.wiring.start("cutoff:in")).toBe(false)
    expect(view.api.plug("cutoff:in", "lfo:out")).toBe(false)
    expect(view.api.plug("lfo:out", "env:out")).toBe(false)
    expect(view.state.value).toEqual([])
  } finally {
    view.unmount()
  }
})

test("an input takes one cable: patching a used input replaces its cable", async () => {
  const view = mount(patchBay, { labels }, markup)
  try {
    view.api.plug("lfo:out", "cutoff:in")
    view.api.plug("env:out", "cutoff:in")
    expect(view.state.value).toEqual([{ from: "env:out", to: "cutoff:in" }])
    view.api.plug("env:out", "pitch:in")
    expect(view.state.value).toHaveLength(2)
  } finally {
    view.unmount()
  }
})

test("Enter on an output starts a keyboard patch and Escape cancels it", async () => {
  const view = mount(patchBay, { labels }, markup)
  try {
    view.part("jack", "lfo:out")!.focus()
    await view.keys("Enter")
    expect(view.state.connecting).toMatchObject({ from: "lfo:out", keyboard: true })
    await view.keys("Escape")
    expect(view.state.connecting).toBeNull()
    expect(view.state.value).toEqual([])
    expect(view.announced.join(" ")).toMatch(/LFO out/)
  } finally {
    view.unmount()
  }
})

test("renders on the server", () => {
  checkServer(patchBay, { labels }, markup)
})

test("an agent patches by the names a person sees", async () => {
  const agent = createAgent()
  render(
    <PatchBay aria-label="Patch bay" labels={labels}>
      {Object.entries(labels).map(([port, label]) => (
        <PatchBayJack key={port} port={port} label={label} />
      ))}
    </PatchBay>,
  )
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

  const entry = agent.snapshot().find((item) => item.label === "Patch bay")
  expect(entry?.actions).toEqual(expect.arrayContaining(["plug", "unplug", "clear"]))

  const result = await agent.act({
    steps: [{ ref: "Patch bay", action: "plug", args: ["LFO out", "Cutoff in"] }],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(
    screen.getByRole("button", { name: "Cutoff in" }).getAttribute("aria-description"),
  ).toBe("Patched to LFO out")
})
