import { createRovingFocus, definePrimitive, selects } from "@ui-sdk/core"

// The part of a chart people and assistive tech use. The SVG only draws; over it sits a
// listbox with one option per data position (an x for lines, a category for bars, a
// point for scatter, a part for a segmented bar). One tab stop, arrows between options,
// Enter to pin one. Hover and focus share the same "active" option, so the tooltip and
// the crosshair follow either.

type ChartSelectDetails = {
  /** What the person used. */
  source: "keyboard" | "pointer"
  /** "toggle" pins or unpins a position; "dismiss" is Escape letting go of the pin. */
  reason: "toggle" | "dismiss"
}

/** Every way a chart's pin changes, as its frame reports it: a person's, an agent's, or the data dropping the pinned position. */
type ChartSelectChange = {
  source: ChartSelectDetails["source"] | "agent" | "data"
  reason: ChartSelectDetails["reason"] | "command" | "removed"
}

type ChartCommands = {
  select?: (point: string | null) => boolean
  isolate?: (series: string) => boolean
  showAll?: () => boolean
  showTable?: (shown: boolean) => boolean
}

type ChartPointsOptions = {
  /** Which arrows move: Left/Right for lines and columns, Up/Down for horizontal bars. */
  orientation?: "horizontal" | "vertical" | "both"
  /** Options laid out in rows of this many, like a heatmap: Up and Down move by a row. */
  columns?: number
  /** The pointer picks the nearest option (scatter), so a click pins that one, not the box under it. */
  nearest?: boolean
  /** The pinned option's key, or null. */
  selected?: string | null
  /** A person pins or unpins a position: how, and why. Agents pin through `commands.select`. */
  onSelect?: (key: string | null, details: ChartSelectDetails) => void
  /** The option under the pointer or holding focus, for the tooltip and crosshair. */
  onActiveChange?: (key: string | null) => void
  /** The data as rows, for agents. */
  items?: () => unknown[]
  /** What the chart shows now (series, view), for agents. */
  view?: object
  commands?: ChartCommands
}

/**
 * Agents read items as `{ value, label }` and drop other fields, so a row as a person
 * reads it goes in the label: its first field, then the rest, like "Jan (Revenue: $12k)".
 */
const asItems = (rows: unknown[], valueKey?: string) =>
  rows.map((row, index) => {
    if (!row || typeof row !== "object") return { value: String(row), label: String(row) }
    const record = row as Record<string, unknown>
    const entries = Object.entries(record).filter(([key]) => key !== valueKey)
    const [first, ...rest] = entries
    const head = first ? String(first[1]) : ""
    const label = rest.length ? `${head} (${rest.map(([key, value]) => `${key}: ${value}`).join(", ")})` : head
    return { value: valueKey && valueKey in record ? String(record[valueKey]) : head || String(index), label }
  })

