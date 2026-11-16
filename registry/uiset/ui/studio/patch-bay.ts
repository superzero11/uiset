import {
  createChange,
  createConnect,
  definePrimitive,
  live,
  type ChangeDetails,
  type ConnectDraft,
} from "@ui-sdk/core"
import { localPoint } from "./cables"

type Cable = { from: string; to: string }
type PatchReason = "drag" | "connect-key" | "imperative"

type PatchBayOptions = {
  value?: Cable[]
  defaultValue?: Cable[]
  labels?: Record<string, string>
  onValueChange?: (cables: Cable[], details: ChangeDetails<PatchReason>) => void
}

const isOut = (key: string) => key.endsWith(":out")
const isIn = (key: string) => key.endsWith(":in")

function describe(cables: Cable[], key: string, labels: Record<string, string>) {
  const name = (port: string) => labels[port] ?? port
  const peers = cables
    .filter((cable) => cable.from === key || cable.to === key)
    .map((cable) => name(cable.from === key ? cable.to : cable.from))
  return peers.length ? `Patched to ${peers.join(", ")}` : "Not patched"
}

const patchBay = definePrimitive({
  name: "patch-bay",
  options: {
    value: "value",
    defaultValue: "value",
    labels: "value",
    onValueChange: "callback",
  },
  controlled: ["value"],
  live: ["connecting"],
  state: (options: PatchBayOptions) => ({
    value: options.value ?? options.defaultValue ?? ([] as Cable[]),
    labels: options.labels ?? ({} as Record<string, string>),
    connecting: null as ConnectDraft | null,
  }),
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    labels: options.labels ?? {},
  }),
  api: (context) => {
    const change = createChange(context)
    let surface: HTMLElement | null = null

    const label = (key: string) => context.store.get().labels[key] ?? key
    const resolve = (name: string) => {
      const { labels } = context.store.get()
      if (name in labels) return name
      const wanted = name.trim().toLowerCase()
      return (
        Object.keys(labels).find((key) => labels[key]!.toLowerCase() === wanted) ?? name
      )
    }
    // An input takes one cable, so patching into a used input replaces its cable.
    // Patching a pair that's already connected pulls that cable out.
    const toggle = (
      from: string,
      to: string,
      details: ChangeDetails<PatchReason>["reason"],
      event?: Event,
    ) => {
      const cables = context.store.get().value
      const exists = cables.some((cable) => cable.from === from && cable.to === to)
      const next = exists
        ? cables.filter((cable) => !(cable.from === from && cable.to === to))
        : [...cables.filter((cable) => cable.to !== to), { from, to }]
      return change("value", next, { reason: details, event })
    }

    const wiring = createConnect(context, {
      slot: "jack",
      draft: "connecting",
      canConnect: (from, to) => isOut(from) && isIn(to),
      point: (x, y) => (surface ? localPoint(surface, x, y) : { x, y }),
      label,
      connect: (from, to, details) => toggle(from, to, details.reason, details.event),
    })

    return {
      wiring,
      label,
      surface: (el: HTMLElement | null) => {
        surface = el
      },
      ports: () =>
        Object.entries(context.store.get().labels).map(([value, text]) => ({
          value,
          label: text,
        })),
      plug(from: string, to: string) {
        const source = resolve(from)
        const target = resolve(to)
        if (!isOut(source) || !isIn(target)) return false
        const exists = context.store
          .get()
          .value.some((cable) => cable.from === source && cable.to === target)
        return exists || toggle(source, target, "imperative")
      },
      unplug(from: string, to: string) {
        const source = resolve(from)
        const target = resolve(to)
        const exists = context.store
          .get()
          .value.some((cable) => cable.from === source && cable.to === target)
        return exists && toggle(source, target, "imperative")
      },
      clear: () => change("value", [], { reason: "imperative" }),
      /** The cables now, and a way to set them from code (web elements' live `value`). */
      cables: () => context.store.get().value,
      setCables: (next: Cable[]) => change("value", next, { reason: "imperative" }),
    }
  },
  slots: (slot) => ({
    root: slot<{}, { cables: Cable[]; connecting: ConnectDraft | null }>({
      role: "group",
      state: (state) => ({ cables: state.value, connecting: state.connecting }),
      bind: (el, part) => {
        part.api.surface(el)
        return () => part.api.surface(null)
      },
    }),
    jack: slot<{ value: string }>({
      props: { value: "string" },
      role: "button",
      focus: "native",
      // A mouse click ends a drag; only keys and screen readers start a keyboard patch.
      press: ({ api, key }, event) => {
        if (event instanceof MouseEvent && event.detail > 0) return
        api.wiring.start(key)
      },
      attrs: (state, { key }) => ({
        type: "button",
        "data-port": key,
        "data-kind": isOut(key) ? "out" : "in",
        "data-patched": state.value.some(
          (cable) => cable.from === key || cable.to === key,
        )
          ? ""
          : undefined,
        "aria-description": describe(state.value, key, state.labels),
      }),
      live: live((state, { api, key }) => ({
        "data-connect": api.wiring.role(state, key),
      })),
      on: {
        pointerdown: (event, { el, api, key }) => {
          if (el && isOut(key)) api.wiring.pointerdown(event as PointerEvent, key, el)
        },
        keydown: (event, { api }) => {
          if (api.wiring.active()) api.wiring.keydown(event as KeyboardEvent)
        },
      },
    }),
  }),
  agent: { actions: ["plug", "unplug", "clear"], items: (api) => api.ports() },
})

export { patchBay }
export type { Cable, PatchBayOptions, PatchReason }
