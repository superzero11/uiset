# UISet — Roadmap

> **UISet**: themes, components, kits and templates for Vercel's UI SDK. UI SDK is the
> structure (behavior, focus, keyboard, ARIA); UISet is everything built on it (look,
> sound and feel, kits, page templates). Renamed from the working name "Veneer" on
> 2026-11-15. Name, namespace, homepage and repo live in `uiset.config.json`.

**Owner:** GitHub `superzero11` · **License:** MIT · **Status:** foundation shipped locally 2026-11-14 (Day 1)
**Repo (planned):** `github.com/superzero11/uiset` · **Registry namespace:** `@uiset`
(free in shadcn's directory, and as an npm scope and package, as of 2026-11-15)

This file is the source of truth across sessions. Update the **Status** table and the
**Decision log** whenever something ships or changes.

---

## 1. Thesis

Vercel's UI SDK (`vercel-labs/ui`, public beta since 2026-11-12) moved the hard part of
UI — keyboard, focus, selection, dismissal, popups, drag and drop, ARIA — into a
framework-free core with adapters for React, Vue, Svelte, Solid and Web Components.
It ships **55 unstyled components** and ~100 behavior helpers, plus an **agent bridge**
(`createAgent`, `snapshot`, `act`) and **WebMCP** so agents can operate the UI directly.

What it does not ship: **looks**, and the **heavy domain components** (grid, board,
scheduler, canvas, console). That is the gap UISet fills.

**Positioning:** one brand, one shadcn registry, many kits.
UI SDK is "one core, five frameworks". UISet is "one component API, many skins".
Signature demo: the same app switching live between skins, with identical keyboard,
focus and screen-reader behavior in every one.

## 2. Research snapshot (2026-11-14)

- ≥50 public repos depend on `@ui-sdk/react` within 2 days. Mostly demos; few polished kits.
- **Lanes taken — avoid:** hardware look (`shuding/spec-01`, by a Vercel engineer),
  Apple-style glass (`LioRael/lenso-ui`), Mac OS 9 (`nostalgia-ui`), shadcn-look-for-Rails
  (`runeui`), Angular/Flutter ports, agent form-fill + chat demos (`kapishdima/uisdk-ideas`),
  unstyled rich-text editor (`htmujahid/unstyled-editor`).
- **Demand signals (GitHub stars):** react-bits 52k, magicui 23k, awesome-shadcn-ui 21k,
  motion-primitives 7k, tablecn 6.4k, neobrutalism 5.6k, ai-elements 2.5k, 8bitcn 2.1k,
  shadcn-chat 1.6k. → delight sells; hard practical components earn durable stars;
  strong aesthetics earn 2–6k.
- **Skeptic take on launch:** "behavior isn't the problem, aesthetics is." Our answer.
- **Known agent failure:** agents hand-wire arrow keys instead of using behaviors → ship a
  skill per kit so agents compose UISet correctly.
- **Distribution is X + shadcn ecosystem, not HN** (HN launch: 7 points, 0 comments).
  Shu's SPEC-01 video ("sound on") hit 32.5K views in hours.
- UI SDK is **beta** (`0.1.0-beta.2`); dozens of open issues (SSR, form reset, IME).

## 3. Catalog

### Practical kits (fill what UI SDK doesn't ship — durable stars)

| Kit             | Signature components                                        | UI SDK building blocks                                                                                     |
| --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `data-grid`     | Editable, virtualized grid; spreadsheet copy/paste          | `createGridFocus`, `createCellRange`, `cellsToText`/`textToCells`, `createInlineEdit`, `createVirtualizer` |
| `agent-console` | Thread, prompt with history, tool-call cards, streaming log | `createStickToBottom`, `createInputHistory`, `isComposing`, announcements                                  |
| `board`         | Kanban, sortable lists, cross-column moves                  | `createTransfer`, `createReorder`, `createAutoScroll`                                                      |
| `scheduler`     | Week/day views, overlapping events, resource lanes          | `createSpans`, `stackSpans`, `isSpanFree`, Dates helpers                                                   |
| `canvas`        | Node/workflow editor, wires, minimap, lasso                 | `createViewport`, `createConnect`, `createMove`, `createLasso`                                             |
| `ide`           | File tree, tabs, split panes, command palette               | `treeFromPaths`, `createTreeReorder`, Tree, Resizable, Command                                             |
| `mobile`        | Swipe rows, wheel pickers, sheets                           | `createSwipeActions`, `bindScrollPicker`, `rubberBand`, Drawer                                              |

### Themed skins (original looks, never a copy of a brand — viral reach)

`studio` (synth rack: knobs, faders, patch cables, sound) · `terminal` (phosphor, command
history) · `blueprint` (technical drawing) · `cockpit` (guarded switches, gauges) ·
`paper` (cards, tape, corkboard) · `eink` (greyscale, no motion) · `print` (brutalist type)

### Agent-operable templates

Settings console, admin dashboard, onboarding — pre-wired to the agent bridge and WebMCP
with an `allow` approval step. Re-run Vercel's benchmark on our kits and publish numbers.

### Tooling

Theme generator (key color → tokens), a `SKILL.md` per kit, `llms.txt` for the docs.

## 3b. End-to-end coverage map (owner goal, 2026-11-15)

> A developer who picks UI SDK should be able to build their whole product with UISet and
> never mix in a second UI library. Every row below is "complete" only when it is
> installable, skinned in every skin, documented, agent-named, and tested (unit, axe,
> keyboard), per the complete-set rule.

| Layer                                         | What it covers                                                                                                                                                                                                                                                                              | Status                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Foundation**                                | `<UISet>` root, tokens, skins (base, blueprint, studio, phosphor, ink), dark mode, RTL, forced colors, sound, haptics                                                                                                                                                                       | done; Phosphor and Ink added 2026-11-15                                                                                       |
| **Base components: all 55 UI SDK components** | Each as its own styled, installable item                                                                                                                                                                                                                                                    | **done 2026-11-15**: 55 of 55, on /components in every skin; axe-clean in 3 skins × 2 themes (one tracked upstream exception) |
| **What apps need that UI SDK doesn't ship**   | App shell and layout (sidebar layout, header, page, card, breadcrumbs), data display (badge, stat, empty state, skeleton, description list, list), stepper/wizard, alert/banner, search field, **charts** (line, bar, area, donut, sparkline, keyboard-explorable), rich text editor, icons | **done 2026-11-15**, the rich text editor included (React and Web Components)                                                    |
| **Domain kits**                               | Studio ✓, Agent Console ✓, Chat ✓, Data Grid ✓, Charts ✓, Board ✓ (kanban), Scheduler ✓ (calendar events), Canvas ✓ (node editor), IDE ✓ (file tree, tabs, panes), Mobile ✓ (gestures, sheets), Terminal ✓                                                                                         | **11 of 11, 2026-11-15**                                                                                                      |
| **Templates (whole pages/apps)**              | Auth (sign in/up/reset), dashboard, settings, chat app, admin CRUD with data grid, inbox, project board, pricing/marketing landing                                                                                                                                                          | **10 done 2026-11-15**: project board and calendar-app added (React and web)                                                  |
| **Frameworks**                                | React now. UI SDK also serves Vue, Svelte, Solid and Web Components; our primitives and CSS are framework-free, so a Web Components build is the cheapest way to reach the rest                                                                                                             | **Started 2026-11-15**: `uiset.css` skins UI SDK's 55 web components (axe-clean, 3 skins × 2 themes), `<uiset-root>`; every kit complete as elements (2026-11-15): Studio, Mobile, Board, Scheduler, Canvas, IDE, Agent Console, Terminal, Charts with sparkline and stat, Data Grid, Chat, App Shell; every page template as a web page (2026-11-15). Search field, copy button and stepper ported 2026-11-15; rich text editor as `<uiset-rich-text>`                                                                                                                    |
| **Developer experience**                      | Docs page per item (usage, API, keyboard, agent names), a `uiset` agent skill so coding agents build with it correctly, llms.txt, theme builder, migration guide from shadcn/Radix                                                                                                         | **done 2026-11-15**: docs/README.md index generated from the registry (every item has a page; base components link UI SDK's API), new chat, app-shell, theming and migrate-from-shadcn pages; `skills/uiset` (SKILL.md + generated catalog); public/llms.txt and llms-full.txt; theme builder with contrast checks (replaced by the /themes/generator theme generator on 2026-11-15); per-item install check (tests/unit/registry-closure.test.ts) |

**Proposed order** (to confirm with the owner): base components (all 55) → app shell and
data display → Data Grid → charts → templates (dashboard, settings, auth, chat app) →
remaining domain kits → Web Components build. The base layer comes first because every
template and kit stands on it, and it's the most "mix-in a second library" risk today.

## 3c. UI SDK issues to report upstream

Verify each against the latest beta, then file on vercel-labs/ui before launch.
Checked on 0.1.0-beta.5 (2026-11-16, repros in a worktree): all still present except #4
(not reproduced; dropped) and #18 (Chrome's own textarea undo; not filed); #7 is upstream
#541. UISet's typecheck, unit tests and Chromium e2e also pass on beta.5 unchanged. Drafts:
`launch/ui-sdk-issues.md` (not in git).

1. **Image cropper nests sliders.** The selection is `role="slider"` with handle sliders
   inside it; slider children are presentational, so screen readers may not reach the
   handles. axe: `nested-interactive`. Tracked by an expecting test in
   `tests/e2e/components.spec.ts`.
2. **Date picker trigger stacks below its input.** web.css switches the root to
   `display:flex` when a trigger follows the input but keeps the earlier
   `flex-direction: column`. UISet overrides it in `base.css`.
3. **TriggerMenuInput doesn't set `aria-expanded`** on the textarea, so
   `createInputHistory`'s "leave arrows to an open popup" check can't see the menu.
4. **`createConnect` ignores a release in the same frame as the last move.** Humans never
   hit it; automated tests do.
5. **InputGroup with InputClear registers a second, unnamed agent component** (action
   `clear`), even inside a labelled Field. Marking InputClear `data-agent-hidden` only
   helps while it's rendered. UISet's SearchField skips InputGroup: a plain Input plus its
   own clear Button (agent-hidden) driven by `createInputController`.
6. **web.css leaves Timeline and Waterfall unstyled.** Not a bug, but worth suggesting;
   UISet styles both in `base.css`.
7. **Slot parts without an `id` or `value` silently share one key**, and so one set of
   props: every data grid cell answered as the last cell rendered. A development warning
   when two live parts of a slot share a key would have caught it. UISet keys cells with
   `value: "row:col"`.
8. **Slot `on` handlers get the native event**, whose `currentTarget` is the React root
   under delegation, not the part. Worth a line in the docs; use the context's `el`.
9. **An exact label doesn't beat a label that merely contains the word.** With a
   "Revenue by region" chart on the page, `ref: "Region"` fails as naming three
   components, though one is labelled exactly "Region". Suggest preferring the exact
   match (the error is clear, so a model recovers with a ref). UISet hides each chart's
   view switch from agents (the chart offers `showTable`) to keep snapshots quiet.
10. **`createTransfer` drops a card released over a full list, or outside every list,
    into the last list it passed that had room**, and calls it a move. A release where no
    list accepts the item should put it back, like Escape. UISet documents it in
    `docs/board.md`.
11. **`keepFocus` misses focus about to leave a disabled button.** Chrome drops focus from a
    button disabled while focused a frame later than `keepFocus` checks. It could treat a
    focused, disabled or inert element as already lost. UISet uses Toolbar, whose disabled
    items stay focusable.
12. **`createConnect` doesn't bring a keyboard-chosen port into view** on a panned canvas.
13. **A pinch can't take over a `createMove` drag** that one of its fingers started.
14. **web.css rings a tree item's whole branch:** its generic `[data-slot]:focus-visible`
    outline outranks `[data-slot="tree-item"] { outline: none }`, so a focused folder is
    outlined with everything inside it. UISet's base layer turns it off for tree items.
15. **Command's list is named by its search text** (`aria-labelledby` the input, so "conf"),
    and Command has no agent action that runs a command, though its controller has `run()`.
16. **A one-tab Tabs takes its agent label from the tab** ("index.ts"), not its list's label.
17. **A modal pauses page shortcuts without preventing them**, so ⌘P inside any dialog opens
    the browser's Print; and a dialog opened by its trigger's shortcut returns focus to the
    trigger rather than where the person was.
18. **In Chrome, any text change on the page during typing ends a textarea's undo step**,
    even in an animation frame, so an editor drawing its own colors can't keep native undo.
    UISet's CodeEditor keeps its own (createUndoStack, typing groups).
19. **`createStickToBottom` doesn't handle content removed above the view**: it turns off
    scroll anchoring, so a reader drifts as scrollback is trimmed, and `unseen` only follows
    height growth. UISet trims only while following. core.md's log guidance could mention
    in-place updates (`aria-relevant="additions"`).
20. **With reduced motion, a press on `DrawerHandle` right after the drawer opens closes it**
    (within about 150 ms; the press lands as a drag release, and its click on another
    element). Without reduced motion, and later, the press steps to the next snap point.
21. **A Listbox's value set from outside leaves focus on the old option**, and Drawer's
    reveal-the-focused-element on rest then scrolls a `bindScrollPicker` wheel back to it,
    choosing it again (an agent's `setValue` on a wheel in a sheet that's still settling).
    For a wheel, focus and value are one option; UISet's WheelPicker moves focus along.
    In WebKit the rest lands a few hundred ms after a reduced-motion sheet opens, and a tap on
    another wheel before then (AM/PM) can be scrolled back too.
22. **In Safari, `keepFocus` leaves focus on a focusable ancestor.** Safari doesn't focus a
    clicked button: focus goes to the nearest focusable ancestor, often an app's
    `<main tabindex="-1">`, and `keepFocus` reads that as focus the person moved. UISet wraps
    it as `returnFocus` (`registry/uiset/ui/uiset/focus.ts`), which also takes focus back from
    an ancestor of the target.
23. **Popups that return focus to a contenteditable lose its selection in Safari.** Focusing
    the editor puts the caret at the start and a late `selectionchange` reports it. UISet's
    rich text editor re-applies its own selection on focus; a `finalFocus` that restores the
    previous selection would help every contenteditable.

## 4. Architecture

```
registry/                 ← source of every installable item (site imports it too)
  foundation/             ← the `uiset` root item: tokens, <UISet> root, lib/*
    lib/                  ← sound, haptics, input modality, key color → tokens
    styles/               ← tokens.css, base.css (structure), one file per skin
  ui/                     ← shared base components (UI SDK components, restyled)
  kits/<kit>/             ← signature components + examples + blocks per kit
src/                      ← the gallery site (Vite + React)
scripts/registry.mjs      ← generates registry.json → `shadcn build` → public/r/*.json
tests/                    ← Playwright (keyboard, focus, a11y, agent snapshot)
```

Rules:

1. **Behavior comes from UI SDK, never hand-written.** Prefer shipped components
   (`@ui-sdk/react/<name>`) restyled; use `definePrimitive` + core behaviors only where
   nothing ships. Never hand-wire arrow keys, focus traps, or ARIA.
2. **Styling is plain CSS**, no Tailwind dependency. Cascade layers
   `@layer uiset.tokens, uiset.base, uiset.skin` so apps override without `!important`.
   Parts are styled through UI SDK's `data-*` state attributes. Skins are scoped by
   `[data-skin="<name>"]`. Tokens also map onto shadcn variable names
   (`--background`, `--primary`, …) so kits drop into existing shadcn apps.
3. **Colors in OKLCH**, derived from one key color. Contrast checked (WCAG AA minimum).
4. **React first** (shadcn registry is React-centric), Web Components second from the same
   primitives (reaches Vue, Svelte, Rails, plain HTML).
5. **Pin `@ui-sdk/*` exactly.** Nightly CI against the `beta` tag catches breakage early.

## 5. Quality bar (every component, before it ships)

- Keyboard-complete; focus visible only for keyboard users; no focus loss.
- UI SDK testing kit (`checkPattern`) + Playwright keyboard tests + axe scan.
- `prefers-reduced-motion`, `forced-colors`, RTL, IME input, 24px+ touch targets.
- SSR without flash (`preferencesScript` for saved prefs).
- Shows up correctly in `agent.snapshot()` with a label and actions.
- Sound and haptics are opt-in-able, respect reduced motion, never block interaction.
- Example file + docs entry naming the UI SDK behaviors it uses.
- Size budget per item.

## 6. 30-day schedule (Day 1 = 2026-11-14)

| Day   | Date         | Ships                                                           |
| ----- | ------------ | --------------------------------------------------------------- |
| 1–3   | Nov 14–16    | Foundation, gallery site, registry build, CI, agent-bridge demo |
| 4     | Nov 17       | **studio** skin (viral launch, video with sound)                |
| 7     | Nov 20       | **agent-console**                                               |
| 12    | Nov 25       | **data-grid**                                                   |
| 16–20 | Nov 29–Dec 3 | **board**, **scheduler**                                        |
| 24    | Dec 7        | **canvas**, **terminal**                                        |
| 30    | Dec 13       | Live skin switcher showcase + Product Hunt                      |

Then one kit or skin every 3–4 days, driven by install metrics.

## 7. Launch playbook (per kit)

1. 30–60s video, sound on. Post on X; tag @vercel and @shadcn.
2. Registry listed: PR to `shadcn-ui/ui` `apps/v4/registry/directory.json`
   (`pnpm validate:registries`), and `registry.directory`.
3. Skill published on skills.sh; `llms.txt` updated.
4. PRs to awesome-shadcn-ui and 21st.dev; DEV post explaining the behaviors used.
5. Agent demo clip (e.g. "make the pad darker" → agent turns knobs via `act()`).
6. Product Hunt for major kits. Answer skeptics with "same Select, six skins".
7. Fix/report upstream UI SDK bugs we hit — visibility with maintainers.
8. Track registry JSON hits, skill installs, stars; double down on winners.

## 8. Risks

- UI SDK API churn during beta → pin, nightly CI, small adapter surface.
- Vercel/shadcn ship official kits (as with AI Elements) → own niches, out-polish.
- Agent-written code quality → every PR passes the quality bar in §5.
- Trademark → no recreations of real products; "built on UI SDK", not "Vercel X".

## 9. Status

| Item                                                                                                 | Status  | Notes                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roadmap, CLAUDE.md, README, LICENSE, skills                                                          | done    | 2026-11-14; 10 project skills in `.claude/skills`                                                                                                   |
| Foundation: `<UISet>` root, tokens, base layer                                                      | done    | 2026-11-14                                                                                                                                          |
| Sound + haptics via UI SDK `observe()`                                                               | done    | 4 voice profiles; works for any UI SDK component and agent changes                                                                                  |
| Skins: base, blueprint                                                                               | done    | base adopts shadcn themes; blueprint is the switching proof                                                                                         |
| Base components: button, switch, slider, segmented-control, select, field, dialog, tabs              | done    | thin wrappers over UI SDK parts                                                                                                                     |
| Gallery site with live skin switch + agent panel                                                     | done    | skin/theme in URL                                                                                                                                   |
| Tests: 8 unit (agent + feedback), 10 e2e (axe × skins × themes, keyboard, forced colors, RTL, agent) | done    | 5/5 mutations caught                                                                                                                                |
| Registry build + fresh-app install test                                                              | done    | `scripts/install-test.sh`                                                                                                                           |
| CI workflow (incl. nightly against UI SDK `beta`)                                                    | written | runs once the repo is on GitHub                                                                                                                     |
| GitHub repo public under superzero11                                                                 | done    | 2026-11-16: github.com/superzero11/uiset, first commit pushed; CI blocked until the account's billing issue is resolved |
| Deploy the site to uiset.dev (Vercel, AppsYogi's Team)                                              | done    | 2026-11-16: live at https://uiset.dev; every item installs from the live registry (108/108); redeploy with `pnpm deploy:prod` |
| studio                                                                                               | done    | Shipped 2026-11-14, three days early: knob, patch-bay, fader, level-meter, step-sequencer, studio skin, playable synth demo                         |
| agent-console                                                                                        | done    | Shipped 2026-11-15, five days early: approvals, activity + undo, highlight, thread, prompt, snapshot, tool router; live demo with a simulated model |
| chat (full set: chat, chat-response, chat-parts, chat-composer, chat-sidebar)                        | done    | Shipped 2026-11-15 under the owner's complete-set rule                                                                                              |
| data-grid                                                                                            | done    | Shipped 2026-11-15, ten days early, as step 3 of the owner's 7-step plan; docs/data-grid.md                                                         |
| charts (chart, line-chart, bar-chart, scatter-chart, heatmap, segmented-bar, sparkline, stat trend)   | done    | Shipped 2026-11-15 as step 4; docs/charts.md                                                                                                        |
| board, scheduler                                                                                     | done    | Shipped 2026-11-15 as step 6 (part 1), reviewed: 22 bugs fixed; docs/board.md, docs/scheduler.md                                                   |
| canvas                                                                                               | done    | Shipped 2026-11-15 as step 6 (part 2), reviewed: 17 bugs fixed; docs/canvas.md                                                                      |
| ide (+ ide-app template)                                                                             | done    | Shipped 2026-11-15 as step 6 (part 3), reviewed: 17 bugs fixed, 12/13 mutations (1 moot); docs/ide.md                                               |
| mobile                                                                                               | done    | Shipped 2026-11-15 as step 6 (part 4), reviewed: 15 findings fixed; 15 e2e incl. touch, 5 unit, 11/11 mutations (1 moot); docs/mobile.md            |
| terminal                                                                                             | done    | Shipped 2026-11-15 as step 6 (part 5), reviewed: 19 bugs fixed, 14/15 mutations (1 accepted); docs/terminal.md                                      |
| Web Components: every kit as elements                                                                | done    | Step 7, 2026-11-15: 5 web kits reviewed (67 findings fixed), 6 more kits built; 214 web tests in 12 files, every new behavior mutation-checked; docs/web-components.md |
| Web Components: page templates                                                                       | done    | 2026-11-15: all eight as web pages (`web/templates/*.html`, IDE as `web/ide.html`), with App Shell, page header, empty state, chat model picker and usage as new elements; docs/web-components.md |
| rich-text (RichTextEditor, RichTextContent; `<uiset-rich-text>`, `<uiset-rich-text-content>`)         | done    | 2026-11-15: no editor library; 35 unit, 19 React e2e, 12 web e2e, axe in 3 skins × 2 themes; 16/16 mutations caught (3 survivors found test gaps, fixed); docs/rich-text.md |
| Skins: phosphor, ink                                                                                 | done    | 2026-11-15: design plans in docs/phosphor.md, docs/ink.md; axe-clean in every component, kit, template and web page; chart sets validated for color blindness; a "Five skins" band on the home page |
| Templates: project-board, calendar-app                                                               | done    | 2026-11-15: React and web; 39 tests, 9/9 mutations (2 survivors were dead code, removed); `calendar-app` so it doesn't clash with the Calendar item |
| Developer experience                                                                                 | done    | 2026-11-15: docs index, llms.txt and the skill catalog generated from the registry (`pnpm docs:build`); chat, app-shell, theming and migrate-from-shadcn docs; `skills/uiset`; theme builder (now /themes/generator); every item checked to install on its own |
| Name: UISet (from the working name Veneer)                                                           | done    | 2026-11-15: tagline "Themes, components, kits and templates for Vercel's UI SDK."; `@uiset` free on npm and shadcn; renamed everywhere |
| Website rebuilt for launch (owner's audit, 2026-11-15)                                              | done    | One header and footer, logo, home on the thesis, IA by Components / Kits / Templates / Themes / Agents, docs site (every item; component pages with live example, code, UI SDK's API and accessibility, live agent snapshot), copy on every command, ⌘K search, SEO/GEO/AEO (prerendered pages, meta, JSON-LD, sitemap, robots, llms.txt, og.png); design/site-plan.md |
| Agent benchmark on UISet's kits                                                                      | done    | 2026-11-15: 3 tasks × browser tools vs bridge × 3 runs, Claude Sonnet 5.5 through Claude Code, all 18 finished; bridge −40% tool calls, −79% text read, −40% time (medians); bench/README.md, /agents#benchmark |
| Theme generator                                                                                      | done    | 2026-11-15: /themes/generator; one key color to every token for light and dark, 32 checks per scheme with nearest-lightness fixes, exports a UISet skin, shadcn/ui variables and W3C design tokens, share link; 27 unit + 9 e2e |

## 10. Decision log

- 2026-11-14 — Plan approved by owner. Open source under `superzero11`, MIT.
- 2026-11-14 — Working name "Veneer", namespace `@veneer` (renamed to UISet on 2026-11-15; see that entry).
- 2026-11-14 — Plain CSS + cascade layers, no Tailwind dependency; OKLCH tokens mapped to
  shadcn variable names.
- 2026-11-14 — Single Vite package (registry + site) rather than a multi-package monorepo,
  following the proven SPEC-01 layout; split later if Web Components need their own build.
- 2026-11-14 — Build on UI SDK's `web.css` (layer `ui-sdk`) and override with UISet layers,
  so upstream fixes flow in and our CSS stays thin.
- 2026-11-14 — Feedback is global through UI SDK `observe()` + delegated pointer/key
  listeners, not per-component wrappers. Any UI SDK component inside a root gets sound.
- 2026-11-14 — Skins set CSS variables only (plus skin-only decoration), so nested roots
  don't leak. Found when the base page's button rule leaked into a nested Blueprint panel.
- 2026-11-14 — Registry: source `registry.json` uses GitHub addresses
  (`superzero11/uiset/<item>`, no hosting needed); hosted `public/r` uses URL deps.
  Lib files live under `components/ui/uiset/` with relative imports, so install needs no
  alias rewriting.
- 2026-11-14 — Sound is off by default in the library; the gallery turns it on.
- 2026-11-14 — Studio kit: Knob and PatchBay are new UI SDK primitives (`definePrimitive`
  with `bindDrag`, number helpers and `createConnect`), so they get UI SDK's keyboard map,
  server rendering, RTL, agent bridge and testing kit. Fader, LevelMeter and StepSequencer
  restyle shipped parts (Slider, Meter, ToggleGroup).
- 2026-11-14 — Knob drags measure from absolute pointer positions: `bindDrag` calls onMove
  once a frame with the latest event, so `movementX/Y` silently drops movement.
- 2026-11-14 — Agent-facing labels must not contain each other's words (UI SDK matches
  labels by words): jacks are "Filter mod in", not "Cutoff in", beside a "Cutoff" knob.
- 2026-11-14 — Possible upstream report: a pointer release in the same frame as the last
  move ignores that move in `createConnect`/`bindDrag`. Humans never hit it; tests wait for
  the target to light up. Verify and file on vercel-labs/ui before launch.
- 2026-11-14 — **Owner decision: don't publish until there is something for the broad
  developer community, not only Studio's audio/creative niche.** Proposed gate (mine, to
  confirm with the owner): Agent Console and Data Grid shipped. Build order: Agent Console,
  then Data Grid.
- 2026-11-15 — **Owner clarified the goal: a complete UI component, theme, interface and
  template system on UI SDK.** Judge what's missing against the UI SDK ecosystem, not the
  whole React market. "Already exists in React" is positioning input, never a reason to
  skip a category: a UI SDK app can't borrow Radix/shadcn chat kits without losing agent
  visibility, skins and one behavior system. Templates (whole pages/apps) are not started.
- 2026-11-15 — **Owner rule: every kit is a complete set.** Before building a kit, list
  everything a developer needs to ship that kind of product end to end, and build all of
  it. Applies to every kit in this roadmap. First application: the full chat set.
- 2026-11-15 — Full chat set shipped: `chat`, `chat-response`, `chat-parts`,
  `chat-composer`, `chat-sidebar` (thread, messages, actions, versions, suggestions, tasks,
  shimmer, streaming markdown via react-markdown + remend with raw HTML off, shiki code with
  a css-variables theme, reasoning, tool calls, sources, citations, images, composer with
  TriggerMenu commands/mentions, FileInput attachments, model picker, usage meter, chat list,
  launcher). Agent Console now reuses these instead of its own thread/prompt.
- 2026-11-15 — **Agent label rule for every kit:** controls inside reusable components get
  specific names ("Copy message", "Feedback on this response"), never bare common words.
  Found when the chat's "Rate this response" made the Studio "Rate" knob ambiguous. Kits
  will share pages in real apps.
- 2026-11-15 — UI SDK's TriggerMenuInput doesn't set `aria-expanded` on the textarea, so
  `createInputHistory`'s "leave arrows to an open popup" check can't see the menu. The
  composer tracks the menu through `onOpenChange` and skips history and Enter while it's
  open. Possible upstream report.
- 2026-11-15 — **Step 2 done: app shell and data display** (16 items). AppShell collapses
  to icons (Mod+B, remembered via UI SDK preferences) and becomes a Drawer below 48rem;
  sidebar tooltips show only when labels are hidden. Status tones were raised in dark mode
  so they clear 4.5:1 on Blueprint's and Studio's mid-dark panels, not only near-black.
  SearchField avoids InputGroup (it shows agents an unnamed second component).
- 2026-11-15 — **Step 1 of the owner's 7-step plan done: all 55 UI SDK components are
  UISet items.** Wrappers keep UI SDK's part names (its docs apply as-is) and add defaults
  where parts are boilerplate (checkbox/radio marks, number steppers, password toggle,
  OTP slots, calendar, color picker, pagination, progress, meter, rating, ScrollBox,
  Toaster, token chips). /components shows all of them in the chosen skin. Skins share one
  explicit list of button-like triggers, so pads and lettering never leak onto accordion
  rows or links. Vite pre-bundles every UI SDK entry to stop mid-session re-bundling.
- 2026-11-15 — Agent Console positioning: chat UI is crowded (Vercel AI Elements ~49
  components, shadcn AI Elements + chat primitives, assistant-ui 13k★). We don't compete on
  chat; we own "an agent that operates your UI": approvals, activity, undo, highlights,
  built on UI SDK's bridge, `createHistory` and `observe`.
- 2026-11-15 — Approval cards render as a top-layer popover with `bindPersistentLayer`.
  Found in a real browser: the bridge asks for a confirm step _after_ opening the agent's
  modal, whose backdrop covered the console, so nobody could click Allow. jsdom missed it.
- 2026-11-15 — The bridge calls `allow` twice for a press inside a closed dialog: once
  before opening (no `confirm` yet), once after (with `confirm`). Approvals only ask on
  the second, so the person sees one card.
- 2026-11-15 — **Step 3 done: Data Grid** (`data-grid`: `DataGrid`, `DataGridToolbar`, a
  `data-grid` primitive and framework-free `view.ts`). Built from `createGridFocus`,
  `createCellRange`, `createInlineEdit`, `createVirtualizer`, `bindDrag`, Menu, Popover and
  Select: 10,000 rows with only visible ones rendered, sort (Shift for multi), quick and
  column filters, grouping, pinned/resizable/movable columns (pointer, Shift+F10 column
  menu, Alt/Alt+Shift+Arrows), row checkboxes with Shift ranges, cell ranges, clipboard
  copy and paste, typed edits (number, date, yes/no, lists) refused with a message, CSV
  export with the formula guard, a saved layout, density, and agent actions that throw
  readable errors. 14 unit tests (12/12 mutations caught), 18 e2e incl. axe with a range
  and the editor open; on /components in every skin.
- 2026-11-15 — Grid lessons: parts need an `id` or `value` or they share props (cells use
  `value: "row:col"`); slot handlers must compare with the context's `el`, not
  `currentTarget`; attrs may not read options (server check), so span rows live in state;
  `aria-expanded` goes on a group's cell, not its row (rows only expand in a treegrid);
  the editor covers its cell border to border so axe's target-size sees one target; a
  saved layout loads in a layout effect and saving waits for it (StrictMode re-runs
  effects); web.css squares any button with an `aria-label` and a lone SVG, so icon+text
  buttons carry their name in text.
- 2026-11-15 — Data Grid review pass (web-design-guidelines, react-best-practices,
  composition-patterns, by an independent reviewer) found 10 bugs; all fixed with tests:
  Shift-click ranges now follow on-screen order (groups) by row key; numbers and dates
  parse with UI SDK's locale-aware `parseNumber`/`parseDate`; edit messages belong to one
  cell; the toolbar is a labelled group, not a keyless `role="toolbar"`; the body is its
  own stacking context; checkboxes never take focus; range edges are logical; agent
  arguments are checked; the column menu has a real (tab-stop-free) button plus Wider and
  Narrower. Performance: rows subscribe to the virtualizer in their own component, the
  filter is deferred over cached row text, drag-resize saves once on release (and
  measures from the press, not summed `movementX`). API: toolbar parts
  (`DataGridSearch`, `DataGridFilters`, …) and every view state controllable.
- 2026-11-15 — **Step 4 done: Charts** (`chart`, `line-chart`, `bar-chart`,
  `scatter-chart`, `heatmap`, `segmented-bar`, `sparkline`, and `stat` with a trend),
  following the dataviz method: form before color, one axis only, color by entity
  (fixed slots, never cycled, a ninth folds to "Other"), thin marks (≤24px bars with 4px
  data ends, 2px lines, ringed dots, 2px surface gaps), ink-colored labels, a legend for
  2+ series that isolates on press, and a table twin for every chart. No pie or donut:
  segmented bar for a whole at a glance, ranked bars to compare. Palettes were run through
  the six-checks validator per surface: Base light and dark and Studio use the reference
  sets (low-contrast slots relieved by labels and the table); Blueprint's mid-blue paper
  needed its own set (CVD ΔE 14.6, normal 22.5, all ≥3:1), deliberately above the
  validator's dark lightness band, which assumes a near-black surface. Sequential ramps
  mix in OKLab (OKLCH swung Studio's amber ramp through pink). The drawing is
  `aria-hidden`; an HTML listbox of data positions (UI SDK roving focus with a custom
  `move` for heatmap rows) carries keyboard, screen reader, hover and agents. 27 unit
  tests (scale, primitive, charts; 9 of 10 mutations caught, the tenth an equivalent
  redundant guard), 12 e2e incl. axe with a tooltip and a table open, label contrast and
  right-to-left, and the gallery axe in 3 skins × 2 themes.
- 2026-11-15 — Charts review pass (independent reviewer, three skills, edge cases
  server-rendered) found 13 bugs; all fixed with tests: empty data and all-null last
  values no longer crash or draw NaN; stacked domains use running sums, so negative
  layers stay in the plot; share labels inside segments flip to near-black above L 0.56
  (every slot now ≥4.5:1, measured in e2e, since axe can't see an aria-hidden SVG);
  charts draw left to right in right-to-left pages and the arrows match; aria-orientation
  comes from state (none for a heatmap); heatmap rows stop at edges; sorted bars keep
  data-index keys for `onSelect`; a `locale` prop for server rendering; Escape dismisses a
  focus tooltip; pointer-leave only looks at its own chart; negative bar sparklines stay
  in their box and areas break at gaps; a scatter click pins the nearest point.
  `LineChart` takes `layout` ("line" | "area" | "stacked") like BarChart; stacked totals
  join readings and tables. Lesson: a handler passed through `usePart` props may close
  over an old render; read live state from the primitive's store instead.
- 2026-11-15 — **Step 5 done: Templates.** `auth`, `dashboard`, `settings`, `admin`,
  `inbox`, `chat-app`, `pricing` as registry blocks installing to
  `components/ui/templates/`, built only from UISet items, each with sample data in one
  place and handlers as props. Shown live at `/templates`. Checks: axe in Base light and
  dark, Blueprint and Studio (28 runs), a keyboard path per template, a 375px no-sideways-
  scroll check, an agent test driving three of them, and 4/4 mutations caught. Fixes it
  surfaced in shared items: the chat composer's toolbar wraps on phones; the shell's
  content padding is a variable (`--app-shell-pad`) so full-bleed pages can cancel it.
  Keyboard-first choices: team and customer removal go through row selection plus a
  confirmed bulk action (no pointer-only row buttons); toggles keep one name while
  `aria-pressed` carries the state. The site's link color now skips `[data-slot]`, since
  unlayered app CSS beats UISet's layers (documented for developers).
- 2026-11-15 — Templates review pass (independent reviewer, verified in a browser) found
  14 bugs; all fixed, the stateful ones with e2e tests and mutation checks (4/4): inbox
  folder links handled around the whole shell (the sidebar sits beside the list); the
  inbox list uses `activation="manual"` so arrows browse and Enter opens, focus moves to
  the message heading and Back returns it; settings panels `keepMounted`; confirm dialogs
  for bulk removal live outside the selection bar with `finalFocus` on the grid, and
  DataGridSelection's Clear returns focus to the grid; the dashboard ends ranges at a
  `now` prop and has an empty state; the chat app runs one answer at a time, aborts on
  unmount, doesn't call a deliberate stop a failure, never leaves zero chats, and numbers
  untitled chats so agent labels don't collide; OTP codes validate natively; Resend
  can't double-send; ids are `crypto.randomUUID()`; duplicate invites are refused; inline
  edits follow the form's rules; the workspace name has its own form. Composition:
  templates take handlers (`onSave`, `onDelete`, `onSend`, `onMove`, `onAction`) and
  `default…` data names where they keep state.
- 2026-11-15 — **The install test had a hardcoded item list**, so new items (data-grid at
  first) were built into the registry but never installed by the test. It now reads every
  item from `registry.json`: 91 items install, typecheck (TS 5.9) and build.
- 2026-11-14 — Next for Studio: a `studio-synth` block (the whole rack + engine) once
  alias rewriting for blocks is verified with the shadcn CLI.
- 2026-11-15 — Board review pass (independent reviewer, checked in a browser) found 12
  bugs; all fixed, with 6 new unit and 9 new e2e tests, 7/7 mutations caught. A filter no
  longer leaves the board's one tab stop on a hidden card (the primitive takes `hidden`
  and calls `roving.check()` when it changes). While a filter hides cards nothing moves,
  and Space says why. A `createBoardController()` connects `BoardCardDialog` to the board:
  dialog moves go through `moveCard` (column limits, `onLanesChange`, the Undo toast; full
  columns can't be chosen), and focus returns to the card, or its neighbor after a delete
  or an edit the filter hides. The add form hands focus back to its button, or to the new
  card when it fills the column. The dialog resets per card and only edits the assignee and
  labels it was given. A picked-up card is tinted, edged and dash-ringed, out-ranking
  base.css's focus ring. Touch drags from a grip shown on coarse pointers, so a finger
  still scrolls. Cards are described (priority, due, person, labels); columns aren't
  landmarks; live state moved out of `attrs`. `onAddCard` returns the id, and an
  uncontrolled board adds it; agents hear when a board can't open or add cards.
  Composition: `locked`, `messages`, `moveMessage`, `describeCard`. Upstream issue 10.
- 2026-11-15 — Scheduler review pass (independent reviewer, checked in a browser) found 10
  bugs; all fixed, with 6 new unit and 10 new e2e tests, 15/15 mutations caught. Events are
  native buttons, so Enter and Space open them (a `<div>`'s `press` only hears clicks).
  `addEvent` keeps the rules a drag does (hours, steps, sizes, overlaps) and reports
  `{ id, action }`; moves and resizes respect `locked`; same-titled events must be named
  by id; `removeEvent` is off the agent list (deleting goes through the confirm). Names
  are built from this render's tracks, so paging weeks never leaves stale days, and
  include the place. Focus never falls to the page: Delete hands it to the next event or
  the schedule, the dialog returns it to the saved event or a deleted one's neighbor
  (`createScheduleController`), and choosing a month day focuses its first event. The
  dialog resets per event, keeps the hours and steps, and ties its error to the field.
  Time zones: minutes are wall-clock in `timeZone`, and `now` is read there. Touch scrolls
  the schedule. Contrast: today's name is full-contrast text with an accent bar; event
  edges mix the series halfway to the text color (checked at 3:1 in all six skin/theme
  pairs). Room bookings gained keyboard booking. Also: agent items must be
  `{ value, label }` — the bridge drops other fields — so Board, Scheduler, Data Grid and
  Charts items were blank to agents until now; each now carries the row as a person
  reads it, with tests.
- 2026-11-15 — **Base Slider range bug**, found from a UI SDK dev warning in the e2e logs:
  the wrapper rendered range thumbs without `index`, so both answered as the first value.
  Each thumb now gets its index; a unit test pins it (mutation caught). Full check after
  the Board and Scheduler reviews: 143 unit and 142 e2e tests pass, and the install test
  installs, typechecks and builds all 100 registry items.
- 2026-11-15 — **Canvas** shipped as step 6 (part 2): a node editor composed from UI SDK's
  viewport, move, selection, lasso, spatial focus and connect behaviors, with a minimap,
  zoom controls, a toolbar, an inspector and `useCanvasHistory`. Review pass (independent,
  in Chrome) found 17 bugs; all fixed, 11/11 mutations caught, 22 e2e and 13 unit tests.
  Highlights: menu items run through `onAction` (Enter did nothing with `onClick`; the IDE's
  file menu had the same bug, fixed and tested); the inspector keys its whole body by node;
  `createFocusRecovery` plus Toolbar keep focus off the page after removals and undo; the
  minimap freezes its frame during a drag; pointer focus no longer pans; agent adds don't
  steal focus; the selection drops nodes that go; history skips no-op steps; wires sit on a
  physical layer for RTL; keyboard wires let Tab through and end when focus leaves; a
  3:1 accent for selection and drafts; rings scale with zoom; the zoom readout is live
  state, so zooming renders no React; nodes are named in visual order. The toolbar's name
  no longer contains the canvas's, because of upstream issue 9. Upstream issues 11–13.
- 2026-11-15 — **IDE** built as step 6 (part 3): FileTree, EditorTabs, CodeEditor,
  CommandPalette, ProblemsList, StatusBar and an `ide-app` page template. The shiki loader
  and token colors moved to shared `code/` files used by the chat kit too. Skins dress
  fields, so the editor's textarea undoes that in the skin layer (tested in all skins).
  Review pass running.
- 2026-11-15 — **Mobile** built (step 6, part 4): SwipeList (createSwipeActions + roving
  focus; Left/Right reach a row's actions, Escape returns), PullToRefresh (bindDrag +
  rubberBand, a Refresh button on focus for the keyboard, `touch-action: pan-x pan-down` at
  the top), WheelPicker and TimeWheel (bindScrollPicker on Listbox), Sheet and ActionSheet
  (Drawer; `await sheet.choose()`), AppBar and TabBar. Accent text uses `--mobile-accent`
  (primary pulled toward the text color) after axe caught `--ui-primary` text at under 4.5:1
  in base dark. Tested with real touch through CDP.
- 2026-11-15 — Mobile review pass (independent, in Chrome) found 15 bugs; all fixed, with 7
  new e2e and 5 unit tests, 11/11 mutations caught (a 12th was moot: `bindScrollPicker`
  already centers a wheel's starting value and glides to new ones, so that code went). Rows:
  focus goes back to the row after an action, or to the row now in its place
  (createFocusRecovery); a tap on an open row closes it, decided at press time; each row has
  an Actions menu, out of the tab order and out of sight until focused, for screen readers'
  own navigation; unlabeled rows are named by their content; a side's first action sits at
  the edge and alone fills the row past a full swipe; filled actions ring in their own text
  color; nothing gets selected during swipes and pulls. Agents: `run(row, action)` and
  `openRow` on **Messages**; a `danger` action refuses with "Needs a person" and points at
  the row's menu, whose item asks. Wheels snap (`scroll-snap-type`), show a value between
  steps (00:07), and keep focus on the value (upstream issue 21). Sheets: Drawer props pass
  through; with several snap points the sheet is 85% of the screen (UI SDK's cap) and its
  handle is a named button. ActionSheet's destructive choices carry `data-agent-confirm`.
  TabBar items are UI SDK Buttons (agents press them) and links leave modified clicks to
  the browser; AppBar takes `headingLevel`; PullToRefresh announces failures, hands them to
  `onError`, takes `messages`, and moves by a CSS variable instead of rendering per frame.
  The demo's Delete all can be undone, and a Help sheet shows two snap points. Upstream
  issues 20–21.
- 2026-11-15 — **Terminal** built (step 6, part 5): commands that print, stream (async
  iterables, `\r` progress redraws) or throw; ANSI colors as 8 tokens checked at 4.5:1 in
  all six skin/theme pairs (256/true colors keep the skin's, cursor codes are dropped);
  links; createInputHistory and createStickToBottom; Tab completion that leaves an empty
  prompt's Tab alone; Ctrl+C and Ctrl+L; agent `run` and `clear`. Lines live in a ref so
  React's double-run updaters in development can't print twice.
- 2026-11-15 — IDE review pass (independent, in Chrome) found 17 bugs; all fixed, with 11
  new e2e and 2 unit tests. **Focus rings across nine kits used `--ui-ring`, the 30% halo,**
  instead of `--ui-ring-border` (1.3–2.5:1): all fixed, and a static test now fails on any
  outline drawn with the halo. Tabs: `onClose` can refuse (to ask about unsaved changes),
  the parent picks the next tab (`nextTab`), focus lands on the next tab or the empty pane,
  and every open file keeps its own mounted editor (caret, scroll, undo). The editor keeps
  its own undo on `createUndoStack`: a bare-page experiment showed that in Chrome any text
  change on the page during typing ends a textarea's undo step, even in an animation frame
  (upstream issue 18). Its text is uncontrolled while typing (with an echo list, so lagging
  renders can't overwrite newer text), colors persist per line during edits, the current
  line is one moved bar, the gutter and colors are memoized, the cursor lives in a store
  only the status bar reads, linting is cached per file, and tree items no longer remount.
  Palette: focus returns where you were, Escape closes in any mode, ⌘P/⌘⇧P switch modes
  inside it. Tree: F2/Delete act on the focused item; agent selections open files; folder
  rings sit on the row (UI SDK's generic ring outlined the branch, issue 14). Editor: Page
  Up/Down move the caret, `dir="ltr"` and `translate="no"`, gutter-aware scrolling, glyph
  problem marks that survive forced colors, and a per-skin `--code-selection` that keeps
  4.5:1 (tested in all six pairs). Upstream issues 14–18.
- 2026-11-15 — **Step 7, Web Components (first slice)**: a separate `web/` build (its own Vite
  config, port 5640, and a Playwright project on 5642, so it never disturbs the React site)
  makes `uiset.js` (17 KB, 6 KB gzipped; UI SDK stays a peer) and `uiset.css` (includes
  UI SDK's web.css). Proven: UISet's skins style **UI SDK's own custom elements** with no
  React, since they emit the same `data-slot` attributes; axe passes in all six skin/theme
  pairs. `<uiset-root>` mirrors the React root; the knob and swipe rows register through
  `createParts` (the swipe list's outer slot became `root`, which custom elements need); the
  feedback layer now imports `observe` from `@ui-sdk/core`, so it's framework-free. 12 tests
  including one against the built files; 3/3 mutations caught. Docs cover plain HTML, Vue,
  Svelte and Solid. The rich kits (grid, charts, board, scheduler, canvas, IDE, chat,
  terminal, templates) are React-only for now; their primitives and CSS are framework-free,
  so they come over element set by element set.
- 2026-11-15 — **Step 7, web kit reviews and the remaining kits** (the owner: "Review the web
  kits first then implement Remaining kits next"). Independent reviews of the five web kits
  found 67 issues; all are fixed with tests, and every fix was mutation-checked (a mutation
  that slipped through got a sharper test, or showed dead code, which went). The ones worth
  remembering: properties a page sets before the element is defined were lost (now picked
  up everywhere, `upgradeProperties`); a redraw rebuilt focused things (legend buttons,
  column menus, header cells, toolbar tools, board cards), so each is now kept by key and
  patched in place; the data grid lost its tab stop when rows or columns went (the shared
  primitive now clamps the active cell, for React too), row checkboxes ignored clicks (a
  range drag captured the pointer; shared fix), and an invalid edit left by focus blocked
  every other edit (it now gives way); a stale chart pin drew a crosshair off the edge (the
  shared geometry now ignores keys the data no longer has, `focusKey`); Blueprint's chart
  slots 1 and 4 were the same lavender for everyone (re-picked with the validator, first
  six now clear every pair; `tests/unit/chart-palette.test.ts` guards it); the chat
  command menu dropped descriptions. Then Scheduler, Canvas (with toolbar, inspector and
  `history` undo), IDE (file tree, tabs, code editor, palette, problems, status bar, and the
  IDE template as a page), Agent Console, Terminal, sparkline and stat became elements. To
  keep React and web from drifting, more logic moved to framework-free modules: the
  terminal's run/stop/complete session (`terminal/session.ts`, React now runs on it), the
  sparkline's geometry, canvas wire descriptions, the IDE's `Problem` type and the IDE
  template's sample project and linter (`templates/ide-sample.ts`, shipped with ide-app).
  Web lessons: UI SDK's web tab and tree items wrap their own button or label (a tab's role
  went to an icon until the content sat in a `<button>`); a `default-*` attribute is read
  as an element starts, so it must be there at creation; `dialog.open = false` fires no
  events, so closes go through `api.close()`; an attribute observer on your own element
  loops if your draw writes that attribute unconditionally (`attr()` now skips unchanged
  values); a dialog trigger that opens with the same payload fires no `payloadchange`, so
  the palette resets its query on every open. The seven other page templates wait for the
  owner's call. Full check green (190 unit, 432 e2e incl. 214 web), install test 105/105.
  The web build is one module for every kit: uiset.js 89.5 KB gzipped, uiset.css 32 KB,
  and the markdown chunk 53 KB, loaded only by the chat.
- 2026-11-15 — **Step 7, page templates for Web Components** (the owner: "Yes, port them").
  Auth, pricing, dashboard, admin, settings, inbox and the chat app are web pages now
  (`web/templates/*.html`), built only from UI SDK's elements and UISet's, linked from the
  web index with every kit's page. The parts they needed that the web lacked became
  elements: the App Shell (`<uiset-app-shell>`: the same `uiset-sidebar` storage as
  React, Mod+B, a drawer below 48rem, tooltips on collapsed links), `<uiset-page-header>`,
  `<uiset-empty-state>`, `<uiset-chat-model-picker>` and `<uiset-chat-usage>` (the
  composer now puts its children in its toolbar); the data grid takes
  `data-part="selection"` actions and builds its tools when `toolbar` is set. Each
  template's sample data moved into a framework-free module (`templates/*-sample.ts`:
  pricing, dashboard with `summarize`, admin, settings, inbox, and the chat app's stand-in
  model), shipped with its template as an extra file, so React and web show the same thing.
  Fixed for React too: the model picker's descriptions sat beside the names (now under
  them), and untitled chats skipped numbers (they shared the turn counter). 19 behavior
  tests plus axe for every page in all six skin/theme pairs and a phone-width check;
  16/16 mutations caught. Full check green (190 unit, 494 e2e incl. 276 web), install test
  105/105. uiset.js is 92 KB gzipped (the templates are pages to copy, not in the build).
  Still React-only: the search field, copy button and stepper behaviors.
- 2026-11-15 — **Renamed to UISet** (the owner: "Go ahead with full rename to UISet with
  option 1 tagline"). Tagline: "Themes, components, kits and templates for Vercel's UI SDK."
  The owner asked about "UI SDK Kit"; "SDK" stays out of the name: UI SDK's Apache-2.0
  license (section 6) grants no use of Vercel's product names beyond describing where the
  code comes from, a name with it reads as Vercel's own (Vercel's official AI SDK
  components are "AI Elements"), and `@ui-sdk-kit/*` would be mixed up with `@ui-sdk/*`.
  Checked free on 2026-11-15: npm scope `@uiset` and package `uiset`, the shadcn namespace
  `@uiset`; uiset.dev, .app and .io have no DNS, uiset.com is registered. One pass renamed
  176 files (3,073 replacements) and 6 paths: `registry/uiset/`, `<UISet>`, `<uiset-*>`
  elements, `data-uiset`, the CSS layers `uiset.tokens`, `uiset.base` and `uiset.skin`,
  storage keys, `uiset.config.json`, the registry `@uiset` at `uiset.vercel.app` (a
  placeholder until a deploy is approved), the web package `@uiset/web` with `uiset.js` and
  `uiset.css`, and the planned repo `superzero11/uiset`. Older log entries now read UISet;
  the naming entry keeps Veneer. The README calls UISet a community project, not
  affiliated with Vercel. The tagline's "themes" are the API's skins (`skin`); `theme`
  still means light or dark. After the rename: full check green (190 unit, 494 e2e), install
  test 105/105.
- 2026-11-15 — **Step 7, broad kits for Web Components** (the owner chose "broad kits first,
  then check in"): Mobile, Board, Charts, Data Grid and Chat are elements now, each with its
  own page under `web/`, axe in all six skin/theme pairs, keyboard, pointer, events, script
  and agent tests (83 web tests in all), and every new behavior mutation-checked (8 + 5 + 6
  + 8 + 10, after tests were tightened where a mutation slipped). The chat log keeps each
  message's element and moves only what's out of place, so screen readers hear new text,
  not the conversation again (tested by watching the log's removals). Shiki is a peer of
  the web build like UI SDK (it had pulled 250 language chunks in); the build is three files. The pattern: kits whose
  markup follows live state are data elements (UI SDK's `render(el, instance)` hook, or a
  vanilla element around a primitive's root part) that take data as properties and report
  changes as events, so Vue and Svelte bind them like components. To keep React and web from
  drifting, the logic moved into shared framework-free modules: each chart's geometry now
  returns plain nodes (`chart/plots/*.ts`, drawn by React's ChartFrame and by the web frame;
  all React chart tests unchanged and passing), the grid's column and edit rules live in
  `data-grid/columns.ts`, icons in `shell/icon-paths.ts`, cable paths in `studio/cables.ts`.
  Primitive callbacks took UI SDK's `(value, details)` shape where a second argument was a
  bare value (`onAction(row, { action })`, `onAdd(column, { title })`), since a web
  element spreads the second argument into its event's detail. Web-only lessons, each now
  handled: a popup inside a row or header gets that row's pointer and key handlers on the
  web (React portals it), so menus are marked as handles; chart CSS sets `display` that
  outranks `hidden`; a dialog's `final-focus` is a selector read as it opens; setting
  `dialog.open` fires no events (use `api.open()`); a `title` attribute would give a chart
  the browser's tooltip (it's `label`); `hidden` and `submit` clash with built-ins (the
  board's property is `hiddenCards`, the composer's event `send`). The chat renders markdown
  with remark (unified, remark-parse, remark-rehype pinned as direct dependencies), loaded
  on demand. Bugs found on the way: the swipe list's focus recovery lost a removed row's
  place when cleanup runs after removal (fixed in the primitive, for React too); Blueprint's
  chat code blocks put the dark keyword color at 4.37:1 on its muted blue (now 0.84
  lightness, all six pairs pass); the chart refactor briefly produced duplicate React keys
  (fixed); the thread list's `select` met the rename box's native `select` (now
  `valuechange`). Full check green with Chat (179 unit, 300 e2e), install test 105/105.
- 2026-11-15 — **Step 7, Studio for Web Components**: `<uiset-patch-bay>` is a data element
  in UI SDK's sense: its root's `render(el, instance)` hook subscribes to the primitive and
  draws the cables, the same `cablePath` the React bay now uses (`studio/cables.ts`). Its
  ports take their names from the jacks' `aria-label`s (for agents and "Patched to …"),
  `bay.value` reads and sets the cables through a live `state` mapping (the primitive gained
  `cables()` and `setCables()`), and `api` exposes plug, unplug and clear. Faders, meters
  and step sequencers are UI SDK's own elements in UISet's classes, as in React. The web
  demo has an agent bridge now; 3 new web tests, 3/3 mutations. This is the pattern for the
  rest: kits whose markup follows live state (a board mid-move, a scheduler drag) render
  from properties inside the element, so Vue and Svelte bind props and events as with any
  component. `web/` is now in the root tsconfig (it was never typechecked). Two Board tests
  were ambiguous once the Canvas toolbar's own Undo shared the page, and ChatModelPicker
  passed a default while controlled (a UI SDK warning); both fixed. The install test caught
  the IDE template typing its tabs by inference, which differs without
  `noUncheckedIndexedAccess`; typed explicitly. Full check green (179 unit, 233 e2e incl.
  15 web), install test 105/105.
- 2026-11-15 — Terminal review pass (independent, in Chrome) found 19 bugs; all fixed, with
  5 new unit and 8 new e2e tests, 14/15 mutations caught (the Ctrl+C race is backed up by
  `stop()`, so its own removal goes unnoticed; accepted). Output now runs through a small
  screen with a cursor: `\r` returns to the line start without erasing (Python's
  `end="\r"`, `\r\n` split across chunks), `\b`, erase-line, column and cursor-up codes
  (ora and log-update spinners), styles carried across lines, escapes split across chunks,
  colon parameters, private sequences, OSC 8 links (http(s) only), bidi overrides dropped.
  Lines render memoized with one update per frame and `content-visibility`. Inverse is a
  solid fill (Jest's PASS/FAIL were 1.2–2.9:1), dim keeps its color, bright black is grey,
  color styles are scoped to terminal lines. Ctrl+C always returns the prompt; the log
  reads additions only and quiet lines are hidden; scrollback trims only while following;
  Tab quotes and lists on the second press; prototype names aren't commands; agents can't
  fake the echo; `messages` and `createTerminalController` (output from a socket). A dev
  remount used to stop repainting (a cancelled frame left marked pending) — caught by tests.
- 2026-11-15 — Rich text editor built on UI SDK with no editor library (no Tiptap,
  ProseMirror or Lexical), so a UI SDK app never mixes in a second UI stack. A flat block
  document (paragraphs, headings, quotes, code, lists with an indent, to-dos, dividers,
  images; runs with marks and mention tokens) edited through `beforeinput` on a
  contenteditable, redrawn from the document; "/" and "@" are UI SDK's TriggerMenu through
  its `TextEditorAdapter`; undo is `createUndoStack`; the toolbar is Toolbar, Toggle,
  Select and Popover. Agents see one component whose value is Markdown (`setValue`,
  `insert`, `clear`, one undo step each); the toolbar is agent-hidden. HTML in is a
  whitelist (paste is untrusted); HTML out is a fixed tag set. Quote blocks in a row are
  one quote in HTML and Markdown. Deleting everything leaves an empty paragraph. The same
  view backs `<uiset-rich-text>`, with the area as a createParts element.
- 2026-11-15 — **Phosphor and Ink skins.** Phosphor is dark only, Ink light only, like
  Blueprint and Studio's fixed schemes; the test loops skip the scheme a fixed skin
  doesn't have. Phosphor's Dim went from L 0.68 to 0.75 and its red from 0.72 to 0.75
  after axe found them under 4.5:1 on tinted surfaces. Ink's plan drew chart series as dots
  and hatching, but the chart kit fills marks with one color per series and a legend
  couldn't show which pattern is which, so data alone takes a muted, print-like set (like a
  color e-paper panel); the interface stays ink only. Inside inverse-video and solid rows,
  both skins reverse the muted tokens, so hints and counts stay readable. The stale "Coming
  next" band became "Five skins, one set of components".
- 2026-11-15 — **Rich text review.** An independent review found 25+ issues; fixed: two
  security holes (a link at a collapsed caret skipped `safeHref`; the editor's own
  clipboard format and app documents were trusted, allowing `javascript:` links,
  attribute injection through `level`, and a hang through a huge `indent`; now
  `sanitizeDoc` checks every document that comes in), triple-click delete merging the next
  block, no way out of a trailing code block, Enter swallowed by an empty "/" menu, the
  caret mapping after a line break in bold, Markdown marks inside words, typing over a
  selection dropping its marks, undo's caret, Escape losing the selection, an agent's
  insert re-reading the whole document (`applyMarkdown` now appends), Markdown round trips
  (C#, "1) ", "---", links with parentheses, code with backticks), input-method text
  ignoring typing marks, pasted tables, to-do boxes (click activation, named by task),
  read-only focus, web late `uploadImage`/`messages`, `value` attribute, removal leak.
  15/15 new mutations caught. Left as known: pasting "a\n\nb" into a list item ends the
  list; whole-document work per keystroke on very long documents; Backspace removes a
  whole grapheme in scripts where native editing removes one code point.
- 2026-11-15 — **Docs follow the registry.** `scripts/docs.mjs` writes docs/README.md,
  public/llms.txt, public/llms-full.txt, the served docs and the skill's catalog from
  registry.json, and fails when an item has no docs page. A new unit test checks that every
  item's files and registry dependencies resolve all its relative imports, as if installed
  alone; it found `chat-app` and `pricing` missing `icon-paths.ts`, and `canvas`, `mobile`
  and `dashboard` missing `toolbar`, `menu` and `empty-state`. The base skin now adopts
  shadcn's `--radius`. Known, from the docs pass: the chat composer offers agents only the
  trigger menu's `insert` (no `setValue`); a chat rename needs Enter or blur to save;
  per-answer controls repeat names across answers; React `ChatTool` has no built-in
  Allow/Deny; the composer has no `TriggerMenuStatus`.
- 2026-11-15 — **Check after the four-part push** (fixes, templates, rich text, skins, DX):
  typecheck clean; 346 unit tests; 611 e2e (React and web, every skin) green after fixing
  three tests that raced UI SDK's page announcer (it repeats a toast's text for a moment;
  lookups are now scoped to the toast region) and giving the template gallery 15s to load
  under a full parallel run; registry build and fresh-app install test 108/108. The
  "Five skins" band's sample forms are `inert` and hidden from assistive tech: the
  interactive specimen above already demonstrates them, and five copies repeated its
  field names for screen readers.
- 2026-11-15 — **Website rebuilt before launch**, from the owner's audit (two headers, no
  positioning, poor IA, no visible docs or skill, no logo, unclear SEO, no benchmark, no copy
  buttons, a shallow theme builder). Plan in design/site-plan.md. One shell (header with
  Docs, Components, Kits, Templates, Themes, Agents and ⌘K search; one footer); the home
  page argues the thesis (UI SDK gives behavior, UISet gives everything else) with live
  kits, the benchmark and the checks behind every item; a docs site with an introduction,
  installation, quick start, theming, AI, Web Components, migration and roadmap, a page per
  kit and skin, and a page per UI SDK component. Component pages load only their own
  example (examples split into `src/site/examples/`, metadata in `meta.ts`), show its code,
  carry UI SDK's own API reference and accessibility sections (extracted from the installed
  `@ui-sdk/react` docs at build, Apache-2.0, credited, links rewritten), and show the
  example's live `agent.snapshot()`. Every page is prerendered with its title,
  description, canonical link and structured data; robots.txt welcomes AI crawlers.
  Found on the way: bands and install commands were grids whose column grew to the widest
  child, so /kits was 1,602px wide on a phone and the hero's copy button was cut; pages that
  load lazily ignored a `#section` in the address on arrival.
- 2026-11-15 — **Benchmark method.** Mirrors UI SDK's comparison on our own kits: the same
  prompt and page for both approaches, the browser approach getting Playwright-MCP-style
  tools (snapshot, click, fill, press, select, check) that return the snapshot after each
  action, the bridge approach getting snapshot, act and query; the harness checks the page
  afterwards. Tokens are published per task but kept out of the headline: Claude Code's own
  ~67,000 tokens of instructions dominate them for both approaches. Claude Code shortens
  very long command output, so browser agents saw less than the full grid snapshot; that
  favors browser tools, and the README says so.
- 2026-11-15 — **Theme generator skins don't set `color-scheme`.** In the `uiset.skin` layer
  it would override the `color-scheme` that `[data-theme]` sets in `uiset.tokens`, so
  `theme="light"`/`"dark"` would stop pinning the scheme and nested roots would break. A
  unit test asserts it. The old /theme builder and its test are removed; /theme now opens
  the generator.
- 2026-11-15 — **Launch notes from the rebuild.** The static build (`pnpm build:static`)
  prerenders with Playwright, so the deploy needs a browser at build time (install
  Chromium in the build command) or a prebuilt upload. The site's URL is assumed to be
  https://uiset.dev; meta, the sitemap, llms.txt and the registry all read it from
  `homepage` in uiset.config.json, so that's the one place to change it.
- 2026-11-15 — **Nested corners are concentric.** The owner spotted the segmented control's
  track rounder than its chosen item: base.css had put the track on the popup radius
  (1.5×), 12px around a 5px item. The track now keeps UI SDK's radius, whose item is that
  radius less the 3px gap and edge; Studio's track is 8px around its 3px pads with a 4px
  gap. A scan of every page (each rounded box against a rounded child in its corner) found
  the same fault in toolbars: a select or menu button kept the full radius. Controls in a
  toolbar now take the toolbar item radius (the rich text toolbar, 4px inside the editor,
  uses the radius less 5px; Studio's toolbar is 6px around 3px pads). The scan is clean in
  all five skins.
- 2026-11-15 — **Review of the rebuilt site** (Web Interface Guidelines, by a separate agent):
  fixed the skip link hidden under the sticky header, the search button's missing name on
  narrow screens, no theme switch on phones, no page-level `color-scheme` (light scrollbar
  in dark mode, and a flash of the wrong scheme on prerendered pages; a pre-paint script now
  applies a kept choice), focus going to an unnamed `<main>` after navigation (now the
  page's h1), "Loading…" between pages and on a cold load (pages and their Markdown now load
  before the address changes, and before the first render), lost scroll on Back, the docs
  sidebar coming before the article in tab order, every docs table named "Table", every copy
  button named "Copy" (CopyButton takes an `aria-label`), straight quotes, a ⌘K hint that
  never showed, and the search index and benchmark screens in the entry bundle. Also found:
  the terminal kit wrote its welcome text before mounting, which on a heavy page warned
  "state update on a component that hasn't mounted yet"; writes before mount now wait for
  it (test in tests/unit/terminal-mount.test.tsx, mutation caught).
- 2026-11-15 — **In-page links and the Studio kit, from the owner's review.** Links to a
  section of the same page (/kits#scheduler, the docs' On this page) jumped back to the top:
  the Back-button scroll restoration added in the review pass handled every `popstate`,
  including the browser's own fragment jumps, with "saved position or top". The router now
  leaves a same-page jump to the browser, keeps the reading position in the history entry as
  you scroll, and on Back goes to the saved position, else the #section, else the top (test
  in site.spec; the original bug put back fails it). The Studio kit was pinned to its own
  skin on /kits, and its stage painted `var(--studio-rack)` unlayered, which left Blueprint,
  Phosphor and Ink text at about 1.1:1 over the page; the stage is hardware only in Studio,
  the band opens in Studio and then follows the skin picker (Base included), and the rack is
  now axe-checked in all five skins × both themes (stage mutation fails 3 of 10). On the
  owner's follow-up the band no longer opens in Studio while the page shows Base (that was
  misleading): it follows the picker from the start, with a link to see it in Studio.
- 2026-11-15 — **Docs examples match the components page.** The owner found most docs examples
  looking different from the gallery: the article's prose rules (`h2` size and margin, `p`
  width, list and inline-code styles, `line-height: 1.7`) reached into live examples, so a
  dialog's or calendar's `h2` came out as a section heading, and the frame stretched examples
  to 614px against a gallery card's 340px. The prose rules now stop at a nested `<UISet>`, the
  preview has the gallery's type context, and examples are card width (22rem), centered; wide
  ones take the frame. tests/e2e/docs-examples.spec.ts compares every element's type and
  spacing, and the width, for all 55 components (both mutations fail all 55). The same guard
  went on `.band h3`.
- 2026-11-15 — **Code blocks: the first line sat 4px right.** UI SDK styles every `<code>` as
  inline code; inside `<pre>` its padding indents only the first line. It hit the site and the
  chat kit's code blocks. base.css now resets `pre > code` (padding, radius, tint); a test
  measures each block's first character against its edge (mutation fails).
- 2026-11-15 — **Data grid column menus return focus to their own column.** React: a column
  menu's button doesn't take focus on press, so UI SDK returned focus to whichever header
  had it before (Escape from Status's menu went to Region), every time. Web: the same check
  ran only if focus was already in that header, which a menu closed within a few
  milliseconds (reduced motion, fast input) never reached. Both now send focus to the menu's
  column header when the menu closes from itself (`escape-key`, `item-press`,
  `trigger-press`, `close-press`), and leave it where it went otherwise. New React test;
  the web test that failed when run alone now passes alone and in its file (mutations fail).
- 2026-11-15 — **Safari and Firefox.** The e2e suite now runs in WebKit and Firefox too, for
  React and Web Components (about 2,000 runs). Playwright's Firefox won't start on this Mac
  ("Could not find profile folder", even with a hand-made profile), so Firefox runs in
  Playwright's Linux image (`scripts/test-firefox-docker.sh`), as in CI. Real bugs fixed:
  Safari doesn't focus a clicked button, so focus that should come back after a click (the
  board's add form, the canvas inspector) stayed on an app's `<main tabindex="-1">`
  (`returnFocus` in `uiset/focus.ts`, used wherever kits return focus); the rich text
  editor lost its selection when a popover returned focus (it now re-applies it on focus);
  Back between sections on the site jumped to the top in Safari; Firefox added the data
  grid's scroll box as a second tab stop; Blueprint's checked switch and slider fill were
  invisible in Windows high contrast in Firefox (hatching is dropped there). Test-side:
  Safari's Tab skips links and buttons, so keyboard-order tests press Option+Tab there;
  clipboard permissions and CDP-driven touch and IME tests run in Chromium only; Safari has
  no forced-colors mode; Firefox empties the data of a script-made paste event, so paste
  tests skip there; the heaviest pages get more time. Known: Playwright's Firefox build
  crashes (signal 11 in the content process) when automation inspects the canvas pages and
  the Agent Console (axe's structural rules, and once a plain `evaluateAll`); selecting and
  moving nodes by hand in the same build doesn't. Those three tests are `fixme` in Firefox
  only; report to Playwright with a reduced case.
- 2026-11-15 — **Where it lives.** Code: github.com/superzero11/uiset (public, created by the
  owner). Site and registry: https://uiset.dev, a Vercel project in AppsYogi's Team
  (`apps-yogi-team`, Pro), where the domain is registered; uiset.vercel.app belongs to
  someone else. Deploy with `vercel build --prod` then `vercel deploy --prebuilt --prod
  --scope apps-yogi-team`, since the build prerenders pages in a local browser. npm:
  `@uiset/web` needs an npm organization named `uiset`.
- 2026-11-15 — **Lighthouse pass, and two prerender bugs.** Every prerendered page linked its
  on-demand CSS and code to `http://localhost:5698` (the prerender's own server): deployed,
  visitors' browsers would have asked their own machines for them. The prerender now makes
  them relative, drops preloads for chunks the drawn page doesn't need (the components page
  had 331), keeps the fonts' stylesheet non-blocking, and refuses to write a page that still
  names localhost. The fonts load without holding up the first paint. Lighthouse, on the
  prerendered build: accessibility 100 and SEO 100 on every page; best practices 100, except
  /components at 89 (the one-time-code input handles paste itself, which Lighthouse flags);
  performance on desktop 94 to 98; on Lighthouse's mobile profile 74 to 84 for docs, agents
  and the generator, 47 to 56 for home, kits and components. Known: the app renders each page
  afresh over the prerendered HTML (createRoot), so the largest paint on home and kits lands
  when the app's code has run (7 to 9 s on the mobile profile). Hydrating instead needs the
  first client render to match the saved page (theme, skin and kit in the address, the
  scheduler's dates), a follow-up.
- 2026-11-16 — **Public.** The code is on github.com/superzero11/uiset and the site on
  https://uiset.dev (prebuilt here and uploaded; Vercel's Git deploys are off, since its
  build machines have no browser for the prerender). Commits use the GitHub no-reply address,
  which GitHub requires for this account. Checked live: every page and deep link serves its
  prerendered HTML, `/kits/` redirects to `/kits`, the registry, llms.txt, docs Markdown,
  sitemap, robots and social card have the right types, and the pages load with no console
  errors or failed requests. `REGISTRY=https://uiset.dev scripts/install-test.sh` installed,
  typechecked and built all 108 items from the live registry; `superzero11/uiset/<item>`
  resolves through GitHub. Known: an unknown path answers 200 with the app's not-found page
  (a soft 404); CI won't run until the GitHub account's billing lock is lifted.
- 2026-11-16 — **The README tells the home page's story, with pictures.** The first README
  read like a reference manual. It now follows the home page: the pitch, UISet over UI SDK,
  three install steps, what's in the set, a gallery of the kits, the skins (an animation of
  one form through all five), the theme generator, the agent benchmark, docs, templates, Web
  Components, the quality bar and the roadmap, with uiset.dev linked at the top and from
  every picture. The pictures are drawn from the running site by `scripts/readme-assets.mjs`
  (`.github/assets/*.webp`, about 740 KB), so they can be redrawn when the site changes; the
  banner has light and dark versions. Per-kit API stays in the docs.
- 2026-11-16 — **`@uiset/web` 0.1.0 is on npm**, published by the owner under the `uiset`
  npm organization (MIT, homepage the Web Components guide, peers pinned to UI SDK
  `0.1.0-beta.2`). With the registry and site already live, 0.1.0 is released: the changelog
  carries the date, and the README links the package with a version badge.
- 2026-11-16 — **Real 404s, and the first paint keeps its font.** Every unknown address used
  to be rewritten to the app with a 200 (a soft 404). vercel.json now has no catch-all: the
  build writes `dist/404.html` (the not-found page, marked noindex, with no canonical), Vercel
  serves it with a 404 status, `/theme` redirects to `/themes/generator`, and the prerender
  fails if any page links to an address that isn't a page or a file. Mobile LCP was the same
  paragraph drawn twice: once from the prerendered HTML in the fallback font, then again by
  React after the web font had loaded, slightly larger, so Chrome counted the second, late
  paint (home 5.9 s, kits 6.3 s on Lighthouse mobile). The fonts now come from the site
  (`scripts/fonts.mjs` → `public/fonts`, OFL licenses alongside, `src/site/fonts.css`) and
  index.html preloads Instrument Sans, so the first paint already uses it and React's redraw
  is the same size: in local runs the observed LCP equals first paint on home, kits and docs,
  and visitors no longer connect to Google. Hydrating the prerendered DOM would avoid the
  redraw entirely, but the prerender saves the browser's DOM rather than React's server
  output (no text separators or Suspense markers), so it isn't a drop-in change.
- 2026-11-16 — **Search palette fills its dialog.** The palette kept its standalone 22rem
  width inside the 40rem dialog, and the empty-results message (a live region that's always
  there) was padded even when empty, leaving a gap under the field. A test checks the widths
  and the gap. The placeholder is shorter so it fits a phone. The favicon was still the old
  Veneer "V"; it's the UISet mark now.
- 2026-11-16 — **UI SDK 0.1.0-beta.5, and CI by hand.** UI SDK's `beta` tag reached beta.5
  (its `latest` tag is beta.3). UISet moved its pins without code changes: web.css is
  byte-identical, and the bridge changes (Combobox `setValue` refuses non-items, read-only
  inputs show as disabled, `registerTools` passes `consequentialHint`) don't touch UISet's
  usage. `registerTools(agent, { allow: () => true })` stays: the bridge's own `allow`
  (Agent Console approvals) already sends every `step.confirm` to the person first.
  Registry, docs and the README say beta.5; `@uiset/web` 0.1.1 carries the new peers (the
  owner publishes it). The GitHub account's Actions are on hold, and a run that can't start
  showed as a failed check on every commit, so CI is `workflow_dispatch` only until that's
  lifted (the file says how to restore its triggers); `pnpm check` runs before every change.
- 2026-11-16 — **Launch submissions.** Opened shadcn-ui/ui#12725 (`@uiset` in the registry
  directory; fork superzero11/ui), birobirobiro/awesome-shadcn-ui#772 (Registries) and
  bytefer/awesome-shadcn-ui#61 (UI Libs). registry.directory took a POST submission (pending
  review; its update token is in `launch/`, outside git). skills.sh lists skills from install
  telemetry, so one `npx skills add superzero11/uiset` installed all 14. Filed
  vercel-labs/ui#607–#624 from ROADMAP 3c (verified on beta.5) and added UISet's case to #541.
  Once #12725 merges: send registry.directory the `namespace`, switch posts and docs to
  `@uiset/...`, and tag @shadcn. 21st.dev needs the owner's account. Posts and clips are in
  `launch/`.
- 2026-11-16 — **The first paint no longer waits for scripts, and slow phones keep one LCP.**
  On slow 4G with 4× CPU (Playwright, Pixel 7), the live pages painted at about 2 s and
  reached LCP at 5–6 s: the site font still arrived after the first paint there, so React's
  redraw came out larger and counted again, and forty module preloads competed with the CSS
  and font. Now Instrument Sans (preloaded) uses `font-display: block`, so its text waits for
  it and the redraw is the same size (the skins' faces keep `swap`), and the prerender drops
  every module preload (the entry fetches its imports itself). Same conditions, medians of 3:
  home LCP 6.0 s → 1.2 s, docs 4.0 s → 1.2 s, kits 1.7 s → 1.4 s; the app starts 0.25–0.5 s
  later. Lighthouse mobile, local: home 0.67 → 0.79, kits 0.57 → 0.65, docs 0.78 → 0.93.
  `dist/app.html` is gone (it only existed to read those preloads).
- 2026-11-16 — **A daily community watch.** A scheduled task (9:30 IST, read-only) reports
  stars, traffic, npm downloads, the directory PRs, the filed UI SDK issues, mentions and new
  feedback, and keeps a ranked backlog of capabilities people ask for in `launch/watch/`.
- 2026-11-16 — **Patch bay: cables hold inside a scaled container.** Found while filming the
  Studio kit with a zooming camera: the patch bay turned screen positions into its own with
  plain subtraction, so under an ancestor's `transform: scale()` a re-measure put the cables'
  ends off their jacks (74 px at 0.7×) and a dragged cable trailed the pointer. `localPoint`
  in `studio/cables.ts` divides the scale back out (the element's screen size over its layout
  size); the React patch bay, its drag point and the web element all use it. An e2e test for
  each scales the rack, forces a re-measure and checks the ends on screen. `@uiset/web` 0.1.2.
