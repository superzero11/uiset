# Building with AI agents

Two kinds of agent meet UISet: coding agents that build your interface, and agents that use
it once it's running. UISet has something for each.

## Coding agents

### The skills

Skills teach a coding agent (Claude Code, Cursor, Codex and others that read
[agent skills](https://skills.sh)) how to use UISet: which item fits a task, how to install
and wrap, the skins, and the rules that keep its output accessible and agent-ready.

```bash
npx skills add superzero11/uiset
```

That adds `uiset`, the core skill, and one skill per kit (`uiset-chat`, `uiset-data-grid`,
`uiset-rich-text` and the rest), each carrying that kit's docs. The core skill points the
agent at UI SDK's own skill for building new behaviors.

What the skills tell an agent, in short:

- Use a UISet kit or component before building one; build anything new from UI SDK's
  behaviors, never with hand-written keyboard handling or ARIA.
- Name every control; mark destructive actions with `data-agent-confirm`.
- Style with the skin's CSS variables, never fixed colors, so it works in every skin.

### llms.txt

[`/llms.txt`](/llms.txt) lists every docs page with a line on each, for agents that read
docs from the web. [`/llms-full.txt`](/llms-full.txt) holds every page in one file. Every
docs page has its Markdown a click away ("View Markdown"), and every item's API comes from
UI SDK's own docs, which ship inside its packages at
`node_modules/@ui-sdk/react/docs/`.

### A prompt to start from

```text
This project uses UISet (components, kits, templates and themes for Vercel's UI SDK).
Read https://uiset.dev/llms.txt for what's available, and the docs page for each item you use.
Install items with: npx shadcn@latest add superzero11/uiset/<item>
Wrap the app in <UISet skin="base"> from @/components/ui/uiset.
Don't hand-write keyboard handling or ARIA that a UI SDK component covers, and give every control a name.
```

## Agents that use your app

UI SDK's agent bridge gives an agent the page as data: each component's name, value and
actions, and a way to act on them. The agent never needs a screenshot.

```ts
import { createAgent } from "@ui-sdk/react/agent"

const agent = createAgent()

agent.snapshot()
// [{ ref: "c4", component: "data-grid", label: "Orders", actions: ["sort", "filter", …] }, …]

await agent.act({ steps: [{ ref: "Orders", action: "sort", args: ["Amount", "descending"] }] })
```

Register the same tools with a browser that supports WebMCP with `registerTools(agent)`, or
hand `agentTools` to your own model. UI SDK's
[agents guide](https://ui-sdk.dev/docs/agents) covers the bridge in full.

### What UISet adds

- **Names.** Every control has an accessible name, which is how the bridge finds it.
  Specific names ("Search orders", not "Search") keep refs unambiguous.
- **Actions that mean something.** Kits expose their work as actions: the data grid sorts,
  filters, groups and edits; the scheduler adds, moves and resizes events; the board moves
  cards; the rich text editor reads and writes Markdown; the patch bay plugs cables.
- **Confirmation.** Destructive buttons carry `data-agent-confirm`, so the bridge's `allow`
  step asks a person before an agent deletes anything.
- **The Agent Console.** The human side of the bridge: approvals in your app, a list of
  every change with undo, and highlights where the agent acted. See
  [Agent Console](/docs/kits/agent-console).
- **A check for your own pages.** `agent-check` scores a page by how many of its controls an
  agent can find by name, and lists the rest: unnamed, names that find several controls, and
  controls agents can't see. In a test, in Playwright or from the command line. See
  [Agent readiness check](/docs/agent-check).

### The benchmark

UI SDK measured agents doing a settings task with browser tools on another library and with
the bridge on UI SDK. We ran the same comparison on UISet's kits; the numbers and the
method are on the [Agents page](/agents#benchmark).
