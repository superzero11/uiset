// The Admin records page as web elements: a customers grid with search, filters, columns,
// export and inline edits; create and edit in one drawer form; a confirmed bulk delete that
// agents must ask about (data-agent-confirm). The customers are the React template's.
import { toast } from "@ui-sdk/web"
import { createAgent } from "@ui-sdk/web/agent"
import { day, planOptions, sampleCustomers, statusOptions, tone, type Customer } from "@/registry/uiset/ui/templates/admin-sample"
import type { WebColumn } from "../data-grid"
import { h } from "../dom"
import { decorateIcons } from "./common"

type Grid = HTMLElement & { rows: Customer[]; columns: WebColumn[]; getRowId: (c: unknown) => string; selected: string[]; focusGrid: () => void }
type Popup = HTMLElement & { open: boolean; api: { open: () => Promise<unknown>; close: () => boolean } }
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

let customers: Customer[] = [...sampleCustomers]
let editing: Customer | null = null
const grid = $<Grid>("customers")

decorateIcons()

grid.columns = [
  { id: "name", header: "Name", value: (c) => (c as Customer).name, width: 180, hideable: false, pinned: true },
  { id: "email", header: "Email", value: (c) => (c as Customer).email, width: 210 },
  { id: "company", header: "Company", value: (c) => (c as Customer).company, width: 170 },
  { id: "plan", header: "Plan", value: (c) => (c as Customer).plan, options: planOptions, editable: true, width: 100 },
  { id: "status", header: "Status", value: (c) => (c as Customer).status, options: statusOptions, editable: true, width: 110, render: (c) => h("span", { class: "badge", "data-tone": tone[(c as Customer).status] }, (c as Customer).status) },
  { id: "seats", header: "Seats", type: "number", value: (c) => (c as Customer).seats, editable: true, width: 90 },
  { id: "joined", header: "Joined", type: "date", value: (c) => (c as Customer).joined, text: (c) => day.format((c as Customer).joined), width: 140 },
]
grid.getRowId = (c) => (c as Customer).id

function render() {
  grid.rows = customers
  grid.hidden = customers.length === 0
  $("empty").hidden = customers.length > 0
  $("header").setAttribute("description", `${customers.length} accounts. Press Enter on a row to edit it.`)
}

// Inline edits follow the form's rules.
grid.addEventListener("celledit", (event) => {
  const { rowId, column, value } = (event as CustomEvent<{ rowId: string; column: string; value: unknown }>).detail
  if (column === "seats" && (typeof value !== "number" || value < 1 || value > 500)) {
    event.preventDefault()
    toast("Seats go from 1 to 500; contact sales for more.")
    return
  }
  customers = customers.map((c) => (c.id === rowId ? { ...c, [column]: value } : c))
  render()
})
grid.addEventListener("rowaction", (event) => openDrawer((event as CustomEvent<{ row: Customer }>).detail.row))

/* -------------------------------------------------------------- the drawer */

const drawer = $<Popup>("drawer")
function openDrawer(customer: Customer | null) {
  editing = customer
  $("drawer-title").textContent = customer ? `Edit ${customer.name}` : "New customer"
  $("drawer-description").textContent = customer ? `Customer since ${day.format(customer.joined)}.` : "They'll get a welcome email."
  // Each opening gets a fresh form, so a second "New customer" starts empty.
  const form = ($<HTMLTemplateElement>("customer-form").content.cloneNode(true) as DocumentFragment).querySelector("form")!
  form.setAttribute("aria-label", customer ? `Edit ${customer.name}` : "New customer")
  form.querySelector<HTMLButtonElement>("[data-submit]")!.textContent = customer ? "Save changes" : "Add customer"
  const set = (name: string, value: string) => ((form.querySelector<HTMLInputElement>(`input[name="${name}"]`)!).value = value)
  set("name", customer?.name ?? "")
  set("email", customer?.email ?? "")
  set("company", customer?.company ?? "")
  set("seats", String(customer?.seats ?? 1))
  for (const select of form.querySelectorAll<HTMLElement>("[data-options]")) {
    const list = select.dataset.options === "plan" ? planOptions : statusOptions
    select.querySelector("ui-select-content")!.replaceChildren(...list.map((option) => h("ui-select-item", { value: option }, option)))
    select.setAttribute("default-value", select.dataset.options === "plan" ? (customer?.plan ?? "Free") : (customer?.status ?? "Trial"))
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const values = {
      name: String(data.get("name")),
      email: String(data.get("email")),
      company: String(data.get("company")),
      plan: String(data.get("plan")) as Customer["plan"],
      status: String(data.get("status")) as Customer["status"],
      seats: Number(data.get("seats")),
    }
    const saved: Customer = editing ? { ...editing, ...values } : { ...values, id: crypto.randomUUID(), joined: new Date() }
    customers = editing ? customers.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...customers]
    render()
    toast(editing ? `Saved ${values.name}` : `Added ${values.name}`)
    drawer.api.close()
  })
  $("drawer-form").replaceChildren(form)
  void drawer.api.open()
}
$("new-customer").addEventListener("click", () => openDrawer(null))
$("add-first").addEventListener("click", () => openDrawer(null))

/* ------------------------------------------------------------ bulk delete */

const confirm = $<Popup>("confirm")
const who = () => {
  const chosen = customers.filter((c) => grid.selected.includes(c.id))
  return chosen.length === 1 ? chosen[0]!.name : `${chosen.length} customers`
}
$("delete-selected").addEventListener("click", () => {
  $("confirm-title").textContent = `Delete ${who()}?`
  const button = $("confirm-delete")
  button.textContent = `Delete ${who()}`
  button.setAttribute("data-agent-confirm", `Deletes ${who()} for good`)
  // Focus goes back to the grid once it closes: the selection bar goes with the selection.
  void confirm.api.open().then(() => requestAnimationFrame(() => grid.focusGrid()))
})
$("confirm-delete").addEventListener("click", () => {
  const name = who()
  const gone = new Set(grid.selected)
  customers = customers.filter((c) => !gone.has(c.id))
  grid.selected = []
  render()
  toast(`Deleted ${name}`)
})

render()
Object.assign(window, { agent: createAgent() })
