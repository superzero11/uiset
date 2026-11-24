import type { ComponentProps } from "@solidjs/web"
import { announce } from "@ui-sdk/core"
import { Button as ButtonRoot } from "@ui-sdk/solid/button"
import { createEffect, createSignal, omit } from "solid-js"
import { callHandler } from "./shell/events"

type ButtonProps = ComponentProps<typeof ButtonRoot> & {
  variant?: "solid" | "outline" | "ghost"
}

function Button(props: ButtonProps) {
  return <ButtonRoot data-variant={props.variant && props.variant !== "solid" ? props.variant : undefined} {...omit(props, "variant")} />
}

type ButtonClick = NonNullable<ComponentProps<typeof ButtonRoot>["onClick"]>

type ConfirmButtonProps = Omit<ButtonProps, "onClick" | "variant"> & {
  /** What it says while armed, like "Press again to delete". Screen readers hear it too. */
  confirmLabel: string
  /** What the press does, for agents: UI SDK's bridge makes the person approve it first. */
  confirm: string
  /** Runs on the second press, or on an approved agent's press. Return a Promise to stay pending. */
  onConfirm: ButtonClick
  /** How long it stays armed, in ms. */
  timeout?: number
}

// A second press this soon after arming is a double-click or a held key, not a decision.
const SETTLE = 600

// A button for something hard to undo: the first press arms it, the second acts. It disarms on
// Escape, when focus leaves, or after `timeout`. An agent's press acts at once, but only once
// the person approves `confirm` (data-agent-confirm), so that approval is the second press.
function ConfirmButton(props: ConfirmButtonProps) {
  const [armed, setArmed] = createSignal(false)
  let armedAt = 0
  createEffect(
    () => [armed(), props.timeout ?? 4000] as const,
    ([on, ms]) => {
      if (!on) return
      const timer = setTimeout(() => setArmed(false), ms)
      return () => clearTimeout(timer)
    },
  )
  const rest = omit(props, "children", "confirmLabel", "confirm", "onConfirm", "timeout", "onKeyDown", "onBlur")
  return (
    <ButtonRoot
      data-variant={armed() ? "destructive" : "outline"}
      data-armed={armed() ? "" : undefined}
      data-agent-confirm={props.confirm}
      onClick={(event, details) => {
        if (details.source === "agent" || (armed() && Date.now() - armedAt >= SETTLE)) {
          setArmed(false)
          return callHandler(props.onConfirm, event, details)
        }
        if (armed()) return
        armedAt = Date.now()
        setArmed(true)
        announce(props.confirmLabel)
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (armed() && event.key === "Escape") {
          event.stopPropagation()
          setArmed(false)
        }
        callHandler(props.onKeyDown, event)
      }}
      onBlur={(event: FocusEvent) => {
        setArmed(false)
        callHandler(props.onBlur, event)
      }}
      {...rest}
    >
      {armed() ? props.confirmLabel : props.children}
    </ButtonRoot>
  )
}

export { Button, ConfirmButton }
export type { ButtonProps, ConfirmButtonProps }
