import {
  bindDrag,
  createChange,
  createCommit,
  css,
  definePrimitive,
  dragThreshold,
  isRTL,
  type ChangeDetails,
  type CommitDetails,
} from "@ui-sdk/core"
import {
  clamp,
  formatNumber,
  fractionOf,
  scrubTo,
  stepBy,
  stepFromKey,
  valueAt,
} from "@ui-sdk/core/number"

type KnobReason = "drag" | "step-key" | "imperative" | "double-press"
type KnobScale = "linear" | "log"

type KnobOptions = {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  largeStep?: number
  scale?: KnobScale
  disabled?: boolean
  locale?: string
  format?: Intl.NumberFormatOptions | ((value: number) => string)
  onValueChange?: (value: number, details: ChangeDetails<KnobReason>) => void
  onValueCommit?: (value: number, details: CommitDetails<KnobReason>) => void
}

type KnobFormat = KnobOptions["format"]

// Pixels of vertical travel for the full range; Shift makes it six times finer.
const travel = 220

function textOf(value: number, format: KnobFormat, locale: string | undefined) {
  if (typeof format === "function") return format(value)
  return formatNumber(value, locale ?? "en-US", format ?? { maximumFractionDigits: 2 })
}

const knob = definePrimitive({
  name: "knob",
  options: {
    value: "number",
    defaultValue: "number",
    min: "number",
    max: "number",
    step: "number",
    largeStep: "number",
    scale: "string",
    disabled: "boolean",
    locale: "string",
    format: "value",
    onValueChange: "callback",
    onValueCommit: "callback",
  },
  controlled: ["value"],
  commits: ["value"],
  state: (options: KnobOptions) => {
    const min = options.min ?? 0
    const max = options.max ?? 100
    return {
      value: clamp(options.value ?? options.defaultValue ?? min, min, max),
      initial: clamp(options.defaultValue ?? options.value ?? min, min, max),
      min,
      max,
      step: options.step ?? 1,
      largeStep: options.largeStep,
      scale: options.scale ?? ("linear" as KnobScale),
      disabled: options.disabled ?? false,
      format: options.format as KnobFormat,
      locale: options.locale,
      dragging: false,
    }
  },
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    min: options.min ?? 0,
    max: options.max ?? 100,
    step: options.step ?? 1,
    largeStep: options.largeStep,
    scale: options.scale ?? "linear",
    disabled: options.disabled ?? false,
    format: options.format,
    locale: options.locale,
  }),
  api: (context) => {
    const change = createChange(context)
    const commit = createCommit(context)
    let stop: (() => void) | undefined
    context.onDestroy(() => stop?.())

    const range = () => {
      const { min, max, step, largeStep } = context.store.get()
      return { min, max, step, largeStep }
    }
    const fraction = (value: number) =>
      fractionOf(value, range(), context.store.get().scale)
    const valueFrom = (position: number) =>
      scrubTo(valueAt(clamp(position, 0, 1), range(), context.store.get().scale), range())
        .value
    const set = (value: number, reason: KnobReason, event?: Event) => {
      const next = scrubTo(value, range()).value
      const changed = change("value", next, { reason, event })
      commit("value", context.store.get().value, { reason, event })
      return changed
    }

    return {
      fraction,
      setValue: (value: number) => set(value, "imperative"),
      increment: () =>
        set(
          stepBy(context.store.get().value, { direction: 1, size: "small" }, range()),
          "imperative",
        ),
      decrement: () =>
        set(
          stepBy(context.store.get().value, { direction: -1, size: "small" }, range()),
          "imperative",
        ),
      reset: (event?: Event) => set(context.store.get().initial, "double-press", event),
      keydown(event: KeyboardEvent, el: HTMLElement) {
        if (context.store.get().disabled) return
        const move = stepFromKey(event, { dir: isRTL(el) ? "rtl" : "ltr" })
        if (!move) return
        event.preventDefault()
        set(stepBy(context.store.get().value, move, range()), "step-key", event)
      },
      pointerdown(event: PointerEvent, el: HTMLElement) {
        if (event.button !== 0 || context.store.get().disabled) return
        event.preventDefault()
        el.focus({ preventScroll: true })
        const start = context.store.get().value
        let position = fraction(start)
        // onMove runs once a frame with the latest event, so movementX/Y would drop the
        // other events in that frame. Measure from the last position seen instead.
        let last = { x: event.clientX, y: event.clientY }
        stop?.()
        stop = bindDrag(el, event, {
          threshold: dragThreshold,
          cancelOnEscape: true,
          onStart: () => {
            context.store.set({ dragging: true })
          },
          onMove: ({ x, y, event: move }) => {
            const fine = move.shiftKey ? 6 : 1
            position = clamp(
              position + (x - last.x - (y - last.y)) / (travel * fine),
              0,
              1,
            )
            last = { x, y }
            change("value", valueFrom(position), { reason: "drag", event: move })
          },
          onEnd: (end, canceled) => {
            context.store.set({ dragging: false })
            if (canceled) change("value", start, { reason: "drag", event: end })
            commit("value", context.store.get().value, { reason: "drag", event: end })
          },
        })
      },
    }
  },
  slots: (slot) => ({
    root: slot<
      {},
      {
        value: number
        fraction: number
        text: string
        dragging: boolean
        disabled: boolean
      }
    >({
      role: "slider",
      focus: "tab-stop",
      keys: [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "PageUp",
        "PageDown",
        "Home",
        "End",
      ],
      state: (state, { api }) => ({
        value: state.value,
        fraction: api.fraction(state.value),
        text: textOf(state.value, state.format, state.locale),
        dragging: state.dragging,
        disabled: state.disabled,
      }),
      attrs: (state, { api }) => ({
        tabindex: state.disabled ? "-1" : "0",
        "aria-valuenow": String(state.value),
        "aria-valuemin": String(state.min),
        "aria-valuemax": String(state.max),
        "aria-valuetext": textOf(state.value, state.format, state.locale),
        "aria-disabled": state.disabled ? "true" : undefined,
        "data-disabled": state.disabled ? "" : undefined,
        "data-dragging": state.dragging ? "" : undefined,
        style: css({ "--knob-fraction": String(api.fraction(state.value)) }),
      }),
      on: {
        keydown: (event, { el, api }) => {
          if (el) api.keydown(event as KeyboardEvent, el)
        },
        pointerdown: (event, { el, api }) => {
          if (el) api.pointerdown(event as PointerEvent, el)
        },
        dblclick: (event, { api, store }) => {
          if (!store.get().disabled) api.reset(event)
        },
      },
    }),
    indicator: slot({
      attrs: () => ({ "aria-hidden": "true" }),
    }),
    value: slot<{}, { text: string }>({
      state: (state) => ({ text: textOf(state.value, state.format, state.locale) }),
      attrs: () => ({ "aria-hidden": "true" }),
    }),
  }),
  agent: { actions: ["setValue", "increment", "decrement", "reset"] },
})

export { knob }
export type { KnobOptions, KnobReason, KnobScale }
