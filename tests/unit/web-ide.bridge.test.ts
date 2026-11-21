import { screen, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The IDE as web elements (web/ide.html), on a page with no React, driven through the web agent
// bridge. Keys, drags, focus and the editor's colors stay in the browser. Moved from
// tests/e2e/web/ide.spec.ts.

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

// As the page loads it fills the palette's Recent, and for a moment two palette items share
// src/index.ts's value: UI SDK warns of it (a console warning in the browser, which the browser
// test never read). That one warning is let through on load; any other still fails.
async function openIde() {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  globalThis.__UI_SDK_STRICT__ = false
  try {
    return await openWebPage("ide.html", "ide-demo.ts")
  } finally {
    globalThis.__UI_SDK_STRICT__ = true
    const seen = warn.mock.calls.map((call) => String(call[0]))
    warn.mockRestore()
    expect(seen.filter((w) => !w.includes('command: Two items have the value "file:src/index.ts"'))).toEqual([])
  }
}

test("agents open files and edit code by the names people see", async () => {
  const bridge = await openIde()
  const ide = () => document.querySelector<HTMLElement>(".template-ide")!
  let result = await bridge.run("Project files", "setValue", "src/config.ts")
  expect(result.ok, result.error?.message).toBe(true)
  expect(within(within(ide()).getByRole("tree", { name: /Files/i })).getByRole("treeitem", { name: /config\.ts/ }).getAttribute("aria-selected")).toBe("true")
  // An agent's choice of a file opens it, so its editor is there to write in.
  expect(within(ide()).getByRole("tab", { name: /config\.ts/ }).getAttribute("aria-selected")).toBe("true")
  result = await bridge.run("src/config.ts", "setValue", "export const config = {}\n")
  expect(result.ok, result.error?.message).toBe(true)
  expect(within(ide()).getByRole("tab", { name: /config\.ts, unsaved/ })).toBeTruthy()
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

test("properties set before the elements are defined are picked up", async () => {
  await early(
    `<uiset-root>
      <uiset-file-tree id="t" label="Early files"></uiset-file-tree>
      <uiset-editor-tabs id="e"></uiset-editor-tabs>
      <uiset-problems id="p"></uiset-problems>
    </uiset-root>`,
    (doc) => {
      Object.assign(doc.getElementById("t")!, { paths: ["a.ts", "b/"], status: { "a.ts": "modified" } })
      Object.assign(doc.getElementById("e")!, {
        files: [{ path: "a.ts", dirty: true }],
        renderPanel: (path: string) => Object.assign(document.createElement("p"), { textContent: "Panel for " + path }),
      })
      Object.assign(doc.getElementById("p")!, { problems: [{ path: "a.ts", line: 2, severity: "error", message: "Early problem" }] })
    },
  )
  expect(screen.getByRole("treeitem", { name: "a.ts, modified" })).toBeTruthy()
  expect(screen.getByRole("tab", { name: "a.ts, unsaved" })).toBeTruthy()
  expect(screen.getByText("Panel for a.ts")).toBeTruthy()
  // jsdom's names drop the spaces a browser puts between the parts.
  expect(screen.getByRole("button", { name: /Error:\s*Early problem/ })).toBeTruthy()
})
