"use client"

import { Radio as RadioRoot, RadioIndicator } from "@ui-sdk/react/radio"
import type * as React from "react"

function Radio({ children, ...props }: React.ComponentProps<typeof RadioRoot>) {
  return <RadioRoot {...props}>{children ?? <RadioIndicator />}</RadioRoot>
}

export { Radio, RadioIndicator }
export { RadioGroup, createRadioGroupController } from "@ui-sdk/react/radio"
