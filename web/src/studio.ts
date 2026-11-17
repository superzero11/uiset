// Studio for Web Components: the knob and patch bay as UISet elements. Faders, level
// meters and step sequencers are UI SDK's own slider, meter and toggle group with UISet's
// classes (docs/web-components.md has the markup), as the React versions are.
import type { CommitDetails } from "@ui-sdk/core"
import { createParts, wrappedButton, type UiChangeEvent, type UiDetailedChangeEvent, type UiElement } from "@ui-sdk/web"
import { knob, type KnobOptions, type KnobReason } from "@/registry/uiset/ui/studio/knob"
import { patchBay, type Cable, type PatchReason } from "@/registry/uiset/ui/studio/patch-bay"
import { cablePath, localPoint } from "@/registry/uiset/ui/studio/cables"
import { holdRender, reportPartInput } from "./dom"
import "@/registry/uiset/ui/studio/knob.css"
import "@/registry/uiset/ui/studio/patch-bay.css"
import "@/registry/uiset/ui/studio/instruments.css"

const svgNS = "http://www.w3.org/2000/svg"

/**
 * <uiset-knob> to TypeScript: the knob's options as properties. `value` is what you set; left
 * alone the knob keeps its own, which `valuechange` reports.
 */
/** What `<uiset-knob>` fires: `valuechange` as it turns, `valuecommit` when it's let go. */
type UISetKnobEvents = {
  valuechange: UiChangeEvent<number, KnobReason>
  valuecommit: UiDetailedChangeEvent<number, CommitDetails<KnobReason>>
}

type KnobElement = UiElement<UISetKnobEvents> & Omit<KnobOptions, "onValueChange" | "onValueCommit">

/** <uiset-patch-bay> to TypeScript: its cables as `value`, and plugging from code. */
/** What `<uiset-patch-bay>` fires: `valuechange` with every cable, when a person or agent patches. */
type UISetPatchBayEvents = { valuechange: UiChangeEvent<Cable[], PatchReason> }

type PatchBayElement = UiElement<UISetPatchBayEvents> & {
  /** The cables. Setting it fires no event. */
  value: Cable[]
  /** Port names for agents and descriptions; from the jacks' `aria-label`s unless you set it. */
  labels?: Record<string, string>
  /** Plug and unplug by port value or by name. Each throws, saying why, when it can't. */
  api?: { plug: (from: string, to: string) => boolean; unplug: (from: string, to: string) => boolean; clear: () => boolean }
}

function defineStudio() {
  createParts(knob, {
    // Its `value` stays live, as a slider's does: a turn moves it unless refused. v-model:
    // `input` as it turns, `change` when it's let go.
    root: { tag: "uiset-knob", render: (el) => reportPartInput(el, "valuechange", "valuecommit", { follow: true }) },
    indicator: "uiset-knob-indicator",
    value: "uiset-knob-value",
  })
  // The readout follows the knob's spoken value, so it needs no script of yours.
  customElements.whenDefined("uiset-knob").then(() => {
    const follow = (value: Element) => {
      const root = value.closest("uiset-knob")
      if (!root) return
      const show = () => (value.textContent = root.getAttribute("aria-valuetext") ?? root.getAttribute("aria-valuenow") ?? "")
      show()
      new MutationObserver(show).observe(root, { attributeFilter: ["aria-valuetext", "aria-valuenow"] })
    }
    document.querySelectorAll("uiset-knob-value").forEach(follow)
    new MutationObserver((records) =>
      records.forEach((r) =>
        r.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node.matches("uiset-knob-value")) follow(node)
          node.querySelectorAll?.("uiset-knob-value").forEach(follow)
        }),
      ),
    ).observe(document.documentElement, { childList: true, subtree: true })
  })

  createParts(patchBay, {
    root: {
      tag: "uiset-patch-bay",
      // `bay.value` reads and sets the cables, like a native control's value.
      state: {
        value: { get: (api) => api.cables(), set: (api, cables: Cable[]) => api.setCables(cables) },
      },
      api: ["plug", "unplug", "clear"],
      // The cables are drawn here, from the bay's state: the cables and the one being drawn.
      render: holdRender((el, instance) => {
        const stopNames = nameJacks(el)
        const stopCables = drawCables(el, instance as unknown as PatchInstance)
        // v-model: `input` and `change` once a cable is in or out.
        reportPartInput(el, "valuechange")
        return () => (stopNames(), stopCables())
      }),
    },
    jack: { tag: "uiset-patch-bay-jack", target: wrappedButton, display: "contents" },
  })
}

