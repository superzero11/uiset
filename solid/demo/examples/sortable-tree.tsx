import { createSignal } from "solid-js"
import { SortableTree, type SortableTreeItem } from "../../src/sortable-tree"

const files: SortableTreeItem[] = [
  {
    value: "src",
    label: "src",
    children: [
      { value: "components", label: "components", children: [{ value: "button", label: "button.tsx" }, { value: "dialog", label: "dialog.tsx" }] },
      { value: "lib", label: "lib", children: [{ value: "utils", label: "utils.ts" }] },
      { value: "app", label: "app.tsx" },
    ],
  },
  { value: "public", label: "public", children: [] },
  { value: "package", label: "package.json" },
  { value: "readme", label: "README.md", locked: true },
]

export default function SortableTreeExample() {
  const [items, setItems] = createSignal(files)
  const [last, setLast] = createSignal("Nothing moved yet.")
  return (
    <div class="stack">
      <p class="example-strong">Project files</p>
      <SortableTree
        label="Project files"
        icons
        items={items()}
        defaultExpanded={["src", "components"]}
        onItemsChange={(next, { key, parent }) => {
          setItems(next)
          setLast(`Moved ${key} into ${parent ?? "the top level"}.`)
        }}
      />
      <p class="example-note">{last()}</p>
    </div>
  )
}
