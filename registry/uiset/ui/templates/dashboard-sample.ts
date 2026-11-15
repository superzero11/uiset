// The dashboard template's sample orders and every figure derived from them, framework-free,
// so the React template and the web page show the same numbers.

type Order = {
  id: string
  customer: string
  channel: "Search" | "Direct" | "Social" | "Email"
  plan: "Free" | "Pro" | "Team"
  amount: number
  refunded: boolean
  placed: Date
}

const channels = ["Search", "Direct", "Social", "Email"] as const
const plans = ["Free", "Pro", "Team"] as const
const names = ["Acme", "Globex", "Initech", "Hooli", "Vandelay", "Wonka", "Stark", "Tyrell"]
const DAY = 86400000

/** Seeded sample data: 180 days of orders ending on `today`. */
function sampleOrders(today = Date.UTC(2026, 10, 15)): Order[] {
  let seed = 11
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const orders: Order[] = []
  for (let d = 179; d >= 0; d--) {
    const day = today - d * DAY
    const weekday = new Date(day).getUTCDay()
    const count = Math.round((weekday === 0 || weekday === 6 ? 9 : 16) + (179 - d) * 0.05 + next() * 5)
    for (let i = 0; i < count; i++) {
      const plan = plans[next() < 0.55 ? 0 : next() < 0.7 ? 1 : 2]!
      orders.push({
        id: `#${(40000 + orders.length).toString()}`,
        customer: `${names[Math.floor(next() * names.length)]} ${["Labs", "Studio", "Group", "Co"][Math.floor(next() * 4)]}`,
        channel: channels[Math.floor(next() ** 1.4 * channels.length)]!,
        plan,
        amount: Math.round((plan === "Free" ? 12 : plan === "Pro" ? 49 : 180) * (0.8 + next() * 0.6) * 100) / 100,
        refunded: next() < 0.04,
        placed: new Date(day + Math.floor(next() * DAY)),
      })
    }
  }
  return orders
}

const ranges = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const exact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const whole = new Intl.NumberFormat("en-US")
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 })
const shortDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
})

function change(now: number, before: number, goodWhenUp = true) {
  if (!before) return undefined
  const ratio = (now - before) / before
  return {
    value: percent.format(Math.abs(ratio)),
    direction: ratio >= 0 ? ("up" as const) : ("down" as const),
    good: ratio >= 0 === goodWhenUp,
    period: "vs the period before",
  }
}

/** Everything the dashboard shows for a range of `days` ending on `now`'s day. */
function summarize(orders: readonly Order[], days: number, now: Date) {
  // Ranges end today, not at the newest order, so they don't drift back when sales stop.
  const today = Math.floor(now.getTime() / DAY) * DAY
  const start = today - (days - 1) * DAY
  const inRange = (o: Order, from: number, to: number) => o.placed.getTime() >= from && o.placed.getTime() < to + DAY
  const current = orders.filter((o) => inRange(o, start, today))
  const before = orders.filter((o) => inRange(o, start - days * DAY, start - DAY))
  const revenue = (list: readonly Order[]) => list.reduce((sum, o) => sum + (o.refunded ? 0 : o.amount), 0)
  const refundRate = (list: readonly Order[]) => (list.length ? list.filter((o) => o.refunded).length / list.length : 0)
  const paidPlans = (list: readonly Order[]) => list.filter((o) => o.plan !== "Free").length
  const daily = Array.from({ length: days }, (_, i) => {
    const day = start + i * DAY
    const list = current.filter((o) => inRange(o, day, day))
    return { day: shortDay.format(day), revenue: revenue(list), orders: list.length }
  })
  const byChannel = channels.map(
    (channel) =>
      ({
        channel,
        ...Object.fromEntries(plans.map((plan) => [plan, current.filter((o) => o.channel === channel && o.plan === plan).length])),
      }) as { channel: string } & Record<(typeof plans)[number], number>,
  )
  const recent = [...current].sort((a, b) => b.placed.getTime() - a.placed.getTime())
  const newOrders = current.filter((o) => inRange(o, today, today)).length
  const label = ranges.find((r) => r.value === String(days))?.label.toLowerCase() ?? `${days} days`
  return { current, before, daily, byChannel, recent, newOrders, label, revenue, refundRate, paidPlans }
}

export { change, channels, dateTime, DAY, exact, money, percent, plans, ranges, sampleOrders, shortDay, summarize, whole }
export type { Order }
