import { Badge } from "@/registry/uiset/ui/badge"

export default function BadgeExample() {
  return (
    <div className="row">
      <Badge>Draft</Badge>
      <Badge tone="info">Building</Badge>
      <Badge tone="success">Ready</Badge>
      <Badge tone="warning">Queued</Badge>
      <Badge tone="danger">Failed</Badge>
    </div>
  )
}
