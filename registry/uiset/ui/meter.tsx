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

export { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue }
