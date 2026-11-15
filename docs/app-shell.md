# App frame and data display

The frame an app's pages sit in, and the small parts most pages show. `AppShell` is a
sidebar layout that collapses to icons with Mod+B, remembers that, and moves into a drawer
on narrow screens. Around it are a page header, breadcrumbs, cards, badges, figures, lists,
alerts, loading states, a stepper, a search field and a copy button. Most are plain HTML in
UISet's styles; the ones with behavior use UI SDK: Drawer, Tooltip, Preferences and
shortcuts for the shell, Input for search, and `announce` for copy.

```bash
npx shadcn@latest add superzero11/uiset/app-shell superzero11/uiset/breadcrumbs \
  superzero11/uiset/page-header superzero11/uiset/card superzero11/uiset/badge \
  superzero11/uiset/stat superzero11/uiset/empty-state superzero11/uiset/skeleton \
  superzero11/uiset/description-list superzero11/uiset/item-list superzero11/uiset/alert \
  superzero11/uiset/kbd superzero11/uiset/spinner superzero11/uiset/stepper \
  superzero11/uiset/search-field superzero11/uiset/copy-button
```

Each is its own item, so add only the ones you use. They share `shell/shell.css`, and the
ones with icons bring `shell/icons.tsx`.

## Parts

| Part                                                  | Item               | What it is                                                     |
| ----------------------------------------------------- | ------------------ | -------------------------------------------------------------- |
| `AppShell`                                            | `app-shell`        | Sidebar, header and content; icons only with Mod+B; a drawer on narrow screens |
| `SidebarNav`, `SidebarGroup`, `SidebarItem`           | `app-shell`        | The sidebar's links, in titled groups, with icons and badges    |
| `Breadcrumbs`                                         | `breadcrumbs`      | Where you are, the last item marked as the current page        |
| `PageHeader`                                          | `page-header`      | The page's heading, a description and actions                  |
| `Card` and its header, title, description, content and footer | `card`     | A bordered block                                                |
| `Badge`                                               | `badge`            | A short status label in five tones                             |
| `Stat`                                                | `stat`             | A figure with its change in words and color, and an optional trend |
| `EmptyState`                                          | `empty-state`      | What to do when there's nothing here yet                       |
| `Skeleton`, `SkeletonText`, `Loading`                 | `skeleton`         | Placeholder shapes, and a region that says "Loading…" once     |
| `DescriptionList`                                     | `description-list` | Terms and their details                                        |
| `ItemList`, `Item`                                    | `item-list`        | Rows with media, a title, a description, meta and actions      |
| `Alert`                                               | `alert`            | An inline message in four tones that names its tone            |
| `Kbd`                                                 | `kbd`              | Keys the way this platform writes them: ⌘K or Ctrl+K           |
| `Spinner`                                             | `spinner`          | A loading indicator that says what's loading                   |
| `Stepper`                                             | `stepper`          | The steps of a flow, the current one marked, later ones locked |
| `SearchField`                                         | `search-field`     | A search box with Clear and a key that focuses it from anywhere |
| `CopyButton`                                          | `copy-button`      | Copies a value, then says Copied                               |

## Use

```tsx
import { Icon } from "@/components/ui/shell/icons"

<AppShell
  brand={<a href="/">Acme</a>}
  sidebar={
    <SidebarNav label="Main">
      <SidebarGroup title="Workspace">
        <SidebarItem href="/" icon={<Icon name="home" />} current>Overview</SidebarItem>
        <SidebarItem href="/deploys" icon={<Icon name="branch" />}>Deployments</SidebarItem>
      </SidebarGroup>
    </SidebarNav>
  }
  header={<SearchField label="Search projects" placeholder="Search…" />}
>
  <PageHeader
    above={<Breadcrumbs items={[{ label: "Projects", href: "/" }, { label: "Atlas" }]} />}
    title="Atlas"
    description="Production, Europe. Last deployed 4 minutes ago."
    actions={<Button>Deploy</Button>}
  />
  <Stat
    label="Errors"
    value="0.4%"
    change={{ value: "0.1%", direction: "up", good: false, period: "vs last week" }}
    trend={[0.2, 0.3, 0.3, 0.4]}
  />
  {deploys.length === 0 && (
    <EmptyState
      title="No deployments yet"
      description="Push to your main branch and the first one shows up here."
      actions={<Button>Connect a repository</Button>}
    />
  )}
</AppShell>
```

