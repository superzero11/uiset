# Tests through the agent bridge: the plan

Planned 2026-11-21, the roadmap's Now item after 0.6.1. Why: a full release run (Chrome and
web, WebKit, Firefox) takes about three hours on the owner's 16 GB Mac and crashed it four
times this week; WebKit on the gallery page alone grew to 5.4 GB per worker. Most of those
runs repeat checks that don't need a browser, or don't need three of them.

## What the 654 browser tests need

Counted by `research/bridge-testing/classify.mjs` (each `test()` block, by what its body does):

| Kind | Tests | Needs | Runs in |
| --- | --- | --- | --- |
| Behavior | 198 (30%) | State and names: press Allow, the tool is done | Vitest, through the agent bridge, no browser |
| Real page | 231 (35%) | Keys, pointer, focus, files, navigation | Chrome |
| Engine | 225 (34%) | Layout, CSS, contrast (axe), motion, scrolling | Chrome, WebKit, Firefox |

Two corrections to the plain split:
- **UISet's own interaction code runs in every engine.** Where UISet wrote the behavior (the
  board's drag, the canvas, sortable lists and tree, the IDE, the terminal, the rich text
  editor, the composer's history and queue), its key and pointer tests stay in WebKit and
  Firefox too: focus and the top layer differ between engines. Where the behavior is UI SDK's
  (a select's arrow keys through UISet's wrapper), UI SDK tests it across engines; Chrome is
  enough here.
- **Behavior tests move only where jsdom can hold them.** jsdom has no layout, so a test
  that depends on a size, a scroll position or a real route stays in the browser.

Both the React bridge (`@ui-sdk/react/agent`) and the web one (`@ui-sdk/web/agent`) work in
Vitest's jsdom: a probe rendered UISet's web chat with a tool waiting for approval and the
snapshot listed Allow, Deny, the composer and the tool.

## How

1. **Tags.** Engine tests carry `{ tag: "@engine" }`; the `webkit`, `firefox`, `web-webkit` and
   `web-firefox` projects run `grep: /@engine/`. Chrome and web run everything left in the
   browser. The classifier proposes the tags; each file is reviewed by hand before tagging.
2. **A bridge harness for Vitest**, beside the existing `kit-demos.agent.test.tsx`: render a
   React demo in `<UISet>` or load a web page's markup and script, then `agent.snapshot()`,
   `agent.act()` and `agent.query()` by the names people see. A move replaces the browser
   test only once the Vitest one fails when the behavior breaks (a mutation check).
3. **The gallery's big scans split.** "Every component passes axe" loads 79 examples per skin
   and theme; it moves to the component pages in groups, so no browser holds every component.
4. **Batches**, by file, the files with the most behavior tests first (templates, the web
   chat, the site, agent-check's link, charts, Agent view, motion). Each batch: move, tag,
   mutation-check, run the affected specs at 2 workers.

## Progress

- **Tags in place (2026-11-21).** 390 of 654 test blocks carry `@engine`: the 225
  engine-sensitive ones and 165 key and pointer tests in the kits whose input UISet wrote.
  Runs per engine, loops expanded: WebKit and Firefox 715 each (React 437, web 278), from
  1,030; Chrome stays at 598 and web 429. Running only the 225 would take each engine to
  roughly a third; keeping UISet's own input tests in every engine is the margin.
- **Pilot moved:** agent parts (5 tests) through the bridge in Vitest.
- **Gallery scans split (2026-11-21).** `/gallery?group=Actions` draws one group; "every
  component passes axe" visits the groups one page at a time. WebKit at 1 worker: 10 passed
  in 4.7 minutes, its biggest process at 885 MB (the whole gallery reached about 2 GB, and
  5.4 GB per worker when it crashed the Mac). Chrome: 10 passed in 1.7 minutes.

- **Behavior moved (2026-11-21).** 151 of the 193 behavior tests now drive their page or
  component through the bridge in Vitest (39 `*.bridge.test.*` files, each mutation-checked
  before its browser test went); `tests/unit/web-page.ts` loads a web page's markup and script
  into jsdom. Vitest: 758 tests in 88 files, 106 seconds at 2 workers. Browser runs: Chrome
  862 (from 1,032), WebKit and Firefox 715 each (from 1,030).
- **Stay in the browser (42):** a real browser is the point: the link checker launches its
  own Chrome; WebMCP and the bookmarklet; the Tailwind cascade; motion and its pieces;
  native form validation and submits with JavaScript off; a swipe; the gallery's lazy
  loading; the site-wide crawl; scores that hang on CSS media queries or hidden scroll areas;
  the top layer above a modal (now `@engine`); `web/dist` read in Node.
- **Found while moving:** the scheduler's and calendar's month grids have no name for agents;
  the pricing questions reach agents as q0 to q3; on template pages the site's app shell and
  the template's both register Mod+B; the web IDE's palette lists one file twice as Recent.
- **Timed (0.6.1, 2026-11-23).** The full release run, on the owner's Mac, added up from
  its guarded parts (the memory guard stopped it four times for other jobs): Vitest 764 in
  about 2 minutes; Chrome and web 862 in 26.7 minutes at 2 workers; WebKit 716 in about 52
  (521 at 2 workers in 13.4, then the 189 on the big pages, the gallery's included, at 1
  worker in about 39); Firefox in Docker 716 in 28.8 at 2 workers. About 1 h 50 min in all,
  from about 3 hours: 40% less, short of half. The biggest browser process was WebKit's at
  1.2 GB, under 2.5 GB. What's left is WebKit's one-worker part.

## Done when

- WebKit and Firefox run about a third of today's tests, Chrome about two thirds, and the
  behavior tests run in Vitest in seconds.
- A full release run takes well under half today's time, measured on the owner's Mac, and
  no browser process passes 2.5 GB.
- CLAUDE.md's commands and `docs/contributing` (if any) say where a new test goes: behavior
  in Vitest through the bridge, layout and looks in the browser, `@engine` when an engine
  could differ.
