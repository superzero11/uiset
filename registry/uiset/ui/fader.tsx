"use client"

import { Slider, type SliderProps } from "./slider"
import "./studio/instruments.css"

type FaderProps = Omit<SliderProps, "orientation" | "aria-label"> & { label: string }

function Fader({ label, className, showValue = true, ...props }: FaderProps) {
  return (
    <div className={["fader-field", className].filter(Boolean).join(" ")}>
      <Slider
        orientation="vertical"
        aria-label={label}
        showValue={showValue}
        {...props}
      />
      <span className="fader-label" aria-hidden="true">
        {label}
      </span>
    </div>
  )
}

export { Fader }
export type { FaderProps }
