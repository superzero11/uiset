---
name: uiset
description: Builds interfaces with UISet, the themes, components, kits and templates for Vercel's UI SDK installed with the shadcn CLI. Covers installing items, wrapping an app in <UISet> and choosing a skin (base, blueprint, studio, phosphor, ink) or key color, picking the right kit (chat, rich text, data grid, charts, board, scheduler, canvas, IDE, mobile, terminal, agent console) or page template, styling your own parts so they follow every skin, keeping controls named for agents, and the Web Components build for Vue, Svelte, Solid and plain HTML. Use whenever a project has components/ui/uiset.tsx or @uiset/web, or the user mentions UISet.
---

# Build with UISet

UISet is UI SDK's components with skins, plus the kits apps are made of. Behavior (keys,
focus, ARIA, popups, the agent bridge) is UI SDK's; UISet adds the look, sound and
haptics, and the larger parts UI SDK doesn't ship. Items install with the shadcn CLI into
`components/ui/` and import each other relatively.

## Read first

- `references/catalog.md` in this skill lists every item, what it is, and its docs page.
- Each kit has its own skill with its docs (`uiset-chat`, `uiset-data-grid`, `uiset-rich-text`,
  `uiset-charts`, `uiset-scheduler`, `uiset-board`, `uiset-canvas`, `uiset-ide`, `uiset-mobile`,
  `uiset-terminal`, `uiset-studio`, `uiset-agent-console`, `uiset-app-shell`, `uiset-forms`,
  `uiset-lists`). Load the one for the kit you're using.
- The docs are in the UISet repo's `docs/` folder and at https://uiset.dev/docs/README.md.
  Read only the page for the item you're using.
- For a base component's API and keys (select, dialog, menu…), read UI SDK's installed docs:
  `node_modules/@ui-sdk/react/docs/llms.txt`, then the component's page. UISet's version of
  it takes the same props.

## Install and wrap

```bash
npx shadcn@latest add @uiset/uiset @uiset/button @uiset/field
```

```tsx
import { UISet } from "@/components/ui/uiset"

<UISet skin="base">{children}</UISet>
```

- `skin`: `base` (adopts the page's shadcn theme, or `keyColor={{ l, c, h }}`),
  `blueprint`, `studio`, `phosphor` (dark only) or `ink` (light only). Themed skins name
  fonts to load (see docs/theming.md).
- `theme`: `system`, `light` or `dark`. `sound` turns on interaction sounds.
- Each skin animates openings, closings, on and off, and moves its own way, and follows
  the system's reduced motion. `motion="reduce"` quiets a root whatever the system says (an app's own switch);
  `--uiset-motion-speed` scales every duration. Don't add your own transitions to popups.
- Everything inside takes the skin, popups included. Skins nest: the nearest root wins.

## Rules

1. **Don't hand-roll behavior.** No custom keydown handlers, focus traps, roving tabindex
   or ARIA roles for something a UI SDK component or `@ui-sdk/core` behavior covers. If a
   part is missing, look for a UISet item first, then build it from `@ui-sdk/core`
   behaviors (the `ui-sdk` skill explains how).
2. **Name every control.** UI SDK's agent bridge finds controls by accessible name. Use a
   visible label (`FieldLabel`, `SelectLabel`, a `label` prop on kits) or `aria-label` on
   icon buttons. Names should be specific: "Search orders", not "Search". Mark destructive
   buttons with `data-agent-confirm="what it does"` so an agent asks a person first.
3. **Style with the variables**, never fixed colors: `var(--ui-background)`,
   `--ui-foreground`, `--ui-muted`, `--ui-muted-foreground`, `--ui-border`, `--ui-input`,
   `--ui-primary`, `--ui-primary-foreground`, `--ui-ring-border`, `--ui-radius`,
   `--tone-success|warning|danger|info`, `--chart-1`…`--chart-8`. Then the part follows
   every skin and theme, and keeps the contrast the skins guarantee.
