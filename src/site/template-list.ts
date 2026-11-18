// The page templates, in the library's order. Kept apart from library.ts (which reads the whole
// registry) so the router can list their pages.

const templates = [
  { id: "auth", name: "Auth", what: "Sign in, sign up, forgot and reset password, verify a code" },
  { id: "dashboard", name: "Dashboard", what: "A date range that scopes everything: figures with trends, three charts, recent orders" },
  { id: "settings", name: "Settings", what: "Profile, security and sessions, notifications, billing with usage, team, danger zone" },
  { id: "admin", name: "Admin", what: "Records with search, filters and export; create and edit in a drawer; bulk delete" },
  { id: "inbox", name: "Inbox", what: "Folders, a message list you arrow through, the message, compose" },
  { id: "chat-app", name: "Chat app", what: "Chats, a thread and a composer; plug your model in as an async stream of events" },
  { id: "project-board", name: "Project board", what: "A sprint's progress and its issues as a board or a list, with filters, details and Undo" },
  { id: "calendar-app", name: "Calendar", what: "A day, a week or a month of events, a small month to jump around, calendars to show or hide" },
  { id: "pricing", name: "Pricing", what: "Plans with a monthly or yearly switch, a comparison, questions" },
  { id: "ide-app", name: "IDE", what: "Files with version control marks, tabs, a code editor, a command palette, problems and a status bar" },
] as const
type TemplateId = (typeof templates)[number]["id"]

export { templates }
export type { TemplateId }
