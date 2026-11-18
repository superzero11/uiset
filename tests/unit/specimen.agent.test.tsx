import { act, render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import { Specimen } from "@/src/site/specimen"

let approve = false
const agent = createAgent({ allow: (step) => !step.confirm || approve })

async function renderSpecimen() {
  render(
    <UISet>
      <Specimen />
    </UISet>,
  )
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

test("an agent can find every control by name", async () => {
  await renderSpecimen()
  const components = agent
    .snapshot()
    .filter((entry) => !entry.offPage && entry.component !== "more")

  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  }
  const labels = components.map((entry) => entry.label)
  for (const label of [
    "Device name",
    "Output",
    "Volume",
    "Tone",
    "Night mode",
    "Save changes",
    "Forget device",
  ]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }
})

test("an agent can change every setting", async () => {
  await renderSpecimen()
  const result = await agent.act({
    steps: [
      { ref: "Device name", action: "setValue", args: ["Studio"] },
      { ref: "Output", action: "setValue", args: ["Headphones"] },
      { ref: "Volume", action: "setValue", args: [80] },
      { ref: "Tone", action: "setValue", args: ["Warm"] },
      { ref: "Night mode", action: "setChecked", args: [true] },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByLabelText<HTMLInputElement>("Device name").value).toBe("Studio")
  expect(
    screen.getByRole("switch", { name: "Night mode" }).getAttribute("aria-checked"),
  ).toBe("true")
  expect(screen.getByRole("radio", { name: "Warm" }).getAttribute("aria-checked")).toBe(
    "true",
  )
  expect(screen.getByRole<HTMLInputElement>("slider", { name: "Volume" }).value).toBe(
    "80",
  )
})

test("forgetting the device needs a person", async () => {
  await renderSpecimen()
  const forget = {
    steps: [{ ref: "Forget device", action: "press", args: ["Forget and unpair"] }],
  }
  approve = false
  expect((await agent.act(forget)).ok).toBe(false)
  approve = true
  expect((await agent.act(forget)).ok).toBe(true)
  approve = false
})
