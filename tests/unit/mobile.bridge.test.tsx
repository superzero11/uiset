import { act, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test } from "vitest"
import { Toaster, toast } from "@/registry/uiset/ui/toast"
import { UISet } from "@/registry/uiset/ui/uiset"
import MobileExample from "@/src/site/examples/mobile"
import { createBridge, settle } from "./bridge"

// The gallery's phone (src/site/examples/mobile.tsx), driven through the agent bridge: the
// inbox's rows and their actions, the action sheet, and the toasts' Undo. Moved from
// tests/e2e/mobile.spec.ts.

const bridge = createBridge()
const list = () => screen.getByRole("list", { name: "Messages" })
const row = (from: string | RegExp) => within(list()).queryByRole("listitem", { name: typeof from === "string" ? new RegExp(from) : from })
const toastNamed = (label: string | RegExp) =>
  bridge.agent.snapshot().find((e) => e.component === "toast" && (typeof label === "string" ? e.label === label : label.test(e.label ?? "")))

beforeEach(async () => {
  render(
    <UISet>
      <MobileExample />
      <Toaster />
    </UISet>,
  )
  await settle()
})
afterEach(() => {
  act(() => toast.dismiss?.())
})

test("hidden actions are out of reach until shown", () => {
  const actions = row("Grace Hopper")!.querySelector("[data-swipe-actions]")
  expect(actions?.hasAttribute("inert")).toBe(true)
})

test("the action sheet returns what was chosen", async () => {
  expect(row(/^Unread, Grace Hopper/)).toBeTruthy()
  await bridge.press("Inbox options")
  // The sheet's choices are its buttons, pressed by their text.
  await bridge.press("Inbox", "Mark all as read")
  await waitFor(() => expect(screen.getByRole("button", { name: "Inbox" })).toBeTruthy())
  expect(row(/^Grace Hopper/)).toBeTruthy()
})

test("agents run a row's safe actions and open rows by name; dangerous ones need the person", async () => {
  const archived = await bridge.run("Messages", "runAction", "Ada Lovelace", "Archive")
  expect(archived.ok, archived.error?.message).toBe(true)
  expect(row("Ada Lovelace")).toBeNull()
  const refused = await bridge.run("Messages", "runAction", "Linus", "Delete")
  expect(refused.ok).toBe(false)
  expect(refused.error?.message).toContain('Needs a person: "Delete: Linus Pauling')
  expect(refused.error?.message).toContain('in "Actions for Linus Pauling')
  expect(row("Linus Pauling")).toBeTruthy()
  const opened = await bridge.run("Messages", "openRow", "Grace Hopper")
  expect(opened.ok, opened.error?.message).toBe(true)
  // The toast's own text.
  await waitFor(() => expect(screen.getByRole("region", { name: "Notifications" }).textContent).toContain("Opened “Compiler notes for Friday”"))
  const found = await bridge.agent.query({ within: "Messages" })
  const items = Array.isArray(found) ? found.find((c) => c.label === "Messages")?.items?.map((i) => i.label) : undefined
  expect(items).toContain("Linus Pauling: Lab booking moved, Yesterday (actions: Unread, Archive, Delete)")
  // The tab bar's sections are buttons agents can press.
  const switched = await bridge.press("Alarms")
  expect(switched.ok, switched.error?.message).toBe(true)
  expect(screen.getByRole("heading", { name: "Alarms" })).toBeTruthy()
})

test("Delete all can be undone", async () => {
  await bridge.press("Inbox options")
  await bridge.press("Inbox", "Delete all")
  await waitFor(() => expect(within(list()).queryAllByRole("listitem")).toHaveLength(0))
  // Deleting everything is one an agent's person confirms; marking all read isn't.
  expect(bridge.asked).toContain("Delete all (Inbox)")
  expect(bridge.asked.some((said) => said.startsWith("Mark all as read"))).toBe(false)
  await waitFor(() => expect(toastNamed(/^Deleted 4 messages/)).toBeDefined())
  const undone = await bridge.press(/^Deleted 4 messages/, "Undo")
  expect(undone.ok, undone.error?.message).toBe(true)
  await waitFor(() => expect(row("Grace Hopper")).toBeTruthy())
})
