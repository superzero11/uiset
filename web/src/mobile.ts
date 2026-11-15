// Mobile for Web Components. The swipe list renders its rows from `items`, like UI SDK's
// data elements; the wheel and pull to refresh wrap UI SDK's listbox and gestures. Sheets,
// action sheets and the app and tab bars are UI SDK's drawer and buttons in UISet's
// classes (docs/web-components.md has the markup).
import { announce, bindDrag, bindScrollPicker } from "@ui-sdk/core"
import { rubberBand } from "@ui-sdk/core/gesture"
import { createParts } from "@ui-sdk/web"
import "@ui-sdk/web/button"
import "@ui-sdk/web/menu"
import { iconElement, type IconName } from "@/registry/uiset/ui/shell/icon-paths"
import { swipeList, type SwipeSide } from "@/registry/uiset/ui/mobile/swipe-list"
import "@/registry/uiset/ui/mobile/mobile.css"
import { place, upgradeProperties } from "./dom"
import "./mobile.css"

type SwipeAction = { id: string; label: string; icon?: IconName; tone?: "danger" | "accent" | "neutral" }
type SwipeItem = { id: string; label?: string; content: string | Node; start?: SwipeAction[]; end?: SwipeAction[] }
type SwipeMessages = { help: string; actionsFor: (row: string) => string }

type SwipeListElement = HTMLElement & {
  items?: SwipeItem[]
  messages?: Partial<SwipeMessages>
  api?: { act: (row: string, action: string, focus?: boolean) => void }
}

/** A boolean attribute, as UI SDK reads them: on when present, unless it says "false". */
const isOn = (el: Element, name: string) => el.hasAttribute(name) && el.getAttribute(name) !== "false"

const words = (el: SwipeListElement): SwipeMessages => ({
  help: isOn(el, "openable")
    ? "Left and Right show this row's actions; Escape hides them; Enter opens it."
    : "Left and Right show this row's actions; Escape hides them.",
  actionsFor: (row) => `Actions for ${row}`,
  ...el.messages,
})

let ids = 0
/** A row's name: its label, or the text of its content. */
const nameOf = (item: SwipeItem) => item.label ?? (typeof item.content === "string" ? item.content : item.content.textContent?.trim()) ?? item.id
const actionsOf = (item?: SwipeItem) => [...(item?.start ?? []), ...(item?.end ?? [])]
const danger = (item: SwipeItem, action: SwipeAction) => (action.tone === "danger" ? `${action.label}: ${nameOf(item)}` : undefined)

function defineMobile() {
  createParts(swipeList, {
    root: {
      tag: "uiset-swipe-list",
      properties: ["items", "messages"],
      api: ["act", "run", "openRow"],
      // With `items`, the rows come from data: their names, actions and long swipes do too.
      options: (el) => {
        const list = el as SwipeListElement
        if (!list.items) return {}
        const byId = (key: string) => list.items?.find((item) => item.id === key)
        return {
          // Without `openable`, rows don't open: Enter does nothing and agents are told so.
          ...(isOn(el, "openable") ? {} : { onOpen: undefined }),
          rows: () => (list.items ?? []).map((item) => ({ value: item.id, label: nameOf(item) })),
          actionsOf: (key: string) => {
            const item = byId(key)
            return actionsOf(item).map((action) => ({
              id: action.id,
              label: action.label,
              confirm: item && danger(item, action),
              via: item && words(list).actionsFor(nameOf(item)),
            }))
          },
          disabled: (key: string) => actionsOf(byId(key)).length === 0,
          onFullSwipe: (key: string, side: SwipeSide) => {
            const item = byId(key)
            const first = item?.[side]?.[0]
            if (!item || !first) return false
            // A swipe is a pointer's: focus stays where it was, as in React.
            list.api?.act(key, first.id, false)
            announce(`${first.label}: ${nameOf(item)}`)
            return true
          },
        }
      },
      render: (el) => renderRows(el as SwipeListElement),
    },
    row: "uiset-swipe-row",
    content: "uiset-swipe-content",
    actions: "uiset-swipe-actions",
  })

  customElements.define("uiset-wheel", UISetWheel)
  customElements.define("uiset-pull-refresh", UISetPullRefresh)
}

