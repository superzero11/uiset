import type { CSSProperties, ReactNode } from "react"
import "./shell/shell.css"

function Skeleton({
  width,
  height = "1rem",
  radius,
}: {
  width?: string
  height?: string
  radius?: string
}) {
  return (
    <span
      aria-hidden="true"
      className="skeleton"
      style={{ width, height, borderRadius: radius } as CSSProperties}
    />
  )
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span aria-hidden="true" className="skeleton-text">
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          className="skeleton"
          style={{ width: index === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </span>
  )
}

// Wrap what's loading: screen readers hear one "Loading…" instead of empty shapes.
function Loading({
  loading,
  label = "Loading…",
  children,
}: {
  loading: boolean
  label?: string
  children: ReactNode
}) {
  return (
    <div aria-busy={loading || undefined} className="loading">
      <span role="status" className="uiset-visually-hidden">
        {loading ? label : ""}
      </span>
      {children}
    </div>
  )
}

export { Loading, Skeleton, SkeletonText }
