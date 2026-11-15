import { Button } from "@/registry/uiset/ui/button"
import { PageHeader } from "@/registry/uiset/ui/page-header"

export default function PageHeaderExample() {
  return (
    <PageHeader
      level={2}
      title="Billing"
      description="Plan, usage and invoices."
      actions={<Button variant="outline">Download invoices</Button>}
    />
  )
}
