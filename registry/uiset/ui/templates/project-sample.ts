// The project board template's sample project: its columns (with work-in-progress limits),
// people, labels and issues, framework-free, so the React template and the web page show
// the same sprint. An issue has the Board's card shape.
import type { IconName } from "../shell/icon-paths"

type Priority = "low" | "medium" | "high" | "urgent"
type Issue = {
  id: string
  title: string
  description?: string
  labels?: string[]
  assignee?: string
  /** An ISO date, like "2026-11-20". */
  due?: string
  priority?: Priority
}
type IssueColumn = { id: string; title: string; limit?: number }
/** Each column's issue ids, in order. */
type Lanes = Record<string, string[]>

// Each project its own icon, so the collapsed sidebar tells them apart.
const projects: { id: string; label: string; icon: IconName }[] = [
  { id: "website", label: "Website relaunch", icon: "home" },
  { id: "mobile", label: "Mobile app", icon: "folder" },
  { id: "billing", label: "Billing", icon: "card" },
]

const sampleColumns: IssueColumn[] = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "In progress", limit: 3 },
  { id: "review", title: "In review", limit: 3 },
  { id: "done", title: "Done" },
]

const samplePeople = [
  "Ada Lovelace",
  "Grace Hopper",
  "Katherine Johnson",
  "Alan Turing",
  "Margaret Hamilton",
]
const sampleLabels = ["Design", "Frontend", "Content", "SEO", "Bug"]

// Done issues carry no due date: a board marks a past due date as overdue.
const sampleIssues: Record<string, Issue> = Object.fromEntries(
  (
    [
      [
        "p1",
        "Write the pricing page copy",
        ["Content"],
        "Katherine Johnson",
        "2026-11-24",
        "medium",
        "Three plans, the comparison table and the questions under it.",
      ],
      [
        "p2",
        "Redirect the old blog URLs",
        ["Frontend", "SEO"],
        "Alan Turing",
        "2026-11-20",
        "high",
        "Every post keeps its address; the sitemap lists the new ones.",
      ],
      [
        "p3",
        "Cookie consent banner",
        ["Frontend"],
        undefined,
        undefined,
        "low",
        undefined,
      ],
      [
        "p4",
        "Alt text for product images",
        ["Content"],
        "Margaret Hamilton",
        "2026-11-25",
        "low",
        undefined,
      ],
      [
        "p5",
        "Choose the hero illustration",
        ["Design"],
        "Ada Lovelace",
        "2026-11-19",
        "medium",
        "Two directions are in the shared folder.",
      ],
      [
        "p6",
        "Build the new navigation",
        ["Frontend", "Design"],
        "Grace Hopper",
        "2026-11-18",
        "high",
        "Menus open on click, close on Escape, and work on phones.",
      ],
      [
        "p7",
        "Customer stories page",
        ["Content", "Design"],
        "Katherine Johnson",
        "2026-11-23",
        "medium",
        undefined,
      ],
      [
        "p8",
        "Fix the contact form on Safari",
        ["Bug"],
        "Alan Turing",
        "2026-11-13",
        "urgent",
        "Submitting does nothing in Safari 18; the error is in the console.",
      ],
      [
        "p9",
        "Footer links and legal pages",
        ["Frontend"],
        "Margaret Hamilton",
        "2026-11-17",
        "medium",
        undefined,
      ],
      [
        "p10",
        "Search results layout",
        ["Design"],
        "Ada Lovelace",
        "2026-11-20",
        "medium",
        undefined,
      ],
      [
        "p11",
        "Audit the current sitemap",
        ["SEO"],
        "Grace Hopper",
        undefined,
        "low",
        undefined,
      ],
      [
        "p12",
        "Set up preview deployments",
        ["Frontend"],
        "Alan Turing",
        undefined,
        "medium",
        undefined,
      ],
      [
        "p13",
        "Pick the new type scale",
        ["Design"],
        "Ada Lovelace",
        undefined,
        "medium",
        undefined,
      ],
      [
        "p14",
        "Draft the launch announcement",
        ["Content"],
        "Katherine Johnson",
        undefined,
        "low",
        undefined,
      ],
    ] as const
  ).map(([id, title, labels, assignee, due, priority, description]) => [
    id,
    { id, title, labels: [...labels], assignee, due, priority, description } as Issue,
  ]),
)

const sampleLanes: Lanes = {
  todo: ["p1", "p2", "p3", "p4", "p5"],
  doing: ["p6", "p7", "p8"],
  review: ["p9", "p10"],
  done: ["p11", "p12", "p13", "p14"],
}

const priorities: {
  value: Priority
  label: string
  rank: number
  tone: "danger" | "warning" | "neutral"
}[] = [
  { value: "urgent", label: "Urgent", rank: 4, tone: "danger" },
  { value: "high", label: "High", rank: 3, tone: "warning" },
  { value: "medium", label: "Medium", rank: 2, tone: "neutral" },
  { value: "low", label: "Low", rank: 1, tone: "neutral" },
]
const priorityOf = (issue: Issue) =>
  priorities.find((p) => p.value === (issue.priority ?? "medium"))!

const dueDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const longDay = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})
const dateOf = (iso: string) => new Date(`${iso}T00:00:00Z`)
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

/** Which column an issue is in. */
const columnOf = (lanes: Lanes, id: string) =>
  Object.keys(lanes).find((column) => lanes[column]!.includes(id))

/** "4 of 14 issues done", from the last column's count. */
function progress(lanes: Lanes, columns: IssueColumn[]) {
  const total = Object.values(lanes).reduce((sum, ids) => sum + ids.length, 0)
  const done = lanes[columns.at(-1)!.id]?.length ?? 0
  return {
    done,
    total,
    text: `${done} of ${total} ${total === 1 ? "issue" : "issues"} done`,
  }
}

/** Search words and a person: what both views show. */
function matches(issue: Issue, query: string, person: string | null) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text =
    `${issue.title} ${issue.labels?.join(" ") ?? ""} ${issue.assignee ?? ""}`.toLowerCase()
  return (!person || issue.assignee === person) && words.every((w) => text.includes(w))
}

export {
  columnOf,
  dateOf,
  dueDay,
  initials,
  longDay,
  matches,
  priorities,
  priorityOf,
  progress,
  projects,
  sampleColumns,
  sampleIssues,
  sampleLabels,
  sampleLanes,
  samplePeople,
}
export type { Issue, IssueColumn, Lanes, Priority }
