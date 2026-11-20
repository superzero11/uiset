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
- No `Vercel` in product names; "built on UI SDK". Skins, kits and templates don't recreate real
  products' looks. The site's own design is in `design/site-plan.md`.
- Don't push, create the GitHub repo or open PRs without the owner's go-ahead.
- No silent scope cuts. A feature shows up everywhere it belongs: its kit's page live (the
  kit demo, or a live example under its section), its component page, React and Web
  Components, docs and skills. If doing it properly is bigger than planned, tell the owner
  and ask before leaving any of it out; never call a code-only section live.
- Every slip gets a lint rule: when the owner or a review catches a mistake a rule could
  have caught, the fix adds one to `scripts/lint/rules/` with the incident in its `why` and
  samples in `tests/unit/lint.test.ts`. Never silence the lint without a
  `lint-ignore <rule>: <reason>`; `pnpm lint --update-baseline` only after fixing.

## Every change: hard rules, no exceptions

1. **Docs, llms files, skills and What's new move with the code**, in the same commit: the
   docs page, the core skill (`skills/uiset`) when it's affected, `pnpm registry:build`, which
   regenerates `public/llms*.txt` and the kit skills' references, and, for a release that
   adds something, its entry in the home page's What's new (`src/site/pages/home.tsx`). A
   local hook refuses a commit while generated files are stale; lint `content/whats-new`
   refuses a dated release that adds things while What's new is older.
2. **Verify by eye and show it**: screenshots of the change in all five skins (Base,
   Blueprint, Studio, Phosphor, Ink), each in light and dark, React and Web Components where
   both exist, sent here, not just "checked".
3. **Batch, don't repeat**: commit each item locally; run only the affected specs at 2
   workers (Firefox only after asking); the full suite, the web build and the npm publish
   happen once per planned batch, at the end of the day. **Ask the owner before any heavy
   run** (the full suite in any browser, WebKit, Firefox, or a batch of specs that takes
   more than a few minutes): they may add two or three more features to it first. One heavy
   thing at a time, with nothing else running.
4. **Every turn that changes files ends with this report**, each label with its answer:
   - **Full suite**: needed now, or can wait for the end-of-day check; which specs ran.
   - **Build and publish**: whether the web build and an `@uiset/web` publish are needed
     now or wait for the batch.
   - **Screenshots**: what was shared.
   - **Dev server**: the URLs for the owner to check.
   - **Docs, llms and skills**: which ones changed (What's new included), or why none needed to.
   A local Stop hook sends the turn back if a label is missing.
5. **No push before the owner has checked the dev server** and said to push. A local hook
   asks on every push.

## Commands

`pnpm dev` · `pnpm lint` (the project lint; `--rules` lists why each rule exists) · `pnpm check`
(lint + typecheck + unit + e2e) · `pnpm registry:build` ·
`scripts/install-test.sh` (fresh-app install, typecheck and build).
Local Playwright uses installed Google Chrome (`channel: "chrome"`); CI installs Chromium.
The e2e suite also runs in WebKit and Firefox (projects `webkit`, `firefox`, `web-webkit`,
`web-firefox`). On this Mac Playwright's Firefox won't start, so run it with
`scripts/test-firefox-docker.sh`. Tests that need Chromium-only Playwright features
(clipboard permissions, CDP touch and IME) skip elsewhere, and say why.
