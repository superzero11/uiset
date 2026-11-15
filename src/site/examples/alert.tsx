import { Alert } from "@/registry/uiset/ui/alert"
import { Button } from "@/registry/uiset/ui/button"

export default function AlertExample() {
  return (
    <div className="stack">
      <Alert tone="info" title="Maintenance on Sunday">
        The dashboard is read-only from 02:00 to 03:00 UTC.
      </Alert>
      <Alert tone="success" title="Domain verified" />
      <Alert
        tone="warning"
        title="Card expires soon"
        actions={<Button variant="outline">Update card</Button>}
      />
      <Alert tone="danger" title="Build failed">
        Type error in src/app.tsx, line 12.
      </Alert>
    </div>
  )
}
