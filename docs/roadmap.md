# Roadmap

Updated 2026-11-18. What we're building, what comes next, and what we won't do. What
shipped is in the [changelog](https://github.com/superzero11/uiset/blob/main/CHANGELOG.md),
and the decisions behind it in
[HISTORY.md](https://github.com/superzero11/uiset/blob/main/HISTORY.md). Sizes: S small,
M medium, L large.

## Now

- **Agent view** on component and kit pages: what an agent reads, beside the live example,
  scored by agent-check, with the actions it can run. S–M

## Next, in order

1. **Data grid: filters and saved views.** A filter bar with typed operators, saved views,
   and agents setting a filter by name. M
2. **Data grid: remote rows, tree rows and detail rows.** Server sort, filter and cursor
   paging. M–L
3. **App shell variants.** Menus that fly out when the sidebar is collapsed, drill-down, a
   double sidebar, a top bar. M
4. **Print skin.** Swiss and letterpress type, from a written design plan first. M
5. **SaaS console screens.** Team and roles, API keys and webhooks, an audit log, usage, CSV
   import. M

Between these, small ones: a ring meter and circular progress chart, tree select, and an
Angular guide.

## Added 2026-11-18, not yet in the order

From UI SDK's own showcase of styled screens, another UI SDK library (Keyframery), and the
new project lint:

- **Sortable list and tree reordering.** Drag a row, or pick it up with Space; several at
  once; drag sideways to nest. M
- **Confirm button.** The first press arms it, the second acts. S
- **Emoji picker**, for chat reactions and rich text. M
- **Draggable tabs**, for the IDE kit. S–M
- **Password rules** that tick off as you type, and **radio cards**. S each
- **Recipes:** real tasks built from UISet's parts, filtered by part, in every skin. M
- **Same-task focus everywhere.** 24 places still move focus a frame or two late (rich text,
  IDE, chat, data grid, templates); the lint's baseline lists them. M

## Later

A media player, a map kit, a seat map, a Gantt chart, dragging onto dates and cards, a swipe
deck and a radial menu for the mobile kit, the Cockpit and Paper skins, a Solid guide, more
templates (onboarding, an agent-wired settings console, a docs site), and generative UI
adapters.

## Following UI SDK

UI SDK is in public beta. UISet pins its exact version and moves with each release once the
tests for what the release changes pass. UISet is on 0.1.0-beta.10. Problems we find in UI SDK go upstream with a test that shows them. Open
now: [#780](https://github.com/vercel-labs/ui/issues/780) (a wheel in a drawer in WebKit),
[#856](https://github.com/vercel-labs/ui/issues/856) (Pagination's dev check) and
[#857](https://github.com/vercel-labs/ui/issues/857) (web tabs named by their list). The fix
for [#848](https://github.com/vercel-labs/ui/issues/848) ships after beta.10.

## Waiting on others

- registry.directory is reviewing UISet's entry.
- Two awesome-shadcn-ui lists:
  [birobirobiro/awesome-shadcn-ui#772](https://github.com/birobirobiro/awesome-shadcn-ui/pull/772)
  and [bytefer/awesome-shadcn-ui#61](https://github.com/bytefer/awesome-shadcn-ui/pull/61).
- `@uiset/web` 0.4.0 on npm.

## Shipped so far

The root and five skins with sound and haptics; all 55 UI SDK components styled, plus app
frame, data display and form parts; twelve kits (chat, rich text, data grid, charts, board,
scheduler, canvas, IDE, mobile, terminal, Studio, Agent Console); ten page templates; Web
Components for every kit and template; a schema form agents fill by field name;
[agent-check](./agent-check.md), which scores whether agents can use a page; and the theme
generator.

## What we won't do

- Copy the look of a real product or brand. Every skin is an original design.
- Put a second UI library underneath. Behavior always comes from UI SDK.
- Use "Vercel" in a product name. UISet is a community project, not affiliated with Vercel.

## Asking for things

[Open an issue on GitHub](https://github.com/superzero11/uiset/issues) with what you're
building and what's missing. Kits and templates that many people need come first.
