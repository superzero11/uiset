import type { ComponentProps } from "react"
import "./shell/shell.css"

type Tone = "neutral" | "info" | "success" | "warning" | "danger"

// Tone is color plus the words you pass; never use the color alone to carry meaning.
function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      data-tone={tone}
      className={["badge", className].filter(Boolean).join(" ")}
      {...props}
    />
  )
}

export { Badge }
export type { Tone as BadgeTone }
