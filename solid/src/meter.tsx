import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import { Meter as MeterRoot, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@ui-sdk/solid/meter"

function Meter(props: ComponentProps<typeof MeterRoot>) {
  return (
    <MeterRoot {...omit(props, "children")}>
      {props.children ?? (
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      )}
    </MeterRoot>
  )
}

// A meter drawn as a ring, filled to its value, with the value in the middle: a goal or a quota
// on a dashboard. Its children are MeterValue (the default) and MeterLabel, or use aria-label.
function MeterRing(props: ComponentProps<typeof MeterRoot>) {
  return (
    <MeterRoot data-shape="ring" {...omit(props, "children")}>
      {props.children ?? <MeterValue />}
    </MeterRoot>
  )
}

export { Meter, MeterIndicator, MeterLabel, MeterRing, MeterTrack, MeterValue }
