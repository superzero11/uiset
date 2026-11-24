import { Dynamic, type JSX } from "@solidjs/web"
import { Show } from "solid-js"
import "../../registry/uiset/ui/shell/shell.css"

function PageHeader(props: { title: string; description?: JSX.Element; actions?: JSX.Element; above?: JSX.Element; level?: 1 | 2 }) {
  return (
    <div class="page-header">
      {props.above}
      <div class="page-header-row">
        <div class="page-header-text">
          <Dynamic component={props.level === 2 ? "h2" : "h1"} class="page-header-title">
            {props.title}
          </Dynamic>
          <Show when={props.description}>{(description) => <p class="page-header-description">{description()}</p>}</Show>
        </div>
        <Show when={props.actions}>{(actions) => <div class="page-header-actions">{actions()}</div>}</Show>
      </div>
    </div>
  )
}

export { PageHeader }
