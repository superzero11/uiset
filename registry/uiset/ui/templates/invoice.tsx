"use client"

import { addressLines } from "../address/address"
import { Badge } from "../badge"
import { Button } from "../button"
import { CopyButton } from "../copy-button"
import { DescriptionList } from "../description-list"
import { iban } from "../input-mask/masks"
import { moneyFormat, orderTotals } from "../payments/order"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "../table"
import { invoiceDate, invoiceStatus, invoiceTotals, type Invoice, type InvoiceParty } from "./invoice-model"
import { sampleInvoice } from "./invoice-sample"
import "./templates.css"

// An invoice: who it's from and to (each address as its country writes it), its dates and
// status, the lines and sums in its currency, how to pay by bank transfer with the IBAN and
// reference to copy, and notes. It prints clean: the actions and copy buttons stay off paper.

type InvoiceTemplateProps = {
  invoice?: Invoice
  /** Dates, money and country names in this language. */
  locale?: string
  /** Today, for "Due in 19 days" and "Overdue by 3 days". */
  now?: Date
  /** Where "Pay by card" goes, like your payment page. Without it, there's no such link. */
  payHref?: string
  /** Prints the invoice; the browser's print by default. */
  onPrint?: () => void
  /** The page's own element; pass "div" inside a page that already has a <main>. */
  contentElement?: "main" | "div"
}

function Party({ id, title, party, locale }: { id: string; title: string; party: InvoiceParty; locale?: string }) {
  return (
    <section className="invoice-party" aria-labelledby={id}>
      <h2 id={id} className="invoice-section-title">
        {title}
      </h2>
      <address>
        {addressLines(party.address, { locale }).map((line, index) => (
          <span key={index}>{line}</span>
        ))}
      </address>
      {party.email && <a href={`mailto:${party.email}`}>{party.email}</a>}
      {party.taxId && <p className="invoice-muted">{party.taxId}</p>}
    </section>
  )
}

function InvoiceTemplate({ invoice: given, locale = "en-IE", now = new Date(), payHref, onPrint, contentElement: Content = "main" }: InvoiceTemplateProps) {
  const invoice = given ?? sampleInvoice(now)
  const money = moneyFormat(invoice.currency, locale)
  const totals = invoiceTotals(invoice, locale)
  const status = invoiceStatus(invoice, now, locale)
  const lineAmount = (line: Invoice["lines"][number]) => orderTotals([line], { decimals: money.decimals }).subtotal
  const ibanMask = iban()
  const open = !invoice.paidOn

  return (
    <Content className="invoice">
      <header className="invoice-head">
        <div className="invoice-heading">
          <p className="invoice-seller">{invoice.from.address.name}</p>
          <h1 className="invoice-title">Invoice {invoice.number}</h1>
          <Badge tone={status.tone}>{status.text}</Badge>
        </div>
        <div className="invoice-actions">
          {open && payHref && (
            <a href={payHref} className="invoice-pay-link" data-slot="button">
              Pay {money.format(totals.total)} by card
            </a>
          )}
          <Button variant="outline" aria-label={`Print invoice ${invoice.number}`} onClick={onPrint ?? (() => window.print())}>
            Print
          </Button>
        </div>
      </header>

      <DescriptionList
        items={[
          { term: "Issued", details: invoiceDate(invoice.issued, locale) },
          { term: "Due", details: invoiceDate(invoice.due, locale) },
          { term: open ? "Amount due" : "Amount paid", details: <strong>{money.format(totals.total)}</strong> },
        ]}
      />

      <div className="invoice-parties">
        <Party id="invoice-from" title="From" party={invoice.from} locale={locale} />
        <Party id="invoice-to" title="Bill to" party={invoice.to} locale={locale} />
      </div>

      <Table label="Items" stack className="invoice-lines">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead align="end">Quantity</TableHead>
            <TableHead align="end">Unit price</TableHead>
            <TableHead align="end">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoice.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                <span className="invoice-item">{line.name}</span>
                {line.detail && <span className="invoice-muted">{line.detail}</span>}
              </TableCell>
              <TableCell align="end">{line.quantity}</TableCell>
              <TableCell align="end">{money.format(line.price)}</TableCell>
              <TableCell align="end">{money.format(lineAmount(line))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableHead scope="row" colSpan={3}>
              Subtotal
            </TableHead>
            <TableCell align="end">{money.format(totals.subtotal)}</TableCell>
          </TableRow>
          {invoice.discount && totals.discount > 0 && (
            <TableRow>
              <TableHead scope="row" colSpan={3}>
                Discount ({invoice.discount.code})
              </TableHead>
              <TableCell align="end">−{money.format(totals.discount)}</TableCell>
            </TableRow>
          )}
          {invoice.tax && totals.tax !== null && (
            <TableRow>
              <TableHead scope="row" colSpan={3}>
                {invoice.tax.label} ({new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(invoice.tax.rate)})
              </TableHead>
              <TableCell align="end">{money.format(totals.tax)}</TableCell>
            </TableRow>
          )}
          <TableRow className="invoice-total">
            <TableHead scope="row" colSpan={3}>
              Total
            </TableHead>
            <TableCell align="end">{money.format(totals.total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {open && invoice.bank && (
        <section className="invoice-pay" aria-labelledby="invoice-pay-title">
          <h2 id="invoice-pay-title" className="invoice-section-title">
            How to pay
          </h2>
          <p className="invoice-muted">By bank transfer, with the invoice number as the reference.</p>
          <DescriptionList
            items={[
              { term: "Account holder", details: invoice.bank.holder },
              {
                term: "IBAN",
                details: (
                  <span className="invoice-copy">
                    <span translate="no">{ibanMask.format(ibanMask.keep(invoice.bank.iban))}</span>
                    <CopyButton value={ibanMask.keep(invoice.bank.iban)} aria-label="Copy the IBAN" />
                  </span>
                ),
              },
              ...(invoice.bank.bic ? [{ term: "BIC", details: <span translate="no">{invoice.bank.bic}</span> }] : []),
              {
                term: "Reference",
                details: (
                  <span className="invoice-copy">
                    <span translate="no">{invoice.number}</span>
                    <CopyButton value={invoice.number} aria-label="Copy the reference" />
                  </span>
                ),
              },
            ]}
          />
        </section>
      )}

      {invoice.notes && (
        <section className="invoice-notes" aria-labelledby="invoice-notes-title">
          <h2 id="invoice-notes-title" className="invoice-section-title">
            Notes
          </h2>
          <p>{invoice.notes}</p>
        </section>
      )}
    </Content>
  )
}

export { InvoiceTemplate }
export { invoiceDate, invoiceStatus, invoiceTotals } from "./invoice-model"
export type { Invoice, InvoiceParty, InvoiceStatus } from "./invoice-model"
export type { InvoiceTemplateProps }
