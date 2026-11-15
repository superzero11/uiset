import { DateInput } from "@/registry/uiset/ui/date-input"
import { Field, FieldLabel } from "@/registry/uiset/ui/field"

export default function DateInputExample() {
  return (
    <Field className="stack">
      <FieldLabel>Start date</FieldLabel>
      <DateInput defaultValue="2026-11-16" />
    </Field>
  )
}
