import SortableListExample from "./examples/sortable-list"
import SortableTreeExample from "./examples/sortable-tree"

/** The Lists and trees kit page: a ranking and a playlist, and a file tree to reorder and nest. */
function ListsDemo() {
  return (
    <div className="stack" style={{ gap: "2rem" }}>
      <SortableListExample />
      <SortableTreeExample />
    </div>
  )
}

export { ListsDemo }
