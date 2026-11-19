"use client"

import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaCorner,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "@ui-sdk/react/scroll-area"
import type * as React from "react"

// A scroll area with its parts already in place: pass the content as children, the axes that
// scroll as `axis`, and the viewport's props (its role, name, ref and handlers) as `viewport`.
// data-frame="none" drops the border and padding, for one inside a larger surface.
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
  return (
    <ScrollArea {...props}>
      <ScrollAreaViewport {...viewport}>
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
