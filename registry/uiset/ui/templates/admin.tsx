"use client"

import { inputHints } from "@ui-sdk/core"
import { useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../alert-dialog"
import { AppShell, SidebarGroup, SidebarItem, SidebarNav } from "../app-shell"
import { Badge } from "../badge"
import { Button } from "../button"
import {
  DataGrid,
  DataGridExport,
  DataGridFilters,
  DataGridSearch,
  DataGridSelection,
  DataGridViewMenu,
  type DataGridColumn,
} from "../data-grid"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "../drawer"
import { EmptyState } from "../empty-state"
import { Field, FieldError, FieldLabel, Input } from "../field"
import { PageHeader } from "../page-header"
import { ScrollBox } from "../scroll-area"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "../select"
import { Icon } from "../shell/icons"
import { toast } from "../toast"
import { day, planOptions, sampleCustomers, statusOptions, tone, type Customer } from "./admin-sample"
import "./templates.css"

// A records page: list, search, filter, create, edit, bulk delete and export. The list
// is a DataGrid; create and edit share one form in a drawer; deletes ask first and need
// a person's approval when an agent asks (data-agent-confirm). Mount <Toaster /> once.

const columns: DataGridColumn<Customer>[] = [
  { id: "name", header: "Name", value: (c) => c.name, width: 180, hideable: false, pinned: true },
  { id: "email", header: "Email", value: (c) => c.email, width: 210 },
  { id: "company", header: "Company", value: (c) => c.company, width: 170 },
  {
    id: "plan",
    header: "Plan",
    value: (c) => c.plan,
    options: planOptions,
    editable: true,
    width: 100,
  },
  {
    id: "status",
    header: "Status",
    value: (c) => c.status,
    options: statusOptions,
    editable: true,
    render: (c) => <Badge tone={tone[c.status]}>{c.status}</Badge>,
    width: 110,
  },
  { id: "seats", header: "Seats", type: "number", value: (c) => c.seats, editable: true, width: 90 },
  {
    id: "joined",
    header: "Joined",
    type: "date",
    value: (c) => c.joined,
    text: (c) => day.format(c.joined),
    width: 140,
  },
]

/** The create and edit form. Native checks first; the first problem takes focus. */
function CustomerForm({
  customer,
  onSave,
}: {
  customer: Customer | null
  onSave: (values: Omit<Customer, "id" | "joined">) => void
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSave({
      name: String(data.get("name")),
      email: String(data.get("email")),
      company: String(data.get("company")),
      plan: String(data.get("plan")) as Customer["plan"],
      status: String(data.get("status")) as Customer["status"],
      seats: Number(data.get("seats")),
    })
  }
  return (
    <form className="admin-form" onSubmit={submit} aria-label={customer ? `Edit ${customer.name}` : "New customer"}>
      <Field name="name">
        <FieldLabel>Full name</FieldLabel>
        <Input required defaultValue={customer?.name} {...inputHints("name", { enter: "next" })} />
        <FieldError match="valueMissing">Enter a name.</FieldError>
      </Field>
      <Field name="email">
        <FieldLabel>Email</FieldLabel>
        <Input type="email" required defaultValue={customer?.email} {...inputHints("email", { enter: "next" })} />
        <FieldError match="valueMissing">Enter an email address.</FieldError>
        <FieldError match="typeMismatch">Enter an email address like ada@example.com.</FieldError>
      </Field>
      <Field name="company">
        <FieldLabel>Company</FieldLabel>
        <Input required defaultValue={customer?.company} autoComplete="organization" />
        <FieldError match="valueMissing">Enter a company.</FieldError>
      </Field>
      <div className="admin-form-row">
        <Field name="plan">
          <Select name="plan" defaultValue={customer?.plan ?? "Free"}>
            <SelectLabel>Plan</SelectLabel>
            <SelectTrigger />
            <SelectContent>
              {planOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field name="status">
          <Select name="status" defaultValue={customer?.status ?? "Trial"}>
            <SelectLabel>Status</SelectLabel>
            <SelectTrigger />
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field name="seats">
        <FieldLabel>Seats</FieldLabel>
        <Input type="number" required min={1} max={500} defaultValue={String(customer?.seats ?? 1)} {...inputHints("numeric")} />
        <FieldError match="rangeUnderflow">At least one seat.</FieldError>
        <FieldError match="rangeOverflow">Up to 500 seats; contact sales for more.</FieldError>
        <FieldError match="valueMissing">Enter a number of seats.</FieldError>
      </Field>
      <div className="admin-form-actions">
        <DrawerClose>Cancel</DrawerClose>
        <Button type="submit">{customer ? "Save changes" : "Add customer"}</Button>
      </div>
    </form>
  )
}

function AdminTemplate({
  defaultCustomers: initial = sampleCustomers,
  brand = "Acme Cloud",
  contentElement = "main",
  onSave,
  onDelete,
}: {
  /** The records when the page opens; the template keeps them after that. */
  defaultCustomers?: readonly Customer[]
  brand?: ReactNode
  contentElement?: "main" | "div"
  /** Saves a new or edited customer (and inline edits). */
  onSave?: (customer: Customer) => void | Promise<void>
  /** Deletes customers by id. */
  onDelete?: (ids: string[]) => void | Promise<void>
}) {
  const [customers, setCustomers] = useState<Customer[]>([...initial])
  const [selected, setSelected] = useState<string[]>([])
  // The drawer edits one customer or makes a new one (null). Its content stays while it
  // closes, so the title doesn't flip on the way out.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [confirming, setConfirming] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const chosen = customers.filter((c) => selected.includes(c.id))
  const who = chosen.length === 1 ? chosen[0]!.name : `${chosen.length} customers`
  // Each opening gets a fresh form, so a second "New customer" starts empty.
  const [opened, setOpened] = useState(0)
  const openDrawer = (customer: Customer | null) => {
    setEditing(customer)
    setOpened((n) => n + 1)
    setDrawerOpen(true)
  }

  const save = async (values: Omit<Customer, "id" | "joined">) => {
    const customer: Customer = editing
      ? { ...editing, ...values }
      : { ...values, id: crypto.randomUUID(), joined: new Date() }
    try {
      await onSave?.(customer)
    } catch {
      toast(`Couldn't save ${values.name}. Try again.`)
      return
    }
    setCustomers((all) => (editing ? all.map((c) => (c.id === customer.id ? customer : c)) : [customer, ...all]))
    toast(editing ? `Saved ${values.name}` : `Added ${values.name}`)
    setDrawerOpen(false)
  }

  return (
    <AppShell
      label="Admin navigation"
      brand={<span className="template-brand">{brand}</span>}
      contentElement={contentElement}
      sidebar={
        <SidebarNav label="Admin sections">
          <SidebarGroup title="Records">
            <SidebarItem href="#customers" current icon={<Icon name="users" />}>
              Customers
            </SidebarItem>
            <SidebarItem href="#orders" icon={<Icon name="orders" />}>
              Orders
            </SidebarItem>
            <SidebarItem href="#invoices" icon={<Icon name="card" />}>
              Invoices
            </SidebarItem>
          </SidebarGroup>
        </SidebarNav>
      }
    >
      <div className="admin">
        <PageHeader
          title="Customers"
          description={`${customers.length} accounts. Press Enter on a row to edit it.`}
          actions={
            <Button onClick={() => openDrawer(null)}>
              <Icon name="plus" />
              New customer
            </Button>
          }
        />
        {customers.length === 0 ? (
          <EmptyState
            icon="users"
            title="No customers yet"
            description="Customers you add show up here, with their plan and seats."
            actions={<Button onClick={() => openDrawer(null)}>Add a customer</Button>}
          />
        ) : (
          <div ref={gridRef}>
          <DataGrid
            label="Customers"
            rows={customers}
            columns={columns}
            getRowId={(c) => c.id}
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            onRowAction={(c) => openDrawer(c)}
            onCellEdit={({ rowId, column, value }) => {
              // Inline edits follow the form's rules.
              if (column === "seats" && (typeof value !== "number" || value < 1 || value > 500)) {
                toast("Seats go from 1 to 500; contact sales for more.")
                return false
              }
              const next = customers.find((c) => c.id === rowId)
              if (!next) return false
              const customer = { ...next, [column]: value }
              setCustomers((all) => all.map((c) => (c.id === rowId ? customer : c)))
              void onSave?.(customer)
            }}
            height="26rem"
            locale="en-US"
            persist="uiset-admin-customers"
          >
            <div className="admin-tools">
              {selected.length ? (
                <DataGridSelection>
                  <Button variant="outline" onClick={() => setConfirming(true)}>
                    <Icon name="trash" />
                    Delete selected
                  </Button>
                </DataGridSelection>
              ) : (
                <DataGridSearch />
              )}
              <div className="admin-tools-end">
                <DataGridFilters />
                <DataGridViewMenu />
                <DataGridExport filename="customers" />
              </div>
            </div>
          </DataGrid>
          </div>
        )}
      </div>
      {/* Outside the selection bar, which goes away with the selection; focus returns to the grid. */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
                    <AlertDialogBackdrop />
                    <AlertDialogContent
                      finalFocus={() =>
                        gridRef.current?.querySelector<HTMLElement>('[role=grid] [tabindex="0"]') ?? undefined
                      }
                    >
                      <AlertDialogTitle>Delete {who}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Their accounts, invoices and notes are deleted for good.
                      </AlertDialogDescription>
                      <div className="admin-form-actions">
                        <AlertDialogClose>Keep them</AlertDialogClose>
                        <AlertDialogClose
                          data-variant="destructive"
                          data-agent-confirm={`Deletes ${who} for good`}
                          onClick={async () => {
                            const ids = [...selected]
                            try {
                              await onDelete?.(ids)
                            } catch {
                              toast(`Couldn't delete ${who}. Try again.`)
                              return
                            }
                            const gone = new Set(ids)
                            setCustomers((all) => all.filter((c) => !gone.has(c.id)))
                            setSelected([])
                            toast(`Deleted ${who}`)
                          }}
                        >
                          Delete {who}
                        </AlertDialogClose>
                      </div>
                    </AlertDialogContent>
      </AlertDialog>
      <Drawer side="end" preventEdgeSwipe open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerBackdrop />
        <DrawerContent className="admin-drawer">
          <ScrollBox data-frame="none" className="admin-drawer-frame" viewport={{ className: "admin-drawer-scroller", role: "group", "aria-label": "Content" }}>
            <div className="admin-drawer-body">
              <DrawerTitle>{editing ? `Edit ${editing.name}` : "New customer"}</DrawerTitle>
              <DrawerDescription>
                {editing ? `Customer since ${day.format(editing.joined)}.` : "They'll get a welcome email."}
              </DrawerDescription>
              <CustomerForm key={opened} customer={editing} onSave={save} />
            </div>
          </ScrollBox>
        </DrawerContent>
      </Drawer>
    </AppShell>
  )
}

export { AdminTemplate, sampleCustomers }
export type { Customer as AdminCustomer }
