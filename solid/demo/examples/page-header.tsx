import { Button } from "../../src/button"
import { PageHeader } from "../../src/page-header"

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
