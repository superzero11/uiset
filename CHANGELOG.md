# Changelog

UISet follows UI SDK's beta. Each release pins exact `@ui-sdk/*` versions, and the notes say
which. Until UI SDK reaches 1.0, a minor release of UISet (0.2, 0.3) may change an API;
those changes are listed under **Changed** with what to do. Patch releases only fix things.

Registry items are source code copied into your app. To take a release, add the items
again (`npx shadcn@latest add @uiset/<item>`) and review the diff.
`@uiset/web` is a package: update it like any other.

## 0.6.0 (unreleased)

On UI SDK `0.1.0-beta.13`.

### Added

- **Each skin opens and closes things its own way.** Base fades and grows (150 ms in, 100
  out), Blueprint draws a popup from its trigger's side at an even pace and erases it back,
  Studio drops it into place and stops dead, Phosphor draws it in four scan steps and lets it
  fade like cooling phosphor (clicks go through it while it fades), and Ink stays instant.
  Popovers, menus, select and combobox lists, tooltips, hover cards, date pickers, dialogs,
  toasts, and accordion and collapsible panels take part (a modal dialog closes at once, as
  UI SDK swallows a click on the page while one is leaving), on UI SDK's
  `data-starting-style` and `data-ending-style`. Skins set `--uiset-enter-*`,
  `--uiset-exit-*`, `--uiset-panel-*`, `--uiset-dialog-time` and `--uiset-toast-shift`;
  `--uiset-motion-speed` scales every duration. See Theming, Motion. React and Web
  Components.
- **Each skin turns things on and off its own way.** A switch, checkbox, radio or pressed
  toggle eases in Base (its check grows in), keeps an even pace in Blueprint (its check is
  inked in from the start of the line), lights like a lamp in Studio (on in 60 ms, off in
  300), and changes at once in Phosphor and Ink. A field's error appears on the same timing.
  An alert dialog pressed outside, which it never closes on, nudges in the skin's way, so
  the press visibly did something. Skins set `--uiset-toggle-*`, `--uiset-check-scale` and
  `--uiset-nudge-*`. React and Web Components.
- **Items slide to their new places, each skin its own way.** A sortable list's items, a
  sortable tree's rows and a board's cards (across columns too) slide when they're put in a
  new order, by a person or an agent: Base glides, Blueprint slides in a straight line,
  Studio snaps like a stepped knob, Phosphor jumps in steps, Ink jumps. A switch's thumb and
  a segmented control's indicator move on the same timing (the thumb no longer overshoots).
  Skins set `--uiset-move-duration` and `--uiset-move-ease`; the list, tree and board items
  bring `shell/glide.ts`. React and Web Components.
- **`motion="reduce"` on `<UISet>` and `<uiset-root>`** quiets that part of the page,
  whatever the system setting says, so an app can offer its own switch.

### Changed

- **Reduced motion keeps fades.** Under `prefers-reduced-motion` (or `motion="reduce"`),
  what appears and disappears now fades, 120 ms in and 90 ms out, instead of snapping;
  nothing moves, grows or is drawn, and panels still snap. This is what UI SDK does and
  advises, and it makes UISet agree with UI SDK's drawer, which already faded.

### Fixed

- **A keyboard drop into a folder no longer warns in development.** The sortable tree opened
  the folder with UI SDK's `drop` reason and the drop's keydown, which UI SDK's development
  check refuses for that reason (it threw in the unit tests). React and Web Components.
- **A canvas on a desktop opens with the whole graph in view.** Opening no smaller than 80%
  left the last node past the edge where the whole graph fit at about 70%. A graph that fits
  at 60% or more now opens fitted; a bigger one still opens at 80%, where it starts.
- **The data grid's row checkboxes look like the skin's checkboxes.** The browser drew
  them, light grey in dark skins. They stay native checkboxes (the grid keeps its keys) but
  carry `data-slot="checkbox"` and its state, so every skin draws them. React and Web
  Components.
- **Studio's LED meter lights its colours where they sit on the whole scale.** The green to
  red ladder was squeezed into the lit part, so a meter at 40% already showed red.
- **Slider, meter and progress tracks hold 3:1 against the page in every skin.** Base's
  muted trough was 1.1:1, so a meter's empty part and a fader's travel didn't show: tracks
  get an inner edge in `--ui-input`, the colour Base keeps at 3:1 for fields. Blueprint
  draws a meter as a rectangle in line (its faint fill was 1.3:1), Studio's slots and
  meters get a milled lip (`--studio-slot-edge`, they were 1.7:1), and Phosphor outlines a
  slider's travel in its dim green, as it does a meter.
