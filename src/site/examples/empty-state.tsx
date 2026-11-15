import { Button } from "@/registry/uiset/ui/button"
import { EmptyState } from "@/registry/uiset/ui/empty-state"

export default function EmptyStateExample() {
  return (
    <EmptyState
      level={3}
      title="No deployments yet"
      description="Push to your main branch and the first one shows up here."
      actions={<Button>Connect a repository</Button>}
    />
  )
}
