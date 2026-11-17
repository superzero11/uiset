import type { ComponentProps } from "react"
import "./shell/shell.css"

type Tone = "neutral" | "info" | "success" | "warning" | "danger"

// Tone is color plus the words you pass; never use the color alone to carry meaning.
function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      data-tone={tone}
      className={["badge", className].filter(Boolean).join(" ")}
      {...props}
    />
  )
}

// A count on the corner of an icon or avatar. People see the number; screen readers and
// agents read `label`, so say what is being counted there ("3 unread").
function CountBadge({
  count,
  max = 99,
  dot = false,
  showZero = false,
  label,
  className,
  children,
  ...props
}: Omit<ComponentProps<"span">, "aria-label"> & {
  count: number
  /** Above this the badge shows "99+". */
  max?: number
  /** A dot with no number, for "something new". */
  dot?: boolean
  showZero?: boolean
  label?: string
}) {
  const visible = count > 0 || showZero
  return (
    <span className={["count-badge", className].filter(Boolean).join(" ")} {...props}>
      {children}
      {visible && (
        <span className="count-badge-count" data-dot={dot ? "" : undefined} aria-hidden="true">
          {dot ? null : count > max ? `${max}+` : count}
        </span>
      )}
      {visible && label && <span className="uiset-visually-hidden">{label}</span>}
    </span>
  )
}

export { Badge, CountBadge }
export type { Tone as BadgeTone }
