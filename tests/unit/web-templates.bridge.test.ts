import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The page templates as web pages (web/templates/*.html), driven through the web agent bridge.
// Moved from tests/e2e/web/templates.spec.ts.

const frame = () => document.querySelector(".template-frame") as HTMLElement
const open = (template: string) => openWebPage(`templates/${template}.html`, `templates/${template}.ts`)
const shown = (el: Element | null) => !!el && !(el as HTMLElement).closest("[hidden]") && (el as HTMLElement).style.display !== "none"
const toastTitles = () => [...document.querySelectorAll("[data-slot=toast-title]")].map((el) => el.textContent)

/**
 * A step by name, as an agent writes it. The bridge takes the one component of that name that
 * can do it: a field showing a problem shares its input's name.
 */
async function step(bridge: Awaited<ReturnType<typeof open>>, label: string, action: string, ...args: unknown[]) {
  const result = await bridge.agent.act({ steps: [{ ref: label, action, args }] })
  await settle()
  expect(result.ok, result.error?.message).toBe(true)
}

// The elements' modules load once per file, and the first load can take a while. The admin
// page loads these UI SDK elements itself, beside UISet's.
beforeAll(async () => {
  await import("@ui-sdk/web/alert-dialog")
  await import("@ui-sdk/web/drawer")
  await import("@ui-sdk/web/select")
  await import("@ui-sdk/web/toast")
  await import("../../web/src/uiset")
}, 60_000)

beforeAll(() => {
  // jsdom has no matchMedia: the app shell asks it whether the screen is narrow.
  window.matchMedia ??= (query: string) =>
    ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList
})

afterEach(() => {
  document.body.innerHTML = ""
  // Back to no hash without a hashchange: an earlier page's listener would draw into a page that's gone.
  history.replaceState(null, "", location.pathname)
})

test("pricing: the billing switch changes every price; the table and questions read", async () => {
  const bridge = await open("pricing")
  const pro = () => frame().querySelectorAll(".pricing-plan")[1]!
  expect(pro().querySelector(".pricing-amount")?.textContent).toBe("$41")
  await bridge.run("Billing period", "setValue", "Monthly")
  expect(pro().querySelector(".pricing-amount")?.textContent).toBe("$49")
  within(frame()).getByRole("link", { name: "Start a 14-day trial: Pro" })
  const sso = within(frame()).getByRole("row", { name: /Single sign-on/ })
  expect(within(sso).getAllByRole("cell", { name: /Not included/ })).toContain(within(sso).getAllByRole("cell")[0])
  const answer = within(frame()).getByText(/^Anyone who can sign in to your workspace\./)
  expect(shown(answer)).toBe(false)
  // The person presses the question. (The bridge lists the accordion's items as q0 to q3, not
  // by their questions, so an agent can't open one by its words.)
  within(frame()).getByRole("button", { name: "What counts as a seat?" }).click()
  await settle()
  expect(shown(answer)).toBe(true)
})

test("admin: create a customer in the drawer, then find them", async () => {
  const bridge = await open("admin")
  await bridge.press("New customer")
  const form = screen.getByRole("form", { name: "New customer" })
  await bridge.press("Add customer")
  await waitFor(() => expect(within(form).getByText("Enter a name.")).toBeTruthy())
  await step(bridge, "Full name", "setValue", "Joan Clarke")
  await step(bridge, "Email", "setValue", "joan@example.com")
  await step(bridge, "Company", "setValue", "Codebreak Ltd")
  await bridge.press("Add customer")
  await waitFor(() => expect(toastTitles()).toContain("Added Joan Clarke"))
  // The search box is the person's (agents filter the grid by its name): typed in, as a fill does.
  const search = within(frame()).getByRole("searchbox", { name: "Search customers" }) as HTMLInputElement
  search.value = "joan"
  search.dispatchEvent(new Event("input", { bubbles: true }))
  await waitFor(() => expect(within(frame()).getByRole("grid", { name: "Customers" }).textContent).toContain("Codebreak Ltd"))
})

test("settings: deleting the workspace waits for its name", async () => {
  const bridge = await open("settings")
  await bridge.run("Settings sections", "setValue", "Workspace")
  // The person presses Delete workspace, the dialog's trigger; the bridge names it by the dialog.
  await bridge.press("Delete Acme Cloud?")
  const dialog = screen.getByRole("alertdialog", { name: "Delete Acme Cloud?" })
  const confirm = within(dialog).getByRole("button", { name: "Delete forever" }) as HTMLButtonElement
  expect(confirm.disabled).toBe(true)
  await step(bridge, "Workspace name to confirm", "setValue", "Acme Cloud")
  expect(confirm.disabled).toBe(false)
  expect(confirm.getAttribute("data-agent-confirm")).toMatch(/Deletes Acme Cloud/)
})

test("chat app: a suggestion streams an answer with reasoning, a tool and sources", { timeout: 30_000 }, async () => {
  const bridge = await open("chat-app")
  await bridge.press("Suggestions", "Explain AbortController")
  const thread = within(frame()).getByRole("region", { name: "Conversation" })
  await waitFor(() => expect(thread.textContent).toContain("Here's a short answer"), { timeout: 15_000 })
  await waitFor(() => expect(thread.textContent).toContain("Searched the docs"), { timeout: 15_000 })
  await waitFor(() => expect(thread.textContent).toMatch(/2 sources/i), { timeout: 15_000 })
  // The chat takes its name from the question, and the usage meter counts the turn.
  const chats = within(frame()).getByRole("navigation", { name: "Chats" })
  expect(within(chats).getByRole("button", { name: "Open Explain AbortController" }).getAttribute("aria-current")).toBe("page")
  await waitFor(() => expect(within(frame()).getByRole("meter", { name: "Context used" }).getAttribute("aria-valuetext")).toMatch(/^[1-9].* of 200K tokens$/))
})

test("chat app: the model picker chooses a model, by keyboard or by an agent", async () => {
  const bridge = await open("chat-app")
  const picker = frame().querySelector("uiset-chat-model-picker")!
  const trigger = () => within(frame()).getByRole("combobox", { name: "Model" })
  expect(trigger().textContent).toMatch(/Balanced/)
  // The person opens the list and picks Deep.
  await bridge.run("Model", "setOpen", true)
  screen.getByRole("option", { name: /Deep/ }).click()
  await settle()
  expect(trigger().textContent).toMatch(/Deep/)
  expect(picker.getAttribute("value")).toBe("deep")
  const result = await bridge.run("Model", "setValue", "fast")
  expect(result.ok, result.error?.message).toBe(true)
  expect(trigger().textContent).toMatch(/Fast/)
  expect(picker.getAttribute("value")).toBe("fast")
})

// Last: the page switches screens by the address's hash, and its listener stays on the window.
test("auth: links move between screens, and sign-up checks the password", async () => {
  const bridge = await open("auth")
  ;[...frame().querySelectorAll("a")].find((a) => a.textContent === "Create an account")!.click()
  await waitFor(() => expect(location.hash).toBe("#sign-up"))
  await settle()
  const form = within(frame()).getByRole("form", { name: "Create an account" })
  expect(shown(form)).toBe(true)
  await step(bridge, "Full name", "setValue", "Ada Lovelace")
  await step(bridge, "Work email", "setValue", "ada@example.com")
  await step(bridge, "New password", "setValue", "short")
  expect(within(form).getByRole("meter", { name: "New password strength" }).getAttribute("aria-valuetext")).toBe("Weak")
  await bridge.press("Create account")
  await waitFor(() => expect(within(form).getByText("Use at least 10 characters.")).toBeTruthy())
})
