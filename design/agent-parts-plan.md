# Agent parts for AI apps: the plan

Planned and built on 2026-11-20 for 0.6.0, inside a 19:00 cutoff (the owner asked for the
next feature in the time left). Roadmap: Now, "Agent parts for AI apps".

## What exists

The chat kit already has a context meter (`ChatUsage`, "18.4K of 200K tokens") and a plan
(`ChatTasks`). The Web Components chat reads Vercel AI SDK `UIMessage` parts as they are, tool
approvals included (Allow and Deny, an `approve` event). React's `ChatTool` shows "Needs your
approval" but has nothing to press, and React has no way to draw a `UIMessage`.

## Tonight

1. **Approvals in React.** `ChatTool` takes `onApprove(approved)`: with status `approval` it shows
   Deny and Allow, as the web build does. Allow carries `data-agent-confirm`, so an agent asks a
   person before allowing a tool run.
2. **The AI SDK adapter.** `ChatMessageParts` draws a `UIMessage`'s parts: text (Markdown,
   completed while it streams), reasoning, `tool-*` and `dynamic-tool` in every state
   (`input-streaming` to `output-denied`, approvals included), `source-url`, files, and the
   kit's own `tasks`, `checkpoint` and `subagent`. No dependency on the `ai` package: the
   types are written out.
3. **Checkpoints.** A line in the thread, "Checkpoint, 2:14 PM", with Restore. Restoring asks
   first (an agent too, through `data-agent-confirm`). A part `{ type: "checkpoint" }`, and a
   `restore` event on the web chat.
4. **Subagent runs.** A run the agent handed off, collapsed to its name, task and status
   (Thinking while it works, then "Done in 12s" or "Failed"), opening to its own steps: the
   same parts, nested. A part `{ type: "subagent", parts }`.
5. **Queued messages.** What a person typed while the agent worked, above the composer: "2
   queued", each with Remove, and Send now for the first. `ChatQueue`, and
   `<uiset-chat-queue>` with a `remove` and `send` event.

Every part: named for people and agents, in all five skins and both themes, React and Web
Components, an agent test and axe, a mutation check, screenshots.

## Later

A task queue the agent works through (beyond the plan's list), subagent runs side by side, and
checkpoints that diff what changed. The Agent Console keeps its own approvals.
