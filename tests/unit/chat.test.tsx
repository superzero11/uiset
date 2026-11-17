import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import {
  ChatBranch,
  ChatMessage,
  ChatMessageActions,
  ChatTasks,
  ChatThread,
} from "@/registry/uiset/ui/chat"
import { ChatComposer, ChatUsage } from "@/registry/uiset/ui/chat-composer"
import { ChatReasoning, ChatSources, ChatTool } from "@/registry/uiset/ui/chat-parts"
import { ChatCodeBlock, ChatResponse } from "@/registry/uiset/ui/chat-response"
import { ChatLauncher, ChatThreadList } from "@/registry/uiset/ui/chat-sidebar"

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

function mockClipboard() {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

test("markdown renders, and raw HTML from a model is never rendered", () => {
  const { container } = render(
    <ChatResponse>
      {
        '**Bold** and [a link](https://example.com).\n\n<img src=x onerror="alert(1)">\n\n- one\n- two'
      }
    </ChatResponse>,
  )
  expect(container.querySelector("strong")?.textContent).toBe("Bold")
  const link = screen.getByRole("link", { name: /a link/ })
  expect(link.getAttribute("rel")).toBe("noopener noreferrer")
  expect(link.getAttribute("target")).toBe("_blank")
  expect(container.querySelector("img")).toBeNull()
  expect(container.querySelectorAll("li")).toHaveLength(2)
})

test("half-finished markdown is repaired while it streams", () => {
  const { container } = render(<ChatResponse streaming>{"Use **useDeferr"}</ChatResponse>)
  expect(container.querySelector("strong")?.textContent).toBe("useDeferr")
  expect(container.textContent).not.toContain("**")
})

test("fenced code becomes a code block with its language and a copy button", async () => {
  const writeText = mockClipboard()
  render(<ChatResponse>{"```ts\nconst a = 1\n```"}</ChatResponse>)
  expect(screen.getByText("ts")).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Copy ts" }))
  expect(writeText).toHaveBeenCalledWith("const a = 1")
  await userEvent.click(screen.getByRole("button", { name: "Wrap lines" }))
  expect(document.querySelector(".chat-code")?.hasAttribute("data-wrap")).toBe(true)
})

test("a code block without a language still shows the code", () => {
  render(<ChatCodeBlock code="plain text" />)
  expect(screen.getByRole("region", { name: "Code" }).textContent).toBe("plain text")
})

function Composer(props: Partial<Parameters<typeof ChatComposer>[0]>) {
  return <ChatComposer onSubmit={() => {}} {...props} />
}

test("Enter sends and clears; Shift+Enter keeps writing", async () => {
  const onSubmit = vi.fn()
  render(<Composer onSubmit={onSubmit} />)
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
  render(<Composer />)
  await tick()
  const box = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement
  await userEvent.type(box, "first{Enter}")
  await userEvent.type(box, "{ArrowUp}")
  expect(box.value).toBe("first")
})

test("while running, Stop replaces Send", async () => {
  const onStop = vi.fn()
  render(<Composer running onStop={onStop} />)
  await userEvent.click(screen.getByRole("button", { name: "Stop" }))
  expect(onStop).toHaveBeenCalled()
  expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
})

test("attached files go with the message and can be removed", async () => {
  const onSubmit = vi.fn()
  render(<Composer onSubmit={onSubmit} attachments={{ maxFiles: 3 }} />)
  await tick()
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  const file = new File(["hello"], "notes.txt", { type: "text/plain" })
  await userEvent.setup({ pointerEventsCheck: 0 }).upload(input, file)
  expect(await screen.findByText("notes.txt")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Send" }).hasAttribute("disabled")).toBe(
    false,
  )
  await userEvent.click(screen.getByRole("button", { name: "Send" }))
  expect(onSubmit.mock.calls[0]?.[0].files).toHaveLength(1)
  await waitFor(() => expect(screen.queryByText("notes.txt")).toBeNull())
})

test("usage reads out as words", () => {
  render(<ChatUsage used={18400} limit={200000} />)
  const meter = screen.getByRole("meter", { name: "Context used" })
  expect(meter.getAttribute("aria-valuetext")).toBe("18.4K of 200K tokens")
})

test("reasoning opens while streaming and closes when done, unless the person chose", async () => {
  function Demo() {
    const [streaming, setStreaming] = useState(true)
    return (
      <>
        <ChatReasoning streaming={streaming} seconds={3}>
          Thinking it through
        </ChatReasoning>
        <button onClick={() => setStreaming(false)}>finish</button>
      </>
    )
  }
  render(<Demo />)
  await tick()
  expect(
    screen.getByRole("button", { name: "Thinking…" }).getAttribute("aria-expanded"),
  ).toBe("true")
  await userEvent.click(screen.getByRole("button", { name: "finish" }))
  const trigger = screen.getByRole("button", { name: "Thought for 3s" })
  expect(trigger.getAttribute("aria-expanded")).toBe("false")
  await userEvent.click(trigger)
  expect(trigger.getAttribute("aria-expanded")).toBe("true")
})

test("reasoning someone is reading stays open when the model finishes", async () => {
  function Demo() {
    const [streaming, setStreaming] = useState(true)
    return (
      <>
        <ChatReasoning streaming={streaming} seconds={2}>
          Long thought
        </ChatReasoning>
        <button onClick={() => setStreaming(false)}>finish</button>
      </>
    )
  }
  render(<Demo />)
  await tick()
  const trigger = screen.getByRole("button", { name: "Thinking…" })
  await userEvent.click(trigger)
  await userEvent.click(trigger)
  expect(trigger.getAttribute("aria-expanded")).toBe("true")
  await userEvent.click(screen.getByRole("button", { name: "finish" }))
  expect(
    screen.getByRole("button", { name: "Thought for 2s" }).getAttribute("aria-expanded"),
  ).toBe("true")
})

test("a tool call says its status in words and opens itself on errors", async () => {
  render(
    <ChatTool
      name="search_docs"
      status="error"
      input={{ q: "x" }}
      error="Timed out after 10s"
    />,
  )
  await tick()
  expect(screen.getByText("Failed")).toBeTruthy()
  expect(screen.getByText("Timed out after 10s")).toBeTruthy()
})

test("sources count themselves", () => {
  render(
    <ChatSources
      sources={[
        { href: "https://a.dev/x", title: "A" },
        { href: "https://b.dev/y", title: "B" },
      ]}
    />,
  )
  expect(screen.getByRole("button", { name: "Used 2 sources" })).toBeTruthy()
})

test("message actions copy the text and record feedback", async () => {
  const writeText = mockClipboard()
  const onFeedbackChange = vi.fn()
  render(
    <ChatMessageActions
      text="The answer"
      feedback={null}
      onFeedbackChange={onFeedbackChange}
    />,
  )
  await tick()
  await userEvent.click(screen.getByRole("button", { name: 'Copy message: "The answer"' }))
  expect(writeText).toHaveBeenCalledWith("The answer")
  await userEvent.click(screen.getByRole("button", { name: 'Good response: "The answer"' }))
  expect(onFeedbackChange).toHaveBeenCalledWith("good")
})

// Every message has the same actions, so each one's names carry its message's first words: an
// agent pressing "Copy message" can tell which reply it copies.
test("each message's actions are named with its first words, from its text or from the message shown", async () => {
  const summary = "Here's a summary of the release, in three parts."
  render(
    <ChatThread label="Conversation">
      <ChatMessage from="user" actions={<ChatMessageActions onEdit={() => {}} />}>
        Can you summarize the **release notes** for me?
      </ChatMessage>
      <ChatMessage from="assistant" actions={<ChatMessageActions text={summary} onRetry={() => {}} />}>
        {summary}
      </ChatMessage>
      <ChatMessage from="assistant" actions={<ChatMessageActions text="Done." onFeedbackChange={() => {}} />}>
        Done.
      </ChatMessage>
    </ChatThread>,
  )
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

test("versions step back and forward and stop at the ends", async () => {
  function Demo() {
    const [index, setIndex] = useState(0)
    return <ChatBranch index={index} count={3} onIndexChange={setIndex} />
  }
  render(<Demo />)
  expect(
    screen.getByRole("button", { name: "Previous version" }).hasAttribute("disabled"),
  ).toBe(true)
  await userEvent.click(screen.getByRole("button", { name: "Next version" }))
  expect(screen.getByText("2 of 3")).toBeTruthy()
})

test("tasks summarize how many are done", () => {
  render(
    <ChatTasks
      tasks={[
        { id: "1", title: "A", status: "done" },
        { id: "2", title: "B", status: "running" },
      ]}
    />,
  )
  expect(screen.getByText("1 of 2 done")).toBeTruthy()
  expect(screen.getByText("In progress")).toBeTruthy()
})

test("a thread names itself for screen readers and agents", async () => {
  const agent = createAgent()
  render(
    <ChatThread>
      <ChatMessage from="assistant" name="Assistant">
        Hi
      </ChatMessage>
    </ChatThread>,
  )
  await tick()
  expect(screen.getByRole("region", { name: "Conversation" })).toBeTruthy()
  expect(screen.getByRole("log")).toBeTruthy()
  expect(agent.snapshot().every((entry) => entry.label)).toBe(true)
})

test("chats can be renamed from their menu, and deleting asks first", async () => {
  const onRename = vi.fn()
  const onDelete = vi.fn()
  render(
    <ChatThreadList
      threads={[{ id: "a", title: "Launch plan" }]}
      value="a"
      onValueChange={() => {}}
      onRename={onRename}
      onDelete={onDelete}
    />,
  )
  await tick()
  await userEvent.click(screen.getByRole("button", { name: "More for Launch plan" }))
  await userEvent.click(await screen.findByRole("menuitem", { name: "Rename" }))
  const field = await screen.findByRole("textbox", { name: "Rename Launch plan" })
  await userEvent.clear(field)
  await userEvent.type(field, "Launch v2{Enter}")
  expect(onRename).toHaveBeenCalledWith("a", "Launch v2")

  await userEvent.click(screen.getByRole("button", { name: "More for Launch plan" }))
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))
  expect(
    await screen.findByRole("alertdialog", { name: "Delete “Launch plan”?" }),
  ).toBeTruthy()
  expect(onDelete).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole("button", { name: "Delete chat" }))
  expect(onDelete).toHaveBeenCalledWith("a")
})

test("the launcher stays open while you click the page, and Escape closes it", async () => {
  render(
    <>
      <button>Page button</button>
      <ChatLauncher title="Assistant">
        <p>Inside</p>
      </ChatLauncher>
    </>,
  )
  await tick()
  await userEvent.click(screen.getByRole("button", { name: "Open assistant" }))
  expect(await screen.findByText("Inside")).toBeTruthy()
  fireEvent.pointerDown(screen.getByRole("button", { name: "Page button" }))
  await userEvent.click(screen.getByRole("button", { name: "Page button" }))
  await tick()
  expect(screen.getByText("Inside")).toBeTruthy()
  await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByText("Inside")).toBeNull())
})
