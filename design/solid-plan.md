# Solid 2.0: the plan

Planned on 2026-11-24. Roadmap: Next 1, "Solid 2.0, natively". The owner's call: Solid comes
before the 0.7.0 release, and goes out with it, done and checked properly.

## What there is today

- Solid apps use `@uiset/web`, the Web Components build ([installation](../docs/installation.md)).
  Nothing in UISet is written in Solid.
- UI SDK's `@ui-sdk/solid` (0.1.0-beta.16, the version UISet pins) has the same 69 entries as
  `@ui-sdk/react`: all 55 components, `primitive` (`usePrimitive`, `usePart`), `agent`,
  `observe` and `history`. It takes `solid-js` and `@solidjs/web` 2.x; Solid 1 isn't supported.
- Solid 2.0.3 is `latest` on npm. The Vite plugin is `@solidjs/vite-plugin` 3.0.1 (Vite 8, which
  UISet has); tests use `@solidjs/testing-library` 1.0.0-rc.2. Solid 2 renames props helpers
  (`merge`, `omit`), and a part's props must stay reactive: no destructuring. Solid 2 is not
  Solid 1: `node_modules/solid-js/CHEATSHEET.md` and its `skills/` are the reference.

## What gets written

UISet's React layer is about 19,700 lines: 116 component and kit files (15,400) and 12
templates (4,300). Under it sit 85 shared TypeScript files (15,700 lines: kit models,
primitives, rules, formats, feedback, sound) and the CSS (tokens, base, five skins). React and
Web Components already share all of that; Solid will too. What's new is the Solid view of each
item, ported from React's (closest in shape: JSX and parts), plus demo pages and tests.

## Delivery: `@uiset/solid` on npm

The shadcn CLI copies React files and doesn't set up Solid projects, so the registry can't carry
Solid. The owner chose (2026-11-24) an npm package beside `@uiset/web`, same version and release:

- `@uiset/solid/<item>` entries (`@uiset/solid/data-grid`), the root `UISet` and `uiset.css`.
- The `solid` export condition serves the source (JSX for the app's compiler, so SolidStart's
  server rendering and hydration work); `import` serves a compiled build for other tools.
- Peers pinned exactly: `@ui-sdk/solid` and `@ui-sdk/core` at UISet's pin, `solid-js` and
  `@solidjs/web` ^2.0.0.

Each release then publishes two packages. The push check grows to cover both.

## In the repo

- `solid/`: its own Vite app (`pnpm solid:dev`, port 5650), like `web/`: `solid/src/<item>.tsx`,
  and demo pages that mirror the Web Components ones (`solid/content.html`, `board.html`, …).
- Imports from the shared files stay relative, as the registry's do.
- `solid/tsconfig.json` (JSX preserved for `solid-js`); the root config leaves `solid/` out.
- A Vitest project for `tests/unit/solid-*.test.tsx` with Solid's plugin; Playwright projects
  `solid`, `solid-webkit`, `solid-firefox` on port 5650.

## Order

Each phase ends checked (below), committed and shown in screenshots before the next starts.

0. **Foundation.** Packages, `solid/` app, test projects, the `UISet` root (skins, theme, sound,
   haptics, cues), the agent bridge harness, `docs/solid.md`, and a parity check: a lint rule
   listing every React item that has no Solid one yet, so nothing is left out silently.
1. **Components:** the 55 UI SDK components styled, and UISet's own parts (alert, stepper,
   search field, password rules, confirm button, …): about 90 files, on one Components page.
2. **Forms and content:** schema form, tag, phone and masked inputs, inline edit, upload,
   sortable list and tree, code block, table, chart, motion pieces.
3. **Kits, one at a time:** chat, rich text, data grid, charts, board, scheduler, canvas, IDE,
   mobile, terminal, Studio, Agent Console, payments, address.
4. **Templates:** all twelve, as in Web Components.
5. **Release:** with 0.7.0. The full suite in every browser, the web and Solid builds, a fresh
   SolidStart app installing the packed package (`scripts/install-test.sh`), then publish.

Phase 3 is most of the work: the data grid and IDE alone are 2,800 lines in React.

## Checked properly

For every Solid item, as for React and Web Components:

- **Behavior** in Vitest through UI SDK's agent bridge: named for agents, an agent test, and
  the same assertions as its React test (shared test bodies where the item's are alike).
- **A mutation check** on anything Solid does itself.
- **axe** in all five skins and their schemes, on its demo page.
- **Every control pressed** on every Solid page (`controls.spec.ts` gets the Solid pages).
- **Server rendering:** each item renders with `@solidjs/web`'s server renderer and hydrates
  with no warnings.
- **Engines:** `@engine` tests in WebKit and Firefox, as today.
- **By eye:** screenshots of each phase in every skin and scheme, beside React's.

## Docs, site and skills

- `docs/solid.md`: install, the root, imports, server rendering, agents. Every kit's and
  component's page gets its Solid usage beside React's; installation points Solid to it.
- The site's code tabs get Solid; What's new, the README and the core skill say Solid.
- Kit skills: Solid sections in their references.

## Unknowns

- Solid 2.0 is a week old and the testing library a release candidate: problems found go to
  their projects or UI SDK with a test, and are noted in HISTORY.md.
- `@ui-sdk/solid` is less used than React's; differences from React found in tests go upstream.
- Pushes wait for `@uiset/web` 0.7.0 on npm (the push check), so this work stays local until
  the release. A backup branch could be allowed by checking only pushes to `main`.
