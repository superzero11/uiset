import { Dynamic, type JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { Icon, type IconName } from "./shell/icons"
import "../../registry/uiset/ui/shell/shell.css"

function EmptyState(props: { title: string; description?: JSX.Element; icon?: IconName | null; actions?: JSX.Element; level?: 2 | 3 | 4 }) {
  const icon = () => (props.icon === undefined ? "inbox" : props.icon)
  return (
    <div class="empty-state">
      <Show when={icon()}>{(name) => <Icon name={name()} class="empty-state-icon" />}</Show>
      <Dynamic component={`h${props.level ?? 2}`} class="empty-state-title">
        {props.title}
      </Dynamic>
      {/* The narrowed value, not props.x again: each read of a JSX prop builds it anew. */}
      <Show when={props.description}>{(description) => <p class="empty-state-description">{description()}</p>}</Show>
      <Show when={props.actions}>{(actions) => <div class="empty-state-actions">{actions()}</div>}</Show>
    </div>
  )
}

export { EmptyState }
