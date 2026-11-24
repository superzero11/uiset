import type { ComponentProps, JSX } from "@solidjs/web"
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaCorner,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
  createScrollAreaController,
} from "@ui-sdk/solid/scroll-area"
import { createEffect, omit, Show } from "solid-js"
import { rearmAtEnd } from "../../registry/uiset/ui/shell/rearm-end"

type ViewportProps = ComponentProps<typeof ScrollAreaViewport> & { [data: `data-${string}`]: string | undefined }

// A scroll area with its parts already in place: pass the content as children, the axes that
// scroll as `axis`, and the viewport's props (its role, name, ref and handlers) as `viewport`.
// data-frame="none" drops the border and padding, for one inside a larger surface. With
// stickToEnd, a downward wheel or key at the end keeps following (shell/rearm-end.ts).
function ScrollBox(
  props: Omit<ComponentProps<typeof ScrollArea>, "children"> & {
    children: JSX.Element
    axis?: "x" | "y" | "both"
    viewport?: ViewportProps
  },
) {
  const own = createScrollAreaController()
  const controller = () => props.controller ?? (props.stickToEnd ? own : undefined)
  let view: HTMLDivElement | undefined
  createEffect(
    () => [props.stickToEnd, controller()] as const,
    ([stick, ctrl]) => {
      if (!stick || !ctrl || !view) return
      return rearmAtEnd(view, () => ctrl)
    },
  )
  const axis = () => props.axis ?? "y"
  const viewport = () => props.viewport ?? ({} as ViewportProps)
  return (
    <ScrollArea {...omit(props, "children", "axis", "viewport", "controller")} controller={controller()}>
      <ScrollAreaViewport {...omit(viewport(), "ref")} ref={[(el: HTMLDivElement) => (view = el), ...(viewport().ref ? [viewport().ref as (el: HTMLDivElement) => void] : [])]}>
        <ScrollAreaContent>{props.children}</ScrollAreaContent>
      </ScrollAreaViewport>
      <Show when={axis() !== "x"}>
        <ScrollAreaScrollbar orientation="vertical">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
      </Show>
      <Show when={axis() !== "y"}>
        <ScrollAreaScrollbar orientation="horizontal">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
      </Show>
      <Show when={axis() === "both"}>
        <ScrollAreaCorner />
      </Show>
    </ScrollArea>
  )
}

export { ScrollArea, ScrollAreaContent, ScrollAreaCorner, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport, ScrollBox }
export { ScrollAreaScrollToEnd, createScrollAreaController } from "@ui-sdk/solid/scroll-area"