4. **Don't override skin CSS with `!important`** or restyle `[data-slot]` parts globally.
   Put a class on the part and style that.
5. **Prefer a kit to a pile of parts.** A chat UI is the chat kit, a table with sorting is
   `data-grid`, a calendar is `scheduler`, rich text is `rich-text`. A whole page may
   already be a template (`dashboard`, `settings`, `auth`, `inbox`, `chat-app`, `admin`,
   `pricing`, `ide-app`, `project-board`, `calendar-app`).
6. **Agents read values the same way people see them**: a data grid's rows, a rich text
   editor's Markdown, a schedule's events. When you add a control that holds data, keep
   its value in the component (controlled or not), not only in the DOM.

## Common tasks

| Task                                   | Use                                                        |
| -------------------------------------- | ---------------------------------------------------------- |
| A form                                 | `field` (Field, FieldLabel, Input, FieldError), `select`, `checkbox`, `switch`, `button`; native `<form>` |
| A card number, expiry, IBAN, amount or a pattern | `input-mask` (`MaskedInput` with `cardNumber()`, `cardExpiry()`, `cardCode()`, `iban()`, `currency()`, `pattern()`: formatted as typed, checked when left; agents `setValue` in any format). Not a regex on `onChange` |
| A phone number                         | `phone-input` (`PhoneInput`: a country picker, formatted as typed, E.164 `value`; agents `setValue` in any format and `setCountry`). Not a plain `type="tel"` input with a regex |
| Tags, keywords or email recipients in a field | `tag-input` (`TagInput`: a comma or Enter adds, a paste splits, Enter or F2 edits a tag; `max`, `validate`; agents `add` and `remove`). A form's `tags` kind in `schema-form` |
| An app frame                           | `app-shell` (sidebar that collapses, drawer on phones), `page-header`, `breadcrumbs` |
| Status and data display                | `badge`, `stat`, `alert`, `empty-state`, `skeleton`, `description-list`, `item-list` |
| An AI agent's work: approvals, subagent runs, checkpoints, a queue, AI SDK messages | `chat-message-parts` (draws `UIMessage` parts), `chat-parts` (`ChatTool` with `onApprove`, `ChatSubagent`, `ChatCheckpoint`), `chat-composer` (`ChatQueue`, `ChatUsage`) |
| A number that moves, streamed text, a wait, content swapped in place | `number-ticker`, `text-reveal`, `thinking`, `crossfade` (each skin moves its own way; don't hand-roll counters or typewriters) |
| A chat with a model                    | `chat`, `chat-response`, `chat-parts`, `chat-message-parts` (AI SDK messages), `chat-composer`, `chat-sidebar`, or the `chat-app` template |
| Rich text                              | `rich-text` (`RichTextEditor`, `RichTextContent`; Markdown and HTML in and out) |
| Tables                                 | `data-grid`                                                |
| A list people put in order            | `sortable-list` (`SortableList`: drag or Space and arrows, `multiple`, `locked`; agents `moveItem`) |
| A tree people reorder and nest         | `sortable-tree` (`SortableTree`: nested `items`, only branches hold items; agents `moveItem(item, into)`). A file browser is `tree` or the `ide` kit |
| A region that scrolls                  | `scroll-area`: `ScrollBox` with `axis` and `viewport`; `data-frame="none"` inside a panel. Not `overflow: auto` on a div |
| Charts                                 | `line-chart`, `bar-chart`, `scatter-chart`, `heatmap`, `segmented-bar`, `sparkline` |
| Let an agent act in the app            | UI SDK's `createAgent`, plus `agent-console` for approvals and undo |
| Vue, Svelte, Solid or plain HTML       | `@uiset/web`: `<uiset-root>` and the `<uiset-*>` elements (docs/web-components.md) |

## Check your work

- Run axe on the page in each skin you ship (`@axe-core/playwright`), and tab through it.
- Look at it in light and dark, and at phone width.
- `window.agent.snapshot()` (with UI SDK's agent installed) should list every control
  with a name.
