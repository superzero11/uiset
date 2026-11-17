import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { DashboardTemplate } from "@/registry/uiset/ui/templates/dashboard"
import { IdeTemplate } from "@/registry/uiset/ui/templates/ide-app"
import { AdminTemplate } from "@/registry/uiset/ui/templates/admin"
import { CalendarAppTemplate } from "@/registry/uiset/ui/templates/calendar-app"
import { ChatAppTemplate } from "@/registry/uiset/ui/templates/chat-app"
import { InboxTemplate } from "@/registry/uiset/ui/templates/inbox"
import { PricingTemplate } from "@/registry/uiset/ui/templates/pricing"
import { ProjectBoardTemplate } from "@/registry/uiset/ui/templates/project-board"
import { SettingsTemplate } from "@/registry/uiset/ui/templates/settings"
import { Toaster } from "@/registry/uiset/ui/toast"
import { AuthDemo } from "../templates/auth-demo"
import { InstallCommand } from "../shell/code"
import { useSiteTheme } from "../shell/layout"
import { usePageMeta } from "../shell/meta"
import { SkinPicker, skinValues, useUrlState } from "../shell/skin-picker"

const templates = [
  { id: "auth", name: "Auth", what: "Sign in, sign up, forgot and reset password, verify a code" },
  {
    id: "dashboard",
    name: "Dashboard",
    what: "A date range that scopes everything: figures with trends, three charts, recent orders",
  },
  {
    id: "settings",
    name: "Settings",
    what: "Profile, security and sessions, notifications, billing with usage, team, danger zone",
  },
  {
    id: "admin",
    name: "Admin",
    what: "Records with search, filters and export; create and edit in a drawer; bulk delete",
  },
  { id: "inbox", name: "Inbox", what: "Folders, a message list you arrow through, the message, compose" },
  {
    id: "chat-app",
    name: "Chat app",
    what: "Chats, a thread and a composer; plug your model in as an async stream of events",
  },
  {
    id: "project-board",
    name: "Project board",
    what: "A sprint's progress and its issues as a board or a list, with filters, details and Undo",
  },
  {
    id: "calendar-app",
    name: "Calendar",
    what: "A day, a week or a month of events, a small month to jump around, calendars to show or hide",
  },
  { id: "pricing", name: "Pricing", what: "Plans with a monthly or yearly switch, a comparison, questions" },
  {
    id: "ide-app",
    name: "IDE",
    what: "Files with version control marks, tabs, a code editor, a command palette, problems and a status bar",
  },
] as const
type TemplateId = (typeof templates)[number]["id"]

function TemplatesPage() {
  const { theme } = useSiteTheme()
  const [skin, setSkin] = useUrlState<Skin>("skin", skinValues, "base")
  const [template, setTemplate] = useUrlState<TemplateId>("template", templates.map((t) => t.id), "auth")
  usePageMeta({
    title: "UI SDK page templates",
    description:
      "Ten whole pages built only from UISet items on Vercel's UI SDK: auth, dashboard, settings, admin, inbox, chat app, project board, calendar, pricing and an IDE. Install one with the shadcn CLI and swap in your data.",
    path: "/templates",
  })

  return (
    <div className="page">
      <header className="page-head">
        <h1>Templates</h1>
        <p>
          Whole pages built only from UISet items. Install one, render it, and swap the sample data for yours. Every control works from the keyboard and is named for agents.{" "}
          <a href="/docs/templates">How to use them</a>.
        </p>
        <div className="page-controls">
          <SkinPicker value={skin} onChange={setSkin} />
        </div>
      </header>
      <Tabs value={template} onValueChange={(v) => v && setTemplate(v as TemplateId)}>
        <TabsList aria-label="Templates" className="template-tabs">
          {templates.map((t) => (
            <TabsTab key={t.id} value={t.id}>
              {t.name}
            </TabsTab>
          ))}
        </TabsList>
        {templates.map((t) => (
          <TabsPanel key={t.id} value={t.id} className="template-panel">
            <p className="template-what">{t.what}</p>
            <InstallCommand items={[t.id]} label={`Install the ${t.name} template`} />
            <UISet skin={skin} theme={theme} className="template-frame components-surface">
              {t.id === "auth" && <AuthDemo />}
              {t.id === "dashboard" && <DashboardTemplate contentElement="div" />}
              {t.id === "settings" && <SettingsTemplate contentElement="div" />}
              {t.id === "admin" && <AdminTemplate contentElement="div" />}
              {t.id === "inbox" && <InboxTemplate contentElement="div" />}
              {t.id === "chat-app" && <ChatAppTemplate />}
              {t.id === "project-board" && <ProjectBoardTemplate contentElement="div" />}
              {t.id === "calendar-app" && <CalendarAppTemplate contentElement="div" />}
              {t.id === "pricing" && <PricingTemplate />}
              {t.id === "ide-app" && <IdeTemplate />}
            </UISet>
          </TabsPanel>
        ))}
      </Tabs>
      {/* Toasts take the template's skin, not the gallery's. */}
      <UISet skin={skin} theme={theme} className="template-toasts">
        <Toaster />
      </UISet>
    </div>
  )
}

export { templates }
export default TemplatesPage
