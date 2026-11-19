"use client"

import { inputHints } from "@ui-sdk/core"
import { createContext, use, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
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
import { Avatar, AvatarFallback } from "../avatar"
import { Badge } from "../badge"
import { Button } from "../button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card"
import { DataGrid, DataGridSelection, type DataGridColumn } from "../data-grid"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../dialog"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field"
import { Item, ItemList } from "../item-list"
import { Meter, MeterIndicator, MeterTrack, MeterValue } from "../meter"
import { PageHeader } from "../page-header"
import { ScrollBox } from "../scroll-area"
import { PasswordInput, PasswordInputControl, PasswordInputToggle } from "../password-input"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "../select"
import { Icon } from "../shell/icons"
import { Switch } from "../switch"
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs"
import { Textarea } from "../textarea"
import { toast } from "../toast"
import { day, money, notificationGroups, sample, timezones, usage, type Invoice, type Member } from "./settings-sample"
import "./templates.css"

// Account settings in six tabs. Every form hands its FormData to `onSave(section, data)`
// and says so with a toast; buttons that leave the page (change plan, update card) call
// `onAction`. Destructive steps ask first, and agents need a person's approval for them
// (data-agent-confirm). Tabs keep their state while you switch. Mount <Toaster /> once.

type SettingsSection = "profile" | "password" | "notifications" | "workspace"
type SettingsAction = "change-photo" | "change-plan" | "add-seats" | "update-card"
type SettingsHandlers = {
  onSave: (section: SettingsSection, data: FormData) => Promise<void> | void
  onAction: (action: SettingsAction) => void
}
const Handlers = createContext<SettingsHandlers>({
  onSave: () => wait(400),
  onAction: (action) => toast(`${action.replace("-", " ")}: connect onAction to your billing portal`),
})

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="settings-section" aria-label={title}>
      <div className="settings-section-intro">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  )
}

function useSave(section: SettingsSection, message: string) {
  const { onSave } = use(Handlers)
  const [saving, setSaving] = useState(false)
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await onSave(section, new FormData(event.currentTarget))
      toast(message)
    } catch {
      toast("Couldn't save. Try again.")
    } finally {
      setSaving(false)
    }
  }
  return { saving, onSubmit }
}

