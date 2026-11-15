// The Dashboard page as web elements: a date range that scopes everything below it, a row
// of figures with trends, three charts and the latest orders, inside the app shell. Every
// number comes from the React template's own summary (templates/dashboard-sample.ts).
import { createAgent } from "@ui-sdk/web/agent"
import { change, dateTime, exact, money, percent, plans, sampleOrders, summarize, whole, type Order } from "@/registry/uiset/ui/templates/dashboard-sample"
import type { WebColumn } from "../data-grid"
import { h } from "../dom"
import { iconElement } from "../uiset"
import "./common"

const orders = sampleOrders()
const now = new Date(Date.UTC(2026, 10, 15, 18))
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
type Stat = HTMLElement & { trend: unknown; format: unknown }
type Chart = HTMLElement & Record<string, unknown>

const badge = (tone: string, text: string) => h("span", { class: "badge", "data-tone": tone }, text)
const columns: WebColumn[] = [
  { id: "id", header: "Order", value: (o) => (o as Order).id, width: 96, hideable: false },
  { id: "customer", header: "Customer", value: (o) => (o as Order).customer, width: 170 },
  { id: "channel", header: "Channel", value: (o) => (o as Order).channel, width: 110 },
  { id: "plan", header: "Plan", value: (o) => (o as Order).plan, width: 100, render: (o) => badge((o as Order).plan === "Team" ? "info" : "neutral", (o as Order).plan) },
  { id: "amount", header: "Amount", type: "number", value: (o) => (o as Order).amount, text: (o) => exact.format((o as Order).amount), width: 110 },
  { id: "placed", header: "Placed", type: "date", value: (o) => (o as Order).placed, text: (o) => dateTime.format((o as Order).placed), width: 150 },
  { id: "refunded", header: "Status", value: (o) => ((o as Order).refunded ? "Refunded" : "Paid"), render: (o) => badge((o as Order).refunded ? "warning" : "success", (o as Order).refunded ? "Refunded" : "Paid"), width: 110 },
]
const grid = $<HTMLElement & Record<string, unknown>>("orders")
grid.columns = columns
grid.getRowId = (o: unknown) => (o as Order).id
grid.sort = [{ column: "placed", direction: "descending" }]

function nav(newOrders: number) {
  const item = (id: string, label: string, icon: Parameters<typeof iconElement>[0], badgeText?: string) =>
    h(
      "li",
      null,
      h(
        "a",
        { href: `#${id}`, class: "sidebar-link", "aria-current": id === "overview" ? "page" : null },
        h("span", { class: "sidebar-icon" }, iconElement(icon)),
        h("span", { class: "sidebar-label" }, label),
        badgeText ? h("span", { class: "sidebar-badge" }, badge("info", badgeText)) : null,
      ),
    )
  const group = (title: string, ...items: HTMLElement[]) => {
    const id = `nav-${title.toLowerCase()}`
    return h("div", { class: "sidebar-group" }, h("p", { id, class: "sidebar-group-title" }, title), h("ul", { "aria-labelledby": id }, ...items))
  }
  return [
    group("Store", item("overview", "Overview", "home"), item("orders", "Orders", "orders", newOrders ? String(newOrders) : undefined), item("customers", "Customers", "users"), item("reports", "Reports", "reports")),
    group("Account", item("settings", "Settings", "settings")),
  ]
}

function stat(id: string, value: string, delta: ReturnType<typeof change>, trend?: number[], format?: (n: number) => string) {
  const el = $<Stat>(id)
  el.setAttribute("value", value)
  for (const [name, text] of Object.entries({ change: delta?.value, direction: delta?.direction, good: delta ? String(delta.good) : undefined, period: delta?.period })) {
    if (text === undefined) el.removeAttribute(name)
    else el.setAttribute(name, text)
  }
  el.format = format
  el.trend = trend ?? null
}

function render(days: number) {
  const view = summarize(orders, days, now)
  const { current, before, daily, byChannel, recent, label, revenue, refundRate, paidPlans } = view
  $("header").setAttribute("description", `Orders from the last ${label}, all channels.`)
  stat("stat-revenue", money.format(revenue(current)), change(revenue(current), revenue(before)), daily.map((d) => d.revenue), (n) => money.format(n))
  stat("stat-orders", whole.format(current.length), change(current.length, before.length), daily.map((d) => d.orders))
  stat("stat-paid", whole.format(paidPlans(current)), change(paidPlans(current), paidPlans(before)))
  stat("stat-refunds", percent.format(refundRate(current)), change(refundRate(current), refundRate(before), false))
  const empty = $("empty")
  empty.hidden = current.length > 0
  empty.setAttribute("title", `No orders in the last ${label}`)
  empty.setAttribute("description", "Orders show up here as they come in. Try a longer range.")
  $("results").hidden = current.length === 0
  const line = $<Chart>("revenue-chart")
  line.setAttribute("description", `Daily, last ${label}`)
  Object.assign(line, { data: daily, x: (d: (typeof daily)[number]) => d.day, series: [{ key: "revenue", label: "Revenue", value: (d: (typeof daily)[number]) => d.revenue }], format: (n: number) => money.format(n) })
  Object.assign($<Chart>("channel-chart"), {
    data: byChannel,
    x: (d: (typeof byChannel)[number]) => d.channel,
    series: plans.map((plan) => ({ key: plan, label: plan, value: (d: (typeof byChannel)[number]) => d[plan] })),
    format: (n: number) => whole.format(n),
  })
  const mix = $<Chart>("plan-chart")
  mix.setAttribute("description", `${whole.format(current.length)} orders`)
  Object.assign(mix, { parts: plans.map((plan) => ({ key: plan, label: plan, value: current.filter((o) => o.plan === plan).length })), format: (n: number) => whole.format(n) })
  grid.rows = recent
  $("nav").replaceChildren(...nav(view.newOrders))
}

$("range").addEventListener("valuechange", (event) => {
  const value = (event as CustomEvent<{ value: string | null }>).detail.value
  if (value) render(Number(value))
})
render(30)
Object.assign(window, { agent: createAgent() })
