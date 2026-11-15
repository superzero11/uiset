"use client"

import { useMemo, useState, type ReactNode } from "react"
import { AppShell, SidebarGroup, SidebarItem, SidebarNav } from "../app-shell"
import { Badge } from "../badge"
import { BarChart } from "../bar-chart"
import { DataGrid, DataGridExport, DataGridSearch, type DataGridColumn } from "../data-grid"
import { EmptyState } from "../empty-state"
import { LineChart } from "../line-chart"
import { PageHeader } from "../page-header"
import { SegmentedBar } from "../segmented-bar"
import { SegmentedControl, SegmentedControlItem } from "../segmented-control"
import { Icon } from "../shell/icons"
import { Stat } from "../stat"
import {
  change,
  channels,
  dateTime,
  exact,
  money,
  percent,
  plans,
  ranges,
  sampleOrders,
  summarize,
  whole,
  type Order,
} from "./dashboard-sample"
import "./templates.css"

// A product dashboard: a date range that scopes everything below it, a row of figures
// with trends, three charts and the latest orders. Replace `sampleOrders` with yours;
// every number on the page is derived from that one list.

const orderColumns: DataGridColumn<Order>[] = [
  { id: "id", header: "Order", value: (o) => o.id, width: 96, hideable: false },
  { id: "customer", header: "Customer", value: (o) => o.customer, width: 170 },
  { id: "channel", header: "Channel", value: (o) => o.channel, width: 110 },
  {
    id: "plan",
    header: "Plan",
    value: (o) => o.plan,
    width: 100,
    render: (o) => <Badge tone={o.plan === "Team" ? "info" : "neutral"}>{o.plan}</Badge>,
  },
  { id: "amount", header: "Amount", type: "number", value: (o) => o.amount, text: (o) => exact.format(o.amount), width: 110 },
  { id: "placed", header: "Placed", type: "date", value: (o) => o.placed, text: (o) => dateTime.format(o.placed), width: 150 },
  {
    id: "refunded",
    header: "Status",
    value: (o) => (o.refunded ? "Refunded" : "Paid"),
    render: (o) => <Badge tone={o.refunded ? "warning" : "success"}>{o.refunded ? "Refunded" : "Paid"}</Badge>,
    width: 110,
  },
]

function DashboardNav({ current = "overview", newOrders }: { current?: string; newOrders: number }) {
  const item = (id: string, label: string, icon: Parameters<typeof Icon>[0]["name"], badge?: ReactNode) => (
    <SidebarItem href={`#${id}`} current={current === id} icon={<Icon name={icon} />} badge={badge}>
      {label}
    </SidebarItem>
  )
  return (
    <SidebarNav label="Dashboard sections">
      <SidebarGroup title="Store">
        {item("overview", "Overview", "home")}
        {item("orders", "Orders", "orders", newOrders ? <Badge tone="info">{newOrders}</Badge> : undefined)}
        {item("customers", "Customers", "users")}
        {item("reports", "Reports", "reports")}
      </SidebarGroup>
      <SidebarGroup title="Account">{item("settings", "Settings", "settings")}</SidebarGroup>
    </SidebarNav>
  )
}

function DashboardTemplate({
  orders: allOrders,
  now = new Date(Date.UTC(2026, 10, 15, 18)),
  brand = "Acme Cloud",
  contentElement = "main",
}: {
  orders?: readonly Order[]
  /** Today, the end of every range. Pass the real clock in an app; it's fixed for the sample. */
  now?: Date
  brand?: ReactNode
  /** "div" when the page already has a main landmark around it. */
  contentElement?: "main" | "div"
}) {
  const orders = useMemo(() => allOrders ?? sampleOrders(), [allOrders])
  const [range, setRange] = useState<"7" | "30" | "90">("30")
  // Every number on the page comes from the shared summary, as the web page's do.
  const { current, before, daily, byChannel, recent, newOrders, label, revenue, refundRate, paidPlans } = useMemo(
    () => summarize(orders, Number(range), now),
    [orders, range, now],
  )
  return (
    <AppShell
      label="Dashboard navigation"
      brand={<span className="template-brand">{brand}</span>}
      sidebar={<DashboardNav newOrders={newOrders} />}
      contentElement={contentElement}
    >
      <div className="dashboard">
        <PageHeader
          title="Overview"
          description={`Orders from the last ${label}, all channels.`}
          actions={
            <div className="dashboard-filters">
              <SegmentedControl
                aria-label="Date range"
                value={range}
                onValueChange={(value) => value && setRange(value as typeof range)}
              >
                {ranges.map((r) => (
                  <SegmentedControlItem key={r.value} value={r.value}>
                    {r.label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
          }
        />
        <section className="dashboard-figures" aria-label="Key figures">
          <Stat
            label="Revenue"
            value={money.format(revenue(current))}
            change={change(revenue(current), revenue(before))}
            trend={daily.map((d) => d.revenue)}
            format={(n) => money.format(n)}
          />
          <Stat
            label="Orders"
            value={whole.format(current.length)}
            change={change(current.length, before.length)}
            trend={daily.map((d) => d.orders)}
          />
          <Stat
            label="Paid plans"
            value={whole.format(paidPlans(current))}
            change={change(paidPlans(current), paidPlans(before))}
          />
          <Stat
            label="Refund rate"
            value={percent.format(refundRate(current))}
            change={change(refundRate(current), refundRate(before), false)}
          />
        </section>
        {current.length === 0 ? (
          <EmptyState
            icon="reports"
            title={`No orders in the last ${label}`}
            description="Orders show up here as they come in. Try a longer range."
          />
        ) : (
          <>
        <div className="dashboard-charts">
          <LineChart
            className="dashboard-wide"
            title="Revenue"
            description={`Daily, last ${label}`}
            data={daily}
            x={(d) => d.day}
            series={[{ key: "revenue", label: "Revenue", value: (d) => d.revenue }]}
            format={(n) => money.format(n)}
            layout="area"
          />
          <BarChart
            title="Orders by channel"
            description="Stacked by plan"
            data={byChannel}
            x={(d) => d.channel}
            series={plans.map((plan) => ({
              key: plan,
              label: plan,
              value: (d: (typeof byChannel)[number]) => d[plan],
            }))}
            layout="stacked"
            orientation="horizontal"
            sort="descending"
            format={(n) => whole.format(n)}
          />
          <SegmentedBar
            title="Plan mix"
            description={`${whole.format(current.length)} orders`}
            parts={plans.map((plan) => ({
              key: plan,
              label: plan,
              value: current.filter((o) => o.plan === plan).length,
            }))}
            format={(n) => whole.format(n)}
          />
        </div>
        <section className="dashboard-table" aria-labelledby="dashboard-recent">
          <h2 id="dashboard-recent" className="dashboard-section-title">
            Recent orders
          </h2>
          <DataGrid
            label="Recent orders"
            rows={recent}
            columns={orderColumns}
            getRowId={(o) => o.id}
            defaultSort={[{ column: "placed", direction: "descending" }]}
            height="22rem"
            locale="en-US"
          >
            <div className="dashboard-table-tools">
              <DataGridSearch />
              <DataGridExport filename="recent-orders" />
            </div>
          </DataGrid>
        </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

export { DashboardTemplate, sampleOrders }
export type { Order as DashboardOrder }
