// The Payments kit's web page: how to pay beside the order it pays for.
import { toast } from "@ui-sdk/web"
import "./uiset"
import type { UISetOrderSummary, UISetPayButton, UISetPaymentFields } from "./payments"

const order = document.getElementById("order") as UISetOrderSummary
const payment = document.getElementById("payment") as UISetPaymentFields
const pay = document.getElementById("pay") as UISetPayButton

order.lines = [
  { id: "mug", name: "Stoneware mug", detail: "Sand, 350 ml", quantity: 2, price: 18.5 },
  { id: "kettle", name: "Pour-over kettle", detail: "Matte black, 1 l", quantity: 1, price: 64.99 },
  { id: "beans", name: "Single-origin beans", detail: "Whole, 250 g", quantity: 1, price: 14 },
]
order.applyCode = (code) => (code.toUpperCase() === "WELCOME10" ? { code: "WELCOME10", amount: 10 } : "That code isn't one we know. Try WELCOME10.")

const sync = () => {
  pay.amount = order.total
  const { method, card, bank } = payment.value
  const last4 = method === "card" ? card.number.slice(-4) : bank.iban.slice(-4)
  pay.setAttribute("method", last4.length === 4 ? `the ${method === "card" ? "card" : "account"} ending ${last4}` : "the payment method chosen")
}
sync()
order.addEventListener("quantitychange", sync)
order.addEventListener("discountchange", sync)
payment.addEventListener("valuechange", sync)
pay.addEventListener("pay", (event) => {
  if (!payment.check()) return
  event.detail.wait(new Promise((resolve) => setTimeout(resolve, 600)).then(() => toast("Paid. A receipt is on its way.")))
})