function ProfileTab() {
  const [bio, setBio] = useState(sample.profile.bio)
  const form = useSave("profile", "Profile saved")
  const { onAction } = use(Handlers)
  return (
    <Section title="Profile" description="How you appear to your team.">
      <form className="settings-form" onSubmit={form.onSubmit} aria-label="Profile">
        <div className="settings-avatar-row">
          <Avatar role="img" aria-label={sample.profile.name} className="settings-avatar">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Button variant="outline" type="button" onClick={() => onAction("change-photo")}>
            Change photo
          </Button>
        </div>
        <Field name="name">
          <FieldLabel>Full name</FieldLabel>
          <Input required defaultValue={sample.profile.name} {...inputHints("name")} />
          <FieldError match="valueMissing">Enter your name.</FieldError>
        </Field>
        <Field name="email">
          <FieldLabel>Email</FieldLabel>
          <Input type="email" required defaultValue={sample.profile.email} {...inputHints("email")} />
          <FieldDescription>
            Used to sign in. <Badge tone="success">Verified</Badge>
          </FieldDescription>
          <FieldError match="valueMissing">Enter your email address.</FieldError>
          <FieldError match="typeMismatch">Enter an email address like ada@example.com.</FieldError>
        </Field>
        <Field name="bio">
          <FieldLabel>Bio</FieldLabel>
          <Textarea maxLength={160} value={bio} onValueChange={(value: string) => setBio(value)} autoResize />
          <FieldDescription>{bio.length} / 160</FieldDescription>
        </Field>
        <Field name="timezone">
          <Select defaultValue={sample.profile.timezone}>
            <SelectLabel>Time zone</SelectLabel>
            <SelectTrigger />
            <SelectContent>
              {timezones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="settings-actions">
          <Button type="submit" aria-disabled={form.saving || undefined}>
            {form.saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </Section>
  )
}

function SecurityTab() {
  const [twoStep, setTwoStep] = useState(true)
  const [sessions, setSessions] = useState(sample.sessions)
  const form = useSave("password", "Password changed")
  const sessionsRef = useRef<HTMLDivElement>(null)
  const focusSession = useRef<number | null>(null)
  // After signing out of a device, focus the next one's button (or the list's heading).
  useEffect(() => {
    const index = focusSession.current
    if (index === null) return
    focusSession.current = null
    const buttons = sessionsRef.current?.querySelectorAll<HTMLElement>("button") ?? []
    ;(buttons[Math.min(index, buttons.length - 1)] ?? sessionsRef.current?.closest("section")?.querySelector("h2"))?.focus()
  })
  return (
    <>
      <Section title="Password" description="Use at least 10 characters.">
        <form className="settings-form" onSubmit={form.onSubmit} aria-label="Change password">
          <Field name="current">
            <FieldLabel>Current password</FieldLabel>
            <PasswordInput required autoComplete="current-password" data-agent-secret="">
              <PasswordInputControl />
              <PasswordInputToggle aria-label="Show current password" />
            </PasswordInput>
            <FieldError match="valueMissing">Enter your current password.</FieldError>
          </Field>
          <Field name="next">
            <FieldLabel>New password</FieldLabel>
            <PasswordInput required autoComplete="new-password" data-agent-secret="">
              <PasswordInputControl minLength={10} />
              <PasswordInputToggle aria-label="Show new password" />
            </PasswordInput>
            <FieldError match="valueMissing">Choose a new password.</FieldError>
            <FieldError match="tooShort">Use at least 10 characters.</FieldError>
          </Field>
          <div className="settings-actions">
            <Button type="submit" aria-disabled={form.saving || undefined}>
              {form.saving ? "Saving…" : "Change password"}
            </Button>
          </div>
        </form>
      </Section>
      <Section title="Two-step verification" description="A code from your phone each time you sign in somewhere new.">
        <Field className="settings-switch">
          <FieldLabel>Ask for a code at sign-in</FieldLabel>
          <Switch
            data-agent-confirm={twoStep ? "Turns off two-step verification" : undefined}
            checked={twoStep}
            onCheckedChange={(checked: boolean) => {
              setTwoStep(checked)
              toast(checked ? "Two-step verification is on" : "Two-step verification is off")
            }}
          />
        </Field>
      </Section>
      <Section title="Sessions" description="Where you're signed in.">
        <div ref={sessionsRef}>
        <ItemList label="Signed-in devices">
          {sessions.map((s) => (
            <Item
              key={s.id}
              title={s.device}
              description={`${s.where} · ${s.when}`}
              meta={s.current ? <Badge tone="info">This device</Badge> : undefined}
              actions={
                s.current ? undefined : (
                  <Button
                    variant="ghost"
                    data-agent-confirm={`Signs you out on ${s.device}`}
                    onClick={() => {
                      const others = sessions.filter((x) => !x.current)
                      focusSession.current = others.findIndex((x) => x.id === s.id)
                      setSessions((all) => all.filter((x) => x.id !== s.id))
                      toast(`Signed out of ${s.device}`)
                    }}
                  >
                    Sign out {s.device}
                  </Button>
                )
              }
            />
          ))}
        </ItemList>
        </div>
      </Section>
    </>
  )
}

function NotificationsTab() {
  const form = useSave("notifications", "Notification settings saved")
  return (
    <Section title="Notifications" description="Choose what reaches you, and where.">
      <form className="settings-form" onSubmit={form.onSubmit} aria-label="Notifications">
        {notificationGroups.map((group) => (
          <fieldset key={group.channel} className="settings-fieldset">
            <legend>{group.channel}</legend>
            {group.options.map((option) => (
              <Field key={option.key} name={option.key} className="settings-switch">
                <FieldLabel>
                  {group.channel}: {option.label}
                </FieldLabel>
                <Switch defaultChecked={option.on} />
              </Field>
            ))}
          </fieldset>
        ))}
        <div className="settings-actions">
          <Button type="submit" aria-disabled={form.saving || undefined}>
            {form.saving ? "Saving…" : "Save notification settings"}
          </Button>
        </div>
      </form>
    </Section>
  )
}

const invoiceColumns: DataGridColumn<Invoice>[] = [
  { id: "id", header: "Invoice", value: (i) => i.id, width: 120 },
  { id: "date", header: "Date", type: "date", value: (i) => i.date, text: (i) => day.format(i.date), width: 140 },
  { id: "amount", header: "Amount", type: "number", value: (i) => i.amount, text: (i) => money.format(i.amount), width: 120 },
  {
    id: "status",
    header: "Status",
    value: (i) => i.status,
    render: (i) => <Badge tone={i.status === "Paid" ? "success" : "warning"}>{i.status}</Badge>,
    width: 110,
  },
]

function BillingTab() {
  const { onAction } = use(Handlers)
  return (
    <>
      <Section title="Plan" description="Billed monthly. Changes take effect right away.">
        <Card className="settings-plan">
          <CardHeader>
            <CardTitle>
              Pro <Badge tone="info">Current plan</Badge>
            </CardTitle>
            <CardDescription>$49 a seat each month, 10 seats.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="settings-usage">
              {usage.map((u) => (
                <Meter
                  key={u.label}
                  value={u.value}
                  max={u.max}
                  aria-label={`${u.label} used`}
                  format={(value: number) => `${value.toLocaleString("en-US")} of ${u.max.toLocaleString("en-US")} ${u.unit}`}
                  data-high={u.value / u.max >= 0.75 ? "" : undefined}
                >
                  {/* Children replace the meter's default parts, so all of them are here, as on the web page. */}
                  <span className="settings-usage-label">{u.label}</span>
                  <MeterValue />
                  <MeterTrack>
                    <MeterIndicator />
                  </MeterTrack>
                </Meter>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => onAction("change-plan")}>Change plan</Button>
            <Button variant="ghost" onClick={() => onAction("add-seats")}>
              Add seats
            </Button>
          </CardFooter>
        </Card>
      </Section>
      <Section title="Payment method">
        <ItemList label="Payment methods">
          <Item
            media={<Icon name="card" />}
            title="Card ending in 4242"
            description="Expires 08/2028"
            actions={
              <Button variant="outline" onClick={() => onAction("update-card")}>
                Update card
              </Button>
            }
          />
        </ItemList>
      </Section>
      <Section title="Invoices">
        <DataGrid
          label="Invoices"
          rows={sample.invoices}
          columns={invoiceColumns}
          getRowId={(i) => i.id}
          defaultSort={[{ column: "date", direction: "descending" }]}
          height="14rem"
          locale="en-US"
        />
      </Section>
    </>
  )
}

const memberColumns: DataGridColumn<Member>[] = [
  { id: "name", header: "Name", value: (m) => m.name, width: 180, hideable: false },
  { id: "email", header: "Email", value: (m) => m.email, width: 220 },
  { id: "role", header: "Role", value: (m) => m.role, options: ["Admin", "Member"], editable: true, width: 120 },
  { id: "active", header: "Last active", value: (m) => m.active, width: 120 },
]

function TeamTab() {
  const [members, setMembers] = useState(sample.members)
  const [selected, setSelected] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const chosen = members.filter((m) => selected.includes(m.id) && m.role !== "Owner")
  const who = chosen.length === 1 ? chosen[0]!.name : `${chosen.length} people`
  const [inviteOpen, setInviteOpen] = useState(false)
  return (
    <Section title="Team" description={`${members.length} people in ${sample.workspace}.`}>
      <div className="settings-team-actions">
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger data-variant="solid">
            <Icon name="plus" />
            Invite people
          </DialogTrigger>
          <DialogBackdrop />
          <DialogContent>
            <DialogTitle>Invite people</DialogTitle>
            <DialogDescription>They'll get an email with a link to join.</DialogDescription>
            <form
              className="settings-form"
              aria-label="Invite people"
              onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                const email = String(data.get("invite-email")).trim()
                if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
                  setInviteError(`${email} is already on the team.`)
                  return
                }
                setMembers((all) => [
                  ...all,
                  {
                    id: crypto.randomUUID(),
                    name: email.split("@")[0]!,
                    email,
                    role: String(data.get("invite-role")) as Member["role"],
                    active: "Invited",
                  },
                ])
                setInviteOpen(false)
                toast(`Invited ${email}`)
              }}
            >
              <Field name="invite-email" invalid={inviteError ? true : undefined}>
                <FieldLabel>Email address</FieldLabel>
                <Input type="email" required {...inputHints("email")} onValueChange={() => setInviteError(null)} />
                {inviteError && <FieldError match>{inviteError}</FieldError>}
                <FieldError match="valueMissing">Enter an email address.</FieldError>
                <FieldError match="typeMismatch">Enter an email address like grace@example.com.</FieldError>
              </Field>
              <Field name="invite-role">
                <Select defaultValue="Member" name="invite-role">
                  <SelectLabel>Role</SelectLabel>
                  <SelectTrigger />
                  <SelectContent>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="settings-actions">
                <DialogClose>Cancel invite</DialogClose>
                <Button type="submit">Send invite</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* Check people in the first column, then remove them; the owner always stays. */}
      <div ref={gridRef}>
      <DataGrid
        label="Team members"
        rows={members}
        columns={memberColumns}
        getRowId={(m) => m.id}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        height="16rem"
        locale="en-US"
        onCellEdit={({ rowId, value }) => {
          if (members.find((m) => m.id === rowId)?.role === "Owner") {
            toast("The owner's role can't change. Make someone else owner first.")
            return false
          }
          setMembers((all) => all.map((m) => (m.id === rowId ? { ...m, role: value as Member["role"] } : m)))
          toast("Role changed")
        }}
      >
        <DataGridSelection>
          <Button variant="outline" disabled={!chosen.length} onClick={() => setConfirming(true)}>
            Remove from team
          </Button>
        </DataGridSelection>
      </DataGrid>
      </div>
      {/* Outside the selection bar, which goes away with the selection; focus returns to the grid. */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogBackdrop />
            <AlertDialogContent
              finalFocus={() =>
                gridRef.current?.querySelector<HTMLElement>('[role=grid] [tabindex="0"]') ?? undefined
              }
            >
              <AlertDialogTitle>Remove {who} from the team?</AlertDialogTitle>
              <AlertDialogDescription>
                They lose access right away. You can invite them again later.
              </AlertDialogDescription>
              <div className="settings-actions">
                <AlertDialogClose>Keep them</AlertDialogClose>
                <AlertDialogClose
                  data-variant="solid"
                  data-agent-confirm={`Removes ${who} from the team`}
                  onClick={() => {
                    const gone = new Set(chosen.map((m) => m.id))
                    setMembers((all) => all.filter((m) => !gone.has(m.id)))
                    setSelected([])
                    toast(`Removed ${who}`)
                  }}
                >
                  Remove {who}
                </AlertDialogClose>
              </div>
            </AlertDialogContent>
      </AlertDialog>
    </Section>
  )
}

function WorkspaceTab({ workspace }: { workspace: string }) {
  const [typed, setTyped] = useState("")
  const form = useSave("workspace", "Workspace name saved")
  return (
    <>
      <Section title="Workspace" description="The name your team and invoices show.">
        <form className="settings-form" onSubmit={form.onSubmit} aria-label="Workspace name">
          <Field name="workspace-name">
            <FieldLabel>Workspace name</FieldLabel>
            <Input required defaultValue={workspace} autoComplete="organization" />
            <FieldError match="valueMissing">Name the workspace.</FieldError>
          </Field>
          <div className="settings-actions">
            <Button type="submit" aria-disabled={form.saving || undefined}>
              {form.saving ? "Saving…" : "Save workspace name"}
            </Button>
          </div>
        </form>
      </Section>
      <Section title="Danger zone" description="This can't be undone.">
        <div className="settings-danger">
          <div>
            <strong>Delete {workspace}</strong>
            <p className="settings-muted">Every project, member and invoice goes with it.</p>
          </div>
          <AlertDialog onOpenChange={(open: boolean) => !open && setTyped("")}>
            <AlertDialogTrigger data-variant="destructive">Delete workspace</AlertDialogTrigger>
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogTitle>Delete {workspace}?</AlertDialogTitle>
              <AlertDialogDescription>
                Type the workspace name to confirm. Everything in it is deleted for good.
              </AlertDialogDescription>
              <Field>
                <FieldLabel>Workspace name to confirm</FieldLabel>
                <Input value={typed} onValueChange={(value: string) => setTyped(value)} autoComplete="off" />
              </Field>
              <div className="settings-actions">
                <AlertDialogClose>Keep the workspace</AlertDialogClose>
                <AlertDialogClose
                  data-variant="destructive"
                  disabled={typed !== workspace}
                  data-agent-confirm={`Deletes ${workspace} and everything in it`}
                  onClick={() => toast(`${workspace} is scheduled for deletion`)}
                >
                  Delete forever
                </AlertDialogClose>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>
    </>
  )
}

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "billing", label: "Billing" },
  { id: "team", label: "Team" },
  { id: "workspace", label: "Workspace" },
] as const