- **Ink underlines the chosen tab in a phone's tab bar**, which differed by shade alone.
- **The chat's suggestion chips, citations and attachments are square in square skins**
  (Blueprint, Phosphor) and round elsewhere.

- **A chat or terminal keeps following new output after a wheel at its end.** When the
  content's height ended between two pixels, a wheel at the bottom settled a pixel up, UI
  SDK's `stickToEnd` read that as scrolling up and let go, and nothing re-armed it: the next
  answer arrived out of view (the same failure as shadcn-ui/ui#12766). `ScrollBox` with
  `stickToEnd`, and the web elements' scroll areas, now stick to the end again after a
  downward wheel, End, PageDown or ArrowDown there. The `scroll-area` item brings
  `shell/rearm-end.ts`. React and Web Components.

## 0.5.1 (2026-11-20)

On UI SDK `0.1.0-beta.13`.

### Fixed

- **A skin nested inside another shows its own look.** A skin's decoration (Blueprint's
  uppercase labels, Studio's dark fields, Ink's labels) reached into a nested root of
  another skin, like a Base card on a Blueprint page, wherever the nested skin left that
  property unset. Each skin is now wrapped in `@scope`, which stops at another skin's root.
  If you wrote your own skin with decoration selectors, see "Write your own skin" in
  Theming. React and Web Components.

## 0.5.0 (2026-11-19)

On UI SDK `0.1.0-beta.13`. A minor release: what works differently is under **Changed**, each
with what to do. The ones to act on are the UI SDK pin and, if you styled the kits' scrolling,
the classes that moved onto UI SDK's scroll areas.

### Added

- **Scroll areas fade where their content runs on.** Past an edge with more beyond it, the
  content fades out (down and across, and right to left), so a reader can see there's more;
  it grows in as you leave an edge. It's a mask, so it suits any surface and every skin.
  Code blocks and tables get it too; a table's sticky header and first column stay solid.
  `data-fades="none"` on a scroll area turns it off, and `--uiset-fade` sets how far it
  reaches. With keyboard focus, the ring goes around the whole box, outside the fade. React
  and Web Components.

- **Radio cards.** `RadioCard` puts an option on a card that a press anywhere on chooses, with
  a `description` under its title and an `aside` at its end, like a price. Its radio is named
  by the title alone and described by the line, so screen readers and agents hear "Pro", not
  the whole card. The card wears the focus ring and a checked edge in every skin;
  `className="uiset-radio-cards"` on the `RadioGroup` lays cards side by side where there's
  room. Web Components: UI SDK's `ui-field` and `ui-radio` in the same classes. The `radio`
  item now installs `field` with it.

- **Rings for meters and progress.** `MeterRing` and `ProgressRing` draw the reading as a ring
  filled to its value, with the value in the middle and the label under it, in every skin's
  colors; `--uiset-ring-size` and `--uiset-ring-width` size it. A progress ring with no
  value turns a quarter of the ring, held still for reduced motion. Web Components:
  `data-shape="ring"` on `ui-meter` or `ui-progress`.

- **A textarea's count of its limit.** `TextareaCount` shows "42 / 160 characters" as the
  field's description, so a screen reader hears it with the textarea. Near the limit it says
  how many are left, once at `warnAt` (20) and once at none, rather than on every key, and
  takes the warning and danger tones in every skin. Web Components:
  `<uiset-textarea-count>`, which finds its field's textarea. The `textarea` item now
  installs `field` with it.

- **Password rules that tick off as you type.** `PasswordRules` lists the rules a new
  password has to meet, each a `label` and a `test`; a met one takes a check and the success
  tone, and screen readers hear "Done" or "To do" before it. A rule that changes is announced
  once, so typing stays quiet otherwise. Web Components: `<uiset-password-rules>`, with rules
  written as `<li data-min-length>` and `<li data-pattern>`.

- **A confirm button.** `ConfirmButton` is for something hard to undo: the first press arms it
  and shows and says `confirmLabel` ("Press again to delete"), the second runs `onConfirm`.
  Escape, leaving it or `timeout` disarms it, and a second press within 600 ms (a
  double-click, a held key) doesn't count. `confirm` says what it does for agents: UI SDK's
  bridge asks the person first (`data-agent-confirm`), and an approved press acts at once, so
  the approval is the second press. Web Components: `<uiset-confirm-button>`.

- **`ScrollBox` takes `axis` and `viewport`.** `axis` ("y", "x" or "both") picks the
  scrollbars, and `viewport` takes the props of the element that scrolls (its role, name,
  ref and handlers). `data-frame="none"` on a scroll area drops its border and padding, for
  one inside a larger surface, and it fills the space it's given. React and Web Components.

