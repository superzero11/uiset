"use client"

import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "@ui-sdk/react/scroll-area"
import type * as React from "react"

// A scroll area with its parts already in place: pass the content as children.
function ScrollBox({
  children,
  ...props
}: Omit<React.ComponentProps<typeof ScrollArea>, "children"> & {
  children: React.ReactNode
}) {
  return (
    <ScrollArea {...props}>
      <ScrollAreaViewport>
        <ScrollAreaContent>{children}</ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar>
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    </ScrollArea>
  )
}

export {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
  ScrollBox,
}
export {
  ScrollAreaCorner,
  ScrollAreaScrollToEnd,
  createScrollAreaController,
} from "@ui-sdk/react/scroll-area"
