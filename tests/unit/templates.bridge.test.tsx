import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { AdminTemplate } from "@/registry/uiset/ui/templates/admin"
import { CalendarAppTemplate } from "@/registry/uiset/ui/templates/calendar-app"
import { ChatAppTemplate } from "@/registry/uiset/ui/templates/chat-app"
import { DashboardTemplate } from "@/registry/uiset/ui/templates/dashboard"
import { InboxTemplate } from "@/registry/uiset/ui/templates/inbox"
import { PricingTemplate } from "@/registry/uiset/ui/templates/pricing"
import { ProjectBoardTemplate } from "@/registry/uiset/ui/templates/project-board"
import { SettingsTemplate } from "@/registry/uiset/ui/templates/settings"
import { Toaster, toast } from "@/registry/uiset/ui/toast"
import { UISet } from "@/registry/uiset/ui/uiset"
import { createBridge, settle } from "./bridge"

// The page templates as their pages show them (src/site/library-demos.tsx), driven through the
// agent bridge by the names people see. Links and the month's days aren't components an agent
// finds, so those few are clicked. Moved from tests/e2e/templates.spec.ts.

const bridge = createBridge()

// jsdom has no media queries: every template lays out wide, as at 1440.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  toast.dismiss?.()
  cleanup()
})

async function open(template: ReactNode) {
  render(
    <UISet>
      {template}
      <Toaster />
    </UISet>,
  )
  await settle()
}

const toastTitles = () => [...document.querySelectorAll("[data-slot=toast-title]")].map((t) => t.textContent)
const statValue = (n: number) => document.querySelectorAll(".stat")[n]?.querySelector(".stat-value")?.textContent
const heading2 = (name: string) => screen.queryByRole("heading", { level: 2, name })

test("dashboard: the date range rescopes the figures and the table", async () => {
  await open(<DashboardTemplate contentElement="div" />)
  const thirty = statValue(1)
  await bridge.run("Date range", "setValue", "7")
  expect(bridge.entry("Date range").value).toBe("7")
  expect(statValue(1)).not.toBe(thirty)
  expect(bridge.entry("Recent orders").component).toBe("data-grid")
  expect(within(screen.getByRole("listbox", { name: "Revenue" })).getAllByRole("option")).toHaveLength(7)
})

test("settings: deleting the workspace waits for its name", async () => {
  await open(<SettingsTemplate contentElement="div" />)
  await bridge.run("Settings sections", "setValue", "workspace")
  await bridge.press("Delete workspace")
  await waitFor(() => expect(screen.getByRole("alertdialog", { name: "Delete Acme Cloud?" })).toBeTruthy())
  // The dialog's own buttons are pressed through it: bridge.press("Delete Acme Cloud?", "Delete forever").
  expect(bridge.entry("Delete Acme Cloud?").buttons).toContain("Delete forever")
  const confirm = screen.getByRole("button", { name: "Delete forever" }) as HTMLButtonElement
  expect(confirm.disabled).toBe(true)
  await bridge.run("Workspace name to confirm", "setValue", "Acme Cloud")
  expect(confirm.disabled).toBe(false)
  expect(confirm.getAttribute("data-agent-confirm")).toMatch(/Deletes Acme Cloud/)
})

test("admin: create a customer in the drawer, then find them", async () => {
  await open(<AdminTemplate contentElement="div" />)
  await bridge.press("New customer")
  await waitFor(() => expect(screen.getByRole("form", { name: "New customer" })).toBeTruthy())
  const form = screen.getByRole("form", { name: "New customer" })
  await bridge.press("Add customer")
  await waitFor(() => expect(within(form).getByText("Enter a name.")).toBeTruthy())
  await bridge.run("Full name", "setValue", "Joan Clarke")
  await bridge.run("Email", "setValue", "joan@example.com")
  await bridge.run("Company", "setValue", "Codebreak Ltd")
  await bridge.press("Add customer")
  await waitFor(() => expect(toastTitles()).toContain("Added Joan Clarke"))
  await bridge.run("Customers", "filter", "joan")
  await waitFor(() => expect(screen.getByRole("grid", { name: "Customers" }).textContent).toContain("Codebreak Ltd"))
})

