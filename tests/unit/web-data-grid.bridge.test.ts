import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/toast"
import { toast } from "@ui-sdk/web"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Data Grid as a web element (web/data-grid.html), on a page with no React, driven through
// the web agent bridge. Keys, focus, scrolling, sizes and the open lists stay in the browser.
// Moved from tests/e2e/web/data-grid.spec.ts.

type Agent = { query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]> }
const footer = () => document.querySelector("uiset-data-grid .data-grid-footer")!

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  // Toasts outlive the page's markup: each test starts with none.
  toast.dismiss()
  document.body.innerHTML = ""
})

test("agents sort, filter, select, edit, group and hide by the names people see", async () => {
  const bridge = await openWebPage("data-grid.html", "data-grid-demo.ts")
  const grid = () => screen.getByRole("grid", { name: "Customers" })
  expect(grid().getAttribute("aria-rowcount")).toBe("61")
  // "Customers" also names the search field and the filters ("Search customers"), so the
  // grid is found by its kind.
  const ref = bridge.agent.snapshot().find((c) => c.component === "data-grid" && c.label === "Customers")!.ref
  const act = async (action: string, ...args: unknown[]) => {
    const result = await bridge.agent.act({ steps: [{ ref, action, args }] })
    await settle()
    return result
  }
  const sorted = await act("sortBy", "MRR", "descending")
  expect(sorted.ok, sorted.error?.message).toBe(true)
  expect(within(grid()).getByRole("columnheader", { name: /MRR/ }).getAttribute("aria-sort")).toBe("descending")
  const edited = await act("editCell", "Acme", "Seats", "12")
  expect(edited.ok, edited.error?.message).toBe(true)
  const bad = await act("editCell", "Acme", "Seats", "lots")
  expect(bad.error?.message).toContain("Seats needs a number")
  const selected = await act("selectRows", ["Acme", "Globex"])
  expect(selected.ok, selected.error?.message).toBe(true)
  await waitFor(() => expect(footer().textContent).toContain("2 selected"))
  const filtered = await act("filter", "Acme")
  expect(filtered.ok, filtered.error?.message).toBe(true)
  await waitFor(() => expect(footer().textContent).toContain("of 60 rows"))
  const hidden = await act("showColumn", "Name", false)
  expect(hidden.error?.message).toContain("Name can't be hidden")
  const found = await (bridge.agent as unknown as Agent).query({ within: ref })
  const items = found.find((c) => c.label === "Customers")?.items?.map((i) => i.label)
  expect(items).toContainEqual(expect.stringContaining("Acme (Plan: Free, Region: Americas, Seats: 12,"))
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

test("properties set before the element is defined are picked up, and later sets still work", async () => {
  await early(`<uiset-root><uiset-data-grid id="g" label="Early" selectable></uiset-data-grid></uiset-root>`, (doc) => {
    Object.assign(doc.getElementById("g")!, {
      columns: [{ id: "name", header: "Name", value: (r: { name: string }) => r.name }],
      rows: [
        { id: "a", name: "Beta" },
        { id: "b", name: "Alpha" },
      ],
      sort: [{ column: "name", direction: "ascending" }],
      selected: ["a"],
    })
  })
  const grid = screen.getByRole("grid", { name: "Early" })
  expect(grid.getAttribute("aria-rowcount")).toBe("3")
  expect(within(grid).getAllByRole("row")[1]!.textContent).toContain("Alpha")
  expect(within(grid).getByRole("row", { name: /Beta/ }).getAttribute("aria-selected")).toBe("true")
  ;(document.getElementById("g") as HTMLElement & { selected: string[] }).selected = ["b"]
  await waitFor(() => expect(within(grid).getByRole("row", { name: /Alpha/ }).getAttribute("aria-selected")).toBe("true"))
})