### The shell

- `sidebar` is required; `brand` sits above it and `header` across the top. `children` go
  in a `<main>`; pass `contentElement="div"` when your page already has one.
- `label` ("Navigation") names the sidebar, and titles the drawer when there's no `brand`.
- When the viewport is `narrowBelow` ("48rem") wide or less, the sidebar moves into a
  drawer opened by Open navigation in the header. On the server the shell renders the
  wide layout.
- Expanded or collapsed is saved in `localStorage` under `uiset-sidebar` with UI SDK's
  preferences, and shown as `data-sidebar` on a wrapper. Every shell on the same origin
  shares it, the web element included.
- `SidebarItem` takes `href`, `icon`, `current` (`aria-current="page"`), `badge` and its
  label as text. While the sidebar shows icons only, each link has a tooltip with its
  label. `SidebarGroup`'s `title` names its list; `SidebarNav`'s `label` defaults to
  "Sections".
- `--app-shell-height` (100dvh) sets the shell's height and `--app-shell-pad` the
  content's padding, so a full-bleed page can set it to 0.
- `Icon` takes a `name` from `shell/icon-paths.ts`: `home`, `users`, `orders`, `reports`,
  `settings`, `mail`, `inbox`, `folder`, `file`, `branch`, `star`, `bell` and more.

### Page parts

- `Breadcrumbs` takes `items` (`{ label, href? }`) and `label` ("Breadcrumb"). The last
  item is the current page (`aria-current="page"`) and is never a link.
- `PageHeader` takes `title`, `description`, `actions`, `above` (breadcrumbs, say) and
  `level`: 1 for an `h1` (the default) or 2.
- `Card`, `CardHeader`, `CardDescription`, `CardContent` and `CardFooter` take a `div`'s
  props (a `p`'s for the description). `CardTitle` takes `level` (2, 3 or 4; `h3` by
  default), `className` and `children` only.
- `EmptyState` takes `title`, `description`, `actions`, `icon` (a shell icon name,
  `inbox` by default, or `null`) and `level` (2, 3 or 4; `h2` by default).
- `Stepper` takes `steps` (`{ value, label, description? }`), `value`, `onValueChange`,
  `label` ("Progress") and `linear` (on). Steps before the current one show a check and
  read "(done)"; the current one has `aria-current="step"`; with `linear`, later steps
  are disabled. A `value` that isn't in `steps` marks the first one. The stepper doesn't
  move by itself: your Back and Continue set `value`.

### Data display

- `Badge` takes `tone` (`neutral` by default, `info`, `success`, `warning`, `danger`) and
  a `span`'s props. The tone is color only, so the words you pass carry the meaning.
- `Stat` takes `label`, `value` and `description`. `change` is `{ value, direction, good?,
  period? }`: an arrow plus "Up" or "Down" for screen readers. A rise shows as good and a
  fall as bad; `good` overrides that (`good: false` for errors going up). `trend` (numbers
  oldest first, `null` for a gap) draws a sparkline named for where the values went
  ("Errors trend: from 0.2 to 0.4, low 0.2, high 0.4"), and `format` formats them.
- `DescriptionList` takes `items` (`{ term, details }`) and `layout`: `"columns"` (the
  default) or `"stacked"`.
- `ItemList` takes a `label`, which names the list. Each `Item` takes `title` (a link with
  `href`), `media`, `description`, `meta` and `actions`.
- `Alert` takes `tone` (`info` by default, `success`, `warning`, `danger`), `title`, its
  text as children, `actions` and `onDismiss`, which adds Dismiss. Screen readers hear the
  tone before the title ("Warning: Card expires soon"); an alert with no `title` doesn't
  say it.