// Ports are named by their jacks' labels, for agents and the "Patched to …" descriptions,
// unless the page sets `labels` itself.
const ours = new WeakSet<object>()
function nameJacks(el: HTMLElement) {
  const bay = el as HTMLElement & { labels?: Record<string, string> }
  const update = () => {
    if (bay.labels && !ours.has(bay.labels)) return
    const labels: Record<string, string> = {}
    for (const jack of el.querySelectorAll("uiset-patch-bay-jack[value]")) {
      const name = jack.querySelector("button")?.getAttribute("aria-label") ?? jack.textContent?.trim()
      if (name) labels[jack.getAttribute("value")!] = name
    }
    if (bay.labels && JSON.stringify(bay.labels) === JSON.stringify(labels)) return
    ours.add(labels)
    bay.labels = labels
  }
  update()
  const observer = new MutationObserver(update)
  observer.observe(el, { childList: true, subtree: true, attributeFilter: ["aria-label", "value"] })
  return () => observer.disconnect()
}

type PatchState = { value: Cable[]; connecting: { from: string; to?: string | null; x: number; y: number } | null }
type PatchInstance = { get: () => PatchState; subscribe: (run: () => void) => () => void }

function drawCables(el: HTMLElement, instance: PatchInstance) {
  el.classList.add("patch-bay")
  let svg = el.querySelector<SVGSVGElement>(":scope > svg.patch-bay-cables")
  if (!svg) {
    svg = document.createElementNS(svgNS, "svg")
    svg.setAttribute("class", "patch-bay-cables")
    svg.setAttribute("aria-hidden", "true")
    svg.setAttribute("focusable", "false")
    el.append(svg)
  }
  const canvas = svg
  let centers: Record<string, { x: number; y: number }> = {}
  const measure = () => {
    centers = {}
    for (const jack of el.querySelectorAll<HTMLElement>("[data-port]")) {
      const rect = jack.getBoundingClientRect()
      centers[jack.dataset.port!] = localPoint(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
    }
    draw()
  }
  const cable = (from: { x: number; y: number }, to: { x: number; y: number }, color: number, draft = false) => {
    const g = document.createElementNS(svgNS, "g")
    g.setAttribute("class", "patch-bay-cable")
    g.style.setProperty("--cable-color", `var(--uiset-cable-${(color % 5) + 1})`)
    if (draft) g.setAttribute("data-draft", "")
    const path = document.createElementNS(svgNS, "path")
    path.setAttribute("d", cablePath(from, to))
    g.append(path)
    for (const point of [from, to]) {
      const end = document.createElementNS(svgNS, "circle")
      end.setAttribute("cx", String(point.x))
      end.setAttribute("cy", String(point.y))
      end.setAttribute("r", "5.5")
      g.append(end)
    }
    return g
  }
  const draw = () => {
    const { value, connecting } = instance.get()
    const groups = value.flatMap((c, index) => {
      const a = centers[c.from]
      const b = centers[c.to]
      return a && b ? [cable(a, b, index)] : []
    })
    const loose = connecting && centers[connecting.from]
    const end = connecting && (connecting.to ? centers[connecting.to] : { x: connecting.x, y: connecting.y })
    if (loose && end) groups.push(cable(loose, end, value.length, true))
    canvas.replaceChildren(...groups)
  }
  const observer = new ResizeObserver(measure)
  observer.observe(el)
  for (const jack of el.querySelectorAll("[data-port]")) observer.observe(jack)
  const stop = instance.subscribe(draw)
  measure()
  void document.fonts?.ready.then(measure)
  return () => {
    observer.disconnect()
    stop()
  }
}

export { defineStudio }
export type { Cable, KnobElement, PatchBayElement, UISetKnobEvents, UISetPatchBayEvents }
