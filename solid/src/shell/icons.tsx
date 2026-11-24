import { iconPaths, type IconName } from "../../../registry/uiset/ui/shell/icon-paths"

function Icon(props: { name: IconName; class?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" class={["uiset-icon", props.class]}>
      <path d={iconPaths[props.name]} />
    </svg>
  )
}

export { Icon }
export type { IconName }
