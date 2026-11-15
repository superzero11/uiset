import { useState } from "react"
import { Field, FieldLabel } from "@/registry/uiset/ui/field"
import { Textarea } from "@/registry/uiset/ui/textarea"

export default function TextareaExample() {
  const [notes, setNotes] = useState("")
  return (
    <Field className="stack">
      <FieldLabel>Release notes</FieldLabel>
      <Textarea
        value={notes}
        onValueChange={setNotes}
        autoResize
        placeholder="What changed…"
      />
    </Field>
  )
}
