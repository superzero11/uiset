import { createSignal } from "solid-js"
import { Button, ConfirmButton } from "../../src/button"

export default function ButtonExample() {
  const [deleted, setDeleted] = createSignal(false)
  return (
    <div class="stack">
      <div class="row">
        <Button>Create project</Button>
        <Button variant="outline">Invite people</Button>
        <Button variant="ghost">Cancel invite</Button>
        <Button disabled>Archived</Button>
      </div>
      <div class="row">
        <ConfirmButton confirmLabel="Press again to delete" confirm="Deletes the Atlas project and its deploys" onConfirm={() => setDeleted(true)} disabled={deleted()}>
          Delete project
        </ConfirmButton>
        <span role="status">{deleted() ? "Atlas deleted." : ""}</span>
      </div>
    </div>
  )
}
