import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/registry/uiset/ui/badge"
import { Button } from "@/registry/uiset/ui/button"
import {
  DataGrid,
  DataGridToolbar,
  type DataGridColumn,
  type DataGridEdit,
} from "@/registry/uiset/ui/data-grid"

type Order = {
  id: string
  customer: string
  region: string
  status: string
  amount: number
  placed: Date
  rush: boolean
}

const regions = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]
const statuses = ["Paid", "Pending", "Refunded", "Failed"]
const first = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Vandelay", "Stark", "Wayne", "Tyrell", "Soylent", "Cyberdyne", "Wonka"]
const second = ["Labs", "Foods", "Systems", "Logistics", "Studio", "Partners", "Supply", "Health"]

// A seeded generator, so every visit shows the same ten thousand orders.
function orders(count: number): Order[] {
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const pick = <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)]!
  const start = Date.UTC(2026, 0, 1)
  return Array.from({ length: count }, (_, index) => ({
    id: `ORD-${10001 + index}`,
    customer: `${pick(first)} ${pick(second)}`,
    region: pick(regions),
    status: next() < 0.62 ? "Paid" : pick(statuses),
    amount: Math.round((40 + next() ** 2 * 9000) * 100) / 100,
    placed: new Date(start + Math.floor(next() * 318) * 86400000),
    rush: next() < 0.18,
  }))
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })
const tone = { Paid: "success", Pending: "warning", Refunded: "neutral", Failed: "danger" } as const

const columns: DataGridColumn<Order>[] = [
  { id: "id", header: "Order", value: (o) => o.id, width: 120, pinned: true, hideable: false, groupable: false },
  { id: "customer", header: "Customer", value: (o) => o.customer, width: 190, editable: true, groupable: false },
  { id: "region", header: "Region", value: (o) => o.region, width: 160, editable: true, options: regions },
  {
    id: "status",
    header: "Status",
    value: (o) => o.status,
    width: 130,
    editable: true,
    options: statuses,
    render: (o) => <Badge tone={tone[o.status as keyof typeof tone]}>{o.status}</Badge>,
  },
  {
    id: "amount",
    header: "Amount",
    type: "number",
    value: (o) => o.amount,
    text: (o) => money.format(o.amount),
    width: 130,
    editable: true,
    groupable: false,
  },
  {
    id: "placed",
    header: "Placed",
    type: "date",
    value: (o) => o.placed,
    text: (o) => day.format(o.placed),
    width: 140,
    groupable: false,
  },
  { id: "rush", header: "Rush", type: "boolean", value: (o) => o.rush, width: 100, editable: true },
]

function GridDemo() {
  const [rows, setRows] = useState(() => orders(10000))
  const [selected, setSelected] = useState<string[]>([])
  const getRowId = useCallback((order: Order) => order.id, [])
  const chosen = useMemo(() => new Set(selected), [selected])
  const total = useMemo(
    () => rows.reduce((sum, o) => (chosen.has(o.id) ? sum + o.amount : sum), 0),
    [rows, chosen],
  )

  const edit = ({ rowId, column, value }: DataGridEdit<Order>) => {
    setRows((current) =>
      current.map((order) => (order.id === rowId ? { ...order, [column]: value } : order)),
    )
  }

  return (
    <DataGrid
      label="Orders"
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      selectable
      selected={selected}
      onSelectedChange={setSelected}
      defaultSort={[{ column: "placed", direction: "descending" }]}
      onCellEdit={edit}
      persist="uiset-orders-grid"
      height="30rem"
    >
      <DataGridToolbar
        filename="orders"
        selectionActions={
          <>
            <span className="grid-demo-total">{money.format(total)}</span>
            <Button
              variant="outline"
              onClick={() =>
                setRows((current) =>
                  current.map((o) => (chosen.has(o.id) ? { ...o, status: "Paid" } : o)),
                )
              }
            >
              Mark paid
            </Button>
          </>
        }
      />
    </DataGrid>
  )
}

export { GridDemo }
