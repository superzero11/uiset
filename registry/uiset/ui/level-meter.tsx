"use client"

import { Meter, MeterIndicator, MeterTrack } from "@ui-sdk/react/meter"
import type { ComponentProps } from "react"
import "./studio/instruments.css"

type LevelMeterProps = Omit<ComponentProps<typeof Meter>, "children"> & { label: string }

function LevelMeter({ label, className, ...props }: LevelMeterProps) {
  return (
    <Meter
      aria-label={label}
      className={["level-meter", className].filter(Boolean).join(" ")}
      {...props}
    >
      <MeterTrack>
        <MeterIndicator />
      </MeterTrack>
    </Meter>
  )
}

export { LevelMeter }
export type { LevelMeterProps }
