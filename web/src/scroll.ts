// The twin of React's ScrollBox: a UI SDK scroll area around content, for the kits' threads,
// logs, grids and panels. The viewport is the element that scrolls; give it the role, name
// and class the scroller had. A name set later goes on both, as `nameScrollArea` does.
import type { createScrollAreaController } from "@ui-sdk/core/scroll-area"
import "@ui-sdk/web/scroll-area"
import { h } from "./dom"

type Attrs = Record<string, string | boolean | null | undefined>

/** A `ui-scroll-area`'s `api`: UI SDK's scroll area controller. */
type ScrollAreaApi = ReturnType<typeof createScrollAreaController>

function scrollArea(
  child: Node | null,
  { axis = "y", frame = {}, viewport = {} }: { axis?: "x" | "y" | "both"; frame?: Attrs; viewport?: Attrs } = {},
) {
  const content = h("ui-scroll-area-content", null, child)
  const view = h("ui-scroll-area-viewport", viewport, content)
  const bar = (orientation: string) => h("ui-scroll-area-scrollbar", { orientation }, h("ui-scroll-area-thumb"))
  // The name goes on the root too: the web agent bridge names a scroll area from it, not its
  // viewport.
  const root = h(
    "ui-scroll-area",
    { "data-frame": "none", "aria-label": viewport["aria-label"], ...frame },
    view,
    axis !== "x" && bar("vertical"),
    axis !== "y" && bar("horizontal"),
    axis === "both" && h("ui-scroll-area-corner"),
  )
  return { root, view, content }
}

/** Names a scroll area for people and agents: its viewport, and its root for the web agent bridge. */
function nameScrollArea(root: HTMLElement, label: string) {
  root.setAttribute("aria-label", label)
  root.querySelector(":scope > ui-scroll-area-viewport")?.setAttribute("aria-label", label)
}

export { nameScrollArea, scrollArea }
export type { ScrollAreaApi }
