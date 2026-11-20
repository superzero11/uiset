"use client"

import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaCorner,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
  createScrollAreaController,
} from "@ui-sdk/react/scroll-area"
import { useCallback, useEffect, useRef, useState } from "react"
import type * as React from "react"
import { rearmAtEnd } from "./shell/rearm-end"

// A scroll area with its parts already in place: pass the content as children, the axes that
// scroll as `axis`, and the viewport's props (its role, name, ref and handlers) as `viewport`.
// data-frame="none" drops the border and padding, for one inside a larger surface. With
// stickToEnd, a downward wheel or key at the end keeps following (shell/rearm-end.ts).
function ScrollBox({
  children,
  axis = "y",
  viewport,
  ...props
}: Omit<React.ComponentProps<typeof ScrollArea>, "children"> & {
  children: React.ReactNode
  axis?: "x" | "y" | "both"
  viewport?: React.ComponentProps<typeof ScrollAreaViewport> & { [data: `data-${string}`]: string | undefined }
}) {
  const [own] = useState(createScrollAreaController)
  const controller = props.controller ?? (props.stickToEnd ? own : undefined)
  const view = useRef<HTMLDivElement | null>(null)
  const viewportRef = viewport?.ref
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      view.current = el
      if (typeof viewportRef === "function") viewportRef(el)
      else if (viewportRef) (viewportRef as React.RefObject<HTMLDivElement | null>).current = el
    },
    [viewportRef],
  )
  useEffect(() => {
    if (!props.stickToEnd || !controller || !view.current) return
    return rearmAtEnd(view.current, () => controller)
  }, [props.stickToEnd, controller])
  return (
    <ScrollArea {...props} controller={controller}>
      <ScrollAreaViewport {...viewport} ref={ref}>
        <ScrollAreaContent>{children}</ScrollAreaContent>
      </ScrollAreaViewport>
      {axis !== "x" && (
        <ScrollAreaScrollbar orientation="vertical">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
      )}
      {axis !== "y" && (
        <ScrollAreaScrollbar orientation="horizontal">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
      )}
      {axis === "both" && <ScrollAreaCorner />}
    </ScrollArea>
  )
}

export {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaCorner,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
  ScrollBox,
}
export {
  ScrollAreaScrollToEnd,
  createScrollAreaController,
} from "@ui-sdk/react/scroll-area"
