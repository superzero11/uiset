import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/registry/uiset/ui/segmented-control"

export default function SegmentedControlExample() {
  return (
    <SegmentedControl aria-label="Layout" defaultValue="board">
      <SegmentedControlItem value="list">List</SegmentedControlItem>
      <SegmentedControlItem value="board">Board</SegmentedControlItem>
      <SegmentedControlItem value="calendar">Calendar</SegmentedControlItem>
    </SegmentedControl>
  )
}
