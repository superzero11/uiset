# UISet website: design plan

## 2026-11-18: a new layout and look

The owner's brief: a quiet, neutral frame that puts the components first, with a library of
cards, built from UISet's own components as today.

**Color** (OKLCH, set on the site root, so demos keep their skins):

| Token | Light | Dark |
| ----- | ----- | ---- |
| page and sidebar | 97% 0 0 (#f5f5f5) | 15.5% .002 286 (#0c0c0d) |
| panel | 99.1% 0 0 (#fcfcfc), edge 94.3% | 18.3% .002 286, edge 25.3% |
| card | 100%, edge 10/10/10 at 5.5% | 21.4% .004 286, edge white at 5% |
| preview | 98.5% 0 0 | 24% .004 286 |
| text | 14.5% 0 0 | 94.6% 0 0 |
| muted text | 52.8% 0 0 (#6b6b6b: #737373 would be 4.35:1 on the sidebar) | 65% 0 0 |
| primary (buttons) | 20.5% 0 0, near-black | 94.6% 0 0 |
| fills | black at 4% (tracks), 5% (hover, current) | white at 5%, 7% |

The frame's grays reach the examples as shadcn/ui variables. Their accent is the base skin's
own default, black and white (20.5% 0 0, and 92.2% 0 0 in dark), so the site shows what an app
without a theme gets.

**Type:** Inter, 13px base, line height 1.43. Home h1 56/500/-2px; section h2 28/500/-0.7px;
docs h1 32/600/-0.8px, h2 20/600/-0.4px, lead 16/24 muted; library h1 24/500/-0.6px.

**Layout:**

- Home and Agent: a top nav in a 1008px column. Logo, Library (a menu: Build has
  Components, Kits, Themes, Templates; Animate has Illustrations and Motion, coming soon),
  Docs, Agent; search, the skin, the System/Light/Dark switch, GitHub on the right. The skin
  dresses the whole site.
- Docs and Library: AppShell. A 256px sidebar on the page gray (logo and collapse, search,
  Library, Docs, Agent, then Components, Kits, Templates, Skins), and the page in an
  inset panel (8px from the edges, 18px radius) whose top bar holds the skin, the theme and
  GitHub. The
  footer sits under the panel. Narrow screens get AppShell's drawer.
- Library: a 24px headline, tabs with counts, then a 3-column grid of
  cards (14px radius, 6px padding, an 8px-radius preview, title, one line, a copy button).
  Previews are live UISet parts, inert and hidden from agents; each card opens its page.
- Docs pages: an 894px column, breadcrumb, title, lead; a component's Preview and Code in a
  pill switch, tools on the right, a large preview frame, then the sections.

**Logo:** a white circle on a black tile.

**Contrast, on purpose:** muted text darker (4.5:1 rule); a selected
segment has a 3:1 edge (#858585), not only a white fill; focus rings stay the base skin's.

## 2026-11-15: audit and redesign plan (superseded above)

## Audit: what's wrong today

| # | Problem | Evidence |
| - | ------- | -------- |
| 1 | Two headers | Home has section anchors (Studio, Chat, Writing…); Components, Templates and Theme have a short nav, at a different width. No logo anywhere. |
| 2 | No positioning | The hero says "Change the surface. Keep the behavior." and one paragraph. Nothing says who it's for, what problem it solves, or why it beats wiring UI SDK yourself. The thesis (UI SDK ships behavior and 55 unstyled parts; UISet ships the looks, the heavy kits and the pages) appears nowhere. |
| 3 | No information architecture | The four things we offer (components, kits, templates, themes) aren't named as such. The home page is a stack of demos; kits are only reachable by scrolling; skins only by a picker. |
| 4 | No docs on the site | 20 docs pages exist only as raw Markdown files. No getting-started path, no per-component pages, no search. |
| 5 | No logo | Wordmark in plain text; favicon is generic. |
| 6 | No SEO / GEO / AEO | Same `<title>` on every page; no Open Graph or Twitter cards; no JSON-LD; no canonical; no sitemap or robots.txt; the HTML is an empty `<div id="root">` until JavaScript runs, so crawlers and AI engines index nothing. |
| 7 | No "why" and no future | No value propositions, no comparison, no roadmap, no FAQ. |
| 8 | Benchmark missing | The roadmap promised a rerun of UI SDK's agent benchmark on our kits with published numbers. Not done. |
| 9 | Skills and llms.txt hidden | They exist in the repo, but the site never mentions them. The roadmap promised a skill per kit; there is one skill. |
| 10 | No copy buttons | 19 install commands on the home page, none copyable. |
| 11 | Theme builder is shallow | It sets one key color and a radius. The roadmap promised a theme generator: key color → a full token set, validated, exported. |

## Who it's for, and what the site must do

- **Developers who picked (or are evaluating) UI SDK** and need a finished UI: they want to see it, install it, and read how in under a minute.
- **Their coding agents**, which read llms.txt, the skill and the docs, and operate the UI through the agent bridge.
- **People comparing libraries** (shadcn/ui users, Radix users): they need a clear "what is this, how is it different, can I trust it".

The site's job: make "UISet is everything UI SDK doesn't ship" obvious in five seconds, prove it live, and put install, docs and skill one click away from every page.

## Positioning

- **One line:** UISet is the components, kits, templates and themes for Vercel's UI SDK.
- **The idea:** UI SDK gives you behavior: keyboard, focus, screen readers, agents. UISet gives you everything else: how it looks, the big components apps need, and whole pages.
- **Why use it (each backed by something on the site):**
  1. *A complete set.* 55 UI SDK components styled, 13 kits (chat, rich text, data grid, charts, board, scheduler, canvas, IDE, mobile, terminal, studio, agent console, app frame), 10 page templates. You never mix in a second UI library.
  2. *Agents can use it.* Every control is named for UI SDK's agent bridge. Benchmark numbers on our own kits.
  3. *Five looks, one API.* Skins are pure CSS; switch them live, nest them, or generate your own.
  4. *Checked like infrastructure.* Accessibility checks in every skin and theme, keyboard tests, mutation tests, an install test of every item.
  5. *Your code.* Installed with the shadcn CLI into your project; React, plus Web Components for Vue, Svelte, Solid and plain HTML.
  6. *Built for coding agents.* A skill per kit, llms.txt, Markdown docs.

## Information architecture

Top navigation (same on every page): **logo · Docs · Components · Kits · Templates · Themes · Agents · search (⌘K) · GitHub · theme toggle**.

```
/                      Home
/docs                  Introduction
/docs/installation     Installation (CLI, manual, Web Components)
/docs/quick-start      First screen in five minutes
/docs/theming          Theming, skins, key color, nesting, sound
/docs/ai               Building with AI agents: skill, llms.txt, agent bridge
/docs/web-components   Vue, Svelte, Solid, plain HTML
/docs/migrate          Coming from shadcn/ui
/docs/components/<n>   One page per UI SDK component (55): preview, install, usage, what UISet adds, API link
/docs/kits/<kit>       One page per kit (13): live demo, install, the kit's docs
/docs/templates/<t>    One page per template (10)
/docs/skins/<s>        One page per skin (5)
/docs/reference/tokens CSS variables
/components            Every component, live, in any skin (today's gallery, cards link to docs)
/kits                  The kits, each with a live preview and its install command
/templates             Template viewer (today's), with install and docs links
/themes                The five skins side by side, and the theme generator (/themes/generator)
/agents                Agent story: the bridge, the benchmark, the skill, llms.txt
```

## Home page outline

1. **Hero.** Headline and subhead from the positioning; primary "Get started", secondary "Browse kits"; the install command with a copy button. Right side: the signature demo, one live panel with a skin divider you can drag to compare two skins on the same live controls.
2. **Behavior vs everything else.** A two-layer diagram: UI SDK (behaviors, 55 unstyled components, agent bridge) under UISet (skins, styled components, kits, templates, Web Components, skill). Two sentences.
3. **What's inside.** Components, Kits, Templates, Themes: count, one line, link, small live thumbnail each.
4. **Kits.** Tabs with the real kits live (chat, rich text, data grid, charts, scheduler, board), each with its install command.
5. **Agents.** Benchmark numbers on our kits, the agent console demo, the skill.
6. **Skins.** The five skins side by side (exists), plus the generator.
7. **Quality.** What's checked and how many: accessibility, keyboard, mutations, install test, right-to-left, forced colors.
8. **Start in three steps.** Install, wrap, add a kit (a real sequence, so numbered).
9. **Frameworks.** React and Web Components snippets.
10. **FAQ.** Direct answers (also the AEO source).
11. **Where it's going.** The public roadmap, honestly.
12. **Footer.** Docs, kits, templates, themes, GitHub, llms.txt, license, "not affiliated with Vercel".

## Design plan

**Subject.** A layer over a core: UI SDK is the structure, UISet the surface. The site shows that literally: the same live control, its surface swappable.

| Token | Value | Role |
| ----- | ----- | ---- |
| Paper | `#FBFBFD` | Page (cool white, not cream) |
| Ink | `#15161B` | Text, wordmark |
| Graphite | `#5C5F6B` | Secondary text (7:1 on Paper) |
| Rule | `#E2E3EA` | Hairlines, card edges |
| Key | `oklch(0.5 0.19 268)` | Links, primary actions: the base skin's default key, so the site is UISet's own base skin |
| Core | `oklch(0.62 0.02 268)` dashed | Drawing UI SDK's layer in diagrams: dashed outlines mean "behavior, no look" |

Dark mode: Paper `#121318`, Ink `#EDEEF3`, Graphite `#A3A6B3`, Rule `#262833`.

**Type.** One family, two widths: Instrument Sans at width 75, weight 700, tight leading for display (the headline is the visual), and width 100, weight 400 for text, 16px, 1.6 line height, lines under 75 characters. Code in the platform monospace, for code only (no monospace labels).

**Layout.** Left-aligned throughout; a 12-column grid at 1200px. Docs: left sidebar, content at ~70ch, right "On this page" from 1280px. Home sections alternate full-width demos with text at reading width. Cards only where the content is a set of peers (the four offerings, the kits); everything else is plain text and live components.

**Principles.**
1. Show, don't describe: every claim on the home page sits next to the live thing.
2. The surface is the story: the one bold moment is the skin divider in the hero. Everything else is quiet.
3. Every install command copies; every component links to its docs; every docs page links to its live demo.
4. Dogfood: the site is built from UISet (header, search palette, tabs, code blocks with copy, theme toggle).
5. No template chrome: no eyebrow labels, no middle-dot meta strings, no arrows appended to links, no numbered markers except real sequences.

**Logo.** A "U" drawn as one thick rounded stroke with a square sitting in its bowl: the U is the structure, the square is the component it holds; together they read "Ui". In `currentColor`, so it follows light and dark. Wordmark "UISet" in Instrument Sans condensed bold.

**Review against generic defaults.** Cream + serif: no (cool paper, one sans). Black + acid accent: no. Broadsheet hairlines: hairlines only for docs tables. SaaS card kit: cards only for the four offerings and the kit list; no shadows-as-decoration. Template chrome: banned above. The hero's divider demo is specific to this product (it's literally what UISet does), not a stock hero.

## SEO, GEO, AEO

- Prerender every route to static HTML at build (render each page in a browser and save it), so crawlers and AI engines get full content; the app takes over on load.
- Per-page title, description, canonical, Open Graph and Twitter tags, and an Open Graph image.
- JSON-LD: `WebSite`, `SoftwareSourceCode` (home), `TechArticle` + `BreadcrumbList` (docs), `FAQPage` (home FAQ).
- `sitemap.xml`; `robots.txt` that welcomes search and AI crawlers; `llms.txt` and `llms-full.txt` linked from the footer and the AI docs page.
- Words people search for, used where they're true: "UI SDK components", "UI SDK UI kit", "UI SDK themes", "UI SDK templates", "shadcn registry for UI SDK", "accessible React data grid", "agent-ready components".

## Theme generator (the real one)

Inputs: key color (OKLCH sliders, hex input, presets), neutral tint (hue and amount), radius, density, font. Output: the whole token set for light and dark (`--ui-*`, `--tone-*`, `--chart-*`), every pair checked (text 4.5:1, quiet text 4.5:1, edges and focus 3:1, chart colors told apart with color blindness), with one-click fixes. Preview: a realistic screen (form, table, chart, alerts, a dialog) in light and dark. Export: a UISet skin file, shadcn CSS variables, design tokens JSON; a shareable URL.

## Benchmark

Rerun UI SDK's method on UISet: the same tasks done by an agent with browser tools (an accessibility snapshot, click, type) and by an agent with UI SDK's bridge (snapshot, act, query). Tasks: project settings (UI SDK's own task), a data grid (filter, sort, edit a cell), a scheduler (add an event). Sonnet, three runs each, medians of tool calls, text read, time and tokens. Publish the method, the numbers and the raw data, and include the runs where one approach failed.
