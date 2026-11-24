import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { Icon } from "./shell/icons"
import { Sparkline } from "./sparkline"
import "../../registry/uiset/ui/shell/shell.css"

type Change = { value: string; direction: "up" | "down"; good?: boolean; period?: string }

function Stat(props: {
  label: string
  value: JSX.Element
  change?: Change
  description?: JSX.Element
  /** Recent values, oldest first, drawn as a sparkline whose name says where they went. */
  trend?: readonly (number | null)[]
  format?: (value: number) => string
}) {
  return (
    <div class="stat">
      <p class="stat-label">{props.label}</p>
      <p class="stat-value">{props.value}</p>
      <Show when={props.change}>
        {(change) => {
          const good = () => change().good ?? change().direction === "up"
          return (
            <p class="stat-change" data-good={good() ? "" : undefined} data-bad={good() ? undefined : ""}>
              <Icon name={change().direction} />
              <span>
                <span class="uiset-visually-hidden">{change().direction === "up" ? "Up " : "Down "}</span>
                {change().value}
                <Show when={change().period}>{(period) => <span class="stat-period"> {period()}</span>}</Show>
              </span>
            </p>
          )
        }}
      </Show>
      <Show when={props.trend}>
        {(trend) => <Sparkline class="stat-trend" values={trend()} label={`${props.label} trend`} format={props.format} width={160} height={32} />}
      </Show>
      <Show when={props.description}>{(description) => <p class="stat-description">{description()}</p>}</Show>
    </div>
  )
}

export { Stat }
export type { Change as StatChange }
