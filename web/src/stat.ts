// The sparkline and the stat for Web Components, from plain HTML alone:
// <uiset-sparkline label="Revenue, 12 weeks" values="4,6,5,8"> draws the same nodes as the
// React Sparkline (chart/plots/sparkline.ts), and <uiset-stat> is a figure with its change
// in words as well as color, and an optional trend.
import { sparklineColor, sparklinePlot } from "@/registry/uiset/ui/chart/plots/sparkline"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/chart/tokens.css"
import "@/registry/uiset/ui/chart/chart.css"
import { h, upgradeProperties } from "./dom"
import { toDom } from "./chart"

const svgNS = "http://www.w3.org/2000/svg"
/** "4, 6, , 8" → [4, 6, null, 8]: an empty place is a gap. */
const parseValues = (text: string | null) => (text ?? "").split(",").map((part) => (part.trim() === "" ? null : Number(part)))

/**
 * <uiset-sparkline label values variant="line|area|bar" series width height locale>: `values`
 * as an attribute (comma-separated) or a property (an array), and `format` as a property.
 */
class UISetSparkline extends HTMLElement {
  // `series` (1 to 8) is the chart color; `slot` is HTML's own attribute.
  static observedAttributes = ["label", "values", "variant", "series", "width", "height", "locale"]
  #values: readonly (number | null)[] | null = null
  #format?: (value: number) => string

  get values(): readonly (number | null)[] {
    return this.#values ?? parseValues(this.getAttribute("values"))
  }
  set values(v: readonly (number | null)[]) {
    this.#values = v
    this.render()
  }
  get format() {
    return this.#format
  }
  set format(fn: ((value: number) => string) | undefined) {
    this.#format = fn
    this.render()
  }

  connectedCallback() {
    upgradeProperties(this, ["values", "format"])
    this.render()
  }
  attributeChangedCallback() {
    this.render()
  }

  render() {
    if (!this.isConnected) return
    const width = Number(this.getAttribute("width")) || 96
    const height = Number(this.getAttribute("height")) || 28
    const variant = (this.getAttribute("variant") ?? "line") as "line" | "area" | "bar"
    const { name, svg } = sparklinePlot({ values: this.values, label: this.getAttribute("label") ?? "", format: this.#format, locale: this.getAttribute("locale") ?? undefined, variant, width, height })
    const root = document.createElementNS(svgNS, "svg")
    root.setAttribute("class", ["sparkline", this.dataset.class].filter(Boolean).join(" "))
    root.setAttribute("role", "img")
    root.setAttribute("aria-label", name)
    root.setAttribute("width", String(width))
    root.setAttribute("height", String(height))
    root.setAttribute("viewBox", `0 0 ${width} ${height}`)
    root.style.setProperty("--series", sparklineColor(Number(this.getAttribute("series")) || 1))
    root.append(...toDom(svg, true))
    this.replaceChildren(root)
  }
}

/**
 * <uiset-stat label="Revenue" value="$48,200" change="12%" direction="up" period="vs last
 * month" trend="31,35,33,40,48" description="…">: the change is said in words ("Up 12%") as
 * well as color; `good="false"` marks a rise as bad (like errors). `trend` and `format` can
 * be properties too.
 */
class UISetStat extends HTMLElement {
  static observedAttributes = ["label", "value", "change", "direction", "good", "period", "trend", "description", "locale"]
  #trend: readonly (number | null)[] | null = null
  #format?: (value: number) => string

  get trend(): readonly (number | null)[] | null {
    return this.#trend ?? (this.hasAttribute("trend") ? parseValues(this.getAttribute("trend")) : null)
  }
  set trend(v: readonly (number | null)[] | null) {
    this.#trend = v
    this.render()
  }
  get format() {
    return this.#format
  }
  set format(fn: ((value: number) => string) | undefined) {
    this.#format = fn
    this.render()
  }

  connectedCallback() {
    upgradeProperties(this, ["trend", "format"])
    this.render()
  }
  attributeChangedCallback() {
    this.render()
  }

  render() {
    if (!this.isConnected) return
    const label = this.getAttribute("label") ?? ""
    const change = this.getAttribute("change")
    const direction = this.getAttribute("direction") === "down" ? "down" : "up"
    const goodAttr = this.getAttribute("good")
    const good = goodAttr === null ? direction === "up" : goodAttr !== "false"
    const period = this.getAttribute("period")
    const description = this.getAttribute("description")
    const trend = this.trend
    let spark: HTMLElement | null = null
    if (trend) {
      spark = h("uiset-sparkline", { label: `${label} trend`, width: "160", height: "32", "data-class": "stat-trend", locale: this.getAttribute("locale") })
      ;(spark as unknown as { values: unknown; format: unknown }).values = trend
      ;(spark as unknown as { format: unknown }).format = this.#format
    }
    this.classList.add("stat")
    this.replaceChildren(
      h("p", { class: "stat-label" }, label),
      h("p", { class: "stat-value" }, this.getAttribute("value") ?? ""),
      ...(change
        ? [
            h(
              "p",
              { class: "stat-change", "data-good": good, "data-bad": !good },
              iconElement(direction),
              h("span", null, h("span", { class: "uiset-visually-hidden" }, direction === "up" ? "Up " : "Down "), change, period ? h("span", { class: "stat-period" }, ` ${period}`) : null),
            ),
          ]
        : []),
      ...(spark ? [spark] : []),
      ...(description ? [h("p", { class: "stat-description" }, description)] : []),
    )
  }
}

function defineStat() {
  customElements.define("uiset-sparkline", UISetSparkline)
  customElements.define("uiset-stat", UISetStat)
}

export { defineStat }