/* ------------------------------------------------------------------- Swipe rows */

type RowElement = HTMLElement & { _sig?: string }

function actionButton(el: SwipeListElement, item: SwipeItem, action: SwipeAction) {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "swipe-action"
  button.dataset.tone = action.tone ?? "accent"
  button.dataset.action = action.id
  const confirm = danger(item, action)
  if (confirm) button.dataset.agentConfirm = confirm
  if (action.icon) button.append(iconElement(action.icon))
  button.append(action.label)
  button.addEventListener("click", () => el.api?.act(item.id, action.id))
  return button
}

/** Focus for a row after an action from its menu: the row, or the one now in its place. */
function focusRowSoon(el: SwipeListElement, id: string) {
  const rows = () => [...el.querySelectorAll<HTMLElement>(":scope > uiset-swipe-row")]
  const at = rows().findIndex((row) => row.getAttribute("value") === id)
  // After the list redraws and the menu has handed focus back to its (gone) trigger.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const now = rows()
      const target = now.find((row) => row.getAttribute("value") === id) ?? now[Math.min(at, now.length - 1)]
      target?.focus()
    }),
  )
}

/** A row's parts: its actions on each side, its content, and the menu for screen readers. */
function rowParts(el: SwipeListElement, item: SwipeItem, bodyId: string) {
  const parts: HTMLElement[] = []
  const all = actionsOf(item)
  for (const side of ["start", "end"] as const) {
    const list = item[side]
    if (!list?.length) continue
    const actions = document.createElement("uiset-swipe-actions")
    actions.className = "swipe-actions"
    actions.dataset.side = side
    actions.setAttribute("value", `${item.id}:${side}`)
    actions.setAttribute("row", item.id)
    actions.setAttribute("side", side)
    actions.append(...list.map((action) => actionButton(el, item, action)))
    parts.push(actions)
  }
  const content = document.createElement("uiset-swipe-content")
  content.className = "swipe-content"
  content.setAttribute("value", item.id)
  const body = document.createElement("span")
  body.id = bodyId
  body.className = "swipe-content-body"
  body.append(item.content)
  content.append(body)
  if (all.length) {
    // Out of the tab order (rows are one stop, with arrows) and out of sight until focused,
    // for screen readers' own navigation, where neither swipes nor arrows reach the actions.
    const menu = document.createElement("ui-menu")
    // The whole menu, popup included, is out of the row's own keys and presses.
    menu.dataset.swipeMenu = ""
    const trigger = document.createElement("ui-menu-trigger")
    const button = document.createElement("button")
    button.type = "button"
    button.className = "swipe-menu"
    button.dataset.swipeMenu = ""
    button.tabIndex = -1
    button.setAttribute("aria-label", words(el).actionsFor(nameOf(item)))
    button.append(iconElement("more"))
    trigger.append(button)
    const list = document.createElement("ui-menu-content")
    for (const action of all) {
      const entry = document.createElement("ui-menu-item")
      entry.setAttribute("value", action.id)
      if (action.tone === "danger") entry.setAttribute("destructive", "")
      const confirm = danger(item, action)
      if (confirm) entry.dataset.agentConfirm = confirm
      entry.textContent = action.label
      list.append(entry)
    }
    menu.append(trigger, list)
    menu.addEventListener("action", (event) => {
      el.api?.act(item.id, String((event as CustomEvent<{ value: unknown }>).detail.value))
      focusRowSoon(el, item.id)
    })
    content.append(menu)
  }
  parts.push(content)
  return parts
}

