import type { JSX } from "@solidjs/web"
import { omit } from "solid-js"
import {
  SegmentedControl as SegmentedControlRoot,
  SegmentedControlIndicator,
  SegmentedControlItem,
  type SegmentedControlState,
} from "@ui-sdk/solid/segmented-control"

type SegmentedControlProps<T extends string> = Parameters<typeof SegmentedControlRoot<T>>[0]

// The indicator comes first, always. Children may be a function of the control's state; that
// function runs again only when the state it reads changes.
function SegmentedControl<T extends string = string>(props: SegmentedControlProps<T>) {
  return (
    <SegmentedControlRoot {...omit(props, "children")}>
      {(state: SegmentedControlState) => {
        const children = props.children as JSX.Element | ((state: SegmentedControlState) => JSX.Element)
        return (
          <>
            <SegmentedControlIndicator />
            {typeof children === "function" ? children(state) : children}
          </>
        )
      }}
    </SegmentedControlRoot>
  )
}

export { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem }
export { createSegmentedControlController } from "@ui-sdk/solid/segmented-control"
