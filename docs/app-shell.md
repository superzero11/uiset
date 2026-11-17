# App frame and data display

The frame an app's pages sit in, and the small parts most pages show. `AppShell` is a
sidebar layout that collapses to icons with Mod+B, remembers that, and moves into a drawer
on narrow screens. Around it are a page header, breadcrumbs, cards, tables, badges, avatar
groups, figures, lists, alerts, loading states, a stepper, a search field, code blocks and a
copy button. Most are plain HTML in UISet's styles; the ones with behavior use UI SDK:
Drawer, Tooltip, Preferences and shortcuts for the shell, Input for search, `announce` for
copy, Scroll area for tables and code, and Tabs for code tabs.

```bash
npx shadcn@latest add @uiset/app-shell @uiset/breadcrumbs \
  @uiset/page-header @uiset/card @uiset/badge \
  @uiset/stat @uiset/empty-state @uiset/skeleton \
  @uiset/description-list @uiset/item-list @uiset/alert \
  @uiset/kbd @uiset/spinner @uiset/stepper \
  @uiset/search-field @uiset/copy-button @uiset/table \
  @uiset/avatar-group @uiset/code-block
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
| `Table` and its header, body, footer, rows, heads, cells and caption | `table` | A plain table that scrolls in its own region, keeps its headings and first column in view, and stacks on narrow screens |
| `CountBadge`                                          | `badge`            | A count on the corner of an icon button or avatar              |
| `AvatarGroup`                                         | `avatar-group`     | Avatars overlapping in a row, with a count of the rest         |
| `CodeBlock`, `CodeTabs`, `PackageCommand`             | `code-block`       | Code in its language's colors with copy; tabs of versions; one command per package manager |

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
- `CountBadge` wraps a button or an avatar and takes `count`, `max` (99: above it the
  badge reads "99+"), `showZero` and `dot`, a dot with no number. It shows nothing at zero.
  People see the number; screen readers and agents don't read it, so say the count in the
  control's own name ("Notifications, 3 unread"). For something with no name to put it in,
  pass `label` ("5 new messages"), which is read after it.
- `AvatarGroup` takes `label`, which names the group, and avatars as children. `max` shows
  that many and then "+2", read as "2 more"; `moreLabel` changes those words. `total` is
  how many there are in all, when you render only the first few.

### Table

```tsx
<Table label="Invoices" stack stickyHeader maxHeight="20rem">
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Customer</TableHead>
      <TableHead align="end">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {invoices.map((invoice) => (
      <TableRow key={invoice.id}>
        <TableHead scope="row">{invoice.id}</TableHead>
        <TableCell>{invoice.customer}</TableCell>
        <TableCell align="end">{invoice.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

- `Table` is a real `<table>` inside a UI SDK scroll area. `label` is required and names
  the scrolling region. The region is a tab stop only while something in it scrolls, so
  keyboard users can scroll it and nobody tabs to a table that fits.
- `stickyHeader` keeps the headings in view while the body scrolls; give the table a
  `maxHeight`. `stickyColumn` keeps each row's first cell in view while the rest scrolls
  sideways, and `minWidth` is the narrowest the table gets before it does.
- With `stack`, below 30rem of its own width each row becomes a block, with every column's
  heading beside its value. The headings are copied from the header row; a `TableCell`'s
  `label` replaces one. The table keeps its roles there, so screen readers still read it
  as a table.
- `TableHead` is a column heading, or a row heading with `scope="row"`. It and `TableCell`
  take `align` (`start`, `center` or `end`). `TableCaption` shows under the table.
- Sticky cells paint `--table-background` (the page color) over the rows passing under
  them. Set it on the table when it sits on another surface, like a card.
- This is a table for reading. For sorting, filters, selection and editing, use the
  [data grid](./data-grid.md).

### Code

```tsx
<PackageCommand install="@uiset/web @ui-sdk/web" />

<CodeBlock code={source} language="tsx" title="app.tsx" lineNumbers highlight={[4]} />

<CodeTabs
  label="Framework"
  items={[
    { value: "react", label: "React", language: "tsx", code: reactSource },
    { value: "web", label: "Web Components", language: "html", code: htmlSource },
  ]}
/>
```

- `CodeBlock` takes `code`, `language` (a shiki language, like `tsx` or `bash`; leave it
  out for plain text) and `title`, shown above the code with the Copy button. `lineNumbers`
  numbers the lines and `highlight` marks some, counted from 1. Neither is part of the text
  that's selected or copied. `wrap` wraps long lines, `maxHeight` makes tall code scroll,
  and `copy={false}` leaves the button out.
- Colors come from shiki, loaded the first time a block needs it; the code shows plain
  until then. Each skin sets the colors, and they hold 4.5:1 in every one.
- `CodeTabs` takes a `label` for its row of tabs and `items` (`{ value, label, code,
  language }`), with `value` and `onValueChange` or `defaultValue`. Copy copies the tab
  that shows.
- `PackageCommand` takes `install` (packages to add, with `dev` for a dev dependency) or
  `run` (a package's command), and writes it for npm, pnpm, yarn and bun. The tab someone
  picks is picked in every `PackageCommand` on the page and saved in `localStorage` under
  `uiset-package-manager`. `packageCommands()` returns the same four as `CodeTabs` items.
- Code that runs wide scrolls inside its box, which is then a tab stop.

## Keys

| Keys                     | Where        | Does                                                       |
| ------------------------ | ------------ | ---------------------------------------------------------- |
| Mod+B                    | anywhere     | Collapse the sidebar to icons, or expand it (wide screens only) |
| "/" (the `shortcut`)     | anywhere     | Focus the search field, except while typing in another field |
| Escape                   | drawer       | Close the navigation drawer                                |
| Tab, Enter, Space        | stepper      | Each step is a button; locked steps are skipped            |
| Left, Right, Home, End   | code tabs    | Move between the tabs, which shows that tab's code         |
| Arrows, Page Up, Page Down | a table or code that scrolls | Scroll it, once focus is on it            |

The sidebar toggle and the search field carry `aria-keyshortcuts` for their keys.

## For agents

Most of these parts are plain HTML, so the bridge doesn't list them: Breadcrumbs,
PageHeader, Card, Badge, CountBadge, Stat, EmptyState, Skeleton, Loading, DescriptionList,
ItemList, Kbd and Spinner. The buttons, links and fields you put in them are listed, by their own
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
- **Table:** listed as a scroll area named by `label`, with no actions. Its cells aren't
  listed; buttons and links you put in them are, by their own names.
- **AvatarGroup:** each avatar is listed by its name, and the count as "2 more".
- **Code:** `CodeBlock`'s Copy is a button named "Copy" and its title ("Copy app.tsx").
  `CodeTabs` is a tabs component named by `label`, with `setValue` and its tabs as items,
  so `PackageCommand` is "Package manager" with npm, pnpm, yarn and bun.

None of these parts asks for confirmation. Put `data-agent-confirm` on destructive
actions you pass in, as on a Delete in a page header.

## Web Components

`<uiset-app-shell>`, `<uiset-page-header>` and `<uiset-empty-state>` are in
[App Shell](./web-components.md#app-shell). `<uiset-search-field>`, `<uiset-copy-button>`
and `<uiset-stepper>` are in [React and the web](./web-components.md#react-and-the-web)
(there, `shortcut=""` turns the key off), and `<uiset-stat>` is with
[Charts](./web-components.md#charts). Badge, alert, card, item and description lists,
breadcrumbs, skeleton, spinner and kbd are classes in `uiset.css`. Table, avatar group,
count badge and code block don't have web versions yet.
