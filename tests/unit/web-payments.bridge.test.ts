import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/button"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/number-input"
import "@ui-sdk/web/radio"
import "@ui-sdk/web/toast"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Payments kit as web elements (web/payments.html), with no React: the order's sums and
// its discount code, the payment's fields and check, and Pay waiting for a person.

type Summary = HTMLElement & { total: number }
type Payment = HTMLElement & { value: { method: string; card: Record<string, string>; bank: Record<string, string> }; check(): boolean }

const summary = () => screen.getByRole("region", { name: "Order summary" })
const order = () => document.getElementById("order") as Summary
const payment = () => document.getElementById("payment") as Payment
const total = () => summary().querySelector(".order-totals-total dd")!.textContent
const open = () => openWebPage("payments.html", "payments-demo.ts")

beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("the order lists its lines and adds them up; a stepper changes a line and the sums", async () => {
  await open()
  expect(within(summary()).getAllByRole("listitem")).toHaveLength(3)
  expect(total()).toBe("$121.99")
  expect(order().total).toBe(121.99)
  await userEvent.click(within(summary()).getAllByRole("button", { name: "Increase" })[0]!)
  await settle()
  expect(total()).toBe("$140.49")
  expect(screen.getByRole("button", { name: "Pay $140.49" })).toBeTruthy()
})

test("a discount code is refused with the reason, or applied and taken off", async () => {
  await open()
  const code = () => within(summary()).getByRole("textbox", { name: "Discount code" })
  // Nothing to apply until there's a code, as in React.
  expect((within(summary()).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true)
  await userEvent.type(code(), "SPRING{Enter}")
  await settle()
  expect(within(summary()).getByText("That code isn't one we know. Try WELCOME10.")).toBeTruthy()
  await userEvent.clear(code())
  await userEvent.type(code(), "welcome10")
  await userEvent.click(within(summary()).getByRole("button", { name: "Apply" }))
  await settle()
  expect(within(summary()).getByText("Discount (WELCOME10)")).toBeTruthy()
  expect(total()).toBe("$111.99")
  await userEvent.click(within(summary()).getByRole("button", { name: "Remove the code WELCOME10" }))
  await settle()
  expect(total()).toBe("$121.99")
})

test("the card's fields fill the payment, and check() shows what's missing with focus on the first", async () => {
  await open()
  expect(payment().check()).toBe(false)
  await settle()
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Card number" }))
  expect(screen.getByText("Card number is required.")).toBeTruthy()
  await userEvent.type(screen.getByRole("textbox", { name: "Card number" }), "4242424242424242")
  await userEvent.type(screen.getByRole("textbox", { name: "Expiry" }), "1230")
  await userEvent.type(screen.getByRole("textbox", { name: "Security code" }), "123")
  await userEvent.type(screen.getByRole("textbox", { name: "Name on the card" }), "Ada Lovelace")
  await settle()
  expect(payment().value.card).toEqual({ number: "4242424242424242", expiry: "12/30", code: "123", name: "Ada Lovelace" })
  expect(payment().check()).toBe(true)
  expect(screen.getByRole("button", { name: "Pay $121.99" }).getAttribute("data-agent-confirm")).toBe("Pays $121.99 with the card ending 4242")
})

test("an American Express code takes four digits", async () => {
  await open()
  await userEvent.type(screen.getByRole("textbox", { name: "Card number" }), "378282246310005")
  await settle()
  await userEvent.type(screen.getByRole("textbox", { name: "Security code" }), "1234")
  await settle()
  expect(payment().value.card.code).toBe("1234")
})

test("a bank account asks for the holder and an IBAN, with the mandate", async () => {
  await open()
  await userEvent.click(screen.getByRole("radio", { name: /Bank account/ }))
  await settle()
  expect(payment().value.method).toBe("bank")
  expect(screen.getByText(/you let us debit this account/)).toBeTruthy()
  await userEvent.type(screen.getByRole("textbox", { name: "IBAN" }), "DE89370400440532013000")
  await settle()
  expect(payment().check()).toBe(false)
  expect(screen.getByText("Account holder is required.")).toBeTruthy()
})

test("Pay waits for a person when an agent presses it; a person's press pays once the payment checks", async () => {
  const bridge = await open()
  expect((await bridge.pressUnattended("Pay $121.99")).ok).toBe(false)
  await userEvent.type(screen.getByRole("textbox", { name: "Card number" }), "4242424242424242")
  await userEvent.type(screen.getByRole("textbox", { name: "Expiry" }), "1230")
  await userEvent.type(screen.getByRole("textbox", { name: "Security code" }), "123")
  await userEvent.type(screen.getByRole("textbox", { name: "Name on the card" }), "Ada Lovelace")
  await settle()
  await userEvent.click(screen.getByRole("button", { name: "Pay $121.99" }))
  expect(screen.getByRole("button", { name: "Paying…" })).toBeTruthy()
  await waitFor(() => expect(screen.getByRole("button", { name: "Pay $121.99" })).toBeTruthy(), { timeout: 2000 })
})
