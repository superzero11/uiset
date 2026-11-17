# Roadmap

UISet grows with UI SDK. This page says what's done, what's next, and what we won't do.

## Shipped

- **The root and five skins**: Base (adopts your shadcn theme, or one key color),
  Blueprint, Studio, Phosphor and Ink, with sound and haptics.
- **All 55 UI SDK components**, styled, each its own item; and 21 app frame, data
  display and form parts, with a table, code blocks, inline edit and uploads among them.
- **Twelve kits**: chat, rich text, data grid, charts, board, scheduler, canvas, IDE,
  mobile, terminal, Studio and the Agent Console.
- **Ten page templates**: auth, dashboard, settings, admin, inbox, chat app, project board,
  calendar, pricing and IDE.
- **Web Components**: every kit and template as custom elements, with guides for
  [Vue](./vue.md) and [Svelte](./svelte.md).
- **For coding agents**: skills, llms.txt and Markdown docs.
- **The theme generator**: one color in, a complete, checked theme out.

## Next

- **More skins.** Cockpit (guarded switches, gauges), Paper (cards, tape, corkboard) and
  Print (brutalist type), each with its own sound.
- **Framework guides.** Step-by-step setups for Angular and Solid with the Web Components
  build, after the Vue and Svelte ones.
- **More templates.** Onboarding, an agent-wired settings console, and a docs site.
- **Listing.** The shadcn registry directory, so items install as `@uiset/<item>`.

## Following UI SDK

UI SDK is in public beta. UISet pins its exact version and moves with each release after
the full test suite passes in every skin. Problems we find in UI SDK go upstream as issues,
with a test that shows them.

## What we won't do

- Copy the look of a real product or brand. Every skin is an original design.
- Put a second UI library underneath. Behavior always comes from UI SDK.
- Use "Vercel" in a product name. UISet is a community project, not affiliated with Vercel.

## Asking for things

Open an issue on [GitHub](https://github.com/superzero11/uiset/issues) with what you're
building and what's missing. Kits and templates that many people need come first.
