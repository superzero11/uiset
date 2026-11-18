"use client"

import { announce, bindDrag, bindScrollPicker } from "@ui-sdk/core"
import { rubberBand } from "@ui-sdk/core/gesture"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive"
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Button } from "./button"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerTitle,
  createDrawerController,
} from "./drawer"
import { Listbox, ListboxItem } from "./listbox"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "./menu"
import { Icon, type IconName } from "./shell/icons"
import { swipeList, type SwipeSide } from "./mobile/swipe-list"
import { keepWheelOnValue } from "./mobile/wheel"
import "./shell/shell.css"
import "./mobile/mobile.css"

/* ------------------------------------------------------------------ Swipe list */

type SwipeAction = {
  id: string
  label: string
  icon?: IconName
  /** Colors the action: "danger" for delete, "accent" for the rest. */
  tone?: "danger" | "accent" | "neutral"
}

type SwipeListItem = {
  id: string
  /** Shown on the row; also its name for screen readers unless `label` says otherwise. */
  content: ReactNode
  label?: string
  /** Actions shown by swiping toward the end (left to right in English): usually one, like Mark read. */
  start?: SwipeAction[]
  /** Actions shown by swiping toward the start: usually Archive or Delete. */
  end?: SwipeAction[]
}

function SwipeRowPart({ value, ...props }: { value: string } & PartProps<"li">) {
  return usePart(swipeList, "row", { value }, props, "li")
}
function SwipeContentPart({ value, ...props }: { value: string } & PartProps<"div">) {
  return usePart(swipeList, "content", { value }, props, "div")
}
function SwipeActionsPart({ row, side, ...props }: { row: string; side: SwipeSide } & PartProps<"div">) {
  return usePart(swipeList, "actions", { value: `${row}:${side}`, row, side }, props, "div")
}

type SwipeListMessages = {
  /** How the keys work, read with each row that has actions. */
  help: string
  /** The name of a row's actions menu. */
  actionsFor: (row: string) => string
}

/**
 * Rows that swipe aside to their actions. Swipe far enough to run the first action; with
 * the keyboard, arrows go between rows, Left and Right show a row's actions, Escape hides
 * them and Enter opens the row. Each row also has an Actions menu, for screen readers on
 * touch screens and in browse mode, where neither swipes nor arrows reach the actions.
 */
