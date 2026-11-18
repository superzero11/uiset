"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { AppShell, SidebarGroup, SidebarItem, SidebarNav } from "../app-shell"
import { Avatar, AvatarFallback } from "../avatar"
import { Badge } from "../badge"
import {
  Board,
  BoardCardDialog,
  BoardToolbar,
  createBoardController,
  type BoardCardData,
  type BoardLanesChange,
} from "../board"
import { Button } from "../button"
import { DataGrid, type DataGridColumn } from "../data-grid"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../dialog"
import { Field, FieldError, FieldLabel, Input } from "../field"
import { Meter, MeterIndicator, MeterTrack, MeterValue } from "../meter"
import { PageHeader } from "../page-header"
import { SegmentedControl, SegmentedControlItem } from "../segmented-control"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "../select"
import { Icon } from "../shell/icons"
import { toast } from "../toast"
import {
  columnOf,
  dateOf,
  dueDay,
  initials,
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
  type Issue,
  type IssueColumn,
  type Lanes,
} from "./project-sample"
import "./templates.css"

// A project's issue tracker: the sprint's progress, and its issues as a board or a list.
// Both views read one set of cards and lanes, and the board's dialog edits a card from
// either. The board stays mounted while the list shows, so its rules (column limits)
// hold for edits made from the list too. Mount <Toaster /> once.

type IssueRow = Issue & { status: string; column: string }

