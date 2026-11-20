# Chat

A chat interface on UI SDK, in six items: the thread and its messages, Markdown answers that
stream, the parts around an answer (reasoning, tool calls, sources), an AI SDK message drawn
from those parts, the message box, and the list of chats. Every part takes plain props, so
your model's stream goes into your own state and the kit draws it. The `chat-app` template
puts them together into a page.

```bash
npx shadcn@latest add @uiset/chat @uiset/chat-response \
  @uiset/chat-parts @uiset/chat-message-parts \
  @uiset/chat-composer @uiset/chat-sidebar
```

Each of the last five brings `chat` with it. `chat-response` also adds `react-markdown`,
`remark-gfm`, `remend` and `shiki`.

The behavior is UI SDK's. The thread is a `ScrollArea` that follows new text with
`stickToEnd` (a wheel or End at the bottom keeps it following, where UI SDK lets go over a
one-pixel rounding), and its controller brings you back from Jump to latest; the message box brings back what you sent with `createInputHistory`; "/" and "@" are
`TriggerMenu`; attachments are `FileInput`; reasoning, tool calls and sources are
`Collapsible`; the model picker is a `Select`; usage is a `Meter`.

## Parts

| Part                                  | Item            | What it is                                                     |
| ------------------------------------- | --------------- | -------------------------------------------------------------- |
| `ChatThread`                          | `chat`          | The scrolling log: follows new text unless you scroll up, then offers Jump to latest |
| `ChatMessage`                         | `chat`          | One message: who sent it, when, its content and an `actions` slot |
| `ChatMessageActions`                  | `chat`          | Copy, Retry, Edit and Good or Bad under a message, as one toolbar |
| `ChatBranch`                          | `chat`          | "2 of 3" with Previous and Next version, for regenerated answers |
| `ChatEmpty`, `ChatSuggestions`        | `chat`          | The empty thread's heading, and prompts to start from          |
| `ChatTasks`                           | `chat`          | A plan: each task's status in words, and "1 of 3 done"         |
| `ChatShimmer`                         | `chat`          | "Thinking…" with a shimmer                                     |
| `ChatResponse`                        | `chat-response` | The model's Markdown, completed while it streams; raw HTML never renders |
| `ChatCodeBlock`                       | `chat-response` | Highlighted code with Wrap and Copy (`ChatResponse` uses it for fenced code) |
| `ChatReasoning`                       | `chat-parts`    | The model's thinking: open while it streams, then "Thought for 4s" |
| `ChatTool`                            | `chat-parts`    | A tool call: its status in words, input, output or error, and Allow or Deny when it waits |
| `ChatSubagent`                        | `chat-parts`    | A run the agent handed off: name, task, status, and its own steps inside |
| `ChatCheckpoint`                      | `chat-parts`    | "Checkpoint, 2:14 PM" with Restore                              |
| `ChatMessageParts`                    | `chat-message-parts` | A Vercel AI SDK message's parts, drawn with the parts above |
| `ChatSources`, `ChatCitation`         | `chat-parts`    | "Used 2 sources", and a numbered link with a hover card        |
| `ChatImage`                           | `chat-parts`    | An image with its size reserved and an optional caption        |
| `ChatComposer`                        | `chat-composer` | The message box: Enter sends, commands, mentions, attachments, a toolbar |
| `ChatModelPicker`, `ChatUsage`        | `chat-composer` | A model `Select`, and a meter that reads "18.4K of 200K tokens" |
| `ChatQueue`                           | `chat-composer` | Messages written while the agent works: "2 queued", Remove, Send now |
| `ChatThreadList`                      | `chat-sidebar`  | The chats: choose one, New chat, Rename, Delete (asks first)   |
| `ChatLauncher`                        | `chat-sidebar`  | A floating button that opens the assistant in a panel          |

## Use

