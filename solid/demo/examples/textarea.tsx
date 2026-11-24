import { createSignal } from "solid-js"
import { Field, FieldLabel } from "../../src/field"
import { Textarea, TextareaCount } from "../../src/textarea"

export default function TextareaExample() {
  const [notes, setNotes] = createSignal("Faster search, and a new export to CSV.")
  return (
    <Field class="stack">
      <FieldLabel>Release notes</FieldLabel>
      <Textarea value={notes()} onValueChange={(value) => setNotes(value)} maxlength={160} autoResize placeholder="What changed…" />
      <TextareaCount value={notes()} max={160} />
    </Field>
  )
}
