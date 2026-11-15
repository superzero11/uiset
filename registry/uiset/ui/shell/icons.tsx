import { iconPaths, type IconName } from "./icon-paths"

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={["uiset-icon", className].filter(Boolean).join(" ")}
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}

export { Icon }
export type { IconName }
