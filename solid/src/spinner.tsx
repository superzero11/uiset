import "../../registry/uiset/ui/shell/shell.css"

function Spinner(props: { label?: string; size?: string }) {
  return (
    <span role="status" class="spinner" style={{ width: props.size ?? "1rem", height: props.size ?? "1rem" }}>
      <span class="uiset-visually-hidden">{props.label ?? "Loading"}</span>
    </span>
  )
}

export { Spinner }
