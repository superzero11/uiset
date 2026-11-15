"use client"

import { Checkbox as CheckboxRoot, CheckboxIndicator } from "@ui-sdk/react/checkbox"
import type * as React from "react"

function Checkbox({ children, ...props }: React.ComponentProps<typeof CheckboxRoot>) {
  return <CheckboxRoot {...props}>{children ?? <CheckboxIndicator />}</CheckboxRoot>
}

export { Checkbox, CheckboxIndicator }
export {
  CheckboxGroup,
  createCheckboxController,
  createCheckboxGroupController,
} from "@ui-sdk/react/checkbox"
