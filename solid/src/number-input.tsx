import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import {
  NumberInput as NumberInputRoot,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/solid/number-input"

function NumberInput(props: ComponentProps<typeof NumberInputRoot>) {
  return (
    <NumberInputRoot {...omit(props, "children")}>
      {props.children ?? (
        <NumberInputGroup>
          <NumberInputDecrement aria-label="Decrease" />
          <NumberInputControl />
          <NumberInputIncrement aria-label="Increase" />
        </NumberInputGroup>
      )}
    </NumberInputRoot>
  )
}

export { NumberInput, NumberInputControl, NumberInputDecrement, NumberInputGroup, NumberInputIncrement }
export { NumberInputScrubArea, NumberInputScrubAreaCursor, createNumberInputController } from "@ui-sdk/solid/number-input"
