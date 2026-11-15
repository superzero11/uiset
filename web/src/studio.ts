// Studio for Web Components: the knob and patch bay as UISet elements. Faders, level
// meters and step sequencers are UI SDK's own slider, meter and toggle group with UISet's
// classes (docs/web-components.md has the markup), as the React versions are.
import { createParts, wrappedButton } from "@ui-sdk/web"
import { knob } from "@/registry/uiset/ui/studio/knob"
import { patchBay, type Cable } from "@/registry/uiset/ui/studio/patch-bay"
import { cablePath } from "@/registry/uiset/ui/studio/cables"
import "@/registry/uiset/ui/studio/knob.css"
import "@/registry/uiset/ui/studio/patch-bay.css"
import "@/registry/uiset/ui/studio/instruments.css"

const svgNS = "http://www.w3.org/2000/svg"

function defineStudio() {
  createParts(knob, { root: "uiset-knob", indicator: "uiset-knob-indicator", value: "uiset-knob-value" })
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
      render: (el, instance) => {
        const stopNames = nameJacks(el)
        const stopCables = drawCables(el, instance as unknown as PatchInstance)
        return () => (stopNames(), stopCables())
      },
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
    const box = el.getBoundingClientRect()
    centers = {}
    for (const jack of el.querySelectorAll<HTMLElement>("[data-port]")) {
      const rect = jack.getBoundingClientRect()
      centers[jack.dataset.port!] = { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 }
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
