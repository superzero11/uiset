"use client"

import {
  Slider as SliderRoot,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "@ui-sdk/react/slider"
import type * as React from "react"

type SliderProps = React.ComponentProps<typeof SliderRoot> & {
  showValue?: boolean
  thumbLabels?: string[]
}

function Slider({
  children,
  showValue = false,
  thumbLabels,
  "aria-label": ariaLabel,
  ...props
}: SliderProps) {
  if (children) {
    return (
      <SliderRoot aria-label={ariaLabel} {...props}>
        {children}
      </SliderRoot>
    )
  }
  const initial = props.value ?? props.defaultValue
  const count = Array.isArray(initial) ? initial.length : 1
  const labels = thumbLabels ?? (count === 1 && ariaLabel ? [ariaLabel] : [])
  return (
    <SliderRoot aria-label={count > 1 ? ariaLabel : undefined} {...props}>
      {showValue && <SliderValue />}
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
          {Array.from({ length: count }, (_, index) => (
            // Each thumb of a range shows its own value; without `index` they'd share one.
            <SliderThumb
              key={labels[index] ?? `thumb-${index}`}
              index={index}
              aria-label={labels[index]}
            />
          ))}
        </SliderTrack>
      </SliderControl>
    </SliderRoot>
  )
}

export { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack, SliderValue }
export type { SliderProps }
export { createSliderController } from "@ui-sdk/react/slider"
