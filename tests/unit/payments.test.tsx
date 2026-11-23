import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import {
  checkPayment,
  emptyPayment,
  OrderSummary,
  orderTotals,
  PayButton,
  PaymentFields,
  paymentMethodWords,
  type OrderDiscount,
  type OrderLine,
  type PaymentFieldName,
  type PaymentValue,
} from "@/registry/uiset/ui/payments"
import { createBridge, settle } from "./bridge"

const lines: OrderLine[] = [
  { id: "mug", name: "Stoneware mug", detail: "Sand, 350 ml", quantity: 2, price: 18.5 },
  { id: "kettle", name: "Pour-over kettle", detail: "Matte black", quantity: 1, price: 64.99 },
]

test("an order's sums are made in whole cents; a discount stops at the subtotal; yen has no decimals", () => {
  expect(orderTotals(lines)).toEqual({ subtotal: 101.99, discount: 0, shipping: null, tax: null, total: 101.99 })
  expect(orderTotals([{ id: "a", name: "A", quantity: 3, price: 0.1 }]).subtotal).toBe(0.3)
  // 19.99 × 100 is 1998.9999… in floating point: in whole cents, three are $59.97.
  expect(orderTotals([{ id: "a", name: "A", quantity: 3, price: 19.99 }]).total).toBe(59.97)
  expect(orderTotals(lines, { discount: { code: "WELCOME", amount: 10 }, shipping: 4.5, tax: 7.65 }).total).toBe(104.14)
  expect(orderTotals(lines, { discount: { code: "ALL", amount: 500 } }).total).toBe(0)
  expect(orderTotals([{ id: "a", name: "A", quantity: 1, price: 1200 }], { decimals: 0, shipping: 300 }).total).toBe(1500)
})

function Summary() {
  const [items, setItems] = useState(lines)
  const [discount, setDiscount] = useState<OrderDiscount | null>(null)
  return (
    <OrderSummary
      lines={items}
      discount={discount}
      shipping={4.5}
      onQuantityChange={(id, quantity) => setItems((all) => all.map((line) => (line.id === id ? { ...line, quantity } : line)))}
      onApplyCode={(code) => (code.toUpperCase() === "WELCOME" ? (setDiscount({ code: "WELCOME", amount: 10 }), { code: "WELCOME", amount: 10 }) : "That code isn't one we know.")}
      onRemoveCode={() => setDiscount(null)}
    />
  )
}

test("the summary lists each line, takes a discount code or says why not, and adds it all up", async () => {
  render(<Summary />)
  const summary = screen.getByRole("region", { name: "Order summary" })
  expect(within(summary).getAllByRole("listitem").map((item) => item.textContent)).toEqual([expect.stringContaining("Stoneware mug"), expect.stringContaining("Pour-over kettle")])
  expect(within(summary).getByText("$37.00")).toBeTruthy()
  const total = () => summary.querySelector(".order-totals-total dd")!.textContent
  expect(total()).toBe("$106.49")
  expect(within(summary).getByText("Calculated at the next step")).toBeTruthy()
  await userEvent.type(within(summary).getByRole("textbox", { name: "Discount code" }), "SPRING{Enter}")
  expect(await within(summary).findByText("That code isn't one we know.")).toBeTruthy()
  await userEvent.clear(within(summary).getByRole("textbox", { name: "Discount code" }))
  await userEvent.type(within(summary).getByRole("textbox", { name: "Discount code" }), "welcome")
  await userEvent.click(within(summary).getByRole("button", { name: "Apply" }))
  expect(await within(summary).findByText("Discount (WELCOME)")).toBeTruthy()
  expect(total()).toBe("$96.49")
  await userEvent.click(within(summary).getByRole("button", { name: "Remove the code WELCOME" }))
  expect(total()).toBe("$106.49")
  await userEvent.click(within(summary).getAllByRole("button", { name: "Increase" })[0]!)
  expect(total()).toBe("$124.99")
})

function Pay({ errors = {} }: { errors?: Partial<Record<PaymentFieldName, string>> }) {
  const [value, setValue] = useState<PaymentValue>(emptyPayment())
  return (
    <>
      <PaymentFields value={value} onValueChange={setValue} errors={errors} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  )
}

test("a card's fields fill the payment; the code follows the card's brand", async () => {
  render(<Pay />)
  await userEvent.type(screen.getByRole("textbox", { name: "Card number" }), "378282246310005")
  await userEvent.type(screen.getByRole("textbox", { name: "Expiry" }), "1230")
  await userEvent.type(screen.getByRole("textbox", { name: "Security code" }), "1234")
  await userEvent.type(screen.getByRole("textbox", { name: "Name on the card" }), "Ada Lovelace")
  const value = JSON.parse(screen.getByTestId("value").textContent!) as PaymentValue
  expect(value.card).toEqual({ number: "378282246310005", expiry: "12/30", code: "1234", name: "Ada Lovelace" })
  expect(checkPayment(value)).toEqual({})
  expect(checkPayment({ ...value, card: { ...value.card, code: "123" } })).toEqual({ "card.code": "The security code is 4 digits." })
  expect(paymentMethodWords(value)).toBe("the card ending 0005")
})

test("checking a payment says what's missing, and focus goes to the first problem", async () => {
  const problems = checkPayment(emptyPayment())
  expect(problems).toEqual({
    "card.number": "Card number is required.",
    "card.expiry": "Expiry is required.",
    "card.code": "Security code is required.",
    "card.name": "Name on the card is required.",
  })
  render(<Pay errors={problems} />)
  await settle()
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Card number" }))
  expect(screen.getByText("Card number is required.")).toBeTruthy()
})

test("a bank account asks for the holder and an IBAN, with the mandate's words", async () => {
  render(<Pay />)
  await userEvent.click(screen.getByRole("radio", { name: /Bank account/ }))
  expect(screen.getByText(/you let us debit this account/)).toBeTruthy()
  await userEvent.type(screen.getByRole("textbox", { name: "IBAN" }), "DE89370400440532013000")
  const value = JSON.parse(screen.getByTestId("value").textContent!) as PaymentValue
  expect(value.method).toBe("bank")
  expect(checkPayment(value)).toEqual({ "bank.name": "Account holder is required." })
  expect(paymentMethodWords(value)).toBe("the account ending 3000")
})

test("Pay says the amount, is busy while it pays, and an agent's press waits for a person", async () => {
  const onPay = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 30)))
  render(<PayButton amount={106.49} method="the card ending 4242" onPay={onPay} />)
  const pay = screen.getByRole("button", { name: "Pay $106.49" })
  expect(pay.getAttribute("data-agent-confirm")).toBe("Pays $106.49 with the card ending 4242")
  const bridge = createBridge()
  await settle()
  expect((await bridge.pressUnattended("Pay $106.49")).ok).toBe(false)
  expect(onPay).not.toHaveBeenCalled()
  await userEvent.click(pay)
  expect(screen.getByRole("button", { name: "Paying…" })).toBeTruthy()
  await settle(60)
  expect(onPay).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Pay $106.49" })).toBeTruthy()
})
