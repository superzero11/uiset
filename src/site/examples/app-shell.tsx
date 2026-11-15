import {
  AppShell,
  SidebarGroup,
  SidebarItem,
  SidebarNav,
} from "@/registry/uiset/ui/app-shell"
import { Badge } from "@/registry/uiset/ui/badge"
import { Breadcrumbs } from "@/registry/uiset/ui/breadcrumbs"
import { Button } from "@/registry/uiset/ui/button"
import { PageHeader } from "@/registry/uiset/ui/page-header"
import { SearchField } from "@/registry/uiset/ui/search-field"
import { Icon } from "@/registry/uiset/ui/shell/icons"
import { Stat } from "@/registry/uiset/ui/stat"

export default function AppShellExample() {
  return (
    <div className="shell-demo">
      <AppShell
        contentElement="div"
        label="Demo navigation"
        narrowBelow="30rem"
        brand={<span>Acme Cloud</span>}
        sidebar={
          <SidebarNav label="Demo sections">
            <SidebarGroup title="Workspace">
              <SidebarItem href="#overview" current icon={<Icon name="home" />}>
                Overview
              </SidebarItem>
              <SidebarItem href="#projects" icon={<Icon name="folder" />}>
                Projects
              </SidebarItem>
              <SidebarItem
                href="#deploys"
                icon={<Icon name="branch" />}
                badge={<Badge tone="info">3</Badge>}
              >
                Deployments
              </SidebarItem>
            </SidebarGroup>
            <SidebarGroup title="Account">
              <SidebarItem href="#settings" icon={<Icon name="settings" />}>
                Settings
              </SidebarItem>
            </SidebarGroup>
          </SidebarNav>
        }
        header={
          <>
            <Breadcrumbs
              label="Demo location"
              items={[
                { label: "Acme", href: "#acme" },
                { label: "Atlas", href: "#atlas" },
                { label: "Overview" },
              ]}
            />
            <div className="shell-demo-search">
              <SearchField
                label="Search projects"
                shortcut={null}
                placeholder="Search…"
              />
            </div>
          </>
        }
      >
        <PageHeader
          level={2}
          title="Atlas"
          description="Production, Europe. Last deployed 4 minutes ago."
          actions={<Button>Deploy</Button>}
        />
        <div className="shell-demo-stats">
          <Stat
            label="Requests"
            value="1.2M"
            change={{ value: "12%", direction: "up", period: "vs last week" }}
          />
          <Stat
            label="Errors"
            value="0.4%"
            change={{
              value: "0.1%",
              direction: "up",
              good: false,
              period: "vs last week",
            }}
          />
          <Stat
            label="p95 latency"
            value="182 ms"
            change={{ value: "9 ms", direction: "down", good: true }}
          />
        </div>
      </AppShell>
    </div>
  )
}
