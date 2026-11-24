import type { ComponentProps, JSX } from "@solidjs/web"
import { omit } from "solid-js"
import "../../registry/uiset/ui/motion/motion.css"

type ThinkingProps = Omit<ComponentProps<"span">, "children"> & {
  /** What it says, once, to screen readers too. */
  children?: JSX.Element
}

/**
 * A wait, each skin its own way: Base's words shimmer, Blueprint's hatching moves, Studio's
 * LEDs chase, Phosphor's dots print, Ink's dots stay still. It's a status: screen readers
 * hear it once.
 */
function Thinking(props: ThinkingProps) {
  return (
    <span role="status" data-slot="thinking" {...omit(props, "children")}>
      <span class="thinking-label">{props.children ?? "Thinking…"}</span>
      <span class="thinking-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  )
}

export { Thinking }
export type { ThinkingProps }
