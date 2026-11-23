# UISet for Web Components

UISet's skins, tokens and base styles dress **UI SDK's own custom elements**, the same 55
components the React registry wraps, because both carry the same `data-slot` attributes.
So a page in plain HTML, Vue, Svelte or Solid gets UISet's look and themes from one
stylesheet, and UISet's own primitives register as `<uiset-*>` elements. [Vue](./vue.md) and
[Svelte](./svelte.md) have guides of their own, each tested in a real app.

```bash
npm install @uiset/web @ui-sdk/web@0.1.0-beta.14 @ui-sdk/core@0.1.0-beta.14
```

The package is one module (`@uiset/web`), one stylesheet (`@uiset/web/uiset.css`) and
their type declarations. In this repo, `pnpm web:build` makes all three in `web/dist/`.

UI SDK is a peer: import the UI SDK components you use from `@ui-sdk/web/<component>`.
`uiset.css` already includes UI SDK's `web.css`. `uiset.js` is about 126 KB gzipped with
every kit and `uiset.css` 40 KB; the chat's markdown parser (53 KB) loads only when a chat
first draws an answer. The page templates aren't in the build: they're pages to copy, each
with its own small script. Install `shiki` too for colored code in chats; without it, code
blocks are plain.

The stylesheet styles UISet's root and what's inside it, and nothing else: no rule for
`body`, no fonts loaded, no page height. Set those in your own styles. The module can be
imported on a server (it defines its elements only where there's a browser), so a
server-rendered app doesn't need to guard the import.

## Plain HTML

```html
<link rel="stylesheet" href="/uiset/uiset.css" />
<script type="module">
  import "@ui-sdk/web/button"
  import "@ui-sdk/web/switch"
  import "@ui-sdk/web/tabs"
  import "/uiset/uiset.js"
</script>

<uiset-root skin="studio" theme="dark">
  <ui-button><button>Save</button></ui-button>
  <ui-button><button data-variant="outline">Cancel</button></ui-button>
  <label><ui-switch><ui-switch-thumb></ui-switch-thumb></ui-switch> Email me</label>

  <span id="cutoff">Cutoff</span>
  <uiset-knob aria-labelledby="cutoff" default-value="40">
    <uiset-knob-indicator></uiset-knob-indicator>
    <uiset-knob-value></uiset-knob-value>
  </uiset-knob>
</uiset-root>
```

- `<uiset-root>` is the React `<UISet>`: `skin` (`base`, `blueprint`, `studio`, `phosphor`,
  `ink`), `theme`
  (`light`, `dark`, or leave it out to follow the system), `motion="reduce"` (fades and
  moves nothing, whatever the system setting says), `sound` (present to turn the feedback
  sounds on) and `haptics="off"`. Change the attributes to switch live.
- A key color is `data-key` on the root with the color's OKLCH lightness, chroma and hue as
  three variables: `<uiset-root data-key style="--uiset-key-l: 0.55; --uiset-key-c: 0.2;
  --uiset-key-h: 150">`. It's what React's `keyColor` writes.
- Variants go on the element that gets `data-slot`, which for a wrapping element like
  `<ui-button>` is the native button inside it: `<button data-variant="outline">`.
- UISet's primitives fire their callbacks as events on the root element, like UI SDK's:
  `knob.addEventListener("valuechange", (e) => e.detail.value)`.

## Attributes, properties and types

Frameworks don't all write attributes the way HTML does. UISet's elements take what each
one writes:

- **An attribute can be set as a property.** Where an element has a property with an
  attribute's name (the grid's `label`, `locale`, `selectable` and `editable`, the search
  field's `label` and `shortcut`, a chart's `orientation`), setting the property writes the
  attribute. Vue sets a property whenever it finds one, so `:label="title"` works as it reads.