/** Fills a row (new, or kept with new details) and its name. */
function fillRow(el: SwipeListElement, row: RowElement, item: SwipeItem, helpId: string) {
  const bodyId = row.querySelector(".swipe-content-body")?.id ?? `uiset-swipe-${++ids}`
  row.className = "swipe-row"
  row.setAttribute("value", item.id)
  if (item.label) {
    row.setAttribute("aria-label", item.label)
    row.removeAttribute("aria-labelledby")
  } else {
    row.removeAttribute("aria-label")
    row.setAttribute("aria-labelledby", bodyId)
  }
  if (actionsOf(item).length) row.setAttribute("aria-describedby", helpId)
  else row.removeAttribute("aria-describedby")
  // An action that had focus gets it back in the new parts.
  const focusedAction = (document.activeElement as HTMLElement | null)?.closest?.("[data-action]")
  const actionId = focusedAction && row.contains(focusedAction) ? focusedAction.getAttribute("data-action") : null
  row.replaceChildren(...rowParts(el, item, bodyId))
  if (actionId) row.querySelector<HTMLElement>(`[data-action="${CSS.escape(actionId)}"]`)?.focus()
}

// What a row shows, so a row is filled again only when that changed.
const signature = (el: SwipeListElement, item: SwipeItem) =>
  JSON.stringify([item.label, typeof item.content === "string" ? item.content : null, item.start, item.end, words(el).actionsFor(nameOf(item))])

function renderRows(el: SwipeListElement) {
  el.classList.add("swipe-list")
  const items = el.items
  if (!items) return
  let help = el.querySelector<HTMLElement>(":scope > [data-swipe-help]")
  if (!help) {
    help = document.createElement("span")
    help.hidden = true
    help.dataset.swipeHelp = ""
    help.id = `uiset-swipe-help-${++ids}`
    el.append(help)
  }
  help.textContent = words(el).help
  const rows = [...el.querySelectorAll<RowElement>(":scope > uiset-swipe-row")]
  const existing = new Map(rows.map((row) => [row.getAttribute("value")!, row]))
  // A focused row that goes hands focus to the row now in its place.
  const focusedRow = rows.find((row) => row.contains(document.activeElement))
  const focusedAt = focusedRow ? rows.indexOf(focusedRow) : -1
  // Rows are kept by id: a row that stays keeps its element, its focus and its open actions.
  const ordered = items.map((item) => {
    let row = existing.get(item.id)
    existing.delete(item.id)
    const sig = signature(el, item)
    if (!row) {
      row = document.createElement("uiset-swipe-row") as RowElement
      fillRow(el, row, item, help.id)
    } else if (row._sig !== sig) fillRow(el, row, item, help.id)
    else if (typeof item.content !== "string") {
      const body = row.querySelector(".swipe-content-body")
      if (body && body.firstChild !== item.content) body.replaceChildren(item.content)
    }
    row._sig = sig
    return row
  })
  const removedFocused = !!focusedRow && existing.has(focusedRow.getAttribute("value")!)
  for (const row of existing.values()) row.remove()
  place(el, ordered, (child) => child.localName === "uiset-swipe-row")
  if (removedFocused && ordered.length) {
    const target = ordered[Math.min(focusedAt, ordered.length - 1)]
    queueMicrotask(() => target?.focus())
  }
}

/* ------------------------------------------------------------------------ Wheel */

type WheelListbox = HTMLElement & { api: { setValue: (v: unknown) => void }; value: unknown }

/**
 * <uiset-wheel> around a <ui-listbox class="wheel-list" keep-in-view="false">: the option in
 * the middle is the value, picked as the wheel scrolls (UI SDK's bindScrollPicker). A listbox
 * a framework swaps in is bound in turn.
 */
class UISetWheel extends HTMLElement {
  #stop?: () => void
  #watch?: MutationObserver
  #children?: MutationObserver
  #bound: WheelListbox | null = null

  connectedCallback() {
    this.#children ??= new MutationObserver(() => void this.bind())
    this.#children.observe(this, { childList: true })
    void this.bind()
  }

  disconnectedCallback() {
    this.#children?.disconnect()
    this.#unbind()
  }

