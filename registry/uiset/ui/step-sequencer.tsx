"use client"

import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle"
import type { ComponentProps, CSSProperties } from "react"
import "./studio/instruments.css"

type StepSequencerProps = Omit<
  ComponentProps<typeof ToggleGroup<string>>,
  "children" | "multiple"
> & {
  label: string
  steps?: number
  current?: number | null
  stepLabel?: (step: number) => string
}

function StepSequencer({
  label,
  steps = 16,
  current = null,
  stepLabel = (step) => `Step ${step}`,
  className,
  ...props
}: StepSequencerProps) {
  return (
    <ToggleGroup
      multiple
      aria-label={label}
      className={["step-sequencer", className].filter(Boolean).join(" ")}
      style={{ "--steps": steps } as CSSProperties}
      {...props}
    >
      {Array.from({ length: steps }, (_, index) => {
        const step = index + 1
        return (
          <Toggle
            key={step}
            value={String(step)}
            aria-label={stepLabel(step)}
            data-current={current === index ? "" : undefined}
            data-downbeat={index % 4 === 0 ? "" : undefined}
          />
        )
      })}
    </ToggleGroup>
  )
}

export { StepSequencer }
export type { StepSequencerProps }
