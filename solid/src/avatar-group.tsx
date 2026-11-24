import type { ComponentProps, JSX } from "@solidjs/web"
import { children as resolve, omit, Show } from "solid-js"
import { Avatar, AvatarFallback } from "./avatar"
import "../../registry/uiset/ui/shell/shell.css"

function AvatarGroup(
  props: Omit<ComponentProps<"div">, "aria-label"> & {
    /** Names the group for screen readers and agents, like "Reviewers". */
    label: string
    /** Show this many avatars, then a count of the rest. */
    max?: number
    /** How many there are in all, when you render only the first few. */
    total?: number
    moreLabel?: (count: number) => string
    children: JSX.Element
  },
) {
  const avatars = resolve(() => props.children)
  const limit = () => (props.max === undefined ? Infinity : Math.max(0, props.max))
  const shown = () => avatars.toArray().slice(0, limit())
  const rest = () => avatars.toArray().slice(limit())
  const more = () => Math.max(props.total ?? avatars.toArray().length, avatars.toArray().length) - shown().length
  const others = omit(props, "label", "max", "total", "moreLabel", "class", "children")
  return (
    <div role="group" aria-label={props.label} class={["avatar-group", props.class]} {...others}>
      {shown()}
      {/* Solid builds every avatar, and on the server one left out still takes a hydration key:
          the rest wait in a hidden element, so the page hydrates with nothing missing. */}
      <Show when={rest().length > 0}>
        <span hidden>{rest()}</span>
      </Show>
      {/* Named in words, like the avatars beside it: "+2" alone reads as "plus two". */}
      <Show when={more() > 0}>
        <Avatar class="avatar-group-more" role="img" aria-label={(props.moreLabel ?? ((count: number) => `${count} more`))(more())}>
          <AvatarFallback>+{more()}</AvatarFallback>
        </Avatar>
      </Show>
    </div>
  )
}

export { AvatarGroup }
