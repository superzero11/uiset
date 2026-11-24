"use client"

import { keepFocus, type StateOf, type TransferLists, type TransferMessage } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive"
import { useCallback, useId, useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog"
import { Avatar, AvatarFallback } from "./avatar"
import { Badge } from "./badge"
import { Button } from "./button"
import { Checkbox, CheckboxGroup } from "./checkbox"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog"
import { Field, FieldError, FieldLabel, Input } from "./field"
import { Label } from "./label"
import { ScrollBox } from "./scroll-area"
import { SearchField } from "./search-field"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"
import { glide } from "./shell/glide"
import { Icon } from "./shell/icons"
import { Textarea } from "./textarea"
import {
  boardPrimitive,
  createBoardController,
  type BoardColumnSpec,
  type BoardController,
  type BoardLanesDetails,
  keepDragPreviewInside,
} from "./board/board"
import "./shell/shell.css"
import "./board/board.css"

type BoardCardData = {
  id: string
  title: string
  description?: string
  labels?: string[]
  assignee?: string
  /** An ISO date, like "2026-11-20". */
  due?: string
  priority?: "low" | "medium" | "high" | "urgent"
}

type BoardLanesChange = BoardLanesDetails

type BoardMessages = {
  /** How the board works by keyboard, read when focus enters it. */
  help?: string
  /** Shown in an empty column. */
  empty?: string
  /** Shown under a full column. */
  full?: string
  /** Read when Space can't pick a card up because a filter is on. */
  filtered?: string
}

type BoardProps = {
  /** The board's name, for people and agents. */
  label: string
  columns: BoardColumnSpec[]
  cards: Record<string, BoardCardData>
  lanes?: TransferLists
  defaultLanes?: TransferLists
  onLanesChange?: (lanes: TransferLists, details: BoardLanesChange) => void
  /** Enter or a click on a card. Without it, cards don't open. */
  onCardOpen?: (card: BoardCardData) => void
  /**
   * Shows "Add a card" under each column. Return the new card's id: an uncontrolled board
   * adds it to the column, and focus can follow it when the column fills.
   */
  onAddCard?: (column: string, title: string) => string | void
  /** Cards that don't match stay in place but are hidden, focus skips them, and moves wait. */
  filter?: (card: BoardCardData) => boolean
  /** Cards that can't be moved, like archived ones. */
  locked?: (card: BoardCardData) => boolean
  renderCard?: (card: BoardCardData) => ReactNode
  /** What screen readers hear for a card, besides its title. Defaults to its priority, due date, person and labels. */
  describeCard?: (card: BoardCardData) => string
  /** What screen readers hear for each step of a move. Defaults to English. */
  moveMessage?: (message: TransferMessage) => string
  messages?: BoardMessages
  /** Lets a card dialog, or other code, move and focus cards: `createBoardController()`. */
  controller?: BoardController
  /** Today, for "overdue". Pass the real date in an app; it's fixed here so pages render the same. */
  today?: string
  className?: string
}

type CardState = StateOf<typeof boardPrimitive, "card">

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
const dueFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const dueText = (due: string) => dueFormat.format(new Date(`${due}T00:00:00Z`))
const isOverdue = (card: BoardCardData, today?: string) => (card.due && today ? card.due < today : false)

const priorityText = (card?: BoardCardData) =>
  card?.priority === "urgent" ? "Urgent" : card?.priority === "high" ? "High priority" : undefined

/** What a screen reader hears after a card's title: the details its face shows. */
function describeCardDefault(card: BoardCardData, today?: string) {
  return [
    priorityText(card),
    card.due ? `${isOverdue(card, today) ? "Overdue" : "Due"} ${dueText(card.due)}` : undefined,
    card.assignee,
    card.labels?.length ? `Labels: ${card.labels.join(", ")}` : undefined,
  ]
    .filter(Boolean)
    .join(". ")
}

/** What an agent reads for a card: its title and column, then its priority, person, due date and labels. */
function agentCardLabel(key: string, column: string, card?: BoardCardData) {
  const details = [column, priorityText(card), card?.assignee, card?.due && `due ${card.due}`].filter(Boolean)
  const labels = card?.labels?.length ? `; labels: ${card.labels.join(", ")}` : ""
  return `${card?.title ?? key} (${details.join(", ")}${labels})`
}

/** A card's face: title, labels, due date and the person on it. */
function BoardCardFace({ card, today }: { card: BoardCardData; today?: string }) {
  const overdue = isOverdue(card, today)
  return (
    <>
      <span className="board-card-title">{card.title}</span>
      {card.labels?.length ? (
        <span className="board-card-labels">
          {card.labels.map((label) => (
            <Badge key={label} tone="neutral">
              {label}
            </Badge>
          ))}
        </span>
      ) : null}
      {(card.due || card.assignee || card.priority === "high" || card.priority === "urgent") && (
        <span className="board-card-meta">
          {(card.priority === "high" || card.priority === "urgent") && (
            <Badge tone={card.priority === "urgent" ? "danger" : "warning"}>
              {card.priority === "urgent" ? "Urgent" : "High"}
            </Badge>
          )}
          {card.due && (
            <span className="board-card-due" data-overdue={overdue ? "" : undefined}>
              {overdue ? "Overdue, " : "Due "}
              {dueText(card.due)}
            </span>
          )}
          {card.assignee && (
            <Avatar role="img" aria-label={card.assignee} className="board-card-avatar">
              <AvatarFallback>{initials(card.assignee)}</AvatarFallback>
            </Avatar>
          )}
        </span>
      )}
    </>
  )
}

function BoardColumnPart({ value, ...props }: { value: string } & PartProps<"div">) {
  return usePart(boardPrimitive, "column", { value }, props, "div")
}

function BoardCardPart({
  value,
  filtered,
  ...props
}: { value: string; filtered: boolean } & PartProps<"div", CardState>) {
  return usePart(boardPrimitive, "card", { value, filtered }, props, "div")
}

function AddCard({
  column,
  title,
  room,
  onAdd,
  onFilled,
}: {
  column: string
  title: string
  /** How many more cards the column takes, or Infinity. */
  room: number
  onAdd: (column: string, title: string) => string | true
  onFilled: (key: string | true) => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  // Closing the form unmounts the field that had focus; hand it back to the button.
  const close = () => {
    setOpen(false)
    setError(null)
    keepFocus(() => button.current ?? undefined)
  }
  if (!open)
    return (
      <Button ref={button} variant="ghost" className="board-add" onClick={() => setOpen(true)}>
        <Icon name="plus" />
        Add a card to {title}
      </Button>
    )
  return (
    <form
      className="board-add-form"
      aria-label={`New card in ${title}`}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = event.currentTarget
        const text = String(new FormData(form).get("title") ?? "").trim()
        if (!text) return
        try {
          const key = onAdd(column, text)
          setError(null)
          form.reset()
          // The card that fills the column takes the form's place, and focus.
          if (room <= 1) onFilled(key)
        } catch (failure) {
          setError((failure as Error).message)
        }
      }}
    >
      <Field name="title">
        <FieldLabel className="uiset-visually-hidden">Title of the new card in {title}</FieldLabel>
        <Input
          autoFocus
          required
          autoComplete="off"
          placeholder="What needs doing?"
          aria-invalid={error ? true : undefined}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              close()
            }
          }}
        />
        {error && <p className="board-add-error" role="alert">{error}</p>}
      </Field>
      <div className="board-add-actions">
        <Button type="submit">Add card</Button>
        <Button variant="ghost" type="button" onClick={close}>
          Done adding
        </Button>
      </div>
    </form>
  )
}

