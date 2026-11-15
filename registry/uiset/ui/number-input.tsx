"use client"

import {
  NumberInput as NumberInputRoot,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/react/number-input"
import type * as React from "react"

function NumberInput({
  children,
  ...props
}: React.ComponentProps<typeof NumberInputRoot>) {
  return (
    <NumberInputRoot {...props}>
      {children ?? (
        <NumberInputGroup>
          <NumberInputDecrement aria-label="Decrease" />
          <NumberInputControl />
          <NumberInputIncrement aria-label="Increase" />
        </NumberInputGroup>
      )}
    </NumberInputRoot>
  )
}

export {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
}
export {
  NumberInputScrubArea,
  NumberInputScrubAreaCursor,
  createNumberInputController,
} from "@ui-sdk/react/number-input"
