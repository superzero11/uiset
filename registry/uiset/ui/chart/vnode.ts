// A chart's drawing as plain data: what to draw, not how. Each chart computes its geometry
// once, into these nodes; the React frame turns them into elements and the web elements into
// DOM, so both draw exactly the same thing.

type VAttrs = Record<string, string | number | boolean | null | undefined | Record<string, string | number>>

type VNode = { tag: string; attrs: VAttrs; children: VChild[]; key?: string | number }
type VChild = VNode | string | number | null | undefined | false

/** v("circle", { className: "chart-dot", cx, cy, r: 4 }) */
function v(tag: string, attrs: VAttrs & { key?: string | number } = {}, ...children: (VChild | VChild[])[]): VNode {
  const { key, ...rest } = attrs
  return { tag, attrs: rest as VAttrs, children: children.flat() as VChild[], key: key as string | number | undefined }
}

/** A tooltip row: a key in the series color, the value strong, the name after. */
function tooltipRow(color: string, value: string, label: string, shape: "line" | "rect" | "dot" = "line", key?: string) {
  return v(
    "span",
    { key, className: "chart-tooltip-row", style: { "--series": color } },
    v("span", { className: "chart-swatch", "data-shape": shape }),
    v("strong", {}, value),
    v("span", {}, label),
  )
}

/** The attribute a DOM element takes for a node's attribute name. */
const domName = (name: string) => (name === "className" ? "class" : name === "textAnchor" ? "text-anchor" : name)

export { domName, tooltipRow, v }
export type { VAttrs, VChild, VNode }
