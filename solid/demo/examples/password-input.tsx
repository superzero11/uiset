import { createSignal } from "solid-js"
import { Field, FieldLabel } from "../../src/field"
import { PasswordInput, PasswordInputControl, PasswordInputToggle, PasswordRules } from "../../src/password-input"

const rules = [
  { label: "At least 12 characters", test: (password: string) => password.length >= 12 },
  { label: "A number", test: (password: string) => /\d/.test(password) },
  { label: "An uppercase and a lowercase letter", test: (password: string) => /[a-z]/.test(password) && /[A-Z]/.test(password) },
]

export default function PasswordInputExample() {
  const [password, setPassword] = createSignal("")
  return (
    <Field class="stack">
      <FieldLabel>Create a password</FieldLabel>
      <PasswordInput value={password()} onValueChange={(value) => setPassword(value)} autoComplete="new-password">
        <PasswordInputControl />
        <PasswordInputToggle aria-label="Show password" />
      </PasswordInput>
      <PasswordRules value={password()} rules={rules} />
    </Field>
  )
}
