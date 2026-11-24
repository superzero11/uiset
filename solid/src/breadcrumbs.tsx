import { For, Show } from "solid-js"
import { Icon } from "./shell/icons"
import "../../registry/uiset/ui/shell/shell.css"

type Crumb = { label: string; href?: string }

function Breadcrumbs(props: { items: Crumb[]; label?: string }) {
  return (
    <nav aria-label={props.label ?? "Breadcrumb"} class="breadcrumbs">
      <ol>
        <For each={props.items}>
          {(item, index) => {
            const last = () => index() === props.items.length - 1
            return (
              <li>
                <Show when={!last() && item.href} fallback={<span aria-current={last() ? "page" : undefined}>{item.label}</span>}>
                  <a href={item.href}>{item.label}</a>
                </Show>
                <Show when={!last()}>
                  <Icon name="chevron" class="breadcrumbs-separator" />
                </Show>
              </li>
            )
          }}
        </For>
      </ol>
    </nav>
  )
}

export { Breadcrumbs }
export type { Crumb }
