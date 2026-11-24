// The chat kit in Solid, with React's assertions (tests/unit/chat.test.tsx), and Solid's own:
// an answer that streams updates in place, so a code block keeps its Wrap.
import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/solid/agent"
import { createSignal, flush, type ComponentProps } from "solid-js"
import { expect, test, vi } from "vitest"
import { ChatBranch, ChatMessage, ChatMessageActions, ChatSuggestions, ChatTasks, ChatThread } from "@/solid/src/chat"
import { ChatComposer, ChatUsage } from "@/solid/src/chat-composer"
import { ChatMessageParts, type ChatMessagePart } from "@/solid/src/chat-message-parts"
import { ChatCitation, ChatReasoning, ChatSources, ChatTool } from "@/solid/src/chat-parts"
import { ChatCodeBlock, ChatResponse } from "@/solid/src/chat-response"
import { ChatLauncher, ChatThreadList } from "@/solid/src/chat-sidebar"
import { expectAgentReady } from "@/registry/uiset/ui/agent-check/check"
import { settle } from "./solid-bridge"

const tick = () => settle(0)

function mockClipboard() {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  return writeText
}

test("markdown renders, and raw HTML from a model is never rendered", async () => {
  const { container } = render(() => <ChatResponse>{'**Bold** and [a link](https://example.com).\n\n<img src=x onerror="alert(1)">\n\n- one\n- two'}</ChatResponse>)
  await tick()
  expect(container.querySelector("strong")?.textContent).toBe("Bold")
  const link = screen.getByRole("link", { name: /a link/ })
  expect(link.getAttribute("rel")).toBe("noopener noreferrer")
  expect(link.getAttribute("target")).toBe("_blank")
  expect(link.textContent).toBe("a link (opens in a new tab)")
  expect(container.querySelector("img")).toBeNull()
  expect(container.querySelectorAll("li")).toHaveLength(2)
})

test("links go only to safe places, and remote images wait as links", async () => {
  const { container } = render(() => (
    <ChatResponse>{"[run](javascript:alert(1)) [mail](mailto:a@b.dev) [here](/docs)\n\n![a chart](https://evil.example/c.png?q=secret) ![dot](data:image/png;base64,iVBORw0KGgo=)"}</ChatResponse>
  ))
  await tick()
  const links = [...container.querySelectorAll("a")]
  expect(links.find((a) => a.textContent === "run")?.hasAttribute("href")).toBe(false)
  expect(links.find((a) => a.textContent === "mail")?.getAttribute("href")).toBe("mailto:a@b.dev")
  expect(links.find((a) => a.textContent === "here")?.getAttribute("href")).toBe("/docs")
  // The remote image is a link to follow, not a request the page makes.
  expect(screen.getByRole("link", { name: /Image: a chart/ }).getAttribute("href")).toBe("https://evil.example/c.png?q=secret")
  expect(container.querySelectorAll("img")).toHaveLength(1)
  expect(container.querySelector("img")!.getAttribute("alt")).toBe("dot")
})

test("half-finished markdown is repaired while it streams", async () => {
  const { container } = render(() => <ChatResponse streaming>{"Use **useDeferr"}</ChatResponse>)
  await tick()
  expect(container.querySelector("strong")?.textContent).toBe("useDeferr")
  expect(container.textContent).not.toContain("**")
})

test("an answer that streams updates in place: a code block keeps its Wrap as text arrives", async () => {
  const [text, setText] = createSignal("Here:\n\n```ts\nconst a = 1\n```")
  render(() => <ChatResponse streaming>{text()}</ChatResponse>)
  await tick()
  const block = document.querySelector(".chat-code")!
  await userEvent.click(screen.getByRole("button", { name: "Wrap lines" }))
  expect(block.hasAttribute("data-wrap")).toBe(true)
  setText("Here:\n\n```ts\nconst a = 1\n```\n\nAnd more words")
  await tick()
  expect(document.querySelector(".chat-code")).toBe(block)
  expect(block.hasAttribute("data-wrap")).toBe(true)
  expect(document.querySelector(".chat-response")!.textContent).toContain("And more words")
})

