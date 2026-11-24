import { DateInput } from "../../src/date-input"
import { Field, FieldLabel } from "../../src/field"

export default function DateInputExample() {
  return (
    <Field class="stack">
      <FieldLabel>Start date</FieldLabel>
      <DateInput defaultValue="2026-11-16" />
    </Field>
  )
}
