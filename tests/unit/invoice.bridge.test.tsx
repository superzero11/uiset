import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { InvoiceTemplate, invoiceStatus, invoiceTotals, type Invoice } from "@/registry/uiset/ui/templates/invoice"
import { sampleInvoice } from "@/registry/uiset/ui/templates/invoice-sample"
import { UISet } from "@/registry/uiset/ui/uiset"
import { createBridge, settle } from "./bridge"

// The invoice template: its sums and status, the page as people and agents read it, the
// copy buttons and Print by name, and a paid invoice.

const bridge = createBridge()
afterEach(() => cleanup())

const now = new Date("2026-11-23T10:00:00Z")
const invoice = sampleInvoice(now)

test("its sums are made in whole cents, the tax on the lines after any discount", () => {
  expect(invoiceTotals(invoice)).toMatchObject({ subtotal: 737, tax: 169.51, total: 906.51 })
  expect(invoiceTotals({ ...invoice, discount: { code: "TRADE", amount: 37 } })).toMatchObject({ discount: 37, tax: 161, total: 861 })
  expect(invoiceTotals({ ...invoice, tax: null }).total).toBe(737)
})

test("its status counts the days to the due date, and says when it was paid", () => {
  const due = (iso: string) => invoiceStatus({ ...invoice, due: iso }, now, "en-IE")
  expect(due("2026-12-12")).toEqual({ tone: "info", text: "Due in 19 days" })
  expect(due("2026-11-24")).toEqual({ tone: "info", text: "Due tomorrow" })
  expect(due("2026-11-23")).toEqual({ tone: "warning", text: "Due today" })
  expect(due("2026-11-22")).toEqual({ tone: "danger", text: "Overdue by 1 day" })
  expect(due("2026-11-20")).toEqual({ tone: "danger", text: "Overdue by 3 days" })
  expect(invoiceStatus({ ...invoice, paidOn: "2026-11-20" }, now, "en-IE")).toEqual({ tone: "success", text: "Paid on 20 Nov 2026" })
})

async function open(props: { invoice?: Invoice; onPrint?: () => void } = {}) {
  render(
    <UISet>
      <InvoiceTemplate now={now} contentElement="div" {...props} />
    </UISet>,
  )
  await settle()
}

test("an open invoice: its status, both addresses as their countries write them, the lines and sums, and how to pay", async () => {
  await open()
  expect(screen.getByRole("heading", { level: 1, name: "Invoice INV-0142" })).toBeTruthy()
  expect(screen.getByText("Due in 19 days")).toBeTruthy()
  const billTo = screen.getByRole("region", { name: "Bill to" })
  expect([...billTo.querySelectorAll("address span")].map((line) => line.textContent)).toEqual(["Orchard Lane Café", "220 Pine St", "Suite 4", "Portland, OR 97204", "United States"])
  const from = screen.getByRole("region", { name: "From" })
  expect([...from.querySelectorAll("address span")].map((line) => line.textContent)).toEqual(["Sandpiper Ceramics", "4 Harbour Row", "Dublin 2", "D02 AF30", "Ireland"])
  const items = screen.getByRole("region", { name: "Items" })
  expect(within(items).getAllByRole("row")).toHaveLength(1 + 4 + 3)
  expect(within(items).getByRole("row", { name: /Stoneware mugs/ }).textContent).toContain("€348.00")
  expect(within(items).getByRole("row", { name: /VAT \(23%\)/ }).textContent).toContain("€169.51")
  expect(within(items).getByRole("row", { name: /Total/ }).textContent).toContain("€906.51")
  const pay = screen.getByRole("region", { name: "How to pay" })
  expect(pay.textContent).toContain("IE42 SAMP 9901 0012 3456 78")
})

test("an agent finds the copy buttons and Print by name; Print prints", async () => {
  const onPrint = vi.fn()
  await open({ onPrint })
  expect(bridge.entry("Copy the IBAN")).toBeTruthy()
  expect(bridge.entry("Copy the reference")).toBeTruthy()
  const printed = await bridge.press("Print invoice INV-0142")
  expect(printed.ok, printed.error?.message).toBe(true)
  expect(onPrint).toHaveBeenCalledTimes(1)
})

test("a paid invoice says when, shows what was paid, and leaves out how to pay", async () => {
  await open({ invoice: { ...invoice, paidOn: "2026-11-20" } })
  expect(screen.getByText("Paid on 20 Nov 2026")).toBeTruthy()
  expect(screen.getByText("Amount paid")).toBeTruthy()
  expect(screen.queryByRole("region", { name: "How to pay" })).toBeNull()
  expect(bridge.find("Copy the IBAN")).toBeUndefined()
})
