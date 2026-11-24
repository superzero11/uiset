import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import { Progress as ProgressRoot, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@ui-sdk/solid/progress"

function Progress(props: ComponentProps<typeof ProgressRoot>) {
  return (
    <ProgressRoot {...omit(props, "children")}>
      {props.children ?? (
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      )}
    </ProgressRoot>
  )
}

// Progress drawn as a ring, filled to its value, with the value in the middle. With no value
// (unknown), a quarter of it turns, and holds still for reduced motion. Its children are
// ProgressValue (the default) and ProgressLabel.
function ProgressRing(props: ComponentProps<typeof ProgressRoot>) {
  return (
    <ProgressRoot data-shape="ring" {...omit(props, "children")}>
      {props.children ?? <ProgressValue />}
    </ProgressRoot>
  )
}

export { Progress, ProgressIndicator, ProgressLabel, ProgressRing, ProgressTrack, ProgressValue }
