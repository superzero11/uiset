import { Badge } from "@/registry/uiset/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/uiset/ui/table"

const invoices = [
  { id: "INV-1042", customer: "Northwind Traders", status: "Paid", due: "Nov 3", amount: 1280 },
  { id: "INV-1043", customer: "Kestrel Labs", status: "Due", due: "Nov 18", amount: 640 },
  { id: "INV-1044", customer: "Juniper & Vale", status: "Overdue", due: "Oct 30", amount: 2150 },
  { id: "INV-1045", customer: "Halcyon Freight", status: "Paid", due: "Nov 9", amount: 420 },
  { id: "INV-1046", customer: "Orchard Systems", status: "Due", due: "Nov 24", amount: 975 },
  { id: "INV-1047", customer: "Brightwater Co-op", status: "Paid", due: "Nov 12", amount: 310 },
]

const tones = { Paid: "success", Due: "info", Overdue: "danger" } as const
const money = (amount: number) => `$${amount.toLocaleString("en-US")}`

export default function TableExample() {
  return (
    <Table label="Invoices" stack stickyHeader stickyColumn maxHeight="15rem" minWidth="36rem">
      <TableCaption>Invoices sent in the last 30 days.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due</TableHead>
          <TableHead align="end">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableHead scope="row">{invoice.id}</TableHead>
            <TableCell>{invoice.customer}</TableCell>
            <TableCell>
              <Badge tone={tones[invoice.status as keyof typeof tones]}>{invoice.status}</Badge>
            </TableCell>
            <TableCell>{invoice.due}</TableCell>
            <TableCell align="end">{money(invoice.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableHead scope="row">Total</TableHead>
          <TableCell label="Invoices">{invoices.length} invoices</TableCell>
          <TableCell />
          <TableCell />
          <TableCell align="end">{money(invoices.reduce((sum, i) => sum + i.amount, 0))}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}
