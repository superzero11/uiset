import { announce } from "@ui-sdk/core"
import { createSignal } from "solid-js"
import { Button } from "./button"
import { Icon } from "./shell/icons"
import "../../registry/uiset/ui/shell/shell.css"

function CopyButton(props: {
  value: string
  label?: string
  /** A fuller name when several copy buttons share a page, like "Copy app.tsx". Start it
   *  with the visible label, so people who speak the label can still find it. */
  "aria-label"?: string
  copiedLabel?: string
  /** Announced when the browser refuses the clipboard. */
  failedLabel?: string
}) {
  const [copied, setCopied] = createSignal(false)
  return (
    <Button
      variant="outline"
      class="copy-button"
      aria-label={props["aria-label"]}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(props.value)
        } catch {
          // The browser refused (no permission, an insecure page): say so rather than nothing.
          announce(props.failedLabel ?? "Couldn't copy")
          return
        }
        setCopied(true)
        announce(props.copiedLabel ?? "Copied")
        setTimeout(() => setCopied(false), 1600)
      }}
    >
      <Icon name={copied() ? "check" : "copy"} />
      {/* In its own element: UI SDK sizes a labelled button whose only element is an icon
          as a square icon button, which would squeeze the visible label out. */}
      <span>{copied() ? (props.copiedLabel ?? "Copied") : (props.label ?? "Copy")}</span>
    </Button>
  )
}

export { CopyButton }
