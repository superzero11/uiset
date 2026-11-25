import { Dynamic, type ComponentProps, type JSX } from "@solidjs/web"
import { announce, bindDrag, bindScrollPicker } from "@ui-sdk/core"
import { rubberBand } from "@ui-sdk/core/gesture"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/solid/primitive"
import { createEffect, createMemo, createSignal, createUniqueId, For, omit, onCleanup, onSettled, Show } from "solid-js"
import { Button } from "./button"
import { Drawer, DrawerBackdrop, DrawerClose, DrawerContent, DrawerDescription, DrawerHandle, DrawerTitle, createDrawerController } from "./drawer"
import { Listbox, ListboxItem } from "./listbox"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "./menu"
import { ScrollBox } from "./scroll-area"
import { Icon, type IconName } from "./shell/icons"
import { swipeList, type SwipeSide } from "../../registry/uiset/ui/mobile/swipe-list"
import { keepWheelOnValue } from "../../registry/uiset/ui/mobile/wheel"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/mobile/mobile.css"

// The mobile kit in Solid, as React's: the swipe list's gestures, keys and agents are the shared
// primitive (mobile/swipe-list.ts), the wheels are UI SDK's Listbox with bindScrollPicker, and
// the sheets are its Drawer.

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
  content: JSX.Element
  label?: string
  /** Actions shown by swiping toward the end (left to right in English): usually one, like Mark read. */
  start?: SwipeAction[]
  /** Actions shown by swiping toward the start: usually Archive or Delete. */
  end?: SwipeAction[]
}