test("footnotes link within their own answer", async () => {
  const note = "A claim.[^1]\n\n[^1]: The source."
  const { container } = render(() => (
    <>
      <ChatResponse>{note}</ChatResponse>
      <ChatResponse>{note}</ChatResponse>
    </>
  ))
  await tick()
  const ids = [...container.querySelectorAll("[id]")].map((el) => el.id)
  expect(new Set(ids).size).toBe(ids.length)
  const refs = container.querySelectorAll<HTMLAnchorElement>("a[data-footnote-ref]")
  expect(refs).toHaveLength(2)
  expect(container.querySelectorAll("section[data-footnotes]")).toHaveLength(2)
  for (const ref of refs) {
    const target = ref.getAttribute("href")!.slice(1)
    expect(ref.closest(".chat-response")!.querySelector(`[id="${target}"]`)).toBeTruthy()
    const heading = ref.closest(".chat-response")!.querySelector(`[id="${ref.getAttribute("aria-describedby")}"]`)
    expect(heading?.textContent).toBe("Footnotes")
    // Heard, not seen: the page's own hidden-text class, not one UISet doesn't style.
    expect(heading?.className).toBe("chat-visually-hidden")
  }
  // Each note's "↩" goes back to its own reference, and says so.
  const backs = container.querySelectorAll<HTMLAnchorElement>("a[data-footnote-backref]")
  expect(backs).toHaveLength(2)
  for (const back of backs) {
    expect(back.closest(".chat-response")!.querySelector(`[id="${back.getAttribute("href")!.slice(1)}"]`)?.hasAttribute("data-footnote-ref")).toBe(true)
    expect(back.getAttribute("aria-label")).toBe("Back to reference 1")
  }
})

test("a task list's boxes show what's done, and can't be ticked in an answer", async () => {
  render(() => <ChatResponse>{"- [x] done\n- [ ] todo"}</ChatResponse>)
  await tick()
  const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[]
  expect(boxes.map((box) => box.checked)).toEqual([true, false])
  expect(boxes.every((box) => box.disabled)).toBe(true)
})

test("fenced code becomes a code block with its language and a copy button", async () => {
  const writeText = mockClipboard()
  render(() => <ChatResponse>{"```ts\nconst a = 1\n```"}</ChatResponse>)
  await tick()
  expect(screen.getByText("ts")).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Copy ts" }))
  expect(writeText).toHaveBeenCalledWith("const a = 1")
  await userEvent.click(screen.getByRole("button", { name: "Wrap lines" }))
  expect(document.querySelector(".chat-code")?.hasAttribute("data-wrap")).toBe(true)
})

test("new code in a block shows at once, never in the colors of the code before it", async () => {
  const [code, setCode] = createSignal("const a = 1")
  render(() => <ChatCodeBlock code={code()} language="ts" />)
  const region = () => screen.getByRole("region", { name: "ts" })
  await waitFor(() => expect(region().querySelector("span[style]")).toBeTruthy(), { timeout: 4000 })
  setCode("let b = 2")
  flush()
  expect(region().textContent).toBe("let b = 2")
  await waitFor(() => expect(region().querySelector("span[style]")?.textContent).toBe("let"), { timeout: 4000 })
})

test("a code block without a language still shows the code", async () => {
  render(() => <ChatCodeBlock code="plain text" />)
  await tick()
  expect(screen.getByRole("region", { name: "Code" }).textContent).toBe("plain text")
})

function Composer(props: Partial<ComponentProps<typeof ChatComposer>>) {
  return <ChatComposer onSubmit={() => {}} {...props} />
}

test("Enter sends and clears; Shift+Enter keeps writing", async () => {
  const onSubmit = vi.fn()
  render(() => <Composer onSubmit={onSubmit} />)
  await tick()
  const box = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement
  expect(screen.getByRole("button", { name: "Send" }).hasAttribute("disabled")).toBe(true)
  await userEvent.type(box, "Hello{Shift>}{Enter}{/Shift}there")
  expect(onSubmit).not.toHaveBeenCalled()
  await userEvent.type(box, "{Enter}")
  expect(onSubmit).toHaveBeenCalledWith({ text: "Hello\nthere", files: [] })
  expect(box.value).toBe("")
})

test("ArrowUp brings back what was sent", async () => {
  render(() => <Composer />)
  await tick()
  const box = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement
  await userEvent.type(box, "first{Enter}")
  await userEvent.type(box, "{ArrowUp}")
  expect(box.value).toBe("first")
})

