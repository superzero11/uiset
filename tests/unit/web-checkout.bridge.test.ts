import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, expect, test } from "vitest"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The checkout page as web elements (web/templates/checkout.html), driven through the web
// agent bridge: Pay checks the whole page, an agent fills it and a person pays, a billing
// address of its own, and a declined card.

const open = () => openWebPage("templates/checkout.html", "templates/checkout.ts")
type Bridge = Awaited<ReturnType<typeof open>>

beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

const ok = async (result: Promise<{ ok: boolean; error?: { message: string } }>) => {
  const done = await result
  expect(done.ok, done.error?.message).toBe(true)
}
const payButton = () => screen.getByRole("button", { name: /^Pay / })
/**
 * A step by name, as an agent writes it: the bridge takes the one component of that name that
 * can do it, as a field showing a problem shares its input's name.
 */
const byName = (bridge: Bridge, label: string, action: string, ...args: unknown[]) => ok(bridge.agent.act({ steps: [{ ref: label, action, args }] }))

async function fillAsAgent(bridge: Bridge, card = "4242424242424242") {
  await ok(bridge.run("Email", "setValue", "ada@example.com"))
  await ok(bridge.run("Delivery address", "fill", { country: "United States", name: "Ada Lovelace", address: "1 Main St", city: "San Francisco", state: "California", "ZIP code": "94110" }))
  await ok(bridge.run("Delivery option", "setValue", "express"))
  await ok(bridge.run("Card number", "setValue", card))
  await ok(bridge.run("Expiry", "setValue", "12/30"))
  await ok(bridge.run("Security code", "setValue", "123"))
  await ok(bridge.run("Name on the card", "setValue", "Ada Lovelace"))
  await settle()
}

test("Pay with nothing filled shows every problem under its field, and focus goes to the first: Email", async () => {
  await open()
  await userEvent.click(payButton())
  await settle()
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Email" }))
  for (const problem of ["Email is required.", "Full name is required.", "ZIP code is required.", "Card number is required."]) expect(screen.getByText(problem)).toBeTruthy()
  await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "ada@")
  expect(screen.queryByText("Email is required.")).toBeNull()
}, 20_000)

test("an agent fills the page, the address in one step; its press on Pay waits for a person, whose press places the order", async () => {
  const bridge = await open()
  await fillAsAgent(bridge)
  // An email that isn't one stops the order on its own.
  await ok(bridge.run("Email", "setValue", "ada@example"))
  await userEvent.click(payButton())
  expect(await screen.findByText("Enter an email address, like name@example.com.")).toBeTruthy()
  await settle(800)
  expect(screen.queryByRole("heading", { name: "Order placed" })).toBeNull()
  await byName(bridge, "Email", "setValue", "ada@example.com")
  await settle()
  const pay = screen.getByRole("button", { name: "Pay $139.27" })
  expect(pay.getAttribute("data-agent-confirm")).toBe("Pays $139.27 with the card ending 4242")
  expect((await bridge.pressUnattended("Pay $139.27")).ok).toBe(false)
  expect(screen.queryByRole("heading", { name: "Order placed" })).toBeNull()
  await userEvent.click(pay)
  const placed = await screen.findByRole("heading", { name: "Order placed" }, { timeout: 3000 })
  await waitFor(() => expect(document.activeElement).toBe(placed))
  expect(placed.closest("section")!.textContent).toContain("Express delivery, 1 to 2 business days, to 1 Main St, San Francisco, United States.")
}, 20_000)

test("unticked, the billing box asks for a billing address an agent fills by its own name; a declined card says why", async () => {
  const bridge = await open()
  expect(bridge.find("Billing address")).toBeUndefined()
  await userEvent.click(screen.getByRole("checkbox", { name: "Billing address is the same as delivery" }))
  await settle()
  expect(bridge.entry("Billing address")).toBeTruthy()
  await fillAsAgent(bridge, "4000000000000002")
  await userEvent.click(payButton())
  await settle()
  const billing = screen.getByRole("group", { name: "Billing address" })
  expect(document.activeElement).toBe(within(billing).getByRole("textbox", { name: "Full name" }))
  await ok(bridge.run("Billing address", "fill", { country: "Canada", name: "Ada Lovelace", address: "100 King St W", city: "Toronto", province: "Ontario", "postal code": "M5X 1A9" }))
  await userEvent.click(payButton())
  expect(await screen.findByText("Your bank declined the card ending 0002. Try another card.", undefined, { timeout: 3000 })).toBeTruthy()
  expect(screen.queryByRole("heading", { name: "Order placed" })).toBeNull()
}, 20_000)
