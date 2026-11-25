import { fireEvent, render, screen, within } from "@solidjs/testing-library"
import { beforeEach, expect, test } from "vitest"
import { UISet } from "@/solid/src/uiset"
import CanvasExample from "@/solid/demo/examples/canvas"
import { createSolidBridge, settle } from "./solid-bridge"

// The canvas kit's example in Solid (solid/demo/examples/canvas.tsx, also its kit page), driven
// through the agent bridge with React's assertions (tests/unit/canvas.bridge.test.tsx): nodes
// added, wired, moved and selected by name, and the inspector beside it.

const bridge = createSolidBridge()
const node = (name: RegExp) => within(screen.getByRole("group", { name: "Workflow" })).getByRole("option", { name })
const description = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
const inspectorTitle = () => within(document.querySelector<HTMLElement>(".canvas-inspector")!).getByRole("textbox", { name: "Title" }) as HTMLInputElement

beforeEach(async () => {
  render(() => (
    <UISet>
      <CanvasExample />
    </UISet>
  ))
  await settle()
})

test("agents add, wire, move and select nodes by name", async () => {
  const run = async (action: string, ...args: unknown[]) => {
    const result = await bridge.run("Workflow", action, ...args)
    return result.ok || result.error?.message
  }
  expect(await run("addNode", "Output", "Log")).toBe(true)
  expect(await run("connect", "Draft answer", "Log")).toBe(true)
  expect(await run("connect", "Draft answer", "Draft answer")).toMatch(/can't connect/)
  expect(await run("moveNode", "Log", 900, 320)).toBe(true)
  expect(await run("select", "Log", "Reply")).toBe(true)
  // Nodes on the page stay out of the snapshot; agents read them with query.
  const found = await bridge.agent.query({ within: "Workflow" })
  const items = Array.isArray(found) ? found.find((c) => c.label === "Workflow")?.items?.map((i) => i.label) : undefined
  expect(node(/^Log/).getAttribute("aria-selected")).toBe("true")
  expect(description(node(/^Log/))).toMatch(/Inputs: Text from Draft answer Text/)
  expect(items).toEqual(expect.arrayContaining([expect.stringMatching(/^Log \(at 900, 320; Inputs: Text from Draft answer Text\.\)/)]))
})

test("the inspector's fields start over when the selection moves straight to another node", async () => {
  await bridge.run("Workflow", "select", "Search docs")
  expect(inspectorTitle().value).toBe("Search docs")
  await bridge.run("Workflow", "select", "User question")
  expect(inspectorTitle().value).toBe("User question")
})

test("a node's notes save on leaving the field, show on the node, and undo", async () => {
  await bridge.run("Workflow", "select", "Reply")
  const notes = within(document.querySelector<HTMLElement>(".canvas-inspector")!).getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement
  expect(notes.value).toBe("Sent to the chat")
  notes.focus()
  notes.value = "Sent to the chat, and logged"
  notes.blur()
  await settle()
  expect(description(node(/^Reply/))).toContain("Sent to the chat, and logged")
  fireEvent.click(screen.getByRole("button", { name: "Undo" }))
  await settle()
  expect(description(node(/^Reply/))).toContain("Sent to the chat")
  expect(description(node(/^Reply/))).not.toContain("logged")
})
