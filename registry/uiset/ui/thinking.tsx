import type { ComponentProps, ReactNode } from "react"
import "./motion/motion.css"

type ThinkingProps = Omit<ComponentProps<"span">, "children"> & {
  /** What it says, once, to screen readers too. */
  children?: ReactNode
}

/**
 * A wait, each skin its own way: Base's words shimmer, Blueprint's hatching moves, Studio's
 * LEDs chase, Phosphor's dots print, Ink's dots stay still. It's a status: screen readers
 * hear it once.
 */
function Thinking({ children = "Thinking…", className, ...props }: ThinkingProps) {
  return (
    <span role="status" data-slot="thinking" className={className} {...props}>
      <span className="thinking-label">{children}</span>
      <span className="thinking-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  )
}

export { Thinking }
export type { ThinkingProps }