- **`"false"` is off.** A presence attribute (`toolbar`, `selectable`, `editable`,
  `readonly`, `renamable`, the root's `sound`) is on when it's there and off when it's
  missing or says `"false"`, which is what Vue and Svelte write for a false binding. So
  `:toolbar="showTools"` and `toolbar={showTools}` follow the boolean.
- **A list can be text.** The sparkline's `values` and the stat's `trend` take an array, or
  the attribute's own text (`"4,6,,8"`) handed to the property.
- **Children can arrive late.** The app shell places children by `data-part` whenever they
  are added, not only at first, so a framework that mounts children after the element is
  fine.
- **A value goes both ways.** Each element whose value a person changes has a live `value`
  and fires `input` once a change is in, as a text field does, so Vue's `v-model` works on
  it: the search field, stepper, knob, patch bay, wheel, rich text, code editor, chat
  composer, chat threads, model picker, file tree and editor tabs. A finished choice fires
  `change` too (a knob, when it's let go). Setting `value` fires nothing. The knob's
  `value` stays live, as a slider's does: a turn moves it unless a `valuechange` listener
  calls `preventDefault()`.

The package ships its types. `document.querySelector` and `createElement` know each
element by its tag, and the same types are exported by name:

```ts
import type { UISetDataGrid, UISetLineChart } from "@uiset/web"

const grid = document.querySelector("uiset-data-grid")! // a UISetDataGrid
grid.rows = customers
grid.selectable = true

type Month = { month: string; revenue: number }
const chart = document.querySelector("uiset-line-chart") as UISetLineChart<Month>
chart.x = (d) => d.month // checked against Month
```

The grid takes a row type the same way (`UISetDataGrid<Order>`, with
`UISetDataGridColumn<Order>` for a column); without one, any row's accessors are accepted.

Events are typed as well. `addEventListener` on an element knows that element's own
events, and the DOM's keep their types:

```ts
grid.addEventListener("celledit", (e) => save(e.detail.rowId, e.detail.column, e.detail.value))
knob.addEventListener("valuechange", (e) => e.detail.value) // a number
```

Each element's events are exported as a map, for a listener a template holds:
`UISetKnobEvents["valuechange"]`, `UISetDataGridEvents<Order>["celledit"]`,
`UISetChatComposerEvents["send"]`.

Every element a page works with is typed, with what you set and call on it: the kits
(`UISetBoard`, `UISetSchedule`, `UISetCanvas`, `UISetTerminal`, `UISetChat`,
`UISetRichText`, `UISetDataGrid`), the charts, the Studio knob and patch bay, the swipe
list and the shell parts.
Inner parts that only hold markup, like `<uiset-knob-indicator>` or a patch bay jack, are
plain elements. UI SDK's own `<ui-*>` elements are typed by `@ui-sdk/web`.

## UISet's elements

| Element                                                                 | What it is |
| ----------------------------------------------------------------------- | ---------- |
| `<uiset-root>`                                                         | The skin, theme and feedback root |
| `<uiset-knob>`, `<uiset-knob-indicator>`, `<uiset-knob-value>`       | The Studio knob: drag, arrows, Home/End; the readout follows the value with no script |
| `<uiset-patch-bay>`, `<uiset-patch-bay-jack>`                         | The Studio patch bay: drag a cable, or Enter, arrows, Enter; draws its own cables |
| `<uiset-swipe-list>`                                                   | Mobile swipe rows, from `items` (or your own `<uiset-swipe-row>` markup) |
| `<uiset-wheel>`                                                        | A scroll wheel around a `<ui-listbox class="wheel-list">` |
| `<uiset-pull-refresh>`                                                 | Pull down at the top to refresh what's inside it |
| `<uiset-board>`                                                        | A kanban board, from `columns`, `cards` and `lanes` |
| `<uiset-schedule>`, `<uiset-schedule-month>`                          | A week, a day or a timeline from `tracks` and `events`, and the month at a glance |
| `<uiset-canvas>`, `<uiset-canvas-toolbar>`, `<uiset-canvas-inspector>` | A node editor from `nodes` and `edges`, its toolbar, and the selected node's details |
| `<uiset-file-tree>`, `<uiset-editor-tabs>`, `<uiset-code-editor>`, `<uiset-command-palette>`, `<uiset-problems>`, `<uiset-status-bar>` | The IDE's parts: files, open tabs, a code editor, the palette, problems and the status bar |
| `<uiset-agent-console>`, `<uiset-agent-step>`, `<uiset-agent-approvals>`, `<uiset-agent-activity>`, `<uiset-agent-snapshot>` | The human side of the agent bridge: status, steps, approvals, activity with undo, and what the agent sees |
| `<uiset-terminal>`                                                     | A terminal: ANSI output, a prompt with history and Tab completion, Ctrl+C and Ctrl+L |
| `<uiset-line-chart>`, `<uiset-bar-chart>`, `<uiset-scatter-chart>`, `<uiset-heatmap>`, `<uiset-segmented-bar>` | The charts, drawn from the same geometry as the React ones |
| `<uiset-sparkline>`, `<uiset-stat>`                                   | A trend in a line of text, and a figure with its change in words and an optional trend |
| `<uiset-data-grid>`                                                    | The data grid, from `rows`, `columns` and `getRowId` |
| `<uiset-chat>`, `<uiset-chat-composer>`, `<uiset-chat-threads>`, `<uiset-chat-model-picker>`, `<uiset-chat-usage>` | A conversation from `messages` with parts, its message box, the list of chats, a model picker and a context meter |
| `<uiset-rich-text>`, `<uiset-rich-text-content>`                     | The rich text editor (toolbar, "/" and "@", Markdown in and out), and saved text shown read-only |
| `<uiset-app-shell>`, `<uiset-page-header>`, `<uiset-empty-state>`   | An app's frame (a sidebar that collapses to icons, a drawer on phones), a page's heading with actions, and what to do when there's nothing yet |
| `<uiset-search-field>`, `<uiset-copy-button>`, `<uiset-stepper>`      | A search box with Clear and a "/" key, a copy button that says Copied, and the steps of a flow |
| `<uiset-table>`, `<uiset-avatar-group>`, `<uiset-count-badge>`       | A scroll area around your table (sticky headings and first column, rows that stack), overlapping avatars with a count, and a count on a button's corner |
| `<uiset-code-block>`, `<uiset-code-tabs>`, `<uiset-package-command>` | Code in its language's colors with a caption, line numbers, marked lines and copy; tabs of versions; one command for npm, pnpm, yarn and bun |
| `<uiset-inline-edit>`, `<uiset-tag-input>`, `<uiset-phone-input>`, `<uiset-masked-input>`, `<uiset-upload>` | A value that turns into a field when pressed, tags typed, pasted or picked, a phone number with its country, a field formatted as typed (cards, IBANs, amounts, patterns), and a drop zone with a queue of uploads |
| `<uiset-payment-fields>`, `<uiset-order-summary>`, `<uiset-pay-button>` | How to pay, an order's lines and sums with a discount code, and a Pay button a person confirms when an agent presses it |
| `<uiset-address-fields>` | An address whose fields follow its country, for 252 countries, that an agent fills in one step |
| `<uiset-sortable-list>`, `<uiset-sortable-tree>`                      | A list people put in order by drag or by keys, with a selection that moves together; a tree they reorder and nest |

## Studio

The patch bay is a UISet element; faders, level meters and step sequencers are UI SDK's
slider, meter and toggle group in UISet's classes, as the React ones are.

```html
<uiset-patch-bay aria-label="Patch bay">
  <uiset-patch-bay-jack value="lfo:out"><button aria-label="LFO out"></button></uiset-patch-bay-jack>
  <uiset-patch-bay-jack value="cutoff:in"><button aria-label="Cutoff in"></button></uiset-patch-bay-jack>
</uiset-patch-bay>

<div class="fader-field">
  <ui-slider orientation="vertical" default-value="70">
    <ui-slider-value></ui-slider-value>
    <ui-slider-control><ui-slider-track>
      <ui-slider-indicator></ui-slider-indicator><ui-slider-thumb aria-label="Level"></ui-slider-thumb>
    </ui-slider-track></ui-slider-control>
  </ui-slider>
  <span class="fader-label" aria-hidden="true">Level</span>
</div>

<ui-meter class="level-meter" value="62" aria-label="Signal">
  <ui-meter-track><ui-meter-indicator></ui-meter-indicator></ui-meter-track>
</ui-meter>

<ui-toggle-group multiple class="step-sequencer" aria-label="Steps" default-value="1,5" style="--steps: 8">
  <ui-toggle value="1"><button aria-label="Step 1" data-downbeat></button></ui-toggle>
  …
</ui-toggle-group>
```

- A port whose value ends in `:out` patches into one ending in `:in`; an input takes one
  cable, and patching a connected pair again pulls the cable out.
- `bay.value` reads and sets the cables (`[{ from, to }]`), and `valuechange` fires when a
  person or agent changes them. `bay.api.plug(from, to)`, `unplug` and `clear` work by port
  or by name.
- Ports are named by their buttons' `aria-label`s, for agents and for each jack's "Patched
  to …" description, unless you set `bay.labels` yourself.
- Mark the current step with `data-current` and the downbeats with `data-downbeat` on the
  buttons.

## Mobile

```html
<uiset-pull-refresh>
  <uiset-swipe-list aria-label="Messages" openable></uiset-swipe-list>
</uiset-pull-refresh>
```

```ts
list.items = messages.map((m) => ({
  id: m.id,
  label: `${m.from}: ${m.subject}`,
  content: `${m.from} · ${m.subject}`, // or a Node
  start: [{ id: "read", label: "Read", icon: "mail" }],
  end: [
    { id: "archive", label: "Archive", icon: "archive", tone: "neutral" },
    { id: "delete", label: "Delete", icon: "trash", tone: "danger" },
  ],
}))
list.addEventListener("action", (e) => run(e.detail.value, e.detail.action))
list.addEventListener("open", (e) => open(e.detail.value)) // with `openable`
refresh.addEventListener("refresh", (e) => e.detail.waitUntil(fetchMail()))
```

- Set `items` again whenever your data changes; rows are kept by `id`, so the focused row,
  an open row and their elements stay. After an action, focus goes back to its row, or to
  the row now in its place.
- Everything the React SwipeList does is here: a long swipe runs a side's first action, each
  row has an Actions menu for screen readers, `messages` translates the words, and agents
  `runAction(row, action)` and `openRow(row)` by name (a `danger` action needs the person).
- `<uiset-pull-refresh>` scrolls its children and slides them down as it's pulled. A
  rejected `waitUntil` Promise is announced and fires `refresherror`; `refresh()` runs one
  from code, and a Refresh button shows on keyboard focus. `threshold` and `messages` tune it.
- `<uiset-wheel>` binds UI SDK's `bindScrollPicker` to the listbox inside it. A value set
  from elsewhere (an agent's `setValue`, say) moves focus with it and lands in the band,
  even while a sheet is still opening. The wheel's `value` is the listbox's:

```html
<div class="wheel-group" role="group" aria-label="Alarm time">
  <uiset-wheel>
    <ui-listbox class="wheel-list" keep-in-view="false" aria-label="Alarm time, hour" default-value="7">
      <ui-listbox-item class="wheel-option" value="1">1</ui-listbox-item>
      …
    </ui-listbox>
  </uiset-wheel>
</div>
```

- Sheets, action sheets, the app bar and the tab bar are UI SDK's drawer and buttons in
  UISet's classes: `mobile-sheet` (add `data-snaps` with several snap points),
  `mobile-sheet-handle`, `mobile-action` with `data-destructive`, `mobile-app-bar`,
  `mobile-tab-bar` and `mobile-tab` with `aria-current="page"`. An action sheet's choice
  comes back from `await drawer.api.open()` as `returnValue`, from `<ui-drawer-close
  value="…">`. `web/mobile.html` has all of it working.
- `iconElement(name)` (exported from `uiset.js`) draws UISet's icons without React.

## Board

```html
<uiset-board aria-label="Sprint board" today="2026-11-15" addable openable></uiset-board>
```

```ts
board.columns = [{ id: "todo", title: "To do" }, { id: "doing", title: "Doing", limit: 3 }, { id: "done", title: "Done" }]
board.cards = { c1: { id: "c1", title: "Write the spec", assignee: "Grace Hopper", labels: ["Docs"] } }
board.lanes = { todo: ["c1"], doing: [], done: [] }
board.addEventListener("laneschange", (e) => save(e.detail.value))  // also e.detail.key, from, to, index
board.addEventListener("open", (e) => showCard(e.detail.value))      // Enter or a click
board.addEventListener("add", (e) => create(e.detail.value, e.detail.title))
```

- `lanes` is live: read it any time (you get a copy), set it to change the board (an undo,
  a server update). Set `cards` again when a card changes: a card is kept by id and filled
  again in place, so it keeps focus, and an open "Add a card" form stays. Renamed columns,
  a new `renderCard` and a changed `today` attribute redraw too.
- `addable` shows "Add a card" and `openable` makes Enter and clicks open cards. Without
  them the board does neither, and agents are told so.
- Arrows move between cards and columns; Space picks a card up, arrows carry it (the board
  redraws as it goes), Space drops it and Escape puts it back. Column `limit`s hold for
  people, agents and `board.api.moveCard`.
- `add` fires when someone submits "Add a card": add the card to `cards` and `lanes`
  yourself. A column that fills hands focus to its last card. Counts include every id in a
  column, as the limit check does.
- `hiddenCards` (ids) hides cards in place for a search or filter: focus skips them (a
  focused card that gets hidden hands focus to its neighbor) and moves wait until it
  clears. Ids that aren't on the board don't hold moves back. (It isn't `hidden`, which
  hides the element itself.)
- The board's help is added to your own `aria-describedby`, not put in its place.
- `describeCard(card)` sets what screen readers hear after a title, `renderCard(card)`
  returns your own card face (a Node), and `messages` holds the words (`help`, `empty`,
  `full`, `filtered`).
- `board.api` has `moveCard(card, column, position?)`, `addCard`, `openCard`, `focusCard`,
  `cardElement`, `neighbor` (where focus goes when a card leaves) and `hasRoom`, by id or
  by the names people see. Agents use the same names.
- Card details are your page's: open a `ui-dialog` on `open`. On web components its
  `final-focus` is a selector, read as it opens: point it at
  `uiset-board-card[value="…"]`. `web/board.html` has a dialog that moves cards (a full
  column says so) and deletes them, returning focus to the card or its neighbor; each move
  and delete has its own Undo.

## Scheduler

```html
<uiset-schedule aria-label="Team week" start-hour="8" end-hour="18" today="2026-11-16" time-zone="UTC" openable></uiset-schedule>
<uiset-schedule-month month="2026-11" today="2026-11-16" label="November 2026"></uiset-schedule-month>
```

```ts
schedule.tracks = [{ id: "2026-11-16", label: "Monday, Nov 16", short: "16 Mon" }, …] // days, or rooms
schedule.events = [{ id: "e1", track: "2026-11-16", start: 9 * 60, end: 10 * 60, title: "Standup", color: 1 }]
schedule.addEventListener("eventschange", (e) => save(e.detail.value)) // a draw, move, resize or delete
schedule.addEventListener("open", (e) => showEvent(e.detail.value))    // Enter or a click
schedule.create = (span) => ({ ...span, title: "New event" })          // what a drag or click draws
month.events = schedule.events
month.addEventListener("daychoose", (e) => showDay(e.detail.value))
```

- Times are minutes past midnight; a track is a day (an ISO date) or anything else, like a
  room. `axis="x"` lays tracks out as rows (a timeline). `start-hour`, `end-hour`, `step`
  (minutes, 15 by default), `size` (the default length) and `overlap="false"` (rooms) are
  attributes, and changing one redraws.
- Each event is a button: drag it to move, drag its end edge to resize, drag an empty
  stretch to draw. Arrows move it by a step or a track, Shift with arrows changes its end,
  Delete removes it and hands focus to its neighbor, Enter opens it (with `openable`;
  without it the schedule doesn't open events, and agents are told). Events keep their
  elements as they move, so a drag holds its pointer and focus stays.
- `events` is live: read it, or set it (an undo, a server update). `locked(event)` keeps
  events from changing, `timeLabel(minutes)` sets how times read (12-hour English by
  default), `renderEvent(event)` returns your own face, and `now` with `today` draws the
  current-time line. Your `aria-describedby` stays, with the schedule's help after it.
- `schedule.api` has `addEvent`, `moveEvent`, `resizeEvent`, `removeEvent`, `openEvent`,
  `problem(event)` (why an event wouldn't fit: hours, steps, overlaps), `eventElement`
  and `neighbor`. Agents add, move, resize and open events by the names people see.
- `<uiset-schedule-month>` is UI SDK's calendar with each day's first events as chips
  (`limit`, 3 by default) and the events in each day's name; `label` names the month for
  people and agents. Choosing a day fires `daychoose`; the month buttons fire `monthchange`.
- The toolbar and the event dialog are your page's: `web/schedule.html` has Day, Week,
  Month and Rooms, a dialog that checks times with `api.problem`, and focus that returns to
  the event or a deleted one's neighbor.

## Canvas

```html
<uiset-canvas-toolbar for="workflow"></uiset-canvas-toolbar>
<uiset-canvas id="workflow" label="Workflow" fit-view openable history></uiset-canvas>
<uiset-canvas-inspector for="workflow" renamable></uiset-canvas-inspector>
```

```ts
canvas.kinds = [{ id: "prompt", label: "Prompt" }, { id: "model", label: "Model" }]
canvas.nodes = [{ id: "a", kind: "prompt", title: "Answer template", x: 40, y: 40, outputs: [{ id: "out", label: "Prompt" }] }, …]
canvas.edges = [{ id: "a->b", from: "a:out:out", to: "b:in:prompt" }]
canvas.createNode = (kind, at, title) => ({ id: crypto.randomUUID(), kind, title: title ?? "New node", ...at })
canvas.addEventListener("nodeschange", (e) => save(e.detail.value)) // e.detail.type: move, add, remove, edit
canvas.addEventListener("edgeschange", (e) => saveWires(e.detail.value))
inspector.renderFields = (node) => myFields(node) // your fields, under Rename
```

- The canvas owns its `nodes` and `edges` once you set them, like a form field: a drag, a
  removal, an add or a wire changes them and fires `nodeschange` or `edgeschange` first, and
  `preventDefault()` refuses the change. Setting them yourself replaces them.
- Drag empty space to pan, scroll or pinch to zoom, Shift-drag to select a box. Tab
  reaches the nodes once; arrows go to the nearest node that way, Alt with arrows moves
  it, Space selects, C starts a wire (arrows choose an input, Enter connects), Delete
  removes (with its wires), Enter opens (with `openable`). Plus and minus zoom; 0 resets.
- `history` keeps an undo stack: Control+Z and Control+Shift+Z on the canvas,
  `canvas.undo()`, `redo()`, `canUndo` and `canRedo`, and `historychange`. A removal takes
  its wires in the same step, and `canvas.updateNode(id, patch)` (the inspector's Rename)
  is a step too.
- `fit-view` frames every node once the canvas has a size. `controls="false"` and
  `minimap="false"` leave out the zoom buttons and the map. `grid` sets the snap and the
  Alt+arrow step. `kinds`, `canConnect(from, to)`, `locked(node)` and `renderNode(node)`
  are properties, as in React.
- `canvas.api` has `addNode`, `moveNode`, `connect`, `disconnect`, `select`, `openNode`,
  `fitView`, the zoom steps, `focusNode`, `nodeElement`, `selectedNodes` and
  `removeSelected`. Agents add, wire, move and select nodes by the names people see.
- `<uiset-canvas-toolbar for="…">` is Add node (the canvas's kinds), Remove, Undo and Redo
  (with `history`) and Fit view on UI SDK's toolbar. `<uiset-canvas-inspector for="…">`
  shows the selected node's title, a Rename form (`renamable`), your fields, and its wires,
  each with Disconnect, which hands focus to the next wire or the node.

## IDE

```html
<uiset-command-palette id="palette" lines></uiset-command-palette>
<uiset-file-tree id="files" label="Files" default-expanded="src" creatable renamable movable deletable></uiset-file-tree>
<uiset-editor-tabs id="tabs" empty="No file open."></uiset-editor-tabs>
<uiset-problems id="problems"></uiset-problems>
<uiset-status-bar><span class="ide-status-item">main</span></uiset-status-bar>
```

```ts
files.paths = Object.keys(project)                 // a path ending in "/" is an empty folder
files.status = { "src/index.ts": "modified" }      // version control marks
files.addEventListener("open", (e) => openFile(e.detail.value))
files.addEventListener("rename", (e) => rename(e.detail.from, e.detail.value)) // or e.detail.refuse("why")
tabs.files = [{ path: "src/index.ts", dirty: true }]
tabs.renderPanel = (path) => Object.assign(document.createElement("uiset-code-editor"), { value: project[path] })
tabs.addEventListener("close", (e) => closeFile(e.detail.value))
palette.files = Object.keys(project)
palette.addEventListener("openfile", (e) => openFile(e.detail.value))
```

- Each part is its own element and keeps no project of its own: you hold the files, and
  each part shows what you give it and fires what people do. `web/ide.html` joins them into
  the React IDE template's editor, from the same sample project and linter
  (`templates/ide-sample.ts`).
- `<uiset-file-tree>` is UI SDK's tree: folders first, marks from `status` (in words after
  each name), New file and New folder (`creatable`), Rename with F2 (`renamable`), Move
  (`movable`), Delete with the Delete key after a confirm (`deletable`). `create`, `rename`
  and `move` carry `refuse(message)`, which keeps the dialog open with your reason. A new or
  renamed item takes focus; a deleted one hands it to its neighbor. An agent's choice of a
  file opens it. With `movable`, a file or folder dragged onto a folder (or a file, meaning
  its folder, or the room under the last row, meaning the top) fires the same `move`, and a
  refusal is read out. See [IDE](./ide.md#use).
- `<uiset-editor-tabs>` is UI SDK's tabs. `renderPanel(path)` fills a file's panel once and
  it stays while the tab is open, so an editor keeps its caret, scroll and undo. Delete on
  a tab, a middle click or its × fires `close`; once the file leaves `files`, focus goes to
  the tab that took over, or the empty pane.
- `<uiset-code-editor label path tab-size readonly>` is UI SDK's textarea (agents read and
  write it) with line numbers and colors behind the text. Tab and Shift+Tab indent, Escape
  then Tab leaves, Enter keeps the indent, F8 and Shift+F8 walk `problems`, and its own undo
  keeps a run of typing as one step and a change from outside (setting `value`) as another.
  `valuechange` and `cursorchange` report typing and the caret; `goTo(line, col)` moves it.
  Text inside the element is its first value.
- `<uiset-command-palette lines>` opens files with ⌘P (Ctrl+P), commands after `>` with ⌘⇧P,
  and lines after `:`, on UI SDK's command in a dialog. Escape goes back where you were.
- `<uiset-problems>` lists `problems` worst first and fires `choose`; `<uiset-status-bar>`
  is the labeled strip for your items.

## Agent Console

```html
<uiset-agent-console title="Agent" status="idle">
  <uiset-agent-step status="done">Rename the project</uiset-agent-step>
  <uiset-agent-activity></uiset-agent-activity>
  <uiset-agent-snapshot within="#settings"></uiset-agent-snapshot>
  <uiset-agent-approvals></uiset-agent-approvals>
</uiset-agent-console>
```

```ts
import { createAgent } from "@ui-sdk/web/agent"
import { createHistory } from "@ui-sdk/web/history"
import { createApprovals } from "@/components/ui/agent/approvals"

const approvals = createApprovals()
const agent = createAgent({ allow: approvals.allow })
approvalsEl.approvals = approvals
activityEl.history = createHistory(agent, { within: () => settings })
snapshotEl.agent = agent
```

- The console is a labeled region with the agent's status (`idle`, `working`, `waiting`)
  in words, and it's hidden from agents, so they never act on their own console.
- `<uiset-agent-step status>` is one step of a plan: running, done, failed, or "You said no".
- `<uiset-agent-approvals>` shows each pending approval as a card with Allow and Don't
  allow. Steps on controls marked `data-agent-confirm` always ask. The cards go to the top
  layer, above a modal the person has open, and stay usable while it is.
- `<uiset-agent-activity source="agent">` lists what the agent changed, newest first: Show
  outlines the control, and Undo agent changes puts back what it changed and leaves what
  people changed.
- `<uiset-agent-snapshot within>` is a table of what the agent can see: each control, its
  kind, its state and its actions. `web/agent.html` runs a stand-in model (the gallery's
  planner) against project settings, so the whole loop runs without an API key.

## Terminal

```html
<uiset-terminal label="Shell" prompt="~/app $" welcome="Type help for the commands."></uiset-terminal>
```

```ts
shell.commands = {
  echo: { description: "Prints its words", usage: "<words…>", run: (args) => args.join(" ") },
  build: {
    description: "Builds, with a progress bar",
    async *run(_args, io) {
      for (let p = 0; p <= 100; p += 20) yield `\r${"█".repeat(p / 10).padEnd(10, "░")} ${p}%`
      yield "\n\x1b[32m✓\x1b[0m Built\n"
    },
  },
}
shell.history = ["ls"]                       // Up brings these back first
shell.handle = (line, io) => socket.send(line) // lines no command matched
shell.api.print("from the server\n")         // output from outside, like a socket
```

- It runs on the React Terminal's own session (`terminal/session.ts`) and screen
  (`terminal/ansi.ts`): a command prints, returns text, streams an async iterable (a
  progress bar redraws its line with `\r`), or throws (shown in the danger tone). `help`,
  `clear` and `history` come built in.
- Up and Down bring back earlier commands, Tab completes a command or (with a command's
  `complete`) its argument, and a second Tab lists several matches. Ctrl+C stops a running
  command (the prompt comes back at once), and with text selected it copies. Ctrl+L clears.
- Output keeps ANSI colors, readable in every skin and theme, and links (OSC 8 and plain
  http addresses). The log reads out new lines only, and past `scrollback` lines old ones go,
  even while you're scrolled up, without moving what you're reading. "New output below"
  appears when you've scrolled up.
- `shell.api` has `run`, `clear`, `print` and `error`. Agents run commands with
  `runCommand` and read the last lines; while a command runs, they're told to wait.

## Charts

```html
<uiset-line-chart id="revenue" label="Revenue" description="By month"></uiset-line-chart>
```

```ts
Object.assign(document.getElementById("revenue"), {
  data: months,
  x: (d) => d.month,
  series: [
    { key: "revenue", label: "Revenue", value: (d) => d.revenue },
    { key: "costs", label: "Costs", value: (d) => d.costs },
  ],
  format: (n) => `$${n / 1000}k`,
})
```

- Each chart's geometry lives in `registry/uiset/ui/chart/plots/` as plain functions that
  return nodes; the React charts and these elements draw the same nodes, so they can't drift.
- The title is `label` (a `title` attribute would give the whole chart the browser's
  tooltip). `description` and `height` are attributes too. The options React takes as props
  are properties here (`data`, `x`, `series`, `format`, …), or attributes where they're words:
  `layout` on line charts; `orientation`, `layout` and `sort` on bar charts; `x-label` and
  `y-label` on scatter charts; `measure` on heatmaps; `variant` on segmented bars; `locale`
  on all. Every attribute has a property that reflects it, so `chart.orientation = "horizontal"`
  works too.
- A scatter chart's point names come from `pointLabel` (React's `label`), since `label` is
  the title on every chart.
- Setting properties redraws once, on the next microtask, however many you set together.
  Properties set before the element is defined are picked up when it is.
- Until its required options arrive, a chart shows its title and nothing else, with
  `aria-busy` on its figure.
- Every chart is a listbox of its data positions: arrows move (by row in a heatmap), the
  tooltip and crosshair follow focus or the pointer (the nearest point, on a scatter chart),
  and Enter pins one. `selected` is live. `select` fires with `{ value, source, reason }`:
  `source` is `keyboard`, `pointer` or `agent`, and `preventDefault()` refuses the pin. When
  new data drops the pinned position, `select` fires once with `value: null`, `source:
  "data"`, `reason: "removed"`.
- `<uiset-sparkline label values="4,6,,8" variant="line|area|bar" series="1">` needs no
  script: `values` is comma-separated (an empty place is a gap), and its name says where
  the values went ("from 4 to 8, low 4, high 8"). `<uiset-stat label value change
  direction good period trend description>` says its change in words ("Up 12%") as well
  as color; `good="false"` marks a rise as bad. Both take `values`/`trend` and `format` as
  properties too.
- The legend isolates a series; Chart and Table switch to the table twin. Agents `select`
  by reading ("Mar"), `isolate` and `showAll` series, and `showTable`, as in React. With the
  table showing, the switch is how an agent gets back to the chart.

## Data Grid

```html
<uiset-data-grid label="Customers" selectable editable toolbar filename="customers" height="26rem"></uiset-data-grid>
```

```ts
grid.columns = [
  { id: "name", header: "Name", value: (c) => c.name, pinned: true, editable: true, hideable: false },
  { id: "plan", header: "Plan", value: (c) => c.plan, options: ["Free", "Pro", "Team"], editable: true },
  { id: "seats", header: "Seats", type: "number", value: (c) => c.seats, editable: true },
  { id: "renews", header: "Renews", type: "date", value: (c) => c.renews, text: (c) => day.format(c.renews) },
  { id: "active", header: "Active", type: "boolean", value: (c) => c.active, editable: true },
]
grid.getRowId = (c) => c.id
grid.rows = customers
grid.addEventListener("celledit", (e) => {
  const { rowId, column, value } = e.detail // value is parsed: a number, a Date, a listed option
  if (!allowed(value)) return e.preventDefault() // refused: the editor stays open
  save(rowId, column, value)
})
grid.addEventListener("rowaction", (e) => open(e.detail.row))
```

- Columns are the React grid's (`type`, `options`, `width`, `minWidth`, `align`, `sortable`,
  `filterable`, `groupable`, `editable`, `pinned`, `hidden`, `hideable`), and `render(row)`
  returns a Node or text. Both share `data-grid/columns.ts` and `data-grid/view.ts`.
- Attributes: `label`, `locale`, `selectable`, `editable` (with `celledit` listening),
  `height`, `empty`, `persist` (a localStorage key for the layout), `density`, `toolbar` and
  `filename` (for Export CSV).
- State is live and reported: `selected` (selectedchange), `sort` (sortchange), `query`
  (querychange), `filters` (filterschange), `groupBy` (groupbychange), `columnState`
  (columnstatechange) and `density` (densitychange). Setting one fires no event; a person's
  or agent's change does, and `preventDefault()` cancels it: a canceled change isn't
  announced, doesn't move focus, and fails the agent step that asked for it.
- `rows`, `columns`, `getRowId` and the state above can be set before the element is
  defined; they're picked up when it is.
- Everything the keyboard does in React works here: one tab stop, arrows, Page Up and Down,
  Control+Home and End, Shift to select a range, copy and paste, Enter or typing to edit,
  Space to check, Shift+F10 for the column menu, Alt+arrows to resize, Alt+Shift+arrows to
  move. Only the rows near the view are drawn, in order. When rows or columns go (a search,
  a hidden column), the active cell moves to the nearest one left, so the grid keeps its
  tab stop. An edit left open with text that doesn't fit gives way when another cell starts
  one.
- Header cells, their menus and the toolbar's tools are kept as the grid redraws: an open
  column menu stays open (Wider and Narrower keep it open), and closing it returns focus to
  its header. Double-clicking a resize edge resets the width. A redraw only touches the
  cells whose row, column or text changed, and a resize drag only changes widths.
- `toolbar` adds search (or the selection, with Clear selection), column filters, grouping,
  the View menu (columns and density) and Export CSV. Each tool shows the grid's state
  however it changed, and follows `label` and header changes. `grid.exportCsv(name)` and
  `grid.focusGrid()` work from code.
- Agents `sortBy`, `filter`, `filterColumn`, `selectRows`, `clearSelection`, `editCell`,
  `groupBy` and `showColumn` by the names people see, with the same checks.

## Chat

```html
<uiset-chat-threads label="Chats" value="t1" newable renamable deletable></uiset-chat-threads>
<uiset-chat id="chat" label="Conversation" editable></uiset-chat>
<uiset-chat-composer id="composer" label="Message" attachments="image/*,.pdf"></uiset-chat-composer>
```

```ts
// With AI SDK's useChat (Vue, Svelte or plain JavaScript), its state goes straight in:
chat.messages = messages // [{ id, role, parts: [{ type: "text", text }, …] }]
chat.status = status     // "ready" | "submitted" | "streaming" | "error"
composer.toggleAttribute("running", status === "submitted" || status === "streaming")
composer.addEventListener("send", (e) => sendMessage({ text: e.detail.text, files: e.detail.files }))
composer.addEventListener("stop", () => stop())
chat.addEventListener("retry", () => regenerate())
```

- Parts drawn: `text` (markdown, with GitHub tables, task lists and code blocks highlighted
  by shiki), `reasoning` (open while it streams, then "Thought for 2s"), tool calls
  (`tool-*` and `dynamic-tool`, with their state, input, output or error), `source-url`
  (gathered into "Used 3 sources"), `file` (images shown, others linked) and UISet's own
  `tasks` (`{ type: "tasks", title, tasks: [{ id, title, status }] }`).
- Raw HTML in markdown is dropped, never rendered: model output is untrusted. While a text
  part streams, half-written markdown is completed (remend) so it doesn't flicker.
- The markdown parser is remark, as React's response uses, and loads only when a chat first
  draws an answer.
- Under each answer: Copy, Retry (on the last answer, firing `retry`) and Good or Bad
  (`feedbackchange` with `{ value, id }`; `chat.feedback` is live). With `editable`, a user's
  message has Edit (`edit`). A tool call in `approval-requested` shows Allow and Deny and
  fires `approve` with `{ value, id, part }`; Allow carries `data-agent-confirm`.
- `suggestions` show in the empty state, and a click fires `suggestion`.
- The log follows new text unless you've scrolled up, then offers Jump to latest.
- `<uiset-chat-composer>` sends on Enter (Shift+Enter for a new line), shows Stop while
  `running`, brings back what you sent with Up and Down, takes files with `attachments` (its
  value is the accept list), and suggests `commands` after "/" and `mentions` after "@".
  Its event is `send`, not `submit`, which its own form's native event would share. Its
  `value` is the text in the box. With `queue`, what's written while `running` fires
  `queue` with `{ text, files }` (Enter, or Queue beside Stop), for `<uiset-chat-queue>`.
- A message whose tool call waits for approval shows no caret and isn't busy, though
  `status` is still `streaming`.
- `<uiset-chat-threads>` takes `threads` (`{ id, title, updatedAt? }`) and `value`.
  Choosing a chat sets `value` and fires `valuechange` (cancelable; not `select`, which a
  text field's native event shares). It also fires `new`, `rename` with `{ value, title }`
  and `delete` (after the person confirms in an alert dialog).
- The composer's children go in its toolbar, beside Send. `<uiset-chat-model-picker
  label="Model" value="balanced">` takes `models` (`{ value, label, description? }`) and
  fires `valuechange`; `<uiset-chat-usage used="1200" limit="200000">` is a meter that
  reads "1.2K of 200K tokens" and turns amber past 70% and red past 90%.

```html
<uiset-chat-composer label="Message" attachments>
  <uiset-chat-model-picker id="model" value="balanced"></uiset-chat-model-picker>
  <uiset-chat-usage used="0" limit="200000"></uiset-chat-usage>
</uiset-chat-composer>
```

## Rich text

```html
<uiset-rich-text id="notes" label="Release notes" placeholder="Write the notes…"
  value="## Release 2.4" name="notes" format="markdown" max-length="2000"></uiset-rich-text>
<uiset-rich-text-content id="preview"></uiset-rich-text-content>
```

```ts
notes.mentions = [{ value: "ada", label: "Ada Lovelace" }]
notes.uploadImage = async (file) => ({ src: await upload(file), alt: file.name })
notes.addEventListener("valuechange", (e) => {
  save(e.detail.value)       // Markdown
  preview.doc = e.detail.doc // the document, drawn read-only
})
```

- The same editor as React's `RichTextEditor`: the toolbar is `<ui-toolbar>` with
  `<ui-toggle>`s, a `<ui-select>` for the block type and a `<ui-popover>` for links; "/"
  and "@" are `<ui-trigger-menu>`. The keys, Markdown shortcuts, paste rules and HTML
  output are the ones in [Rich text](./rich-text.md).
- `value` (attribute or property) is Markdown; `doc` is the document. `valuechange` fires
  with `{ value, doc }` for edits, not caret moves; `submit` fires on Mod+Enter outside a
  to-do.
- `commands` replaces what "/" offers (`[]` turns it off), with the same shape as React's.
  `toolbar="false"` leaves the toolbar out; `readonly` hides it and refuses edits;
  `disabled` dims it too.
- With `name`, a hidden field carries the HTML, or Markdown with `format="markdown"`.
- Agents see `<uiset-rich-text-area>`, the editing surface, named by `label`, with
  `setValue`, `insert` and `clear` taking Markdown.
- `<uiset-rich-text-content value="…">` (or its `doc` property) draws saved text with the
  editor's styles, from the document, never from an HTML string.

## App Shell

```html
<uiset-app-shell label="Main navigation">
  <a data-part="brand" href="/">Acme</a>
  <nav data-part="sidebar" class="sidebar-nav" aria-label="Main">
    <a class="sidebar-link" href="/" aria-current="page"><span class="sidebar-icon"></span><span class="sidebar-label">Home</span></a>
  </nav>
  <div data-part="header">…search, account…</div>
  <uiset-page-header title="Customers" description="Everyone who has an account.">
    <ui-button><button>Add customer</button></ui-button>
  </uiset-page-header>
  …the page…
</uiset-app-shell>
```

- `<uiset-app-shell>` lays out its children by `data-part`: `brand` at the top of the
  sidebar, `sidebar` under it, `header` in the header, and the rest in a `<main>` (or a
  `<div>` with `content="div"`, when the page has its own). Children added later, by a
  framework or by script, go to the same places.
- Mod+B (or the toggle) collapses the sidebar to icons and back, remembered in the same
  storage as the React AppShell (`uiset-sidebar`), and each link then gets a tooltip.
  Below `narrow-below` (48rem by default) the sidebar moves into a drawer opened from the
  header.
- `<uiset-page-header title description level>` is the page's `h1` (or `h2`) with your
  actions as children. `<uiset-empty-state title description icon level>` says what to do
  when there's nothing yet, with its actions as children. On both, `title` names the page
  or state; it isn't a tooltip.

## Content and forms

The web twins of React's `table`, `avatar-group`, `CountBadge`, `code-block`,
`inline-edit`, `tag-input`, `phone-input`, `input-mask`, `upload`, `schema-form`, `sortable-list` and `sortable-tree`. `web/content.html` has each
of them.

```html
<uiset-table label="Invoices" stack sticky-header sticky-column max-height="20rem">
  <table>
    <thead><tr><th>Invoice</th><th>Customer</th><th data-align="end">Amount</th></tr></thead>
    <tbody><tr><th scope="row">INV-001</th><td>Acme Corp</td><td data-align="end">$2,500</td></tr></tbody>
  </table>
</uiset-table>

<uiset-avatar-group label="Reviewers" max="3">
  <ui-avatar><ui-avatar-fallback>AL</ui-avatar-fallback></ui-avatar>
  …
</uiset-avatar-group>

<uiset-count-badge count="3" label="3 unread">
  <ui-button><button type="button" data-variant="outline">Inbox</button></ui-button>
</uiset-count-badge>

<uiset-code-block language="tsx" caption="app.tsx" line-numbers highlight="3"></uiset-code-block>
<uiset-package-command install="@uiset/web @ui-sdk/web"></uiset-package-command>
<uiset-code-tabs label="Framework"></uiset-code-tabs>

<uiset-inline-edit label="Project name" value="Atlas" actions></uiset-inline-edit>
<uiset-tag-input label="Topics" value="React, CSS" max="5" description="Separate them with commas."></uiset-tag-input>
<uiset-phone-input label="Phone" default-country="US" name="phone"></uiset-phone-input>
<uiset-masked-input label="Card number" mask="card-number" name="card"></uiset-masked-input>
<uiset-upload label="Attachments" hint="PNG, JPG or PDF, up to 5 MB each" accept="image/*,.pdf" max-size="5000000"></uiset-upload>
<uiset-schema-form confirm="Sends an invite email to the address given" done-message="Invite sent."></uiset-schema-form>
<uiset-sortable-list label="Playlist" multiple></uiset-sortable-list>
<uiset-sortable-tree label="Pages" icons></uiset-sortable-tree>
```

```ts
code.code = source // or the text inside the element
tabs.items = [{ value: "vue", label: "Vue", language: "vue", code: "…" }, …]
project.validate = (text) => (text.trim() ? null : "Give the project a name.")
project.addEventListener("valuechange", (e) => rename(e.detail.value)) // preventDefault() refuses
files.upload = (file, { signal, onProgress }) => send(file, signal, onProgress) // returns a Promise
files.addEventListener("uploaded", (e) => attach(e.detail.result))
invite.form = defineForm({ name: "invite_teammate", title: "Invite a teammate", fields: { … } })
invite.send = async (values) => (await sendInvite(values)).problems // shown under their fields
playlist.items = [{ value: "intro", label: "Intro", locked: true }, { value: "harbor", label: "Harbor Lights" }]
playlist.addEventListener("valuechange", (e) => save(e.detail.value)) // the keys in their new order
pages.items = [{ value: "guides", label: "Guides", children: [] }, { value: "faq", label: "FAQ" }]
pages.addEventListener("itemschange", (e) => save(e.detail.value)) // the items, nested again
```

- `<uiset-table>` puts your `<table>` in a scroll area named by `label`. With `stack`, below
  30rem of its own width each row becomes a block of labelled values: each cell is labelled
  by its column's heading, and the parts state their table roles, which browsers drop when
  CSS changes a table's display. A cell's own `data-label` stays. `data-align="end"` aligns a
  column. Rows added later are labelled too, and a framework can add and remove the table
  where it put it.
- `<uiset-avatar-group>` shows `max` avatars, then a count of the rest, named in words ("2
  more"; `more-label` with `{count}` words it). `total` counts avatars you didn't render.
- `<uiset-count-badge>` shows `count`, "99+" past `max`, a dot with `dot`, and nothing at 0
  unless `show-zero`. `label` is what screen readers and agents hear, so say what's counted.
- `<uiset-code-block>` colors code with shiki, when it's on the page, as the chat does. The
  caption is `caption` (the language without one); `copy="false"` leaves out the copy
  button, which is named for the caption ("Copy app.tsx"). `wrap` wraps long lines.
- `<uiset-package-command>` takes `install` (with `dev`) or `run`. The choice of package
  manager is one for every command on the page, React's included, and kept for the next
  visit. `<uiset-code-tabs>` is the same tabs for any `items`; its `value` is the tab showing.
- `<uiset-inline-edit>` is React's `InlineEdit` on the same primitive: a press, Enter or F2
  edits, Enter or leaving saves, Escape cancels, and text `validate` refuses stays in the
  field with the problem. `actions` adds Save and Cancel for touch. Agents call `setValue`,
  `startEditing` and `cancel` by its label.
- `<uiset-tag-input>` is React's `TagInput` on the same primitive and rules, drawn with UI
  SDK's combobox and field: a comma (each character of `delimiters`) or Enter adds a tag, a
  pasted list splits, leaving adds what's typed (`add-on-blur="false"` keeps it), and Enter,
  F2 or a double-click edits a tag in place. `value` is a list (`value="React, CSS"` in
  HTML), `max`, `max-length`, `unique`, `placeholder`, `description`, `name`, `required`,
  `readonly`, `disabled` and `error` are attributes; `suggestions`, `validate`, `transform`
  and `messages` are properties. It fires `valuechange` (`preventDefault()` refuses). Agents
  call `setValue`, `add` and `remove` by its label, and hear why a tag is refused.
- `<uiset-phone-input>` is React's `PhoneInput` on the same primitive and rules: a country
  button (UI SDK's combobox, searched by name, code or calling code) and the number,
  formatted as typed with the caret kept, left to right on any page. `value` is E.164,
  `country` an ISO code; `default-country`, `name`, `required`, `readonly`, `disabled`,
  `placeholder`, `description`, `error` and `locale` are attributes, and `validate`,
  `messages`, `countries` and `preferredCountries` properties. It fires `valuechange` and
  `countrychange`. The phone rules (with libphonenumber-js) load as their own chunk the first
  time one connects. Agents call `setValue(text, country?)` and `setCountry(query)`.
- `<uiset-masked-input>` is React's `MaskedInput` on the same primitive and masks: `mask` is
  `card-number`, `card-expiry`, `card-code`, `iban`, `currency` (with `currency` and
  `locale`) or `pattern` (with `pattern`). It formats as typed with the caret kept, names a
  card's brand, an IBAN's country or a currency's symbol beside the text, and checks itself
  when it's left. `value` is what it reports; `label`, `placeholder`, `description`, `name`,
  `required`, `readonly`, `disabled` and `error` are attributes, `validate` and `messages`
  properties. It fires `valuechange`. Agents call `setValue(text)` in any format; a card
  number and code are secret to them.
- `<uiset-upload>` is UI SDK's file input with the upload queue: files go up `concurrency`
  at a time (3), each row shows a preview, its size, status and progress, with Cancel, Retry
  and Remove, and files that fail `accept`, `max-size` or `max-files` are listed with why.
  The list is one tab stop: Enter on a row that stopped retries it, Delete removes it. It
  fires `valuechange`, `itemschange`, `uploaded`, `failed` and `reject`; `labels` and
  `messages` word it.
- `<uiset-schema-form>` is React's `SchemaForm` on the same primitive: set `form` to what
  `defineForm` returns (exported from `@uiset/web`) and `send` to what sends the values;
  problems it returns show under their fields. It draws UI SDK's own fields, steps and a
  review; `value` is live for `v-model`, and agents fill it by field name or label while a
  person presses the submit. See [Forms](./forms.md#web-components).
- `<uiset-sortable-list>` is React's `SortableList` on the same primitive: set `items`, and
  drag an item or pick it up with Space. `multiple` lets a selection move together, an item
  with `locked` stays put, and `numbered` shows places. `value` (the order) and `selected` are
  live; it fires `valuechange` and `selectedchange`, and agents call `moveItem` and
  `selectItems` by its label. See [Sortable lists and trees](./lists.md#web-components).
- `<uiset-sortable-tree>` is React's `SortableTree` on the same primitive: set nested `items`
  and drag a row up, down and sideways, or press Space and use the arrows. Only branches
  hold items; a drop elsewhere goes back and says why. `items` and `expanded` are live; it
  fires `itemschange`, `expandedchange` and `action`, and agents call `moveItem`,
  `expandItem` and `collapseItem` by its label.

### Confirm button

`<uiset-confirm-button>` is for something hard to undo: the first press arms it and says
`confirm-label`, the second fires `confirm` with `{ source, waitUntil }`. Escape, leaving it
or `timeout` (4000 ms) disarms it, and a second press within 600 ms doesn't count. `confirm`
tells agents what it does: the bridge asks the person first, and an approved press acts.

```html
<uiset-confirm-button confirm="Deletes the Atlas project" confirm-label="Press again to delete">
  Delete project
</uiset-confirm-button>
```

### Radio cards

React's `RadioCard` is UI SDK's own elements in UISet's classes: each card is a `ui-field`,
so its radio is named by the title alone and described by the line under it, and a press
anywhere on the card chooses it. `web/index.html` has a set.

```html
<ui-field>
  <ui-field-label>Plan</ui-field-label>
  <ui-radio-group class="uiset-radio-cards" default-value="pro">
    <ui-field class="uiset-radio-card">
      <ui-radio value="pro"><ui-radio-indicator></ui-radio-indicator></ui-radio>
      <span class="uiset-radio-card-text">
        <ui-field-label>Pro</ui-field-label>
        <ui-field-description>Per month, for growing teams.</ui-field-description>
      </span>
      <span class="uiset-radio-card-aside">$20</span>
    </ui-field>
  </ui-radio-group>
</ui-field>
```

### A textarea's count

`<uiset-textarea-count>` counts its field's textarea against the limit as people type. In the
field's description, a screen reader hears it with the textarea; near the limit it says how
many are left, once at `warn-at` (20) and once at none. With no `max` it takes the textarea's
`maxlength`; `messages` translates its words.

```html
<ui-field>
  <ui-field-label>Release notes</ui-field-label>
  <ui-textarea><textarea maxlength="160"></textarea></ui-textarea>
  <ui-field-description class="uiset-textarea-count">
    <uiset-textarea-count max="160"></uiset-textarea-count>
  </ui-field-description>
</ui-field>
```

### Password rules

`<uiset-password-rules>` lists the rules a new password has to meet as `<li>` children, each
with `data-min-length`, `data-pattern` (a regular expression) or both. It reads its field's
password input as people type, ticks off each rule, says "Done" or "To do" to screen readers,
and announces a rule that changes, once. `label` names the list ("Password rules").

```html
<ui-field>
  <ui-field-label>Create a password</ui-field-label>
  <ui-password-input>
    <input autocomplete="new-password" />
    <ui-password-input-toggle><button aria-label="Show password"></button></ui-password-input-toggle>
  </ui-password-input>
  <uiset-password-rules>
    <li data-min-length="12">At least 12 characters</li>
    <li data-pattern="\d">A number</li>
  </uiset-password-rules>
</ui-field>
```

### Rings

`data-shape="ring"` on a `ui-meter` or `ui-progress` draws it as a ring filled to its value,
with `ui-meter-value` in the middle and `ui-meter-label` under it. A `ui-progress` with no
value turns a quarter of its ring, held still for reduced motion.

```html
<ui-meter data-shape="ring" value="62">
  <ui-meter-value></ui-meter-value>
  <ui-meter-label>Reading goal</ui-meter-label>
</ui-meter>
```

### Scroll areas

A `ui-scroll-area` fades where its content runs on past an edge. `data-fades="none"` on it
turns that off, and `--uiset-fade` sets how far the fade reaches. `data-frame="none"` drops
its border and padding, for one inside a larger surface, and it fills the space it's given.

The kits and templates scroll in UI SDK's scroll areas too: the chat thread, the terminal,
the data grid, the schedule, the board, the chart's table, the IDE's files, tabs and code, the
rich text editor and the agent snapshot. Each one's old scrolling class (like
`chat-thread-scroller` or `data-grid-scroller`) is on the viewport, the element that scrolls.
Two keep the browser's own scrolling, since what's inside them is your own markup:
`<uiset-status-bar>` and `<uiset-pull-refresh>`.

## Payments

The Payments kit's three elements, on the same masks and sums as React's. `web/payments.html`
has them side by side.

```html
<uiset-payment-fields id="payment"></uiset-payment-fields>
<uiset-pay-button id="pay" currency="USD" locale="en-US"></uiset-pay-button>
<uiset-order-summary id="order" currency="USD" locale="en-US" shipping="6" quantities></uiset-order-summary>
```

```ts
order.lines = [{ id: "mug", name: "Stoneware mug", quantity: 2, price: 18.5 }]
order.applyCode = (code) => (code === "WELCOME10" ? { code, amount: 10 } : "That code isn't one we know.")
pay.amount = order.total
order.addEventListener("quantitychange", () => (pay.amount = order.total))
pay.addEventListener("pay", (event) => {
  if (!payment.check()) return
  event.detail.wait(charge(payment.value))
})
```

- `<uiset-payment-fields>`: `value` (`{ method, card, bank }`), `methods`, `messages` and
  `maskMessages`. `check()` shows what's missing under each field, focuses the first, and
  returns whether the payment can be sent. Fires `valuechange`.
- `<uiset-order-summary>`: `lines`, `discount`, `applyCode` and `messages` are properties;
  `currency`, `locale`, `shipping`, `tax`, `quantities` and `heading` (`2`, `3` or `false`)
  attributes. `total` is the sum. Fires `quantitychange` and `discountchange`.
- `<uiset-pay-button>`: `amount` (a property or an attribute), `currency`, `locale`,
  `method` ("the card ending 4242") and `disabled`. It fires `pay`; `event.detail.wait()`
  keeps it busy until your promise settles. An agent's press waits for a person.

## Address

`<uiset-address-fields>` is the Address kit's element, on the same rules as React's
`AddressFields`. `web/address.html` checks one on Save.

```html
<uiset-address-fields id="address" label="Delivery address" section="shipping" default-country="US"></uiset-address-fields>
```

```ts
address.preferredCountries = ["US", "CA", "GB"]
form.addEventListener("submit", (event) => {
  event.preventDefault()
  if (address.check()) save(address.value)
})
```

- `value` is the address, `{ country, name, line1, line2, district, city, region, postalCode }`;
  setting it fires nothing. `countries`, `preferredCountries`, `regions` and `messages` are
  properties; `label`, `section` (`shipping` or `billing`, for autofill), `default-country`
  and `locale` attributes.
- `check()` shows what's missing or wrong under each field, focuses the first, and returns
  whether the address is whole. Fires `valuechange`.
- An agent sees one component named by its `label` and fills it with `fill`, by field name
  or label.

## Page templates

Every React page template is a web page too, in `web/templates/`, built only from UI SDK's
elements and UISet's. Each one's sample data is a framework-free module the React template
imports as well (`registry/uiset/ui/templates/*-sample.ts`), so the two show the same thing.

| Page | What it shows |
| ---- | ------------- |
| `auth.html` | Sign in, sign up, forgot and reset password, verify a code: browser checks, server messages, a strength meter |
| `pricing.html` | Plans with a monthly or yearly switch, a comparison table and questions |
| `dashboard.html` | A date range that rescopes the figures, charts and recent orders, in the App Shell |
| `admin.html` | Records with search, filters and export; create and edit in a drawer; confirmed bulk delete |
| `settings.html` | Profile, security, notifications, billing with usage and invoices, team, and a danger zone |
| `inbox.html` | Folders, a message list you arrow through, the message with star, archive, delete and Undo, and compose |
| `chat-app.html` | Chats, the conversation and a composer with a model picker and usage, streaming from a stand-in model |
| `project-board.html` | Sprint progress and the issues as a board or a list, with search, a person filter, card details, a new-issue form and Undo |
| `calendar-app.html` | A day, a week (`uiset-schedule`) or a month (`uiset-schedule-month`), a small month that jumps to a day, calendars to show or hide, and what's next |
| `../ide.html` | The IDE in resizable panes |

The chat app streams from `sampleAssistant` (`templates/chat-app-sample.ts`), an async
generator of events (text, reasoning, tool calls, sources). Swap in your model there; the
page turns its events into the chat's message parts, the same shape AI SDK's `useChat`
holds, so `useChat`'s `messages` and `status` can go into `<uiset-chat>` directly instead.

## Server-rendered HTML

A framework that hydrates expects the HTML it rendered on the server, and UISet's elements
draw themselves as they're defined. Mark the container the framework hydrates with
`data-uiset-hydrating`: the elements under it are defined, so the framework sets their data
as properties, but they wait to draw until the attribute goes. Remove it once hydration is
done:

```html
<div id="app" data-uiset-hydrating><!-- the server's HTML --></div>
```

```ts
import "@uiset/web"

hydrate() // your framework's
document.getElementById("app")!.removeAttribute("data-uiset-hydrating")
```

`<uiset-root>` doesn't wait, so the skin is there from the start. The module imports on a
server and defines nothing there.

## Vue, Svelte and Solid

[Vue](./vue.md) and [Svelte](./svelte.md) each have a guide: setup, passing arrays and
objects, events, two-way binding, skins, server rendering, and using UI SDK's own Vue and
Svelte components under UISet's stylesheet. Every code block in them ran in a real app.

Solid renders custom elements as they are; listen with `on:valuechange`. UI SDK's Solid
adapter works with `uiset.css` too, since the same `data-slot` attributes mean the same
styles.

## React and the web

Every kit is an element set, and every page template is a web page: Studio, Mobile, Board,
Scheduler, Canvas, the IDE, the Agent Console, the Terminal, Charts with the sparkline and
stat, the Data Grid, Chat and the App Shell, and the auth, pricing, dashboard, admin,
settings, inbox, chat app and IDE pages. The rest of the registry wraps UI SDK's own
components, which are already elements here (`ui-*`, dressed by `uiset.css`); UISet's
pieces without behavior (badge, alert, card, item and description lists, breadcrumbs,
skeleton, spinner, kbd) are classes in the same stylesheet.

The three small parts with behavior of their own are elements too:

```html
<uiset-search-field label="Search mail" placeholder="Search mail…" shortcut="/"></uiset-search-field>
<uiset-copy-button value="npm i @uiset/web" label="Copy" copied-label="Copied"></uiset-copy-button>
<uiset-stepper label="Setup progress" value="details"></uiset-stepper>
```

- `<uiset-search-field>` fires `valuechange` with `{ value }`; `shortcut` ("/" by default,
  `shortcut=""` for none) focuses it from anywhere, through UI SDK's shared shortcuts, and
  shows as a key hint until something is typed. Clear empties it and keeps focus, and
  fires `input` on the field's input as typing does, so a two-way binding follows it.
- `<uiset-copy-button>` copies `value`, announces "Copied" and shows it for a moment, or
  "Couldn't copy" when the browser refuses. `full-label` is a fuller name where several share
  a page, like "Copy app.tsx"; start it with the visible label.
- `<uiset-stepper>` takes `steps` (`{ value, label, description? }`) and `value`; choosing a
  step sets `value` and fires `valuechange`. With `linear` (on unless `linear="false"`),
  later steps wait until the current one is reached.

## Tests

`tests/e2e/web/` runs against plain HTML with no React on the page: axe in every skin
and both themes, the root's attributes, skins restyling UI SDK's elements, the knob and
swipe rows by keyboard, the patch bay by keyboard, by script and by an agent, the Studio
instruments, a UI SDK dialog's focus, and the built files themselves (the module in a
browser and in Node, the stylesheet's reach, and the type declarations).
`frameworks.spec.ts` does by hand what Vue and Svelte do to custom elements: attributes set
as properties, `"false"` for a false binding, lists as text, and children added after an
element mounts. Two unit tests guard the rest: no element may have a member that hides one
of its attributes, and every element the build defines must be in the types. `mobile.spec.ts`,
`board.spec.ts`, `scheduler.spec.ts`, `canvas.spec.ts`, `ide.spec.ts`,
`agent-console.spec.ts`, `terminal.spec.ts`, `charts.spec.ts`, `data-grid.spec.ts` and
`chat.spec.ts` cover those kits' pages, and `templates.spec.ts` the page templates (`web/mobile.html`, `web/board.html`,
`web/schedule.html`, `web/canvas.html`, `web/ide.html`, `web/agent.html`,
`web/terminal.html`, `web/charts.html`, `web/data-grid.html`, `web/chat.html`) the same way: axe in all six skin and theme pairs,
keyboard, pointer, events, script and agents.
