import { Button } from "@/registry/uiset/ui/button"

export default function ButtonExample() {
  return (
    <div className="row">
      <Button>Create project</Button>
      <Button variant="outline">Invite people</Button>
      <Button variant="ghost">Cancel invite</Button>
      <Button disabled>Archived</Button>
    </div>
  )
}
