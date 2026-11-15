"use client"

import { Switch as SwitchRoot, SwitchThumb } from "@ui-sdk/react/switch"
import type * as React from "react"

function Switch({ children, ...props }: React.ComponentProps<typeof SwitchRoot>) {
  return <SwitchRoot {...props}>{children ?? <SwitchThumb />}</SwitchRoot>
}

export { Switch, SwitchThumb }
export { createSwitchController } from "@ui-sdk/react/switch"