function SettingsTemplate({
  brand = sample.workspace,
  contentElement = "main",
  defaultTab = "profile",
  onSave,
  onAction,
}: {
  brand?: ReactNode
  contentElement?: "main" | "div"
  defaultTab?: (typeof tabs)[number]["id"]
  /** Saves a form; reject to show "Couldn't save". */
  onSave?: SettingsHandlers["onSave"]
  /** Buttons that leave the page: change photo, change plan, add seats, update card. */
  onAction?: SettingsHandlers["onAction"]
}) {
  const fallback = use(Handlers)
  return (
    <Handlers value={{ onSave: onSave ?? fallback.onSave, onAction: onAction ?? fallback.onAction }}>
    <AppShell
      label="Settings navigation"
      brand={<span className="template-brand">{brand}</span>}
      contentElement={contentElement}
      sidebar={
        <SidebarNav label="Settings sections">
          <SidebarGroup title="Store">
            <SidebarItem href="#overview" icon={<Icon name="home" />}>
              Overview
            </SidebarItem>
            <SidebarItem href="#orders" icon={<Icon name="orders" />}>
              Orders
            </SidebarItem>
          </SidebarGroup>
          <SidebarGroup title="Account">
            <SidebarItem href="#settings" current icon={<Icon name="settings" />}>
              Settings
            </SidebarItem>
          </SidebarGroup>
        </SidebarNav>
      }
    >
      <div className="settings">
        <PageHeader title="Settings" description="Your account, your team and how you pay." />
        <Tabs defaultValue={defaultTab}>
          <ScrollBox axis="x" data-frame="none" className="settings-tabs-frame" viewport={{ className: "settings-tabs-scroller", role: "group", "aria-label": "Tabs" }}>
            <TabsList aria-label="Settings sections" className="settings-tabs">
              {tabs.map((t) => (
                <TabsTab key={t.id} value={t.id}>
                  {t.label}
                </TabsTab>
              ))}
            </TabsList>
          </ScrollBox>
          {/* Kept mounted, so a removed member, an unsaved draft or a sign-out survives a tab switch. */}
          <TabsPanel value="profile" keepMounted>
            <ProfileTab />
          </TabsPanel>
          <TabsPanel value="security" keepMounted>
            <SecurityTab />
          </TabsPanel>
          <TabsPanel value="notifications" keepMounted>
            <NotificationsTab />
          </TabsPanel>
          <TabsPanel value="billing" keepMounted>
            <BillingTab />
          </TabsPanel>
          <TabsPanel value="team" keepMounted>
            <TeamTab />
          </TabsPanel>
          <TabsPanel value="workspace" keepMounted>
            <WorkspaceTab workspace={sample.workspace} />
          </TabsPanel>
        </Tabs>
      </div>
    </AppShell>
    </Handlers>
  )
}

export { SettingsTemplate }
export type { SettingsAction, SettingsSection }
