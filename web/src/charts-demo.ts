// The Charts demo's own script: data in, as an app would set it.
import { createAgent } from "@ui-sdk/web/agent"

type Month = { month: string; revenue: number; costs: number }
const months: Month[] = [
  { month: "Jan", revenue: 12400, costs: 9100 },
  { month: "Feb", revenue: 13900, costs: 9400 },
  { month: "Mar", revenue: 15100, costs: 10200 },
  { month: "Apr", revenue: 14200, costs: 10900 },
  { month: "May", revenue: 17800, costs: 11300 },
  { month: "Jun", revenue: 19300, costs: 11800 },
]
const usd = (n: number) => `$${Math.round(n / 100) / 10}k`

const set = (id: string, props: Record<string, unknown>) => Object.assign(document.getElementById(id)!, props)

set("revenue", {
  data: months,
  x: (d: Month) => d.month,
  series: [
    { key: "revenue", label: "Revenue", value: (d: Month) => d.revenue },
    { key: "costs", label: "Costs", value: (d: Month) => d.costs },
  ],
  format: usd,
})

type Region = { region: string; signups: number }
const regions: Region[] = [
  { region: "North America", signups: 4210 },
  { region: "Europe", signups: 3880 },
  { region: "Asia Pacific", signups: 2950 },
  { region: "Latin America", signups: 1270 },
]
set("regions", {
  data: regions,
  x: (d: Region) => d.region,
  series: [{ key: "signups", label: "Signups", value: (d: Region) => d.signups }],
})

type Account = { name: string; seats: number; revenue: number; tier: string }
const accounts: Account[] = [
  { name: "Acme", seats: 40, revenue: 18000, tier: "pro" },
  { name: "Globex", seats: 120, revenue: 52000, tier: "enterprise" },
  { name: "Initech", seats: 12, revenue: 4100, tier: "pro" },
  { name: "Umbrella", seats: 210, revenue: 98000, tier: "enterprise" },
  { name: "Hooli", seats: 75, revenue: 31000, tier: "pro" },
]
set("accounts", {
  data: accounts,
  pointLabel: (d: Account) => d.name,
  x: (d: Account) => d.seats,
  y: (d: Account) => d.revenue,
  series: [
    { key: "pro", label: "Pro", match: (d: Account) => d.tier === "pro" },
    { key: "enterprise", label: "Enterprise", match: (d: Account) => d.tier === "enterprise" },
  ],
  formatY: usd,
})

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const hours = ["9", "10", "11", "12", "13", "14", "15", "16"]
type Cell = { day: string; hour: string; n: number }
const cells: Cell[] = days.flatMap((day, i) => hours.map((hour, j) => ({ day, hour, n: ((i + 1) * (j + 3) * 37) % 400 })))
set("sessions", {
  rows: days,
  columns: hours,
  data: cells,
  row: (d: Cell) => d.day,
  column: (d: Cell) => d.hour,
  value: (d: Cell) => d.n,
})

set("plans", {
  parts: [
    { key: "free", label: "Free", value: 5200 },
    { key: "pro", label: "Pro", value: 2100 },
    { key: "team", label: "Team", value: 860 },
    { key: "enterprise", label: "Enterprise", value: 140 },
  ],
})

Object.assign(window, { agent: createAgent() })
