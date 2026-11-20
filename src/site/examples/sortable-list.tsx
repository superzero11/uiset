import { useState } from "react"
import { SortableList, type SortableListItem } from "@/registry/uiset/ui/sortable-list"

const priorities: SortableListItem[] = [
  { value: "search", label: "Faster search" },
  { value: "offline", label: "Offline mode" },
  { value: "export", label: "Export to PDF" },
  { value: "sso", label: "Single sign-on" },
  { value: "dark", label: "Dark mode" },
]

const tracks: SortableListItem[] = [
  { value: "intro", label: "Intro", description: "0:48, can't be moved", locked: true },
  { value: "harbor", label: "Harbor Lights", description: "3:52" },
  { value: "paper", label: "Paper Planes", description: "4:05" },
  { value: "north", label: "North Window", description: "3:31" },
  { value: "salt", label: "Salt and Cedar", description: "5:12" },
  { value: "late", label: "Late Train", description: "3:47" },
]

/** A ranking whose first place is read back. */
export function RankingExample() {
  const [order, setOrder] = useState(priorities.map((item) => item.value))
  const top = priorities.find((item) => item.value === order[0])?.label
  return (
    <div className="stack">
      <p className="example-strong">Rank what to build first</p>
      {/* Named as titled, so people and agents call it what they see. */}
      <SortableList label="Rank what to build first" items={priorities} value={order} onValueChange={setOrder} numbered />
      <p className="example-note">First: {top}</p>
    </div>
  )
}

/** A playlist with a locked first track, where a selection moves together. */
export function PlaylistExample() {
  return (
    <div className="stack">
      <p className="example-strong">Playlist</p>
      <SortableList label="Playlist" items={tracks} multiple defaultSelected={["paper", "north"]} />
      <p className="example-note">Select a few with Shift+Space or their checks, then move them together.</p>
    </div>
  )
}

export default function SortableListExample() {
  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <RankingExample />
      <PlaylistExample />
    </div>
  )
}
