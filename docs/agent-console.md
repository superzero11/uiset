# Agent Console: design plan

## Who it's for

Any team adding an AI assistant that works inside their app (a copilot that fills forms,
changes settings, configures things) rather than one that only chats. That is most SaaS
products in 2026.

## Why it isn't another chat kit

Chat UI is well served: Vercel's AI Elements (~49 components), shadcn's AI Elements and
chat primitives, assistant-ui (13k stars). They render conversations. None of them can
show what an agent did _to the page_, because they don't know the page.

UI SDK's agent bridge does. The Agent Console is the human side of that bridge:

| Need                                        | UI SDK piece                                               | Console part                 |
| ------------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| Approve risky steps in the app, not a popup | `allow` returning a Promise                                | `AgentApprovals`             |
| See every change the agent made             | `createHistory`, `describeEntry`                           | `AgentActivity`              |
| Undo the agent, keep my own edits           | `history.undoSource("agent")`                              | Undo button                  |
| See _where_ it changed something            | `observe` + `elementOf`                                    | `highlightAgent()`           |
| Talk to it                                  | `createStickToBottom`, `createInputHistory`, `isComposing` | `AgentThread`, `AgentPrompt` |
| See what it sees                            | `agent.snapshot()`                                         | Page tab                     |
| Plug in any model                           | `agentTools` (snapshot, query, act)                        | `runAgentTool()`             |

The console marks itself `data-agent-hidden`, so an agent can never press its own
**Allow** button.

## Parts

- `createApprovals()`: framework-free. Gives `allow` for `createAgent`, plus a queue the
  UI reads. Steps marked `data-agent-confirm` always wait; a `policy` can ask for more.
  An abort (timeout) clears the card and refuses the step.
- `highlightAgent()`: framework-free. Marks the control an agent just changed with
  `data-agent-touched` for a moment, and scrolls it into view if it's off screen.
- `runAgentTool(agent, name, input)`: routes a model's tool call to the bridge.
- React: `AgentConsole` (header, status, Tabs: Chat · Activity · Page), `AgentThread`,
  `AgentMessage`, `AgentPrompt`, `AgentApprovals`, `AgentActivity`, `AgentSnapshot`.

## Look

It inherits the skin around it, so it matches the app. Structure: a column with a
header (name and a status lamp: Idle, Working…, Waiting for you), tabs, a scrolling body,
approvals pinned above the prompt so a waiting question is never scrolled away.

Approval cards are the one loud element: the agent's own sentence about what the step
does, in quotes, and two buttons named for the outcome ("Allow", "Don't allow").
Activity rows are quiet, sentence-like ("Agent set Visibility to Public"), with a "Show"
button that flashes the control on the page.

## Words

Sentence case, plain verbs. Status: "Idle", "Working…", "Waiting for you". Empty
activity: "Nothing yet. Changes the agent makes show up here, and you can undo them."
Errors say what happened and what to do: "The agent couldn't change Region: it's
disabled. Turn it on or change it yourself."

## Accessibility

- The thread is `role="log"`; new assistant messages are announced politely.
- An approval is announced (`role="status"`), never steals focus from what the person
  is typing, and its buttons are reachable with Tab.
- Highlight uses an outline that survives forced colors, and no motion under
  reduced motion.

## Demo

The gallery uses a small simulated model (pattern matching, no API key) so anyone can
try it. It is labeled as simulated. The bridge, approvals, history, undo and highlight
are all real. [Connect a model](#connect-a-model) shows how to drive the same console with a
real model through `agentTools`.

## Set it up

```bash
npx shadcn@latest add superzero11/uiset/agent-console
```

Create the bridge once, in the browser, before the app renders:

```ts
// agent.ts
import { createAgent } from "@ui-sdk/react/agent"
import { createHistory } from "@ui-sdk/react/history"
import { createApprovals } from "@/components/ui/agent/approvals"
import { highlightAgent } from "@/components/ui/agent/highlight"

export const approvals = createApprovals()
export const agent = createAgent({ allow: approvals.allow })
export const history = createHistory(agent)
highlightAgent()
```

Put the console anywhere, for example in a side panel:

```tsx
<AgentConsole status={status}>
  <AgentThread>
    {messages.map((m) => (
      <AgentMessage key={m.id} from={m.from}>
        {m.text}
      </AgentMessage>
    ))}
  </AgentThread>
  <AgentActivity history={history} />
  <AgentApprovals approvals={approvals} />
  <AgentPrompt running={running} onSend={send} onStop={stop} />
</AgentConsole>
```

Mark anything an agent must not do alone with `data-agent-confirm="<what it does>"`.
The step waits for **Allow** in the console, even when the agent opened a modal first.

## Connect a model

The console doesn't care which model you use. Give the model UI SDK's three tools and run
each tool call in the browser, where the page is:

```ts
import { agentTools, runAgentTool } from "@/components/ui/agent/tools"

// Send agentTools (names, descriptions and JSON Schemas for snapshot, query and act)
// with your request. For each tool call the model makes:
const result = await runAgentTool(agent, call.name, call.input)
// ...and return `result` to the model as the tool result.
```

With the Vercel AI SDK, declare the three tools on your route without an `execute`, so
they run on the client, and answer them in `useChat`'s `onToolCall` with
`runAgentTool(agent, toolCall.toolName, toolCall.input)`. Check the exact hook and field
names against your AI SDK version; this sketch isn't covered by our tests yet.

The bridge's `allow`, `data-agent-confirm`, `data-agent-hidden` and change callbacks
apply to every call, whichever model makes it.
