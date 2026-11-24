import type { JSX } from "@solidjs/web"
import { keepFocus, type StateOf, type TransferLists, type TransferMessage } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/solid/primitive"
import { createMemo, createSignal, createUniqueId, flush, For, omit, onSettled, Show, untrack } from "solid-js"
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
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./dialog"
import { Field, FieldError, FieldLabel, Input } from "./field"
import { Label } from "./label"
import { ScrollBox } from "./scroll-area"
import { SearchField } from "./search-field"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"
import { Icon } from "./shell/icons"
import { Textarea } from "./textarea"
import { glide } from "../../registry/uiset/ui/shell/glide"
import {
  boardPrimitive,
  createBoardController,
  keepDragPreviewInside,
  type BoardColumnSpec,
  type BoardController,
  type BoardLanesDetails,
} from "../../registry/uiset/ui/board/board"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/board/board.css"

// The board in Solid, as React's: columns, cards, keys, moves and the tab stop are the shared
// primitive (board/board.ts). This file holds the faces, the add form and the card dialog.

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
  renderCard?: (card: BoardCardData) => JSX.Element
  /** What screen readers hear for a card, besides its title. Defaults to its priority, due date, person and labels. */
  describeCard?: (card: BoardCardData) => string
  /** What screen readers hear for each step of a move. Defaults to English. */
  moveMessage?: (message: TransferMessage) => string
  messages?: BoardMessages
  /** Lets a card dialog, or other code, move and focus cards: `createBoardController()`. */
  controller?: BoardController
  /** Today, for "overdue". Pass the real date in an app; it's fixed here so pages render the same. */
  today?: string
  class?: string
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

const raised = (card: BoardCardData) => card.priority === "high" || card.priority === "urgent"

/** A card's face: title, labels, due date and the person on it. */
function BoardCardFace(props: { card: BoardCardData; today?: string }) {
  return (
    <>
      <span class="board-card-title">{props.card.title}</span>
      <Show when={props.card.labels?.length}>
        <span class="board-card-labels">
          <For each={props.card.labels ?? []}>{(label) => <Badge tone="neutral">{label}</Badge>}</For>
        </span>
      </Show>
      <Show when={props.card.due || props.card.assignee || raised(props.card)}>
        <span class="board-card-meta">
          <Show when={raised(props.card)}>
            <Badge tone={props.card.priority === "urgent" ? "danger" : "warning"}>{props.card.priority === "urgent" ? "Urgent" : "High"}</Badge>
          </Show>
          <Show when={props.card.due}>
            {(due) => (
              <span class="board-card-due" data-overdue={isOverdue(props.card, props.today) ? "" : undefined}>
                {isOverdue(props.card, props.today) ? "Overdue, " : "Due "}
                {dueText(due())}
              </span>
            )}
          </Show>
          <Show when={props.card.assignee}>
            {(assignee) => (
              <Avatar role="img" aria-label={assignee()} class="board-card-avatar">
                <AvatarFallback>{initials(assignee())}</AvatarFallback>
              </Avatar>
            )}
          </Show>
        </span>
      </Show>
    </>
  )
}

function BoardColumnPart(props: { value: string } & PartProps<"div">) {
  return usePart(boardPrimitive, "column", () => ({ value: props.value }), omit(props, "value") as PartProps<"div">, "div")
}

// A card the filter hides is hidden by the board's `hidden` option, not a prop of its own: UI
// SDK's Solid parts take options in an effect, a flush after the filter changes, and a card
// that hides and loses the tab stop then updates once (Solid's EFFECT_RELAY_TEAR otherwise).
function BoardCardPart(props: { value: string } & PartProps<"div", CardState>) {
  return usePart(boardPrimitive, "card", () => ({ value: props.value }), omit(props, "value") as PartProps<"div", CardState>, "div")
}

type AddCardProps = {
  column: string
  title: string
  /** How many more cards the column takes, or Infinity. */
  room: number
  onAdd: (column: string, title: string) => string | true
  onFilled: (key: string | true) => void
}

