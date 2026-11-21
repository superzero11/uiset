import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { createAgent } from "@ui-sdk/web/agent"
import "@ui-sdk/web/textarea"
import { createBridge, settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Canvas as web elements (web/canvas.html), on a page with no React, driven through the
// web agent bridge. Drags, keys, zoom and focus stay in the browser. Moved from
// tests/e2e/web/canvas.spec.ts.

type Agent = { query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]> }

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("agents add, wire, move and select nodes by name, and read them", async () => {
  const bridge = await openWebPage("canvas.html", "canvas-demo.ts")
  const act = (action: string, ...args: unknown[]) => bridge.run("Workflow", action, ...args)
  expect((await act("addNode", "Output", "Log")).ok).toBe(true)
  expect((await act("connect", "Draft answer", "Log")).ok).toBe(true)
  expect((await act("connect", "Draft answer", "Draft answer")).error?.message).toMatch(/can't connect/)
  expect((await act("moveNode", "Log", 900, 320)).ok).toBe(true)
  expect((await act("select", "Log", "Reply")).ok).toBe(true)
  const node = within(screen.getByRole("group", { name: "Workflow" })).getByRole("option", { name: /^Log/ })
  expect(node.getAttribute("aria-selected")).toBe("true")
  const found = await (bridge.agent as unknown as Agent).query({ within: "Workflow" })
  const items = found.find((c) => c.label === "Workflow")?.items?.map((i) => i.label)
  expect(items).toEqual(expect.arrayContaining([expect.stringMatching(/^Log \(at 900, 320; Inputs: Text from Draft answer Text\.\)/)]))
})

// Elements made in a document with no window aren't upgraded, as a page leaves them before
// the element modules load; appended here, they upgrade with what was set on them.
async function early(html: string, set: (doc: Document) => void) {
  const before = document.implementation.createHTMLDocument()
  before.body.innerHTML = html
  set(before)
  document.body.append(...before.body.childNodes)
  await settle()
}

test("properties set before the elements are defined draw once they are", async () => {
  await early(`<uiset-root><uiset-canvas id="c" label="Early flow"></uiset-canvas><uiset-canvas-inspector for="c"></uiset-canvas-inspector></uiset-root>`, (doc) => {
    Object.assign(doc.getElementById("c")!, {
      nodes: [
        { id: "a", title: "Early node", x: 40, y: 40, outputs: [{ id: "o", label: "Out" }] },
        { id: "b", title: "Later node", x: 320, y: 40, inputs: [{ id: "i", label: "In" }] },
      ],
      edges: [{ id: "a->b", from: "a:out:o", to: "b:in:i" }],
      renderNode: (n: { id: string }) => (n.id === "a" ? "First" : null),
    })
    Object.assign(doc.querySelector("uiset-canvas-inspector")!, {
      renderFields: (n: { title: string }) => Object.assign(document.createElement("p"), { textContent: "Fields for " + n.title }),
    })
  })
  const bridge = createBridge(createAgent)
  const flow = screen.getByRole("group", { name: "Early flow" })
  expect(within(flow).getByRole("option", { name: /^Early node/ })).toBeTruthy()
  expect(flow.querySelectorAll('path[data-slot="canvas-wire"]')).toHaveLength(1)
  expect(within(flow).getByText("First")).toBeTruthy()
  // Chosen by an agent here, where the browser test clicked it.
  await bridge.run("Early flow", "select", "Later node")
  await waitFor(() => expect(screen.getByText("Fields for Later node")).toBeTruthy())
})
