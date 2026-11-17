// Writes registry.json from the manifest below.
//
//   node scripts/registry.mjs                 → registry.json, the GitHub source registry
//                                               (items depend on superzero11/uiset/<item>)
//   REGISTRY_URL=https://x node scripts/...   → registry.build.json whose items depend on
//                                               <REGISTRY_URL>/r/<item>.json, for `shadcn build`

import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const config = JSON.parse(readFileSync("uiset.config.json", "utf8"))
const [owner, repo] = new URL(config.repository).pathname.slice(1).split("/")
const base = process.env.REGISTRY_URL?.replace(/\/$/, "")
const sdk = JSON.parse(readFileSync("package.json", "utf8")).dependencies["@ui-sdk/react"]
const ui = "registry/uiset/ui"

const dependencyOn = (name) =>
  base ? `${base}/r/${name}.json` : `${owner}/${repo}/${name}`

function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? filesIn(path) : [path]
  })
}

const root = {
  name: "uiset",
  type: "registry:ui",
  title: "UISet",
  description:
    "The UISet root: skins, a key color, and sound and haptics for every UI SDK component inside it.",
  dependencies: [`@ui-sdk/core@${sdk}`, `@ui-sdk/react@${sdk}`],
  categories: ["theme"],
  docs: 'Wrap your app, or any part of it, in <UISet skin="base"> from @/components/ui/uiset. Pass keyColor={{ l: 0.5, c: 0.19, h: 268 }} for the accent, sound to turn interaction sounds on, and skin="blueprint", "studio", "phosphor" or "ink" for a themed skin (each names the faces it uses in the README). Every UI SDK component inside is styled by the skin.',
  files: [
    { path: `${ui}/uiset.tsx`, type: "registry:ui", target: "@ui/uiset.tsx" },
    ...filesIn(`${ui}/uiset`)
      .sort()
      .map((path) => ({
        path,
        type: "registry:file",
        target: `@ui/${path.slice(ui.length + 1)}`,
      })),
  ],
}

const installed = JSON.parse(readFileSync("package.json", "utf8")).dependencies
const pinned = (pkg) => `${pkg}@${installed[pkg]}`

const support = (path) => ({
  path: `${ui}/${path}`,
  type: "registry:file",
  target: `@ui/${path}`,
})