function AddCardForm(props: AddCardProps & { onClose: () => void }) {
  const [error, setError] = createSignal<string | null>(null)
  let input: HTMLInputElement | undefined
  // The field replaces the button that had focus: focus goes to it.
  onSettled(() => input?.focus())
  return (
    <form
      class="board-add-form"
      aria-label={`New card in ${props.title}`}
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const text = String(new FormData(form).get("title") ?? "").trim()
        if (!text) return
        try {
          const key = props.onAdd(props.column, text)
          setError(null)
          form.reset()
          // The card that fills the column takes the form's place, and focus.
          if (props.room <= 1) props.onFilled(key)
        } catch (failure) {
          setError((failure as Error).message)
        }
      }}
    >
      <Field name="title">
        <FieldLabel class="uiset-visually-hidden">Title of the new card in {props.title}</FieldLabel>
        <Input
          ref={(el: HTMLInputElement) => {
            input = el
          }}
          required
          autocomplete="off"
          placeholder="What needs doing?"
          aria-invalid={error() ? "true" : undefined}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === "Escape") {
              event.preventDefault()
              props.onClose()
            }
          }}
        />
        <Show when={error()}>
          {(message) => (
            <p class="board-add-error" role="alert">
              {message()}
            </p>
          )}
        </Show>
      </Field>
      <div class="board-add-actions">
        <Button type="submit">Add card</Button>
        <Button variant="ghost" type="button" onClick={() => props.onClose()}>
          Done adding
        </Button>
      </div>
    </form>
  )
}

function AddCard(props: AddCardProps) {
  const [open, setOpen] = createSignal(false)
  let button: HTMLButtonElement | undefined
  // Closing the form removes the field that had focus; hand it back to the button.
  const close = () => {
    setOpen(false)
    keepFocus(() => button)
  }
  return (
    <Show
      when={open()}
      fallback={
        <Button
          ref={(el: HTMLButtonElement) => {
            button = el
          }}
          variant="ghost"
          class="board-add"
          onClick={() => {
            setOpen(true)
          }}
        >
          <Icon name="plus" />
          Add a card to {props.title}
        </Button>
      }
    >
      <AddCardForm {...props} onClose={close} />
    </Show>
  )
}

/**
 * A kanban board. Tab reaches it once; arrows move between cards and columns; Space picks
 * a card up, arrows carry it, Space drops it and Escape puts it back; Enter opens it.
 */
