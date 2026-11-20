# Roadmap

Updated 2026-11-20. What we're building, what comes next, and what we won't do. What
shipped is in the [changelog](https://github.com/superzero11/uiset/blob/main/CHANGELOG.md),
and the decisions behind it in
[HISTORY.md](https://github.com/superzero11/uiset/blob/main/HISTORY.md). Sizes: S small,
M medium, L large.

## How we order it

First, what UI SDK's own showcase of styled screens does and UISet doesn't yet: UISet should
already be past anything styled on UI SDK. Then what developers ask for most, by the votes on
shadcn/ui and UI SDK threads, then what nobody ships. Each piece has to beat a plainly styled
version: a kit around it, agents, five skins, sound and motion, and tests in all of them.

## Now

**Motion, per skin.** Each skin moves its own way, as it already sounds its own way:
openings, moves and state changes, drawn from UI SDK's state, reduced motion respected.
Openings and closings are built (in 0.6.0); state changes and then moves come next. M–L

**Every kit and template page, in every skin.** The layout audit covered Base light at
desktop and phone width and fixed seven things; the other four skins, light and dark, get
the same look by eye before motion lands on them. S

## Next, in order

1. **Agent parts for AI apps.** Approvals that wait for a person, checkpoints to roll
   back to, a task queue, a context meter, subagent runs and an adapter from Vercel's AI SDK
   messages, in the chat kit and the Agent Console, with skins, sound and agents. M
2. **The inputs asked for most.** A tag input that creates and edits its chips, a phone
   number field with a country picker, and input masks for cards, IBANs and currency. M
3. **Data grid: filters and saved views.** A filter bar with typed operators, saved views,
   and agents setting a filter by name. M
4. **Emoji picker, draggable tabs and a media player.** Reactions in chat, IDE tabs that
   reorder, and a player whose scrubber snaps to chapters, beside Studio. M each
5. **Locale packs.** Every component's and kit's built-in words translated, with
   right-to-left tested packs for the main languages. UI SDK ships none. M
6. **Theme import and exports.** Bring in a tweakcn or shadcn/ui preset, with contrast
   repair; export to Tailwind `@theme`, Figma variables and DESIGN.md. S
7. **Data grid: remote rows, tree rows and detail rows.** Server sort, filter and cursor
   paging. M–L
8. **App shell variants.** Menus that fly out when the sidebar is collapsed, drill-down, a
   double sidebar, a top bar. M
9. **More templates.** Checkout, travel booking, profile, helpdesk tickets, a file manager
   and an invoice. S each
10. **Print skin.** Swiss and letterpress type, from a written design plan first. M
11. **SaaS console screens.** Team and roles, API keys and webhooks, an audit log, usage, CSV
    import. M

Between these, small ones: dialogs and popovers that open in place (UI SDK's `inline`), tree
select, matches marked in combobox
results, an autocomplete that loads from a server, swiping a toast away, a context menu on
any area, an Angular guide, and focus that moves in the same task in the 24 places the lint
still lists.

## Then: motion and developer tools

- **Animated components, kits and templates**, built on the motion above: the Library's
  Animate column, with Illustrations (animated scenes for landing pages) and Motion (text,
  numbers, transitions), and kits and templates whose movement shows what changed. L
- **Developer tools:** Agent view as a browser extension for any UI SDK app; upgrade help,
  a per-item diff when UI SDK moves so your edits survive; a starter app with the templates
  as routed pages. M each

## Later

A map kit, a seat map, a Gantt chart, dragging onto dates and cards, a swipe deck and a
radial menu for the mobile kit, a window manager and resizable panels, sticky notes on the
canvas, a dashboard grid, a document viewer, voice in chat, the Cockpit and Paper skins, a
Solid guide, more templates (onboarding, an agent-wired settings console, a docs site), and
generative UI adapters.

## Following UI SDK

UI SDK is in public beta. UISet pins its exact version and moves with each release once the
tests for what the release changes pass. UISet is on 0.1.0-beta.13. Problems we find in UI SDK
go upstream with a test that shows them. Open now:
[#780](https://github.com/vercel-labs/ui/issues/780) (a wheel in a drawer in WebKit) and
[#905](https://github.com/vercel-labs/ui/issues/905) (a tree reorder that knows which items
take children). Fixed in beta.12 and beta.13, and UISet's workarounds gone:
[#848](https://github.com/vercel-labs/ui/issues/848), [#856](https://github.com/vercel-labs/ui/issues/856)
(Pagination's dev check), [#857](https://github.com/vercel-labs/ui/issues/857) and
[#887](https://github.com/vercel-labs/ui/issues/887) (web tabs and scroll areas named as in
React) and [#888](https://github.com/vercel-labs/ui/issues/888) (`createStickToBottom` with
its rows in a wrapper).

## Waiting on others

- registry.directory is reviewing UISet's entry.
- [bytefer/awesome-shadcn-ui#61](https://github.com/bytefer/awesome-shadcn-ui/pull/61), quiet
  since 2026-11-16. birobirobiro/awesome-shadcn-ui listed UISet on 2026-11-18.

## Shipped so far

The root and five skins with sound and haptics; all 55 UI SDK components styled, plus app
frame, data display and form parts, and the small ones from UI SDK's showcase (scroll edge
fades, radio cards, rings, a textarea's count, password rules, a confirm button); a
sortable list and a sortable tree, and files dragged into folders in the IDE; twelve
kits (chat, rich text, data grid, charts, board, scheduler, canvas, IDE, mobile, terminal,
Studio, Agent Console); ten page templates; Web Components for every kit and template; a
schema form agents fill by field name; [agent-check](./agent-check.md), which scores whether
agents can use a page; and the theme generator.

## What we won't do

- Copy the look of a real product or brand. Every skin is an original design.
- Put a second UI library underneath. Behavior always comes from UI SDK.
- Use "Vercel" in a product name. UISet is a community project, not affiliated with Vercel.

## Asking for things

Ask for a component, kit or template, or share what you're building, in
[Discussions](https://github.com/superzero11/uiset/discussions); report a bug as an
[issue](https://github.com/superzero11/uiset/issues). Kits and templates that many people
need come first.