/**
 * A kanban board. Tab reaches it once; arrows move between cards and columns; Space picks
 * a card up, arrows carry it, Space drops it and Escape puts it back; Enter opens it.
 */
function Board({
  label,
  columns,
  cards,
  lanes,
  defaultLanes,
  onLanesChange,
  onCardOpen,
  onAddCard,
  filter,
  locked,
  renderCard,
  describeCard,
  moveMessage,
  messages,
  controller,
  today,
  className,
}: BoardProps) {
  const baseId = useId()
  const helpId = `${baseId}-help`
  const hidden = filter
    ? Object.values(cards)
        .filter((card) => !filter(card))
        .map((card) => card.id)
    : []
  const handle = usePrimitive(boardPrimitive, {
    lanes,
    defaultLanes,
    onLanesChange: onLanesChange as never,
    columns,
    cardLabel: (key) => cards[key]?.title ?? key,
    locked: locked ? (key) => !!cards[key] && locked(cards[key]!) : undefined,
    hidden,
    onOpen: onCardOpen ? (key) => cards[key] && onCardOpen(cards[key]!) : undefined,
    onAdd: onAddCard ? (column, { title }) => onAddCard(column, title) : undefined,
    message: moveMessage,
    filteredMessage: messages?.filtered,
    controller,
    // Agents read items as { value, label }: the label holds where a card is and what its face shows.
    items: (current) =>
      columns.flatMap((column) =>
        (current[column.id] ?? []).map((key) => ({ value: key, label: agentCardLabel(key, column.title, cards[key]) })),
      ),
  })
  const hiddenSet = new Set(hidden)
  // A dragged card's copy stays inside the board, keeping its look (see keepDragPreviewInside),
  // and cards slide to their new places, across columns too.
  const keepPreview = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const stopPreview = keepDragPreviewInside(el)
    const stopGlide = glide(el, ".board-card")
    return () => {
      stopPreview?.()
      stopGlide()
    }
  }, [])
  // Only a hidden card that's on the board counts as filtering: the board's own rule.
  const filtering = Object.values(lanes ?? handle.api.lanes()).some((keys) => keys.some((key) => hiddenSet.has(key)))

  return usePart(
    handle,
    "root",
    {},
    {
      "aria-label": label,
      "aria-describedby": helpId,
      "data-filtered": filtering ? "" : undefined,
      className: ["board", className].filter(Boolean).join(" "),
      ref: keepPreview,
      children: ({ lanes: lists }: { lanes: TransferLists }) => {
        return (
          <>
            <p id={helpId} hidden>
              {messages?.help ??
                "Arrow keys move between cards and columns. Space picks a card up; arrows move it; Space drops it; Escape puts it back. Enter opens a card."}
            </p>
            <ScrollBox axis="x" data-frame="none" className="board-frame" viewport={{ className: "board-scroller", role: "group", "aria-label": "Columns" }}>
              <div className="board-lanes">
                {columns.map((column) => {
                  const keys = lists[column.id] ?? []
                  const room = column.limit === undefined ? Infinity : column.limit - keys.length
                  const full = room <= 0
                  const headingId = `${baseId}-${column.id}`
                  return (
                    <div key={column.id} className="board-column" data-full={full ? "" : undefined}>
                      <div className="board-column-header">
                        <h3 id={headingId} className="board-column-title">
                          {column.title}
                        </h3>
                        <span className="board-column-count">
                          <span aria-hidden="true">
                            {keys.length}
                            {column.limit !== undefined && ` / ${column.limit}`}
                          </span>
                          <span className="uiset-visually-hidden">
                            {column.limit !== undefined ? `${keys.length} of ${column.limit} cards` : `${keys.length} cards`}
                          </span>
                        </span>
                      </div>
                      <BoardColumnPart value={column.id} className="board-cards" aria-labelledby={headingId}>
                        {keys.map((key) => {
                          const card = cards[key]
                          if (!card) return null
                          const descriptionId = `${baseId}-${key}-details`
                          const description = describeCard ? describeCard(card) : describeCardDefault(card, today)
                          return (
                            <BoardCardPart
                              key={key}
                              value={key}
                              className="board-card"
                              filtered={hiddenSet.has(key)}
                              aria-label={card.title}
                              aria-describedby={description ? descriptionId : undefined}
                            >
                              {renderCard ? renderCard(card) : <BoardCardFace card={card} today={today} />}
                              {description && (
                                <span id={descriptionId} hidden>
                                  {description}
                                </span>
                              )}
                              <span className="board-card-handle" data-board-handle="" aria-hidden="true">
                                <Icon name="grip" />
                              </span>
                            </BoardCardPart>
                          )
                        })}
                      </BoardColumnPart>
                      {!keys.length && <p className="board-column-empty">{messages?.empty ?? "No cards"}</p>}
                      {onAddCard && !full && (
                        <AddCard
                          column={column.id}
                          title={column.title}
                          room={room}
                          onAdd={(to, text) => handle.api.addCard(to, text)}
                          onFilled={(key) => {
                            if (typeof key === "string") handle.api.focusCard(key)
                          }}
                        />
                      )}
                      {full && <p className="board-column-note">{messages?.full ?? "Full: finish a card to add more."}</p>}
                    </div>
                  )
                })}
              </div>
            </ScrollBox>
          </>
        )
      },
    } as never,
    "div",
  )
}