function ProjectBoardTemplate({
  defaultCards = sampleIssues,
  defaultLanes = sampleLanes,
  columns = sampleColumns,
  people = samplePeople,
  labels = sampleLabels,
  brand = "Acme Projects",
  title = "Website relaunch",
  description = "Sprint 24 runs until Friday, November 27.",
  today = "2026-11-16",
  contentElement = "main",
  onSave,
  onMove,
  onCreate,
  onDelete,
}: {
  /** The issues by id when the page opens; the template keeps them after that. */
  defaultCards?: Readonly<Record<string, Issue>>
  /** Each column's issue ids, in order. */
  defaultLanes?: Readonly<Lanes>
  /** The board's columns; a `limit` caps how many issues one holds. The last one is "done". */
  columns?: IssueColumn[]
  /** People an issue can be assigned to; the header shows them as members. */
  people?: string[]
  labels?: string[]
  brand?: ReactNode
  title?: string
  description?: ReactNode
  /** Today, for overdue dates. Pass the real date in an app; it's fixed for the sample. */
  today?: string
  contentElement?: "main" | "div"
  /** Saves an edited issue. */
  onSave?: (issue: Issue) => void
  /** Saves a move to another column, by a person, an agent or an Undo. */
  onMove?: (id: string, column: string) => void
  /** Saves a new issue in its column. */
  onCreate?: (issue: Issue, column: string) => void
  onDelete?: (issue: Issue) => void
}) {
  const [board] = useState(createBoardController)
  const [cards, setCards] = useState<Record<string, Issue>>({ ...defaultCards })
  const [lanes, setLanes] = useState<Lanes>(() =>
    Object.fromEntries(columns.map((c) => [c.id, [...(defaultLanes[c.id] ?? [])]])),
  )
  const [view, setView] = useState<"board" | "list">("board")
  const [query, setQuery] = useState("")
  const [person, setPerson] = useState<string | null>(null)
  const [open, setOpen] = useState<BoardCardData | null>(null)
  const [creating, setCreating] = useState(false)
  const [opened, setOpened] = useState(0)
  // Undo reads the lanes as they are when it's pressed, not as they were at the move.
  const lanesRef = useRef(lanes)
  useEffect(() => {
    lanesRef.current = lanes
  })
  const undoing = useRef(false)

  const titleOf = (column: string) =>
    columns.find((c) => c.id === column)?.title ?? column
  const { done, total, text: progressText } = progress(lanes, columns)
  const filter = (card: BoardCardData) => matches(card, query, person)
  const rows: IssueRow[] = columns.flatMap((c) =>
    (lanes[c.id] ?? []).flatMap((id) =>
      cards[id] && filter(cards[id]!)
        ? [{ ...cards[id]!, status: c.title, column: c.id }]
        : [],
    ),
  )
  const doneColumn = columns.at(-1)?.id

  const undoMove = (key: string, from: string, to: string, at: number) => {
    if (!lanesRef.current[to]?.includes(key)) return
    undoing.current = true
    try {
      board.moveCard(key, from, at + 1)
      onMove?.(key, from)
      // At once, as the card renders: a toast that no longer has focus doesn't hand it on.
      if (view === "board") board.focusCard(key)
    } catch (failure) {
      toast((failure as Error).message)
    } finally {
      undoing.current = false
    }
  }

  const changeLanes = (next: Lanes, { key, from, to }: BoardLanesChange) => {
    const at = lanes[from]?.indexOf(key) ?? -1
    setLanes(next)
    if (from === to || undoing.current || at < 0) return
    onMove?.(key, to)
    toast(`Moved “${cards[key]?.title}” to ${titleOf(to)}`, {
      action: { label: "Undo", onAction: () => undoMove(key, from, to, at) },
    })
  }

  const remove = (card: BoardCardData) => {
    const column = columnOf(lanes, card.id)
    if (!column) return
    const at = lanes[column]!.indexOf(card.id)
    setLanes((all) => ({ ...all, [column]: all[column]!.filter((id) => id !== card.id) }))
    onDelete?.(card)
    toast(`Deleted “${card.title}”`, {
      action: {
        label: "Undo",
        onAction: () =>
          setLanes((all) => {
            const lane = [...(all[column] ?? [])]
            lane.splice(Math.min(at, lane.length), 0, card.id)
            return { ...all, [column]: lane }
          }),
      },
    })
  }

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const column = String(data.get("issue-column") || columns[0]!.id)
    if (!board.hasRoom("", column)) {
      toast(`${titleOf(column)} is full. Finish an issue there first.`)
      return
    }
    const issue: Issue = {
      id: crypto.randomUUID(),
      title: String(data.get("issue-title")),
      assignee: String(data.get("issue-assignee") ?? "") || undefined,
      priority: String(data.get("issue-priority") || "medium") as Issue["priority"],
      due: String(data.get("issue-due") ?? "") || undefined,
      labels: [],
    }
    setCards((all) => ({ ...all, [issue.id]: issue }))
    setLanes((all) => ({ ...all, [column]: [...(all[column] ?? []), issue.id] }))
    onCreate?.(issue, column)
    setCreating(false)
    toast(`Added “${issue.title}” to ${titleOf(column)}`)
  }

  const issueColumns: DataGridColumn<IssueRow>[] = [
    {
      id: "title",
      header: "Title",
      value: (i) => i.title,
      width: 280,
      hideable: false,
      pinned: true,
    },
    {
      id: "status",
      header: "Status",
      value: (i) => i.status,
      width: 130,
      render: (i) => (
        <Badge
          tone={
            i.column === doneColumn
              ? "success"
              : i.column === columns[0]?.id
                ? "neutral"
                : "info"
          }
        >
          {i.status}
        </Badge>
      ),
    },
    {
      id: "assignee",
      header: "Assignee",
      value: (i) => i.assignee ?? "",
      text: (i) => i.assignee ?? "Nobody",
      width: 170,
    },
    {
      id: "priority",
      header: "Priority",
      type: "number",
      align: "start",
      value: (i) => priorityOf(i).rank,
      text: (i) => priorityOf(i).label,
      width: 110,
      render: (i) => <Badge tone={priorityOf(i).tone}>{priorityOf(i).label}</Badge>,
    },
    {
      id: "due",
      header: "Due",
      type: "date",
      value: (i) => (i.due ? dateOf(i.due) : null),
      text: (i) => (i.due ? dueDay.format(dateOf(i.due)) : ""),
      width: 120,
      render: (i) =>
        i.due && i.due < today && i.column !== doneColumn ? (
          <span className="project-overdue">Overdue, {dueDay.format(dateOf(i.due))}</span>
        ) : i.due ? (
          dueDay.format(dateOf(i.due))
        ) : null,
    },
  ]

  return (
    <div className="template-shell">
      <AppShell
        label="Project navigation"
        brand={<span className="template-brand">{brand}</span>}
        contentElement={contentElement}
        sidebar={
          <SidebarNav label="Projects and issues">
            <SidebarGroup>
              <SidebarItem href="#my-issues" icon={<Icon name="inbox" />}>
                My issues
              </SidebarItem>
            </SidebarGroup>
            <SidebarGroup title="Projects">
              {projects.map((p) => (
                <SidebarItem
                  key={p.id}
                  href={`#${p.id}`}
                  current={p.label === title}
                  icon={<Icon name={p.icon} />}
                >
                  {p.label}
                </SidebarItem>
              ))}
            </SidebarGroup>
          </SidebarNav>
        }
      >
        <div className="project">
          <PageHeader
            title={title}
            description={description}
            actions={
              <div className="project-actions">
                <ul className="project-members" aria-label="Members">
                  {people.map((p) => (
                    <li key={p}>
                      <Avatar role="img" aria-label={p} className="project-member">
                        <AvatarFallback>{initials(p)}</AvatarFallback>
                      </Avatar>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => {
                    setOpened((n) => n + 1)
                    setCreating(true)
                  }}
                >
                  <Icon name="plus" />
                  New issue
                </Button>
              </div>
            }
          />
          <Meter
            className="project-progress"
            value={done}
            max={Math.max(total, 1)}
            aria-label="Sprint progress"
            format={() => progressText}
          >
            <span className="project-progress-label">Sprint progress</span>
            <MeterValue />
            <MeterTrack>
              <MeterIndicator />
            </MeterTrack>
          </Meter>
          <BoardToolbar
            label="Issues"
            query={query}
            onQueryChange={setQuery}
            people={people}
            person={person}
            onPersonChange={setPerson}
          >
            <SegmentedControl
              aria-label="View"
              className="project-view-switch"
              value={view}
              onValueChange={(value) => value && setView(value as typeof view)}
            >
              <SegmentedControlItem value="board">Board</SegmentedControlItem>
              <SegmentedControlItem value="list">List</SegmentedControlItem>
            </SegmentedControl>
          </BoardToolbar>
          <div className="project-view" hidden={view !== "board"}>
            <Board
              label="Issue board"
              controller={board}
              columns={columns}
              cards={cards}
              lanes={lanes}
              today={today}
              filter={filter}
              onLanesChange={changeLanes}
              onCardOpen={setOpen}
              onAddCard={(column, name) => {
                const issue: Issue = {
                  id: crypto.randomUUID(),
                  title: name,
                  priority: "medium",
                }
                setCards((all) => ({ ...all, [issue.id]: issue }))
                setLanes((all) => ({
                  ...all,
                  [column]: [...(all[column] ?? []), issue.id],
                }))
                onCreate?.(issue, column)
                return issue.id
              }}
            />
          </div>
          {view === "list" && (
            <div className="project-view">
              <DataGrid
                label="Issue list"
                rows={rows}
                columns={issueColumns}
                getRowId={(i) => i.id}
                onRowAction={(i) => setOpen(cards[i.id] ?? null)}
                height="26rem"
                locale="en-US"
                empty={
                  query || person
                    ? "No issues match. Clear the search or choose Anyone."
                    : "No issues yet."
                }
              />
            </div>
          )}
        </div>
        <BoardCardDialog
          board={board}
          card={open}
          column={open ? columnOf(lanes, open.id) : undefined}
          columns={columns}
          people={people}
          labels={labels}
          onClose={() => setOpen(null)}
          onSave={(card) => {
            setCards((all) => ({ ...all, [card.id]: card }))
            onSave?.(card)
          }}
          onDelete={remove}
        />
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogBackdrop />
          <DialogContent className="board-dialog">
            <DialogTitle>New issue</DialogTitle>
            <DialogDescription>It goes at the end of its column.</DialogDescription>
            <form
              key={opened}
              className="board-dialog-form"
              onSubmit={create}
              aria-label="New issue"
            >
              <Field name="issue-title">
                <FieldLabel>Title</FieldLabel>
                <Input required autoComplete="off" />
                <FieldError match="valueMissing">An issue needs a title.</FieldError>
              </Field>
              <div className="board-dialog-row">
                <Field name="issue-column">
                  <Select name="issue-column" defaultValue={columns[0]?.id}>
                    <SelectLabel>Column</SelectLabel>
                    <SelectTrigger />
                    <SelectContent>
                      {columns.map((c) => {
                        const full =
                          c.limit !== undefined && (lanes[c.id]?.length ?? 0) >= c.limit
                        return (
                          <SelectItem key={c.id} value={c.id} disabled={full}>
                            {full ? `${c.title} (full)` : c.title}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </Field>
                <Field name="issue-assignee">
                  <Select name="issue-assignee" defaultValue="">
                    <SelectLabel>Assignee</SelectLabel>
                    <SelectTrigger />
                    <SelectContent>
                      <SelectItem value="">Nobody</SelectItem>
                      {people.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="board-dialog-row">
                <Field name="issue-due">
                  <FieldLabel>Due date</FieldLabel>
                  <Input type="date" />
                </Field>
                <Field name="issue-priority">
                  <Select name="issue-priority" defaultValue="medium">
                    <SelectLabel>Priority</SelectLabel>
                    <SelectTrigger />
                    <SelectContent>
                      {[...priorities].reverse().map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="board-dialog-actions">
                <span className="board-dialog-spacer" />
                <DialogClose>Cancel</DialogClose>
                <Button type="submit">Add issue</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </AppShell>
    </div>
  )
}

export { ProjectBoardTemplate, sampleIssues }
export type { Issue as ProjectIssue, IssueColumn as ProjectColumn }
