# UISet

Themes, components, kits and templates for [Vercel's UI SDK](https://ui-sdk.dev).

UI SDK handles how interfaces behave: keyboard, focus, selection, popups, ARIA, and an
agent bridge that lets AI agents read and operate the page. UISet builds everything else
on it: skins that change how it looks, sounds and feels, the kits apps are made of (chat,
data grid, charts, board, scheduler, canvas, IDE, terminal and more) and whole page
templates, for React and as Web Components. Switch skins and nothing about behavior
changes.

> UI SDK is in beta, and so is UISet. APIs may change before 1.0; see [Versioning](#versioning).

## Install

UISet is a shadcn registry. Add the root once, then any component:

```bash
npx shadcn@latest add superzero11/uiset/uiset
npx shadcn@latest add superzero11/uiset/slider superzero11/uiset/switch
```

This copies the source into `components/ui/` and installs `@ui-sdk/core` and
`@ui-sdk/react`. No Tailwind required.

## Use

Wrap your app, or any part of it, in `<UISet>`:

```tsx
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { UISet } from "@/components/ui/uiset"

export function Settings() {
  return (
    <UISet skin="blueprint" sound>
      <Slider aria-label="Volume" defaultValue={64} />
      <label>
        <Switch name="night-mode" /> Night mode
      </label>
    </UISet>
  )
}
```

| Prop       | Default    | What it does                                                      |
| ---------- | ---------- | ----------------------------------------------------------------- |
| `skin`     | `"base"`   | `"base"`, `"blueprint"`, `"studio"`, `"phosphor"` or `"ink"`.     |
| `keyColor` | —          | `{ l, c, h }` in OKLCH. The accent; text on it picks black/white. |
| `theme`    | `"system"` | `"light"`, `"dark"` or `"system"`.                                |
| `sound`    | `false`    | Synthesized interaction sounds, tuned per skin.                   |
| `haptics`  | `true`     | Vibration on Android, the system haptic on iOS 18+ Safari.        |

The base skin adopts an existing shadcn/ui theme (`--background`, `--primary`, …) when
your page has one, so UISet components match the rest of your app.

| Skin        | Look                                                                    | Scheme | Faces to load                                  |
| ----------- | ----------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| `base`      | Your shadcn theme, or one built from `keyColor`                         | both   | none (your app's)                              |
| `blueprint` | A technical drawing: cyanotype paper, linework, hatching                | dark   | Barlow Semi Condensed                          |
| `studio`    | A synth rack: gunmetal panels, rubber pads, amber lamps                 | dark   | Saira Semi Condensed                           |
| `phosphor`  | A green-screen terminal: intensity, inverse video, faint scan lines     | dark   | Spline Sans Mono                               |
| `ink`       | E-paper: ink on grey, dotted greys, a reading serif, no motion at all   | light  | Literata, Atkinson Hyperlegible                |

Each skin falls back to system faces when its own aren't loaded. Load them from Google
Fonts (or self-host them) for the intended look.

### Studio kit

A synth rack built from UI SDK behaviors. Try it, with sound, on the gallery.

```bash
npx shadcn@latest add superzero11/uiset/knob superzero11/uiset/patch-bay \
  superzero11/uiset/fader superzero11/uiset/level-meter superzero11/uiset/step-sequencer
```

| Component       | Built on                                   | Notes                                                                                  |
| --------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `Knob`          | a new primitive: `bindDrag`, `stepFromKey` | Drag up/down (Shift for fine), arrows, Page, Home/End, log scales, double-click resets |
| `PatchBay`      | a new primitive: `createConnect`           | Patch by drag, by keyboard (Enter, arrows, Enter) or by agent (`plug`, `unplug`)       |
| `Fader`         | `Slider`                                   | Vertical, with label and readout                                                       |
| `LevelMeter`    | `Meter`                                    | LED ladder: green, amber, red                                                          |
| `StepSequencer` | `ToggleGroup`                              | One tab stop, arrow keys, downbeats, a playhead                                        |

```tsx
<UISet skin="studio" sound>
  <Knob label="Cutoff" min={80} max={8000} scale="log" defaultValue={900} />
  <PatchBay
    aria-label="Patch bay"
    labels={{ "lfo:out": "LFO out", "cutoff:in": "Filter mod in" }}
  >
    <PatchBayJack port="lfo:out" label="LFO out" />
    <PatchBayJack port="cutoff:in" label="Filter mod in" />
  </PatchBay>
</UISet>
```

### Chat kit

Everything a chat product needs, built on UI SDK so it works with the keyboard and
screen readers, takes your skin, and is visible to agents.

| Item            | What's in it                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chat`          | Thread that follows new messages, messages, actions, versions, suggestions, plans                                                                                 |
| `chat-response` | Streaming markdown that repairs half-finished syntax, never renders raw HTML; code blocks with copy, wrap and skin-colored highlighting (shiki, loaded on demand) |
| `chat-parts`    | Reasoning that opens while the model thinks, tool calls, sources, citations, images                                                                               |
| `chat-composer` | Enter to send, ArrowUp history, `/` commands, `@` mentions, attachments by drop, paste or picker, model picker, usage meter                                       |
| `chat-sidebar`  | Chat list with rename and confirmed delete, and a floating assistant launcher                                                                                     |

```bash
npx shadcn@latest add superzero11/uiset/chat superzero11/uiset/chat-response \
  superzero11/uiset/chat-parts superzero11/uiset/chat-composer superzero11/uiset/chat-sidebar
```

### Data Grid

A grid that works like a spreadsheet, on UI SDK's grid, range, inline edit and
virtualizer behaviors.

- **Ten thousand rows:** only the visible ones render; Control+End still reaches the last.
- **Spreadsheet keys:** one tab stop, arrows, Shift to select a block, copy and paste with
  the system clipboard, Enter or typing to edit, Escape to cancel.
- **Columns:** sort (Shift for more than one), filter, group, pin, resize and move, from
  the pointer, the column menu (Shift+F10) or the keyboard. The layout can be saved.
- **Rows:** checkboxes, Shift-click ranges, bulk actions, CSV export of what you see.
- **Edits that check themselves:** numbers, dates, yes/no and lists are parsed and
  refused with a message when they don't fit.
- **Agents** sort, filter, select and edit by the names a person sees, through the same
  validation.

```bash
npx shadcn@latest add superzero11/uiset/data-grid
```

Columns, keys and agent actions: [docs/data-grid.md](docs/data-grid.md).

### Charts

Lines, areas, bars, scatter, heatmaps, part-to-whole bars, sparklines and stats with
trends, drawn with thin marks in palettes checked for color blindness in every skin.

- **Keyboard and screen readers:** each chart is one tab stop; arrows move through the
  data and every position reads in full ("Aug: Revenue $70,000, Costs $52,000").
- **A table twin** for every chart, a legend that isolates a series, and tooltips that
  never hold the only copy of a number.
- **Agents** read the values and can isolate a series, pin a point or open the table.
- No pie or donut: a segmented bar shows a whole at a glance, ranked bars compare parts.

```bash
npx shadcn@latest add superzero11/uiset/line-chart superzero11/uiset/bar-chart
```

All chart items and how they work: [docs/charts.md](docs/charts.md).

### Board

A kanban board on UI SDK's transfer behavior: drag cards with the pointer, or carry them
with Space and the arrows; column limits, add in place, a details dialog, filters, and
agents that move cards by name. [docs/board.md](docs/board.md)

```bash
npx shadcn@latest add superzero11/uiset/board
```

### Scheduler

A week, a day, a room timeline and a month, on UI SDK's spans behavior: draw, move and
resize events with the pointer or arrows, overlaps in lanes (or refused for bookings),
an event dialog, and agents that book by day and time. [docs/scheduler.md](docs/scheduler.md)

```bash
npx shadcn@latest add superzero11/uiset/scheduler
```

### Canvas

A node editor on UI SDK's viewport, move, selection and connect behaviors: pan and zoom,
drag or Alt+arrow nodes, arrows to the nearest node, wires by pointer or keyboard, box
selection, a minimap, an inspector, undo, and agents that build flows by name.
[docs/canvas.md](docs/canvas.md)

```bash
npx shadcn@latest add superzero11/uiset/canvas
```

### Mobile

Phone app parts on UI SDK: rows that swipe aside to their actions, wheel pickers, bottom
and action sheets, pull to refresh, an app bar and a tab bar, each with a keyboard path.
[docs/mobile.md](docs/mobile.md)

```bash
npx shadcn@latest add superzero11/uiset/mobile
```

### Terminal

A terminal for commands your app defines: ANSI colors kept readable in every skin, links,
streaming output with progress lines, history, Tab completion, Ctrl+C and Ctrl+L, and
agents that run commands and read the output. [docs/terminal.md](docs/terminal.md)

```bash
npx shadcn@latest add superzero11/uiset/terminal
```

### IDE

A code editor's parts on UI SDK's Tree, Tabs, Command and Textarea: a file tree with
version control marks and file operations, editor tabs, a code editor with syntax colors
and indenting, a command palette, problems and a status bar, plus a whole IDE page.
[docs/ide.md](docs/ide.md)

```bash
npx shadcn@latest add superzero11/uiset/ide
npx shadcn@latest add superzero11/uiset/ide-app
```

### Web Components, Vue, Svelte and Solid

The same skins dress UI SDK's own custom elements, so a page in plain HTML or any
framework gets UISet's look from one stylesheet, with `<uiset-root>` and UISet's
elements (knob, swipe rows) from one module. [docs/web-components.md](docs/web-components.md)

### Rich text editor

Headings, lists, to-dos, quotes, code, links and mentions, with a toolbar, Markdown as you
type, "/" for blocks and "@" for people; Markdown and clean HTML out, and agents read and
write the same Markdown. No editor library underneath. [Docs](docs/rich-text.md).

```bash
npx shadcn@latest add superzero11/uiset/rich-text
```

### Templates

Whole pages built only from UISet items, to start from a working screen: **auth** (sign
in, sign up, forgot and reset password, verify a code), **dashboard**, **settings**,
**admin** records, **inbox**, **chat-app** (plug your model in as a stream of events)
and **pricing**. See them live at `/templates` in any skin.

```bash
npx shadcn@latest add superzero11/uiset/dashboard
```

How each one plugs into your app: [docs/templates.md](docs/templates.md).

### Agent Console

The human side of UI SDK's agent bridge, for apps where an AI assistant changes things,
not just chats. Works with any model.

- **Approvals in your app:** steps marked `data-agent-confirm` wait for **Allow** in a
  card above everything, even a modal the agent opened. No `window.confirm`.
- **Activity with undo:** every change the agent made, in plain words, with **Show** to
  flash it on the page and **Undo agent changes**, which keeps your own edits.
- **Highlights:** the control an agent just changed gets outlined, and scrolled into view.
- **Thread and prompt:** follows new messages, ArrowUp brings back earlier ones, Enter
  sends without breaking input methods.
- The console hides itself from agents, so one can't approve its own request.

```bash
npx shadcn@latest add superzero11/uiset/agent-console
```

Setup and how to connect a model: [docs/agent-console.md](docs/agent-console.md).

### Skins nest

Skins only set CSS variables, so the nearest `<UISet>` always wins. Put a Blueprint
panel inside a Base page and neither leaks into the other.

### Sound and haptics for every UI SDK component

UISet listens to UI SDK's `observe()` stream, so any UI SDK component inside a
`<UISet>` root gets feedback, including ones you compose yourself, and including changes
an agent makes. Sliders tick with a pitch that follows the value. Nothing plays until
`sound` is on, and haptics stop under `prefers-reduced-motion`.

## Docs, and building with an AI agent

- [Every item and its docs](docs/README.md), [Theming](docs/theming.md),
  [Coming from shadcn/ui](docs/migrate-from-shadcn.md), and the
  [theme generator](https://uiset.dev/themes/generator), which turns one color into a
  checked theme and exports a UISet skin, shadcn/ui variables or design tokens.
- `llms.txt` and `llms-full.txt` at the site root list and contain the docs for coding
  agents; they're generated from the registry (`pnpm docs:build`), so they match what
  installs.
- An agent skill teaches coding agents to build with UISet (install, skins, naming
  controls for agents, styling with the variables, picking kits):

  ```bash
  npx skills add superzero11/uiset
  ```

## Quality bar

Every component ships only when it passes:

- axe (WCAG 2.2 AA, contrast included) in every skin, light and dark
- the same tests in Chrome, Safari (WebKit) and Firefox
- keyboard-only operation, with focus returning where it should
- the UI SDK agent test: every control named, every setting changeable by an agent,
  destructive steps refused without a person
- forced colors, reduced motion and right to left
- a clean install into a fresh app with the shadcn CLI

## Develop

```bash
pnpm install
pnpm exec playwright install chromium webkit firefox
pnpm dev            # the site at http://localhost:5620
pnpm check          # typecheck, unit tests, browser tests
pnpm registry:build # registry.json and public/r
scripts/install-test.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the rules and what a pull request needs,
[ROADMAP.md](ROADMAP.md) for what's next, and [SECURITY.md](SECURITY.md) to report a
vulnerability privately. Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Versioning

UISet follows UI SDK's beta. Each release pins exact `@ui-sdk/*` versions (now
`0.1.0-beta.2`), and the nightly build runs against UI SDK's newest beta to catch changes
early. Until UI SDK 1.0, a minor release of UISet may change an API, and the
[changelog](CHANGELOG.md) says what to do. Registry items are source in your app: to take a
release, add them again and review the diff.

## License

MIT. Built on UI SDK by Vercel Labs. UISet is a community project, not affiliated with Vercel.
