import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/button"
import "@ui-sdk/web/drawer"
import "@ui-sdk/web/listbox"
import "@ui-sdk/web/toast"
import { toast } from "@ui-sdk/web"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Mobile kit as web elements (web/mobile.html), on a page with no React: data in, events
// out, driven through the web agent bridge. Gestures, keys, focus and the wheels' scrolling
// stay in the browser. Moved from tests/e2e/web/mobile.spec.ts.

const list = () => screen.getByRole("list", { name: "Messages" })
const row = (name: string) => within(list()).queryByRole("listitem", { name: new RegExp(name) })
const notifications = () => screen.getByRole("region", { name: "Notifications" })
const open = () => openWebPage("mobile.html", "mobile-demo.ts")
type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]>
}

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  // Toasts outlive the page's markup: each test starts with none.
  toast.dismiss()
  document.body.innerHTML = ""
})

test("agents run safe actions and open rows by name; Delete needs the person", async () => {
  const bridge = await open()
  // The page's own bridge, with no person to ask.
  const pageAgent = (window as unknown as { agent: Agent }).agent
  const archived = await bridge.run("Messages", "runAction", "Ada Lovelace", "Archive")
  expect(archived.ok, archived.error?.message).toBe(true)
  await waitFor(() => expect(row("Ada Lovelace")).toBeNull())
  const refused = await pageAgent.act({ steps: [{ ref: "Messages", action: "runAction", args: ["Linus", "Delete"] }] })
  expect(refused.ok).toBe(false)
  expect(refused.error?.message).toContain('Needs a person: "Delete: Linus Pauling')
  const opened = await bridge.run("Messages", "openRow", "Grace Hopper")
  expect(opened.ok, opened.error?.message).toBe(true)
  await waitFor(() => expect(notifications().textContent).toContain("Opened “Compiler notes for Friday”"))
  const found = await (bridge.agent as unknown as Agent).query({ within: "Messages" })
  const items = found.find((c) => c.label === "Messages")?.items?.map((i) => i.label)
  expect(items).toContain("Linus Pauling: Lab booking moved (actions: Unread, Archive, Delete)")
})

test("the action sheet returns its choice; Delete all can be undone", async () => {
  const bridge = await open()
  // Once all is read, the tab is named Inbox too: the sheet is found by its kind.
  const sheet = () => bridge.agent.snapshot().find((e) => e.component === "drawer" && e.label === "Inbox")!
  const choose = async (name: string) => {
    expect((await bridge.agent.act({ steps: [{ ref: sheet().ref, action: "press", args: [name] }] })).ok).toBe(true)
    await settle()
  }
  await bridge.press("Inbox options")
  await choose("Mark all as read")
  await waitFor(() => expect(screen.getByRole("button", { name: "Inbox" })).toBeTruthy())
  expect(sheet().open).toBe(false)
  await bridge.press("Inbox options")
  await choose("Delete all")
  await waitFor(() => expect(within(list()).queryAllByRole("listitem")).toHaveLength(0))
  within(notifications()).getByRole("button", { name: "Undo" }).click()
  await waitFor(() => expect(row("Grace Hopper")).not.toBeNull())
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

test("properties set before the elements are defined still apply", async () => {
  await early(`<uiset-root><uiset-pull-refresh id="r"><uiset-swipe-list id="l" aria-label="Early"></uiset-swipe-list></uiset-pull-refresh></uiset-root>`, (doc) => {
    Object.assign(doc.getElementById("r")!, { messages: { refresh: "Neu laden" } })
    Object.assign(doc.getElementById("l")!, { items: [{ id: "a", label: "First", content: "First", end: [{ id: "x", label: "Archive" }] }] })
  })
  expect(screen.getByRole("listitem", { name: "First" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Neu laden", hidden: true })).toBeTruthy()
})
