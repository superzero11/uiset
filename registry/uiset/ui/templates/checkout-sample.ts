// The checkout template's sample data, framework-free so the web page shows the same order:
// a made-up shop's goods, its delivery options, a discount code, a made-up tax estimate, and
// a pretend payment. Replace each with yours.
import type { AddressValue } from "../address/address"
import type { OrderDiscount, OrderLine } from "../payments/order"

type DeliveryOption = {
  id: string
  label: string
  /** When it arrives, in words. */
  description: string
  price: number
}

const sampleLines: OrderLine[] = [
  { id: "mug", name: "Stoneware mug", detail: "Sand, 350 ml", quantity: 2, price: 18.5 },
  { id: "kettle", name: "Pour-over kettle", detail: "Matte black, 1 l", quantity: 1, price: 64.99 },
  { id: "beans", name: "Single-origin beans", detail: "Whole, 250 g", quantity: 1, price: 14 },
]

const sampleDelivery: DeliveryOption[] = [
  { id: "standard", label: "Standard", description: "3 to 5 business days", price: 5 },
  { id: "express", label: "Express", description: "1 to 2 business days", price: 14 },
]

/** Applies a code: the discount, or why it's refused. */
const sampleApplyCode = (code: string): OrderDiscount | string =>
  code.trim().toUpperCase() === "WELCOME10" ? { code: "WELCOME10", amount: 10 } : "That code isn't one we know. Try WELCOME10."

/** A made-up 8% on the goods once there's a postal code to tax by; until then, "Calculated at the next step". */
const sampleTax = (address: AddressValue, goods: number): number | null =>
  address.postalCode.trim() ? Math.round(goods * 8) / 100 : null

/** Pretends to charge: the test card ending 0002 is declined, as a payment provider's is. */
async function samplePlaceOrder(order: { payment: { method: string; card: { number: string } } }): Promise<string | void> {
  await new Promise((resolve) => setTimeout(resolve, 700))
  if (order.payment.method === "card" && order.payment.card.number.endsWith("0002")) {
    return "Your bank declined the card ending 0002. Try another card."
  }
}

export { sampleApplyCode, sampleDelivery, sampleLines, samplePlaceOrder, sampleTax }
export type { DeliveryOption }