test("chat app: a suggestion streams an answer with reasoning, a tool and sources", async () => {
  await open(<ChatAppTemplate />)
  await bridge.press("Suggestions", "Explain AbortController")
  const thread = screen.getByRole("region", { name: "Conversation" })
  await waitFor(() => expect(thread.textContent).toContain("Here's a short answer"), { timeout: 10_000 })
  expect(within(thread).getByText("Searched the docs")).toBeTruthy()
  await waitFor(() => expect(within(thread).getAllByText(/2 sources/i).length).toBeGreaterThan(0), { timeout: 10_000 })
}, 30_000)

test("pricing: the billing switch changes every price", async () => {
  await open(<PricingTemplate />)
  const pro = () => document.querySelectorAll(".pricing-plan")[1]?.querySelector(".pricing-amount")?.textContent
  expect(pro()).toBe("$41")
  await bridge.run("Billing period", "setValue", "monthly")
  expect(pro()).toBe("$49")
  expect(screen.getByRole("link", { name: "Start a 14-day trial: Pro" })).toBeTruthy()
})

test("agents drive templates by the names people see", async () => {
  await open(<DashboardTemplate contentElement="div" />)
  const before = statValue(1)
  let result = await bridge.run("Date range", "setValue", "7 days")
  expect(result.ok, result.error?.message).toBe(true)
  expect(statValue(1)).not.toBe(before)
  cleanup()

  await open(<AdminTemplate contentElement="div" />)
  result = await bridge.run("Customers", "filter", "hopper")
  expect(result.ok, result.error?.message).toBe(true)
  await waitFor(() => expect(document.querySelector(".data-grid-footer")?.textContent).toContain("1 of 8 rows"))
  cleanup()

  await open(<InboxTemplate contentElement="div" />)
  result = await bridge.run("Inbox messages", "setValue", "msg-4")
  expect(result.ok, result.error?.message).toBe(true)
  await waitFor(() => expect(heading2("Numbers for the board deck")).toBeTruthy())
})

test("inbox: folder links switch the list, and archived mail can come back", async () => {
  await open(<InboxTemplate contentElement="div" />)
  await bridge.press("Archive message")
  await userEvent.click(screen.getByRole("link", { name: "Archive" }))
  await waitFor(() => expect(bridge.find("Archive messages")?.offPage).toBeFalsy())
  const archived = screen.getByRole("listbox", { name: "Archive messages" })
  const options = within(archived).getAllByRole("option")
  expect(options).toHaveLength(1)
  await bridge.run("Archive messages", "setValue", bridge.entry("Archive messages").items![0]!.value)
  await bridge.press("Move to Inbox")
  await waitFor(() => expect(screen.getByText("Nothing here")).toBeTruthy())
})

test("settings: tabs keep what you did, and an existing teammate can't be invited twice", async () => {
  await open(<SettingsTemplate contentElement="div" />)
  await bridge.run("Settings sections", "setValue", "security")
  await bridge.press("Sign out Safari on iPhone")
  await bridge.run("Settings sections", "setValue", "team")
  await bridge.run("Settings sections", "setValue", "security")
  expect(screen.queryByRole("button", { name: "Sign out Safari on iPhone" })).toBeNull()

  await bridge.run("Settings sections", "setValue", "team")
  await bridge.press("Invite people")
  await waitFor(() => expect(screen.getByRole("form", { name: "Invite people" })).toBeTruthy())
  const invite = screen.getByRole("form", { name: "Invite people" })
  await bridge.run("Email address", "setValue", "grace@example.com")
  await bridge.press("Send invite")
  await waitFor(() => expect(within(invite).getByText("grace@example.com is already on the team.")).toBeTruthy())
})

/* ------------------------------------------------------------ project board */

const issueBoard = () => screen.getByRole("group", { name: "Issue board" })
const issueColumn = (name: string) => within(issueBoard()).getByRole("listbox", { name })

