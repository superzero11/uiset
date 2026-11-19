import { useState } from "react"
import { Button, ConfirmButton } from "@/registry/uiset/ui/button"

export default function ButtonExample() {
  const [deleted, setDeleted] = useState(false)
  return (
    <div className="stack">
      <div className="row">
        <Button>Create project</Button>
        <Button variant="outline">Invite people</Button>
        <Button variant="ghost">Cancel invite</Button>
        <Button disabled>Archived</Button>
      </div>
      <div className="row">
        <ConfirmButton confirmLabel="Press again to delete" confirm="Deletes the Atlas project and its deploys" onConfirm={() => setDeleted(true)} disabled={deleted}>
          Delete project
        </ConfirmButton>
        <span role="status">{deleted ? "Atlas deleted." : ""}</span>
      </div>
    </div>
  )
}
