// The settings template's sample account, team, invoices and options, framework-free, so
// the React template and the web page show the same ones.

type Member = { id: string; name: string; email: string; role: "Owner" | "Admin" | "Member"; active: string }
type Invoice = { id: string; date: Date; amount: number; status: "Paid" | "Due" }

const sample = {
  workspace: "Acme Cloud",
  profile: { name: "Ada Lovelace", email: "ada@example.com", bio: "Engineer. Writes the release notes.", timezone: "Europe/London" },
  sessions: [
    { id: "s1", device: "Chrome on macOS", where: "London, this device", when: "Active now", current: true },
    { id: "s2", device: "Safari on iPhone", where: "London", when: "2 hours ago", current: false },
    { id: "s3", device: "Firefox on Windows", where: "Manchester", when: "3 days ago", current: false },
  ],
  members: [
    { id: "m1", name: "Ada Lovelace", email: "ada@example.com", role: "Owner", active: "Now" },
    { id: "m2", name: "Grace Hopper", email: "grace@example.com", role: "Admin", active: "Today" },
    { id: "m3", name: "Linus Pauling", email: "linus@example.com", role: "Member", active: "Yesterday" },
    { id: "m4", name: "Margaret Hamilton", email: "margaret@example.com", role: "Member", active: "Last week" },
  ] as Member[],
  invoices: [
    { id: "INV-1042", date: new Date("2026-11-01"), amount: 490, status: "Due" },
    { id: "INV-1031", date: new Date("2026-10-01"), amount: 490, status: "Paid" },
    { id: "INV-1020", date: new Date("2026-09-01"), amount: 441, status: "Paid" },
    { id: "INV-1009", date: new Date("2026-08-01"), amount: 441, status: "Paid" },
  ] as Invoice[],
}

const timezones = ["Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Asia/Kolkata"]
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })

const notificationGroups = [
  {
    channel: "Email",
    options: [
      { key: "email-mentions", label: "Mentions and replies", on: true },
      { key: "email-digest", label: "Weekly digest", on: true },
      { key: "email-product", label: "Product news", on: false },
    ],
  },
  {
    channel: "Push",
    options: [
      { key: "push-mentions", label: "Mentions", on: true },
      { key: "push-deploys", label: "Failed deploys", on: true },
    ],
  },
]

const usage = [
  { label: "Seats", value: 7, max: 10, unit: "seats" },
  { label: "Storage", value: 41, max: 100, unit: "GB" },
  { label: "Build minutes", value: 2380, max: 3000, unit: "minutes" },
]

export { day, money, notificationGroups, sample, timezones, usage }
export type { Invoice, Member }
