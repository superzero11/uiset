# UISet

Open-source themes, components, kits and templates for Vercel's UI SDK (renamed from the
working name Veneer on 2026-11-15), published as a shadcn registry under
GitHub `superzero11`. **Read `docs/roadmap.md` first**: it's the one plan (Now, Next in
order, Later, Waiting on others), short and public on uiset.dev. `HISTORY.md` holds the
decision log, what shipped and the UI SDK issues. When something lands, update the roadmap
and add a decision-log entry. Research (brainstorms, the ideas backlog, gap maps, the daily
watch) lives in `research/`, git-ignored; work goes on the roadmap only when it's planned.

## Skills in this repo

Project skills live in `.claude/skills/` (installed with `npx skills add`, pinned in
`skills-lock.json`). Use them:

- `ui-sdk`: before touching any component. Read the installed docs in
  `node_modules/@ui-sdk/react/docs/`, never `dist/*.js`.
- `shadcn`, `launch-shadcn-registry`: registry format and launch/distribution.
- `frontend-design`: every new skin starts with a written design plan (palette, type,
  principles) reviewed against the generic-default list before code.
- `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`:
  review passes before a kit ships.
- `webapp-testing`: Playwright patterns.

## Layout

- `registry/uiset/ui/uiset.tsx`: the `<UISet>` root. Importing it installs feedback.
- `registry/uiset/ui/uiset/`: `feedback.ts` (UI SDK `observe()` → cues), `sound.ts`
  (WebAudio voices per profile), `haptics.ts`, `tokens.css`, `base.css`, `skins/*.css`.
- `registry/uiset/ui/<component>.tsx`: thin wrappers over UI SDK parts.
- `src/`: the gallery site. `tests/unit` (Vitest + jsdom), `tests/e2e` (Playwright + axe).
- `scripts/registry.mjs`: the registry manifest. Add new items there.

## Rules

- Behavior comes from UI SDK. Never hand-write keyboard handling, focus traps or ARIA
  roles that a UI SDK component or behavior already covers.
- Imports inside `registry/` between UISet files are relative, so they survive install.
- Skins set CSS variables on `[data-uiset][data-skin="x"]`; `base.css` consumes them.
  This is what lets skins nest without leaking. Skin-only decoration may use selectors.
- CSS layers: `ui-sdk, uiset.tokens, uiset.base, uiset.skin`. No `!important` except
  the reduced-motion reset.
- Colors in OKLCH. Text 4.5:1, control edges and focus 3:1, in every skin and theme.
- Pin `@ui-sdk/*` exactly. Browser support follows UI SDK (evergreen); relative color
  syntax has a static fallback.
- Every component: named for agents, an agent test, axe in all skins × themes, a
  mutation check on new behavior (break it, see a test fail, restore).
- No `Vercel` in product names; "built on UI SDK". No recreations of real products' looks.
- Don't push, create the GitHub repo or open PRs without the owner's go-ahead.

## Commands

`pnpm dev` · `pnpm check` (typecheck + unit + e2e) · `pnpm registry:build` ·
`scripts/install-test.sh` (fresh-app install, typecheck and build).
Local Playwright uses installed Google Chrome (`channel: "chrome"`); CI installs Chromium.
The e2e suite also runs in WebKit and Firefox (projects `webkit`, `firefox`, `web-webkit`,
`web-firefox`). On this Mac Playwright's Firefox won't start, so run it with
`scripts/test-firefox-docker.sh`. Tests that need Chromium-only Playwright features
(clipboard permissions, CDP touch and IME) skip elsewhere, and say why.
