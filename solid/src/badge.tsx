import type { ComponentProps } from "@solidjs/web"
import { omit, Show } from "solid-js"
import "../../registry/uiset/ui/shell/shell.css"

type Tone = "neutral" | "info" | "success" | "warning" | "danger"

// Tone is color plus the words you pass; never use the color alone to carry meaning.
function Badge(props: ComponentProps<"span"> & { tone?: Tone }) {
  return <span data-tone={props.tone ?? "neutral"} class={["badge", props.class]} {...omit(props, "tone", "class")} />
}

// A count on the corner of an icon or avatar. People see the number; screen readers and
// agents read `label`, so say what is being counted there ("3 unread").
function CountBadge(
  props: Omit<ComponentProps<"span">, "aria-label"> & {
    count: number
    /** Above this the badge shows "99+". */
    max?: number
    /** A dot with no number, for "something new". */
    dot?: boolean
    showZero?: boolean
    label?: string
  },
) {
  const visible = () => props.count > 0 || Boolean(props.showZero)
  const max = () => props.max ?? 99
  const rest = omit(props, "count", "max", "dot", "showZero", "label", "class", "children")
  return (
    <span class={["count-badge", props.class]} {...rest}>
      {props.children}
      <Show when={visible()}>
        <span class="count-badge-count" data-dot={props.dot ? "" : undefined} aria-hidden="true">
          {props.dot ? null : props.count > max() ? `${max()}+` : props.count}
        </span>
      </Show>
      <Show when={visible() && props.label}>{(label) => <span class="uiset-visually-hidden">{label()}</span>}</Show>
    </span>
  )
}

export { Badge, CountBadge }
export type { Tone as BadgeTone }
