"use client"

import {
  ColorPicker as ColorPickerRoot,
  ColorPickerArea,
  ColorPickerAreaThumb,
  ColorPickerInput,
  ColorPickerSlider,
  ColorPickerSliderThumb,
  ColorPickerSwatch,
} from "@ui-sdk/react/color-picker"
import type * as React from "react"

function ColorPicker({
  children,
  ...props
}: React.ComponentProps<typeof ColorPickerRoot>) {
  return (
    <ColorPickerRoot {...props}>
      {children ?? (
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
          <div className="color-picker-row">
            <ColorPickerSwatch />
            <ColorPickerInput aria-label="Hex" />
          </div>
        </>
      )}
    </ColorPickerRoot>
  )
}

export {
  ColorPicker,
  ColorPickerArea,
  ColorPickerAreaThumb,
  ColorPickerInput,
  ColorPickerSlider,
  ColorPickerSliderThumb,
  ColorPickerSwatch,
}
export {
  ColorPickerAreaCanvas,
  ColorPickerChannelInput,
  ColorPickerEyeDropper,
  ColorPickerSwatchItem,
  ColorPickerSwatches,
  createColorPickerController,
} from "@ui-sdk/react/color-picker"
