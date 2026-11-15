import { Field, FieldLabel } from "@/registry/uiset/ui/field"
import { PasswordInput } from "@/registry/uiset/ui/password-input"

export default function PasswordInputExample() {
  return (
    <Field className="stack">
      <FieldLabel>Password</FieldLabel>
      <PasswordInput />
    </Field>
  )
}
