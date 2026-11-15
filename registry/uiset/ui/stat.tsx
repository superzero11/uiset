import type { ReactNode } from "react"
import { Icon } from "./shell/icons"
import { Sparkline } from "./sparkline"
import "./shell/shell.css"

type Change = { value: string; direction: "up" | "down"; good?: boolean; period?: string }

function Stat({
  label,
  value,
  change,
  description,
  trend,
  format,
}: {
  label: string
  value: ReactNode
  change?: Change
  description?: ReactNode
  /** Recent values, oldest first, drawn as a sparkline whose name says where they went. */
  trend?: readonly (number | null)[]
  format?: (value: number) => string
}) {
  const good = change ? (change.good ?? change.direction === "up") : undefined
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {change && (
        <p
          className="stat-change"
          data-good={good ? "" : undefined}
          data-bad={good ? undefined : ""}
        >
          <Icon name={change.direction} />
          <span>
            <span className="uiset-visually-hidden">
              {change.direction === "up" ? "Up " : "Down "}
            </span>
            {change.value}
            {change.period && <span className="stat-period"> {change.period}</span>}
          </span>
        </p>
      )}
      {trend && (
        <Sparkline
          className="stat-trend"
          values={trend}
          label={`${label} trend`}
          format={format}
          width={160}
          height={32}
        />
      )}
      {description && <p className="stat-description">{description}</p>}
    </div>
  )
}

export { Stat }
export type { Change as StatChange }