function Board(props: BoardProps) {
  const baseId = createUniqueId()
  const helpId = `${baseId}-help`
  const hidden = createMemo(() => {
    const filter = props.filter
    return filter
      ? Object.values(props.cards)
          .filter((card) => !filter(card))
          .map((card) => card.id)
      : []
  })
  const hiddenSet = createMemo(() => new Set(hidden()))
  // The lanes as last committed, for `data-filtered`: the page's, or the board's own.
  const [own, setOwn] = createSignal<TransferLists>(untrack(() => props.lanes ?? props.defaultLanes ?? {}), { ownedWrite: true })
  const handle = usePrimitive(boardPrimitive, () => ({
    lanes: props.lanes,
    defaultLanes: props.defaultLanes,
    onLanesChange: (lanes: TransferLists, details: BoardLanesDetails) => {
      setOwn(lanes)
      props.onLanesChange?.(lanes, details)
    },
    columns: props.columns,
    cardLabel: (key: string) => props.cards[key]?.title ?? key,
    locked: props.locked ? (key: string) => !!props.cards[key] && !!props.locked?.(props.cards[key]!) : undefined,
    hidden: hidden(),
    onOpen: props.onCardOpen
      ? (key: string) => {
          const card = props.cards[key]
          if (card) props.onCardOpen?.(card)
        }
      : undefined,
    onAdd: props.onAddCard ? (column: string, { title }: { title: string }) => props.onAddCard?.(column, title) : undefined,
    message: props.moveMessage,
    filteredMessage: props.messages?.filtered,
    controller: props.controller,
    // Agents read items as { value, label }: the label holds where a card is and what its face shows.
    items: (current: TransferLists) =>
      props.columns.flatMap((column) =>
        (current[column.id] ?? []).map((key) => ({ value: key, label: agentCardLabel(key, column.title, props.cards[key]) })),
      ),
  }))
  // Only a hidden card that's on the board counts as filtering: the board's own rule.
  const filtering = createMemo(() => {
    const set = hiddenSet()
    if (!set.size) return false
    return Object.values(props.lanes ?? own()).some((keys) => keys.some((key) => set.has(key)))
  })
  // A dragged card's copy stays inside the board, keeping its look (see keepDragPreviewInside),
  // and cards slide to their new places, across columns too.
  let root: HTMLElement | undefined
  onSettled(() => {
    if (!root) return
    const stopPreview = keepDragPreviewInside(root)
    const stopGlide = glide(root, ".board-card")
    return () => {
      stopPreview?.()
      stopGlide()
    }
  })

  return usePart(
    handle,
    "root",
    undefined,
    {
      get "aria-label"() {
        return props.label
      },
      "aria-describedby": helpId,
      get "data-filtered"() {
        return filtering() ? "" : undefined
      },
      get class() {
        return ["board", props.class].filter(Boolean).join(" ")
      },
      ref: (el: HTMLElement) => {
        root = el
      },
      children: (state: { lanes: TransferLists }) => (
        <>
          <p id={helpId} hidden>
            {props.messages?.help ??
              "Arrow keys move between cards and columns. Space picks a card up; arrows move it; Space drops it; Escape puts it back. Enter opens a card."}
          </p>
          <ScrollBox axis="x" data-frame="none" class="board-frame" viewport={{ class: "board-scroller", role: "group", "aria-label": "Columns" }}>
            <div class="board-lanes">
              <For each={props.columns} keyed={(column) => column.id}>
                {(column) => {
                  const keys = () => state.lanes[column().id] ?? []
                  const room = () => {
                    const limit = column().limit
                    return limit === undefined ? Infinity : limit - keys().length
                  }
                  const full = () => room() <= 0
                  const headingId = `${baseId}-${untrack(() => column().id)}`
                  return (
                    <div class="board-column" data-full={full() ? "" : undefined}>
                      <div class="board-column-header">
                        <h3 id={headingId} class="board-column-title">
                          {column().title}
                        </h3>
                        <span class="board-column-count">
                          <span aria-hidden="true">
                            {keys().length}
                            {column().limit !== undefined ? ` / ${column().limit}` : ""}
                          </span>
                          <span class="uiset-visually-hidden">
                            {column().limit !== undefined ? `${keys().length} of ${column().limit} cards` : `${keys().length} cards`}
                          </span>
                        </span>
                      </div>
                      <BoardColumnPart value={column().id} class="board-cards" aria-labelledby={headingId}>
                        <For each={keys()}>
                          {(key) => (
                            <Show when={props.cards[key]}>
                              {(card) => {
                                const descriptionId = `${baseId}-${key}-details`
                                const description = () => (props.describeCard ? props.describeCard(card()) : describeCardDefault(card(), props.today))
                                return (
                                  <BoardCardPart
                                    value={key}
                                    class="board-card"
                                    aria-label={card().title}
                                    aria-describedby={description() ? descriptionId : undefined}
                                  >
                                    {props.renderCard ? props.renderCard(card()) : <BoardCardFace card={card()} today={props.today} />}
                                    <Show when={description()}>
                                      <span id={descriptionId} hidden>
                                        {description()}
                                      </span>
                                    </Show>
                                    <span class="board-card-handle" data-board-handle="" aria-hidden="true">
                                      <Icon name="grip" />
                                    </span>
                                  </BoardCardPart>
                                )
                              }}
                            </Show>
                          )}
                        </For>
                      </BoardColumnPart>
                      <Show when={!keys().length}>
                        <p class="board-column-empty">{props.messages?.empty ?? "No cards"}</p>
                      </Show>
                      <Show when={props.onAddCard && !full()}>
                        <AddCard
                          column={column().id}
                          title={column().title}
                          room={room()}
                          onAdd={(to, text) => handle.api.addCard(to, text)}
                          onFilled={(key) => {
                            if (typeof key === "string") handle.api.focusCard(key)
                          }}
                        />
                      </Show>
                      <Show when={full()}>
                        <p class="board-column-note">{props.messages?.full ?? "Full: finish a card to add more."}</p>
                      </Show>
                    </div>
                  )
                }}
              </For>
            </div>
          </ScrollBox>
        </>
      ),
    } as never,
    "div",
  )
}