test("while running, Stop replaces Send; with a queue, Queue does, and takes what's written", async () => {
  const onStop = vi.fn()
  const onQueue = vi.fn()
  const [queue, setQueue] = createSignal(false)
  render(() => <Composer running onStop={onStop} onQueue={queue() ? onQueue : undefined} />)
  await tick()
  await userEvent.click(screen.getByRole("button", { name: "Stop" }))
  expect(onStop).toHaveBeenCalled()
  expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
  setQueue(true)
  await tick()
  expect(screen.getByRole("button", { name: "Queue" })).toBeTruthy()
  await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "and then{Enter}")
  expect(onQueue).toHaveBeenCalledWith({ text: "and then", files: [] })
})

test("attached files go with the message and can be removed", async () => {
  const onSubmit = vi.fn()
  render(() => <Composer onSubmit={onSubmit} attachments={{ maxFiles: 3 }} />)
  await tick()
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  const file = new File(["hello"], "notes.txt", { type: "text/plain" })
  await userEvent.setup({ pointerEventsCheck: 0 }).upload(input, file)
  expect(await screen.findByText("notes.txt")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Send" }).hasAttribute("disabled")).toBe(false)
  await userEvent.click(screen.getByRole("button", { name: "Send" }))
  expect(onSubmit.mock.calls[0]?.[0].files).toHaveLength(1)
  await waitFor(() => expect(screen.queryByText("notes.txt")).toBeNull())
})

test("usage reads out as words", async () => {
  render(() => <ChatUsage used={18400} limit={200000} />)
  await tick()
  const meter = screen.getByRole("meter", { name: "Context used" })
  expect(meter.getAttribute("aria-valuetext")).toBe("18.4K of 200K tokens")
  expect(meter.getAttribute("data-level")).toBeNull()
})

test("reasoning opens while streaming and closes when done, unless the person chose", async () => {
  const [streaming, setStreaming] = createSignal(true)
  render(() => (
    <ChatReasoning streaming={streaming()} seconds={3}>
      Thinking it through
    </ChatReasoning>
  ))
  await tick()
  expect(screen.getByRole("button", { name: "Thinking…" }).getAttribute("aria-expanded")).toBe("true")
  setStreaming(false)
  await tick()
  const trigger = screen.getByRole("button", { name: "Thought for 3s" })
  expect(trigger.getAttribute("aria-expanded")).toBe("false")
  await userEvent.click(trigger)
  expect(trigger.getAttribute("aria-expanded")).toBe("true")
})

test("reasoning someone is reading stays open when the model finishes", async () => {
  const [streaming, setStreaming] = createSignal(true)
  render(() => (
    <ChatReasoning streaming={streaming()} seconds={2}>
      Long thought
    </ChatReasoning>
  ))
  await tick()
  const trigger = screen.getByRole("button", { name: "Thinking…" })
  await userEvent.click(trigger)
  await userEvent.click(trigger)
  expect(trigger.getAttribute("aria-expanded")).toBe("true")
  setStreaming(false)
  await tick()
  expect(screen.getByRole("button", { name: "Thought for 2s" }).getAttribute("aria-expanded")).toBe("true")
})

test("a tool call says its status in words and opens itself on errors", async () => {
  render(() => <ChatTool name="search_docs" status="error" input={{ q: "x" }} error="Timed out after 10s" />)
  await tick()
  expect(screen.getByText("Failed")).toBeTruthy()
  expect(screen.getByText("Timed out after 10s")).toBeTruthy()
  expect(screen.getByRole("region", { name: "search_docs input" }).textContent).toContain('"q": "x"')
})

test("a tool waiting for approval asks with Deny and Allow", async () => {
  const onApprove = vi.fn()
  render(() => <ChatTool name="deploy" title="Deploy preview" status="approval" input={{ branch: "fix" }} onApprove={onApprove} />)
  await tick()
  expect(screen.getByText("Needs your approval")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Allow" }).getAttribute("data-agent-confirm")).toBe("Runs Deploy preview")
  await userEvent.click(screen.getByRole("button", { name: "Deny" }))
  expect(onApprove).toHaveBeenCalledWith(false)
})

test("sources count themselves", async () => {
  render(() => (
    <ChatSources
      sources={[
        { href: "https://a.dev/x", title: "A" },
        { href: "https://b.dev/y", title: "B" },
      ]}
    />
  ))
  await tick()
  expect(screen.getByRole("button", { name: "Used 2 sources" })).toBeTruthy()
})

test("a citation is a link to its source, named with its number and title", async () => {
  render(() => <ChatCitation index={2} source={{ href: "https://b.dev/y", title: "B", description: "About B" }} />)
  await tick()
  const link = screen.getByRole("link", { name: "Source 2: B" })
  expect(link.getAttribute("href")).toBe("https://b.dev/y")
  expect(link.getAttribute("rel")).toBe("noopener noreferrer")
  expect(link.textContent).toBe("2")
})

test("message parts hold their sources until the answer is done, and link only to files the page holds", async () => {
  const [parts, setParts] = createSignal<ChatMessagePart[]>([
    { type: "text", text: "Looking", state: "streaming" },
    { type: "source-url", url: "https://a.dev/x", title: "A" },
    { type: "file", mediaType: "application/pdf", url: "https://evil.example/f.pdf", filename: "report.pdf" },
    { type: "file", mediaType: "text/plain", url: "data:text/plain,hi", filename: "note.txt" },
  ])
  render(() => <ChatMessageParts parts={parts()} />)
  await tick()
  expect(screen.queryByRole("button", { name: "Used 1 source" })).toBeNull()
  // A file somewhere else is its name only; one the page holds can be saved.
  expect(screen.queryByRole("link", { name: "report.pdf" })).toBeNull()
  expect(screen.getByText("report.pdf")).toBeTruthy()
  expect(screen.getByRole("link", { name: "note.txt" }).getAttribute("download")).toBe("note.txt")
  setParts((all) => [{ type: "text", text: "Found it", state: "done" }, ...all.slice(1)])
  await tick()
  expect(screen.getByRole("button", { name: "Used 1 source" })).toBeTruthy()
})

test("message actions copy the text and record feedback", async () => {
  const writeText = mockClipboard()
  const onFeedbackChange = vi.fn()
  render(() => <ChatMessageActions text="The answer" feedback={null} onFeedbackChange={onFeedbackChange} />)
  await tick()
  await userEvent.click(screen.getByRole("button", { name: 'Copy message: "The answer"' }))
  expect(writeText).toHaveBeenCalledWith("The answer")
  await userEvent.click(screen.getByRole("button", { name: 'Good response: "The answer"' }))
  expect(onFeedbackChange).toHaveBeenCalledWith("good")
  await userEvent.click(screen.getByRole("button", { name: 'Bad response: "The answer"' }))
  expect(onFeedbackChange).toHaveBeenLastCalledWith("bad")
})

test("feedback a page holds follows each press, either way and back to none", async () => {
  const [feedback, setFeedback] = createSignal<"good" | "bad" | null>(null)
  const reported = vi.fn()
  render(() => <ChatMessageActions text="The answer" feedback={feedback()} onFeedbackChange={(next) => (reported(next), setFeedback(next))} />)
  await tick()
  const good = screen.getByRole("button", { name: 'Good response: "The answer"' })
  const bad = screen.getByRole("button", { name: 'Bad response: "The answer"' })
  await userEvent.click(good)
  await tick()
  expect(feedback()).toBe("good")
  expect(good.getAttribute("aria-pressed")).toBe("true")
  await userEvent.click(bad)
  await tick()
  expect(feedback()).toBe("bad")
  expect([good.getAttribute("aria-pressed"), bad.getAttribute("aria-pressed")]).toEqual(["false", "true"])
  await userEvent.click(bad)
  await tick()
  expect(feedback()).toBeNull()
  // A change the page makes itself shows too, and isn't reported back to it.
  expect(reported).toHaveBeenCalledTimes(3)
  setFeedback("good")
  await tick()
  expect([good.getAttribute("aria-pressed"), bad.getAttribute("aria-pressed")]).toEqual(["true", "false"])
  expect(reported).toHaveBeenCalledTimes(3)
  setFeedback(null)
  await tick()
  expect(good.getAttribute("aria-pressed")).toBe("false")
})

// Every message has the same actions, so each one's names carry its message's first words: an
// agent pressing "Copy message" can tell which reply it copies.
test("each message's actions are named with its first words, from its text or from the message shown", async () => {
  const summary = "Here's a summary of the release, in three parts."
  render(() => (
    <ChatThread label="Conversation">
      <ChatMessage from="user" actions={<ChatMessageActions onEdit={() => {}} />}>
        Can you summarize the <strong>release notes</strong> for me?
      </ChatMessage>
      <ChatMessage from="assistant" actions={<ChatMessageActions text={summary} onRetry={() => {}} />}>
        {summary}
      </ChatMessage>
      <ChatMessage from="assistant" actions={<ChatMessageActions text="Done." onFeedbackChange={() => {}} />}>
        Done.
      </ChatMessage>
    </ChatThread>
  ))
  await tick()
  const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))
  expect(names).toEqual([
    'Edit message: "Can you summarize the release…"',
    `Copy message: "Here's a summary of the…"`,
    `Retry message: "Here's a summary of the…"`,
    'Copy message: "Done."',
    'Good response: "Done."',
    'Bad response: "Done."',
  ])
})

