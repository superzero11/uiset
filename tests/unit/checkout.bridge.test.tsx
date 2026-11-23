import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test } from "vitest"
import { CheckoutTemplate } from "@/registry/uiset/ui/templates/checkout"
import { UISet } from "@/registry/uiset/ui/uiset"
import { createBridge, settle } from "./bridge"

// The checkout template as its page shows it, driven through the agent bridge by the names
// people see: Pay checks the whole page, an agent fills it (the address in one step) and a
// person pays, a billing address of its own, and a declined card.

const bridge = createBridge()
afterEach(() => cleanup())

async function open() {
  render(
    <UISet>
      <CheckoutTemplate contentElement="div" />
    </UISet>,
  )
  await settle()
}

const ok = async (result: Promise<{ ok: boolean; error?: { message: string } }>) => {
  const done = await result
  expect(done.ok, done.error?.message).toBe(true)
}

async function fillAsAgent(card = "4242424242424242") {
  await ok(bridge.run("Email", "setValue", "ada@example.com"))
  await ok(bridge.run("Delivery address", "fill", { country: "United States", name: "Ada Lovelace", address: "1 Main St", city: "San Francisco", state: "California", "ZIP code": "94110" }))
  await ok(bridge.run("Delivery option", "setValue", "express"))
  await ok(bridge.run("Card number", "setValue", card))
  await ok(bridge.run("Expiry", "setValue", "12/30"))
  await ok(bridge.run("Security code", "setValue", "123"))
  await ok(bridge.run("Name on the card", "setValue", "Ada Lovelace"))
}

test("Pay with nothing filled shows every problem under its field, and focus goes to the first: Email", async () => {
  await open()
  await userEvent.click(screen.getByRole("button", { name: /^Pay / }))
  await settle()
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Email" }))
  for (const problem of ["Email is required.", "Full name is required.", "ZIP code is required.", "Card number is required."]) expect(screen.getByText(problem)).toBeTruthy()
  // A field's edit drops its own problem, and only that one.
  await userEvent.type(screen.getByRole("textbox", { name: "Full name" }), "Ada")
  expect(screen.queryByText("Full name is required.")).toBeNull()
  expect(screen.getByText("ZIP code is required.")).toBeTruthy()
}, 20_000)

test("an agent fills the page, the address in one step; its press on Pay waits for a person, whose press places the order", async () => {
  await open()
  await fillAsAgent()
  // An email that isn't one stops the order on its own.
  await ok(bridge.run("Email", "setValue", "ada@example"))
  await userEvent.click(screen.getByRole("button", { name: /^Pay / }))
  expect(await screen.findByText("Enter an email address, like name@example.com.")).toBeTruthy()
  await settle(800)
  expect(screen.queryByRole("heading", { name: "Order placed" })).toBeNull()
  await ok(bridge.run("Email", "setValue", "ada@example.com"))
  // $115.99, express at $14 and a made-up 8% on the goods once there's a ZIP code.
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
  await open()
  expect(bridge.find("Billing address")).toBeUndefined()
  await userEvent.click(screen.getByRole("checkbox", { name: "Billing address is the same as delivery" }))
  await settle()
  expect(bridge.entry("Billing address")).toBeTruthy()
  await fillAsAgent("4000000000000002")
  await userEvent.click(screen.getByRole("button", { name: /^Pay / }))
  await settle()
  // The billing address is checked too: its problems show, focus on its first.
  const billing = screen.getByRole("group", { name: "Billing address" })
  expect(document.activeElement).toBe(within(billing).getByRole("textbox", { name: "Full name" }))
  await ok(bridge.run("Billing address", "fill", { country: "Canada", name: "Ada Lovelace", address: "100 King St W", city: "Toronto", province: "Ontario", "postal code": "M5X 1A9" }))
  await userEvent.click(screen.getByRole("button", { name: /^Pay / }))
  expect(await screen.findByText("Your bank declined the card ending 0002. Try another card.", undefined, { timeout: 3000 })).toBeTruthy()
  expect(screen.queryByRole("heading", { name: "Order placed" })).toBeNull()
}, 20_000)
