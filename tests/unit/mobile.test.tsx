import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { AppBar, PullToRefresh, SwipeList, TabBar, TimeWheel } from "@/registry/uiset/ui/mobile"

test("a row without a label is named by its content", () => {
  render(
    <SwipeList
      label="Messages"
      onAction={() => {}}
      items={[{ id: "a", content: <span>Grace Hopper: Compiler notes</span>, end: [{ id: "archive", label: "Archive" }] }]}
    />,
  )
  expect(screen.getByRole("listitem", { name: "Grace Hopper: Compiler notes" })).toBeTruthy()
  // The menu for screen readers' own navigation is named by the row too.
  expect(screen.getByRole("button", { name: "Actions for Grace Hopper: Compiler notes" })).toBeTruthy()
})

test("a time between the minute steps still shows on the wheel", () => {
  render(<TimeWheel label="Alarm time" value="00:07" onValueChange={() => {}} hour12={false} />)
  const minute = screen.getByRole("listbox", { name: "Alarm time, minute" })
  expect(minute.querySelector('[aria-selected="true"]')?.textContent).toBe("07")
  const hour = screen.getByRole("listbox", { name: "Alarm time, hour" })
  expect(hour.querySelector('[aria-selected="true"]')?.textContent).toBe("00")
})

test("a failed refresh is announced and handed to onError, and the list can refresh again", async () => {
  const failure = new Error("offline")
  const onError = vi.fn()
  const onRefresh = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(undefined)
  render(
    <PullToRefresh onRefresh={onRefresh} onError={onError} messages={{ failed: "Couldn't check for mail." }}>
      <p>List</p>
    </PullToRefresh>,
  )
  const button = screen.getByRole("button", { name: "Refresh" })
  fireEvent.click(button)
  await waitFor(() => expect(onError).toHaveBeenCalledWith(failure))
  await waitFor(() => expect(document.body.textContent).toContain("Couldn't check for mail."))
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(button)
  await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(2))
})

test("tab bar links leave modified clicks to the browser; buttons switch sections", () => {
  const onValueChange = vi.fn()
  render(
    <TabBar
      value="inbox"
      onValueChange={onValueChange}
      items={[
        { id: "inbox", label: "Inbox", icon: "inbox", href: "#inbox", badge: 3 },
        { id: "alarms", label: "Alarms", icon: "bell", href: "#alarms" },
      ]}
    />,
  )
  const alarms = screen.getByRole("link", { name: "Alarms" })
  fireEvent.click(alarms, { metaKey: true })
  fireEvent.click(alarms, { ctrlKey: true })
  expect(onValueChange).not.toHaveBeenCalled()
  fireEvent.click(alarms)
  expect(onValueChange).toHaveBeenCalledWith("alarms")
  expect(screen.getByRole("link", { name: "Inbox, 3 new" }).getAttribute("aria-current")).toBe("page")
})

test("the app bar's title takes the heading level it's given", () => {
  render(<AppBar title="Inbox" headingLevel={2} />)
  expect(screen.getByRole("heading", { level: 2, name: "Inbox" })).toBeTruthy()
})