/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const chartPoints = definePrimitive({
  name: "chart",
  options: {
    orientation: "string",
    columns: "number",
    nearest: "boolean",
    selected: "value",
    onSelect: "callback",
    onActiveChange: "callback",
    items: "value",
    view: "value",
    commands: "value",
  },
  state: (options: ChartPointsOptions) => ({
    focused: null as string | null,
    active: null as string | null,
    selected: options.selected ?? null,
    view: options.view ?? {},
    orientation: options.orientation ?? "horizontal",
    grid: (options.columns ?? 0) > 0,
  }),
  sync: (options) => ({
    selected: options.selected ?? null,
    view: options.view ?? {},
    orientation: options.orientation ?? "horizontal",
    grid: (options.columns ?? 0) > 0,
  }),
  api: (context) => {
    const opts = () => context.options()
    const roving = createRovingFocus(context, {
      slot: "point",
      key: "focused",
      // Data order with Home and End; Up and Down move a row when options form a grid,
      // and stop at its edges. Charts draw left to right in every language, so Right is
      // always the next position. Modified arrows are left to the browser.
      move: (event, { from, items }) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return undefined
        const index = items.findIndex((item) => item.key === from.key)
        const columns = opts().columns ?? 0
        const orientation = opts().orientation ?? "horizontal"
        const across = columns > 0 || orientation !== "vertical"
        const down = columns > 0 ? columns : orientation !== "horizontal" ? 1 : 0
        // In a grid, Left and Right stop at the row's ends instead of wrapping to the next.
        const atRowStart = columns > 0 && index % columns === 0
        const atRowEnd = columns > 0 && index % columns === columns - 1
        let next: number | undefined
        if (event.key === "Home") next = 0
        else if (event.key === "End") next = items.length - 1
        else if (event.key === "ArrowRight" && across) next = atRowEnd ? index : index + 1
        else if (event.key === "ArrowLeft" && across) next = atRowStart ? index : index - 1
        else if (event.key === "ArrowDown" && down) next = index + down
        else if (event.key === "ArrowUp" && down) next = index - down
        if (next === undefined) return undefined
        if (next < 0 || next >= items.length) return from.key
        return items[next]?.key
      },
    })
    const setActive = (key: string | null) => {
      if (context.store.get().active === key) return
      context.store.set({ active: key })
      opts().onActiveChange?.(key)
    }
    const command = <K extends keyof ChartCommands>(name: K) => {
      const run = opts().commands?.[name]
      if (!run) throw new Error(`This chart doesn't support ${name}.`)
      return run as NonNullable<ChartCommands[K]>
    }
    const toggle = (key: string, source: ChartSelectDetails["source"] = "pointer") => {
      opts().onSelect?.(context.store.get().selected === key ? null : key, { source, reason: "toggle" })
    }
    return {
      roving,
      setActive,
      toggle,
      /** Pins (or unpins) the option under the pointer or holding focus. */
      toggleActive: () => {
        const key = context.store.get().active
        if (key !== null) toggle(key)
      },
      nearest: () => opts().nearest ?? false,
      items: () => asItems(opts().items?.() ?? []),
      keydown(event: KeyboardEvent, key: string, el: HTMLElement | undefined) {
        // `press` covers clicks and screen readers; an option gets no click from keys.
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          toggle(key, "keyboard")
          return
        }
        if (event.key === "Escape") {
          // Unpin first; with nothing pinned, Escape dismisses the tooltip (WCAG 1.4.13).
          if (context.store.get().selected !== null) {
            event.preventDefault()
            opts().onSelect?.(null, { source: "keyboard", reason: "dismiss" })
            return
          }
          if (context.store.get().active !== null) {
            event.preventDefault()
            setActive(null)
            return
          }
        }
        if (el) roving.keydown(event, el)
      },
      select: (point: string | null) => command("select")(point),
      isolate: (series: string) => command("isolate")(series),
      showAll: () => command("showAll")(),
      showTable: (shown: boolean) => command("showTable")(shown),
    }
  },
  slots: (slot) => ({
    root: slot({
      role: "listbox",
      keys: { none: "Each option handles the arrows." },
      attrs: (state) => ({
        // A grid of options (a heatmap) moves both ways, so it names no single direction.
        "aria-orientation": state.grid
          ? undefined
          : state.orientation === "vertical"
            ? "vertical"
            : "horizontal",
      }),
      on: {
        // Leaving with the pointer falls back to this chart's focused option, if any.
        pointerleave: (_event, { api, store, el }) => {
          const inside = !!el && el.contains(document.activeElement)
          api.setActive(inside ? store.get().focused : null)
        },
      },
    }),
    point: slot<{ value: string }, { active: boolean; selected: boolean }>({
      props: { value: "string" },
      role: "option",
      focus: "roving",
      keys: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter", " ", "Escape"],
      // A click or a screen reader's activation pins the option; Enter and Space do too.
      // With nearest-point picking, a real click belongs to the chart, which pins the
      // point the tooltip shows rather than the box under the pointer.
      press: ({ api, key }, event) => {
        const pointer = event instanceof MouseEvent && event.detail > 0
        if (pointer && api.nearest()) return
        api.toggle(key, pointer ? "pointer" : "keyboard")
      },
      selects: selects({
        active: ({ key }) => [key, null],
        selected: ({ key }) => [key, null],
        focused: ({ key }) => [key, null],
      }),
      state: (state, { key }) => ({ active: state.active === key, selected: state.selected === key }),
      attrs: (state, part) => ({
        tabindex: part.api.roving.tabIndex(state, part),
        "aria-selected": String(state.selected === part.key),
        "data-active": state.active === part.key ? "" : undefined,
        "data-selected": state.selected === part.key ? "" : undefined,
      }),
      on: {
        keydown: (event, { api, key, el }) => api.keydown(event as KeyboardEvent, key, el),
        focus: (_event, { api, key }) => api.setActive(key),
        blur: (_event, { api }) => api.setActive(null),
        pointermove: (_event, { api, key }) => api.setActive(key),
      },
      bind: (el, part) => part.api.roving.bind(el, part),
    }),
  }),
  agent: {
    actions: ["select", "isolate", "showAll", "showTable"],
    items: (api) => api.items(),
  },
})

export { chartPoints }
export type { ChartCommands, ChartPointsOptions, ChartSelectChange, ChartSelectDetails }
