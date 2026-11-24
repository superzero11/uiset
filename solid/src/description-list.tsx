import type { JSX } from "@solidjs/web"
import { For } from "solid-js"
import "../../registry/uiset/ui/shell/shell.css"

type Entry = { term: JSX.Element; details: JSX.Element }

function DescriptionList(props: { items: Entry[]; layout?: "columns" | "stacked" }) {
  return (
    <dl class="description-list" data-layout={props.layout ?? "columns"}>
      <For each={props.items}>
        {(item) => (
          <div class="description-item">
            <dt>{item.term}</dt>
            <dd>{item.details}</dd>
          </div>
        )}
      </For>
    </dl>
  )
}

export { DescriptionList }
export type { Entry as DescriptionEntry }
