import { createSignal } from "solid-js"
import { InlineEdit } from "../../src/inline-edit"

export default function InlineEditExample() {
  const [name, setName] = createSignal("Atlas")
  return (
    <div class="stack">
      <h3 style={{ margin: 0, "font-size": "1.25rem" }}>
        <InlineEdit label="Project name" value={name()} onValueChange={(next) => setName(next)} validate={(text) => (text.trim() ? null : "A project needs a name.")} />
      </h3>
      <InlineEdit label="Description" defaultValue="" placeholder="Add a description" actions />
      <InlineEdit label="Region" defaultValue="Europe (Frankfurt)" disabled />
      <p class="example-note">Saved as: {name()}</p>
    </div>
  )
}