/** Search and a person filter for a board. Your filter function decides what matches. */
function BoardToolbar(props: {
  /** What the board holds, like "Cards": the search is "Search cards". Not the board's name. */
  label: string
  query: string
  onQueryChange: (query: string) => void
  people?: string[]
  person?: string | null
  onPersonChange?: (person: string | null) => void
  children?: JSX.Element
}) {
  return (
    <div class="board-toolbar" role="group" aria-label={`${props.label} tools`}>
      <SearchField
        label={`Search ${props.label.toLowerCase()}`}
        placeholder="Search cards…"
        value={props.query}
        onValueChange={(value: string) => props.onQueryChange(value)}
        shortcut={null}
      />
      <Show when={props.people && props.onPersonChange}>
        <Select value={props.person ?? "anyone"} onValueChange={(value) => props.onPersonChange?.(value === "anyone" ? null : String(value))}>
          <SelectLabel class="uiset-visually-hidden">Cards for</SelectLabel>
          <SelectTrigger data-variant="outline" />
          <SelectContent>
            <SelectItem value="anyone">Anyone</SelectItem>
            <For each={props.people ?? []}>{(person) => <SelectItem value={person}>{person}</SelectItem>}</For>
          </SelectContent>
        </Select>
      </Show>
      {props.children}
    </div>
  )
}

type BoardCardDialogProps = {
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
}

/**
 * A card's details: edit it, move it to another column, or delete it. Moves go through the
 * board, so they keep its column limits and reach `onLanesChange`; focus goes back to the
 * card, or to its neighbor when it's gone.
 */
