# Contributing to UISet

Thanks for helping. UISet is a set of components, kits, templates and themes for
[UI SDK](https://ui-sdk.dev), shipped as a shadcn registry. This page covers setting up,
the rules every change follows, and what a pull request needs.

## Set up

You need Node 22 or newer and pnpm 10.

```bash
pnpm install
pnpm exec playwright install chromium webkit firefox
pnpm dev            # the site at http://localhost:5620
pnpm web:dev        # the Web Components pages at http://localhost:5640
```

| Command                    | What it does                                                         |
| -------------------------- | -------------------------------------------------------------------- |
| `pnpm check`               | Typecheck, unit tests, the Web Components build and every e2e test   |
| `pnpm test`                | Unit tests (Vitest and jsdom)                                         |
| `pnpm test:e2e`            | Browser tests in Chrome, Safari (WebKit) and Firefox (Playwright)    |
| `pnpm exec playwright test --project=chromium` | One browser, while you work                       |
| `pnpm registry:build`      | `registry.json`, the hosted registry in `public/r`, and the docs     |
| `scripts/install-test.sh`  | Installs every item into a fresh app, then typechecks and builds it  |
| `scripts/test-firefox-docker.sh` | The Firefox tests in Playwright's Linux image, where Firefox won't start locally |

## Where things live

- `registry/uiset/ui/`: everything that installs. `uiset.tsx` is the `<UISet>` root;
  `uiset/` holds its tokens, base styles and skins; each component is a thin file over UI
  SDK's parts; kits have a folder of their own.
- `web/`: the Web Components build and its demo pages.
- `src/site/`: the website. Component examples are in `src/site/examples/`, one module each.
- `docs/`: the docs pages, in Markdown.
- `scripts/registry.mjs`: the registry manifest. New items are added here.
- `tests/unit` and `tests/e2e` (with `tests/e2e/web` for Web Components).
- `ROADMAP.md`: the plan, status and decision log. Read it first.
- `skills/`: UISet's own agent skills, which teach coding agents to build with UISet.
  The third-party skills used while developing it are pinned in `skills-lock.json`; install
  any you want with `npx skills add <source>`.

## Rules

- **Behavior comes from UI SDK.** Don't hand-write keyboard handling, focus traps or ARIA
  roles that a UI SDK component or behavior already provides. If UI SDK is missing
  something, build it from `@ui-sdk/core` behaviors, and consider reporting it upstream.
- **Imports inside `registry/` between UISet files are relative**, so they still work after
  `shadcn add` copies them into an app.
- **Skins set CSS variables** on `[data-uiset][data-skin="x"]`, and `base.css` uses them.
  That's what lets skins nest without leaking. Skin-only decoration can use selectors.
- **CSS layers:** `ui-sdk, uiset.tokens, uiset.base, uiset.skin`. No `!important`, except
  in the reduced-motion reset.
- **Colors in OKLCH.** Text at 4.5:1, control edges and focus at 3:1, in every skin and
  theme. Nested rounded shapes are concentric: the outer radius is the inner one plus the
  gap and the edge.
- **Pin `@ui-sdk/*` exactly.**
- **No "Vercel" in product names**, and no recreations of real products' looks. UISet is
  "built on UI SDK".

## What a change needs

Every new or changed component, kit or template ships only with:

1. **A name for agents.** Every control has an accessible name, and a test proves an agent
   can read and use it through UI SDK's agent bridge.
2. **axe in every skin and theme:** base, blueprint, studio, phosphor and ink, light and
   dark, contrast included.
3. **Keyboard and focus tests**, including where focus goes when something closes.
4. **A mutation check** for new behavior: break it on purpose, see a test fail, restore it.
   Say in the pull request which test caught it.
5. **A look by eye** in every skin, light and dark, at desktop and phone widths (390px).
   Check alignment, nested radii, text wrapping and clipping, and the hover, selected and
   focus states. Tests pass on ugly UI; screenshots in the pull request help.
6. **Docs:** an example in `src/site/examples/` for a component, and a docs page for a kit.
   `pnpm docs:build` regenerates the index, `llms.txt` and the agent skill's catalog.
7. **A clean install:** `scripts/install-test.sh` passes, so the item installs on its own
   with everything it imports.

## Pull requests

- Keep each pull request to one change, and describe what a person will see differently.
- Run `pnpm check` and `scripts/install-test.sh` before you open it.
- If you changed a decision recorded in `ROADMAP.md`, add a line to its decision log.
- Bugs in UI SDK itself belong upstream at
  [vercel-labs/ui](https://github.com/vercel-labs/ui). Link the upstream issue if UISet
  works around it.

## Reporting bugs and security issues

Open an issue with the template. Security issues go through a private report instead; see
[SECURITY.md](SECURITY.md).

By taking part you agree to the [code of conduct](CODE_OF_CONDUCT.md).