function SwipeList({
  label,
  items,
  onOpen,
  onAction,
  fullSwipe = 0.6,
  messages,
  className,
}: {
  label: string
  items: SwipeListItem[]
  onOpen?: (id: string) => void
  /** Runs an action, from a press, a long swipe, the menu or an agent. */
  onAction: (id: string, action: string) => void
  fullSwipe?: number
  messages?: Partial<SwipeListMessages>
  className?: string
}) {
  const baseId = useId()
  const words: SwipeListMessages = {
    help: onOpen
      ? "Left and Right show this row's actions; Escape hides them; Enter opens it."
      : "Left and Right show this row's actions; Escape hides them.",
    actionsFor: (row) => `Actions for ${row}`,
    ...messages,
  }
  const byId = new Map(items.map((item) => [item.id, item]))
  const nameOf = (row: SwipeListItem) => row.label ?? document.getElementById(`${baseId}-${row.id}`)?.textContent ?? row.id
  const handle = usePrimitive(swipeList, {
    onOpen,
    onAction: (key, { action }) => onAction(key, action),
    fullSwipe,
    // Agents run safe actions by name; a dangerous one goes through the row's menu, which asks.
    actionsOf: (key) => {
      const row = byId.get(key)
      if (!row) return []
      return [...(row.start ?? []), ...(row.end ?? [])].map((action) => ({
        id: action.id,
        label: action.label,
        confirm: confirmOf(row, action),
        via: words.actionsFor(row.label ?? nameOf(row)),
      }))
    },
    rows: () => items.map((row) => ({ value: row.id, label: nameOf(row) })),
    onFullSwipe: (key, side) => {
      const row = byId.get(key)
      const first = row?.[side]?.[0]
      if (!row || !first) return false
      onAction(key, first.id)
      announce(`${first.label}: ${nameOf(row)}`)
      return true
    },
    disabled: (key) => !byId.get(key)?.start?.length && !byId.get(key)?.end?.length,
  })
  // An action hands focus back to its row (or, if the row goes, the row now in its place).
  const run = (row: string, action: SwipeAction) => handle.api.act(row, action.id)
  const confirmOf = (row: SwipeListItem, action: SwipeAction) =>
    action.tone === "danger" ? `${action.label}: ${nameOf(row)}` : undefined
  const actions = (row: SwipeListItem, side: SwipeSide) => {
    const list = row[side]
    if (!list?.length) return null
    return (
      <SwipeActionsPart row={row.id} side={side} className="swipe-actions" data-side={side}>
        {list.map((action) => (
          <button
            key={action.id}
            type="button"
            className="swipe-action"
            data-tone={action.tone ?? "accent"}
            data-agent-confirm={confirmOf(row, action)}
            onClick={() => run(row.id, action)}
          >
            {action.icon && <Icon name={action.icon} />}
            {action.label}
          </button>
        ))}
      </SwipeActionsPart>
    )
  }
  return usePart(
    handle,
    "root",
    {},
    {
      "aria-label": label,
      className: ["swipe-list", className].filter(Boolean).join(" "),
      children: (
        <>
          {items.map((row) => {
            const all = [...(row.start ?? []), ...(row.end ?? [])]
            return (
              <SwipeRowPart
                key={row.id}
                value={row.id}
                className="swipe-row"
                // Named by its label, or by its content when it has none.
                aria-label={row.label}
                aria-labelledby={row.label ? undefined : `${baseId}-${row.id}`}
                aria-describedby={all.length ? `${baseId}-help` : undefined}
              >
                {actions(row, "start")}
                {actions(row, "end")}
                <SwipeContentPart value={row.id} className="swipe-content">
                  <span id={`${baseId}-${row.id}`} className="swipe-content-body">
                    {row.content}
                  </span>
                  {all.length > 0 && (
                    <Menu onAction={(id: unknown) => onAction(row.id, String(id))}>
                      {/* Out of the tab order (rows are one stop, with arrows), but there for
                          screen readers' own navigation; it shows when it has focus. */}
                      <MenuTrigger
                        className="swipe-menu"
                        data-swipe-menu=""
                        tabIndex={-1}
                        aria-label={row.label ? words.actionsFor(row.label) : undefined}
                        // A row without a label is named by its content, which is on the page once
                        // it commits.
                        ref={row.label ? undefined : (el: HTMLElement | null) => el?.setAttribute("aria-label", words.actionsFor(nameOf(row)))}
                      >
                        <Icon name="more" />
                      </MenuTrigger>
                      <MenuContent>
                        {all.map((action) => (
                          <MenuItem
                            key={action.id}
                            value={action.id}
                            destructive={action.tone === "danger"}
                            data-agent-confirm={confirmOf(row, action)}
                          >
                            {action.label}
                          </MenuItem>
                        ))}
                      </MenuContent>
                    </Menu>
                  )}
                </SwipeContentPart>
              </SwipeRowPart>
            )
          })}
          <li hidden id={`${baseId}-help`}>
            {words.help}
          </li>
        </>
      ),
    } as never,
    "ul",
  )
}

/* ---------------------------------------------------------------- Wheel picker */

type WheelOption = { value: string; label: string; disabled?: boolean }

/**
 * A wheel you scroll to choose from, like a time picker's drums: the option in the middle is
 * the value. On UI SDK's Listbox with bindScrollPicker, so arrows, Home, End and typing work.
 */