test("actions named from the message shown follow its words as they change", async () => {
  const [words, setWords] = createSignal("Draft one")
  render(() => (
    <ChatMessage from="user" actions={<ChatMessageActions onEdit={() => {}} />}>
      {words()}
    </ChatMessage>
  ))
  await tick()
  expect(screen.getByRole("button", { name: 'Edit message: "Draft one"' })).toBeTruthy()
  setWords("Draft two")
  await tick()
  expect(screen.getByRole("button", { name: 'Edit message: "Draft two"' })).toBeTruthy()
})

// With two replies and a composer named "Message", each reply's toolbar and feedback group
// need names of their own too, or a step by one finds the other (or the composer).
test("a conversation with several replies passes the agent check, composer included", async () => {
  render(() => (
    <>
      <ChatThread label="Conversation">
        <ChatMessage from="user" actions={<ChatMessageActions onEdit={() => {}} />}>
          How do I cancel a fetch?
        </ChatMessage>
        <ChatMessage from="assistant" actions={<ChatMessageActions text="Use an AbortController." onFeedbackChange={() => {}} />}>
          Use an AbortController.
        </ChatMessage>
        <ChatMessage from="assistant" actions={<ChatMessageActions text="Pass its signal to fetch." onRetry={() => {}} onFeedbackChange={() => {}} />}>
          Pass its signal to fetch.
        </ChatMessage>
      </ChatThread>
      <ChatComposer label="Message" onSubmit={() => {}} />
    </>
  ))
  await settle()
  expect(screen.getAllByRole("toolbar").map((toolbar) => toolbar.getAttribute("aria-label"))).toEqual([
    'Actions: "How do I cancel a…"',
    'Actions: "Use an AbortController."',
    'Actions: "Pass its signal to fetch."',
  ])
  expect(screen.getAllByRole("group").map((group) => group.getAttribute("aria-label"))).toContain('Feedback: "Use an AbortController."')
  const report = await expectAgentReady(createAgent())
  expect(report.score).toBe(100)
})

