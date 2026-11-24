import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import "../../registry/uiset/ui/shell/shell.css"

function ItemList(props: { label: string; children: JSX.Element }) {
  return (
    <ul aria-label={props.label} class="item-list">
      {props.children}
    </ul>
  )
}

function Item(props: { media?: JSX.Element; title: string; description?: JSX.Element; meta?: JSX.Element; actions?: JSX.Element; href?: string }) {
  return (
    <li class="item">
      <Show when={props.media}>{(media) => <span class="item-media">{media()}</span>}</Show>
      <span class="item-text">
        <Show when={props.href} fallback={<span class="item-title">{props.title}</span>}>
          {(href) => (
            <a href={href()} class="item-title">
              {props.title}
            </a>
          )}
        </Show>
        <Show when={props.description}>{(description) => <span class="item-description">{description()}</span>}</Show>
      </span>
      <Show when={props.meta}>{(meta) => <span class="item-meta">{meta()}</span>}</Show>
      <Show when={props.actions}>{(actions) => <span class="item-actions">{actions()}</span>}</Show>
    </li>
  )
}

export { Item, ItemList }