```tsx
<ChatThread label="Conversation">
  {turns.length === 0 && (
    <ChatEmpty title="What are we working on?">
      <ChatSuggestions suggestions={["Draft release notes"]} onSelect={send} />
    </ChatEmpty>
  )}
  {turns.map((turn) =>
    turn.from === "user" ? (
      <ChatMessage key={turn.id} from="user">{turn.text}</ChatMessage>
    ) : (
      <ChatMessage
        key={turn.id}
        from="assistant"
        avatar={{ fallback: "AI" }}
        streaming={turn.streaming}
        actions={!turn.streaming && (
          <ChatMessageActions text={turn.text} onRetry={() => retry(turn.id)}
            feedback={turn.feedback} onFeedbackChange={(f) => rate(turn.id, f)} />
        )}
      >
        {turn.reasoning && (
          <ChatReasoning streaming={turn.thinking} seconds={turn.seconds}>
            {turn.reasoning}
          </ChatReasoning>
        )}
        {turn.tools.map((tool) => (
          <ChatTool key={tool.id} name={tool.name} status={tool.status}
            input={tool.input} output={tool.output} />
        ))}
        <ChatResponse streaming={turn.streaming}>{turn.text}</ChatResponse>
        <ChatSources sources={turn.sources} />
      </ChatMessage>
    ),
  )}
</ChatThread>
<ChatComposer
  running={running}
  onStop={stop}
  onSubmit={({ text, files }) => send(text, files)}
  commands={[{ value: "summarize", label: "summarize", description: "Shorten the thread" }]}
  mentions={projectFiles.map((f) => ({ value: f.path, label: f.name }))}
  attachments={{ accept: "image/*,.pdf", maxFiles: 5, maxSize: 10 * 1024 * 1024 }}
  tools={
    <>
      <ChatModelPicker models={models} value={model} onValueChange={setModel} />
      <ChatUsage used={used} limit={200000} />
    </>
  }
/>
```

- `ChatThread`'s `label` ("Conversation") names its scroll region, which holds a
  `role="log"`. The region is capped at `--chat-thread-height` (26rem by default).
- `ChatMessage` takes `from` (`"user"`, `"assistant"` or `"system"`), `name` (You,
  Assistant or System by default), `avatar` (`{ src?, fallback }`, named by `name`) and
  `time` (a `Date`, shown in the viewer's short time format). `streaming` marks it
  `aria-busy` and draws a caret after the last block.
- `ChatMessageActions` shows Copy when `text` is given, Retry with `onRetry`, Edit with
  `onEdit`, and Good and Bad with `onFeedbackChange`. Pressing the pressed one again gives
  `null`. Copy announces "Copied". The toolbar and its Good and Bad group are named with
  the message's first words, as each button is (`Actions: "Here's a summary of the…"`,
  `Feedback: "Here's a summary of the…"`); `label` gives the toolbar a name of your own.
- `ChatBranch` takes `index` (from 0), `count` and `onIndexChange`, and renders nothing for
  fewer than two versions. "2 of 3" is announced as it changes.
- `ChatTasks` takes `tasks` (`{ id, title, status, detail? }`), `title` ("Plan") and
  `defaultOpen` (on). Statuses `pending`, `running`, `done` and `failed` read as To do,
  In progress, Done and Failed.

## Answers

- `ChatResponse` takes the Markdown as its child, with GitHub tables, task lists and
  strikethrough. With `streaming`, half-written Markdown is completed (remend), so
  `**bold` shows as bold, not stars.
- Raw HTML in the Markdown is dropped, never rendered: model output is untrusted. `http`
  and `https` links open in a new tab and say so to screen readers. Wide tables scroll in
  a focusable region.
- Images in an answer load when they're same-origin, `data:` or `blob:`. Any other image
  shows as a link ("Image: chart"), because its address could carry what the model read
  to another server. `allowImage(url)` returns `true` for the ones to load.
- Fenced code with a language is highlighted by shiki, loaded the first time it's needed,
  one language at a time, in the skin's colors. A language shiki doesn't know shows as
  plain text. Each block has a Wrap toggle and a Copy button named "Copy ts". Render
  `ChatCodeBlock` yourself with `code`, `language` and `filename` (which then names the
  block and its Copy button).
- `ChatReasoning` opens while `streaming` is on and closes when it ends, unless a person
  or an agent opened or closed it; then it stays as they left it. It reads "Thinking…"
  while streaming, "Thought for 4s" with `seconds` (rounded, at least 1), and
  "Reasoning" without.
- `ChatTool`'s `status` is `pending`, `running`, `approval`, `done`, `error` or `denied`,
  read as Queued, Running, Needs your approval, Done, Failed and Not allowed. It opens
  itself for `approval` and `error` unless you pass `defaultOpen`. `title` replaces
  `name` in the header; `input` and `output` show as JSON (strings as they are); `error`
  shows in place of the output.
- With `status="approval"` and `onApprove(approved)`, `ChatTool` shows Deny and Allow.
  Allow carries `data-agent-confirm`, so an agent asks a person before it lets a tool run.
- `ChatSources` takes `sources` (`{ href, title, description? }`) and renders nothing for
  an empty list. `ChatCitation` takes `index` and one `source`: a link named "Source 1:
  title" whose hover card shows the title, host and description.
