// The admin template's sample customers and options, framework-free, so the React template
// and the web page list the same ones.

type Customer = {
  id: string
  name: string
  email: string
  company: string
  plan: "Free" | "Pro" | "Team"
  status: "Active" | "Trial" | "Paused"
  seats: number
  joined: Date
}

const planOptions = ["Free", "Pro", "Team"] as const
const statusOptions = ["Active", "Trial", "Paused"] as const
const tone = { Active: "success", Trial: "info", Paused: "neutral" } as const

const sampleCustomers: Customer[] = [
  ["Ada Lovelace", "Analytical Labs", "Team", "Active", 24, "2025-03-12"],
  ["Grace Hopper", "Compiler Co", "Pro", "Active", 8, "2025-06-02"],
  ["Linus Pauling", "Helix Studio", "Free", "Trial", 1, "2026-10-28"],
  ["Margaret Hamilton", "Apollo Systems", "Team", "Active", 41, "2024-11-19"],
  ["Alan Turing", "Enigma Works", "Pro", "Paused", 5, "2025-01-07"],
  ["Katherine Johnson", "Orbit Analytics", "Pro", "Active", 12, "2025-09-23"],
  ["Hedy Lamarr", "Spectrum Labs", "Free", "Trial", 2, "2026-11-03"],
  ["Barbara Liskov", "Substitution Inc", "Team", "Active", 18, "2025-04-30"],
].map(([name, company, plan, status, seats, joined], i) => ({
  id: `C-${1001 + i}`,
  name: name as string,
  email: `${(name as string).split(" ")[0]!.toLowerCase()}@example.com`,
  company: company as string,
  plan: plan as Customer["plan"],
  status: status as Customer["status"],
  seats: seats as number,
  joined: new Date(joined as string),
}))

const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })

export { day, planOptions, sampleCustomers, statusOptions, tone }
export type { Customer }
