"use client"

import {
  SegmentedControl as SegmentedControlRoot,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control"
import type * as React from "react"

function SegmentedControl({
  children,
  ...props
}: React.ComponentProps<typeof SegmentedControlRoot>) {
  return (
    <SegmentedControlRoot {...props}>
      {typeof children === "function" ? (
        (state) => (
          <>
            <SegmentedControlIndicator />
            {children(state)}
          </>
        )
      ) : (
        <>
          <SegmentedControlIndicator />
          {children}
        </>
      )}
    </SegmentedControlRoot>
  )
}

export { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem }
export { createSegmentedControlController } from "@ui-sdk/react/segmented-control"