function SwipeRowPart(props: { value: string } & PartProps<"li">) {
  return usePart(swipeList, "row", () => ({ value: props.value }), omit(props, "value") as PartProps<"li">, "li")
}
function SwipeContentPart(props: { value: string } & PartProps<"div">) {
  return usePart(swipeList, "content", () => ({ value: props.value }), omit(props, "value") as PartProps<"div">, "div")
}
function SwipeActionsPart(props: { row: string; side: SwipeSide } & PartProps<"div">) {
  return usePart(swipeList, "actions", () => ({ value: `${props.row}:${props.side}`, row: props.row, side: props.side }), omit(props, "row", "side") as PartProps<"div">, "div")
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
function SwipeList(props: {
  label: string
  items: SwipeListItem[]
  onOpen?: (id: string) => void
  /** Runs an action, from a press, a long swipe, the menu or an agent. */
  onAction: (id: string, action: string) => void
  fullSwipe?: number
  messages?: Partial<SwipeListMessages>
  class?: string
}) {
  const baseId = createUniqueId()
  const words = (): SwipeListMessages => ({
    help: props.onOpen ? "Left and Right show this row's actions; Escape hides them; Enter opens it." : "Left and Right show this row's actions; Escape hides them.",
    actionsFor: (row) => `Actions for ${row}`,
    ...props.messages,
  })
  const byId = createMemo(() => new Map(props.items.map((item) => [item.id, item])))
  // A row without a label is named by its content, as it reads on the page.
  const nameOf = (row: SwipeListItem) =>
    row.label ?? (typeof document === "undefined" ? undefined : document.getElementById(`${baseId}-${row.id}`)?.textContent) ?? row.id
  const confirmOf = (row: SwipeListItem, action: SwipeAction) => (action.tone === "danger" ? `${action.label}: ${nameOf(row)}` : undefined)
  const handle = usePrimitive(swipeList, () => ({
    onOpen: props.onOpen,
    onAction: (key: string, { action }: { action: string }) => props.onAction(key, action),
    fullSwipe: props.fullSwipe ?? 0.6,
    // Agents run safe actions by name; a dangerous one goes through the row's menu, which asks.
    actionsOf: (key: string) => {
      const row = byId().get(key)
      if (!row) return []
      return [...(row.start ?? []), ...(row.end ?? [])].map((action) => ({
        id: action.id,
        label: action.label,
        confirm: confirmOf(row, action),
        via: words().actionsFor(row.label ?? nameOf(row)),
      }))
    },
    rows: () => props.items.map((row) => ({ value: row.id, label: nameOf(row) })),
    onFullSwipe: (key: string, side: SwipeSide) => {
      const row = byId().get(key)
      const first = row?.[side]?.[0]
      if (!row || !first) return false
      props.onAction(key, first.id)
      announce(`${first.label}: ${nameOf(row)}`)
      return true
    },
    disabled: (key: string) => !byId().get(key)?.start?.length && !byId().get(key)?.end?.length,
  }))
  // An action hands focus back to its row (or, if the row goes, the row now in its place).
  const run = (row: string, action: SwipeAction) => handle.api.act(row, action.id)
  const Actions = (side: { row: SwipeListItem; side: SwipeSide }) => (
    <Show when={side.row[side.side]?.length}>
      <SwipeActionsPart row={side.row.id} side={side.side} class="swipe-actions" data-side={side.side}>
        <For each={side.row[side.side] ?? []} keyed={(action) => action.id}>
          {(action) => (
            <button
              type="button"
              class="swipe-action"
              data-tone={action().tone ?? "accent"}
              data-agent-confirm={confirmOf(side.row, action())}
              onClick={() => run(side.row.id, action())}
            >
              <Show when={action().icon}>{(icon) => <Icon name={icon()} />}</Show>
              {action().label}
            </button>
          )}
        </For>
      </SwipeActionsPart>
    </Show>
  )
  return usePart(
    handle,
    "root",
    undefined,
    {
      get "aria-label"() {
        return props.label
      },
      get class() {
        return ["swipe-list", props.class].filter(Boolean).join(" ")
      },
      children: () => (
        <>
          <For each={props.items} keyed={(row) => row.id}>
            {(row) => {
              const all = () => [...(row().start ?? []), ...(row().end ?? [])]
              return (
                <SwipeRowPart
                  value={row().id}
                  class="swipe-row"
                  // Named by its label, or by its content when it has none.
                  aria-label={row().label}
                  aria-labelledby={row().label ? undefined : `${baseId}-${row().id}`}
                  aria-describedby={all().length ? `${baseId}-help` : undefined}
                >
                  <Actions row={row()} side="start" />
                  <Actions row={row()} side="end" />
                  <SwipeContentPart value={row().id} class="swipe-content">
                    <span id={`${baseId}-${row().id}`} class="swipe-content-body">
                      {row().content}
                    </span>
                    <Show when={all().length > 0}>
                      <RowMenu
                        actions={all()}
                        label={row().label ? words().actionsFor(row().label!) : undefined}
                        named={{ id: `${baseId}-${row().id}`, format: words().actionsFor, content: row().content }}
                        confirmOf={(action) => confirmOf(row(), action)}
                        onAction={(id) => props.onAction(row().id, id)}
                      />
                    </Show>
                  </SwipeContentPart>
                </SwipeRowPart>
              )
            }}
          </For>
          <li hidden id={`${baseId}-help`}>
            {words().help}
          </li>
        </>
      ),
    } as never,
    "ul",
  )
}

/** A row's actions as a menu, for screen readers' own navigation. */
function RowMenu(props: {
  actions: SwipeAction[]
  /** The menu's name; without it, it's named from the row's content once that's on the page. */
  label?: string
  /** The content's element, the words around it, and the content, so a new one renames it. */
  named: { id: string; format: (row: string) => string; content: JSX.Element }
  confirmOf: (action: SwipeAction) => string | undefined
  onAction: (id: string) => void
}) {
  let trigger: HTMLElement | undefined
  createEffect(
    () => (props.label ? undefined : props.named),
    (named) => {
      const text = named && document.getElementById(named.id)?.textContent
      if (text && trigger) trigger.setAttribute("aria-label", named.format(text))
    },
  )
  return (
    <Menu
      onAction={(id: unknown) => {
        props.onAction(String(id))
      }}
    >
      {/* Out of the tab order (rows are one stop, with arrows), but there for screen readers'
          own navigation; it shows when it has focus. */}
      <MenuTrigger
        ref={(el: HTMLElement) => {
          trigger = el
        }}
        class="swipe-menu"
        data-swipe-menu=""
        tabindex={-1}
        aria-label={props.label}
      >
        <Icon name="more" />
      </MenuTrigger>
      <MenuContent>
        <For each={props.actions} keyed={(action) => action.id}>
          {(action) => (
            <MenuItem value={action().id} destructive={action().tone === "danger"} data-agent-confirm={props.confirmOf(action())}>
              {action().label}
            </MenuItem>
          )}
        </For>
      </MenuContent>
    </Menu>
  )
}

/* ---------------------------------------------------------------- Wheel picker */

type WheelOption = { value: string; label: string; disabled?: boolean }

/**
 * A wheel you scroll to choose from, like a time picker's drums: the option in the middle is
 * the value. On UI SDK's Listbox with bindScrollPicker, so arrows, Home, End and typing work.
 */
function WheelPicker(props: { label: string; options: WheelOption[]; value: string; onValueChange: (value: string) => void; class?: string }) {
  let list: HTMLDivElement | undefined
  // The picker puts the value in the band before the first paint, and glides to a new one.
  onSettled(() => {
    if (!list) return
    const stop = bindScrollPicker(list, {
      onSelect: (index) => {
        const option = props.options[index]
        if (option && option.value !== props.value) props.onValueChange(option.value)
      },
    })
    const keep = keepWheelOnValue(list)
    return () => {
      stop()
      keep()
    }
  })
  return (
    <div class={["wheel", props.class].filter(Boolean).join(" ")}>
      <Listbox
        ref={(el: HTMLDivElement) => {
          list = el
        }}
        class="wheel-list"
        aria-label={props.label}
        keepInView={false}
        value={props.value}
        onValueChange={(next: unknown) => {
          if (next != null) props.onValueChange(String(next))
        }}
      >
        <For each={props.options} keyed={(option) => option.value}>
          {(option) => (
            <ListboxItem value={option().value} disabled={option().disabled} class="wheel-option">
              {option().label}
            </ListboxItem>
          )}
        </For>
      </Listbox>
    </div>
  )
}

type TimeWheelLabels = { hour: string; minute: string; period: string; am: string; pm: string }

/** Hours and minutes on two wheels (and AM/PM with a 12-hour clock), as "HH:MM". */
function TimeWheel(props: {
  label?: string
  /** 24-hour "HH:MM". */
  value: string
  onValueChange: (value: string) => void
  minuteStep?: number
  hour12?: boolean
  /** The wheels' words, for other languages. Each wheel is named with the group's label first. */
  labels?: Partial<TimeWheelLabels>
}) {
  const label = () => props.label ?? "Time"
  const hour12 = () => props.hour12 ?? true
  const words = (): TimeWheelLabels => ({ hour: "hour", minute: "minute", period: "AM or PM", am: "AM", pm: "PM", ...props.labels })
  const hour = () => Number(props.value.split(":")[0])
  const minute = () => Number(props.value.split(":")[1])
  const pad = (n: number) => String(n).padStart(2, "0")
  const set = (h: number, m: number) => props.onValueChange(`${pad(h)}:${pad(m)}`)
  // The steps, plus the value's own minute when it falls between them, so the wheel shows it.
  const minutes = createMemo(() => {
    const step = props.minuteStep ?? 5
    return [...new Set([...Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step), minute()])].sort((a, b) => a - b)
  })
  const hours = createMemo(() =>
    (hour12() ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i)).map((n) => ({ value: String(n), label: hour12() ? String(n) : pad(n) })),
  )
  const groupId = createUniqueId()
  return (
    <div class="wheel-group" role="group" aria-labelledby={groupId}>
      <span id={groupId} class="uiset-visually-hidden">
        {label()}
      </span>
      <WheelPicker
        label={`${label()}, ${words().hour}`}
        options={hours()}
        value={String(hour12() ? ((hour() + 11) % 12) + 1 : hour())}
        onValueChange={(next) => set(hour12() ? (Number(next) % 12) + (hour() >= 12 ? 12 : 0) : Number(next), minute())}
      />
      <span class="wheel-colon" aria-hidden="true">
        :
      </span>
      <WheelPicker
        label={`${label()}, ${words().minute}`}
        options={minutes().map((n) => ({ value: String(n), label: pad(n) }))}
        value={String(minute())}
        onValueChange={(next) => set(hour(), Number(next))}
      />
      <Show when={hour12()}>
        <WheelPicker
          label={`${label()}, ${words().period}`}
          options={[
            { value: "am", label: words().am },
            { value: "pm", label: words().pm },
          ]}
          value={hour() >= 12 ? "pm" : "am"}
          onValueChange={(next) => set((hour() % 12) + (next === "pm" ? 12 : 0), minute())}
        />
      </Show>
    </div>
  )
}