test("project board: search and the person filter narrow the board and the list", async () => {
  await open(<ProjectBoardTemplate contentElement="div" />)
  await bridge.run("Search issues", "setValue", "safari")
  await waitFor(() => expect(within(issueBoard()).getAllByRole("option")).toHaveLength(1))
  expect(within(issueBoard()).getByRole("option", { name: "Fix the contact form on Safari" })).toBeTruthy()
  await bridge.run("Search issues", "setValue", "")
  await bridge.run("Cards for", "setValue", "Ada Lovelace")
  await waitFor(() => expect(within(issueBoard()).getAllByRole("option")).toHaveLength(3))
  await bridge.run("View", "setValue", "list")
  await waitFor(() => expect(screen.getByRole("grid", { name: "Issue list" }).getAttribute("aria-rowcount")).toBe("4"))
})

/* ------------------------------------------------------------------ calendar */

const week = () => screen.getByRole("group", { name: "My calendar" })
const event = (name: RegExp) => within(week()).queryByRole("button", { name })

test("calendar: unchecking a calendar hides its events, and checking it brings them back", async () => {
  await open(<CalendarAppTemplate contentElement="div" />)
  expect(event(/^Lunch with Ada, Monday/)).toBeTruthy()
  await bridge.run("Personal", "setChecked", false)
  expect(event(/^Lunch with Ada, Monday/)).toBeNull()
  expect(event(/^Design review, Monday/)).toBeTruthy()
  expect(screen.getByRole("list", { name: "Upcoming" }).textContent).not.toContain("Lunch with Ada")
  await bridge.run("Personal", "setChecked", true)
  expect(event(/^Lunch with Ada, Monday/)).toBeTruthy()
})

test("calendar: the small month jumps the week to the day chosen", async () => {
  await open(<CalendarAppTemplate contentElement="div" />)
  await bridge.run("November 2026", "setValue", "2026-11-25")
  expect(screen.getByRole("heading", { name: "Nov 23 – 29, 2026" })).toBeTruthy()
  expect(event(/^Design critique, Wednesday, November 25/)).toBeTruthy()
  await bridge.press("Go to today")
  expect(screen.getByRole("heading", { name: "Nov 16 – 22, 2026" })).toBeTruthy()
})

test("calendar: the month lists each day's events; choosing a day opens it", async () => {
  await open(<CalendarAppTemplate contentElement="div" />)
  await bridge.run("Calendar layout", "setValue", "month")
  const month = screen.getByRole("grid", { name: "Month of events" })
  const day = within(month).getByRole("gridcell", { name: /November 18/ })
  expect(within(month).getByRole("gridcell", { name: /3 events: Standup at 9:00 AM, 1:1 with Grace at 11:00 AM, Launch rehearsal at 3:00 PM/ })).toBe(day)
  await userEvent.click(day)
  await waitFor(() => expect(bridge.entry("Calendar layout").value).toBe("day"))
  expect(screen.getByRole("heading", { name: "Wednesday, November 18" })).toBeTruthy()
  expect(event(/^Launch rehearsal, Wednesday/)).toBeTruthy()
})

test("agents move issues and add events by the names people see", async () => {
  await open(<ProjectBoardTemplate contentElement="div" />)
  let result = await bridge.run("Issue board", "moveCard", "Search results layout", "Done")
  expect(result.ok, result.error?.message).toBe(true)
  expect(within(issueColumn("Done")).getByRole("option", { name: "Search results layout" })).toBeTruthy()
  expect(screen.getByRole("meter", { name: "Sprint progress" }).getAttribute("aria-valuetext")).toBe("5 of 14 issues done")
  cleanup()

  await open(<CalendarAppTemplate contentElement="div" />)
  result = await bridge.run("My calendar", "addEvent", "Thursday", "14:00", "15:00", "Pairing")
  expect(result.ok, result.error?.message).toBe(true)
  expect(event(/^Pairing, Thursday, November 19, 2:00 PM to 3:00 PM/)).toBeTruthy()
})
