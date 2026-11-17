# Agent readiness check

An agent uses a UI SDK app through its agent bridge: it finds each control by name and calls
its actions. `agent-check` checks a page the way the agent sees it, through the bridge
itself, and scores it: the share of controls an agent can find by name. It works with any
framework UI SDK serves, since the bridge is the same in each. Try it on
[the Agents page](/agents#agent-check), with and without three mistakes in a form.

```bash
npx shadcn@latest add superzero11/uiset/agent-check
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

## On a page, with Playwright

`checkPage` runs the same check on a real page. It reaches the page's bridge as the browser's
agent would: through the tools the app registers with WebMCP (`registerTools`), once
`captureAgentTools` has run before the page loads, or through a global you name.

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

`cli.ts` checks pages by URL in Chromium, and exits 1 when one scores under `--min-score`
(100):

```bash
npx tsx components/ui/agent-check/cli.ts http://localhost:3000 /settings /billing
```

Paths after the first URL are read against it. `--agent <global>` names the bridge's global
when the app doesn't register WebMCP tools, `--root <selector>` limits where it looks for
controls agents can't see, `--channel chrome` uses installed Chrome instead of Playwright's
Chromium, and `--json` prints the reports as JSON.

## Limits

- A snapshot lists 100 components and a query returns 100 at most. Past 100 components of
  one kind, the check says how many it couldn't read.
- An exact name doesn't win over a longer one in UI SDK today
  ([vercel-labs/ui#612](https://github.com/vercel-labs/ui/issues/612)), so "Region" beside
  "Revenue by region" is reported, as a step by "Region" fails.
- `unconfirmed` reads a button's words, so it can't know what a button with other words does.
