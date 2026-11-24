import type { JSX } from "@solidjs/web"
import { Repeat } from "solid-js"
import "../../registry/uiset/ui/shell/shell.css"

function Skeleton(props: { width?: string; height?: string; radius?: string }) {
  return <span aria-hidden="true" class="skeleton" style={{ width: props.width, height: props.height ?? "1rem", "border-radius": props.radius }} />
}

function SkeletonText(props: { lines?: number }) {
  const lines = () => props.lines ?? 3
  return (
    <span aria-hidden="true" class="skeleton-text">
      <Repeat count={lines()}>{(index) => <span class="skeleton" style={{ width: index === lines() - 1 ? "60%" : "100%" }} />}</Repeat>
    </span>
  )
}

// Wrap what's loading: screen readers hear one "Loading…" instead of empty shapes.
function Loading(props: { loading: boolean; label?: string; children: JSX.Element }) {
  return (
    <div aria-busy={props.loading ? "true" : undefined} class="loading">
      <span role="status" class="uiset-visually-hidden">
        {props.loading ? (props.label ?? "Loading…") : ""}
      </span>
      {props.children}
    </div>
  )
}

export { Loading, Skeleton, SkeletonText }
