import { PlaylistExample, RankingExample } from "./examples/sortable-list"
import SortableTreeExample from "./examples/sortable-tree"

/** The Lists and trees kit page: a ranking, a playlist and a file tree, side by side when there's room. */
function ListsDemo() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))", gap: "2.5rem 2rem", alignItems: "start" }}>
      <RankingExample />
      <PlaylistExample />
      <SortableTreeExample />
    </div>
  )
}

export { ListsDemo }
