import { useState } from "react"
import { InlineEdit } from "@/registry/uiset/ui/inline-edit"

export default function InlineEditExample() {
  const [name, setName] = useState("Atlas")
  return (
    <div className="stack">
      <h3 style={{ margin: 0, fontSize: "1.25rem" }}>
        <InlineEdit
          label="Project name"
          value={name}
          onValueChange={setName}
          validate={(text) => (text.trim() ? null : "A project needs a name.")}
        />
      </h3>
      <InlineEdit label="Description" defaultValue="" placeholder="Add a description" actions />
      <InlineEdit label="Region" defaultValue="Europe (Frankfurt)" disabled />
      <p className="example-note">Saved as: {name}</p>
    </div>
  )
}