/* ---------------------------------------------------------------------- Sheets */

type DrawerProps = ComponentProps<typeof Drawer>
type SnapPoints = NonNullable<DrawerProps["snapPoints"]>

/**
 * A bottom sheet on UI SDK's Drawer. By default it's as tall as its content. Give it
 * `snapPoints` (like `[0.5, 1]`) to rest at heights you drag between or step through with its
 * handle; it then takes the screen's height, so every point has room. Drawer's other props,
 * like `dismissible` or `defaultOpen`, pass through.
 */
function Sheet(
  props: Omit<DrawerProps, "children" | "snapPoints"> & {
    title: string
    description?: string
    trigger?: JSX.Element
    snapPoints?: SnapPoints
    /** The handle's name, for other languages. */
    resizeLabel?: (title: string) => string
    children: JSX.Element
    class?: string
  },
) {
  const snapPoints = () => props.snapPoints ?? ["content"]
  const snaps = () => snapPoints().length > 1
  const drawer = omit(props, "title", "description", "trigger", "snapPoints", "resizeLabel", "children", "class")
  return (
    <Drawer {...(drawer as DrawerProps)} snapPoints={snapPoints()} defaultSnapPoint={props.defaultSnapPoint ?? snapPoints()[0]}>
      {props.trigger}
      <DrawerBackdrop />
      <DrawerContent class={["mobile-sheet", props.class].filter(Boolean).join(" ")} data-snaps={snaps() ? "" : undefined}>
        <Show when={snaps()} fallback={<span class="mobile-sheet-handle" aria-hidden="true" />}>
          <DrawerHandle class="mobile-sheet-handle" aria-label={(props.resizeLabel ?? ((name: string) => `Resize ${name}`))(props.title)} />
        </Show>
        <div class="mobile-sheet-head">
          <DrawerTitle class="mobile-sheet-title">{props.title}</DrawerTitle>
          <Show when={props.description}>
            <DrawerDescription class="mobile-sheet-description">{props.description}</DrawerDescription>
          </Show>
        </div>
        <ScrollBox data-frame="none" class="mobile-sheet-frame" viewport={{ class: "mobile-sheet-scroller", role: "group", "aria-label": "Content" }}>
          <div class="mobile-sheet-body">{props.children}</div>
        </ScrollBox>
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
function ActionSheet(props: { controller: ActionSheetController; title: string; description?: string; actions: ActionSheetAction[]; cancelLabel?: string }) {
  return (
    <Drawer controller={props.controller.controller}>
      <DrawerBackdrop />
      <DrawerContent class="mobile-sheet mobile-action-sheet">
        <div class="mobile-sheet-head">
          <DrawerTitle class="mobile-sheet-title">{props.title}</DrawerTitle>
          <Show when={props.description}>
            <DrawerDescription class="mobile-sheet-description">{props.description}</DrawerDescription>
          </Show>
        </div>
        <div class="mobile-action-list">
          <For each={props.actions} keyed={(action) => action.value}>
            {(action) => (
              <DrawerClose
                value={action().value}
                class="mobile-action"
                data-destructive={action().destructive ? "" : undefined}
                // An agent choosing a destructive action waits for the person.
                data-agent-confirm={action().destructive ? `${action().label} (${props.title})` : undefined}
              >
                {action().label}
              </DrawerClose>
            )}
          </For>
        </div>
        <DrawerClose class="mobile-action mobile-action-cancel">{props.cancelLabel ?? "Cancel"}</DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}

/* ------------------------------------------------------------ Bars and refresh */

type TabBarItem = { id: string; label: string; icon: IconName; href?: string; badge?: number }

/** The bar along the bottom of a phone app: its sections, the current one marked. */
function TabBar(props: {
  label?: string
  items: TabBarItem[]
  value: string
  onValueChange?: (id: string) => void
  /** How a badge reads, after the item's name, for other languages. */
  badgeLabel?: (count: number) => string
}) {
  const badgeLabel = (count: number) => (props.badgeLabel ?? ((n: number) => `${n} new`))(count)
  return (
    <nav class="mobile-tab-bar" aria-label={props.label ?? "Sections"}>
      <ul>
        <For each={props.items} keyed={(item) => item.id}>
          {(item) => {
            const current = () => item().id === props.value
            // The badge is a number on screen; the name says it in words, after the label.
            const name = () => (item().badge ? `${item().label}, ${badgeLabel(item().badge!)}` : undefined)
            const body = () => (
              <>
                <span class="mobile-tab-icon">
                  <Icon name={item().icon} />
                  <Show when={item().badge}>
                    {(badge) => (
                      <span class="mobile-tab-badge" aria-hidden="true">
                        {badge() > 99 ? "99+" : badge()}
                      </span>
                    )}
                  </Show>
                </span>
                <span class="mobile-tab-label">{item().label}</span>
              </>
            )
            return (
              <li>
                <Show
                  when={item().href}
                  fallback={
                    // UI SDK's Button, so agents see and press the sections too.
                    <Button variant="ghost" class="mobile-tab" aria-label={name()} aria-current={current() ? "page" : undefined} onClick={() => props.onValueChange?.(item().id)}>
                      {body()}
                    </Button>
                  }
                >
                  {(href) => (
                    <a
                      class="mobile-tab"
                      href={href()}
                      aria-label={name()}
                      aria-current={current() ? "page" : undefined}
                      onClick={(event) => {
                        // A modified click opens a new tab, leaving this one as it is.
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                        props.onValueChange?.(item().id)
                      }}
                    >
                      {body()}
                    </a>
                  )}
                </Show>
              </li>
            )
          }}
        </For>
      </ul>
    </nav>
  )
}

/** The bar along the top: back, the screen's title, and its actions. */
function AppBar(props: {
  title: JSX.Element
  onBack?: () => void
  backLabel?: string
  actions?: JSX.Element
  /** The title's heading level, to fit the page's outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}) {
  return (
    <header class="mobile-app-bar">
      <Show when={props.onBack} fallback={<span />}>
        {(onBack) => (
          <Button variant="ghost" class="mobile-app-bar-back" onClick={() => onBack()()}>
            <Icon name="chevron" class="mobile-back-icon" />
            {props.backLabel ?? "Back"}
          </Button>
        )}
      </Show>
      <Dynamic component={`h${props.headingLevel ?? 1}`} class="mobile-app-bar-title">
        {props.title}
      </Dynamic>
      <div class="mobile-app-bar-actions">{props.actions}</div>
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
function PullToRefresh(props: {
  onRefresh: () => Promise<unknown>
  /** A refresh that failed; the terminal's words already say so. */
  onError?: (error: unknown) => void
  threshold?: number
  /** The words, for other languages. */
  messages?: Partial<RefreshMessages>
  children: JSX.Element
  class?: string
}) {
  const words = (): RefreshMessages => ({
    refresh: "Refresh",
    pull: "Pull to refresh",
    release: "Release to refresh",
    refreshing: "Refreshing…",
    done: "Up to date.",
    failed: "Couldn't refresh.",
    ...props.messages,
  })
  const threshold = () => props.threshold ?? 64
  let box: HTMLDivElement | undefined
  let scroller: HTMLDivElement | undefined
  let drag: (() => void) | null = null
  const [state, setState] = createSignal<"idle" | "pulling" | "ready" | "refreshing">("idle")
  const [atTop, setAtTop] = createSignal(true)
  // The pull's distance goes straight to a variable: a pull redraws only when its state changes.
  const setPull = (px: number) => box?.style.setProperty("--pull", `${px}px`)
  onCleanup(() => drag?.())
  const refresh = async () => {
    if (state() === "refreshing") return
    setState("refreshing")
    setPull(threshold())
    announce(words().refreshing)
    try {
      await props.onRefresh()
      announce(words().done)
    } catch (error) {
      announce(words().failed)
      props.onError?.(error)
    } finally {
      setState("idle")
      setPull(0)
    }
  }
  const pointerDown = (event: PointerEvent) => {
    const el = scroller
    if (!el || el.scrollTop > 0 || state() === "refreshing" || event.button !== 0) return
    const startX = event.clientX
    const startY = event.clientY
    let distance = 0
    drag?.()
    drag = bindDrag(el, event, {
      threshold: 4,
      // Only a pull down from the top; anything else is a scroll or a tap.
      onStart: (move) => move.clientY > startY && Math.abs(move.clientY - startY) > Math.abs(move.clientX - startX) * 2,
      onMove: ({ y }) => {
        distance = Math.max(0, rubberBand(y - startY, el.clientHeight))
        setPull(distance)
        setState(distance >= threshold() ? "ready" : "pulling")
      },
      onEnd: (_event, canceled) => {
        drag = null
        if (!canceled && distance >= threshold()) void refresh()
        else {
          setPull(0)
          setState("idle")
        }
      },
    })
  }
  return (
    <div
      ref={(el: HTMLDivElement) => {
        box = el
      }}
      class={["mobile-refresh", props.class].filter(Boolean).join(" ")}
      data-state={state()}
    >
      <div class="mobile-refresh-indicator" aria-hidden="true">
        <span class="mobile-refresh-spinner" />
        {state() === "ready" ? words().release : state() === "refreshing" ? words().refreshing : words().pull}
      </div>
      <ScrollBox
        data-frame="none"
        class="mobile-refresh-frame"
        viewport={{
          ref: (el: HTMLDivElement) => {
            scroller = el
          },
          class: "mobile-refresh-scroll",
          role: "group",
          "aria-label": "Content",
          get "data-at-top"() {
            return atTop() ? "" : undefined
          },
          onScroll: (event: Event) => setAtTop((event.currentTarget as HTMLElement).scrollTop <= 0),
          onPointerDown: pointerDown,
        }}
      >
        {/* Disabled while it refreshes, but it keeps focus: no drop to the page. */}
        <Button variant="ghost" class="mobile-refresh-button" onClick={() => void refresh()} disabled={state() === "refreshing"} focusableWhenDisabled>
          {words().refresh}
        </Button>
        <div class="mobile-refresh-content">{props.children}</div>
      </ScrollBox>
    </div>
  )
}

export { ActionSheet, AppBar, PullToRefresh, Sheet, SwipeList, TabBar, TimeWheel, WheelPicker, createActionSheet }
export type { ActionSheetAction, ActionSheetController, RefreshMessages, SwipeAction, SwipeListItem, SwipeListMessages, TabBarItem, TimeWheelLabels, WheelOption }
