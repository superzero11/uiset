// The Invoice page as web elements: who it's from and to (each address as its country writes
// it), its dates and status, the lines and sums, how to pay by bank transfer with the IBAN and
// reference to copy, and notes. The invoice and its rules are the React template's
// (templates/invoice-sample.ts, templates/invoice-model.ts).
import { createAgent } from "@ui-sdk/web/agent"
import { addressLines } from "@/registry/uiset/ui/address/address"
import { iban } from "@/registry/uiset/ui/input-mask/masks"
import { moneyFormat, orderTotals } from "@/registry/uiset/ui/payments/order"
import { invoiceDate, invoiceStatus, invoiceTotals, type InvoiceParty } from "@/registry/uiset/ui/templates/invoice-model"
import { sampleInvoice } from "@/registry/uiset/ui/templates/invoice-sample"
import { h } from "../dom"
import "./common"

const locale = "en-IE"
const now = new Date()
const invoice = sampleInvoice(now)
const money = moneyFormat(invoice.currency, locale)
const totals = invoiceTotals(invoice, locale)
const status = invoiceStatus(invoice, now, locale)
const open = !invoice.paidOn
const ibanMask = iban()

/** A description list as React's DescriptionList draws it. */
const terms = (items: [string, Node | string][]) =>
  h("dl", { class: "description-list", "data-layout": "columns" }, ...items.map(([term, details]) => h("div", { class: "description-item" }, h("dt", null, term), h("dd", null, details))))

const party = (id: string, title: string, who: InvoiceParty) =>
  h(
    "section",
    { class: "invoice-party", "aria-labelledby": id },
    h("h2", { id, class: "invoice-section-title" }, title),
    h("address", null, ...addressLines(who.address, { locale }).map((line) => h("span", null, line))),
    ...(who.email ? [h("a", { href: `mailto:${who.email}` }, who.email)] : []),
    ...(who.taxId ? [h("p", { class: "invoice-muted" }, who.taxId)] : []),
  )

const copy = (value: string, name: string) => h("uiset-copy-button", { value, "full-label": name })
const row = (label: string, amount: string, className?: string) =>
  h("tr", className ? { class: className } : null, h("th", { scope: "row", colspan: "3" }, label), h("td", { "data-align": "end" }, amount))

const print = h("button", { type: "button", "data-variant": "outline", "aria-label": `Print invoice ${invoice.number}` }, "Print")
print.addEventListener("click", () => window.print())

document.getElementById("invoice")!.replaceChildren(
  h(
    "header",
    { class: "invoice-head" },
    h(
      "div",
      { class: "invoice-heading" },
      h("p", { class: "invoice-seller" }, invoice.from.address.name),
      h("h1", { class: "invoice-title" }, `Invoice ${invoice.number}`),
      h("span", { class: "badge", "data-tone": status.tone }, status.text),
    ),
    h("div", { class: "invoice-actions" }, h("ui-button", null, print)),
  ),
  terms([
    ["Issued", invoiceDate(invoice.issued, locale)],
    ["Due", invoiceDate(invoice.due, locale)],
    [open ? "Amount due" : "Amount paid", h("strong", null, money.format(totals.total))],
  ]),
  h("div", { class: "invoice-parties" }, party("invoice-from", "From", invoice.from), party("invoice-to", "Bill to", invoice.to)),
  h(
    "uiset-table",
    { label: "Items", stack: "", class: "invoice-lines" },
    h(
      "table",
      { class: "table" },
      h("thead", null, h("tr", null, h("th", { scope: "col" }, "Item"), ...["Quantity", "Unit price", "Amount"].map((label) => h("th", { scope: "col", "data-align": "end" }, label)))),
      h(
        "tbody",
        null,
        ...invoice.lines.map((line) =>
          h(
            "tr",
            null,
            h("td", null, h("span", { class: "invoice-item" }, line.name), ...(line.detail ? [h("span", { class: "invoice-muted" }, line.detail)] : [])),
            h("td", { "data-align": "end" }, String(line.quantity)),
            h("td", { "data-align": "end" }, money.format(line.price)),
            h("td", { "data-align": "end" }, money.format(orderTotals([line], { decimals: money.decimals }).subtotal)),
          ),
        ),
      ),
      h(
        "tfoot",
        null,
        row("Subtotal", money.format(totals.subtotal)),
        ...(invoice.discount && totals.discount > 0 ? [row(`Discount (${invoice.discount.code})`, `−${money.format(totals.discount)}`)] : []),
        ...(invoice.tax && totals.tax !== null
          ? [row(`${invoice.tax.label} (${new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(invoice.tax.rate)})`, money.format(totals.tax))]
          : []),
        row("Total", money.format(totals.total), "invoice-total"),
      ),
    ),
  ),
  ...(open && invoice.bank
    ? [
        h(
          "section",
          { class: "invoice-pay", "aria-labelledby": "invoice-pay-title" },
          h("h2", { id: "invoice-pay-title", class: "invoice-section-title" }, "How to pay"),
          h("p", { class: "invoice-muted" }, "By bank transfer, with the invoice number as the reference."),
          terms([
            ["Account holder", invoice.bank.holder],
            ["IBAN", h("span", { class: "invoice-copy" }, h("span", { translate: "no" }, ibanMask.format(ibanMask.keep(invoice.bank.iban))), copy(ibanMask.keep(invoice.bank.iban), "Copy the IBAN"))],
            ...(invoice.bank.bic ? [["BIC", h("span", { translate: "no" }, invoice.bank.bic)] as [string, Node]] : []),
            ["Reference", h("span", { class: "invoice-copy" }, h("span", { translate: "no" }, invoice.number), copy(invoice.number, "Copy the reference"))],
          ]),
        ),
      ]
    : []),
  ...(invoice.notes
    ? [h("section", { class: "invoice-notes", "aria-labelledby": "invoice-notes-title" }, h("h2", { id: "invoice-notes-title", class: "invoice-section-title" }, "Notes"), h("p", null, invoice.notes))]
    : []),
)

// The page's agent bridge, for UISet's agent-readiness check and for agents on the page.
Object.assign(window, { agent: createAgent() })
