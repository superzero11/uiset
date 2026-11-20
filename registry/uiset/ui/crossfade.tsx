"use client"

import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react"
import { swap } from "./motion/crossfade"
import "./motion/motion.css"

type CrossfadeProps = Omit<ComponentProps<"div">, "children"> & {
  /** Which content this is. When it changes, the new content takes the old one's place. */
  value: string | number
  children: ReactNode
}

type Pane = { key: string; node: ReactNode }

/**
 * Content swapped in place, each skin its own way: Base fades across, Blueprint wipes,
 * Studio cuts, Phosphor scans the new content in, Ink redraws; the box moves to the new
 * size. The leaving content can't be reached or read.
 */
function Crossfade({ value, children, ...props }: CrossfadeProps) {
  const key = String(value)
  const root = useRef<HTMLDivElement>(null)
  const last = useRef<Pane>({ key, node: children })
  const [leaving, setLeaving] = useState<Pane | null>(null)

  useLayoutEffect(() => {
    const before = last.current
    last.current = { key, node: children }
    if (before.key !== key) setLeaving(before)
  })

  useLayoutEffect(() => {
    const el = root.current
    if (!leaving || !el) return
    const pane = (k: string) => [...el.children].find((c) => (c as HTMLElement).dataset.pane === k) as HTMLElement | undefined
    const incoming = pane(key)
    if (!incoming) return
    return swap(el, incoming, pane(leaving.key) ?? null, () => setLeaving(null))
  }, [leaving, key])

  return (
    <div {...props} ref={root} data-slot="crossfade">
      {leaving && leaving.key !== key && (
        <div key={`out:${leaving.key}`} data-pane={leaving.key} inert aria-hidden="true">
          {leaving.node}
        </div>
      )}
      <div key={`in:${key}`} data-pane={key}>
        {children}
      </div>
    </div>
  )
}

export { Crossfade }
export type { CrossfadeProps }
