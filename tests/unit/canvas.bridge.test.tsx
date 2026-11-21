import { render, screen, within } from "@testing-library/react"
import { beforeEach, expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import CanvasExample from "@/src/site/examples/canvas"
import { createBridge, settle } from "./bridge"

// The gallery's canvas (src/site/examples/canvas.tsx), driven through the agent bridge: nodes
// added, wired, moved and selected by name, and the inspector beside it. Moved from
// tests/e2e/canvas.spec.ts.

const bridge = createBridge()
const node = (name: RegExp) => within(screen.getByRole("group", { name: "Workflow" })).getByRole("option", { name })
const description = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
const inspectorTitle = () => within(document.querySelector<HTMLElement>(".canvas-inspector")!).getByRole("textbox", { name: "Title" }) as HTMLInputElement

beforeEach(async () => {
  render(
    <UISet>
      <CanvasExample />
    </UISet>,
  )
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
