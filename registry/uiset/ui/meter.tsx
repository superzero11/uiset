"use client"

import {
  Meter as MeterRoot,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from "@ui-sdk/react/meter"
import type * as React from "react"

function Meter({ children, ...props }: React.ComponentProps<typeof MeterRoot>) {
  return (
    <MeterRoot {...props}>
      {children ?? (
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      )}
    </MeterRoot>
  )
}

// A meter drawn as a ring, filled to its value, with the value in the middle: a goal or a quota
// on a dashboard. Its children are MeterValue (the default) and MeterLabel, or use aria-label.
function MeterRing({ children, ...props }: React.ComponentProps<typeof MeterRoot>) {
  return (
    <MeterRoot data-shape="ring" {...props}>
      {children ?? <MeterValue />}
    </MeterRoot>
  )
}

export { Meter, MeterIndicator, MeterLabel, MeterRing, MeterTrack, MeterValue }