function BoardCardDialog(props: BoardCardDialogProps) {
  // The dialog keeps showing its card while it animates closed.
  const shown = createMemo<BoardCardData | null>((last) => props.card ?? last ?? null)
  const [error, setError] = createSignal<string | null>(null)
  // Where focus goes when the dialog closes: the card, else its neighbor (for a card
  // that's deleted, or that an edit hides from the filter).
  let returnTo: { card?: string; neighbor?: string } = {}
  const remember = (key: string, keep: boolean) => {
    returnTo = { card: keep ? key : undefined, neighbor: props.board.neighbor(key) }
  }
  const finalFocus = () => {
    const { card: key, neighbor } = returnTo
    return (key && props.board.cardElement(key)) || (neighbor && props.board.cardElement(neighbor)) || undefined
  }
  const people = () => props.people ?? []
  const labels = () => props.labels ?? []
  const assignees = () => {
    const assignee = shown()?.assignee
    return assignee && !people().includes(assignee) ? [assignee, ...people()] : people()
  }
  // The form starts again for each card, not for each save of the same card.
  const shownId = createMemo(() => shown()?.id)
  // The delete alert renders beside the form, not in it: forms don't nest.
  const [content, setContent] = createSignal<HTMLElement | undefined>(undefined, { ownedWrite: true })

  const save = (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const card = shown()
    if (!card) return
    const column = props.column
    const data = new FormData(event.currentTarget)
    const to = String(data.get("card-column") ?? column)
    // Move first: a full column refuses, and nothing is saved.
    if (to && column && to !== column) {
      try {
        props.board.moveCard(card.id, to)
      } catch (failure) {
        setError((failure as Error).message)
        return
      }
      // The board draws the card in its new column before the dialog closes, so focus can go
      // back to it there.
      flush()
    }
    const chosen = data.getAll("card-labels").map(String)
    const next: BoardCardData = {
      ...card,
      title: String(data.get("card-title")),
      description: String(data.get("card-description") ?? "") || undefined,
      due: String(data.get("card-due") ?? "") || undefined,
      priority: (String(data.get("card-priority") ?? "medium") as BoardCardData["priority"]) || undefined,
    }
    if (assignees().length) next.assignee = String(data.get("card-assignee") ?? "") || undefined
    if (labels().length) next.labels = [...(card.labels ?? []).filter((label) => !labels().includes(label)), ...chosen]
    props.onSave(next)
    remember(card.id, true)
    setError(null)
    props.onClose()
  }

  return (
    <Dialog
      open={props.card !== null}
      onOpenChange={(open: boolean) => {
        if (open) return
        if (props.card) remember(props.card.id, true)
        setError(null)
        props.onClose()
      }}
    >
      <DialogBackdrop />
      <DialogContent
        ref={(el: HTMLElement) => {
          setContent(el)
        }}
        class="board-dialog"
        finalFocus={finalFocus}
      >
        <Show when={shown()}>
          {(card) => (
            <>
              <DialogTitle>{card().title}</DialogTitle>
              {/* "In progress column", not "In In progress": column names often start with "In". */}
              <DialogDescription>{props.columns.find((c) => c.id === props.column)?.title ?? "No"} column.</DialogDescription>
              <Show when={shownId()} keyed>
                {(id) => (
                  <form class="board-dialog-form" aria-label={`Edit ${card().title}`} onSubmit={save}>
                    <Field name="card-title">
                      <FieldLabel>Title</FieldLabel>
                      <Input required defaultValue={untrack(() => card().title)} autocomplete="off" />
                      <FieldError match="valueMissing">A card needs a title.</FieldError>
                    </Field>
                    <Field name="card-description">
                      <FieldLabel>Description</FieldLabel>
                      <Textarea defaultValue={untrack(() => card().description)} autoResize />
                    </Field>
                    <div class="board-dialog-row">
                      <Field name="card-column">
                        <Select name="card-column" defaultValue={untrack(() => props.column)}>
                          <SelectLabel>Column</SelectLabel>
                          <SelectTrigger />
                          <SelectContent>
                            <For each={props.columns} keyed={(c) => c.id}>
                              {(c) => {
                                const full = () => c().id !== props.column && !props.board.hasRoom(id, c().id)
                                return (
                                  <SelectItem value={c().id} disabled={full()}>
                                    {full() ? `${c().title} (full)` : c().title}
                                  </SelectItem>
                                )
                              }}
                            </For>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Show when={assignees().length > 0}>
                        <Field name="card-assignee">
                          <Select name="card-assignee" defaultValue={untrack(() => card().assignee ?? "")}>
                            <SelectLabel>Assignee</SelectLabel>
                            <SelectTrigger />
                            <SelectContent>
                              <SelectItem value="">Nobody</SelectItem>
                              <For each={assignees()}>{(person) => <SelectItem value={person}>{person}</SelectItem>}</For>
                            </SelectContent>
                          </Select>
                        </Field>
                      </Show>
                    </div>
                    <div class="board-dialog-row">
                      <Field name="card-due">
                        <FieldLabel>Due date</FieldLabel>
                        <Input type="date" defaultValue={untrack(() => card().due)} />
                      </Field>
                      <Field name="card-priority">
                        <Select name="card-priority" defaultValue={untrack(() => card().priority ?? "medium")}>
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
                    <Show when={labels().length > 0}>
                      <CheckboxGroup
                        name="card-labels"
                        aria-label="Labels"
                        defaultValue={untrack(() => (card().labels ?? []).filter((label) => labels().includes(label)))}
                        class="board-dialog-labels"
                      >
                        <For each={labels()}>
                          {(label) => (
                            <Label class="board-dialog-label">
                              <Checkbox value={label} /> {label}
                            </Label>
                          )}
                        </For>
                      </CheckboxGroup>
                    </Show>
                    <Show when={error()}>
                      {(message) => (
                        <p class="board-dialog-error" role="alert">
                          {message()}
                        </p>
                      )}
                    </Show>
                    <div class="board-dialog-actions">
                      <AlertDialog container={content()}>
                        <AlertDialogTrigger data-variant="ghost" class="board-delete">
                          <Icon name="trash" />
                          Delete card
                        </AlertDialogTrigger>
                        <AlertDialogBackdrop />
                        <AlertDialogContent>
                          <AlertDialogTitle>Delete “{card().title}”?</AlertDialogTitle>
                          <AlertDialogDescription>It’s gone for good, with its description.</AlertDialogDescription>
                          <div class="board-dialog-actions">
                            <AlertDialogClose>Keep the card</AlertDialogClose>
                            <AlertDialogClose
                              data-variant="destructive"
                              data-agent-confirm={`Deletes the card “${card().title}”`}
                              onClick={() => {
                                const gone = card()
                                remember(gone.id, false)
                                props.onDelete(gone)
                                props.onClose()
                              }}
                            >
                              Delete for good
                            </AlertDialogClose>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                      <span class="board-dialog-spacer" />
                      <DialogClose>Cancel</DialogClose>
                      <Button type="submit">Save card</Button>
                    </div>
                  </form>
                )}
              </Show>
            </>
          )}
        </Show>
      </DialogContent>
    </Dialog>
  )
}

export { Board, BoardCardDialog, BoardCardFace, BoardToolbar, createBoardController }
export type { BoardCardData, BoardColumnSpec, BoardController, BoardLanesChange, BoardMessages, BoardProps }
