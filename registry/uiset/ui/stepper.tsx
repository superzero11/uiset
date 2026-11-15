"use client"

import { Button } from "./button"
import { Icon } from "./shell/icons"
import "./shell/shell.css"

type Step = { value: string; label: string; description?: string }

// Steps are buttons with aria-current="step". In a linear flow, steps ahead of the
// current one can't be chosen until it's reached.
function Stepper({
  steps,
  value,
  onValueChange,
  label = "Progress",
  linear = true,
}: {
  steps: Step[]
  value: string
  onValueChange: (value: string) => void
  label?: string
  linear?: boolean
}) {
  const current = Math.max(
    0,
    steps.findIndex((step) => step.value === value),
  )
  return (
    <nav aria-label={label} className="stepper">
      <ol>
        {steps.map((step, index) => {
          const state =
            index < current ? "complete" : index === current ? "current" : "upcoming"
          return (
            <li key={step.value} data-state={state}>
              <Button
                variant="ghost"
                className="stepper-step"
                aria-current={state === "current" ? "step" : undefined}
                disabled={linear && index > current}
                onClick={() => onValueChange(step.value)}
              >
                <span className="stepper-mark" aria-hidden="true">
                  {state === "complete" ? <Icon name="check" /> : index + 1}
                </span>
                <span className="stepper-text">
                  <span className="stepper-label">{step.label}</span>
                  {/* Read as "Details, Name and region", not run together. */}
                  {step.description && <span className="uiset-visually-hidden">, </span>}
                  {step.description && (
                    <span className="stepper-description">{step.description}</span>
                  )}
                </span>
                {state === "complete" && (
                  <span className="uiset-visually-hidden"> (done)</span>
                )}
              </Button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Stepper }
export type { Step as StepperStep }
