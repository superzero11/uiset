import type { ComponentProps } from "@solidjs/web"
import { createEffect, createMemo, omit } from "solid-js"
import { setTicker } from "../../registry/uiset/ui/motion/ticker"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/motion/motion.css"

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
function NumberTicker(props: NumberTickerProps) {
  let el: HTMLSpanElement | undefined
  const formatter = createMemo(() => {
    const format = props.format
    if (typeof format === "function") return format
    const numbers = new Intl.NumberFormat(props.locale, format)
    return (value: number) => numbers.format(value)
  })
  createEffect(
    () => ({ value: props.value, from: props.from, format: formatter() }),
    (options) => {
      if (el) setTicker(el, options)
    },
  )
  return <span {...omit(props, "value", "from", "format", "locale")} ref={(span) => (el = span)} />
}

export { NumberTicker }
export type { NumberTickerProps }
