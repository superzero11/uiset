import type { ComponentProps, JSX } from "@solidjs/web"
import { children as resolve, createEffect, createSignal, omit, Show } from "solid-js"
import { swap } from "../../registry/uiset/ui/motion/crossfade"
import "../../registry/uiset/ui/motion/motion.css"

type CrossfadeProps = Omit<ComponentProps<"div">, "children"> & {
  /** Which content this is. When it changes, the new content takes the old one's place. */
  value: string | number
  children: JSX.Element
}

type Pane = { key: string; nodes: () => JSX.Element }

/**
 * Content swapped in place, each skin its own way: Base fades across, Blueprint wipes,
 * Studio cuts, Phosphor scans the new content in, Ink redraws; the box moves to the new
 * size. The leaving content can't be reached or read.
 */
function Crossfade(props: CrossfadeProps) {
  let root: HTMLDivElement | undefined
  const key = () => String(props.value)
  const [leaving, setLeaving] = createSignal<Pane | null>(null)
  let shown: Pane | null = null
  createEffect(
    () => [leaving(), key()] as const,
    ([out, current]) => {
      if (!out || !root) return
      const pane = (k: string) => [...root!.children].find((c) => (c as HTMLElement).dataset.pane === k) as HTMLElement | undefined
      const incoming = pane(current)
      if (!incoming) return
      return swap(root, incoming, pane(out.key) ?? null, () => setLeaving(null))
    },
  )
  return (
    <div {...omit(props, "value", "children")} ref={(el) => (root = el)} data-slot="crossfade">
      <Show when={leaving()}>
        {(out) => (
          <div data-pane={out().key} inert aria-hidden="true">
            {out().nodes()}
          </div>
        )}
      </Show>
      {/* Each value builds its content in a branch of its own. When the value changes, the old
          branch stops updating, so its nodes still show the old content while they leave. */}
      <Show when={key()} keyed>
        {(current) => {
          const nodes = resolve(() => props.children)
          const before = shown
          shown = { key: current, nodes }
          createEffect(
            () => current,
            () => {
              if (before && before.key !== current) setLeaving(before)
            },
          )
          return <div data-pane={current}>{nodes()}</div>
        }}
      </Show>
    </div>
  )
}

export { Crossfade }
export type { CrossfadeProps }
