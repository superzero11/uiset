// The mobile kit in Solid, with React's assertions (tests/unit/mobile.test.tsx). The swipe
// list's gestures, keys and agent actions are the shared primitive (mobile/swipe-list.ts); these
// check the Solid parts over UI SDK's Listbox, Drawer, Menu and Button.
import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library"
import { createSignal, flush } from "solid-js"
import { expect, test, vi } from "vitest"
import { AppBar, PullToRefresh, SwipeList, TabBar, TimeWheel } from "@/solid/src/mobile"
import { settle } from "./solid-bridge"

test("a row without a label is named by its content", async () => {
  render(() => (
    <SwipeList
      label="Messages"
      onAction={() => {}}
      items={[{ id: "a", content: <span>Grace Hopper: Compiler notes</span>, end: [{ id: "archive", label: "Archive" }] }]}
    />
  ))
  await settle()
  expect(screen.getByRole("listitem", { name: "Grace Hopper: Compiler notes" })).toBeTruthy()
  // The menu for screen readers' own navigation is named by the row too.
  expect(screen.getByRole("button", { name: "Actions for Grace Hopper: Compiler notes" })).toBeTruthy()
})

test("a row with actions is described by how its keys work; a row without isn't", async () => {
  render(() => (
    <SwipeList
      label="Messages"
      onAction={() => {}}
      items={[
        { id: "a", label: "Grace Hopper", content: "Grace Hopper", end: [{ id: "archive", label: "Archive" }] },
        { id: "b", label: "Ada Lovelace", content: "Ada Lovelace" },
      ]}
    />
  ))
  await settle()
  const help = (name: string) => {
    const id = screen.getByRole("listitem", { name }).getAttribute("aria-describedby")
    return id ? document.getElementById(id)?.textContent : undefined
  }
  expect(help("Grace Hopper")).toBe("Left and Right show this row's actions; Escape hides them.")
  expect(help("Ada Lovelace")).toBeUndefined()
})

test("a time between the minute steps still shows on the wheel", async () => {
  render(() => <TimeWheel label="Alarm time" value="00:07" onValueChange={() => {}} hour12={false} />)
  await settle()
  const minute = screen.getByRole("listbox", { name: "Alarm time, minute" })
  expect(minute.querySelector('[aria-selected="true"]')?.textContent).toBe("07")
  const hour = screen.getByRole("listbox", { name: "Alarm time, hour" })
  expect(hour.querySelector('[aria-selected="true"]')?.textContent).toBe("00")
})

test("a failed refresh is announced and handed to onError, and the list can refresh again", async () => {
  const failure = new Error("offline")
  const onError = vi.fn()
  const onRefresh = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(undefined)
  render(() => (
    <PullToRefresh onRefresh={onRefresh} onError={onError} messages={{ failed: "Couldn't check for mail." }}>
      <p>List</p>
    </PullToRefresh>
  ))
  await settle()
  const button = screen.getByRole("button", { name: "Refresh" })
  fireEvent.click(button)
  await waitFor(() => expect(onError).toHaveBeenCalledWith(failure))
  await waitFor(() => expect(document.body.textContent).toContain("Couldn't check for mail."))
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(button)
  await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(2))
})

test("tab bar links leave modified clicks to the browser; buttons switch sections", async () => {
  const onValueChange = vi.fn()
  render(() => (
    <TabBar
      value="inbox"
      onValueChange={onValueChange}
      items={[
        { id: "inbox", label: "Inbox", icon: "inbox", href: "#inbox", badge: 3 },
        { id: "alarms", label: "Alarms", icon: "bell", href: "#alarms" },
      ]}
    />
  ))
  await settle()
  const alarms = screen.getByRole("link", { name: "Alarms" })
  fireEvent.click(alarms, { metaKey: true })
  fireEvent.click(alarms, { ctrlKey: true })
  expect(onValueChange).not.toHaveBeenCalled()
  fireEvent.click(alarms)
  expect(onValueChange).toHaveBeenCalledWith("alarms")
  expect(screen.getByRole("link", { name: "Inbox, 3 new" }).getAttribute("aria-current")).toBe("page")
})

test("the app bar's title takes the heading level it's given", async () => {
  render(() => <AppBar title="Inbox" headingLevel={2} />)
  await settle()
  expect(screen.getByRole("heading", { level: 2, name: "Inbox" })).toBeTruthy()
})

// A part's children given as a function are built again, whole, when something at their top
// changes (lint solid/part-children-once): archiving one row rebuilt every row.
test("a row that goes leaves the others as they are", async () => {
  const [items, setItems] = createSignal([
    { id: "a", label: "Grace Hopper", content: "Grace Hopper", end: [{ id: "archive", label: "Archive" }] },
    { id: "b", label: "Ada Lovelace", content: "Ada Lovelace", end: [{ id: "archive", label: "Archive" }] },
  ])
  render(() => <SwipeList label="Messages" onAction={(id) => setItems((all) => all.filter((item) => item.id !== id))} items={items()} />)
  await settle()
  const ada = screen.getByRole("listitem", { name: "Ada Lovelace" })
  setItems((all) => all.filter((item) => item.id !== "a"))
  flush()
  await settle()
  expect(screen.queryByRole("listitem", { name: "Grace Hopper" })).toBeNull()
  expect(screen.getByRole("listitem", { name: "Ada Lovelace" })).toBe(ada)
})
