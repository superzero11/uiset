import { useState } from "react"
import { Field, FieldLabel } from "@/registry/uiset/ui/field"
import { Textarea, TextareaCount } from "@/registry/uiset/ui/textarea"

export default function TextareaExample() {
  const [notes, setNotes] = useState("Faster search, and a new export to CSV.")
  return (
    <Field className="stack">
      <FieldLabel>Release notes</FieldLabel>
      <Textarea value={notes} onValueChange={setNotes} maxLength={160} autoResize placeholder="What changed…" />
      <TextareaCount value={notes} max={160} />
    </Field>
  )
}
