# Templates: design plan

Step 5 of the owner's plan. A template is a whole page built only from UISet items, so
a developer starts from a working screen instead of a blank one, and every piece of it
stays the same component they'd use by hand. Install one, render it, replace the
sample data with yours.

## The set (complete-set rule)

What a product team ships before anything domain-specific:

| Template      | Screens                                                                        | Built from                                                     |
| ------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `auth`        | Sign in, sign up, forgot password, reset password, verify code, and a layout  | Field, Input, PasswordInput, OtpInput, Checkbox, Button, Card, Alert |
| `dashboard`   | KPI row with trends, filter row (date range, segment), charts, recent activity | AppShell, Stat, LineChart, BarChart, SegmentedBar, DataGrid, Select, SegmentedControl |
| `settings`    | Profile, account and security, notifications, billing with usage, team, danger zone | AppShell, Tabs, Field, Switch, Meter, DataGrid, Dialog, AlertDialog, Toast |
| `admin`       | A records list with create, edit in a drawer, bulk actions and confirmed delete | DataGrid, Drawer, Field, Select, AlertDialog, Toast, EmptyState |
| `inbox`       | Folders, a message list, a reading pane, compose                               | AppShell, Listbox, Badge, Dialog, Textarea, TokenInput, Toast  |
| `chat-app`    | The chat kit as a full page: chats, thread, composer                           | Chat kit                                                       |
| `pricing`     | A landing section: plans with a monthly/yearly switch, comparison, FAQ         | SegmentedControl, Card, Accordion, Badge                       |
| `project-board` | A project's issues as a board or a list: sprint progress, filters, details, new issue | AppShell, PageHeader, Meter, Board kit, DataGrid, SegmentedControl, Dialog, Toast |
| `calendar-app` | Day, week and month views, a small month to jump, calendars to show or hide, what's next | AppShell, Scheduler kit, Calendar, Checkbox, Tooltip, Toast |

The project board and the calendar came with the Board and Scheduler kits (step 6).

## Rules for every template

- **Only UISet items.** No new behavior lives in a template; if a page needs one, it
  becomes an item first.
- **Sample data in one place** at the top of the file, typed, so replacing it is one
  edit. Handlers are props (`onSignIn`, `onSave`, `onDelete`) with sample defaults.
- **Responsive** down to 360px, with the shell's drawer below 48rem.
- **Agent-operable:** every control has a specific name (no two "Save" buttons on one
  page), destructive actions carry `data-agent-confirm`, secrets carry
  `data-agent-secret`.
- **Forms** validate on submit with UI SDK's Field errors, keep what was typed, and
  focus the first problem. Auth fields carry the right `autocomplete` (`inputHints`).
- **Every skin and theme** passes axe; each template has a keyboard-only e2e path.
- Templates are client components whose data arrives as props, so a Server Component
  (or a loader) can fetch it and pass it in.

## Delivery

Each template is a registry block whose files install under `components/ui/templates/`,
importing UISet items relatively, like every other item. The site shows each one live
at `/templates`, in the chosen skin, with its install command.

## Use

```bash
npx shadcn@latest add @uiset/dashboard
```

Each template installs to `components/ui/templates/<name>.tsx` with every item it uses.
Render it, then replace its sample data:

| Template    | Render                                     | Plug in                                                          |
| ----------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `auth`      | `<SignInForm onSignIn={…} />` and the other four forms | Each handler returns nothing on success or a message to show |
| `dashboard` | `<DashboardTemplate orders={…} now={new Date()} />` | Every figure, chart and row comes from `orders`; ranges end at `now` |
| `settings`  | `<SettingsTemplate onSave={(section, data) => …} onAction={…} />` | Each form's `FormData` by section; `onAction` for change plan, add seats, update card, change photo |
| `admin`     | `<AdminTemplate defaultCustomers={…} onSave={…} onDelete={…} />` | Reject to keep the drawer open with a message |
| `inbox`     | `<InboxTemplate defaultMessages={…} now={new Date()} onSend={…} onMove={…} />` | Sending and folder moves go to your mail API |
| `chat-app`  | `<ChatAppTemplate assistant={…} commands={…} mentions={…} />` | An async generator of `text`, `reasoning`, `tool`, `sources`, `checkpoint` and `subagent` events |
| `pricing`   | `<PricingTemplate plans={…} lede={…} />`   | Plans, comparison rows and questions are props; "save n%" comes from the plans |
| `project-board` | `<ProjectBoardTemplate defaultCards={…} defaultLanes={…} columns={…} people={…} labels={…} onMove={…} onSave={…} />` | Both views share the cards and lanes; the last column counts as done; `onCreate` and `onDelete` too |
| `calendar-app` | `<CalendarAppTemplate defaultEvents={…} calendars={…} today={…} now={new Date()} onSave={…} onDelete={…} />` | Each event names its calendar, and the calendar's chart slot is its color; times are minutes in `timeZone` |

- Mount `<Toaster />` (from `toast`) once in your app; templates call `toast()`.
- Inside a page that already has a `<main>`, pass `contentElement="div"`.
- **Cascade layers:** UISet's styles live in layers, so any unlayered CSS in your app
  wins over them. A global `a { color: … }` would recolor a button rendered as a link;
  scope such rules to plain links, like `a:not([data-slot])`.

### Connecting a model to `chat-app`

```tsx
async function* assistant({ text, history, signal }: AssistantInput) {
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ text, history }),
    signal,
  })
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    yield { type: "text", delta: value } as const
  }
}
```

With the AI SDK's UI stream, map its parts the same way: text deltas to `text`, reasoning
to `reasoning`, tool calls and results to `tool` (same `id` updates the card), and source
parts to `sources`.

An agent waits for a person the same way the sample does: yield the call with
`status: "approval"`, then `await approval(id)`; Allow resolves `true`, Deny or Stop
`false`. Yield a `checkpoint` before it changes things, and a `subagent` for work it hands
off, again as that work changes.

```ts
yield { type: "tool", id: "deploy", name: "deploy_preview", status: "approval", input }
if (await approval("deploy")) yield { type: "tool", id: "deploy", name: "deploy_preview", status: "running", input }
else yield { type: "tool", id: "deploy", name: "deploy_preview", status: "denied", input }
```

## Checked

Every template passes axe in Base (light and dark), Blueprint and Studio, fits a 375px
phone without sideways scrolling, and has a keyboard path in the e2e suite. Agents drive
them by the names people see: the dashboard's date range, the customers grid, the inbox
list, the issue board, the calendar.

- **Project board:** the board stays mounted while the list shows, so the card dialog
  moves cards through it from either view and column limits hold. Each move offers Undo
  for that card alone.
- **Calendar:** `EventDialog` has no calendar field, so a new event goes on the first
  calendar that's shown. While the sidebar shows, its New event is the page's one; the
  toolbar's takes over once the sidebar moves into the drawer, so no two buttons share a
  name.
