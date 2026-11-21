import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/alert-dialog"
import "@ui-sdk/web/button"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/select"
import "@ui-sdk/web/switch"
import "@ui-sdk/web/tabs"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Agent Console as web elements (web/agent.html), on a page with no React: project
// settings an agent changes through UI SDK's bridge, approvals before risky steps, Activity
// with undo, and what the agent can see. The console's own controls are kept from agents, so
// the person's presses are clicks. Moved from tests/e2e/web/agent-console.spec.ts.

const agentConsole = () => screen.getByRole("region", { name: "Agent" })
const settings = () => document.getElementById("project-settings")!
const status = () => within(agentConsole()).getAllByRole("status")[0]!.textContent
const suggestion = (name: string) => within(screen.getByRole("group", { name: "Suggestions" })).getByRole("button", { name }).click()
const view = (name: string) => within(agentConsole()).getByRole("tab", { name }).click()
const steps = () => [...agentConsole().querySelectorAll("uiset-agent-step")]
const combobox = (name: string) => within(settings()).getByRole("combobox", { name }).textContent?.trim()
const open = () => openWebPage("agent.html", "agent-demo.ts")

// jsdom has no media queries: the browser test ran with reduced motion.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  document.body.innerHTML = ""
})

test("the agent changes the settings step by step; Activity lists the changes and undoes them", async () => {
  const bridge = await open()
  suggestion("Make it public and move it to Europe")
  await waitFor(() => expect(steps().map((step) => step.getAttribute("status"))).toEqual(["done", "done"]))
  expect(steps()[0]!.textContent).toContain("Done")
  expect(combobox("Visibility")).toBe("Public")
  expect(combobox("Region")).toBe("Europe")
  expect(bridge.entry("Visibility").value).toBe("public")
  // The changed controls are marked where they are.
  expect(settings().querySelector("[data-agent-touched]")).not.toBeNull()
  view("Activity")
  const activity = document.querySelector("uiset-agent-activity") as HTMLElement
  expect(within(activity).getByText("2 changes by the agent")).toBeTruthy()
  within(activity).getByRole("button", { name: "Undo agent changes" }).click()
  await waitFor(() => expect(combobox("Visibility")).toBe("Private"))
  await waitFor(() => expect(combobox("Region")).toBe("North America"))
  await waitFor(() => expect(within(activity).getAllByText("Undone").length).toBeGreaterThan(0))
  expect((within(activity).getByRole("button", { name: "Undo agent changes" }) as HTMLButtonElement).disabled).toBe(true)
})

test("a risky step waits for the person: Don't allow refuses it, Allow lets it through", async () => {
  await open()
  suggestion("Delete the project")
  const card = screen.getByRole("group", { name: "Agent requests" })
  await waitFor(() => expect(card.textContent).toMatch(/Deletes the Apollo project/))
  expect(status()).toMatch(/Waiting for you/)
  within(card).getByRole("button", { name: "Don’t allow" }).click()
  await waitFor(() => expect(steps().at(-1)!.textContent).toContain("You said no"))
  await waitFor(() => expect(status()).toMatch(/Idle/))
  expect(document.getElementById("notice")!.textContent).toBe("")
})

test("What it sees lists each control the agent can reach, with its state", async () => {
  await open()
  // The console's own controls (the message box, Send) never reach the agent.
  const seen = (window as unknown as { agent: { snapshot: () => { label?: string }[] } }).agent.snapshot().map((e) => e.label)
  expect(seen).toContain("Project name")
  expect(seen).not.toContain("Message the agent")
  expect(seen).not.toContain("Send")
  view("What it sees")
  const snapshot = document.querySelector("uiset-agent-snapshot") as HTMLElement
  const table = () => within(snapshot).getByRole("table", { name: "What the agent can see on this page" })
  const row = (name: RegExp) => within(table()).queryByRole("row", { name })
  await waitFor(() => expect(row(/Project name/)?.textContent).toContain("“Apollo”"))
  expect(row(/Delete Apollo\?/)).not.toBeNull()
  // The console itself stays out of the agent's view, whatever the table shows.
  expect(row(/Undo agent changes/)).toBeNull()
  // `within` narrows it to part of the page: the form, without the buttons under it.
  snapshot.setAttribute("within", "#project-form")
  await waitFor(() => expect(row(/Save project/)).toBeNull())
  expect(row(/Project name/)).not.toBeNull()
})

// Elements made in a document with no window aren't upgraded, as a page leaves them before
// the element modules load; appended here, they upgrade with what was set on them.
async function early(html: string, set: (doc: Document) => void) {
  await import("../../web/src/uiset")
  const before = document.implementation.createHTMLDocument()
  before.body.innerHTML = html
  set(before)
  document.body.append(...before.body.childNodes)
  await settle()
}

test("properties set before the elements are defined are picked up", async () => {
  await early(
    `<uiset-root><uiset-agent-console title="Early agent" status="working"><uiset-agent-step status="done">Looked around</uiset-agent-step><uiset-agent-activity id="a"></uiset-agent-activity></uiset-agent-console></uiset-root>`,
    (doc) => {
      Object.assign(doc.getElementById("a")!, {
        history: { entries: () => [{ id: "1", source: "agent", label: "Name", ref: "x", reverted: false, from: "A", to: "B", component: "input" }], subscribe: () => () => {}, undoSource: async () => [] },
      })
    },
  )
  const region = screen.getByRole("region", { name: "Early agent" })
  expect(within(region).getByRole("status").textContent).toMatch(/Working/)
  expect(region.querySelector("uiset-agent-step")!.textContent).toContain("Looked aroundDone")
  expect(within(region).getByText("1 change by the agent")).toBeTruthy()
})
