// The Checkout page as web elements: contact, a delivery address that follows its country,
// delivery options as radio cards, payment with a billing address when it differs, and the
// order with Pay beside it. Pay checks the whole page and focuses the first problem. The
// order and the pretend payment are the React template's (templates/checkout-sample.ts).
import "@ui-sdk/web/checkbox"
import "@ui-sdk/web/radio"
import type { UiChangeEvent } from "@ui-sdk/web"
import { createAgent } from "@ui-sdk/web/agent"
import { countryName } from "@/registry/uiset/ui/address/address"
import { orderTotals } from "@/registry/uiset/ui/payments/order"
import { sampleApplyCode, sampleDelivery, sampleLines, samplePlaceOrder, sampleTax } from "@/registry/uiset/ui/templates/checkout-sample"
import { h } from "../dom"
import type { UISetAddressFields, UISetOrderSummary, UISetPayButton, UISetPaymentFields } from "../uiset"
import { alertElement } from "./common"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const page = document.getElementById("checkout")!
const form = document.getElementById("form") as HTMLFormElement
const email = document.getElementById("email") as HTMLInputElement
const emailField = document.getElementById("email-field") as HTMLElement & { invalid?: boolean }
const phone = document.getElementById("phone") as HTMLElement & { value: string }
const delivery = document.getElementById("delivery") as UISetAddressFields
const options = document.getElementById("options") as HTMLElement & { value: string | null }
const payment = document.getElementById("payment") as UISetPaymentFields
const same = document.getElementById("same") as HTMLElement & { checked: boolean }
const order = document.getElementById("order") as UISetOrderSummary
const refused = document.getElementById("refused")!
const pay = document.getElementById("pay") as UISetPayButton

// The billing address shows only when it isn't the delivery address; kept, with what was typed.
const billing = h("uiset-address-fields", { label: "Billing address", section: "billing", "default-country": "US", locale: "en-US" }) as UISetAddressFields
same.addEventListener("checkedchange", ((event: UiChangeEvent<boolean>) => {
  if (event.detail.value) billing.remove()
  else same.closest("ui-field")!.after(billing)
}) as EventListener)

options.replaceChildren(
  ...sampleDelivery.map((option) =>
    h(
      "ui-field",
      { class: "uiset-radio-card" },
      h("ui-radio", { value: option.id }, h("ui-radio-indicator")),
      h("span", { class: "uiset-radio-card-text" }, h("ui-field-label", null, option.label), h("ui-field-description", null, option.description)),
      h("span", { class: "uiset-radio-card-aside" }, money.format(option.price)),
    ),
  ),
)
options.setAttribute("default-value", sampleDelivery[0]!.id)

const chosen = () => sampleDelivery.find((option) => option.id === options.value) ?? sampleDelivery[0]!
const taxedAddress = () => (same.checked ? delivery.value : billing.value)

order.lines = sampleLines.map((line) => ({ ...line }))
order.messages = { taxLater: "Calculated from your address" }
order.applyCode = sampleApplyCode

/** The sums again: delivery's price, the tax for the address, and Pay's amount and method. */
function sync() {
  order.setAttribute("shipping", String(chosen().price))
  const goods = orderTotals(order.lines, { discount: order.discount }).total
  const tax = taxedAddress() ? sampleTax(taxedAddress(), goods) : null
  if (tax === null) order.removeAttribute("tax")
  else order.setAttribute("tax", String(tax))
  pay.amount = order.total
  const { method, card, bank } = payment.value
  const last4 = method === "card" ? card.number.slice(-4) : bank.iban.slice(-4)
  pay.setAttribute("method", last4.length === 4 ? `the ${method === "card" ? "card" : "account"} ending ${last4}` : method === "card" ? "card" : method)
}
sync()
for (const [el, type] of [[order, "quantitychange"], [order, "discountchange"], [options, "valuechange"], [payment, "valuechange"], [delivery, "valuechange"], [billing, "valuechange"], [same, "checkedchange"]] as const) {
  el.addEventListener(type, () => queueMicrotask(sync))
}

function showEmail(problem: string | null) {
  emailField.invalid = problem ? true : undefined
  emailField.querySelector("ui-field-error")?.remove()
  // An empty <ui-field-error> fills itself, so it goes in with its text.
  if (problem) emailField.append(h("ui-field-error", { match: "true" }, problem))
}
email.addEventListener("input", () => showEmail(null))

/** Every part shows its problems; focus goes to the first on the page. True when it can pay. */
function check() {
  const text = email.value.trim()
  showEmail(!text ? "Email is required." : emailShape.test(text) ? null : "Enter an email address, like name@example.com.")
  const parts = [delivery.check(), payment.check(), same.checked || billing.check()]
  const whole = !emailField.invalid && parts.every(Boolean)
  if (!whole) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  return whole
}

pay.addEventListener("pay", (event) => {
  refused.replaceChildren()
  if (!check()) return
  const placed = { email: email.value.trim(), phone: phone.value, delivery: delivery.value, deliveryOption: chosen(), payment: payment.value, billing: same.checked ? null : billing.value, lines: order.lines, discount: order.discount, total: order.total }
  event.detail.wait(
    samplePlaceOrder(placed).then((result) => {
      if (typeof result === "string" && result) {
        refused.replaceChildren(alertElement("danger", result, { urgent: true }))
        return
      }
      const title = h("h1", { id: "checkout-done-title", class: "checkout-title", tabindex: "-1" }, "Order placed")
      page.replaceChildren(
        h(
          "section",
          { class: "checkout-done", "aria-labelledby": "checkout-done-title" },
          title,
          h("p", null, `Thanks, ${placed.delivery.name.split(" ")[0]}. A receipt for ${money.format(placed.total)} is on its way to ${placed.email}.`),
          h("p", null, `${placed.deliveryOption.label} delivery, ${placed.deliveryOption.description}, to ${placed.delivery.line1}, ${placed.delivery.city || placed.delivery.region}, ${countryName(placed.delivery.country, "en-US")}.`),
        ),
      )
      title.focus()
    }),
  )
})

// The page's agent bridge, for UISet's agent-readiness check and for agents on the page.
Object.assign(window, { agent: createAgent() })
