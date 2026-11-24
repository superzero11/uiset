import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from "../../src/field"

export default function FieldExample() {
  return (
    <Field name="email" class="stack">
      <FieldLabel>Work email</FieldLabel>
      <Input
        type="email"
        autocomplete="email"
        placeholder="you@company.com"
        spellcheck={false}
      />
      <FieldDescription>We send the invite here.</FieldDescription>
      <FieldError />
    </Field>
  )
}
