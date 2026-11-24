# Introduction

UISet is the components, kits, page templates and themes for Vercel's UI SDK. It's
open source, installs with the shadcn CLI, and works in React and, through Web Components,
in Vue, Svelte, Solid, Angular and plain HTML. A Solid 2 package written in Solid is being
built for 0.7.0 ([Solid](./solid.md)).

```bash
npx shadcn@latest add @uiset/uiset
```

## Why it exists

[UI SDK](https://ui-sdk.dev) moved the hard part of UI into reusable behaviors: arrow keys,
focus, selection, dismissal, popups, drag and drop, and the ARIA that goes with them. Its
55 components are built from those behaviors, and its agent bridge lets AI agents read a
page and work its controls without screenshots.

Two things it leaves to you:

- **How it looks.** UI SDK's components are unstyled.
- **The large components apps are made of.** There's no data grid, chat, rich text
  editor, scheduler, board, node canvas, IDE or terminal.

UISet fills both, without changing the behavior underneath. Everything is still UI SDK's:
the same parts, the same names, the same keyboard and agent support.

## What's in it

| What | How many | What it gives you |
| ---- | -------- | ----------------- |
| [Components](/components) | 55, plus 31 app parts | Every UI SDK component, styled; and the app frame, data display, form, list and motion parts (sidebar layout, page header, cards, tables, badges, stats, alerts, a stepper, code blocks, inline edit, a tag input, a phone input, input masks, uploads, a sortable list and tree, a number ticker, a text reveal, Thinking, a crossfade) |
| [Kits](/kits) | 12 | Chat, rich text, data grid, charts, board, scheduler, canvas, IDE, mobile, terminal, Studio and the Agent Console |
| [Templates](/templates) | 10 | Whole pages: auth, dashboard, settings, admin, inbox, chat app, project board, calendar, pricing, IDE |
| [Themes](/themes) | 5 skins | Base, Blueprint, Studio, Phosphor and Ink, plus a [generator](/themes/generator) for your own |

Each piece is its own registry item: install only what you use, and it brings only what it
needs.

## How it works

- **The root.** `<UISet>` wraps your app (or any part of it). It holds the skin, the light
  or dark setting, and the interaction sounds. Every UISet and UI SDK component inside
  takes the skin.
- **Skins are CSS.** A skin sets CSS variables in a cascade layer. Behavior never depends on
  them, so you can switch skins live or nest one inside another.
- **Your code.** The shadcn CLI copies each item's source into `components/ui/`. Change it
  as you like; items import each other relatively, so they keep working after you move them.
- **Named for agents.** Every control has an accessible name, and each kit gives agents
  actions that mean something (a grid sorts and filters; a scheduler adds events).

## Compared with shadcn/ui

shadcn/ui styles Radix UI; UISet styles UI SDK. If you know shadcn/ui, you know the
workflow: the same CLI, the same folder, and UISet's base skin picks up your shadcn theme
variables. What's different is underneath (UI SDK's behaviors and agent bridge) and what's
included (the kits and templates). See [Coming from shadcn/ui](./migrate-from-shadcn.md).

## Status

UI SDK is in public beta (`0.1.0-beta.16`), and UISet pins that exact version. Every item is
tested for accessibility in every skin and theme, for keyboard use, for agent use, and for
a clean install into a new app. Expect API changes until UI SDK reaches 1.0; the
[roadmap](./roadmap.md) says what's next.

## Next

- [Installation](./installation.md): set up a project and add your first items.
- [Quick start](./quick-start.md): a working screen in a few minutes.
- [Looking for a component?](./looking-for.md): where the ones people ask for most are.
- [Building with AI agents](./ai.md): give your coding agent the skill and the docs.
