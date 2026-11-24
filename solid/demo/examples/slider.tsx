import { Field, FieldLabel } from "../../src/field"
import { Slider } from "../../src/slider"

export default function SliderExample() {
  return (
    <Field class="stack">
      <FieldLabel>Price range</FieldLabel>
      <Slider
        defaultValue={[20, 80]}
        thumbLabels={["Minimum price", "Maximum price"]}
        showValue
      />
    </Field>
  )
}
