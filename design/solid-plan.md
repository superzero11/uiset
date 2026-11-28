# Solid 2.0: the plan

Planned on 2026-11-24. Roadmap: Next 1, "Solid 2.0, natively". The owner's call: Solid comes
before the 0.7.0 release, and goes out with it, done and checked properly.

**Paused on 2026-11-25** by the owner, to release 0.7.0 first: 0.7.0 ships without
`@uiset/solid`, and the docs show the Solid work as a preview, not on npm. It resumes after
0.7.0, at the next kit, and ships complete in a later release. Where it stands is below.

## Where it stands (2026-11-25)

**Written and checked** (unit and agent-bridge tests, a mutation check, server rendering and
hydration, a quiet console, every control pressed, screenshots in six looks beside React's):

- Phases 0 to 2: the root, every component, forms and content.
- Phase 3, nine kits: chat, rich text, data grid, board, scheduler, canvas, IDE (with the IDE
  app template, from phase 4), mobile and terminal. From the board on, each kit's browser
  tests are one body (`tests/e2e/<kit>-tests.ts`) run on React's page and on Solid's.

**Left**, as `solid/to-port.json` lists it (lint `content/solid-parity`):

- Kits: Studio (fader, knob, level meter, step sequencer, patch bay, over the shared
  `studio/knob.ts` and `studio/patch-bay.ts`), the Agent Console, payments, address, and the
  app shell.
- Templates: admin, auth, calendar app, chat app, checkout, dashboard, inbox, invoice,
  pricing, project board, settings.
- Checks: axe in all five skins on the Solid kit pages (only the root, components and chat
  pages have it); the `@engine` tests in WebKit and Firefox; React's contrast tests for
  canvas, scheduler and terminal, which the memory guard stopped each time.
- Phase 5: the package itself (`package.json`, entries, the `solid` condition and a build,
  exact peers), `scripts/install-test.sh` with a fresh SolidStart app, What's new, the README,
  and the push check for both packages. `docs/solid.md` gets its `npm install` command back
  then: the push check refuses docs that install a package npm doesn't have. The parity rule
  refuses a dated release with anything still listed once `solid/package.json` exists.

**Each kit, as the last six were done:** `solid/src/<kit>.tsx` over the shared logic;
`solid/demo/examples/<kit>.tsx` (shown under the docs' Solid tab, so written as an app
would); `solid/<kit>.html` and `solid/demo/<kit>.tsx`; a server page in
`solid/demo/ssr/pages.tsx` and its line in `tests/unit/solid-examples.ssr.test.tsx`; the
home page link; off `to-port.json`. Tests: `tests/unit/solid-<kit>.test.tsx` and
`.bridge.test.tsx` with React's assertions; React's browser spec moved into a shared body
with a `Target`; `tests/e2e/solid/<kit>.spec.ts` with the shared tests, hydration, a quiet
console and a sweep. Then a mutation script, screenshots, and the docs: the kit page's
`## Solid` section, `docs/solid.md`, the changelog's preview note, the core skill's row and
HISTORY.

**Solid 2 lessons, each cost a failure:** a part's children go through a getter, not a
function (UI SDK issue 38, lint `solid/part-children-once`); writes apply at the next flush,
so tests `flush()`; don't read signals in an effect's apply; a write from `onSettled` needs
`ownedWrite`; the server runs cleanups too (guard browser APIs); a controlled value passed
to a part can tear (`EFFECT_RELAY_TEAR`), so keep state in the primitive or memo the parts.

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
