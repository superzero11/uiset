# Changelog

UISet follows UI SDK's beta. Each release pins exact `@ui-sdk/*` versions, and the notes say
which. Until UI SDK reaches 1.0, a minor release of UISet (0.2, 0.3) may change an API;
those changes are listed under **Changed** with what to do. Patch releases only fix things.

Registry items are source code copied into your app. To take a release, add the items
again (`npx shadcn@latest add superzero11/uiset/<item>`) and review the diff.
`@uiset/web` is a package: update it like any other.

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
