import { Field, FieldLabel } from "@/registry/uiset/ui/field"
import { NumberInput } from "@/registry/uiset/ui/number-input"

export default function NumberInputExample() {
  return (
    <Field className="stack">
      <FieldLabel>Seats</FieldLabel>
      <NumberInput defaultValue={5} min={1} max={500} />
    </Field>
  )
}