- `ChatImage` needs `src`, `alt`, `width` and `height`, so the space is held before it
  loads; `caption` is optional.

## Agent parts

An agent's work, as AI apps show it: tools that wait for a person, runs handed to
subagents, points to go back to, and what a person typed meanwhile.

```tsx
import { ChatMessageParts } from "@/components/ui/chat-message-parts"
import { ChatQueue } from "@/components/ui/chat-composer"

// With the AI SDK's useChat: messages, addToolApprovalResponse.
{messages.map((message) => (
  <ChatMessage key={message.id} from={message.role}>
    <ChatMessageParts
      parts={message.parts}
      onApprove={(part, approved) => addToolApprovalResponse({ id: part.approval!.id, approved })}
      onRestore={(checkpoint) => restoreTo(checkpoint.id)}
    />
  </ChatMessage>
))}
<ChatQueue items={queued} onRemove={unqueue} onSendNow={sendNow} />
```

- `ChatMessageParts` draws `text` (Markdown, completed while it streams), `reasoning`,
  `tool-*` and `dynamic-tool` in every state from `input-streaming` to `output-denied`
  (approvals included), `source-url` (once the answer is complete), `file` (`data:` and
  `blob:` images; other files are links), and the kit's own `tasks`, `checkpoint` and
  `subagent`. It doesn't depend on the `ai` package: the part types are written out.
- A `checkpoint` part is `{ type: "checkpoint", id, label?, time? }`. Restore asks an agent
  to check with a person first; what it restores is yours to decide.
- A `subagent` part is `{ type: "subagent", id, name, task?, status, seconds?, parts }`: its
  status reads Working while it runs, then "Done in 12s" or Failed (open, so the reason
  shows), and its `parts` are drawn inside it, the same way.
- `ChatQueue` takes `items` (`{ id, text }`), `onRemove(id)` and, for Send now on the
  first, `onSendNow(id)`. It renders nothing when the queue is empty. Each button names its
  message ("Remove from queue: Then open a pull request").
- The context meter is `ChatUsage`, and a plan is `ChatTasks`.

## The composer

- `onSubmit({ text, files })` gets the trimmed text and the attached files, then the box
  clears. With no text and no files, nothing is sent.
- While `running` is on, Enter and Send don't send. With `onStop` too, Send becomes Stop.
- `commands` show after "/" at the start of the message and `mentions` after "@", each
  `{ value, label, description? }`. Choosing one inserts the trigger and the label
  ("/summarize "); `onSubmit` gets that text, not the item's `value`.
- `attachments` is off by default. `{ accept?, maxFiles?, maxSize? }` (`maxSize` in bytes)
  adds a paperclip, takes files dropped on the box or pasted into it, and lists them as
  chips with Remove. UI SDK's `FileInput` announces files it rejects; they never join.
- `tools` render in the composer's toolbar, beside Send. `label` ("Message") names the
  box; `placeholder` defaults to "Message…".
- Up brings back messages sent from this box since it mounted.
- `ChatModelPicker` takes `models` (`{ value, label, description? }`), `value` or
  `defaultValue` (the first model when neither is given), `onValueChange` and `label`
  ("Model", visually hidden).
