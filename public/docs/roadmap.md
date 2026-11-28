# Roadmap

Updated 2026-11-28. What we're building, what comes next, and what we won't do. What
shipped is in the [changelog](https://github.com/superzero11/uiset/blob/main/CHANGELOG.md), and
the decisions behind it in [HISTORY.md](https://github.com/superzero11/uiset/blob/main/HISTORY.md).
Sizes: S small, M medium, L large.

## How we order it

First, what UI SDK's own showcase of styled screens does and UISet doesn't yet: UISet should
already be past anything styled on UI SDK. Then what developers ask for most, by the votes on
shadcn/ui and UI SDK threads, then what nobody ships. Each piece has to beat a plainly styled
version: a kit around it, agents, five skins, sound and motion, and tests in all of them.

## Now

**The inputs asked for most: 0.7.0, tested and ready to publish.** The tag input (and a schema form's
`tags` field), the phone input (a country picker, E.164, right to left; a schema form's
`phone` field) and input masks (cards, expiry dates and codes, IBANs, amounts, patterns; a
schema form's `mask` and `currency`), each in React and Web Components, with agents. M

**Checkout and invoices: 0.7.0, tested and ready to publish.** the payments and address kits (252
countries), and the checkout and invoice templates on them, React and Web Components. M

**Solid 2.0, natively: paused for 0.7.0.** `@uiset/solid`: the root, every component and nine
kits written, a preview in the docs; five kits, eleven templates and the package left
([plan](https://github.com/superzero11/uiset/blob/main/design/solid-plan.md)). L

**Tests through the agent bridge, in place.** Behavior runs in Vitest through UI SDK's agent
bridge (1,499 tests in about three minutes); Chrome runs 1,149 browser tests (Solid's 198 too),
WebKit and Firefox 791 each. Left: WebKit's big pages at one worker, and 21 Firefox axe scans. M

## Next, in order

1. **Data grid: filters and saved views.** A filter bar with typed operators, saved views,
   and agents setting a filter by name. M
2. **Emoji picker, draggable tabs and a media player.** Reactions in chat, IDE tabs that
   reorder, and a player whose scrubber snaps to chapters, beside Studio. M each
3. **Locale packs.** Every component's and kit's built-in words translated, with
   right-to-left tested packs for the main languages. UI SDK ships none. M
4. **Theme import and exports.** Bring in a tweakcn or shadcn/ui preset, with contrast
   repair; export to Tailwind `@theme`, Figma variables and DESIGN.md. S
5. **Data grid: remote rows, tree rows and detail rows.** Server sort, filter and cursor
   paging. M–L
6. **App shell variants.** Menus that fly out when the sidebar is collapsed, drill-down, a
   double sidebar, a top bar. M
7. **More templates.** Travel booking, profile, helpdesk tickets and a file manager. S each
8. **Light and dark in every skin, and the Print skin.** Light Blueprint and Studio first
   ([#1](https://github.com/superzero11/uiset/issues/1)), then a dark Ink and a light Phosphor;
   Print (Swiss and letterpress type), like Cockpit and Paper later, comes in both. M–L
9. **SaaS console screens.** Team and roles, API keys and webhooks, an audit log, usage,
   CSV import. M

Between these, small ones: dialogs and popovers that open in place (UI SDK's `inline`), tree
select, matches marked in combobox results, an autocomplete that loads from a server,
swiping a toast away, a context menu on any area, an Angular guide, and focus that moves in
the same task in the 24 places the lint still lists.

## Then: motion and developer tools

- **Animated scenes and kits**, built on the motion above: the Library's Illustrations
  (animated scenes for landing pages), and kits and templates whose movement shows what
  changed. L
- **Developer tools:** Agent view as a browser extension for any UI SDK app; upgrade help,
  a per-item diff when UI SDK moves so your edits survive; a starter app with the templates
  as routed pages. M each

## Later

A map kit, a seat map, a Gantt chart, dragging onto dates and cards, a swipe deck and a
radial menu for the mobile kit, a window manager and resizable panels, sticky notes on the
canvas, a dashboard grid, a document viewer, voice in chat, the Cockpit and Paper skins,
more templates (onboarding, an agent-wired settings console, a docs site), generative UI
adapters, and a skin that follows the season where the person is (started, then paused).

## Following UI SDK

UI SDK is in public beta. UISet pins its exact version and moves with each release once the
tests for what the release changes pass. UISet is on 0.1.0-beta.16. Problems we find in UI
SDK go upstream with a test that shows them. Open now:
[#780](https://github.com/vercel-labs/ui/issues/780) (a wheel in a drawer in WebKit),
[#905](https://github.com/vercel-labs/ui/issues/905) (a tree reorder that knows which items
take children), [#927](https://github.com/vercel-labs/ui/issues/927) (a scroll area that
stops following after a sub-pixel move; a contributor's fix waits for a pull request) and
[#928](https://github.com/vercel-labs/ui/issues/928) (a press on the page lost while a modal
closes; its cause is found). Fixed in beta.14:
[#929](https://github.com/vercel-labs/ui/issues/929) (a closing popup still counted by the
agent bridge). Fixed in beta.12 and beta.13, with UISet's workarounds gone: UI SDK's #848,
#856, #857, #887 and #888 (details in HISTORY.md).

## Waiting on others

- registry.directory is reviewing UISet's entry.
- [bytefer/awesome-shadcn-ui#61](https://github.com/bytefer/awesome-shadcn-ui/pull/61), quiet
  since 2026-11-16. birobirobiro/awesome-shadcn-ui listed UISet on 2026-11-18.

## Shipped so far

The root and five skins with sound and haptics; all 55 UI SDK components styled, plus app
frame, data display and form parts, and the small ones from UI SDK's showcase (scroll edge
fades, radio cards, rings, a textarea's count, password rules, a confirm button); a
sortable list and a sortable tree, and files dragged into folders in the IDE; fourteen
kits (chat, rich text, data grid, charts, board, scheduler, canvas, IDE, mobile, terminal,
Studio, Agent Console, payments, address); twelve page templates; Web Components for every kit
and template; a schema form agents fill by field name; [agent-check](./agent-check.md),
which scores whether agents can use a page; and the theme generator.

## What we won't do

- Copy the look of a real product or brand. Every skin is an original design.
- Put a second UI library underneath. Behavior always comes from UI SDK.
- Use "Vercel" in a product name. UISet is a community project, not affiliated with Vercel.

## Asking for things

Ask for a component, kit or template, or share what you're building, in
[Discussions](https://github.com/superzero11/uiset/discussions); report a bug as an
[issue](https://github.com/superzero11/uiset/issues). Kits and templates that many people
need come first.