// [name, title, description, extra files under ui/, extra registry deps]
const components = [
  ["button", "Button", "A button in solid, outline and ghost variants."],
  ["switch", "Switch", "An on and off switch, with its thumb in place."],
  [
    "slider",
    "Slider",
    "A range slider whose track, fill and named thumbs render in one line.",
  ],
  [
    "segmented-control",
    "Segmented control",
    "One choice among a few, in a row with a moving indicator.",
  ],
  [
    "select",
    "Select",
    "Choose from a list in a popup; the trigger shows what's chosen.",
  ],
  ["field", "Field", "A label, control, description and error, connected for screen readers."],
  ["dialog", "Dialog", "A modal window for a focused task, closed by Escape or its close button."],
  ["tabs", "Tabs", "Panels that share one space, switched by a row of tabs."],
  ["accordion", "Accordion", "Sections that open one or many at a time."],
  [
    "alert-dialog",
    "Alert dialog",
    "A confirmation that interrupts, with agent confirmation built in.",
  ],
  ["autocomplete", "Autocomplete", "Free text with suggestions as you type."],
  ["avatar", "Avatar", "A person's image with initials as the fallback."],
  ["calendar", "Calendar", "A month grid for picking dates, ready to use as is."],
  ["carousel", "Carousel", "Slides with previous and next controls and keyboard paging."],
  ["checkbox", "Checkbox", "A checkbox with its check mark, and checkbox groups."],
  ["collapsible", "Collapsible", "One section that shows and hides."],
  [
    "color-picker",
    "Color picker",
    "Area, hue and alpha sliders, swatch and hex input, ready to use.",
  ],
  ["combobox", "Combobox", "Search a list and choose one or several."],
  ["command", "Command", "A searchable list of commands, for palettes and launchers."],
  [
    "date-input",
    "Date input",
    "A date typed segment by segment, in the reader's locale.",
  ],
  ["date-picker", "Date picker", "A date field with a calendar popup."],
  ["drawer", "Drawer", "A panel that slides in from an edge."],
  ["file-input", "File input", "Choose, drop or paste files, with validation."],
  ["hover-card", "Hover card", "A preview that opens on hover or focus."],
  ["image-cropper", "Image cropper", "Crop, zoom, rotate and flip an image."],
  ["input", "Input", "A text field, with clear button and groups."],
  ["label", "Label", "A label for any control."],
  ["listbox", "Listbox", "An always-visible list to choose from."],
  ["menu", "Menu", "Actions from a button or a right click, with submenus."],
  ["menubar", "Menubar", "An application menu bar."],
  ["meter", "Meter", "A measurement within a range, ready to use."],
  ["navigation-menu", "Navigation menu", "Site navigation with panels."],
  [
    "number-input",
    "Number input",
    "A number field with named step buttons, ready to use.",
  ],
  ["otp-input", "One-time code", "A one-time code field with a slot per character."],
  ["pagination", "Pagination", "Page links with named previous and next, ready to use."],
  ["password-input", "Password input", "A password field with a show toggle."],
  ["popover", "Popover", "A panel beside its trigger."],
  [
    "preferences",
    "Preferences",
    "User preferences applied as data attributes and saved.",
  ],
  ["progress", "Progress", "Progress of a task, ready to use."],
  ["radio", "Radio", "Radio groups with their dot."],
  ["rating", "Rating", "A star rating, ready to use."],
  ["resizable", "Resizable", "Panels you resize by dragging or with the keyboard."],
  [
    "scroll-area",
    "Scroll area",
    "Styled scrolling, plus ScrollBox with the parts in place.",
  ],
  ["separator", "Separator", "A line between content."],
  ["textarea", "Textarea", "Multi-line text that can grow with its content."],
  ["time-input", "Time input", "A time typed segment by segment."],
  ["timeline", "Timeline", "Events in order, with markers and a connecting line."],
  ["toast", "Toast", "Notifications, with a Toaster ready to render once."],
  ["toggle", "Toggle", "Pressed buttons and toggle groups."],
  ["token-input", "Token input", "Text mixed with tokens for files, people or tags."],
  ["toolbar", "Toolbar", "Buttons and toggles with one tab stop."],
  ["tooltip", "Tooltip", "A short hint on hover or focus."],
  ["tree", "Tree", "A hierarchy you expand and select."],
  ["trigger-menu", "Trigger menu", "Suggestions after @, / or # in a text field."],
  ["waterfall", "Waterfall", "Spans on a time axis, like request timings or a trace."],
  [
    "app-shell",
    "App shell",
    "A sidebar layout that collapses to icons with Mod+B, remembers it, and becomes a drawer on narrow screens; with sidebar navigation.",
    ["shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button"],
  ],
  [
    "breadcrumbs",
    "Breadcrumbs",
    "Where you are, with the current page marked.",
    ["shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    [],
  ],
  [
    "page-header",
    "Page header",
    "A page title with description and actions.",
    ["shell/shell.css"],
    [],
  ],
  [
    "card",
    "Card",
    "A bordered block with header, title, description, content and footer.",
    ["shell/shell.css"],
    [],
  ],
  [
    "badge",
    "Badge",
    "A short status label in five tones, readable in every skin, and a count badge for the corner of an icon or avatar.",
    ["shell/shell.css"],
    [],
  ],
  [
    "table",
    "Table",
    "A plain HTML table in a scroll area: sticky headings, a sticky first column, and rows that stack into labelled blocks on narrow screens.",
    ["table/table.css"],
    ["scroll-area"],
  ],
  [
    "code-block",
    "Code block",
    "Code in its language's colors with a file name, line numbers, marked lines and a copy button; tabs for versions of the same code; and one command for npm, pnpm, yarn and bun that remembers the choice.",
    ["code-block/commands.ts", "code-block/code-block.css", "code/highlight.ts", "code/code.css"],
    ["copy-button", "scroll-area", "tabs"],
    ["shiki"],
  ],
  [
    "inline-edit",
    "Inline edit",
    "Text you edit where it shows: press it, Enter or F2 to edit, Enter to save, Escape to cancel, with validation and optional Save and Cancel buttons.",
    ["inline-edit/inline-edit.ts", "inline-edit/inline-edit.css", "shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    [],
  ],
  [
    "schema-form",
    "Schema form",
    "A form from one definition: its fields with UISet's controls, steps with a review, checks as people type and on submit, and an agent that fills it by field name while a person approves the submit. The same definition is JSON Schema for an agent tool.",
    ["schema-form/schema.ts", "schema-form/form.ts", "schema-form/tool.ts", "schema-form/labels.ts", "schema-form/schema-form.css", "shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button", "checkbox", "date-input", "field", "number-input", "radio", "select", "stepper", "switch", "textarea"],
  ],
  [
    "upload",
    "Upload",
    "A drop zone and a queue of uploads on UI SDK's File input: each file's preview, progress and status, with cancel, retry and remove, a few going up at a time, to whatever storage you use.",
    ["upload/queue.ts", "upload/upload.css", "shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button", "file-input", "progress"],
  ],
  [
    "avatar-group",
    "Avatar group",
    "Avatars stacked in a row, with a count of the ones that don't fit.",
    ["shell/shell.css"],
    ["avatar"],
  ],
  [
    "stat",
    "Stat",
    "A number with its change, said in words as well as color, and an optional trend sparkline.",
    ["shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["sparkline"],
  ],
  [
    "empty-state",
    "Empty state",
    "What to do when there's nothing here yet.",
    ["shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    [],
  ],
  [
    "skeleton",
    "Skeleton",
    "Loading placeholders, and a Loading region that announces once.",
    ["shell/shell.css"],
    [],
  ],
  [
    "description-list",
    "Description list",
    "Terms and their details.",
    ["shell/shell.css"],
    [],
  ],
  [
    "item-list",
    "Item list",
    "Rows with media, title, description, meta and actions.",
    ["shell/shell.css"],
    [],
  ],
  [
    "alert",
    "Alert",
    "An inline message in four tones that names its tone, interrupts only when urgent, and can be dismissed.",
    ["shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button"],
  ],
  [
    "kbd",
    "Keyboard key",
    "Keys written the way this platform writes them.",
    ["shell/shell.css"],
    [],
  ],
  [
    "spinner",
    "Spinner",
    "A loading indicator that says what's loading.",
    ["shell/shell.css"],
    [],
  ],
  [
    "stepper",
    "Stepper",
    "Steps of a flow with the current one marked and later ones locked.",
    ["shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button"],
  ],
  [
    "search-field",
    "Search field",
    "A search box with a clear button and a key that focuses it from anywhere.",
    ["shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button"],
  ],
  [
    "copy-button",
    "Copy button",
    "Copies a value and says so.",
    ["shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button"],
  ],
  [
    "data-grid",
    "Data grid",
    "A spreadsheet-grade grid on UI SDK: virtualized rows, sorting, filters, grouping, pinned, resizable and movable columns, row and cell selection, inline editing with validation, clipboard copy and paste, CSV export, a saved layout and agent actions.",
    [
      "data-grid/grid.ts",
      "data-grid/view.ts",
      "data-grid/columns.ts",
      "data-grid/data-grid.css",
      "shell/shell.css",
      "shell/icons.tsx", "shell/icon-paths.ts",
    ],
    ["button", "combobox", "field", "menu", "popover", "search-field", "select"],
  ],
  [
    "chart",
    "Chart",
    "The frame every UISet chart shares: title, a legend that isolates series, a Chart/Table switch with the table twin, a keyboard listbox of data positions, tooltips, palettes validated for color blindness per skin, and agent actions.",
    [
      "chart/points.ts",
      "chart/scale.ts",
      "chart/plot.ts",
      "chart/vnode.ts",
      "chart/tokens.css",
      "chart/chart.css",
      "shell/shell.css",
    ],
    ["segmented-control"],
  ],
  [
    "line-chart",
    "Line chart",
    "Trends over time: one or more lines, a soft area for one series, or stacked areas, with a crosshair that lists every series and labels at line ends.",
    ["chart/plots/line.ts"],
    ["chart"],
  ],
  [
    "bar-chart",
    "Bar chart",
    "Categories compared: columns or horizontal bars, grouped or stacked, ranked, with thin marks and values at the tips.",
    ["chart/plots/bar.ts"],
    ["chart"],
  ],
  [
    "scatter-chart",
    "Scatter chart",
    "Two measures per item, up to three groups, with hover that finds the nearest point.",
    ["chart/plots/scatter.ts"],
    ["chart"],
  ],
  [
    "heatmap",
    "Heatmap",
    "Magnitude on a grid in one hue, with a scale and arrows that move by cell and by row.",
    ["chart/plots/heatmap.ts"],
    ["chart"],
  ],
  [
    "segmented-bar",
    "Segmented bar",
    "One whole split into up to six parts, with shares printed where they fit: the readable answer to a donut.",
    ["chart/plots/segmented-bar.ts"],
    ["chart"],
  ],
  [
    "sparkline",
    "Sparkline",
    "A trend inside text, a table cell or a stat, whose name says where the values went. Works in Server Components.",
    ["chart/scale.ts", "chart/vnode.ts", "chart/plots/sparkline.ts", "chart/tokens.css", "chart/chart.css"],
  ],
  [
    "board",
    "Board",
    "A kanban board on UI SDK createTransfer: one tab stop, arrows across cards and columns, Space to carry a card, drag with the pointer, column limits, add in place, a details dialog to edit, move or delete, filters, and agent actions.",
    ["board/board.ts", "board/board.css", "shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["alert-dialog", "avatar", "badge", "button", "checkbox", "dialog", "field", "label", "search-field", "select", "textarea"],
  ],
  [
    "canvas",
    "Canvas",
    "A node editor on UI SDK's canvas behaviors: pan and zoom, drag nodes or move them with Alt and arrows, spatial focus, Shift-drag box selection, wires drawn by pointer or with C and arrows, a minimap, zoom controls, a toolbar, an inspector, undo, and agent actions.",
    ["canvas/canvas.ts", "canvas/geometry.ts", "canvas/canvas.css", "chart/tokens.css", "shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button", "field", "menu", "toolbar"],
  ],
  [
    "ide",
    "IDE",
    "A code editor's parts on UI SDK: a file tree on Tree with version control marks and New, Rename, Move and Delete; editor tabs on Tabs; a code editor with syntax colors, indenting and problems; a command palette on Command; problems and a status bar.",
    ["ide/ide.css", "ide/editing.ts", "code/highlight.ts", "code/code.css", "shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["alert-dialog", "button", "command", "dialog", "field", "menu", "select", "tabs", "textarea", "tree"],
    ["shiki"],
  ],
  [
    "mobile",
    "Mobile",
    "Phone app parts on UI SDK: rows that swipe aside to actions (createSwipeActions), wheel pickers and a time wheel (bindScrollPicker), bottom sheets and action sheets (Drawer), pull to refresh, an app bar and a tab bar.",
    ["mobile/swipe-list.ts", "mobile/wheel.ts", "mobile/mobile.css", "shell/shell.css", "shell/icons.tsx", "shell/icon-paths.ts"],
    ["button", "drawer", "listbox", "menu"],
  ],
  [
    "terminal",
    "Terminal",
    "A terminal on UI SDK's input history and stick-to-bottom: ANSI colors kept readable in every skin, links, streaming commands with progress lines, Tab completion, Ctrl+C and Ctrl+L, built-in help, clear and history, and agent actions.",
    ["terminal/ansi.ts", "terminal/session.ts", "terminal/terminal.css", "shell/shell.css"],
    ["button", "field"],
  ],
  [
    "scheduler",
    "Scheduler",
    "Calendars on UI SDK createSpans: a week, a day or a room timeline where people draw, move and resize events with the pointer or arrows, overlapping events sharing lanes, a month view, a toolbar, an event dialog, and agent actions.",
    [
      "scheduler/schedule.ts",
      "scheduler/scheduler.css",
      "chart/tokens.css",
      "shell/shell.css",
      "shell/icons.tsx", "shell/icon-paths.ts",
    ],
    ["alert-dialog", "button", "calendar", "dialog", "field", "segmented-control", "select"],
  ],
  [
    "knob",
    "Knob",
    "A rotary control built as a UI SDK primitive: drag, arrow keys, log scales, double-click reset, agent actions.",
    ["studio/knob.ts", "studio/knob.css"],
  ],
  [
    "patch-bay",
    "Patch bay",
    "Jacks and cables built on UI SDK createConnect: patch by drag, keyboard or agent.",
    ["studio/patch-bay.ts", "studio/cables.ts", "studio/patch-bay.css"],
  ],
  [
    "fader",
    "Fader",
    "A vertical UI SDK slider with its label and readout.",
    ["studio/instruments.css"],
    ["slider"],
  ],
  [
    "level-meter",
    "Level meter",
    "A UI SDK meter drawn as an LED ladder.",
    ["studio/instruments.css"],
  ],
  [
    "chat",
    "Chat",
    "A conversation built on UI SDK: thread that follows new messages, messages with avatars, actions and versions, suggestions, plans and a thinking shimmer.",
    ["chat/chat.css"],
    ["button"],
  ],
  [
    "chat-response",
    "Chat response",
    "Streaming markdown that repairs itself mid-stream and never renders raw HTML, with code blocks highlighted by skin colors.",
    ["chat/chat.css", "code/highlight.ts", "code/code.css"],
    ["chat", "button"],
    ["react-markdown", "remark-gfm", "remend", "shiki"],
  ],
  [
    "chat-parts",
    "Chat parts",
    "Reasoning that opens while the model thinks, tool calls with status, input and output, sources, citations and images.",
    ["chat/chat.css"],
    ["chat"],
  ],
  [
    "chat-composer",
    "Chat composer",
    "The message box: Enter to send, history with ArrowUp, slash commands and mentions, attachments by drop, paste or picker, a model picker and a usage meter.",
    ["chat/chat.css"],
    ["chat", "button"],
  ],
  [
    "chat-sidebar",
    "Chat sidebar",
    "A list of chats with rename and confirmed delete, and a floating assistant launcher.",
    ["chat/chat.css"],
    ["chat", "button"],
  ],
  [
    "rich-text",
    "Rich text editor",
    "A rich text editor on UI SDK with no editor library: headings, nested and numbered lists, to-dos, quotes, code, links, mentions, dividers and images; a toolbar, Markdown as you type, \"/\" for blocks and \"@\" for people (TriggerMenu); safe paste from documents and the web; undo; Markdown and clean HTML out; agents read and write Markdown.",
    [
      "rich-text/model.ts",
      "rich-text/serialize.ts",
      "rich-text/view.ts",
      "rich-text/primitive.ts",
      "rich-text/commands.ts",
      "rich-text/rich-text.css",
      "shell/shell.css",
      "shell/icons.tsx",
      "shell/icon-paths.ts",
    ],
    ["button", "field", "popover", "select", "toggle", "toolbar", "trigger-menu"],
  ],
  [
    "agent-console",
    "Agent Console",
    "The human side of the UI SDK agent bridge: approvals in your app, an activity feed with undo, highlights where the agent changed something, a thread and a prompt.",
    ["agent/approvals.ts", "agent/highlight.ts", "agent/tools.ts", "agent/console.css"],
    ["button"],
  ],
  [
    "step-sequencer",
    "Step sequencer",
    "A row of steps built on UI SDK ToggleGroup, with downbeats and a playhead.",
    ["studio/instruments.css"],
  ],
].map(([name, title, description, extra = [], deps = [], npm = []]) => ({
  name,
  type: "registry:ui",
  title,
  description,
  dependencies: [`@ui-sdk/core@${sdk}`, `@ui-sdk/react@${sdk}`, ...npm.map(pinned)],
  registryDependencies: [dependencyOn("uiset"), ...deps.map(dependencyOn)],
  files: [
    { path: `${ui}/${name}.tsx`, type: "registry:ui", target: `@ui/${name}.tsx` },
    ...extra.map(support),
  ],
}))

// Templates: whole pages built only from UISet items. They install as blocks under
// components/ui/templates/ and import the items relatively, like every other item.
// [name, title, description, registry deps, extra files]
const templates = [
  [
    "auth",
    "Auth pages",
    "Sign in, sign up, forgot and reset password, and verify a code: native validation, server messages, autocomplete hints and a password strength meter.",
    ["alert", "button", "checkbox", "field", "meter", "otp-input", "password-input", "spinner"],
  ],
  [
    "dashboard",
    "Dashboard page",
    "A date range that scopes everything: figures with trends, revenue, orders by channel, plan mix and recent orders.",
    ["app-shell", "badge", "bar-chart", "data-grid", "empty-state", "line-chart", "page-header", "segmented-bar", "segmented-control", "stat"],
    ["templates/dashboard-sample.ts"],
  ],
  [
    "settings",
    "Settings page",
    "Profile, security and sessions, notifications, billing with usage and invoices, team with invites and removal, and a danger zone.",
    ["alert-dialog", "app-shell", "avatar", "badge", "button", "card", "data-grid", "dialog", "field", "item-list", "meter", "page-header", "password-input", "select", "switch", "tabs", "textarea", "toast"],
    ["templates/settings-sample.ts"],
  ],
  [
    "admin",
    "Admin records page",
    "A records list with search, filters, columns and export; create and edit in a drawer; inline edits; confirmed bulk delete; an empty state.",
    ["alert-dialog", "app-shell", "badge", "button", "data-grid", "drawer", "empty-state", "field", "page-header", "select", "toast"],
    ["templates/admin-sample.ts"],
  ],
  [
    "inbox",
    "Inbox page",
    "Mail in three panes: folders, a message list you arrow through, the message with star, archive and delete, and compose.",
    ["app-shell", "avatar", "badge", "button", "dialog", "empty-state", "field", "listbox", "search-field", "textarea", "toast", "toggle", "tooltip"],
    ["templates/inbox-sample.ts"],
  ],
  [
    "chat-app",
    "Chat app page",
    "The chat kit as a product: chats, a thread and a composer, with your model plugged in as an async stream of events.",
    ["chat", "chat-composer", "chat-parts", "chat-response", "chat-sidebar"],
    ["templates/chat-app-sample.ts"],
  ],
  [
    "ide-app",
    "IDE page",
    "A code editor in resizable panes: files with version control marks, tabs, an editor with syntax colors, a command palette (files, commands, lines), problems, an outline and a status bar.",
    ["alert-dialog", "button", "ide", "resizable", "tabs"],
    ["templates/ide-sample.ts"],
  ],
  [
    "project-board",
    "Project board page",
    "A project's issues as a board or a list: sprint progress, search and an assignee filter, column limits, card details, a new-issue form and Undo on moves.",
    ["app-shell", "avatar", "badge", "board", "button", "data-grid", "dialog", "field", "meter", "page-header", "segmented-control", "select", "toast"],
    ["templates/project-sample.ts"],
  ],
  [
    "calendar-app",
    "Calendar page",
    "A calendar app: day, week and month views, a small month to jump to a day, calendars to show or hide, what's next, and events created, edited and deleted in a dialog.",
    ["app-shell", "button", "calendar", "checkbox", "label", "scheduler", "toast", "tooltip"],
    ["templates/calendar-app-sample.ts"],
  ],
  [
    "pricing",
    "Pricing section",
    "Plans with a monthly or yearly switch, a recommended plan, a comparison table and questions.",
    ["accordion", "badge", "button", "segmented-control"],
    ["templates/pricing-sample.ts"],
  ],
].map(([name, title, description, deps, extra = []]) => ({
  name,
  type: "registry:block",
  title,
  description,
  dependencies: [`@ui-sdk/core@${sdk}`, `@ui-sdk/react@${sdk}`],
  registryDependencies: [dependencyOn("uiset"), ...deps.map(dependencyOn)],
  files: [
    { path: `${ui}/templates/${name}.tsx`, type: "registry:ui", target: `@ui/templates/${name}.tsx` },
    ...extra.map((file) => support(file)),
    support("templates/templates.css"),
    support("shell/icons.tsx"),
    support("shell/icon-paths.ts"),
    support("shell/shell.css"),
  ],
}))

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: config.namespace.replace(/^@/, ""),
  homepage: config.homepage,
  items: [root, ...components, ...templates].map((item) => ({
    author: `${config.author} <${config.repository}>`,
    ...item,
  })),
}

const out = base ? "registry.build.json" : "registry.json"
writeFileSync(out, `${JSON.stringify(registry, null, 2)}\n`)
console.log(`${out}: ${registry.items.length} items${base ? ` for ${base}` : ""}`)