- **Sortable list** (`sortable-list`), on UI SDK's `createReorder`. Drag an item by its grip,
  or focus it, press Space, move it with the arrow keys and press Space again; Escape puts it
  back, and each step is read out. With `multiple`, Shift+Space, Shift with the arrows, a
  press on an item's check or a Shift- or Command-click select items, and a selection moves
  together, its copy showing how many it carries. `locked` keeps an item in place,
  `numbered` shows places, and `orientation` lays items in a row or a grid. Agents get
  `moveItem` and `selectItems` by name. A new guide, Sortable lists and trees. Web
  Components: `<uiset-sortable-list>`.

- **Sortable tree** (`sortable-tree`), on UI SDK's `createTreeReorder`. Drag a row up or
  down, and sideways to change its level, with everything under it; or press Space, move it
  with Up and Down, change its level with Left and Right, and press Space again. Right and
  Left open and close branches, and typing a name goes to it. Only branches hold items: a
  row dropped inside anything else goes back and says why, and is marked while it's carried
  there. A branch something is dropped into opens. `onItemsChange` gets the items nested
  again, with what moved and where. Agents get `moveItem(item, into, position)`,
  `expandItem` and `collapseItem`. Web Components: `<uiset-sortable-tree>`.

- **Drag a file into a folder in the IDE's file tree.** With `onMove` (`movable` on
  `<uiset-file-tree>`), a file or folder dragged onto a folder moves into it; onto a file, into
  that file's folder; onto the room under the last row, to the top. The folder is ringed
  while the drag is over it and opens if the drag rests on it, a folder can't go inside
  itself, and Escape cancels. The drop runs the same `onMove` (or `move` event) and checks as
  Move to…, selects the file and says where it went. Built on UI SDK's `bindDrag`,
  `bindDragPreview` and `createAutoScroll` around UI SDK's Tree, which keeps its keys.

### Fixed

- **The Project board template's four columns fit at 1440.** They share the room down to
  11.5rem each (from 13rem), so Done is no longer cut off beside the sidebars; narrower
  pages still scroll the board. A column's "Add a card to …" breaks evenly in a narrow
  column. React and Web Components.

- **A canvas opens at a size you can read.** With `fitView`, it used to fit every node
  whatever the zoom, so a workflow on a phone opened at 25%, its 12px titles drawn at 3px.
  It now opens no smaller than 80%, starting where the graph does; Zoom to fit and the
  minimap still show all of it. React and Web Components (`fit-view`).

- **A week fits beside a sidebar, and a phone starts on one day.** The schedule's days
  share the room down to 5.5rem each (from 7rem), so the Calendar template shows Sunday at
  1440 instead of cutting it off. A narrow event tall enough for three lines gives two to
  its title ("Design review", not "Design rev…"). `isNarrowScreen()`, from the scheduler,
  says when a week won't fit; the Calendar template and the Scheduler kit's demo use it to
  open on the day view on a phone. React and Web Components.

- **A horizontal bar chart's value labels no longer run together on a narrow screen.** It
  shows as many as fit side by side (at phone width, "0 100k200k300k" became "0" and
  "500k"), and the grid keeps every line. Charts also leave room for labels in the widest
  skin's font: in Phosphor, "Middle East and Africa" was clipped at the left edge. React and
  Web Components.

### Changed

