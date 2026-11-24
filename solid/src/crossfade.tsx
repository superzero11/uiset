import type { ComponentProps, JSX } from "@solidjs/web"
import { children as resolve, createSignal, omit, onSettled, Show } from "solid-js"
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
  let leavingEl: HTMLDivElement | undefined
  const key = () => String(props.value)
  // Set as a new value's branch is built (a write Solid allows only when asked), so the old
  // pane shows in the same frame as the new one; an effect relaying it would show one frame late.
  const [leaving, setLeaving] = createSignal<Pane | null>(null, { ownedWrite: true })
  let shown: Pane | null = null
  return (
    <div {...omit(props, "value", "children")} ref={(el) => (root = el)} data-slot="crossfade">
      <Show when={leaving()}>
        {(out) => (
          <div ref={(el) => (leavingEl = el)} data-pane={out().key} inert aria-hidden="true">
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
          if (before && before.key !== current) setLeaving(before)
          let incoming: HTMLDivElement | undefined
          onSettled(() => {
            if (!before || before.key === current || !root || !incoming) return
            return swap(root, incoming, leavingEl ?? null, () => setLeaving(null))
          })
          return (
            <div ref={(el) => (incoming = el)} data-pane={current}>
              {nodes()}
            </div>
          )
        }}
      </Show>
    </div>
  )
}

export { Crossfade }
export type { CrossfadeProps }
