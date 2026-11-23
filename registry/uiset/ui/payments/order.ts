// An order's sums and the words a checkout says about money, shared by React and Web
// Components. Amounts are in the currency's main unit (12.5 is $12.50); sums are made in
// whole minor units so they don't drift.

type OrderLine = {
  id: string
  name: string
  /** A line under the name, like a size or a colour. */
  detail?: string
  quantity: number
  /** One item's price. */
  price: number
  /** An image's address, shown beside the line. */
  image?: string
}

type OrderDiscount = { code: string; amount: number }

type OrderTotals = {
  subtotal: number
  discount: number
  /** Null while it isn't known yet: "Calculated at the next step". */
  shipping: number | null
  tax: number | null
  total: number
}

const cents = (amount: number, decimals: number) => Math.round(amount * 10 ** decimals)

/** The order's sums. `decimals` is the currency's (2 for USD, 0 for JPY). */
function orderTotals(
  lines: readonly OrderLine[],
  { discount, shipping = null, tax = null, decimals = 2 }: { discount?: OrderDiscount | null; shipping?: number | null; tax?: number | null; decimals?: number } = {},
): OrderTotals {
  const unit = 10 ** decimals
  const subtotal = lines.reduce((sum, line) => sum + cents(line.price, decimals) * line.quantity, 0)
  const off = Math.min(subtotal, discount ? cents(discount.amount, decimals) : 0)
  const total = subtotal - off + (shipping === null ? 0 : cents(shipping, decimals)) + (tax === null ? 0 : cents(tax, decimals))
  return { subtotal: subtotal / unit, discount: off / unit, shipping, tax, total: total / unit }
}

/** Money in a locale and currency: "$1,234.50", "1.234,50 €". */
function moneyFormat(currency: string, locale?: string) {
  const format = new Intl.NumberFormat(locale, { style: "currency", currency })
  return { format: (amount: number) => format.format(amount), decimals: format.resolvedOptions().maximumFractionDigits ?? 2 }
}

/** The words a checkout says, for other languages. */
type PaymentMessages = {
  summary: string
  subtotal: string
  discount: (code: string) => string
  shipping: string
  shippingLater: string
  tax: string
  taxLater: string
  total: string
  quantity: (name: string) => string
  quantityShort: (quantity: number) => string
  discountCode: string
  apply: string
  removeCode: (code: string) => string
  pay: (amount: string) => string
  paying: string
  /** What an agent's press on Pay asks the person: "Pays $12.50 with the card ending 4242". */
  confirmPay: (amount: string, method: string) => string
  method: string
  card: string
  cardAbout: string
  bank: string
  bankAbout: string
  cardNumber: string
  expiry: string
  code: string
  nameOnCard: string
  accountHolder: string
  iban: string
  mandate: string
  required: (label: string) => string
  cardEnding: (last4: string) => string
  bankEnding: (last4: string) => string
}

const paymentMessages: PaymentMessages = {
  summary: "Order summary",
  subtotal: "Subtotal",
  discount: (code) => `Discount (${code})`,
  shipping: "Shipping",
  shippingLater: "Calculated at the next step",
  tax: "Tax",
  taxLater: "Calculated at the next step",
  total: "Total",
  quantity: (name) => `Quantity of ${name}`,
  quantityShort: (quantity) => `Qty ${quantity}`,
  discountCode: "Discount code",
  apply: "Apply",
  removeCode: (code) => `Remove the code ${code}`,
  pay: (amount) => `Pay ${amount}`,
  paying: "Paying…",
  confirmPay: (amount, method) => `Pays ${amount} with ${method}`,
  method: "Payment method",
  card: "Card",
  cardAbout: "Visa, Mastercard, American Express and more",
  bank: "Bank account",
  bankAbout: "SEPA direct debit, from an IBAN",
  cardNumber: "Card number",
  expiry: "Expiry",
  code: "Security code",
  nameOnCard: "Name on the card",
  accountHolder: "Account holder",
  iban: "IBAN",
  mandate: "By giving your IBAN you let us debit this account for this order, and your bank to pay it. You can ask your bank for a refund within 8 weeks of the debit.",
  required: (label) => `${label} is required.`,
  cardEnding: (last4) => `the card ending ${last4}`,
  bankEnding: (last4) => `the account ending ${last4}`,
}

export { moneyFormat, orderTotals, paymentMessages }
export type { OrderDiscount, OrderLine, OrderTotals, PaymentMessages }
