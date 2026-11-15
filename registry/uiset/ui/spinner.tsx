import "./shell/shell.css"

function Spinner({
  label = "Loading",
  size = "1rem",
}: {
  label?: string
  size?: string
}) {
  return (
    <span role="status" className="spinner" style={{ width: size, height: size }}>
      <span className="uiset-visually-hidden">{label}</span>
    </span>
  )
}

export { Spinner }