test("versions step back and forward and stop at the ends", async () => {
  const [index, setIndex] = createSignal(0)
  render(() => <ChatBranch index={index()} count={3} onIndexChange={setIndex} />)
  await tick()
  expect(screen.getByRole("button", { name: "Previous version" }).hasAttribute("disabled")).toBe(true)
  await userEvent.click(screen.getByRole("button", { name: "Next version" }))
  expect(screen.getByText("2 of 3")).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Next version" }))
  expect(screen.getByRole("button", { name: "Next version" }).hasAttribute("disabled")).toBe(true)
})

test("one version has no versions to step through, and a suggestion sends itself", async () => {
  const onSelect = vi.fn()
  render(() => (
    <>
      <ChatBranch index={0} count={1} onIndexChange={() => {}} />
      <ChatSuggestions suggestions={["Draft release notes"]} onSelect={onSelect} />
    </>
  ))
  await tick()
  expect(screen.queryByRole("group", { name: "Versions" })).toBeNull()
  await userEvent.click(screen.getByRole("button", { name: "Draft release notes" }))
  expect(onSelect).toHaveBeenCalledWith("Draft release notes")
})

test("tasks summarize how many are done", async () => {
  render(() => (
    <ChatTasks
      tasks={[
        { id: "1", title: "A", status: "done" },
        { id: "2", title: "B", status: "running" },
        { id: "3", title: "C", status: "running" },
      ]}
    />
  ))
  await tick()
  expect(screen.getByText("1 of 3 done")).toBeTruthy()
  expect(screen.getAllByText("In progress")).toHaveLength(2)
})

