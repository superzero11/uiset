// The invoice template's sample, framework-free so the web page shows the same invoice: a
// made-up ceramics studio billing a made-up café, with a made-up bank account (the IBAN's
// check digits are valid; the bank code SAMP is invented). Replace it with yours.
import type { Invoice } from "./invoice-model"

const day = 24 * 60 * 60 * 1000
const isoDate = (date: Date) => date.toISOString().slice(0, 10)

/** The sample invoice, issued 11 days before `now` and due 30 days after it was issued. */
function sampleInvoice(now = new Date()): Invoice {
  const issued = new Date(now.getTime() - 11 * day)
  return {
    number: "INV-0142",
    issued: isoDate(issued),
    due: isoDate(new Date(issued.getTime() + 30 * day)),
    paidOn: null,
    currency: "EUR",
    from: {
      address: { country: "IE", name: "Sandpiper Ceramics", line1: "4 Harbour Row", line2: "", district: "", city: "Dublin 2", region: "", postalCode: "D02 AF30" },
      email: "accounts@sandpiper.example",
      taxId: "VAT IE 1234567T",
    },
    to: {
      address: { country: "US", name: "Orchard Lane Café", line1: "220 Pine St", line2: "Suite 4", district: "", city: "Portland", region: "OR", postalCode: "97204" },
      email: "orders@orchardlane.example",
    },
    lines: [
      { id: "mugs", name: "Stoneware mugs", detail: "Sand glaze, 350 ml", quantity: 24, price: 14.5 },
      { id: "pour-over", name: "Pour-over sets", detail: "Matte black", quantity: 6, price: 48 },
      { id: "tiles", name: "Glaze test tiles", detail: "Set of 12", quantity: 2, price: 18 },
      { id: "freight", name: "Packing and freight", detail: "2 cartons, tracked", quantity: 1, price: 65 },
    ],
    discount: null,
    tax: { label: "VAT", rate: 0.23 },
    bank: { holder: "Sandpiper Ceramics Ltd", iban: "IE42SAMP99010012345678", bic: "SAMPIE2D" },
    notes: "Payment within 30 days, by bank transfer with the invoice number as the reference. Thank you for your order.",
  }
}

export { sampleInvoice }
