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
    <div style={{ display: "grid", gap: "2rem" }}>
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
      <Timeline orientation="horizontal" loop={false} aria-label="Release plan">
        <TimelineItem status="complete">
          <TimelineMarker />
          <TimelineConnector />
          <TimelineTitle>Beta</TimelineTitle>
          <TimelineTime dateTime="2026-09">September</TimelineTime>
        </TimelineItem>
        <TimelineItem status="current">
          <TimelineMarker />
          <TimelineConnector />
          <TimelineTitle>Release candidate</TimelineTitle>
          <TimelineTime dateTime="2026-11">November</TimelineTime>
        </TimelineItem>
        <TimelineItem status="upcoming">
          <TimelineMarker />
          <TimelineTitle>Version 1.0</TimelineTitle>
          <TimelineTime dateTime="2027-01">January</TimelineTime>
        </TimelineItem>
      </Timeline>
    </div>
  )
}