  #unbind() {
    this.#stop?.()
    this.#watch?.disconnect()
    this.#stop = undefined
    this.#bound = null
  }

  async bind() {
    await customElements.whenDefined("ui-listbox")
    const listbox = this.querySelector<WheelListbox>(":scope > ui-listbox")
    if (!this.isConnected || listbox === this.#bound) return
    this.#unbind()
    if (!listbox) return
    this.#bound = listbox
    this.#stop = bindScrollPicker(listbox, {
      onSelect: (index) => {
        const option = listbox.querySelectorAll("ui-listbox-item")[index]
        const value = option?.getAttribute("value")
        if (value != null && listbox.value !== value) listbox.api.setValue(value)
      },
    })
    // Focus in the wheel stays on its value: a value set from elsewhere would otherwise leave
    // focus on the old option, and anything that reveals the focused element (a sheet coming
    // to rest) would scroll the wheel back and choose it again.
    this.#watch = new MutationObserver(() => {
      const focused = document.activeElement
      if (!(focused instanceof HTMLElement) || !listbox.contains(focused) || focused.getAttribute("aria-selected") === "true") return
      listbox.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true })
    })
    this.#watch.observe(listbox, { subtree: true, attributeFilter: ["aria-selected"] })
  }
}

/* ------------------------------------------------------------- Pull to refresh */

type RefreshMessages = { refresh: string; pull: string; release: string; refreshing: string; done: string; failed: string }

/**
 * <uiset-pull-refresh> scrolls what's inside it; pulled down from the top past `threshold`
 * (64px), it fires `refresh`. Pass a Promise to `event.detail.waitUntil()` and it shows
 * Refreshing until that settles; a rejection is announced and fires `refresherror`. A
 * Refresh button shows on keyboard focus, for everyone who doesn't pull.
 */
class UISetPullRefresh extends HTMLElement {
  static observedAttributes = ["threshold"]
  #messages: Partial<RefreshMessages> = {}
  #indicator: HTMLElement
  #label: HTMLElement
  #wrap: HTMLElement
  #button: HTMLButtonElement
  #drag: (() => void) | null = null
  #state: "idle" | "pulling" | "ready" | "refreshing" = "idle"
  #children?: MutationObserver

  constructor() {
    super()
    this.#indicator = document.createElement("div")
    this.#indicator.className = "mobile-refresh-indicator"
    this.#indicator.setAttribute("aria-hidden", "true")
    const spinner = document.createElement("span")
    spinner.className = "mobile-refresh-spinner"
    this.#label = document.createElement("span")
    this.#indicator.append(spinner, this.#label)
    // Disabled while it refreshes, but it keeps focus: UI SDK's focusable-when-disabled.
    this.#wrap = document.createElement("ui-button")
    this.#wrap.dataset.refreshButton = ""
    this.#wrap.setAttribute("focusable-when-disabled", "")
    this.#button = document.createElement("button")
    this.#button.type = "button"
    this.#button.className = "mobile-refresh-button"
    this.#button.dataset.variant = "ghost"
    this.#button.addEventListener("click", () => void this.refresh())
    this.#wrap.append(this.#button)
    upgradeProperties(this, ["messages", "threshold"])
  }

  /** The words, for other languages. */
  get messages(): Partial<RefreshMessages> {
    return this.#messages
  }
  set messages(v: Partial<RefreshMessages>) {
    this.#messages = v ?? {}
    this.#words()
  }

  /** How far to pull, in pixels, before letting go refreshes. */
  get threshold() {
    return Number(this.getAttribute("threshold")) || 64
  }
  set threshold(v: number) {
    this.setAttribute("threshold", String(v))
  }

