import type { ComponentProps } from "@solidjs/web"
import { createEffect, omit } from "solid-js"
import { setReveal, type RevealBy } from "../../registry/uiset/ui/motion/reveal"
import "../../registry/uiset/ui/motion/motion.css"

type TextRevealProps = Omit<ComponentProps<"span">, "children"> & {
  /** The text. When it grows, as a streamed answer does, only what's new is revealed. */
  children: string
  /** A word or a letter at a time; by default the skin's way (Phosphor types letters). */
  by?: RevealBy
}

/**
 * Text that arrives a word or a letter at a time, each skin its own way: Base's words rise
 * and fade in, Blueprint draws them, Studio lights them up, Phosphor types them, Ink shows
 * them. The whole text is in the page from the start, for screen readers and agents.
 */
function TextReveal(props: TextRevealProps) {
  let el: HTMLSpanElement | undefined
  createEffect(
    () => ({ text: props.children, by: props.by }),
    ({ text, by }) => {
      if (el) setReveal(el, text, by)
    },
  )
  return <span {...omit(props, "children", "by")} ref={(span) => (el = span)} />
}

export { TextReveal }
export type { TextRevealProps }
