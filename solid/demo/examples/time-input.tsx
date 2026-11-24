import { Field, FieldLabel } from "../../src/field"
import { TimeInput } from "../../src/time-input"

export default function TimeInputExample() {
  return (
    <Field class="stack">
      <FieldLabel>Standup time</FieldLabel>
      <TimeInput defaultValue="09:30" />
    </Field>
  )
}
