# Agent readiness check

An agent uses a page by finding each control by its name. `agent-check` checks a page the
way the agent sees it, and scores it: the share of controls an agent can find by a name of
their own. On a UI SDK app it asks the agent bridge itself, in any framework UI SDK serves.
On any other site it reads the page's accessibility tree, as browser agents do. Try both on
[the Agents page](/agents#agent-check): the live check, with and without three mistakes in a
form, and a bookmarklet that checks any page you're on.

```bash
npx shadcn@latest add @uiset/agent-check
```

## In a test

`expectAgentReady` checks the page and throws, with every problem, when the score is under
`minScore` (100) or an error is found. Use the bridge your app creates:

```tsx
import { render } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { test } from "vitest"
import { expectAgentReady } from "@/components/ui/agent-check/check"
import { ProjectSettings } from "./project-settings"

const agent = createAgent()

test("an agent can find every control on the settings page", async () => {
  render(<ProjectSettings />)
  await expectAgentReady(agent)
})
```

`checkAgentReadiness(agent)` returns the report instead, and `formatAgentReadiness(report)`
writes it as text. `root` (an element or a CSS selector) limits where it looks for controls
agents can't see; the bridge always reports the whole page.

## What it checks

Errors, which lower the score:

- **`unnamed`**: a component the bridge lists has no name, so no step can find it. Give it a
  label part or `aria-label`, or `aria-hidden="true"` if it's decoration.
- **`ambiguous`**: a name finds more than one component, so a step by that name fails. A name
  matches every name holding its words: "Region" finds "Revenue by region". Give each a name
  with a word the others lack. A closed tooltip, menu or dialog takes its trigger's name:
  give a tooltip its own `aria-label`, and a dialog `keepMounted` so its title names it.
- **`unseen`**: a control a person can reach (a native button or field, or an ARIA widget,
  that Tab reaches) isn't a UI SDK component, so agents can't see it. Use the UI SDK part for
  it, or put it inside `data-agent-hidden` if agents shouldn't use it.

Warnings, which don't:

- **`unconfirmed`**: a button whose label starts with a word like Delete, Pay or Deploy has
  no `data-agent-confirm`. Add one saying what it does, if a person should approve it.
- **`overflow`**: the page has more than 100 components, so an agent's snapshot shows 100 and
  it must query for the rest. Fewer components per view (tabs, pages, collapsed sections)
  let it see the whole view at once.

Names are checked with the bridge's own search (`query`), so they match the way a step's do.
Components no step targets, with no actions, like avatars, may share a name. A control is
UI SDK's when it has `data-slot`, which UI SDK puts on every element it binds; inner parts a
component drives itself, out of the Tab order inside it (a grid's row checkboxes), aren't
counted.

The score counts the components the bridge lists and the controls it can't see; errors lower
it and warnings don't. Accept a problem you've decided to keep with `ignore`, and it counts as
fine:

```ts
await expectAgentReady(agent, { ignore: (problem) => problem.kind === "unseen" && problem.control.includes("Legacy export") })
```

## Any page, without a bridge

`checkPageReadiness` reads the page itself: every button, link, field and widget the
accessibility tree has, with the name a browser gives it. It needs nothing from the page, so
it checks a site built with anything. `expectPageReady` is its test helper:

```tsx
import { render } from "@testing-library/react"
import { test } from "vitest"
import { expectPageReady } from "@/components/ui/agent-check/page"
import { Checkout } from "./checkout"

test("an agent reading the checkout page can tell every control apart", () => {
  render(<Checkout />)
  expectPageReady()
})
```

Errors, which lower the score:

- **`unnamed`**: a control with no name. Give it visible text, a label, or `aria-label`.
- **`ambiguous`**: controls of one kind sharing a name, like three "Edit" buttons in a table,
  or two "Read more" links that go to different places. Radios, tabs, options and menu items
  only need a name of their own within their group, so every question can have its "Yes".
- **`unseen`**: something that looks clickable (a pointer cursor starts on it, or it has an
  `onclick`) but isn't a button or link, so an agent reading the page sees no control there.

Names follow the browser's rules closely but not completely: `aria-labelledby`, `aria-label`,
a label, the text inside (images by their `alt`, icons by their `title`, hidden parts left
out), then `title` or `placeholder`. `root` and `ignore` work as they do with the bridge, and
`elements: true` adds each problem's elements to the report.

## On a page, with Playwright

`checkPage` runs the check on a real page. On a UI SDK page it reaches the bridge as the
browser's agent would: through the tools the app registers with WebMCP (`registerTools`),
once `captureAgentTools` has run before the page loads, or through a global you name. On any
other page it reads the page. `mode: "bridge"` requires a bridge, and `mode: "page"` reads the
page even where there is one.

```ts
import { expect, test } from "@playwright/test"
import { captureAgentTools, checkPage } from "@/components/ui/agent-check/playwright"
import { formatAgentReadiness } from "@/components/ui/agent-check/check"

test("settings is agent-ready", async ({ page }) => {
  await captureAgentTools(page)
  await page.goto("/settings")
  const report = await checkPage(page) // or checkPage(page, { agent: "agent" }) for window.agent
  expect(report.score, formatAgentReadiness(report)).toBe(100)
})
```

## From the command line

`cli.ts` checks pages by URL in Chromium, any site or yours on localhost, and exits 1 when
one scores under `--min-score` (100):

```bash
npx tsx components/ui/agent-check/cli.ts http://localhost:3000 /settings /billing
```

Paths after the first URL are read against it. It uses a page's UI SDK bridge when it finds
one within a few seconds, and reads the page when not; `--mode bridge` or `--mode page`
chooses. `--agent <global>` names the bridge's global when the app doesn't register WebMCP
tools, `--root <selector>` limits where it looks, `--channel chrome` uses installed Chrome
instead of Playwright's Chromium, and `--json` prints the reports as JSON.

## The bookmarklet

The Agents page has a bookmarklet: drag it to your bookmarks bar and click it on any page,
including yours on localhost and pages you're signed in to. It asks the page's bridge when
it finds one at `window.agent`, reads the page when not, and draws the report over the page:
choose a problem to outline its elements. It runs in your browser, so nothing leaves it.
In your own app, `showAgentReadiness()` from `@/components/ui/agent-check/overlay` draws the
same report, with your bridge if you pass it (`{ agent }`).

## Limits

- A snapshot lists 100 components and a query returns 100 at most. Past 100 components of
  one kind, the check says how many it couldn't read.
- An exact name doesn't win over a longer one in UI SDK today
  ([vercel-labs/ui#612](https://github.com/vercel-labs/ui/issues/612)), so "Region" beside
  "Revenue by region" is reported, as a step by "Region" fails.
- `unconfirmed` reads a button's words, so it can't know what a button with other words does.
- Reading a page, `unseen` goes by what looks clickable: a click handler added from script on
  an element with no pointer cursor isn't found. Frames from other sites and closed shadow
  roots aren't read.

## Fixes that come up often

- **A tooltip that repeats its trigger's name.** A closed tooltip takes its trigger's name
  ([vercel-labs/ui#604](https://github.com/vercel-labs/ui/issues/604)), so the name finds two
  components. Put `data-agent-hidden` on its content: agents read the trigger's name, and
  people and screen readers are unaffected.
- **A field or menu that repeats a component's action.** A grid's search field holds the
  grid's name ("Search orders" beside "Orders"). When the component offers the same action
  (`filter`), hide the field from agents with `data-agent-hidden`; they use the action.
- **A row's controls.** Give each a verb of its own ("Open Launch plan", "More for Launch
  plan"), so none is the bare title that finds both.
- **Web Components named on an inner part.** The web bridge reads a component's name from
  its root element: put the `aria-label` of a `ui-tabs-list`, a `ui-scroll-area-viewport` or a
  `ui-slider-thumb` on `ui-tabs`, `ui-scroll-area` or `ui-slider` too.
