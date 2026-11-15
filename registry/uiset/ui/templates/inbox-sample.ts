// The inbox template's sample mailbox, folders and date formats, framework-free, so the
// React template and the web page show the same mail.
import type { IconName } from "../shell/icon-paths"

type Folder = "inbox" | "starred" | "sent" | "archive" | "trash"
type Message = {
  id: string
  from: string
  email: string
  subject: string
  body: string
  sent: Date
  unread: boolean
  starred: boolean
  folder: Exclude<Folder, "starred">
  label?: string
}

const folders: { id: Folder; label: string; icon: IconName }[] = [
  { id: "inbox", label: "Inbox", icon: "inbox" },
  { id: "starred", label: "Starred", icon: "star" },
  { id: "sent", label: "Sent", icon: "send" },
  { id: "archive", label: "Archive", icon: "archive" },
  { id: "trash", label: "Trash", icon: "trash" },
]

const sampleMessages: Message[] = [
  ["Grace Hopper", "Launch checklist for Thursday", "Here's the list for Thursday. I moved the database migration first so we have time to roll back if the numbers look off. Can you confirm the status page copy?", 0.2, true, true, "Release"],
  ["Linus Pauling", "Invoice INV-1042 is due", "Your November invoice for $490.00 is ready. It's due on December 1. Reply to this message if anything looks wrong.", 2, true, false, "Billing"],
  ["Margaret Hamilton", "Re: on-call schedule", "Swapped the 14th with you. The pager rotation is updated, and I left notes in the runbook for the queue alerts.", 5, false, false, undefined],
  ["Katherine Johnson", "Numbers for the board deck", "Revenue is up 9.6% on October. I've put the cohort charts in the shared folder; the churn slide still needs a sentence.", 26, false, true, undefined],
  ["Alan Turing", "Interview loop next week", "Three candidates for the platform role. I've booked the rooms; could you take the systems design round on Tuesday?", 49, false, false, "Hiring"],
  ["Barbara Liskov", "API deprecation plan", "Draft attached. Old endpoints keep working for six months, with warnings in the headers from the first day.", 75, false, false, undefined],
].map(([from, subject, body, hoursAgo, unread, starred, label], i) => ({
  id: `msg-${i + 1}`,
  from: from as string,
  email: `${(from as string).split(" ")[0]!.toLowerCase()}@example.com`,
  subject: subject as string,
  body: body as string,
  sent: new Date(Date.UTC(2026, 10, 15, 12) - (hoursAgo as number) * 3600000),
  unread: unread as boolean,
  starred: starred as boolean,
  folder: "inbox" as const,
  label: label as string | undefined,
}))

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const full = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" })
const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2)
const when = (d: Date, now: Date) =>
  now.getTime() - d.getTime() < 24 * 3600000 ? time.format(d) : date.format(d)

export { date, folders, full, initials, sampleMessages, time, when }
export type { Folder, Message }
