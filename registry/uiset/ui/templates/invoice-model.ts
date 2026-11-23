// What an invoice is, its sums and the status it shows, shared by the React template and the
// web page. Amounts are in the currency's main unit; sums are made in whole minor units.
import type { AddressValue } from "../address/address"
import { moneyFormat, orderTotals, type OrderDiscount, type OrderLine } from "../payments/order"

type InvoiceParty = {
  address: AddressValue
  email?: string
  /** A VAT or tax number, shown under the address. */
  taxId?: string
}

type Invoice = {
  number: string
  /** ISO dates, like "2026-11-12". */
  issued: string
  due: string
  /** When it was paid, or null while it's open. */
  paidOn: string | null
  currency: string
  from: InvoiceParty
  to: InvoiceParty
  lines: OrderLine[]
  discount?: OrderDiscount | null
  /** The tax on the lines after any discount, like VAT at 23%. */
  tax?: { label: string; rate: number } | null
  /** How to pay by bank transfer. */
  bank?: { holder: string; iban: string; bic?: string } | null
  notes?: string
}

/** The invoice's sums: the tax is the rate on the lines after the discount, in whole cents. */
function invoiceTotals(invoice: Invoice, locale?: string) {
  const { decimals } = moneyFormat(invoice.currency, locale)
  const goods = orderTotals(invoice.lines, { discount: invoice.discount, decimals }).total
  const unit = 10 ** decimals
  const tax = invoice.tax ? Math.round(goods * invoice.tax.rate * unit) / unit : null
  return orderTotals(invoice.lines, { discount: invoice.discount, tax, decimals })
}

const DAY = 24 * 60 * 60 * 1000
const dayOf = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))

/** A date as people read it: "12 Nov 2026" or "Nov 12, 2026", by `locale`. */
const invoiceDate = (iso: string, locale?: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(dayOf(iso)))

type InvoiceStatus = { tone: "success" | "info" | "warning" | "danger"; text: string }

/** Paid, due in so many days, due today, or overdue, as of `now`. */
function invoiceStatus(invoice: Invoice, now: Date, locale?: string): InvoiceStatus {
  if (invoice.paidOn) return { tone: "success", text: `Paid on ${invoiceDate(invoice.paidOn, locale)}` }
  const days = Math.round((dayOf(invoice.due) - dayOf(now.toISOString())) / DAY)
  if (days > 1) return { tone: "info", text: `Due in ${days} days` }
  if (days === 1) return { tone: "info", text: "Due tomorrow" }
  if (days === 0) return { tone: "warning", text: "Due today" }
  return { tone: "danger", text: `Overdue by ${-days} day${days === -1 ? "" : "s"}` }
}

export { invoiceDate, invoiceStatus, invoiceTotals }
export type { Invoice, InvoiceParty, InvoiceStatus }