/** Search and a person filter for a board. Your filter function decides what matches. */
function BoardToolbar({
  label,
  query,
  onQueryChange,
  people,
  person,
  onPersonChange,
  children,
}: {
  /** What the board holds, like "Cards": the search is "Search cards". Not the board's name. */
  label: string
  query: string
  onQueryChange: (query: string) => void
  people?: string[]
  person?: string | null
  onPersonChange?: (person: string | null) => void
  children?: ReactNode
}) {
  return (
    <div className="board-toolbar" role="group" aria-label={`${label} tools`}>
      <SearchField
        label={`Search ${label.toLowerCase()}`}
        placeholder="Search cards…"
        value={query}
        onValueChange={(value) => onQueryChange(value)}
        shortcut={null}
      />
      {people && onPersonChange && (
        <Select value={person ?? "anyone"} onValueChange={(value) => onPersonChange(value === "anyone" ? null : String(value))}>
          <SelectLabel className="uiset-visually-hidden">Cards for</SelectLabel>
          <SelectTrigger data-variant="outline" />
          <SelectContent>
            <SelectItem value="anyone">Anyone</SelectItem>
            {people.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {children}
    </div>
  )
}

/**
 * A card's details: edit it, move it to another column, or delete it. Moves go through the
 * board, so they keep its column limits and reach `onLanesChange`; focus goes back to the
 * card, or to its neighbor when it's gone.
 */
function BoardCardDialog({
  board,
  card,
  column,
  columns,
  people = [],
  labels = [],
  onSave,
  onDelete,
  onClose,
}: {
  /** The board's controller, from `createBoardController()`, also passed to the Board. */
  board: BoardController
  card: BoardCardData | null
  column: string | undefined
  columns: BoardColumnSpec[]
  /** People a card can be assigned to. Without them, the dialog leaves the assignee alone. */
  people?: string[]
  /** Labels to choose from. Without them, the dialog leaves labels alone; labels it doesn't list are kept. */
  labels?: string[]
  onSave: (card: BoardCardData) => void
  onDelete: (card: BoardCardData) => void
  onClose: () => void
}) {
  // The dialog keeps showing its card while it animates closed.
  const [last, setLast] = useState(card)
  if (card && card !== last) setLast(card)
  const shown = card ?? last
  const [error, setError] = useState<string | null>(null)
  // Where focus goes when the dialog closes: the card, else its neighbor (for a card
  // that's deleted, or that an edit hides from the filter).
  const returnTo = useRef<{ card?: string; neighbor?: string }>({})
  const remember = (key: string, keep: boolean) => {
    returnTo.current = { card: keep ? key : undefined, neighbor: board.neighbor(key) }
  }
  const finalFocus = () => {
    const { card: key, neighbor } = returnTo.current
    return (key && board.cardElement(key)) || (neighbor && board.cardElement(neighbor)) || undefined
  }
  const assignees = shown?.assignee && !people.includes(shown.assignee) ? [shown.assignee, ...people] : people
  // The delete alert renders beside the form, not in it: forms don't nest.
  const [content, setContent] = useState<HTMLElement | null>(null)

  return (
    <Dialog
      open={card !== null}
      onOpenChange={(open: boolean) => {
        if (open) return
        if (card) remember(card.id, true)
        setError(null)
        onClose()
      }}
    >
      <DialogBackdrop />
      <DialogContent ref={setContent} className="board-dialog" finalFocus={finalFocus}>
        {shown && (
          <>
            <DialogTitle>{shown.title}</DialogTitle>
            {/* "In progress column", not "In In progress": column names often start with "In". */}
            <DialogDescription>{columns.find((c) => c.id === column)?.title ?? "No"} column.</DialogDescription>
            <form
              key={shown.id}
              className="board-dialog-form"
              aria-label={`Edit ${shown.title}`}
              onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                const to = String(data.get("card-column") ?? column)
                // Move first: a full column refuses, and nothing is saved.
                if (to && column && to !== column) {
                  try {
                    board.moveCard(shown.id, to)
                  } catch (failure) {
                    setError((failure as Error).message)
                    return
                  }
                }
                const chosen = data.getAll("card-labels").map(String)
                const next: BoardCardData = {
                  ...shown,
                  title: String(data.get("card-title")),
                  description: String(data.get("card-description") ?? "") || undefined,
                  due: String(data.get("card-due") ?? "") || undefined,
                  priority: (String(data.get("card-priority") ?? "medium") as BoardCardData["priority"]) || undefined,
                }
                if (assignees.length) next.assignee = String(data.get("card-assignee") ?? "") || undefined
                if (labels.length)
                  next.labels = [...(shown.labels ?? []).filter((label) => !labels.includes(label)), ...chosen]
                onSave(next)
                remember(shown.id, true)
                setError(null)
                onClose()
              }}
            >
              <Field name="card-title">
                <FieldLabel>Title</FieldLabel>
                <Input required defaultValue={shown.title} autoComplete="off" />
                <FieldError match="valueMissing">A card needs a title.</FieldError>
              </Field>
              <Field name="card-description">
                <FieldLabel>Description</FieldLabel>
                <Textarea defaultValue={shown.description} autoResize />
              </Field>
              <div className="board-dialog-row">
                <Field name="card-column">
                  <Select name="card-column" defaultValue={column}>
                    <SelectLabel>Column</SelectLabel>
                    <SelectTrigger />
                    <SelectContent>
                      {columns.map((c) => {
                        const full = c.id !== column && !board.hasRoom(shown.id, c.id)
                        return (
                          <SelectItem key={c.id} value={c.id} disabled={full}>
                            {full ? `${c.title} (full)` : c.title}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </Field>
                {assignees.length > 0 && (
                  <Field name="card-assignee">
                    <Select name="card-assignee" defaultValue={shown.assignee ?? ""}>
                      <SelectLabel>Assignee</SelectLabel>
                      <SelectTrigger />
                      <SelectContent>
                        <SelectItem value="">Nobody</SelectItem>
                        {assignees.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
              <div className="board-dialog-row">
                <Field name="card-due">
                  <FieldLabel>Due date</FieldLabel>
                  <Input type="date" defaultValue={shown.due} />
                </Field>
                <Field name="card-priority">
                  <Select name="card-priority" defaultValue={shown.priority ?? "medium"}>
                    <SelectLabel>Priority</SelectLabel>
                    <SelectTrigger />
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {labels.length > 0 && (
                <CheckboxGroup
                  name="card-labels"
                  aria-label="Labels"
                  defaultValue={(shown.labels ?? []).filter((label) => labels.includes(label))}
                  className="board-dialog-labels"
                >
                  {labels.map((l) => (
                    <Label key={l} className="board-dialog-label">
                      <Checkbox value={l} /> {l}
                    </Label>
                  ))}
                </CheckboxGroup>
              )}
              {error && (
                <p className="board-dialog-error" role="alert">
                  {error}
                </p>
              )}
              <div className="board-dialog-actions">
                <AlertDialog container={content}>
                  <AlertDialogTrigger data-variant="ghost" className="board-delete">
                    <Icon name="trash" />
                    Delete card
                  </AlertDialogTrigger>
                  <AlertDialogBackdrop />
                  <AlertDialogContent>
                    <AlertDialogTitle>Delete “{shown.title}”?</AlertDialogTitle>
                    <AlertDialogDescription>It’s gone for good, with its description.</AlertDialogDescription>
                    <div className="board-dialog-actions">
                      <AlertDialogClose>Keep the card</AlertDialogClose>
                      <AlertDialogClose
                        data-variant="destructive"
                        data-agent-confirm={`Deletes the card “${shown.title}”`}
                        onClick={() => {
                          remember(shown.id, false)
                          onDelete(shown)
                          onClose()
                        }}
                      >
                        Delete for good
                      </AlertDialogClose>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
                <span className="board-dialog-spacer" />
                <DialogClose>Cancel</DialogClose>
                <Button type="submit">Save card</Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { Board, BoardCardDialog, BoardCardFace, BoardToolbar, createBoardController }
export type { BoardCardData, BoardColumnSpec, BoardController, BoardLanesChange, BoardMessages, BoardProps }
