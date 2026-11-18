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
| **What apps need that UI SDK doesn't ship**   | App shell and layout (sidebar layout, header, page, card, breadcrumbs), data display (badge, stat, empty state, skeleton, description list, list), stepper/wizard, alert/banner, search field, **charts** (line, bar, area, donut, sparkline, keyboard-explorable), rich text editor, icons | **done 2026-11-15**, the rich text editor included (React and Web Components); 2026-11-16: table, avatar group, count badge, code block, inline edit and upload added (React; web versions next) |
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

On 0.1.0-beta.9 (2026-11-18, which UISet now pins), betas 6–9 fixed #1, #2, #5, #11, #14, #15,
#16, #19, #21, #22, #23, #24 and #26, by their release notes. UISet's own fixes for #1 and #26
are gone, and so (later that day) are those for #2, #14, #19, #21 and #22, and #16's in React.
#5's search field works and stays as it is. #23's code also restores the caret on Tab, so it
stays. #24's Cancel keeps a row ready to retry, which UI SDK's remove doesn't. The rest aren't
in betas 6–9's notes, and #25 is still open. New: #27, #28 and #29.

Upstream answers, as of 2026-11-18 (shadcn handled all of them): 15 of UISet's 24 issues are
fixed, each by a merged pull request (#27's, vercel-labs/ui#850, merged after beta.10 went out,
so it ships in the next beta). Three were closed as expected: #9 (vercel-labs/ui#612: labels are
page text, so steps that must land use a ref), #10 (#613: the card lands where its preview
showed, and Escape puts it back) and #20 (#621: only a script presses that soon). #12 and #13
(#615, #616) are confirmed and kept open as feature requests; for #12 shadcn suggests
`viewport.reveal(viewport.rectOf(port))` after `connect.keydown`. #6/#8 (#624) and #25 (#780)
have no answer yet. #28 and #29 are filed as vercel-labs/ui#856 and #857 (no duplicates).

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
24. **An agent can't remove one file from a File input.** The bridge lists the file input
    with its files as items, but offers no way to remove one: `removeFile` takes a `File`,
    which a step can't pass, and the Remove buttons aren't pressable by name ("file-input
    has nothing to press now"). `clear` works. Found building `upload`, whose Cancel and
    Retry are UISet buttons for that reason. Filed as vercel-labs/ui#782 (2026-11-17): in
    plain UI SDK, `removeFile` with a name or an item's value returns `false` inside a step
    the bridge reports as `ok`, and the value reaches the agent as `[{}, {}]`.
25. **`bindScrollPicker` skips a selection that arrives while a scroll is settling.** In
    WebKit, a wheel in a sheet that has just opened has a scroll still settling; a value set
    then (an agent's `setValue`) is selected, focused and never glided to, so the wheel shows
    the old option, and the sheet's reveal-on-rest scroll then picks a third one as it
    passes. UISet's `keepWheelOnValue` (`registry/uiset/ui/mobile/wheel.ts`) scrolls the
    value back into the band when a scroll ends, or soon after a new value, and the
    selected option isn't in it. Filed as vercel-labs/ui#780 (2026-11-17), reproduced with
    UI SDK alone: a wheel in a `<ui-drawer>`, its value set as the drawer opens with focus
    moved along, ends on another option in WebKit, 10 runs of 10 (Chrome is fine).
26. **A web drop zone's trigger gets no space above it.** UI SDK's `web.css` gives the
    trigger's wrapper (`:has(> [data-slot="file-input-trigger"])`) a top margin, but
    `<ui-file-input-trigger>` is `display: contents`, so the margin never shows; React's
    trigger is the button itself and gets it. UISet spaces the button in `web/src/web.css`.
    Filed as vercel-labs/ui#781 (2026-11-17).
27. **A component's own `run` agent action is refused** unless its first argument is the key
    of a rendered item (fixed by vercel-labs/ui#850, after beta.10): since beta.8 the bridge checks `run` the way it checks Command's,
    for every component: `"ls" isn't shown in Shell (c1) now.` UISet's terminal and swipe
    list list `runCommand` and `runAction` for agents instead (`run` stays for code). Filed as
    vercel-labs/ui#848 (2026-11-18), with a plain `definePrimitive` repro.
28. **Pagination trips UI SDK's own dev check as it's defined** (beta.9): `the "link" part
    is a link, which takes focus, so its slot needs focus`. A console warning in a
    development build; with `__UI_SDK_STRICT__` it throws on import. UISet's unit setup loads
    Pagination before turning strict mode on. Filed as vercel-labs/ui#856 (2026-11-18): the
    `link` slot lists `roles: ["link"]` without `focus`; beta.8 on.
29. **The web agent bridge names tabs from their root, not their list.** A `<ui-tabs>` whose
    `<ui-tabs-list>` has `aria-label` is "tabs c1 has no name" to agents; React names it
    from the list. UISet's web code and pages put the list's name on the root too (the IDE's
    open files, code tabs, the settings template, the rich text demo's output, the gallery).
    Without it five web pages drop below 100 on `agent-check`. Filed as vercel-labs/ui#857
    (2026-11-18); the web Tabs docs name the list, as React's do.

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

### 6b. Next (planned 2026-11-17)

The 30-day schedule above had shipped by 2026-11-16. What comes next, in order; the
evidence for each is its row in `launch/watch/ideas.md`. Every batch ships in React and as
Web Components together, with the gallery, docs and guide notes, and the checks in section 5:
by eye in 5 skins × 2 themes and at phone width, keyboard, agent and axe tests, mutation
checks, then a release, a deploy, and npm by the owner.

**Waiting on others.**
- `@uiset/web` 0.3.0 is on npm (the owner published it 2026-11-17; `latest`, 75 files,
  checksum matching the checked build, a fresh install imports `defineForm` and
  `formTool`). awesome-ui-sdk lists the Web Components: LioRael/awesome-ui-sdk#1, merged
  2026-11-17.
- `@uiset` is in shadcn's registry directory (merged in shadcn-ui/ui#12677, which closed our
  #12725), and `npx shadcn@latest view @uiset/<item>` works. Install lines read
  `@uiset/<item>` since 2026-11-17. registry.directory refused the namespace update (422: "not
  listed in the official shadcn registry index"), though shadcn's `registries.json` lists it.
  Its check (`apps/web/app/api/submit/route.ts`) reads that file with a one-hour cache and
  wants the entry's homepage on the submitted URL's domain. On 2026-11-18, with the owner's
  go-ahead, the retry passed (200, "Submission updated"): the pending entry carries
  `namespace: "@uiset"`, the other fields as first sent. It waits for their review.
- UISet is on UI SDK 0.1.0-beta.9; beta.10 is out (2026-11-18, 09:42 UTC: date picker and
  dialog focus, `FieldDescription` ids, Input form reset). vercel-labs/ui#848's fix comes in
  the beta after it. #780, #856 and #857 are open (section 3c).

**Batch 3: agent-first**, first: what no other registry does (owner, 2026-11-17).
1. Schema form and multi-step form: one schema renders the form and registers an agent tool,
   so an agent fills it by field name, with validation and approval (ideas #4). M.
   **Done 2026-11-17** (`schema-form` in React, `<uiset-schema-form>` for Web Components).
2. Agent-readiness check: a test helper and CLI that flag unnamed and ambiguous controls,
   with a score per page (ideas #7). S–M. **Done 2026-11-17** (`agent-check`), and UISet's
   own templates and Web Components pages score 100 on it, held by a test. It reads any site
   too, from a bookmarklet, and [uiset.dev/check](https://uiset.dev/check) checks a public
   page from its pasted link.

**Batch 2: data apps**, next: the most-asked pieces still missing.
3. Filter builder and saved views for the data grid (ideas #2): typed operators, a filter
   bar, saved views, and an agent setting a filter by name. M.
4. Data grid remote rows (server sort, filter and cursor paging), tree rows and detail rows
   (ideas #5). M–L.
5. App shell variants: nested menus that fly out when collapsed, drill-down, a double
   sidebar, a top bar (ideas #3). M.

**Batch 4: a skin and screens.**
6. Print skin, from a written design plan first (Swiss and letterpress type, section 3).
7. SaaS console screens: team and roles, API keys and webhooks, audit log, usage, CSV import
   (ideas #8). M.

**Between batches**, small and asked for: a radial gauge and circular progress chart (ideas
#9), an Angular guide (next framework by demand), tree select (ideas #14).

**Later, one at a time:** Gantt, media player, map kit, generative UI adapters.

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
| First batch from the 2026-11-16 research: `table`, `avatar-group`, `CountBadge`, `code-block`, `inline-edit`, `upload` | done | 2026-11-16: 113 items; each checked by eye in 5 skins × 2 themes and at phone width; 33 unit and 17 browser tests; 35/35 mutations caught after two assertions were added; docs in app-shell.md and the new forms.md. 2026-11-17: the Web Components versions (`web/content.html`, `tests/e2e/web/content.spec.ts`, decision log) |
| "Looking for a component?" docs page, home page lines                                                | done    | 2026-11-16: docs/looking-for.md maps the most-requested shadcn/ui components to UISet items; the home page says plain CSS, no Tailwind, and links the page |
| Vue and Svelte guides                                                                                | done    | 2026-11-16: docs/vue.md and docs/svelte.md, every code block run in a new Vite app of each (typecheck, build, and the production build driven in Chrome); UI SDK's native Vue and Svelte components take UISet's skin from `uiset.css` alone (button, switch, select, dialog compared property by property). Writing them found 12 problems in `@uiset/web` 0.1.1, listed in the decision log; fixed the same day in 0.1.2 (row below), and the guides re-run on that build |
| `@uiset/web` 0.2.0: works as Vue and Svelte write it, ships types                                    | done, not published | 2026-11-16: bound attributes reach every element, `"false"` is off, lists as text, Clear fires `input`, late app shell children, a stylesheet with no demo rules, a module that imports in Node, and types for every element a page works with (the grid and charts take a row type). 27/27 mutations caught; Chrome, WebKit and Firefox; both guide apps rerun on the final build. 2026-11-17: typed events, `v-model` on twelve elements, and clean hydration under `data-uiset-hydrating` (decision log). The owner publishes |
| Listed on LioRael/awesome-ui-sdk                                                                     | done    | 2026-11-16: the owner got UISet onto the new list of UI SDK libraries |
| Data grid: a list column's editor in the skin                                                        | done    | 2026-11-16: UI SDK's Combobox in the cell replaces the browser's datalist, React and web; the editor's focus ring stays inside its cell |
| Tailwind CSS 4 apps work with no setup                                                               | done, web not published | 2026-11-17: in a shadcn/ui app (Tailwind 4), Tailwind's reset stripped UISet's controls and UISet outranked utility classes. UI SDK's web.css now sits in `uiset.base.sdk`, and `uiset/layers.ts` puts `uiset` between Tailwind's `base` and `components` when a page has Tailwind's layers (React root and `<uiset-root>`). Same computed styles as a hand-made fix in a test app, both import orders, popups included; the site's 57 pages and the web demos unchanged (79,128 and 6,856 elements compared); 6 unit and 5 e2e tests (Chrome, WebKit, Firefox), 4/4 mutations caught; the full Chromium and web e2e suites pass apart from a canvas drag test that fails the same way without the change |
| Agent migration recipe (`docs/agent-migration.md`)                                                   | done | 2026-11-17: a shadcn/ui app moved to UISet by a coding agent, step by step with checks; written from a test migration of a 17-component app. Corrected Installation, Looking for, Coming from shadcn/ui on the way |
| Chat and board demos score 100 on `agent-check`                                                     | done | 2026-11-17: found filming the agent-check video (chat template 94 after a reply, chat demo 84, board demo 92, all through the bridge). Chat toolbars and feedback groups named per message, React and web; the board demos' search is "Search cards". Agent tests for both demos, the chat template with a reply, and a chat with replies (React unit, web e2e), 4/4 mutations caught |
| uiset.dev's home page scores 100 on `agent-check`                                                  | done | 2026-11-18: 94 through the bridge with the chat demo open, 80 with the rich text one. Four renames: the hero's skin picker, the hero form's "Tone", the "Kit demos" tabs, the editor demo's "Show as" tabs. An e2e test checks the page with each kit demo open (Chrome, WebKit, Firefox), 2/2 mutations caught |
| uiset.dev's Kits page scores 100 on `agent-check`                                                  | done | 2026-11-18: 98 through the bridge. The data grid's "View" menu met the scheduler's "View" switch and the canvas's "Fit to view", and the terminal's "Command" every install line's "Copy the command to …". Kit renames, React and web: "Calendar layout", "Zoom to fit", "Command line". An e2e test checks the page (Chrome, WebKit, Firefox), 2/2 mutations caught |
| Focus after Undo and Add node lands in the same task                                               | done | 2026-11-18: the project board's Undo, the canvas's Add node and Enter to a node's notes put focus off a frame or two, so a quick key could land first and lose its focus. Now the same task as the press, React and web, demos and the canvas example too. 7 tests (Chrome, WebKit, Firefox) that read focus before the next frame; 7/7 mutations caught |
| UISet on UI SDK 0.1.0-beta.9                                                                       | done | 2026-11-18: from beta.5. The image cropper's handles beside the selection; agents call the terminal's `runCommand` and a swipe list's `runAction` (vercel-labs/ui#848); agent-check stops counting a closed tooltip; UISet's drop zone rule gone. Chrome and WebKit 1718 + the 149 after the renames; Firefox 844 (2 load-timing failures pass 6/6 alone); 2 mutations caught |
| UISet's fixes for what UI SDK betas 6–9 fixed are gone                                           | done, not pushed | 2026-11-18: `returnFocus` (UI SDK's `keepFocus` in 8 places), the date picker and tree ring overrides, the wheel's focus-follow (React and web), React's editor tabs' root name; the terminal trims past scrollback while you're scrolled up (new web e2e and React unit tests, mutations caught). Web tabs keep their root name (3c #29). Chrome and WebKit 1734, Firefox 846 (one load-timing test since fixed) |

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
- 2026-11-16 — **What to build next, from research.** Demand (shadcn-ui/ui and
  vercel-labs/ui issues and discussions, Hacker News) set against supply (940 registry
  entries): 2% of the official directory names keyboard or screen reader support, 1% has
  sound, none ships Web Components or lets an agent operate the UI. So build where demand is
  proven and those are missing. Write-up and ranked backlog in `launch/` (not in git). The
  first batch is the small, most-asked components and the docs that say what already exists.
- 2026-11-16 — **Table.** A real `<table>` inside UI SDK's Scroll area, so the scrolling
  region is a tab stop only while it scrolls, and `data-at-x-start` draws the kept column's
  edge. Borders are separate, not collapsed (a sticky cell's collapsed border scrolls away).
  Stacking is a container query on the table's own width; a table that stacks states every
  role itself, because browsers have dropped table roles when CSS changes `display`, and its
  headings stay in the tree, clipped. Each column's heading is copied onto its cells for the
  stacked layout to print, with empty alt text so screen readers don't read it twice.
- 2026-11-16 — **Code block.** The scroller is a named group, not a region: a docs page of
  code blocks shouldn't be a page of landmarks. Each newline sits between the line elements,
  not inside one: a marked line is an inline block, and with the newline inside it the next
  line ran off to its right (seen by eye, line 5 missing). A marked line takes the page color,
  not a tint of the accent: token colors are checked against the block's color and the
  page's, and Blueprint's tint failed 4.5:1. The package manager is a UI SDK preference, so
  every command on a page follows one choice.
- 2026-11-16 — **Inline edit.** A primitive on `createInlineEdit`. The value is a button, so a
  press, Enter or Space edits; F2 too. Tab is left to the browser (focus moves on, and
  leaving saves) because the helper's own Tab keeps focus for a grid to place; text that
  can't be saved keeps focus in the field. The value's button is gone while the field shows,
  so the new one takes focus as it arrives after Enter, Escape, Save or Cancel. Save and
  Cancel cancel both `pointerdown` and `mousedown`, so a press there isn't first read as
  leaving the field, which saves (Safari doesn't focus a clicked button).
- 2026-11-16 — **Upload.** UI SDK's File input holds the files; a framework-free queue
  (`upload/queue.ts`) holds each one's status and runs the app's `upload` a few at a time.
  An upload canceled before it began is never started: React's Strict Mode stops and starts
  the queue in one tick, and the first version started both, so the example's "fails once"
  file never failed. Cancel and Retry are UISet buttons out of the Tab order, like UI SDK's
  Remove; Enter on a row that stopped retries it. The root is a group named by `label`, so
  agents find "Attachments" rather than "Choose files".
- 2026-11-16 — **Data grid: the editor's ring was outside its cell** (owner's report). The
  editor asked for an inset ring (`outline-offset: -2px`) with a plain class selector, and the
  skin's default ring for any focused part, added later with `:focus-visible`, outranked it:
  the ring sat four pixels outside the cell, over its neighbours. The editor now states its
  ring where it has focus. The other inset rings (chart points, terminal, IDE, tab bar,
  sidebar, scroll areas, the grid's own active cell) were measured in the browser and are
  right.
- 2026-11-16 — **Data grid: a list column's editor is UI SDK's Combobox** (owner's request:
  the browser's datalist "goes out of sync with the UI"). A datalist's arrow and list are
  the browser's and take no skin. The grid keeps `createInlineEdit` for text, numbers and
  dates; for a column with `options` the cell renders a Combobox instead, open, with the
  current option highlighted. The primitive gained three small things so an editor of its
  own can finish an edit: `typed()` (the character that started it, set before the edit
  starts because the web element draws as the state changes), `choose(text)` (saves through
  `onCellEdit`, ends the edit, puts focus back on the cell; the same value saves nothing)
  and `leaveEdit(refocus)`. Escape refocuses the cell; a press elsewhere doesn't. Tab saves
  the highlighted option, as it saves text in the other editors. The popup sits inside the
  cell, which takes no pointer while editing, so the list asks for it back, and a press in
  it is marked `data-grid-control` so it isn't read as the start of a range drag. On the
  web the same `<ui-combobox>` is built in the cell; selecting the text or applying the
  typed character waits a tick, since the combobox fills its input as its parts connect.
  Tests: 3 unit, a keyboard-and-pointer test and an axe pass with the list open in each
  build, in Chrome and WebKit; 12/12 mutations caught after two tests were strengthened.
- 2026-11-16 — **Vue and Svelte guides, and what writing them found in `@uiset/web` 0.1.1.**
  Each guide was written against a new Vite app and every code block in it ran there. UI
  SDK's native Vue and Svelte components take UISet's look from `uiset.css` alone, so the
  guides offer both routes. To fix in `@uiset/web`, none done yet: (1) Vue can't set
  attributes that share a name with a read-only member (`<uiset-data-grid>` `label`,
  `locale`, `selectable`, and `editable`, which throws; `<uiset-search-field>` `label` and
  `shortcut`; `<uiset-rich-text>` `label`; `<uiset-agent-activity>` `source`), so the Vue
  guide binds them with `.attr`; (2) `values="4,6,,8"` on a sparkline and `trend` on a stat
  break when a framework sets them as properties; (3) no type declarations; (4) `uiset.css`
  carries the demo pages' rules: an unlayered `body` rule, `uiset-root { min-block-size:
  100dvh }`, Instrument Sans on `uiset-root`, and 36 `.web-*` classes; (5) importing the
  module in Node throws "HTMLElement is not defined"; (6) `toolbar="false"` still shows the
  toolbar, while the stepper's `linear="false"` turns it off; (7) the search field's Clear
  fires `valuechange` but no `input`, so Vue's `v-model` misses it; (8) a direct child added
  to `<uiset-app-shell>` after it mounts never appears; (9) hydrating after the elements are
  defined mismatches in both frameworks. Docs fixed now: the pnpm install line (pnpm takes UI
  SDK's `latest` tag, an older beta), the web page's list of skins, and where the guides are.
- 2026-11-16 — **`@uiset/web` 0.1.2: the problems the guides found, fixed.** Owner: "Yes,
  fix them". (1) Each attribute that shared a name with a read-only member or method is now
  a property that writes its attribute; a unit test reads every element class and fails if
  a member hides an attribute again. (2) One `isOn` in `dom.ts` reads every presence
  attribute, so `"false"` is off everywhere, the root's `sound` and `haptics` included.
  (3) `values` and `trend` take the attribute's text as a property. (4) The search field's
  Clear dispatches `input` on its input, and `valuechange` follows from the one listener.
  (5) The app shell adopts children added after it mounts (its own `appendChild`,
  `insertBefore` and `removeChild`, and an observer for the rest). (6) `web.css` is only
  what the elements need; the demo pages' layout, `body` rule and web font moved to
  `demo.css`, which only they load. (7) Element classes extend `ElementBase`
  (`HTMLElement` where there is one), so the module imports in Node and defines nothing
  there. (8) Types: `scripts/web-types.mjs` emits declarations after the build, rewrites
  the `@/` paths and checks the result as a consumer would, with `skipLibCheck` off. UI SDK
  primitives can't be written into a declaration (their inferred types name UI SDK
  internals), so the ten primitives are marked `@internal` and left out, and the kits made
  from them are typed by what a page sets and calls: `UISetBoard`, `UISetSchedule`,
  `UISetCanvas`, `UISetTerminal`, `UISetSwipeList`, `UISetPatchBay`, `UISetKnob` and the
  five charts. Their script APIs are written out, and `tests/unit/web-types.test.ts`
  makes the typecheck fail if one drifts from its primitive; it also fails if the build
  defines an element the tag map doesn't name. Not changed, by choice: the key color stays
  `data-key` with three variables (no root attribute), and hydrating markup after the
  elements are defined still mismatches, so the guides keep their import order. Checks:
  typecheck; 427 unit tests; the web build with its declaration self-check (`skipLibCheck` off, lib ES2022);
  the whole browser suite in Chrome and WebKit, React and web (1,469 passed, 6 skipped, 1
  failed, below); the web tests in Firefox in Docker (322 passed, 7 skipped: 315 in the
  run, and 7 rerun green after one loose assertion was fixed and six were traced to a host
  test run and a source edit made while Firefox was running); the static site (92 pages).
  Both guide apps were reinstalled from the final tarball and rerun: Vue `vue-tsc`,
  `strictTemplates` and a type probe pass, 224 browser checks pass; Svelte `svelte-check`
  passes, 205 browser checks pass. 27/27 mutations caught. Still open in `@uiset/web`:
  events are untyped, and `v-model` works on the search field only (the guides show the
  bind-and-listen pair for the rest).
- 2026-11-16 — **A WebKit-only intermittent failure in the React Mobile kit, not fixed.**
  "a value an agent sets on a wheel stays, while the sheet is still settling" failed once
  in the full run, 1 of 8 alone, and 5 of 10 with ten copies in parallel. The Mobile kit is
  unchanged since the last commit (one comment in `swipe-list.ts`), and the same test passed
  in the batch 1 run. It is the timing in upstream note 21 (WebKit rests a sheet a few
  hundred ms late), so the workaround in `WheelPicker` may not always win. Needs its own
  look.
- 2026-11-16 — **Canvas: `addNode` renders before it returns.** The Firefox run failed
  "agents add, wire, move and select nodes by name": the step after `addNode` looked the new
  node up in the options of the last render, and React hadn't rendered yet ("No node Log").
  Chrome and WebKit happen to render in time. `onAdd` now sets the nodes inside `flushSync`.
  A unit test adds a node through the controller and looks for it in the same tick; without
  the fix it fails.
- 2026-11-16 — **A Firefox crash that is the test tooling's, not the upload's.** In
  Playwright's Firefox (in Docker), `expect(section).toContainText(...)` on the upload example
  followed by an axe scan of that section crashes the page: 4 runs of 4, against 0 of 12
  when the test waits another way, and 0 of 4 when a different section is scanned. The
  phone-width tests wait with a DOM query and scan one section per page load. Nothing a
  person does reaches it.
- 2026-11-16 — **Checks for this batch.** Typecheck; 422 unit tests; the web build; the whole
  browser suite in Chrome and WebKit, React and web (1,425 passed, 6 skipped; one WebKit
  canvas drag test failed under the parallel run and passed 3 of 3 alone); Firefox in Docker
  (695 passed, 16 skipped, 5 failed: two were the tooling crash above and one the canvas
  bug, all three fixed and rerun green in Firefox; a page-heading focus test and a chat
  streaming test passed alone); a fresh-app install, typecheck and build of all 113 items.
- 2026-11-17 — **The WebKit wheel failure, found and fixed.** Owner asked about the open
  items. Logging scroll, focus and selection on the hour wheel showed the cause: the
  selection the agent makes arrives while a scroll on the wheel (from the sheet opening) is
  still settling, and `bindScrollPicker` doesn't glide to it (upstream note 25). The wheel
  kept showing 8 with 3 selected; when the sheet came to rest, Drawer revealed the focused
  option with a smooth `scrollBy`, and the picker chose each option it passed, ending on 5
  (or 2, or 12). The agent highlight's `scrollIntoView` wasn't it: with that turned off, it
  still failed. `keepWheelOnValue` (shared by React's `WheelPicker` and `<uiset-wheel>`)
  checks when a scroll ends, and 120 ms after a new value, whether the selected option is
  in the band, and if not scrolls it there at once, which the picker reads as the same
  value. Probe: 8 of 12 runs failed before, 0 of 16 after. The test: 48 of 48 (React and
  web, 24 each, three workers); with the helper turned off, the React test fails again.
- 2026-11-17 — **`@uiset/web` events are typed.** Elements extend `Evented<Events>()`, a
  base typed as UI SDK's `UiElement<Events>` (the grid, generic over its row type, declares
  its listeners in a merged interface instead: a class can't use its own type parameter in
  its base). The kits made from primitives intersect `UiElement<…Events>` into their types.
  Each element's map is exported (`UISetKnobEvents`, `UISetDataGridEvents<Row>`, …). Tests:
  type checks in `tests/unit/web-types.test.ts`, and a unit test that every event a module
  dispatches is in its map; 4 mutations caught.
- 2026-11-17 — **`v-model` on every element with a value.** Vue's `v-model` on a custom
  element sets `value` and reads it on `input`. Eleven more elements now keep that: the
  stepper and chat threads gained a live `value`, the composer's is its text, the wheel's
  is its listbox's, and each fires `input` once a change is in (`change` too for a finished
  choice; the knob's on `valuecommit`). Found on the way: the browser reads lifecycle
  callbacks once, at `define`, so the knob and patch bay are wired in createParts' root
  `render` hook, which runs again when a property is set, so the wiring happens once per
  element; UI SDK's `<ui-select>` and `<ui-listbox>` fire their own `input` and `change`,
  which bubbled out of the model picker and wheel as a second report, so those stop at the
  part; and the knob's `value` was a controlled option, so a page that set it froze the
  knob. Its value now follows a turn unless `valuechange` is refused (CHANGELOG, Changed).
  Checked in a real Vue 3.5 app (29 checks, Chrome and WebKit) and in
  `frameworks.spec.ts`, which does what `v-model` does by hand; 8 mutations caught. Vue's
  server compiler rejects `v-model` on custom elements, so the guide says to use the pair
  there.
- 2026-11-17 — **Hydrating server-rendered HTML: `data-uiset-hydrating`.** Tested with Vue's
  `renderToString` and Svelte's `render`, hydrated in Chrome and WebKit. Module loaded
  before hydration: in Vue, the app shell had already laid out its children and Vue threw
  the page away ("Hydration node mismatch"); Svelte reported "Failed to hydrate" and
  rendered again. After: Vue wrote arrays as attributes and the grid, stepper and patch bay
  stayed empty. Now `defineElement` holds an element's first `connectedCallback`, and
  `holdRender` a createParts root's `render`, while an ancestor has `data-uiset-hydrating`;
  removing it draws them in the order they connected. With the module loaded before
  hydration and the attribute removed after, both frameworks hydrate with no warning and
  every element draws with its data. `<uiset-root>` isn't held, so the skin applies at once.
  A test in `frameworks.spec.ts` checks the held tree is the server's and that it draws on
  release; 2 mutations caught.
- 2026-11-17 — **Batch 1 as Web Components.** `<uiset-table>` (your `<table>` in a scroll
  area; stacked roles and labels; a framework can still add and remove the table, as with the
  app shell), `<uiset-avatar-group>`, `<uiset-count-badge>`, `<uiset-code-block>`,
  `<uiset-code-tabs>`, `<uiset-package-command>` (`web/src/content.ts`), `<uiset-inline-edit>`
  on the shared primitive (`web/src/inline-edit.ts`) and `<uiset-upload>` on UI SDK's file
  input with the shared queue (`web/src/upload.ts`). The package-manager preference moved to
  `code-block/commands.ts`, so React and web share one choice. Found on the way: UISet's
  icon-button rule (`[aria-label]:has(> svg:only-child)`) squeezed a labelled copy button's
  text, so the web copy button wraps its label in a span as React's does; UI SDK's web tabs
  need a button in each tab; UI SDK's drop zone spaces the trigger's `display: contents`
  wrapper, so the space never shows (UISet spaces the button in `web.css`); taking UI SDK's
  remove part out of an upload row while its item was binding left the item unbound (no
  role, no tab stop), so Remove stays and is hidden by an unlayered rule; and a part's own
  `display` beats `hidden`, so parts show by presence (`showIn`). Compared by eye with the
  React examples, and looked at in five skins at phone width. Tests: axe in every skin ×
  theme with the inline edit's error and an upload showing, and each element's behavior by
  keyboard, pointer and agent, in Chrome and WebKit; 10/10 mutations caught. `@uiset/web` is
  126 KB gzipped (118 before) and its CSS 40 KB.
- 2026-11-17 — **`<uiset-upload>` keeps what's set before it upgrades.** `upload` and
  `messages` were plain class fields, which replace a property a framework set before the
  element was defined, and a `value` set before the element built was dropped. Now accessors
  over private fields, with the files held until it builds. A test sets both on an element in
  a template's content (not upgraded) and adopts it; 2 mutations caught.
- 2026-11-17 — **Another Playwright-Firefox page crash, the test's.** The Content page's axe
  tests crashed Firefox's page in all six skin × theme runs. Isolated in Docker: a role query
  (`getByRole("region", { name })`) in `beforeEach`, then a scan, crashed 3 runs of 3; a DOM
  query in its place, 0 of 3. Without that wait, the edit, the upload, the skin and the WCAG
  2.1/2.2 rules each scanned fine. The test waits with a DOM query.
- 2026-11-17 — **Checks for the open items.** Typecheck; 428 unit tests; the web build with
  its declaration self-check (63 files); the whole browser suite in Chrome and WebKit, React
  and web (1,508 passed, 7 skipped, 1 failed: a WebKit rich-text axe test whose editor didn't
  show its heading in 5 s under the full run, 5 of 5 alone; the WebKit wheel test passed),
  and the files changed after it rerun (35 passed, 1 skipped); Firefox in Docker for the web
  tests and the React Mobile and new-parts specs (384 passed, 9 skipped, after the crash
  above); the static site (92 pages); a fresh-app install, typecheck and build of all 113 items; Vue 3.5 and Svelte 5 apps on the final tarball (29
  `v-model` checks; server rendering hydrated with no warning in both). 27 mutations caught
  in all.
- 2026-11-17 — **Released as 0.2.0.** The unreleased section held new items and two changed
  behaviors (the grid's option editor, the knob's live `value`), which the changelog's policy
  makes a minor release; the owner approved 0.2.0. Everything written as 0.1.2 above is in it.
  The owner publishes `@uiset/web` to npm.
- 2026-11-17 — **Batch 3 before Batch 2.** Asked which batch matters most, I said the
  agent-first one: none of 563 registries mention an agent operating the UI, the schema form
  has the backlog's joint-highest demand (8 signals), and a community UI SDK inspector
  appeared on 2026-11-15, so the readiness check is time-sensitive. Batch 2 improves kits
  where others already lead. The owner agreed: Batch 3 first, starting with the schema form,
  then Batch 2.
- 2026-11-17 — **`schema-form` (React).** UI SDK has no per-form tool API: components join the
  bridge through `definePrimitive`'s `agent` key, and `registerTools` exposes snapshot, act
  and query. So the form is a primitive (`schema-form/form.ts`) with `fill`, `goTo` and
  `reset` for agents, its fields as items, and its values and step in the snapshot; and
  `schema-form/tool.ts` turns the definition into a tool whose `execute` fills the form
  through the bridge, so `allow` and the submit's `data-agent-confirm` still decide. The
  definition is UISet's own (typed, no dependency), with any Standard Schema for rules
  across fields; JSON Schema comes from it for tools. WebMCP probed in jsdom: UI SDK calls
  `registerTool(tool, { signal })` and unregisters by aborting, and `registerFormTool` does
  the same. Found while building: the step's Next and the review's Submit sat in one slot,
  so React reused the button and turned it into a submit during its own click, which sent
  the form (Chrome; jsdom doesn't do this), so they're keyed apart and an e2e test guards
  it; the last step's action and the stepper's review step were both named "Review", so
  the action says Next everywhere; the review's narrow layout needed a container to query;
  Enter in a step's only field would have submitted, so a submit before the review is Next.
  An agent pressing the form's submit by name works; pressing it through the form fails
  ("has nothing to press"), which the docs say. Checked by eye in 5 skins, light and dark,
  and at phone width. Tests: 35 unit for the definition, 10 React and agent, 11 e2e in Chrome
  and WebKit (steps, server errors, agent fill and approval, phone width, axe in every skin
  and theme on a problem and on the review); 12 mutations caught (removing one key alone
  changes nothing, since one key keeps the buttons apart). The React suite in Chrome: 415
  passed, 5 failed (board and canvas drags, unchanged kits, 34 of 34 on a rerun alone); a
  fresh-app install of all 114 items; the static site (92 pages).

- 2026-11-17 — **`<uiset-schema-form>` (Web Components).** On the same primitive, with the
  labels, the review's wording and the focus target shared with React
  (`schema-form/labels.ts`). The root binds the `<form>` inside it (createParts' `target`),
  so it submits as a form does and has the form role. `send` is a function property rather
  than an `onSubmit` event: an event can't return the problems to show, and Vue reads any
  `on…` binding as a listener. `value` is live through createParts' `state`, and setting it
  fires nothing, as with UI SDK's own number input, radio group, select, checkbox, switch
  and date input (checked). A page sets `form` after the element is on the page, so the
  primitive now takes a definition given later, and fields it adds start at their defaults.
  Found while building, and fixed in React too: Enter did nothing on a step with two or
  more text fields (a form with no submit button submits on Enter only with one field), so
  Next is the form's submit on a step; and a step change dropped focus to the page when it
  took away what had it (the field Enter was pressed in, Back on the first step, an Edit),
  so focus goes to the new step's first field, or to Send on the review (keyboard only:
  Safari doesn't focus a button a mouse presses). Found on the web only: WebKit dropped
  every click on Next, because each draw rewrote the buttons' text and WebKit cancels a
  click whose pressed text node was replaced; and taking out a focused field fired its
  blur check inside the draw, which drew again mid-draw, so draws don't nest. Found in
  `<uiset-stepper>`: upcoming steps in a linear flow looked enabled (UI SDK's button takes
  `disabled` on its wrapper); and the stepper's labels sat high beside their marks on a page
  with a normal line height, and the marks grew without a `border-box` reset. Checked by eye
  in 5 skins, light and dark, and at phone width, beside React's. Tests: 476 unit (2 new for
  the primitive's `setValues` and late definition, and the element's API typed against the
  primitive's); 18 web e2e (steps, Enter and focus, server problems, every control, agent
  fill and approval, `v-model`, a select and checkbox from script, `disabled` and `label`,
  taken off the page and back, phone width, axe in every skin) and 12 React, in Chrome,
  WebKit and Firefox (Docker; its axe tests use DOM queries, as the Content page's do). 16
  mutations caught; one missed until the move test took the element off the page long enough
  to get a new instance. The whole suite in Chrome and WebKit: 1,566 passed, 1 failed (a
  canvas drag under load, 3 of 3 alone); a fresh-app install of all 114 items; the static
  site (92 pages).
- 2026-11-17 — **The schema form's native submit is a no-op.** Checking the deploy found
  that Next, now the form's submit, made the prerendered form submit natively before React
  hydrated: a GET that loaded the page with the typed email in its URL (the fields have
  names). The form is `method="dialog"` (React and web), whose native submit does nothing
  outside an open dialog, while the submit event still fires for the hydrated form. Tests
  copy the form's HTML into a page with JavaScript off and press Enter and Next (2 mutations
  caught).
- 2026-11-17 — **Release 0.3.0, with 0.2.0 unpublished.** The owner's `npm publish` from
  `main` would have shipped the schema form as 0.2.0, which the changelog put in 0.3.0
  (it also failed: `pnpm` wasn't on that shell's path, fixed with `corepack enable pnpm`).
  Asked whether to publish 0.2.0 from its commit or release 0.3.0, the owner chose 0.3.0
  now. npm goes from 0.1.1 to 0.3.0; the changelog says 0.3.0 carries 0.2.0's changes, and
  the Vue and Svelte guides now say "0.3.0 or later" for what npm users first get there.
- 2026-11-17 — **`agent-check`, the agent-readiness check.** A registry item with no
  framework in it: `checkAgentReadiness(agent)` takes any UI SDK bridge and asks the bridge
  itself, so it reads a page as an agent does. Errors: `unnamed` (a listed component with no
  name), `ambiguous` (a name `query` resolves to more than one component a step would take;
  a list found by one of its items doesn't count, and components with no actions, like
  avatars, may share a name), and `unseen` (a control Tab reaches with no `data-slot`, which
  UI SDK puts on every element it binds; a component's own inner parts, out of the Tab order
  inside it, are skipped). Warnings: `unconfirmed` (a label starting with Delete, Pay, Deploy
  and the like, with no `data-agent-confirm`) and `overflow` (past the snapshot's 100). The
  score is the share of controls an agent can find by name. `expectAgentReady` for tests,
  `checkPage` for Playwright, and `cli.ts` for URLs. Found while building: a query stops at
  100 too, and returns a different 100 than the snapshot; and the bridge counts components
  earlier tests removed in `more`, even on a new bridge. The page check reaches the bridge as
  the browser's agent would, by keeping the tools the app registers with WebMCP
  (`registerTools`), or through a named global; functions it runs in the page are
  self-contained. `cli.ts` types `process` itself, since an app checks its components with the
  browser's types (the install test caught it). Its first run on UISet's own pages: the
  templates score 50 to 91 and the gallery 66. Real problems it found: chart legend toggles
  and the calendar app's upcoming events are plain buttons agents can't see; closed tooltips
  and menus take their trigger's name (#604); a grid named "Customers" beside its "Search
  customers" field; an unnamed dialog; the site's "Template" tabs beside each "Copy the
  command to install the … template" button. Tests: 8 unit (every rule, past 100, `ignore`,
  `root`) with 14 mutations caught, and 2 e2e (WebMCP tools on the React site, a named global
  on a web page) with 5 mutations caught; the fresh-app install of 115 items.
  Then, at the owner's question ("I don't see it anywhere in the gallery"): the gallery shows
  components, so the check got a live demo on the Agents page instead. "Check this page" runs
  the real check through the site's bridge, beside a form with a switch for three mistakes
  an agent meets and a person doesn't (an avatar with no name for the bridge, "Country" inside
  "Revenue by country", a plain button), so a nameless button wasn't one: it fails axe too.
  Building it, the check found the page's own clashes, now fixed for every page: each install
  command's package manager control was named "Package manager" (eleven on /kits), and a
  command's copy button "Copy the command", inside each install button's "Copy the command to
  install …". Without the mistakes, /agents scores 100. The "near" of a control agents can't
  see now also reads a heading in a container's first child, like a card's title row.
  Later the same day, asked by the session making UISet's pages score 100: a control Tab
  can't reach inside a component (no tabindex on a non-native widget, or a negative one) is
  that component's own part, not unseen. The rich text editor's task boxes were flagged
  before. Outside any component such a widget is still flagged, since nothing drives it.
- 2026-11-17 — Listed on Context7 as `/superzero11/uiset`
  (https://context7.com/superzero11/uiset), submitted from the owner's account from the GitHub
  repo: 185 docs files, 3,358 snippets. Linked beside the skills install in docs/ai.md (a
  "Context7" section with a `use library` prompt), the /agents page's "Or give it the docs"
  card and the README. skills.sh already lists the skill at
  https://www.skills.sh/superzero11/uiset/uiset. The outreach list of threads to answer is in
  `launch/outreach.md`.
- 2026-11-17 — **UISet's own pages score 100 on `agent-check`.** At the owner's request.
  First run: React templates auth 75, dashboard 68, settings 88, admin 81, inbox 80, chat app
  86, project board 97, calendar 69, pricing 91, IDE 80; the web pages 61 to 100, rich text 20.
  Now every template (React and web) and every web page scores 100, held by
  `tests/e2e/agent-ready-pages.spec.ts` and `tests/e2e/web/agent-ready-pages.spec.ts` in
  Chrome, WebKit and Firefox (each fix mutation-checked: 23 caught; two names that changed nothing
  came out: a second one on the web IDE's tabs, and one on the agent page's tabs). The fixes, by kind:
  - **Controls that repeat a component's own action, hidden from agents** with
    `data-agent-hidden`: the grid's search field and Group by select (`filter`, `groupBy`), the
    web grid's filters popover (`filterColumn`), and a chart's legend (`isolate`). Their names
    held the component's, so its name found two. A ToggleGroup legend was tried first: it
    added a "Revenue series" beside the chart "Revenue", the same clash, so it was reverted.
  - **Tooltips that repeat their trigger's name, hidden from agents** (the app shell's sidebar,
    Compose, New event): a closed tooltip takes its trigger's name (#604). Probed in jsdom:
    `data-agent-hidden` on the content drops the tooltip and keeps the button.
  - **A verb for a row's main control**, as UI SDK advises: chat threads are "Open <title>"
    beside "More for <title>".
  - **Names an agent can tell apart:** "Send me a one-time link" (it held "Email" and "Sign
    in"), "Full name" (beside the inline edit's "Project name"), "Bottom panel" (beside "Editor
    and panel"), "Project files" (beside "Open files"), the site's "Templates" tabs.
  - **Names that were missing:** the IDE palette's dialog has two triggers, so no name while
    closed: its content is `keepMounted`, as UI SDK advises. The calendar's upcoming events
    became UI SDK buttons (skins' list-button exceptions and the time line's own weight keep
    their look, checked in five skins).
  - **The web bridge names some components from their root element only**, though UI SDK's
    web docs name tabs on `ui-tabs-list`: tabs, scroll areas and sliders named on an inner part
    had no name. UISet's tables, code blocks, code tabs and IDE tabs now name the root too, and
    the avatar group names each avatar as an image. The React editor tabs showed the first
    file's name in Chrome (jsdom: "Open files") until the root was named. Worth filing upstream
    with the owner's go-ahead: the web bridge ignoring a list's or viewport's name, and an icon
    button named only by its tooltip (`type="label"`) having no name for agents.
  Two other sessions worked in this folder at the same time: the owner's fork of this one made
  the check skip untabbable parts inside a component (asked for here; the rich text editor's
  task boxes) and added a live check to /agents, and the outreach session listed UISet on
  Context7. Each committed its own files by name.
- 2026-11-17 — **Install lines are `@uiset/<item>`** (the owner's go-ahead). The docs, the README,
  the site's command builder (`src/site/shell/code.tsx`) and the generated skills and llms files
  (`scripts/docs.mjs`, from `uiset.config.json`'s `namespace`). Items' own dependencies still
  name `superzero11/uiset/<item>` in `registry.json` and the site's URLs in `public/r`, so an
  older CLI that doesn't know the directory still resolves them. Checked in fresh Vite apps with
  shadcn 4.23.0 and latest: `add @uiset/uiset @uiset/schema-form @uiset/data-grid
  @uiset/agent-check` brought 22 items from uiset.dev, and the app typechecked and built. The
  installation docs keep the GitHub and URL forms as other addresses.
- 2026-11-17 — **`agent-check` for any site, and a bookmarklet.** Asked whether "any developer"
  could use it: the bridge check needs a UI SDK page, so `page.ts` reads any page's
  accessibility tree instead, as browser agents do. Errors: a control with no name (an
  approximation of the browser's name rules, tested by pairs whose names must come out
  equal), controls of one kind sharing a name (links only when they go to different places;
  radios, tabs, options and menu items only within their group), and what only looks
  clickable (a pointer cursor that starts on it, or an `onclick`, on no control). Playwright's
  `checkPage` and `cli.ts` use the bridge when a page has one and read the page otherwise;
  functions sent into the page get a `__name` stand-in, since tsx compiles helpers with one.
  `overlay.ts` draws the report over the page in a shadow root, with outlines on a problem's
  elements; the Agents page offers it as a bookmarklet (16.7 KB, built by
  `scripts/bookmarklet.mjs`; a test catches a stale bundle by its sources' hash), with a copy
  for people who can't drag and a "Try it on this page". Asked about a paste-a-link checker
  on uiset.dev: it needs a server-side browser (a Vercel function with Chromium, or a hosted
  browser), with guards against private addresses and rate limits, as PageSpeed Insights
  runs; the bookmarklet and command line came first, needing no server and reaching
  localhost and signed-in pages. First runs: example.com 100, ui.shadcn.com 96 (two "Home"
  links to different places), Hacker News 64 (the search box has no label; 30 "hide"
  links). A child's `title` naming a link (HN's vote arrows) was missed at first, and fixed.
- 2026-11-17 — **The site can build on Vercel, for deploy-on-push** (the owner's go-ahead).
  Every deploy had been built on the owner's Mac (`vercel build`, then `--prebuilt`), so with
  several sessions in one folder a deploy shipped whatever was uncommitted. Vercel's machines
  could not build it: the prerender opens pages in Chromium, and they have none. Two private
  previews of the committed code: Playwright's Chromium downloaded but failed for a missing
  `libnspr4.so`; with Chromium's libraries installed by `dnf` first (the build image is Amazon
  Linux) it built in 3 minutes, all 93 pages prerendered. `scripts/vercel-build.sh` does that
  on a Vercel build machine only (VERCEL set, Linux, `dnf` present) and sets `CI` so the
  prerender takes Playwright's Chromium; anywhere else it runs `pnpm build:static` as before,
  and a local `vercel build` still prerenders with installed Chrome. `vercel.json`'s build
  command runs it. A third preview built with the script alone. Left to the owner: connect
  `superzero11/uiset` to the Vercel project (Settings, Git), after which a push to main deploys
  and other branches get previews.
- 2026-11-17 — **uiset.dev/check, the paste-a-link checker** (the owner: "Yes, build it").
  `GET /api/agent-check?url=` loads the page in headless Chromium on a Vercel function
  (`@sparticuz/chromium-min` 153 with `playwright-core` 1.65.1; the pack for the function's
  processor, arm64, comes from its release on a cold start, as the full package is x64 only)
  and runs `checkPage`. Vercel couldn't compile the function with the project's TypeScript 7,
  so `scripts/api.mjs` bundles it to `api/agent-check.js`, with a sources hash a test checks.
  Private networks: the address must resolve only to public IPs, on ports 80 and 443, and
  every connection the browser makes, including redirects and WebSockets, goes through a
  SOCKS5 proxy in the function (`proxy.ts`) that resolves the host itself and connects only
  to the public address it checked, so a DNS answer that changes between lookups gets
  nowhere. IPv6 is judged by its bytes: the first version let `[::ffff:7f00:1]`
  (127.0.0.1 as a URL prints it) through, found while writing the proxy. The browser gets a
  minimal environment, WebRTC sends nothing around the proxy, and Sparticuz's flags that
  turn off web security are dropped. Each check has its own browser and proxy, killed after
  45 seconds at most (the function has 60): the first preview reused one browser, which
  Sparticuz runs as a single process, and the next check found it closed, while Hacker News
  ran into Vercel's 300-second limit. A visitor gets 10 checks in 10 minutes (refused
  addresses don't count), an instance runs two at once, and the CDN keeps each address's
  report for 10 minutes. Tests: address ranges and spellings, the proxy as a SOCKS client
  (refusals, a tunnel, early bytes), and in Chrome a page whose script, fetch, WebSocket and
  redirect reach for a private host once allowed and once not; each rule was broken to see a
  test fail. Preview: example.com 100 (13 s cold), Hacker News 63 (4 s), uiset.dev/agents 88
  through its bridge (the demo's three planted mistakes), github.com 90, ui.shadcn.com 96;
  private names (localtest.me, nip.io) and addresses refused, and redirects (through
  postman-echo.com) to 169.254.169.254 and to the function runtime's API on 127.0.0.1:9001
  stopped at the proxy, while one to example.com was followed. The /check page: a shared link
  ran its check twice under React's development double effects, fixed; a long address in an
  error widened the page on a phone, fixed and tested. A migration test in another session
  found page mode reporting a UI SDK calendar's day cells (`role="gridcell"`, pointer
  cursor) as only looking clickable: an interactive grid's cells, rows and headers are no
  longer reported, nor scored, since a data grid's cells repeat each other's text.

- 2026-11-17 — Tailwind CSS 4 needs no setup. A test migration of a shadcn/ui app found two
  problems: UI SDK puts its `ui-sdk` layer first in the page, so Tailwind's reset (in `base`)
  outranked web.css and stripped every control's padding, border and radius; and UISet's
  layers, first read after Tailwind's, outranked utility classes (`text-red-600` on a Button
  stayed white). Fix: `uiset.css` imports web.css into `uiset.base.sdk` (below UISet's own
  base rules, so nothing changes without Tailwind: the site's computed styles are identical),
  and `uiset/layers.ts` restates the page's own layer order with `uiset` just after `base`
  when the page has Tailwind's `theme, base … utilities`, keeping every other layer where the
  page put it and `ui-sdk` first. It runs at import and before the root's first paint. Pages
  without Tailwind are left alone; renaming UISet's layers into Tailwind's `components` was
  rejected (35 files, users' skins, and a risk to Panda-style layer orders). Server-rendered
  pages get the order at hydration; one optional line in the global stylesheet gives it to the
  first paint (docs/installation.md, With Tailwind CSS).
- 2026-11-17 — **Every page's links have names of their own** (the owner: "fix the duplicate
  link names in the site nav"). Page mode, run on all 95 pages, found 65 sets of links sharing
  a name but opening different pages, 230 times in all. In-page links were named like other pages: "On this page"
  and heading links now say "Agents section", apart from the header's Agents page. The
  sidebar names kits and skins ("Studio kit", "Studio skin") and its templates entry
  ("Templates guide", apart from the header's gallery), as labels that keep the visible text.
  Two docs links got text saying where they go. The walk also found every root-relative link
  in the docs (`/check`, `/docs/components/dialog`), 24 on 13 pages, sent to a broken GitHub
  address; site paths now stay on the site, and `https://uiset.dev/` links become site paths.
  The check itself counted a link to a section of a page apart from a link to the page; links
  into one page now count as one place. A test walks every page in Chromium and fails on a
  shared name or a docs link sent to GitHub. Code blocks' copy buttons ("Copy the tsx code")
  still share names on pages with several blocks in one language.
- 2026-11-17 — **What's new on the home page, and the checker in the footer** (the owner's
  list). Asked whether What's new needed a component of its own: no. UI SDK's Timeline is
  made for "an activity feed, a changelog", and UISet styles it, but only vertically; a
  horizontal Timeline was unstyled. base.css now gives it a look (markers on one line, text
  under each, a connector to the next marker), the components page shows one ("Release
  plan"), and the home page opens with the three latest releases in a row, which scrolls
  sideways on a phone so the hero stays near the top. Its entry for the agent readiness check
  goes to the Agents page's check (`/agents#agent-check`); the footer's "Agent readiness
  checker" goes to `/check`. The footer link isn't called "Agent readiness check", which the
  docs sidebar uses for `/docs/agent-check`, so no name finds two places. Held by
  `tests/e2e/whats-new.spec.ts` (Chrome, WebKit, Firefox; three mutations caught: the row's
  flow, the connector's reach, the footer's address), with axe passing on the components page
  in every skin and theme. Screenshots checked in five skins, two themes, and at 1280, 820
  and 375 px.
- 2026-11-17 — **Each Vite server keeps its own dependency cache** (the owner: "Yes, add the
  per-port cache fix"). Every server in the checkout shared `node_modules/.vite`. When one
  bundled a different set of dependencies (another session's Tailwind test server, a dev
  server after a lockfile change), a browser still holding the other server's page loaded
  React from both bundles: a blank page with "Invalid hook call". With several agent sessions
  each starting dev and e2e servers, it happened twice in an hour. `scripts/vite-cache-dir.ts`
  names the folder for the server's port (`node_modules/.vite-5620`, `-5631`, `-5642`, and
  the web config's own 5640). Both configs use it; Vitest and builds, with no port, keep
  Vite's default. A unit test holds the naming (mutation caught: one shared folder). Checked
  live: with a browser on the dev server, a second server bundling extra dependencies on 5631
  left the dev server's cache untouched, and three more pages opened without errors. The
  crash itself couldn't be reproduced on demand (bundles of the same dependencies come out
  identical), so the check is that no server writes into another's folder.
- 2026-11-17 — **Copy buttons named for what they copy** (the owner: "fix the duplicate copy
  button names too"). 31 sets of copy buttons shared a name on 20 pages: a code block's was
  "Copy the tsx code", and the docs' install commands all said "Copy the command to install".
  A code block without a file name now names the heading it's under, counting blocks of one
  language there (`Copy the second vue code under "Data in"`), and an install command in the
  docs names what it installs ("Copy the command to install agent-check"). The every-page test
  now checks every control, not only links. Still open, in the kits, and listed in that test:
  the chat kit names every message's actions alike ("Copy message" on each reply), the File
  input and Upload demos both say "Choose files", and the rich text kit's task checks are
  clickable but reach agents as images (`role="img"`).
- 2026-11-17 — **The kits' last shared names** (the owner: "Do this task here", after the
  copy buttons). With them, the every-page test checks every control on every page with no
  exceptions. The chat kit's message actions carried no sign of their message, so each reply
  had the same Copy, Retry, Edit and feedback buttons; the owner chose names with the
  message's first words (`Copy message: "Here's a summary of the…"`) over reply numbers,
  which React's actions can't know without a new prop, or times, which repeat within a
  minute. React reads them from `text`, or from the message shown when an app passes none
  (Edit, on a person's message); `<uiset-chat>` from the message. One function,
  `chat/opening.ts`, serves both. Upload's Choose files button now carries the upload's label
  ("Choose files, Attachments"), joined with a comma rather than "for" so a translated
  `choose` doesn't mix languages; the bridge already named the upload by its label, but the
  page itself didn't. The File input demo says "Choose images or PDFs". The rich text kit's
  task boxes were already checkboxes in the editor; shown read-only they are pictures of the
  state, and the static view kept the editor's pointer cursor, so it looked clickable. The
  cursor is gone there; no control was added to a read-only view.
- 2026-11-17 — **The Content page's Firefox crash, again the test's.** The Web Components
  Content page's six axe tests crashed Playwright's Firefox page ("Page crashed") on every
  run in Docker since `df18f88`, which added the schema form to that page; 0.2.0 (`45f6bc3`)
  passes 6 of 6, `df18f88` fails 6 of 6. Probes on the live commit: a scan alone passes, role
  queries alone pass, and role queries with the schema form left out of the scan pass. The
  crash needs a `getByRole("textbox", { name })` query (even one matching nothing), then
  axe's `label` or `label-title-only` rule on the schema form's inputs; the other 13 rules
  that reach those inputs, the stepper and the buttons don't. Pages aren't affected: both
  steps are test tooling, and the same scan without the role query passes. The test now
  opens the inline edit with DOM queries, like its `beforeEach` (Firefox: the whole spec, 17
  passed; Chrome and WebKit: 35 passed, 1 skipped). Worth a Playwright report, with the
  owner's go-ahead, once it reproduces without UISet.
- 2026-11-17 — **The Firefox crash is Playwright's known one; no report filed.** Asked to
  report it, I cut it to a page with no UISet: `<div id="l">Email</div><input id="c"
  aria-labelledby="l">`, a named `getByRole("textbox")`, then axe-core's `label` rule. That
  crashes Playwright 1.65.1's Firefox (159.0) on arm64 and x86 Linux, in either order; Chromium
  and WebKit pass, and so do an unnamed query or `aria-label`. It's microsoft/playwright#43967
  (Mozilla bug 2090055: reading `ariaLabelledByElements` from both the page and Playwright's
  isolated world), closed as fixed by the Firefox roll in #43982; #44135, the same crash
  through axe, was closed as its duplicate. Playwright 1.66.0-alpha-2026-11-17 passes the
  repro, so a new report would be a third copy. When UISet moves to Playwright 1.66, the
  Content spec's DOM-query workarounds can go back to role queries. The reporter of #43967
  says stock Firefox 159 crashes too when a page and an extension both read that property.
- 2026-11-17 — **Chat and board names an agent can tell apart.** Filming the agent-check video,
  every kit and template was checked through the site's agent bridge: the chat template fell to
  94 after one reply, the site's chat demo scored 84 and its board demo 92 (the e2e walk of
  every page reads the accessibility tree instead, not the bridge). Chat: each
  reply's toolbar is now `Actions: "<first words>"` and its feedback group
  `Feedback: "<first words>"`, React and web, like its buttons. The word "message" stays out:
  `Message actions: "…"` was tried and the composer's "Message" still found every toolbar (96).
  Board: `BoardToolbar`'s `label` is what the board holds ("Cards", as the project board
  template's "Issues" and the web board's "Search cards"), not the board's name, which the
  search's name then contained; the kit is unchanged and its `label` is documented. Still
  repeating between replies: a code block's "Wrap lines" and "Previous version". Not touched:
  uiset.dev's home page scores 85 through the bridge ("Skin", "Sound", "Kit", "Message").
- 2026-11-17 — **Slow links show progress, and a second click doesn't open a page twice**
  (the owner: links on uiset.dev sometimes opened after 5 to 6 seconds, and people clicked
  again). The site's router loads a page's code before changing the address, with nothing on
  screen meanwhile, so a slow page looked like a dead link. Measured on uiset.dev, click to
  new heading: on this Mac 0.4 to 1 s; on a 4G connection with a 4x slower processor, Kits
  1.8 s (53 files before the address changes), Components 3.7 s (197 files, then 2.5 s to
  draw 79 live examples), Templates and Docs 0.5 s. Now: a bar runs along the top when a page
  takes over 150 ms (`data-navigating` on `<html>`, `aria-busy` on the main area, a progress
  cursor; still without motion when reduced motion is on, Highlight in forced colors), and
  stays until the new page has drawn. Only the latest click lands, so clicking a slow link
  again opens it once, a click on another link takes over, and Back takes over from a click
  still loading. A page starts loading when its link is pointed at for 80 ms, pressed,
  focused or touched. `tests/e2e/navigation.spec.ts` holds the Kits page's code back and
  checks all three (Chrome, WebKit, Firefox; mutations caught: a late page still landing, no
  bar, no loading on hover). The Components page's own weight is still there: on a slow
  phone it takes about 3.7 s whatever the router does.
- 2026-11-18 — **The Components page opens at once and fills in behind** (the owner: "Do
  this task here"). The gallery imported all 85 examples and their source text before the
  page could open. Now `src/site/examples/index.ts` loads each example on request, the page
  waits only for the first six (its `preload`), every card's heading is there from the start
  (links to an example and find-in-page work), cards near the viewport load first, and the
  rest fill in a few at a time while the browser is idle. A card still loading keeps a typical
  card's room. A link to an example far down still lands on it: browsers keep a link's target
  in view as the cards above it draw, even with scroll anchoring off (Safari has it only since
  27). A re-scroll I wrote for that changed nothing in Chrome or WebKit, so it came out.
  Measured on a local production build with a 4G connection and a 4x slower processor (the
  same profile both times, three runs): click to new address 6.6 s → 0.6 s, with 229 files
  loaded first → 11; click to heading drawn 9.4 s → 0.8 s; the whole gallery 9.6 s → 8.7 s,
  now in the background. Tests that need every example (axe in every skin, the docs-page
  comparison, the kits' specs) open the page with `tests/e2e/gallery.ts`, which waits for
  `.gallery[data-ready]`; `tests/e2e/components-gallery.spec.ts` holds the new behavior (Chrome,
  WebKit, Firefox; mutations caught: no loading as cards come into view, the page not waiting
  for its first examples). All ten specs that open the page: 497 passed in Chrome and WebKit.
  The static build prerenders the page with every example drawn.
- 2026-11-18 — **uiset.dev's home page scores 100 through the agent bridge** (the owner: "fix
  the home page score"). It scored 94 with the chat demo open, and other demos added their own
  clash: one-word names met the same word in another control's name, or in a list item's text,
  which the bridge reads as a control's row. "Sound" (the hero form) was in the first install
  step's text, "Skin" (the hero's picker) in the second's, "Kit" (the demo tabs) in every
  "Install the … kit" command, and the hero form's "Output" named the editor demo's tabs too
  (80 with that demo open). The step text stays as written: renaming the short names holds
  whatever the text says next. The hero form's "Sound" is now "Tone", the hero's picker "Skin
  of the live form" (other pages keep "Skin"), the tabs "Kit demos", and the editor demo's tabs
  "Show as" ("View as" was tried: the data grid's and the scheduler's "View" found it on
  /kits). Only "Tone" is visible; it was checked in every skin and theme and at phone width.
  `agent-ready-pages.spec.ts` checks the page through the bridge with each kit demo open
  (Chrome, WebKit, Firefox); mutations caught: "Sound" back, the editor's "Output" back. The
  rest of the site, templates apart, is checked only by the every-page walk, which reads the
  accessibility tree, not the bridge. Through the bridge, not touched: /kits 98 ("View",
  "Command"; fixed in the next entry), /agents 88 (its demo form's three planted mistakes, on
  by default: `agent-check.spec.ts` already holds the page at 100 with them off), /components
  85 (20 ambiguous names).
- 2026-11-18 — **uiset.dev's Kits page scores 100 through the agent bridge** (the owner, "Yes,
  fix them", to fixing /kits and /agents next). /kits scored 98: the data grid's "View" menu,
  the scheduler's "View" switch and the canvas's "Fit to view" button all answered a step by
  "View", and the terminal's prompt, "Command", answered as every install line's "Copy the
  command to install the … kit". Each kit is fine alone; a page that puts them together, like a
  dashboard, isn't. So the kits' names changed, not the page: the scheduler's switch is
  "Calendar layout", the canvas's button "Zoom to fit" (beside "Zoom in" and "Zoom out"), the
  terminal's prompt "Command line" (React and web; the web scheduler's switch is in the
  calendar template's and the demo page's markup). The grid keeps its visible "View" menu, the
  one name a person reads. All three are aria-labels: nothing on screen changed.
  `agent-ready-pages.spec.ts` checks /kits through the bridge (Chrome, WebKit, Firefox);
  mutations caught: the scheduler's "View" back, the terminal's "Command" back. Tests that used
  the old names follow them. /agents needed nothing: its 88 is the demo's planted mistakes, and
  with the switch off the page scores 100, which `agent-check.spec.ts` already checks. Listed
  under Changed in the changelog, since steps and tests that used the old names need the new
  ones.
- 2026-11-18 — **The web board's keyboard test waits out Undo's focus.** It failed 5 times in
  6 in WebKit on main: Undo focuses the card two frames after the toast closes, and headless
  WebKit's frames came late enough that the focus landed on the next card's move, so Escape
  returned focus to the undone card. The test now waits three frames after Undo and checks
  focus is on the card (30/30 in Chrome and WebKit). The same deferred focus is in the
  project-board templates and the canvas; nobody acts within two frames, so they stay. On the
  same day a long local WebKit run stalled with two WebKit processes at about 7 GB each; a run
  from a fresh start stayed under 340 MB a process.
- 2026-11-18 — **Focus after Undo and Add node lands in the same task as the press** (the
  owner: "fix the same delayed focus in the templates and canvas"). Undo on the project board
  and Add node on the canvas put focus off by two frames, waiting for the toast or menu to
  hand it back as it closed; Enter on a canvas node put its notes' focus off by one or two.
  A key or click in those frames lost its focus to the late one (the web board's test, 5 of 6
  in WebKit). Each now lands in the press's task, using what each case has: the board's
  `focusCard` before the toast closes (a toast that no longer has focus hands nothing on); in
  the web demo, once the board has drawn, in a microtask, since a deleted card has no element
  until then; React's canvas `focusNode` before the menu closes, as the node renders with the
  update; Web Components' canvas from the closing menu's own hand-back to Add node, since the
  canvas draws the node in the next frame and a `ui-menu-content`'s `finalFocus` takes a
  string only (a function is turned into one, though the docs list functions); the notes with
  `flushSync` (React) or a microtask (web). The web board's keyboard test no longer waits
  frames. 7 new tests read where focus is before the next frame (Chrome, WebKit, Firefox);
  putting the old code back fails all 7 in both Chromium and WebKit. Not touched: about 20
  more one- or two-frame focus moves in rich text, the IDE, chat, and the admin, settings
  and calendar templates.
- 2026-11-18 — **UISet moves to UI SDK 0.1.0-beta.9** (the owner: "start beta.9 after the
  focus fix is pushed"), from beta.5, skipping 6–8; their 239 changes were read first. What
  had to change: the image cropper example puts its handles beside the selection (beta.9 moved
  them out, so screen readers reach them; checked by eye in 5 skins × 2 themes, and the axe
  test's exception for it is gone); `web/src/web.css` loses its drop zone spacing, which
  UI SDK's `web.css` now has. Two upstream changes needed more:
  - Since beta.8 the bridge checks a `run` action's first argument as one of the
    component's items, for every component, so the terminal's `run("ls")` and the swipe
    list's `run("Ada Lovelace", "Archive")` were refused in every browser (14 e2e tests).
    Agents now call `runCommand` and `runAction`; `run` stays on the API for code. Filed as
    vercel-labs/ui#848 with the owner's go-ahead, from a plain `definePrimitive` repro
    (renamed, the same step passes; the check is in beta.8's bridge and not beta.7's).
  - beta.8 leaves a closed tooltip out of the snapshot and presses the trigger for a step by
    its name, but `query` still finds it, so `agent-check` called "Account" ambiguous. The
    check now drops a tooltip the snapshot leaves out; a closed menu or dialog named like its
    trigger still counts, since the snapshot lists both (new unit test; mutation caught).
  Also: UI SDK's own Pagination trips its dev check on import (3c #28), so the unit setup
  loads it before strict mode; beta.8's snapshot dropped the tooltip from agent-check's
  sample page (9 controls to 8). The registry, `@uiset/web`'s peers and the 56 SDK docs pages
  follow beta.9. Typecheck, 517 unit tests, web build and build:static pass; e2e Chrome and
  WebKit (React and web) 1718 passed with only the 14 `run` failures, which pass after the
  renames (149); Firefox, React and web, 844 passed and 26 skipped (Chromium-only), its two
  failures load timing (6/6 alone). Next: the workarounds betas 6–9 made unneeded (3c).
- 2026-11-18 — **UISet's own fixes for what UI SDK betas 6–9 fixed are gone** (the owner: "Yes,
  remove them"). Each was checked as it went:
  - `returnFocus` (3c #22): beta.9's `keepFocus` treats focus on an ancestor of the target
    as lost, Safari's clicked button, and retries the same way, so the 8 callers use it and
    `uiset/focus.ts` is gone (its unit test now holds `keepFocus` to those cases).
  - The date picker override (#2): the input and trigger measure the same with and without
    it in 6 skin and theme pairs. The tree ring (#14): `ide.spec.ts`'s ring test passes.
  - The wheel's focus-follow (#21), React and web: the mobile specs pass 3 times over in
    Chrome and WebKit, the tests where an agent's value moves focus among them (#25's
    `keepWheelOnValue` stays).
  - The terminal (#19) trims past `scrollback` while you're scrolled up: UI SDK holds the
    view still as rows above go. New tests, web e2e (Chrome and WebKit, line 50 doesn't move
    as the oldest go) and React unit (a wheel up in jsdom); with the old guard back both fail.
  - Tabs' root names (#16): React's editor tabs drop theirs, but the web bridge still names
    tabs from their root, not their list: without them five web pages fell below 100, so
    they stay (3c #29).
  Checks: typecheck, 518 unit tests, both builds; e2e Chrome and WebKit, React and web, 1734
  passed; Firefox 846 passed and 26 skipped. Its one failure, in two full Firefox runs now,
  was the package manager tabs test reading the Code block after a reload before it had drawn:
  it brings the example into view first now, as it does before the reload (3/3 in each
  browser).
- 2026-11-18 — **The footer links the owner's X account, and What's new leads with beta.9.**
  Under the footer's tagline, an X icon linking to https://x.com/IAMSuperZero11 (the owner's
  handle, not the GitHub name), named "@IAMSuperZero11 on X"; the owner asked for the icon,
  after a first version showed the handle as text. What's new shows, as the owner chose from a reviewed
  draft: On UI SDK beta.9, Tailwind CSS 4 with no setup, and the agent readiness check
  (Schema form and the shadcn directory listing make room). Checked by eye in four skins and
  at phone width; `whats-new.spec.ts` holds the X link on two pages and the beta.9 entry.
