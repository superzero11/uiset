import { Field, FieldLabel } from "@/registry/uiset/ui/field"
import { TimeInput } from "@/registry/uiset/ui/time-input"

export default function TimeInputExample() {
  return (
    <Field className="stack">
      <FieldLabel>Standup time</FieldLabel>
      <TimeInput defaultValue="09:30" />
    </Field>
  )
}
