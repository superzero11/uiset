import { Field, FieldLabel } from "../../src/field"
import { NumberInput } from "../../src/number-input"

export default function NumberInputExample() {
  return (
    <Field class="stack">
      <FieldLabel>Seats</FieldLabel>
      <NumberInput defaultValue={5} min={1} max={500} />
    </Field>
  )
}
