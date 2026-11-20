"use client"

import { useLayoutEffect, useRef, type ComponentProps } from "react"
import { setReveal, type RevealBy } from "./motion/reveal"
import "./motion/motion.css"

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
function TextReveal({ children, by, ...props }: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => setReveal(ref.current!, children, by), [children, by])
  return <span {...props} ref={ref} />
}

export { TextReveal }
export type { TextRevealProps }