function WheelPicker({
  label,
  options,
  value,
  onValueChange,
  className,
}: {
  label: string
  options: WheelOption[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}) {
  const list = useRef<HTMLDivElement>(null)
  const select = useEffectEvent((index: number) => {
    const option = options[index]
    if (option && option.value !== value) onValueChange(option.value)
  })
  // The picker puts the value in the band before the first paint, and glides to a new one.
  useLayoutEffect(() => {
    const stop = bindScrollPicker(list.current!, { onSelect: (index) => select(index) })
    const keep = keepWheelOnValue(list.current!)
    return () => {
      stop()
      keep()
    }
  }, [])
  return (
    <div className={["wheel", className].filter(Boolean).join(" ")}>
      <Listbox
        ref={list}
        className="wheel-list"
        aria-label={label}
        keepInView={false}
        value={value}
        onValueChange={(next: unknown) => next != null && onValueChange(String(next))}
      >
        {options.map((option) => (
          <ListboxItem key={option.value} value={option.value} disabled={option.disabled} className="wheel-option">
            {option.label}
          </ListboxItem>
        ))}
      </Listbox>
    </div>
  )
}

type TimeWheelLabels = { hour: string; minute: string; period: string; am: string; pm: string }

/** Hours and minutes on two wheels (and AM/PM with a 12-hour clock), as "HH:MM". */
function TimeWheel({
  label = "Time",
  value,
  onValueChange,
  minuteStep = 5,
  hour12 = true,
  labels: given,
}: {
  label?: string
  /** 24-hour "HH:MM". */
  value: string
  onValueChange: (value: string) => void
  minuteStep?: number
  hour12?: boolean
  /** The wheels' words, for other languages. Each wheel is named with the group's label first. */
  labels?: Partial<TimeWheelLabels>
}) {
  const words: TimeWheelLabels = { hour: "hour", minute: "minute", period: "AM or PM", am: "AM", pm: "PM", ...given }
  const [h, m] = value.split(":").map(Number) as [number, number]
  const pad = (n: number) => String(n).padStart(2, "0")
  const set = (hour: number, minute: number) => onValueChange(`${pad(hour)}:${pad(minute)}`)
  // The steps, plus the value's own minute when it falls between them, so the wheel shows it.
  const minutes = [...new Set([...Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep), m])].sort((a, b) => a - b)
  const groupId = useId()
  return (
    <div className="wheel-group" role="group" aria-labelledby={groupId}>
      <span id={groupId} className="uiset-visually-hidden">
        {label}
      </span>
      <WheelPicker
        label={`${label}, ${words.hour}`}
        options={(hour12 ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i)).map((n) => ({
          value: String(n),
          label: hour12 ? String(n) : pad(n),
        }))}
        value={String(hour12 ? ((h + 11) % 12) + 1 : h)}
        onValueChange={(next) => set(hour12 ? (Number(next) % 12) + (h >= 12 ? 12 : 0) : Number(next), m)}
      />
      <span className="wheel-colon" aria-hidden="true">
        :
      </span>
      <WheelPicker
        label={`${label}, ${words.minute}`}
        options={minutes.map((n) => ({ value: String(n), label: pad(n) }))}
        value={String(m)}
        onValueChange={(next) => set(h, Number(next))}
      />
      {hour12 && (
        <WheelPicker
          label={`${label}, ${words.period}`}
          options={[
            { value: "am", label: words.am },
            { value: "pm", label: words.pm },
          ]}
          value={h >= 12 ? "pm" : "am"}
          onValueChange={(next) => set((h % 12) + (next === "pm" ? 12 : 0), m)}
        />
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------- Sheets */

type SnapPoints = NonNullable<React.ComponentProps<typeof Drawer>["snapPoints"]>
type DrawerProps = React.ComponentProps<typeof Drawer>

/**
 * A bottom sheet on UI SDK's Drawer. By default it's as tall as its content. Give it
 * `snapPoints` (like `[0.5, 1]`) to rest at heights you drag between or step through with its
 * handle; it then takes the screen's height, so every point has room. Drawer's other props,
 * like `dismissible` or `defaultOpen`, pass through.
 */
function Sheet({
  title,
  description,
  trigger,
  snapPoints = ["content"],
  resizeLabel = (name: string) => `Resize ${name}`,
  children,
  className,
  ...drawer
}: Omit<DrawerProps, "children" | "snapPoints"> & {
  title: string
  description?: string
  trigger?: ReactNode
  snapPoints?: SnapPoints
  /** The handle's name, for other languages. */
  resizeLabel?: (title: string) => string
  children: ReactNode
  className?: string
}) {
  const snaps = snapPoints.length > 1
  return (
    <Drawer {...drawer} snapPoints={snapPoints} defaultSnapPoint={drawer.defaultSnapPoint ?? snapPoints[0]}>
      {trigger}
      <DrawerBackdrop />
      <DrawerContent className={["mobile-sheet", className].filter(Boolean).join(" ")} data-snaps={snaps ? "" : undefined}>
        {snaps ? (
          <DrawerHandle className="mobile-sheet-handle" aria-label={resizeLabel(title)} />
        ) : (
          <span className="mobile-sheet-handle" aria-hidden="true" />
        )}
        <div className="mobile-sheet-head">
          <DrawerTitle className="mobile-sheet-title">{title}</DrawerTitle>
          {description && <DrawerDescription className="mobile-sheet-description">{description}</DrawerDescription>}
        </div>
        <div className="mobile-sheet-body">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}

type ActionSheetAction = { value: string; label: string; destructive?: boolean }

/** Opens an action sheet from code: `const choice = await sheet.choose()`, or undefined. */
function createActionSheet<Value extends string = string>() {
  const controller = createDrawerController<undefined, Value>()
  return { controller, choose: async () => (await controller.open()).returnValue }
}
type ActionSheetController = ReturnType<typeof createActionSheet>

/** A sheet of choices, least risky first, with Cancel at the bottom. */
function ActionSheet({
  controller,
  title,
  description,
  actions,
  cancelLabel = "Cancel",
}: {
  controller: ActionSheetController
  title: string
  description?: string
  actions: ActionSheetAction[]
  cancelLabel?: string
}) {
  return (
    <Drawer controller={controller.controller}>
      <DrawerBackdrop />
      <DrawerContent className="mobile-sheet mobile-action-sheet">
        <div className="mobile-sheet-head">
          <DrawerTitle className="mobile-sheet-title">{title}</DrawerTitle>
          {description && <DrawerDescription className="mobile-sheet-description">{description}</DrawerDescription>}
        </div>
        <div className="mobile-action-list">
          {actions.map((action) => (
            <DrawerClose
              key={action.value}
              value={action.value}
              className="mobile-action"
              data-destructive={action.destructive ? "" : undefined}
              // An agent choosing a destructive action waits for the person.
              data-agent-confirm={action.destructive ? `${action.label} (${title})` : undefined}
            >
              {action.label}
            </DrawerClose>
          ))}
        </div>
        <DrawerClose className="mobile-action mobile-action-cancel">{cancelLabel}</DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}

/* ------------------------------------------------------------ Bars and refresh */

type TabBarItem = { id: string; label: string; icon: IconName; href?: string; badge?: number }

/** The bar along the bottom of a phone app: its sections, the current one marked. */
function TabBar({
  label = "Sections",
  items,
  value,
  onValueChange,
  badgeLabel = (count: number) => `${count} new`,
}: {
  label?: string
  items: TabBarItem[]
  value: string
  onValueChange?: (id: string) => void
  /** How a badge reads, after the item's name, for other languages. */
  badgeLabel?: (count: number) => string
}) {
  return (
    <nav className="mobile-tab-bar" aria-label={label}>
      <ul>
        {items.map((item) => {
          const current = item.id === value
          const body = (
            <>
              <span className="mobile-tab-icon">
                <Icon name={item.icon} />
                {item.badge ? (
                  <span className="mobile-tab-badge" aria-hidden="true">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span className="mobile-tab-label">{item.label}</span>
            </>
          )
          // The badge is a number on screen; the name says it in words, after the label.
          const name = item.badge ? `${item.label}, ${badgeLabel(item.badge)}` : undefined
          return (
            <li key={item.id}>
              {item.href ? (
                <a
                  className="mobile-tab"
                  href={item.href}
                  aria-label={name}
                  aria-current={current ? "page" : undefined}
                  onClick={(event) => {
                    // A modified click opens a new tab, leaving this one as it is.
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                    onValueChange?.(item.id)
                  }}
                >
                  {body}
                </a>
              ) : (
                // UI SDK's Button, so agents see and press the sections too.
                <Button
                  variant="ghost"
                  className="mobile-tab"
                  aria-label={name}
                  aria-current={current ? "page" : undefined}
                  onClick={() => onValueChange?.(item.id)}
                >
                  {body}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** The bar along the top: back, the screen's title, and its actions. */
function AppBar({
  title,
  onBack,
  backLabel = "Back",
  actions,
  headingLevel = 1,
}: {
  title: ReactNode
  onBack?: () => void
  backLabel?: string
  actions?: ReactNode
  /** The title's heading level, to fit the page's outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}) {
  const Heading = `h${headingLevel}` as "h1"
  return (
    <header className="mobile-app-bar">
      {onBack ? (
        <Button variant="ghost" className="mobile-app-bar-back" onClick={onBack}>
          <Icon name="chevron" className="mobile-back-icon" />
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <Heading className="mobile-app-bar-title">{title}</Heading>
      <div className="mobile-app-bar-actions">{actions}</div>
    </header>
  )
}

type RefreshMessages = {
  refresh: string
  pull: string
  release: string
  refreshing: string
  done: string
  failed: string
}

/**
 * Pull down at the top of a list to refresh it. The pull resists more the further it goes;
 * past `threshold`, letting go runs `onRefresh` until its Promise settles. A Refresh button
 * appears on keyboard focus, for everyone who doesn't pull.
 */
function PullToRefresh({
  onRefresh,
  onError,
  threshold = 64,
  messages,
  children,
  className,
}: {
  onRefresh: () => Promise<unknown>
  /** A refresh that failed; the terminal's words already say so. */
  onError?: (error: unknown) => void
  threshold?: number
  /** The words, for other languages. */
  messages?: Partial<RefreshMessages>
  children: ReactNode
  className?: string
}) {
  const words: RefreshMessages = {
    refresh: "Refresh",
    pull: "Pull to refresh",
    release: "Release to refresh",
    refreshing: "Refreshing…",
    done: "Up to date.",
    failed: "Couldn't refresh.",
    ...messages,
  }
  const box = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const drag = useRef<(() => void) | null>(null)
  const [state, setState] = useState<"idle" | "pulling" | "ready" | "refreshing">("idle")
  const [atTop, setAtTop] = useState(true)
  // The pull's distance goes straight to a variable: a pull renders only when its state changes.
  const setPull = (px: number) => box.current?.style.setProperty("--pull", `${px}px`)
  useEffect(() => () => drag.current?.(), [])
  const refresh = async () => {
    if (state === "refreshing") return
    setState("refreshing")
    setPull(threshold)
    announce(words.refreshing)
    try {
      await onRefresh()
      announce(words.done)
    } catch (error) {
      announce(words.failed)
      onError?.(error)
    } finally {
      setState("idle")
      setPull(0)
    }
  }
  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scroller.current
    if (!el || el.scrollTop > 0 || state === "refreshing" || event.button !== 0) return
    const startX = event.clientX
    const startY = event.clientY
    let distance = 0
    drag.current?.()
    drag.current = bindDrag(el, event.nativeEvent, {
      threshold: 4,
      // Only a pull down from the top; anything else is a scroll or a tap.
      onStart: (move) => move.clientY > startY && Math.abs(move.clientY - startY) > Math.abs(move.clientX - startX) * 2,
      onMove: ({ y }) => {
        distance = Math.max(0, rubberBand(y - startY, el.clientHeight))
        setPull(distance)
        const next = distance >= threshold ? "ready" : "pulling"
        setState((now) => (now === next ? now : next))
      },
      onEnd: (_event, canceled) => {
        drag.current = null
        if (!canceled && distance >= threshold) void refresh()
        else {
          setPull(0)
          setState("idle")
        }
      },
    })
  }
  return (
    <div ref={box} className={["mobile-refresh", className].filter(Boolean).join(" ")} data-state={state}>
      <div className="mobile-refresh-indicator" aria-hidden="true">
        <span className="mobile-refresh-spinner" />
        {state === "ready" ? words.release : state === "refreshing" ? words.refreshing : words.pull}
      </div>
      <div
        ref={scroller}
        className="mobile-refresh-scroll"
        data-at-top={atTop ? "" : undefined}
        onScroll={(event) => setAtTop(event.currentTarget.scrollTop <= 0)}
        onPointerDown={pointerDown}
      >
        {/* Disabled while it refreshes, but it keeps focus: no drop to the page. */}
        <Button variant="ghost" className="mobile-refresh-button" onClick={() => void refresh()} disabled={state === "refreshing"} focusableWhenDisabled>
          {words.refresh}
        </Button>
        <div className="mobile-refresh-content">{children}</div>
      </div>
    </div>
  )
}

export { ActionSheet, AppBar, PullToRefresh, Sheet, SwipeList, TabBar, TimeWheel, WheelPicker, createActionSheet }
export type {
  ActionSheetAction,
  ActionSheetController,
  RefreshMessages,
  SwipeAction,
  SwipeListItem,
  SwipeListMessages,
  TabBarItem,
  TimeWheelLabels,
  WheelOption,
}