- **UI SDK 0.1.0-beta.13** (from beta.10). For people: a menu keeps focus on the item the
  pointer reaches right after opening it, a carousel behind a modal dialog or drawer is
  inert, and a drawer with long content opens faster. For agents: Web Components' tabs and
  scroll areas are named by their list and viewport, as in React, so UISet's web elements
  no longer repeat those names on the root (if you read `aria-label` off a `<ui-tabs>` or
  `<ui-scroll-area>` that UISet built, read it from the list or viewport). Pagination no
  longer warns in development. Install `@ui-sdk/core` and `@ui-sdk/web` (or your
  framework's package) at `0.1.0-beta.13` beside this release.

- **The kits and templates scroll in UI SDK's scroll areas**, with its scrollbars and the
  fades above: the chat thread, its code, tool input and output and tables; the terminal;
  the data grid; the schedule; the board; the chart's table; the IDE's files, tabs and code;
  the rich text editor (no fades there, since the caret sits at the edge as you type); the
  mobile sheet and pull to refresh; the agent snapshot; and the settings tabs, admin drawer,
  pricing table and IDE panels. Sticky headers, columns and gutters stay solid. What to do
  if you styled them: each old scrolling class (like `chat-thread-scroller`,
  `data-grid-scroller`, `terminal-scroll`) is now on the viewport, the element that scrolls,
  so heights set there still work; borders and backgrounds moved to a new `*-frame` class on
  the scroll area (`data-grid-frame`, `chart-table-frame`, `pricing-table-frame`,
  `ide-tab-strip`). The board's columns are laid out by `.board-lanes` and the schedule's
  head and body by `.schedule-grid`. A scrolling region is a tab stop only while it scrolls
  and holds nothing else to press, as UI SDK decides. The kits now install `scroll-area`.
  Each scroll area has a short name of its own for agents (the terminal's output is
  "Output", the grid's "Rows", the board's "Columns", the schedule's "Hours", the IDE's
  "Files", "Tabs" and "Lines"), since one containing its widget's name, like "Shell output"
  around the terminal "Shell", would make a step by that name find both. The chat thread and
  the terminal follow their end with the scroll area's `stickToEnd` instead of
  `createStickToBottom`, so old lines trimmed past `scrollback` leave what you're reading in
  place; Jump to latest shows whenever the thread is away from its end.
  Web Components: `<uiset-status-bar>` and `<uiset-pull-refresh>` keep the browser's own
  scrolling, since what's inside them is your own markup.

## 0.4.0 (2026-11-19)

On UI SDK `0.1.0-beta.10`. A minor release: what works differently is under **Changed**,
each with what to do. The ones to act on are the UI SDK pin, the base skin's black-and-white
default, and agents' `runCommand` and `runAction`.

### Added

- **`agent-check`**: whether an agent can use a page. It asks the page's UI SDK agent bridge,
  in any framework, and scores the page by the share of controls an agent can find by name.
  It reports components with no name, names that find more than one component (a step by
  that name fails), and controls a person can reach that agents can't see, with destructive
  buttons lacking `data-agent-confirm` and pages past 100 components as warnings.
  `expectAgentReady` for tests, `checkPage` for Playwright (through the tools a page
  registers with WebMCP, or a global), and a command that checks pages by URL. On a site
  without UI SDK it reads the page's accessibility tree instead, as browser agents do:
  controls with no name, controls of one kind sharing a name, and what only looks clickable
  (`checkPageReadiness`, `expectPageReady`; Playwright and the command line fall back to it).
  `showAgentReadiness` draws the report over the page, and uiset.dev's Agents page has it as
  a bookmarklet for any page. See [Agent readiness check](./docs/agent-check.md).
- **[uiset.dev/check](https://uiset.dev/check)**: paste a public page's link and see whether
  an agent can use it. It loads the page in a browser that reaches public addresses only,
  and a link to the report checks the page again.
- **Agent view on uiset.dev.** On every component, kit and template page, a switch shows,
  under the live example, what UI SDK's agent bridge reads from it as you use it: each
  component's name, kind and state, its agent-check score, and each action it offers, which you
  can run from there. The switch carries across pages, and Agent view is hidden from agents.
- **uiset.dev, redesigned.** The home and Agent pages have a top nav with a Library menu; the
  docs and the library sit in a sidebar frame, with the page in a panel. The library's tabs
  (Components, Kits, Templates, Themes) show each piece as a live card that opens its page:
  every kit's page starts with its demo, each template has a page of its own, and so does
  each of the app's parts (Badge, Stat, Alert…), as UI SDK's components do. The theme
  generator previews one mode at a time, with a Light/Dark switch. The skin
  beside the light/dark switch dresses the whole site, and in Base every example wears the
  site's own grays. Every example at once, live, is at `/gallery`. A new logo, and Inter.
- **Every page template and Web Components page scores 100** on `agent-check`, and a test in
  each browser holds them there. Its first run on them scored the templates 50 to 91.
- **A horizontal Timeline** (`orientation="horizontal"`), which was unstyled: the markers on
  one line, each event's text under its marker, and the connector running on to the next.
  In Windows high contrast, connectors in both directions now show.

### Changed

- **UI SDK `0.1.0-beta.10`.** Every item now pins `@ui-sdk/core`, `@ui-sdk/react` and
  `@ui-sdk/web` at `0.1.0-beta.10`, and `@uiset/web`'s peers follow. To take it, add your items
  again and update the `@ui-sdk/*` versions in your package.json. beta.10 opens a date picker
  on its selected date each time, returns focus to the next control when a dialog's action
  removes what opened it, and gives each field description its own id. From beta.9:
  - The image cropper's handles go beside its selection, not inside it, so screen readers
    reach them: put `ImageCropperHandle` in `ImageCropperViewport`, after
    `ImageCropperSelection`.
  - Agents can remove one file from a file input by its name.
  - A web drop zone spaces its trigger the way React's does, from UI SDK's own styles; UISet's
    rule for it is gone.
- **The base skin is black and white by default.** With no shadcn/ui theme on the page and
  no `keyColor`, its accent was blue (`oklch(0.5 0.19 268)`) and its grays leaned blue; the
  accent is now near-black (near-white in dark mode) on neutral grays, as in shadcn/ui's
  default theme and on uiset.dev. To keep blue, pass `keyColor={{ l: 0.5, c: 0.19, h: 268 }}`
  (Web Components: `data-key` and the three `--uiset-key-*` variables on `<uiset-root>`).
  Without `keyColor`, text on the accent is your shadcn/ui theme's `--primary-foreground`
  when there is one, and solid buttons move 10% toward the page's color on hover, as
  shadcn/ui's do (toward the text, as before, a near-black accent didn't change). Add the
  root again to take it.
- **Agents run the terminal's commands with `runCommand` and a swipe list's row actions with
  `runAction`**, where they used `run`. Since UI SDK beta.8, the bridge reads a `run` action's
  first argument as one of the component's items, so `run("ls")` and
  `run("Ada Lovelace", "Archive")` were refused (vercel-labs/ui#848). Your code still calls
  `run`, React and Web Components.
- **The terminal keeps to its scrollback while you're scrolled up.** Past `scrollback` lines
  (2000), old lines go even while you're reading further up, and what you're reading stays
  put: UI SDK has held the view still as rows above it go since beta.6. Until now nothing was
  trimmed until you followed the end again, so a long command's output grew without limit.
  React and Web Components.
- **UISet's own fixes for what UI SDK now does are gone**, with nothing to see:
  - `uiset/focus.ts`'s `returnFocus` is gone. The board, IDE, canvas, scheduler and calendar
    use UI SDK's `keepFocus`, which handles Safari's focus on a clicked button since beta.6.
    When you add your items again, delete `uiset/focus.ts` from your project.
  - Two style overrides UI SDK's `web.css` covers now are gone: the date picker's trigger
    inside its input, and the tree item's ring.
  - The wheel picker's focus following a value set from outside is gone; `bindScrollPicker`
    does it.
  - React's editor tabs no longer repeat their name on the root. Web Components keep it: the
    web agent bridge still names tabs from their root, not their list.
- **Install lines use the `@uiset` namespace**, now that shadcn's registry directory lists it:
  `npx shadcn@latest add @uiset/<item>`. `superzero11/uiset/<item>` and
  `https://uiset.dev/r/<item>.json` still work.

What agents see, so a name finds one component. Update agent steps or tests that used the
old names:

- **Chat threads** are named "Open <title>" (React and Web Components), beside each one's
  "More for <title>" menu, as UI SDK advises for a row's controls.
- **The data grid's search field and Group by select are hidden from agents**, who use the
  grid's own `filter` and `groupBy`; their names, which hold the grid's, made the grid's name
  find two components. The web grid's filters popover too (`filterColumn`).
- **A chart's legend is hidden from agents**, who use the chart's own `isolate`.
- **A chat message's actions carry its first words** (React and Web Components):
  `Copy message: "Here's a summary of the…"`, and the same for Retry message, Edit message,
  Good response and Bad response, so each reply's actions have names of their own. A step
  that pressed "Copy message" now names the message.
- **A chat message's toolbar and feedback group carry its first words too** (React and Web
  Components): `Actions: "Here's a summary of the…"` and `Feedback: "Here's a summary of
  the…"`, where every message had "Message actions" and "Feedback on this response". With two
  replies those names found two components each, and "Message actions" made the composer's
  name, "Message", find every toolbar: a chat scored 94 on `agent-check` after one reply.
  `ChatMessageActions`' `label` still names the toolbar when you give it.
- **The scheduler's view switch is "Calendar layout", the canvas's fit button "Zoom to fit",
  and the terminal's prompt "Command line"**, where they were "View", "Fit to view" and
  "Command" (the canvas and terminal in React and Web Components, the switch in React and the
  web calendar template). With a data grid's "View" menu on the page, a step by "View" found
  three components, and "Command" found every button with the word in its name, like "Copy the
  command to install…". `messages.command` still names the terminal's prompt when you give it.
- **Upload's Choose files button carries the upload's label** ("Choose files, Attachments"),
  so two uploads on a page are told apart (React and `<uiset-upload>`).
- **The app shell's sidebar tooltips, and the inbox's Compose and the calendar's New event
  tooltips, are hidden from agents.** A closed tooltip takes its trigger's name in UI SDK's
  bridge (vercel-labs/ui#604), so the name found two components.

### Fixed

- **Rich text keeps your selection after a toolbar button, in Firefox.** Pressing Bold with
  the pointer focused the button, the redraw collapsed the page's selection, and the editor
  took that as yours, so Ctrl+I right after Bold made nothing italic. The editor reads the
  page's selection only while the text has focus. React and Web Components.
- **The pricing template's comparison table no longer widens a positioned container.** Its
  screen-reader text was placed against the nearest positioned ancestor, so inside one (a card,
  a dialog) the container could scroll sideways by the whole table's width.
- **The IDE's selected code keeps 4.5:1 with a near-black accent**, such as shadcn/ui's neutral
  theme. The selection is a tint of the accent, and a dark accent made it gray enough to take
  syntax colors under 4.5:1; its lightness now stays in a readable range. React and Web
  Components.
- **Rich text shown read-only no longer looks clickable on its to-do boxes.** Saved text
  (`RichTextContent`, `<uiset-rich-text-content>`) kept the editor's pointer cursor on a
  to-do's box, which is a picture of its state there.
- **Tailwind CSS 4 apps, with no setup.** In a shadcn/ui app, Tailwind's reset stripped the
  padding, borders and radius from UISet's controls, and UISet's styles beat Tailwind's
  utility classes. UI SDK's stylesheet now sits inside UISet's layer, and on a page with
  Tailwind's layers the root puts UISet between Tailwind's `base` and `components` (React
  and `<uiset-root>`). Pages without Tailwind look exactly as before. Add the root again
  (`npx shadcn@latest add @uiset/uiset --overwrite`) to take it; for server rendering, see
  [With Tailwind CSS](./docs/installation.md#with-tailwind-css).
- **IDE:** the editor's tabs are named "Open files" for agents, who saw the first file's name
  (React) or no name (Web Components); the command palette has a name while closed (its
  content stays mounted, so its title names it); a problem's name has a space between its
  message and its place ("…before shipping. index.ts:7:1"); the template's file tree is
  "Project files".
- **Calendar app:** the upcoming events are UI SDK buttons, so agents can open them.
- **Web Components:** tables, code blocks and code tabs carry their name on the root
  element, which the web bridge reads, and the avatar group names each avatar as an image
  from its picture's alt text or its hidden name.
- **Templates:** the auth template's "Email me a sign-in link" is "Send me a one-time link",
  and the schema form example's Name field is "Full name".
- **`agent-check` no longer counts a closed tooltip as sharing its trigger's name.** UI SDK
  now leaves it out of the snapshot, and a step by that name presses the trigger. A closed
  menu or dialog named like its trigger still counts: the snapshot lists both.
- **Focus after Undo or Add node lands at once, not a frame or two later.** The project
  board's Undo (React and Web Components) and the canvas toolbar's Add node (React and Web
  Components) put focus off to a later frame, so a quick key or click could land first and
  then lose its focus: Escape on a card just picked up sent focus to the card Undo had brought
  back. Undo now focuses the card as the board draws it, and a new node takes focus as it
  renders (React) or as the closing menu hands focus back (Web Components), in the same task
  as the press. The board and canvas demos and the canvas example do the same.

## 0.3.0 (2026-11-17)

On UI SDK `0.1.0-beta.5`. The first `@uiset/web` on npm since 0.1.1: 0.2.0 wasn't published
on its own, so this release carries its changes too, including the two under its
**Changed**. Nothing in 0.3.0 itself changes how existing code works.

### Added

- **`schema-form`**: a form drawn from one definition. `defineForm` declares the fields
  (text, email, link, phone, long text, number, choice, yes or no, date) with their checks,
  and optional steps; the values' type comes from it. `SchemaForm` draws it with UISet's
  controls, shows each problem under its field (as people leave a field, and on Next or
  Submit, with focus on the first), walks the steps to a review, and shows the problems
  your `onSubmit` sends back on their step. Any Standard Schema (zod, valibot, arktype)
  adds rules across fields. An agent sees the form as one component and fills it by field
  name or label with `fill`, hearing exactly what's wrong; the submit carries
  `data-agent-confirm`, so a person sends it. `formTool` and `registerFormTool` make the
  same definition an agent tool, for a model SDK or the browser's agent (WebMCP). Enter in
  any field of a step goes on, and focus follows the steps. React, and
  `<uiset-schema-form>` for Web Components, where `send` returns the problems and `value`
  works with `v-model`; `@uiset/web` exports `defineForm` and `formTool`. See
  [Forms](./docs/forms.md#schema-form).

### Fixed

- **`<uiset-stepper>`** steps ahead of the current one in a linear flow looked enabled:
  `disabled` is now on UI SDK's button wrapper, which marks the button for the skins, as
  React's are.
- **Stepper** labels center on their numbered marks at any line height, and the marks keep
  their size on a page without a `border-box` reset.

## 0.2.0 (2026-11-17)

On UI SDK `0.1.0-beta.5`. A minor release: two things work differently, each under
**Changed** with what to do. `@uiset/web` 0.2.0 wasn't published to npm; 0.3.0 has these
changes.

### Added

Five items, from what people ask shadcn/ui and UI SDK for most, in React and as Web
Components.

- **`table`**: a plain HTML table in a UI SDK scroll area. Sticky headings, a sticky first
  column, and rows that stack into labelled blocks below 30rem of the table's own width.
- **`avatar-group`**, and **`CountBadge`** in `badge`: avatars overlapping in a row with a
  count of the rest, and a count on the corner of an icon button or avatar.
- **`code-block`**: `CodeBlock` (colors, file name, line numbers, marked lines, copy),
  `CodeTabs`, and `PackageCommand`, one command for npm, pnpm, yarn and bun that remembers
  the choice.
- **`inline-edit`**: text you edit where it shows, on UI SDK's `createInlineEdit`, with
  validation and optional Save and Cancel buttons.
- **`upload`**: a drop zone and a queue of uploads on UI SDK's File input: previews,
  progress, cancel, retry and remove, a few at a time, to whatever storage you use.
- **Docs**: [Looking for a component?](./docs/looking-for.md) maps the most-requested
  components to UISet items, and [Forms](./docs/forms.md) covers inline edit and upload.
- **Guides for [Vue](./docs/vue.md) and [Svelte](./docs/svelte.md)**: setup, passing data,
  events, two-way binding, skins, server rendering, and UI SDK's own Vue and Svelte
  components under UISet's stylesheet. Every code block ran in a new app of each.
- Two icons, `upload` and `retry`.
- **The same five for Web Components**: `<uiset-table>`, `<uiset-avatar-group>`,
  `<uiset-count-badge>`, `<uiset-code-block>` with `<uiset-code-tabs>` and
  `<uiset-package-command>`, `<uiset-inline-edit>` and `<uiset-upload>`, sharing React's CSS,
  the inline edit primitive, the upload queue and the package-manager choice. See
  [Web Components](./docs/web-components.md#content-and-forms).
- **`@uiset/web` ships TypeScript types.** `document.querySelector("uiset-data-grid")` and
  `createElement` know each element by its tag, and the types are exported by name
  (`UISetDataGrid<Row>`, `UISetBoard`, `UISetLineChart<Datum>`, …): every element a page
  works with, including the kits' script APIs. The grid and the charts take your row type.
- **`@uiset/web` events are typed.** `addEventListener` on an element knows its own events
  (`grid.addEventListener("celledit", (e) => e.detail.row)`), and each element's events are
  exported as a map for a template's listener: `UISetKnobEvents["valuechange"]`,
  `UISetDataGridEvents<Order>["celledit"]`.
- **`v-model` on every `@uiset/web` element with a value.** The stepper, knob, patch bay,
  wheel, rich text, code editor, chat composer, chat threads, model picker, file tree and
  editor tabs now have a live `value` and fire `input` once a change is in (and `change` for
  a finished choice), as the search field already did. Vue's server compiler doesn't allow
  `v-model` on custom elements; the guides show the value-and-event pair for that case.
- **Server-rendered HTML hydrates cleanly.** Under an ancestor with `data-uiset-hydrating`,
  `@uiset/web`'s elements are defined but wait to draw until the attribute is removed, so
  Vue and Svelte hydrate the HTML they rendered and set your data as properties. Remove the
  attribute once hydration is done. Before this, the app shell's layout broke Vue's
  hydration of the whole page, and loading the module after hydration left the grid and
  stepper empty. The [Vue](./docs/vue.md#server-rendering) and
  [Svelte](./docs/svelte.md#server-rendering) guides have the recipe.

### Changed

- **Data grid: a column's `options` open in the skin's own list.** The editor for a column
  with `options` was a text field with the browser's list, which no skin can style. It is
  now UI SDK's Combobox in the cell: the list opens under the cell, typing narrows it, the
  arrows move through it, and Enter, Tab or a press saves the highlighted option. Text
  that matches no option can no longer be typed in and refused; the list says "No match".
  Pasted and agent edits are still checked against the list. The `data-grid` item now
  depends on `combobox`: add it again to take the change. React and `@uiset/web`.
- **`<uiset-knob>`'s `value` stays live.** Once a page set `value`, the knob held it: a
  person's turn fired `valuechange` but didn't move the knob until the page set `value`
  again. Now a turn moves it, as a slider's does, and `preventDefault()` on `valuechange`
  refuses it. A page that set `value` on every `valuechange` needs no change.

### Fixed

`@uiset/web`, from writing the Vue and Svelte guides against real apps:

- **Bound attributes reach the element.** An attribute that shared its name with a
  read-only member or a method (the grid's `label`, `locale`, `selectable` and `editable`,
  the search field's `label` and `shortcut`, the editor's `label`, the activity's `source`)
  couldn't be set from a Vue template, which sets a property when it finds one. Each is now
  a property that writes its attribute.
- **`"false"` turns a presence attribute off.** Vue and Svelte write `toolbar="false"` for a
  false binding, and the toolbar stayed. `"false"` is now off everywhere: the grid's
  `toolbar`, `selectable` and `editable`, the chat's flags, the editor's `readonly`, the
  canvas's `history` and `renamable`, and the root's `sound` and `haptics`.
- **A sparkline's `values` and a stat's `trend` take the attribute's text as a property**
  (`"4,6,,8"`), as well as an array.
- **The search field's Clear fires `input`**, so `v-model` and other two-way bindings follow
  it. `valuechange` still fires once.
- **The app shell places children added after it mounts**, by the same `data-part` rules.
- **`uiset.css` no longer carries the demo pages' rules.** It set a font, a margin and a
  minimum height on `body` and loaded a web font. The stylesheet now reaches only UISet's
  root and what's inside it.
- **`<uiset-copy-button>` says when copying fails.** A refused clipboard failed silently; it
  now announces "Couldn't copy", as React's does. It also takes `full-label`, a fuller name
  like "Copy app.tsx" where several share a page.
- **The module can be imported where there's no browser.** Importing `@uiset/web` in Node
  threw `HTMLElement is not defined`, so server-rendered apps had to guard the import.

React and both:

- **Data grid: the editor's ring stays inside its cell.** While a cell was being edited its
  focus ring was drawn four pixels outside it, over the pinned column's edge and the rows
  above and below. React and `@uiset/web`.
- **Canvas: a node an agent adds can be used at once.** `addNode` returned before React had
  drawn the node, so an agent's next step ("connect Draft answer to Log") could fail with
  "No node". Seen in Firefox. The node is now rendered before the call returns.
- **Patch bay inside a scaled container.** Cables are now measured in the patch bay's own
  pixels, so they stay on their jacks, and a cable being dragged stays under the pointer, when
  something above it scales it (a zoomed canvas, a CSS transform). React and `@uiset/web`.
- **Mobile: a wheel keeps a value set while its sheet is still opening.** In WebKit, an
  agent's `setValue` on a wheel in a sheet that had just opened was sometimes lost: the
  wheel stayed on the old option, and the sheet coming to rest then scrolled it to a third
  one. UI SDK's scroll picker skips a selection that arrives while a scroll is settling; the
  wheel now puts its value back in the band when that happens (`mobile/wheel.ts`). React
  and `@uiset/web`.

## 0.1.1 (2026-11-16)

On UI SDK `0.1.0-beta.5`.

### Changed

- **UI SDK `0.1.0-beta.5`.** Every item now pins `@ui-sdk/core`, `@ui-sdk/react` and
  `@ui-sdk/web` at `0.1.0-beta.5`. UISet needed no code changes; its tests pass on it. To
  take it, add your items again and update the `@ui-sdk/*` versions in your package.json.
  `@uiset/web` 0.1.1 has the new peer versions.

## 0.1.0 (2026-11-16)

The first public release, on UI SDK `0.1.0-beta.2` (`@ui-sdk/core`, `@ui-sdk/react`,
`@ui-sdk/web`).

### Added

- **`<UISet>` root**: skins as CSS variables that nest without leaking, a key color in
  OKLCH that adopts an existing shadcn/ui theme, light and dark, and sound and haptic cues
  for every UI SDK component inside it.
- **Five skins**: base, blueprint, studio, phosphor and ink, each checked for contrast in
  light and dark, with forced colors, reduced motion and right-to-left support.
- **Components**: all 55 of UI SDK's components, styled, plus 16 app frame and data display
  parts (app shell, sidebar, page header, card, stepper, badge, stat, empty state and more).
- **Twelve kits**: chat, rich text editor, data grid, charts, board, scheduler, node canvas,
  IDE, mobile patterns, terminal, Studio (a synth rack with sound) and the Agent Console.
- **Ten page templates**: auth, dashboard, settings, admin, inbox, chat app, project board,
  calendar app, pricing and IDE app.
- **Web Components**: every kit and template as custom elements, for Vue, Svelte, Solid,
  Angular and plain HTML (`@uiset/web`).
- **For agents**: every control named for UI SDK's agent bridge, the Agent Console with
  approvals and undo, a benchmark on UISet's kits (bridge against browser tools), `uiset`
  skills for coding agents, and `llms.txt` and `llms-full.txt`.
- **Tested in Chrome, Safari and Firefox**, for React and Web Components, with axe in every
  skin and theme.
- **Docs and tools**: a docs site with a page for every item, including live examples,
  their code, UI SDK's API reference and what an agent reads; a theme generator that turns
  one color into a checked theme and exports a UISet skin, shadcn/ui variables or design
  tokens; and a guide for moving from shadcn/ui.
