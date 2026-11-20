"use client"

import { useLayoutEffect, useMemo, useRef, type ComponentProps } from "react"
import { setTicker } from "./motion/ticker"
import "./shell/shell.css"
import "./motion/motion.css"

type NumberTickerProps = Omit<ComponentProps<"span">, "children"> & {
  value: number
  /** Counts up from this, once, when the ticker first scrolls into view. */
  from?: number
  /** Intl.NumberFormat options, or your own formatter. */
  format?: Intl.NumberFormatOptions | ((value: number) => string)
  locale?: string
}

/**
 * A number that moves to its new value, each skin its own way: Base rolls its digits,
 * Blueprint counts at an even pace, Studio steps, Phosphor types it, Ink redraws. People
 * and agents read the value itself.
 */
function NumberTicker({ value, from, format, locale, ...props }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const options = typeof format === "function" ? undefined : JSON.stringify(format ?? {})
  const formatter = useMemo(() => {
    if (typeof format === "function") return format
    const numbers = new Intl.NumberFormat(locale, options ? JSON.parse(options) : undefined)
    return (v: number) => numbers.format(v)
  }, [typeof format === "function" ? format : options, locale])
  useLayoutEffect(() => setTicker(ref.current!, { value, from, format: formatter }), [value, formatter])
  return <span {...props} ref={ref} />
}

export { NumberTicker }
export type { NumberTickerProps }
