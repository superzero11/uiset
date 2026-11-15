"use client"

import type { ReactNode } from "react"
import { Button } from "./button"
import { Icon } from "./shell/icons"
import "./shell/shell.css"

type Tone = "info" | "success" | "warning" | "danger"
const words: Record<Tone, string> = {
  info: "Note",
  success: "Success",
  warning: "Warning",
  danger: "Error",
}

// Static by default. Pass urgent for messages that appear in response to something and
// must interrupt (role="alert"); otherwise new messages are announced politely.
function Alert({
  tone = "info",
  title,
  children,
  actions,
  onDismiss,
  urgent = false,
  live = false,
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  actions?: ReactNode
  onDismiss?: () => void
  urgent?: boolean
  live?: boolean
}) {
  const role = urgent ? "alert" : live ? "status" : undefined
  return (
    <div className="alert" data-tone={tone} role={role}>
      <Icon name={tone} className="alert-icon" />
      <div className="alert-body">
        {title && (
          <p className="alert-title">
            <span className="uiset-visually-hidden">{words[tone]}: </span>
            {title}
          </p>
        )}
        {/* Without a title, the text says the tone: "Warning: …". */}
        {children && (
          <div className="alert-text">
            {!title && <span className="uiset-visually-hidden">{words[tone]}: </span>}
            {children}
          </div>
        )}
        {actions && <div className="alert-actions">{actions}</div>}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          aria-label="Dismiss"
          className="alert-dismiss"
          onClick={onDismiss}
        >
          <Icon name="close" />
        </Button>
      )}
    </div>
  )
}

export { Alert }
export type { Tone as AlertTone }
