// A small, realistic screen in the generated skin: settings, a table, charts, alerts and a
// dialog. Rendered the way an app would use the skin: <UISet skin="…" theme="…">, with the
// skin's CSS on the page.
import { Alert } from "@/registry/uiset/ui/alert"
import { Badge, type BadgeTone } from "@/registry/uiset/ui/badge"
import { BarChart } from "@/registry/uiset/ui/bar-chart"
import { Button } from "@/registry/uiset/ui/button"
import { DataGrid, type DataGridColumn } from "@/registry/uiset/ui/data-grid"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/registry/uiset/ui/dialog"
import { Field, FieldDescription, FieldLabel, Input } from "@/registry/uiset/ui/field"
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/registry/uiset/ui/popover"
import { SegmentedBar } from "@/registry/uiset/ui/segmented-bar"
import { SegmentedControl, SegmentedControlItem } from "@/registry/uiset/ui/segmented-control"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "@/registry/uiset/ui/select"
import { Switch } from "@/registry/uiset/ui/switch"
import { UISet } from "@/registry/uiset/ui/uiset"

type Deployment = { id: string; branch: string; status: "Ready" | "Building" | "Queued" | "Failed" }

const deployments: Deployment[] = [
  { id: "dpl-4821", branch: "main", status: "Ready" },
  { id: "dpl-4820", branch: "pricing-page", status: "Building" },
  { id: "dpl-4819", branch: "fix-auth-redirect", status: "Failed" },
  { id: "dpl-4818", branch: "docs-search", status: "Queued" },
]

const statusTone: Record<Deployment["status"], BadgeTone> = { Ready: "success", Building: "info", Queued: "neutral", Failed: "danger" }

const columns: DataGridColumn<Deployment>[] = [
  { id: "id", header: "Build", value: (d) => d.id, width: 92 },
  { id: "branch", header: "Branch", value: (d) => d.branch, width: 132 },
  { id: "status", header: "Status", value: (d) => d.status, width: 96, render: (d) => <Badge tone={statusTone[d.status]}>{d.status}</Badge> },
]

const requests = ["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => ({
  day,
  web: [42, 51, 48, 63, 58][i]!,
  api: [30, 34, 41, 38, 46][i]!,
  edge: [12, 18, 15, 22, 27][i]!,
}))

const whole = new Intl.NumberFormat("en-US")

function Preview({ skin, scheme }: { skin: string; scheme: "light" | "dark" }) {
  const name = scheme === "light" ? "Light" : "Dark"
  return (
    <section className="generator-screen-frame" aria-label={`${name} preview`}>
      <p className="generator-screen-label">{name}</p>
      <UISet skin={skin} theme={scheme} className="generator-screen" data-agent-hidden="">
        <div className="generator-screen-bar">
          <span className="generator-screen-app">Northwind</span>
          <Badge tone="info">Pro plan</Badge>
          <Popover>
            <PopoverTrigger data-variant="outline">Share</PopoverTrigger>
            <PopoverContent className="generator-screen-popover">
              <PopoverTitle>Share Atlas</PopoverTitle>
              <PopoverDescription>Anyone in Northwind can open its deployments and logs.</PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>

        <div className="generator-screen-body">
          <div className="generator-screen-heading">
            <h3>Project settings</h3>
            <p>Atlas, production</p>
          </div>

          <form className="generator-screen-form" aria-label={`Project settings, ${name.toLowerCase()} preview`} onSubmit={(e) => e.preventDefault()}>
            <Field>
              <FieldLabel>Project name</FieldLabel>
              <Input defaultValue="Atlas" autoComplete="off" />
              <FieldDescription>Shown in every URL and log line.</FieldDescription>
            </Field>
            <div className="generator-screen-row">
              <div className="generator-screen-select">
                <Select defaultValue="fra">
                  <SelectLabel>Region</SelectLabel>
                  <SelectTrigger />
                  <SelectContent>
                    <SelectItem value="fra">Frankfurt</SelectItem>
                    <SelectItem value="iad">Washington</SelectItem>
                    <SelectItem value="sin">Singapore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field>
                <FieldLabel>Environment</FieldLabel>
                <SegmentedControl defaultValue="production">
                  <SegmentedControlItem value="production">Production</SegmentedControlItem>
                  <SegmentedControlItem value="preview">Preview</SegmentedControlItem>
                </SegmentedControl>
              </Field>
            </div>
            <Field className="generator-screen-switch">
              <FieldLabel>Deploy on push</FieldLabel>
              <Switch defaultChecked />
            </Field>
            <Field className="generator-screen-switch">
              <FieldLabel>Comments on previews</FieldLabel>
              <Switch />
            </Field>
            <div className="generator-screen-actions">
              <Button type="submit">Save changes</Button>
              <Button variant="outline" type="button">
                Cancel
              </Button>
              <AlertDialog>
                <AlertDialogTrigger data-variant="destructive" className="generator-screen-delete">
                  Delete project
                </AlertDialogTrigger>
                <AlertDialogBackdrop />
                <AlertDialogContent>
                  <AlertDialogTitle>Delete Atlas?</AlertDialogTitle>
                  <AlertDialogDescription>Its deployments, domains and logs go too. This can&rsquo;t be undone.</AlertDialogDescription>
                  <div className="generator-screen-actions">
                    <AlertDialogClose data-variant="outline">Keep it</AlertDialogClose>
                    <AlertDialogClose data-variant="destructive" value="confirm">
                      Delete project
                    </AlertDialogClose>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>

          <div className="generator-screen-alerts">
            <Alert tone="info">A new region, Sydney, is available.</Alert>
            <Alert tone="success">Deployed dpl-4821 to production.</Alert>
            <Alert tone="warning">The certificate for atlas.dev renews in 6 days.</Alert>
            <Alert tone="danger">Build failed on fix-auth-redirect.</Alert>
          </div>

          <DataGrid label={`Deployments, ${name.toLowerCase()} preview`} rows={deployments} columns={columns} getRowId={(d) => d.id} height="none" />

          <BarChart
            title="Requests"
            description="Thousands, this week"
            data={requests}
            x={(d) => d.day}
            series={[
              { key: "web", label: "Web", value: (d) => d.web },
              { key: "api", label: "API", value: (d) => d.api },
              { key: "edge", label: "Edge", value: (d) => d.edge },
            ]}
            format={(n) => whole.format(n)}
            height={180}
          />
          <SegmentedBar
            title="Traffic sources"
            description="Last 30 days"
            parts={[
              { key: "search", label: "Search", value: 189 },
              { key: "direct", label: "Direct", value: 104 },
              { key: "social", label: "Social", value: 61 },
              { key: "email", label: "Email", value: 38 },
              { key: "ads", label: "Ads", value: 27 },
              { key: "partners", label: "Partners", value: 20 },
            ]}
            format={(n) => `${n}k`}
          />
        </div>
      </UISet>
    </section>
  )
}

export { Preview }
