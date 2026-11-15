"use client"

import {
  PasswordInput as PasswordInputRoot,
  PasswordInputControl,
  PasswordInputToggle,
} from "@ui-sdk/react/password-input"
import type * as React from "react"

function PasswordInput({
  children,
  ...props
}: React.ComponentProps<typeof PasswordInputRoot>) {
  return (
    <PasswordInputRoot {...props}>
      {children ?? (
        <>
          <PasswordInputControl />
          <PasswordInputToggle aria-label="Show password" />
        </>
      )}
    </PasswordInputRoot>
  )
}

export { PasswordInput, PasswordInputControl, PasswordInputToggle }
export { createPasswordInputController } from "@ui-sdk/react/password-input"
