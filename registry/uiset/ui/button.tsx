"use client"

import { announce } from "@ui-sdk/core"
import { Button as ButtonRoot } from "@ui-sdk/react/button"
import { useEffect, useRef, useState } from "react"
import type * as React from "react"

type ButtonProps = React.ComponentProps<typeof ButtonRoot> & {
  variant?: "solid" | "outline" | "ghost"
}

function Button({ variant = "solid", ...props }: ButtonProps) {
  return (
    <ButtonRoot data-variant={variant === "solid" ? undefined : variant} {...props} />
  )
}

type ConfirmButtonProps = Omit<ButtonProps, "onClick" | "variant"> & {
  /** What it says while armed, like "Press again to delete". Screen readers hear it too. */
  confirmLabel: string
  /** What the press does, for agents: UI SDK's bridge makes the person approve it first. */
  confirm: string
  /** Runs on the second press, or on an approved agent's press. Return a Promise to stay pending. */
  onConfirm: NonNullable<React.ComponentProps<typeof ButtonRoot>["onClick"]>
  /** How long it stays armed, in ms. */
  timeout?: number
}

// A second press this soon after arming is a double-click or a held key, not a decision.
const SETTLE = 600

// A button for something hard to undo: the first press arms it, the second acts. It disarms on
// Escape, when focus leaves, or after `timeout`. An agent's press acts at once, but only once
// the person approves `confirm` (data-agent-confirm), so that approval is the second press.
function ConfirmButton({ children, confirmLabel, confirm, onConfirm, timeout = 4000, onKeyDown, onBlur, ...props }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)
  const armedAt = useRef(0)
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), timeout)
    return () => clearTimeout(timer)
  }, [armed, timeout])
  return (
    <ButtonRoot
      data-variant={armed ? "destructive" : "outline"}
      data-armed={armed ? "" : undefined}
      data-agent-confirm={confirm}
      onClick={(event, details) => {
        if (details.source === "agent" || (armed && Date.now() - armedAt.current >= SETTLE)) {
          setArmed(false)
          return onConfirm(event, details)
        }
        if (armed) return
        armedAt.current = Date.now()
        setArmed(true)
        announce(confirmLabel)
      }}
      onKeyDown={(event) => {
        if (armed && event.key === "Escape") {
          event.stopPropagation()
          setArmed(false)
        }
        onKeyDown?.(event)
      }}
      onBlur={(event) => {
        setArmed(false)
        onBlur?.(event)
      }}
      {...props}
    >
      {armed ? confirmLabel : children}
    </ButtonRoot>
  )
}

export { Button, ConfirmButton }
export type { ButtonProps, ConfirmButtonProps }