- `ChatUsage` takes `used` and `limit`, with `unit` ("tokens") and `label` ("Context
  used"). The meter carries `data-level="medium"` past 70% and `"high"` past 90%.

## Chats and the launcher

- `ChatThreadList` takes `threads` (`{ id, title, updatedAt? }`), `value` (the open chat,
  marked `aria-current="page"`) and `onValueChange(id)`. `label` names the list ("Chats").
- `onNew` adds New chat. `onRename(id, title)` and `onDelete(id)` add a "More for
  title" menu to each chat. Rename edits in place: Enter or leaving the field saves,
  Escape cancels, and an empty or unchanged title isn't sent. Delete asks in an alert
  dialog ("Delete “Launch plan”?") before calling `onDelete`.
- `updatedAt` shows as "4 min ago" and is the chat button's description. It's worked out
  when the list renders, not kept current.
- `ChatLauncher` takes `label` ("Open assistant"), `title` ("Assistant") and the panel's
  `children`. The panel opens above its button and stays open while you click around
  the page; Escape, the button and Close shut it.

## The chat-app template

```bash
npx shadcn@latest add @uiset/chat-app
```

`<ChatAppTemplate assistant={assistant} />` is the kit as a page. `assistant` is an async
generator given `{ text, files, model, history, signal }` that yields `text`, `reasoning`,
`reasoning-end`, `tool` (the same `id` updates the card) and `sources` events; the sample
one streams a placeholder. It also takes `models`, `commands`, `mentions`, `suggestions`,
`userName` ("You"), `userAvatar` and `limit` (200000, for the usage meter).

- It runs one answer at a time. Stop aborts `signal` and isn't shown as a failure; any
  other error adds "The answer stopped early. Try again."
- It starts on the second entry in `models` (the sample's "Balanced").
- New chats are numbered ("Untitled chat 2") until the first message, cut to 40
  characters, becomes the title. Deleting the last chat starts a new one.
- Retry sends the question before that answer again, as a new turn.
- Usage is an estimate per chat (`estimateTokens`: 900 plus 4 per character of each
  message sent), until your model reports its own.

[Connecting a model to the chat app template](./templates.md#connecting-a-model-to-chat-app) shows one connected.

## Keys

| Keys                    | Where                      | Does                                                   |
| ----------------------- | -------------------------- | ------------------------------------------------------ |
| Enter                   | message box                | Send; with a "/" or "@" menu open, choose the item     |
| Shift+Enter             | message box                | A new line                                             |
| Up, Down                | message box                | What you sent before, when the caret is on the first or last line |
| "/" at the start, "@"   | message box                | Commands, mentions: arrows move, Enter or Tab choose, Escape closes |
| Tab                     | thread, code, tables       | A stop while it scrolls and holds nothing else to press; arrows and Page keys scroll it |
| Arrows                  | message actions, suggestions | Move along the toolbar (one Tab stop)               |
| Enter, Space            | reasoning, tool, sources, plan | Open or close it                                   |
| Enter, Escape           | rename field               | Save, cancel (leaving the field saves too)             |
| Escape                  | launcher                   | Close it                                               |

Enter doesn't send while an input method is composing. Copying, version changes and
attached or rejected files are announced.

## For agents

The bridge sees UI SDK components, so messages themselves aren't in its snapshot: give
your agent the conversation from your own state. What it does see, by name:

- **Message box:** a trigger menu named by `label` ("Message") with `insert`, plus Send
  (or Stop) and "Attach files" (`setValue`, `addFiles`, `removeFile`, `clear`, `open`).
  `insert` writes only while the box has focus; without focus it reports success and
  writes nothing. There's no `setValue` on the box.
- **Toolbar:** "Model" is a select an agent sets by a model's label or value; "Context
  used" is a meter it reads (`value`, `min`, `max`).
- **Answers:** each reasoning, tool call, sources list and plan is a collapsible named by
  its header ("Thought for 4s", "Searched the docs, Done", "Used 2 sources"), with
  `setOpen`. Each message's actions are a toolbar (`Actions: "Here's a summary of the…"`)
  to `press` Copy message, Retry message, Edit message, Good response or Bad response,
  each named with its message's first words so an agent can tell one reply's from
  another's (`Copy message: "Here's a summary of the…"`); the feedback group
  (`Feedback: "Here's a summary of the…"`) also takes `setValue`. Code blocks have "Wrap lines" and "Copy ts"; citations are hover cards
  ("Source 1: AbortController").
- **Chats:** New chat, each chat as a button named by its title, and "More for title" to
  `press` Rename or Delete. Rename shows a "Rename title" field; an agent's `setValue`
  fills it, but it's saved only on Enter or when focus leaves it.
- **Delete chat** in the dialog carries `data-agent-confirm` ("Deletes the chat
  “Launch plan” and its messages"), so a step on it waits for the person, or fails with
  "Needs a person" when the bridge has no `allow`.

A few names still repeat from one answer to the next: a code block's "Wrap lines" and a
reply's "Previous version". With two on the page, a step that names one fails and lists
the refs; retry with a ref. Nothing in the kit is `data-agent-hidden`.

## Web Components

`<uiset-chat>`, `<uiset-chat-composer>`, `<uiset-chat-threads>`,
`<uiset-chat-model-picker>`, `<uiset-chat-usage>` and `<uiset-chat-queue>` are the kit as
custom elements. `<uiset-chat>` draws a whole conversation from AI SDK's `messages` shape,
with Allow and Deny on tool calls that wait for approval (an `approve` event), and the
`checkpoint` and `subagent` parts (Restore fires `restore`). `<uiset-chat-queue>` takes
`items` and fires `remove` and, with `send-now`, `send`. The launcher has no element. See
[Web Components](./web-components.md#chat).
