"use client"

import { Button as ButtonRoot } from "@ui-sdk/react/button"
import type * as React from "react"

type ButtonProps = React.ComponentProps<typeof ButtonRoot> & {
  variant?: "solid" | "outline" | "ghost"
}

function Button({ variant = "solid", ...props }: ButtonProps) {
  return (
    <ButtonRoot data-variant={variant === "solid" ? undefined : variant} {...props} />
  )
}

export { Button }
export type { ButtonProps }
