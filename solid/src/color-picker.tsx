import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import {
  ColorPicker as ColorPickerRoot,
  ColorPickerArea,
  ColorPickerAreaThumb,
  ColorPickerInput,
  ColorPickerSlider,
  ColorPickerSliderThumb,
  ColorPickerSwatch,
} from "@ui-sdk/solid/color-picker"

function ColorPicker(props: ComponentProps<typeof ColorPickerRoot>) {
  return (
    <ColorPickerRoot {...omit(props, "children")}>
      {props.children ?? (
        <>
          <ColorPickerArea>
            <ColorPickerAreaThumb />
          </ColorPickerArea>
          <ColorPickerSlider channel="hue">
            <ColorPickerSliderThumb />
          </ColorPickerSlider>
          <ColorPickerSlider channel="alpha">
            <ColorPickerSliderThumb />
          </ColorPickerSlider>
          <div class="color-picker-row">
            <ColorPickerSwatch />
            <ColorPickerInput aria-label="Hex" />
          </div>
        </>
      )}
    </ColorPickerRoot>
  )
}

export { ColorPicker, ColorPickerArea, ColorPickerAreaThumb, ColorPickerInput, ColorPickerSlider, ColorPickerSliderThumb, ColorPickerSwatch }
export {
  ColorPickerAreaCanvas,
  ColorPickerChannelInput,
  ColorPickerEyeDropper,
  ColorPickerSwatchItem,
  ColorPickerSwatches,
  createColorPickerController,
} from "@ui-sdk/solid/color-picker"
