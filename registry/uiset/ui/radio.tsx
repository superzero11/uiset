"use client"

import { Radio as RadioRoot, RadioIndicator } from "@ui-sdk/react/radio"
import type * as React from "react"
import { Field, FieldDescription, FieldLabel } from "./field"

function Radio({ children, ...props }: React.ComponentProps<typeof RadioRoot>) {
  return <RadioRoot {...props}>{children ?? <RadioIndicator />}</RadioRoot>
}

// An option as a card that a press anywhere on chooses. Its radio is named by `label` alone and
// described by `description`, so a screen reader or an agent hears "Pro", not the whole card.
function RadioCard({
  value,
  label,
  description,
  aside,
  disabled,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Field>, "children"> & {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  /** Shown at the card's end, like a price. Not part of the name. */
  aside?: React.ReactNode
}) {
  return (
    <Field className={["uiset-radio-card", className].filter(Boolean).join(" ")} disabled={disabled} {...props}>
      <Radio value={value} />
      <span className="uiset-radio-card-text">
        <FieldLabel>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </span>
      {aside && <span className="uiset-radio-card-aside">{aside}</span>}
    </Field>
  )
}

export { Radio, RadioCard, RadioIndicator }
export { RadioGroup, createRadioGroupController } from "@ui-sdk/react/radio"
