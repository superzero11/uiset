import { lazy, type ComponentType, type LazyExoticComponent } from "react"

// The library's live demos, each its own chunk: a kit's or template's page loads its one, and
// a Library tab loads the ones on its cards.

type Demo = LazyExoticComponent<ComponentType>
const from = <M,>(load: () => Promise<M>, pick: (m: M) => ComponentType): Demo => lazy(() => load().then((m) => ({ default: pick(m) })))

const kitDemos: Record<string, Demo> = {
  "app-shell": from(() => import("./examples/app-shell"), (m) => m.default),
  forms: from(() => import("./examples/schema-form"), (m) => m.default),
  chat: from(() => import("./chat-demo"), (m) => m.ChatDemo),
  "rich-text": from(() => import("./editor-demo"), (m) => m.EditorDemo),
  "data-grid": from(() => import("./grid-demo"), (m) => m.GridDemo),
  charts: from(() => import("./charts-demo"), (m) => m.ChartsDemo),
  board: from(() => import("./board-demo"), (m) => m.BoardDemo),
  scheduler: from(() => import("./scheduler-demo"), (m) => m.SchedulerDemo),
  canvas: from(() => import("./canvas-demo"), (m) => m.CanvasDemo),
  ide: from(() => import("@/registry/uiset/ui/templates/ide-app"), (m) => () => <m.IdeTemplate />),
  mobile: from(() => import("./mobile-demo"), (m) => m.MobileDemo),
  terminal: from(() => import("./terminal-demo"), (m) => m.TerminalDemo),
  studio: from(() => import("./studio-kit"), (m) => m.StudioKit),
  "agent-console": from(() => import("./console-kit"), (m) => m.ConsoleKit),
}

const templateDemos: Record<string, Demo> = {
  auth: from(() => import("./templates/auth-demo"), (m) => m.AuthDemo),
  dashboard: from(() => import("@/registry/uiset/ui/templates/dashboard"), (m) => () => <m.DashboardTemplate contentElement="div" />),
  settings: from(() => import("@/registry/uiset/ui/templates/settings"), (m) => () => <m.SettingsTemplate contentElement="div" />),
  admin: from(() => import("@/registry/uiset/ui/templates/admin"), (m) => () => <m.AdminTemplate contentElement="div" />),
  inbox: from(() => import("@/registry/uiset/ui/templates/inbox"), (m) => () => <m.InboxTemplate contentElement="div" />),
  "chat-app": from(() => import("@/registry/uiset/ui/templates/chat-app"), (m) => m.ChatAppTemplate),
  "project-board": from(() => import("@/registry/uiset/ui/templates/project-board"), (m) => () => <m.ProjectBoardTemplate contentElement="div" />),
  "calendar-app": from(() => import("@/registry/uiset/ui/templates/calendar-app"), (m) => () => <m.CalendarAppTemplate contentElement="div" />),
  pricing: from(() => import("@/registry/uiset/ui/templates/pricing"), (m) => m.PricingTemplate),
  "ide-app": from(() => import("@/registry/uiset/ui/templates/ide-app"), (m) => () => <m.IdeTemplate />),
}

export { kitDemos, templateDemos }
