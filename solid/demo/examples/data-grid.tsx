import { createSignal } from "solid-js"
import {
  DataGrid,
  DataGridToolbar,
  type DataGridColumn,
} from "../../src/data-grid"

type Task = {
  id: string
  title: string
  owner: string
  status: string
  points: number
  due: Date
  done: boolean
}

const owners = ["Ada", "Grace", "Linus", "Margaret"]
const taskStatuses = ["Backlog", "In progress", "In review", "Done"]
const tasks: Task[] = [
  ["Ship the invoice export", "Ada", "In progress", 5, "2026-11-20"],
  ["Fix the login redirect", "Linus", "In review", 2, "2026-11-17"],
  ["Rate-limit the public API", "Grace", "Backlog", 8, "2026-12-02"],
  ["Dark mode for charts", "Margaret", "In progress", 3, "2026-11-21"],
  ["Audit the cookie banner", "Ada", "Done", 1, "2026-11-12"],
  ["Retry failed webhooks", "Grace", "In review", 5, "2026-11-18"],
  ["Onboarding checklist", "Margaret", "Backlog", 3, "2026-12-05"],
  ["Search across projects", "Linus", "In progress", 8, "2026-11-28"],
  ["Remove the old billing tables", "Grace", "Done", 2, "2026-11-10"],
  ["Keyboard shortcuts sheet", "Ada", "Backlog", 2, "2026-12-08"],
].map(([title, owner, status, points, due], index) => ({
  id: `T-${101 + index}`,
  title: title as string,
  owner: owner as string,
  status: status as string,
  points: points as number,
  due: new Date(due as string),
  done: status === "Done",
}))

const shortDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const taskColumns: DataGridColumn<Task>[] = [
  {
    id: "title",
    header: "Task",
    value: (t) => t.title,
    width: 240,
    editable: true,
    groupable: false,
  },
  {
    id: "owner",
    header: "Owner",
    value: (t) => t.owner,
    width: 120,
    options: owners,
    editable: true,
  },
  {
    id: "status",
    header: "Status",
    value: (t) => t.status,
    width: 130,
    options: taskStatuses,
    editable: true,
  },
  {
    id: "points",
    header: "Points",
    type: "number",
    value: (t) => t.points,
    width: 100,
    editable: true,
    groupable: false,
  },
  {
    id: "due",
    header: "Due",
    type: "date",
    value: (t) => t.due,
    text: (t) => shortDay.format(t.due),
    width: 110,
    groupable: false,
  },
  {
    id: "done",
    header: "Done",
    type: "boolean",
    value: (t) => t.done,
    width: 100,
    editable: true,
  },
]

export default function DataGridExample() {
  const [rows, setRows] = createSignal(tasks)
  return (
    <DataGrid
      label="Sprint tasks"
      rows={rows()}
      columns={taskColumns}
      getRowId={(t) => t.id}
      selectable
      defaultGroupBy="status"
      onCellEdit={({ rowId, column, value }) => {
        setRows((current) => current.map((t) => (t.id === rowId ? { ...t, [column]: value } : t)))
      }}
      height="22rem"
    >
      <DataGridToolbar filename="sprint-tasks" />
    </DataGrid>
  )
}
