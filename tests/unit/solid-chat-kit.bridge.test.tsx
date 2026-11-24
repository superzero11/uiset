import { render, screen, waitFor } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { elementOf } from "@ui-sdk/solid/observe"
import { beforeEach, expect, test, vi } from "vitest"
import { UISet } from "@/solid/src/uiset"
import { ChatDemo } from "@/solid/demo/kits/chat-demo"
import { createSolidBridge as createBridge, settle } from "./solid-bridge"

// The chat kit's demo in Solid (solid/demo/kits/chat-demo.tsx), driven through the agent
// bridge with React's assertions (tests/unit/chat-kit.bridge.test.tsx): an agent's turn drawn
// from AI SDK parts, a tool waiting for approval, a checkpoint to go back to, messages queued
// while an answer runs, and the composer's stream. What a person writes is typed in.

// The demo streams in real time: seconds per answer, more on a busy machine.
vi.setConfig({ testTimeout: 45_000 })

const bridge = createBridge()
/** What an agent finds by this name on the page now (earlier tests' parts stay listed as off the page). */
const onPage = (label: string | RegExp) =>
  bridge.agent.snapshot().find((e) => !e.offPage && (typeof label === "string" ? e.label === label : label.test(e.label ?? "")))
/** The same, inside one element: the demo's earlier turns have parts of the same names. */
const inside = (root: Element, label: RegExp) => bridge.agent.snapshot().find((e) => !e.offPage && label.test(e.label ?? "") && root.contains(elementOf(e.ref) ?? null))
const box = () => screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement
const write = (text: string) => userEvent.type(box(), text)
const pr = () => [...document.querySelectorAll(".chat-tool")].find((tool) => tool.textContent?.includes("Open a pull request"))
const thread = () => screen.getByRole("region", { name: "Conversation" }).textContent
const queue = () => screen.queryByRole("region", { name: "Queued messages" })
const lastFrom = (from: "user" | "assistant") => [...document.querySelectorAll(`.chat-message[data-from=${from}]`)].at(-1)

beforeEach(async () => {
  bridge.asked.length = 0
  render(() => (
    <UISet>
      <ChatDemo />
    </UISet>
  ))
  await settle()
  expect(pr()?.getAttribute("data-status")).toBe("approval")
})

test("the agent's pull request runs once allowed, and an agent must ask a person first", async () => {
  expect(onPage(/^Tester\s*, Type fast on a slow network\s*, Done in 9s$/)).toBeDefined()
  expect(bridge.entry("Allow").confirm).toBe("Runs Open a pull request")
  expect((await bridge.pressUnattended("Allow")).ok).toBe(false)
  expect(pr()?.getAttribute("data-status")).toBe("approval")
  expect((await bridge.press("Allow")).ok).toBe(true)
  expect(bridge.asked).toEqual(["Runs Open a pull request"])
  await waitFor(() => expect(pr()?.getAttribute("data-status")).toBe("done"), { timeout: 5000 })
  expect(thread()).toContain("Opened pull request #482")
})

test("denied, it says so; Restore puts the turn back to the checkpoint, waiting again", async () => {
  await bridge.press("Deny")
  expect(pr()?.getAttribute("data-status")).toBe("denied")
  expect(thread()).toContain("Okay, I won't open it.")
  expect(bridge.entry(/^Restore Before the rollout/).confirm).toBe("Puts the conversation back to this checkpoint")
  await bridge.press(/^Restore Before the rollout/)
  expect(bridge.asked).toEqual(["Puts the conversation back to this checkpoint"])
  expect(pr()?.getAttribute("data-status")).toBe("approval")
  expect(thread()).not.toContain("Okay, I won't open it.")
})

test("what's written while an answer runs is queued, and sent when it's done", async () => {
  await write("Add a test for the abort{Enter}")
  await waitFor(() => expect(onPage("Stop")).toBeDefined())
  await write("Then update the changelog")
  await bridge.press("Queue")
  expect(queue()?.textContent).toContain("1 queued")
  expect(queue()?.textContent).toContain("Then update the changelog")
  // The first answer finishes, then the queued message goes on its own.
  await waitFor(() => expect(queue()).toBeNull(), { timeout: 20_000 })
  expect(lastFrom("user")?.textContent).toContain("Then update the changelog")
})

