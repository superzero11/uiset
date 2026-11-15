import {
  Timeline,
  TimelineConnector,
  TimelineDescription,
  TimelineItem,
  TimelineMarker,
  TimelineTime,
  TimelineTitle,
} from "@/registry/uiset/ui/timeline"

export default function TimelineExample() {
  return (
    <Timeline aria-label="Deploy history">
      <TimelineItem>
        <TimelineMarker />
        <TimelineConnector />
        <TimelineTitle>Deployed to production</TimelineTitle>
        <TimelineTime dateTime="2026-11-15T14:32">2:32 PM</TimelineTime>
        <TimelineDescription>Version 2.4.1 is live.</TimelineDescription>
      </TimelineItem>
      <TimelineItem>
        <TimelineMarker />
        <TimelineTitle>Preview ready</TimelineTitle>
        <TimelineTime dateTime="2026-11-15T14:20">2:20 PM</TimelineTime>
      </TimelineItem>
    </Timeline>
  )
}