  get #text(): RefreshMessages {
    return {
      refresh: "Refresh",
      pull: "Pull to refresh",
      release: "Release to refresh",
      refreshing: "Refreshing…",
      done: "Up to date.",
      failed: "Couldn't refresh.",
      ...this.#messages,
    }
  }

  #words() {
    const w = this.#text
    this.#button.textContent = w.refresh
    this.#label.textContent = this.#state === "ready" ? w.release : this.#state === "refreshing" ? w.refreshing : w.pull
  }

  // The indicator and the button go first; the page's children stay as they are. A framework
  // that clears the children (Solid, Svelte) gets them put back.
  #ensureParts() {
    if (this.firstElementChild !== this.#indicator) this.prepend(this.#indicator)
    if (this.#indicator.nextElementSibling !== this.#wrap) this.#indicator.after(this.#wrap)
  }

  connectedCallback() {
    this.#ensureParts()
    this.#children ??= new MutationObserver(() => {
      if (!this.contains(this.#indicator) || !this.contains(this.#wrap)) this.#ensureParts()
    })
    this.#children.observe(this, { childList: true })
    // Moving the element keeps a refresh in progress as it is.
    this.#setState(this.#state)
    this.addEventListener("pointerdown", this.#onPointerDown)
    this.addEventListener("scroll", this.#onScroll, { passive: true })
    this.#onScroll()
  }

  disconnectedCallback() {
    this.#children?.disconnect()
    this.removeEventListener("pointerdown", this.#onPointerDown)
    this.removeEventListener("scroll", this.#onScroll)
    this.#drag?.()
    this.#drag = null
  }

  #setState(next: "idle" | "pulling" | "ready" | "refreshing") {
    this.#state = next
    this.dataset.state = next
    this.#words()
    this.#wrap.toggleAttribute("disabled", next === "refreshing")
  }

  #setPull(px: number) {
    this.style.setProperty("--pull", `${px}px`)
  }

  #onScroll = () => this.toggleAttribute("data-at-top", this.scrollTop <= 0)

  /** Refreshes now, as a pull would. */
  async refresh() {
    if (this.#state === "refreshing") return
    const w = this.#text
    this.#setState("refreshing")
    this.#setPull(this.threshold)
    announce(w.refreshing)
    const waits: Promise<unknown>[] = []
    this.dispatchEvent(new CustomEvent("refresh", { detail: { waitUntil: (promise: Promise<unknown>) => waits.push(promise) } }))
    try {
      await Promise.all(waits)
      announce(w.done)
    } catch (error) {
      announce(w.failed)
      this.dispatchEvent(new CustomEvent("refresherror", { detail: { error } }))
    } finally {
      this.#setState("idle")
      this.#setPull(0)
    }
  }

  #onPointerDown = (event: PointerEvent) => {
    if (this.scrollTop > 0 || this.#state === "refreshing" || event.button !== 0) return
    // Not from controls, nor from popups that open inside the list (a row's menu): a press
    // there is theirs, and a drag would take the pointer from them.
    const own = "button, a, input, textarea, select, [contenteditable], [popover], dialog, [role='menu'], [role='dialog'], [role='listbox']"
    if ((event.target as Element).closest(own)) return
    const startX = event.clientX
    const startY = event.clientY
    let distance = 0
    this.#drag?.()
    this.#drag = bindDrag(this, event, {
      threshold: 4,
      // Only a pull down from the top; anything else is a scroll or a tap.
      onStart: (move) => move.clientY > startY && Math.abs(move.clientY - startY) > Math.abs(move.clientX - startX) * 2,
      onMove: ({ y }) => {
        distance = Math.max(0, rubberBand(y - startY, this.clientHeight))
        this.#setPull(distance)
        const next = distance >= this.threshold ? "ready" : "pulling"
        if (next !== this.#state) this.#setState(next)
      },
      onEnd: (_event, canceled) => {
        this.#drag = null
        if (!canceled && distance >= this.threshold) void this.refresh()
        else {
          this.#setPull(0)
          this.#setState("idle")
        }
      },
    })
  }
}

export { defineMobile, UISetPullRefresh, UISetWheel }
export type { RefreshMessages, SwipeAction, SwipeItem, SwipeMessages }
