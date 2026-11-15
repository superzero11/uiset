// The Data Grid demo's own script: data in, events out, as an app would write it.
import { createAgent } from "@ui-sdk/web/agent"
import { toast } from "@ui-sdk/web"
import type { WebColumn } from "./data-grid"

type Customer = { id: string; name: string; plan: string; region: string; seats: number; mrr: number; renews: Date; active: boolean }

const names = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark Industries", "Wayne Enterprises", "Wonka", "Cyberdyne", "Soylent", "Tyrell", "Massive Dynamic"]
const plans = ["Free", "Pro", "Team", "Enterprise"]
const regions = ["Americas", "Europe", "Asia Pacific"]
let customers: Customer[] = Array.from({ length: 60 }, (_, i) => ({
  id: `c${i + 1}`,
  name: i < names.length ? names[i]! : `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
  plan: plans[(i * 7) % plans.length]!,
  region: regions[(i * 5) % regions.length]!,
  seats: ((i * 37) % 200) + 1,
  mrr: ((i * 53) % 90) * 100 + 400,
  renews: new Date(Date.UTC(2026, (i * 3) % 12, ((i * 11) % 27) + 1)),
  active: i % 5 !== 0,
}))

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

const columns: WebColumn[] = [
  { id: "name", header: "Name", value: (c) => (c as Customer).name, width: 200, pinned: true, editable: true, hideable: false },
  { id: "plan", header: "Plan", value: (c) => (c as Customer).plan, options: plans, editable: true, width: 130 },
  { id: "region", header: "Region", value: (c) => (c as Customer).region, width: 150 },
  { id: "seats", header: "Seats", type: "number", value: (c) => (c as Customer).seats, editable: true, width: 100 },
  { id: "mrr", header: "MRR", type: "number", value: (c) => (c as Customer).mrr, text: (c) => money.format((c as Customer).mrr), editable: true, width: 120 },
  { id: "renews", header: "Renews", type: "date", value: (c) => (c as Customer).renews, text: (c) => day.format((c as Customer).renews), editable: true, width: 150 },
  { id: "active", header: "Active", type: "boolean", value: (c) => (c as Customer).active, editable: true, width: 100 },
]

const grid = document.getElementById("customers") as HTMLElement & { rows: Customer[]; columns: WebColumn[]; getRowId: (row: unknown) => string }
grid.columns = columns
grid.getRowId = (row) => (row as Customer).id
grid.rows = customers

// Saves an edit: the event's value is already parsed (a number, a Date, a plan from the list).
grid.addEventListener("celledit", (event) => {
  const { rowId, column, value } = (event as CustomEvent<{ rowId: string; column: string; value: unknown }>).detail
  // Seats can't go below one: refusing keeps the editor open with the person's text.
  if (column === "seats" && typeof value === "number" && value < 1) {
    event.preventDefault()
    toast("Seats must be at least 1")
    return
  }
  customers = customers.map((c) => (c.id === rowId ? { ...c, [column]: value } : c))
  grid.rows = customers
})

grid.addEventListener("rowaction", (event) => {
  const row = (event as CustomEvent<{ row: Customer }>).detail.row
  toast(`Opened ${row.name}`)
})

Object.assign(window, { agent: createAgent() })
