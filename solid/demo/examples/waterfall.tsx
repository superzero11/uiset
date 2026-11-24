import {
  Waterfall,
  WaterfallBar,
  WaterfallRow,
  WaterfallRowHeader,
} from "../../src/waterfall"

const requests = [
  { value: "document", label: "/", start: 0, duration: 182 },
  { value: "styles", label: "app.css", start: 190, duration: 120 },
  { value: "script", label: "app.js", start: 192, duration: 410 },
  { value: "api", label: "/api/projects", start: 640, duration: 260 },
]

export default function WaterfallExample() {
  return (
    <Waterfall aria-label="Page load requests" items={requests}>
      {requests.map((request) => (
        <WaterfallRow value={request.value}>
          <WaterfallRowHeader>{request.label}</WaterfallRowHeader>
          <WaterfallBar />
        </WaterfallRow>
      ))}
    </Waterfall>
  )
}
