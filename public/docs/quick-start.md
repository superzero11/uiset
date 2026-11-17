# Quick start

Build a project settings screen: a form that saves with a toast, inside the app frame, in
any skin. It takes a few minutes and shows the whole workflow.

## 1. Install what the screen uses

```bash
npx shadcn@latest add @uiset/uiset @uiset/app-shell @uiset/page-header @uiset/field @uiset/select @uiset/switch @uiset/button @uiset/toast
```

## 2. Write the screen

```tsx
import { useState } from "react"
import { AppShell, SidebarGroup, SidebarItem, SidebarNav } from "@/components/ui/app-shell"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, Input } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/page-header"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Toaster, toast } from "@/components/ui/toast"
import { UISet } from "@/components/ui/uiset"

export function Settings() {
  const [name, setName] = useState("Atlas")
  return (
    <UISet skin="base">
      <AppShell
        brand={<a href="/">Acme</a>}
        sidebar={
          <SidebarNav label="Main">
            <SidebarGroup title="Project">
              <SidebarItem href="/settings" current>Settings</SidebarItem>
            </SidebarGroup>
          </SidebarNav>
        }
      >
        <PageHeader title="Settings" description="Name, region and deploys for this project." />
        <form
          onSubmit={(event) => {
            event.preventDefault()
            toast("Settings saved", { description: `${name} is up to date.` })
          }}
        >
          <Field>
            <FieldLabel>Project name</FieldLabel>
            <Input value={name} onValueChange={setName} />
          </Field>
          <Select name="region" defaultValue="eu">
            <SelectLabel>Region</SelectLabel>
            <SelectTrigger />
            <SelectContent>
              <SelectItem value="eu">Europe</SelectItem>
              <SelectItem value="us">North America</SelectItem>
            </SelectContent>
          </Select>
          <label>
            <Switch name="preview" defaultChecked /> Preview deployments
          </label>
          <Button type="submit">Save settings</Button>
        </form>
      </AppShell>
      <Toaster />
    </UISet>
  )
}
```

Everything you see is UI SDK's behavior with UISet's look: the select opens with the
keyboard and types ahead, the switch toggles with Space, the toast is announced, and focus
always shows.

## 3. Try another skin

Change `skin="base"` to `"blueprint"`, `"studio"`, `"phosphor"` or `"ink"`. Nothing else
changes. (Load the skin's [fonts](./installation.md#fonts) for the intended look.)

## 4. Let an agent use it

Every control above has a name, so UI SDK's agent bridge can see and use the form:

```ts
import { createAgent } from "@ui-sdk/react/agent"

const agent = createAgent()
agent.snapshot() // Project name, Region, Preview deployments, Save settings…
await agent.act({ steps: [{ ref: "Region", action: "setValue", args: ["North America"] }] })
```

See [Building with AI agents](./ai.md) for approvals, undo and the Agent Console.

## 5. Add a kit

```bash
npx shadcn@latest add @uiset/data-grid
```

Then follow the [data grid](/docs/kits/data-grid) page. Or skip ahead: the
[settings template](/templates?template=settings) is a finished version of this screen.