test("a message says who wrote it, and is busy while it streams", async () => {
  const [streaming, setStreaming] = createSignal(true)
  render(() => (
    <>
      <ChatMessage from="user">Hi</ChatMessage>
      <ChatMessage from="assistant" avatar={{ fallback: "AI" }} streaming={streaming()}>
        Hello
      </ChatMessage>
    </>
  ))
  await tick()
  const [mine, theirs] = document.querySelectorAll(".chat-message")
  expect(mine!.querySelector(".chat-message-name")!.textContent).toBe("You")
  expect(screen.getByRole("img", { name: "Assistant" })).toBeTruthy()
  expect(theirs!.getAttribute("aria-busy")).toBe("true")
  setStreaming(false)
  await tick()
  expect(theirs!.hasAttribute("aria-busy")).toBe(false)
})

test("a thread names itself for screen readers and agents", async () => {
  const agent = createAgent()
  render(() => (
    <ChatThread>
      <ChatMessage from="assistant" name="Assistant">
        Hi
      </ChatMessage>
    </ChatThread>
  ))
  await tick()
  expect(screen.getByRole("region", { name: "Conversation" })).toBeTruthy()
  expect(screen.getByRole("log")).toBeTruthy()
  expect(document.querySelector(".chat-message-name")?.textContent).toBe("Assistant")
  expect(agent.snapshot().every((entry) => entry.label)).toBe(true)
})

test("chats can be renamed from their menu, and deleting asks first", async () => {
  const onRename = vi.fn()
  const onDelete = vi.fn()
  render(() => <ChatThreadList threads={[{ id: "a", title: "Launch plan" }]} value="a" onValueChange={() => {}} onRename={onRename} onDelete={onDelete} />)
  await tick()
  expect(screen.getByRole("button", { name: "Open Launch plan" }).getAttribute("aria-current")).toBe("page")
  await userEvent.click(screen.getByRole("button", { name: "More for Launch plan" }))
  await userEvent.click(await screen.findByRole("menuitem", { name: "Rename" }))
  const field = await screen.findByRole("textbox", { name: "Rename Launch plan" })
  await waitFor(() => expect(document.activeElement).toBe(field))
  await userEvent.clear(field)
  await userEvent.type(field, "Launch v2{Enter}")
  // A browser that blurs a field as it goes doesn't rename a second time.
  fireEvent.blur(field)
  expect(onRename).toHaveBeenCalledTimes(1)
  expect(onRename).toHaveBeenCalledWith("a", "Launch v2")
  // Finished with Enter, focus is back on the chat.
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open Launch plan" })))

  await userEvent.click(screen.getByRole("button", { name: "More for Launch plan" }))
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))
  expect(await screen.findByRole("alertdialog", { name: "Delete “Launch plan”?" })).toBeTruthy()
  expect(onDelete).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole("button", { name: "Delete chat" }))
  expect(onDelete).toHaveBeenCalledWith("a")
})

test("the launcher stays open while you click the page, and Escape closes it", async () => {
  render(() => (
    <>
      <button>Page button</button>
      <ChatLauncher title="Assistant">
        <p>Inside</p>
      </ChatLauncher>
    </>
  ))
  await tick()
  await userEvent.click(screen.getByRole("button", { name: "Open assistant" }))
  expect(await screen.findByText("Inside")).toBeTruthy()
  expect(screen.getAllByRole("button", { name: "Close Assistant" }).length).toBeGreaterThan(0)
  fireEvent.pointerDown(screen.getByRole("button", { name: "Page button" }))
  await userEvent.click(screen.getByRole("button", { name: "Page button" }))
  await tick()
  expect(screen.getByText("Inside")).toBeTruthy()
  await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByText("Inside")).toBeNull())
})
