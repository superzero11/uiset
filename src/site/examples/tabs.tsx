import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"

export default function TabsExample() {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Project sections">
        <TabsTab value="overview">Overview</TabsTab>
        <TabsTab value="deployments">Deployments</TabsTab>
        <TabsTab value="settings">Settings</TabsTab>
      </TabsList>
      <TabsPanel value="overview">Three services, all healthy.</TabsPanel>
      <TabsPanel value="deployments">Last deploy 4 minutes ago.</TabsPanel>
      <TabsPanel value="settings">Region: Europe.</TabsPanel>
    </Tabs>
  )
}
