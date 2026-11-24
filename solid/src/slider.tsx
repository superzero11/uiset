import type { ComponentProps } from "@solidjs/web"
import { omit, Repeat, Show } from "solid-js"
import { Slider as SliderRoot, SliderControl, SliderIndicator, SliderThumb, SliderTrack, SliderValue } from "@ui-sdk/solid/slider"

type SliderProps = ComponentProps<typeof SliderRoot> & {
  showValue?: boolean
  thumbLabels?: string[]
}

function Slider(props: SliderProps) {
  const rest = omit(props, "children", "showValue", "thumbLabels", "aria-label")
  // Children given at the call site replace the default parts, as in React.
  if ("children" in props) {
    return (
      <SliderRoot aria-label={props["aria-label"]} {...rest}>
        {props.children}
      </SliderRoot>
    )
  }
  const count = () => {
    const initial = props.value ?? props.defaultValue
    return Array.isArray(initial) ? initial.length : 1
  }
  const labels = () => props.thumbLabels ?? (count() === 1 && props["aria-label"] ? [props["aria-label"]] : [])
  return (
    <SliderRoot aria-label={count() > 1 ? props["aria-label"] : undefined} {...rest}>
      <Show when={props.showValue}>
        <SliderValue />
      </Show>
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
          {/* Each thumb of a range shows its own value; without `index` they'd share one. */}
          <Repeat count={count()}>{(index) => <SliderThumb index={index} aria-label={labels()[index]} />}</Repeat>
        </SliderTrack>
      </SliderControl>
    </SliderRoot>
  )
}

export { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack, SliderValue }
export type { SliderProps }
export { createSliderController } from "@ui-sdk/solid/slider"