test("Stop holds the queue; Send now sends the first", async () => {
  await write("Add a test for the abort{Enter}")
  await write("Then update the changelog{Enter}")
  expect(queue()?.textContent).toContain("1 queued")
  await bridge.press("Stop")
  await waitFor(() => expect(onPage("Send")).toBeDefined())
  await settle(300)
  expect(queue()?.textContent).toContain("1 queued")
  await bridge.press("Send now: Then update the changelog")
  await waitFor(() => expect(queue()).toBeNull())
  expect(lastFrom("user")?.textContent).toContain("Then update the changelog")
})

test("a message streams a reply with reasoning, a tool call and markdown", async () => {
  await write("How do I cancel a fetch?{Enter}")
  await waitFor(() => expect(onPage("Stop")).toBeDefined())
  await waitFor(() => expect(lastFrom("assistant")?.textContent).toContain("This is a simulated assistant"), { timeout: 10_000 })
  const reply = lastFrom("assistant")!
  expect(inside(reply, /Thought for/)).toBeDefined()
  expect(inside(reply, /Searched the docs/)?.label).toContain("Done")
  // The reply keeps streaming after the tool call; Send comes back when it ends.
  await waitFor(() => expect(onPage("Send")).toBeDefined(), { timeout: 20_000 })
  expect(box().value).toBe("")
})

test("a new chat starts empty with suggestions, and chats can be renamed", async () => {
  await bridge.press("New chat")
  expect(screen.getByText("What are we working on?")).toBeTruthy()
  expect(onPage("Suggestions")?.buttons).toContain("Explain AbortController")
  await bridge.press("More for Launch checklist", "Rename")
  await waitFor(() => expect(onPage("Rename Launch checklist")).toBeDefined())
  await userEvent.type(screen.getByRole("textbox", { name: "Rename Launch checklist" }), "{Control>}a{/Control}Launch plan v2{Enter}")
  await waitFor(() => expect(onPage("Open Launch plan v2")).toBeDefined())
})

test("the model picker and usage meter are named for everyone", async () => {
  expect(onPage("Model")?.value).toBe("balanced")
  expect(screen.getByRole("combobox", { name: "Model" }).textContent).toMatch(/Balanced/)
  expect(onPage("Context used")?.component).toBe("meter")
  expect(screen.getByRole("meter", { name: "Context used" }).getAttribute("aria-valuetext")).toMatch(/of 200K tokens/)
})

test("feedback on an answer follows each press, and changing the version keeps it", async () => {
  const good = () => screen.getByRole("button", { name: /^Good response: "Debounce the value/ })
  const bad = () => screen.getByRole("button", { name: /^Bad response: "Debounce the value/ })
  await userEvent.click(good())
  await settle()
  expect(good().getAttribute("aria-pressed")).toBe("true")
  await userEvent.click(bad())
  await settle()
  expect([good().getAttribute("aria-pressed"), bad().getAttribute("aria-pressed")]).toEqual(["false", "true"])
  await userEvent.click(screen.getByRole("button", { name: "Previous version" }))
  await settle()
  expect(screen.getByText("1 of 2")).toBeTruthy()
  expect(screen.getByRole("button", { name: /^Bad response: "Use useDeferredValue/ }).getAttribute("aria-pressed")).toBe("true")
})

test("feedback pressed while another answer streams takes, with nothing said on the console", async () => {
  await userEvent.click(screen.getByRole("button", { name: /^Retry message: "Debounce the value/ }))
  await waitFor(() => expect(onPage("Stop")).toBeDefined())
  for (const name of [/^Bad response: "Debounce the value/, /^Good response: "Debounce the value/, /^Bad response: "Debounce the value/]) {
    await userEvent.click(screen.getByRole("button", { name }))
    await settle(30)
  }
  expect(screen.getByRole("button", { name: /^Bad response: "Debounce the value/ }).getAttribute("aria-pressed")).toBe("true")
  await waitFor(() => expect(onPage("Send")).toBeDefined(), { timeout: 20_000 })
})
