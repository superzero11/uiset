"use client"

import { announce } from "@ui-sdk/core"
import { useState } from "react"
import { Button } from "./button"
import { Icon } from "./shell/icons"
import "./shell/shell.css"

function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  failedLabel = "Couldn't copy",
  "aria-label": name,
}: {
  value: string
  label?: string
  /** A fuller name when several copy buttons share a page, like "Copy app.tsx". Start it
   *  with the visible label, so people who speak the label can still find it. */
  "aria-label"?: string
  copiedLabel?: string
  /** Announced when the browser refuses the clipboard. */
  failedLabel?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      className="copy-button"
      aria-label={name}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
        } catch {
          // The browser refused (no permission, an insecure page): say so rather than nothing.
          announce(failedLabel)
          return
        }
        setCopied(true)
        announce(copiedLabel)
        setTimeout(() => setCopied(false), 1600)
      }}
    >
      <Icon name={copied ? "check" : "copy"} />
      {/* In its own element: UI SDK sizes a labelled button whose only element is an icon
          as a square icon button, which would squeeze the visible label out. */}
      <span>{copied ? copiedLabel : label}</span>
    </Button>
  )
}

export { CopyButton }
