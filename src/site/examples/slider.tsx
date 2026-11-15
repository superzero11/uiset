import { Field, FieldLabel } from "@/registry/uiset/ui/field"
import { Slider } from "@/registry/uiset/ui/slider"

export default function SliderExample() {
  return (
    <Field className="stack">
      <FieldLabel>Price range</FieldLabel>
      <Slider
        defaultValue={[20, 80]}
        thumbLabels={["Minimum price", "Maximum price"]}
        showValue
      />
    </Field>
  )
}
