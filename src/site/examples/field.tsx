import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from "@/registry/uiset/ui/field"

export default function FieldExample() {
  return (
    <Field name="email" className="stack">
      <FieldLabel>Work email</FieldLabel>
      <Input
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        spellCheck={false}
      />
      <FieldDescription>We send the invite here.</FieldDescription>
      <FieldError />
    </Field>
  )
}