- An `Alert` is static by default. `live` makes it a polite `role="status"`; `urgent`
  makes it `role="alert"`, for a message that appears in response to something and must
  interrupt.
- `Kbd` takes `keys` in UI SDK's shortcut form (`"mod+k"`) and shows ⌘K on Apple devices
  and Ctrl+K elsewhere.
- `Spinner` takes `label` ("Loading"), read by screen readers as a status, and `size`
  ("1rem").
- `Skeleton` takes `width`, `height` ("1rem") and `radius`; `SkeletonText` takes `lines`
  (3), the last one shorter. Both are hidden from screen readers. Wrap what's loading in
  `Loading` (`loading`, `label` "Loading…"): it's `aria-busy` while loading and says the
  label once. With reduced motion, skeletons and spinners stop moving.
- `SearchField` takes UI SDK Input's props (`value`, `defaultValue`, `onValueChange`,
  `placeholder`, `name`) plus `label` ("Search") and `shortcut` ("/", or `null` for none).
  The key shows as a hint until there's text; then Clear empties the field and keeps
  focus there.
- `CopyButton` takes `value`, `label` ("Copy") and `copiedLabel` ("Copied"). It writes
  `value` to the clipboard, announces `copiedLabel`, and shows it with a check for 1.6
  seconds. If the clipboard refuses, nothing changes on screen.

## Keys

| Keys                     | Where        | Does                                                       |
| ------------------------ | ------------ | ---------------------------------------------------------- |
| Mod+B                    | anywhere     | Collapse the sidebar to icons, or expand it (wide screens only) |
| "/" (the `shortcut`)     | anywhere     | Focus the search field, except while typing in another field |
| Escape                   | drawer       | Close the navigation drawer                                |
| Tab, Enter, Space        | stepper      | Each step is a button; locked steps are skipped            |

The sidebar toggle and the search field carry `aria-keyshortcuts` for their keys.

## For agents

Most of these parts are plain HTML, so the bridge doesn't list them: Breadcrumbs,
PageHeader, Card, Badge, Stat, EmptyState, Skeleton, Loading, DescriptionList, ItemList,
Kbd and Spinner. The buttons, links and fields you put in them are listed, by their own
names. Inside an `Item`, a control carries the row's text ("Ada Lovelace ada@acme.dev
Owner"), so when two rows each have a Remove button, the bridge's error lists both with
their rows and the agent picks one by ref.

- **Shell:** the toggle is a button named "Collapse sidebar" or "Expand sidebar". On a
  narrow screen the drawer is "Open navigation", with `setOpen`. Each `SidebarItem` is a
  tooltip named by its link text, with `press` (follows the link) and `setOpen`. A
  `badge`'s text runs into that name with no space ("Deployments3").
- **SearchField:** one input named by `label`, with `setValue` and `clear`. Its Clear
  button is `data-agent-hidden`, so agents don't see a second control.
- **Stepper:** each step is a button named by its text, "Account (done)" for a done step.
  A description runs into the label ("DetailsName and region"). Locked steps are
  disabled and have no actions.
- **CopyButton:** a button named by its text, which reads `copiedLabel` for 1.6 seconds
  after a press.
- **Alert:** Dismiss is a button named "Dismiss"; with two dismissible alerts on a page, a
  step needs the ref.

None of these parts asks for confirmation. Put `data-agent-confirm` on destructive
actions you pass in, as on a Delete in a page header.

## Web Components

`<uiset-app-shell>`, `<uiset-page-header>` and `<uiset-empty-state>` are in
[App Shell](./web-components.md#app-shell). `<uiset-search-field>`, `<uiset-copy-button>`
and `<uiset-stepper>` are in [React and the web](./web-components.md#react-and-the-web)
(there, `shortcut=""` turns the key off), and `<uiset-stat>` is with
[Charts](./web-components.md#charts). Badge, alert, card, item and description lists,
breadcrumbs, skeleton, spinner and kbd are classes in `uiset.css`.
