"use client"

import {
  Progress as ProgressRoot,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@ui-sdk/react/progress"
import type * as React from "react"

function Progress({ children, ...props }: React.ComponentProps<typeof ProgressRoot>) {
  return (
    <ProgressRoot {...props}>
      {children ?? (
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      )}
    </ProgressRoot>
  )
}

// Progress drawn as a ring, filled to its value, with the value in the middle. With no value
// (unknown), a quarter of it turns, and holds still for reduced motion. Its children are
// ProgressValue (the default) and ProgressLabel.
function ProgressRing({ children, ...props }: React.ComponentProps<typeof ProgressRoot>) {
  return (
    <ProgressRoot data-shape="ring" {...props}>
      {children ?? <ProgressValue />}
    </ProgressRoot>
  )
}

export { Progress, ProgressIndicator, ProgressLabel, ProgressRing, ProgressTrack, ProgressValue }
