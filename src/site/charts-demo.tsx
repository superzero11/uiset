import { BarChart } from "@/registry/uiset/ui/bar-chart"
import { Heatmap } from "@/registry/uiset/ui/heatmap"
import { LineChart } from "@/registry/uiset/ui/line-chart"
import { ScatterChart } from "@/registry/uiset/ui/scatter-chart"
import { SegmentedBar } from "@/registry/uiset/ui/segmented-bar"
import { Stat } from "@/registry/uiset/ui/stat"

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const revenue = [42, 45, 51, 49, 58, 63, 61, 70, 76, 74, 83, 91]
const costs = [38, 39, 41, 44, 45, 47, 50, 52, 53, 57, 58, 60]
const finance = months.map((month, i) => ({
  month,
  revenue: revenue[i]! * 1000,
  costs: costs[i]! * 1000,
}))

// Daily active users over 90 days, seeded so every visit draws the same line.
const days = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 7, 18 + i))
  const trend = 1800 + i * 14
  const weekly = [0.82, 1, 1.04, 1.05, 1.03, 0.97, 0.78][date.getUTCDay()]!
  const noise = Math.sin(i * 2.3) * 60 + Math.cos(i * 0.7) * 40
  return {
    day: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    users: Math.round(trend * weekly + noise),
  }
})

const channels = months.map((month, i) => ({
  month,
  search: 1200 + i * 90 + (i % 3) * 40,
  social: 600 + Math.round(Math.sin(i / 2) * 150) + i * 30,
  email: 400 + i * 20,
}))

const regions = [
  { region: "North America", revenue: 412000 },
  { region: "Europe", revenue: 318000 },
  { region: "Asia Pacific", revenue: 276000 },
  { region: "Latin America", revenue: 98000 },
  { region: "Middle East and Africa", revenue: 64000 },
]

const quarters = ["Q1", "Q2", "Q3", "Q4"].map((quarter, i) => ({
  quarter,
  free: [820, 940, 1010, 1180][i]!,
  pro: [310, 380, 450, 520][i]!,
  team: [90, 120, 170, 240][i]!,
}))

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const hours = ["0h", "2h", "4h", "6h", "8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"]
const sessions = weekdays.flatMap((day, d) =>
  hours.map((hour, h) => {
    const work = d < 5 ? 1 : 0.45
    const curve = Math.max(0, Math.sin(((h - 2) / 11) * Math.PI))
    return { day, hour, sessions: Math.round(40 + curve * 420 * work + ((d * 7 + h * 3) % 11) * 6) }
  }),
)

const segments = ["Startup", "Mid-market", "Enterprise"]
const deals = Array.from({ length: 36 }, (_, i) => {
  const segment = segments[i % 3]!
  const scale = [1, 3.2, 9][i % 3]!
  return {
    name: `Deal ${String(i + 1).padStart(2, "0")}`,
    segment,
    size: Math.round((8 + ((i * 37) % 23)) * scale * 1000),
    days: Math.round(14 + scale * 9 + ((i * 53) % 29)),
  }
})

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const whole = new Intl.NumberFormat("en-US")

function ChartsDemo() {
  return (
    <div className="charts-demo">
      <div className="charts-demo-stats">
        <Stat
          label="Revenue"
          value={money.format(91000)}
          change={{ value: "9.6%", direction: "up", period: "vs Nov" }}
          trend={revenue.map((v) => v * 1000)}
          format={(n) => money.format(n)}
        />
        <Stat
          label="Active users"
          value={whole.format(days.at(-1)!.users)}
          change={{ value: "3.1%", direction: "up", period: "vs last week" }}
          trend={days.slice(-28).map((d) => d.users)}
          format={(n) => whole.format(n)}
        />
        <Stat
          label="Costs"
          value={money.format(60000)}
          change={{ value: "3.4%", direction: "up", good: false, period: "vs Nov" }}
          trend={costs.map((v) => v * 1000)}
          format={(n) => money.format(n)}
        />
      </div>
      <LineChart
        title="Revenue and costs"
        description="2026, by month"
        data={finance}
        x={(d) => d.month}
        series={[
          { key: "revenue", label: "Revenue", value: (d) => d.revenue },
          { key: "costs", label: "Costs", value: (d) => d.costs },
        ]}
        format={(n) => money.format(n)}
      />
      <LineChart
        title="Daily active users"
        description="Last 90 days"
        data={days}
        x={(d) => d.day}
        series={[{ key: "users", label: "Active users", value: (d) => d.users }]}
        format={(n) => whole.format(n)}
        layout="area"
      />
      <LineChart
        title="Visits by channel"
        description="Stacked, 2026"
        data={channels}
        x={(d) => d.month}
        series={[
          { key: "search", label: "Search", value: (d) => d.search },
          { key: "social", label: "Social", value: (d) => d.social },
          { key: "email", label: "Email", value: (d) => d.email },
        ]}
        format={(n) => whole.format(n)}
        layout="stacked"
      />
      <BarChart
        title="Revenue by region"
        description="2026, ranked"
        data={regions}
        x={(d) => d.region}
        series={[{ key: "revenue", label: "Revenue", value: (d) => d.revenue }]}
        format={(n) => money.format(n)}
        orientation="horizontal"
        sort="descending"
      />
      <BarChart
        title="Sign-ups by plan"
        description="2026, by quarter"
        data={quarters}
        x={(d) => d.quarter}
        series={[
          { key: "free", label: "Free", value: (d) => d.free },
          { key: "pro", label: "Pro", value: (d) => d.pro },
          { key: "team", label: "Team", value: (d) => d.team },
        ]}
        format={(n) => whole.format(n)}
      />
      <BarChart
        title="Sign-ups, all plans"
        description="Stacked by plan"
        data={quarters}
        x={(d) => d.quarter}
        series={[
          { key: "free", label: "Free", value: (d) => d.free },
          { key: "pro", label: "Pro", value: (d) => d.pro },
          { key: "team", label: "Team", value: (d) => d.team },
        ]}
        format={(n) => whole.format(n)}
        layout="stacked"
      />
      <SegmentedBar
        title="Traffic sources"
        description="Last 30 days, 412,000 visits"
        parts={[
          { key: "search", label: "Search", value: 189000 },
          { key: "direct", label: "Direct", value: 104000 },
          { key: "social", label: "Social", value: 61000 },
          { key: "email", label: "Email", value: 38000 },
          { key: "other", label: "Other", value: 20000 },
        ]}
        format={(n) => whole.format(n)}
      />
      <Heatmap
        title="Sessions by day and hour"
        description="Last 4 weeks, UTC"
        data={sessions}
        rows={weekdays}
        columns={hours}
        row={(d) => d.day}
        column={(d) => d.hour}
        value={(d) => d.sessions}
        measure="Sessions"
        format={(n) => whole.format(n)}
      />
      <ScatterChart
        title="Deal size and time to close"
        description="Closed deals, 2026"
        data={deals}
        label={(d) => d.name}
        x={(d) => d.days}
        y={(d) => d.size}
        xLabel="Days to close"
        yLabel="Deal size"
        series={segments.map((segment) => ({
          key: segment,
          label: segment,
          match: (d: (typeof deals)[number]) => d.segment === segment,
        }))}
        formatY={(n) => money.format(n)}
      />
    </div>
  )
}

export { ChartsDemo }
