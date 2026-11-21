import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, test, vi } from "vitest"
import { ChatAppTemplate } from "@/registry/uiset/ui/templates/chat-app"
import { UISet } from "@/registry/uiset/ui/uiset"
import { createBridge, settle } from "./bridge"

// The chat-app template as an agent (registry/uiset/ui/templates/chat-app.tsx): asked to fix
// something, its sample assistant sets a checkpoint, hands research to a subagent, edits, and
// waits for a person before deploying. What's written meanwhile is queued. Driven through the
// agent bridge. Moved from tests/e2e/chat-app-agent.spec.ts.

// The sample streams in real time: seconds per answer, more on a busy machine.
vi.setConfig({ testTimeout: 20_000 })

const bridge = createBridge()
const conversation = () => screen.getByRole("region", { name: "Conversation" }).textContent
const deploy = () => [...document.querySelectorAll(".chat-tool")].find((tool) => tool.textContent?.includes("Deploy a preview"))
/** What an agent finds by this name on the page now (earlier tests' parts stay listed as off the page). */
const onPage = (label: string | RegExp) =>
  bridge.agent.snapshot().find((e) => !e.offPage && (typeof label === "string" ? e.label === label : label.test(e.label ?? "")))
const userMessages = () => [...document.querySelectorAll(".chat-message[data-from='user']")]

beforeEach(async () => {
  bridge.asked.length = 0
  render(
    <UISet>
      <ChatAppTemplate />
    </UISet>,
  )
  await settle()
  await bridge.press("Suggestions", "Fix the date format and deploy a preview")
  await waitFor(() => expect(deploy()?.getAttribute("data-status")).toBe("approval"), { timeout: 10_000 })
}, 20_000)

test("the agent's run shows its checkpoint and subagent, and deploys once allowed", async () => {
  // Waiting for a person isn't writing: no caret under the approval.
  expect(document.querySelectorAll(".chat-message[data-streaming]")).toHaveLength(0)
  expect(onPage(/^Restore Before the fix/)).toBeDefined()
  expect(onPage(/^Researcher\s*, Find where the date format comes from\s*, Done in 4s$/)).toBeDefined()
  const edit = [...document.querySelectorAll(".chat-tool")].find((tool) => tool.textContent?.includes("Edited src/date.ts"))
  expect(edit?.getAttribute("data-status")).toBe("done")
  expect((await bridge.press("Allow")).ok).toBe(true)
  expect(bridge.asked).toEqual(["Runs Deploy a preview"])
  await waitFor(() => expect(deploy()?.getAttribute("data-status")).toBe("done"), { timeout: 10_000 })
  await waitFor(() => expect(conversation()).toContain("The preview is up"), { timeout: 10_000 })
})

test("denied, the deploy doesn't run and the answer says so", async () => {
  await bridge.press("Deny")
  expect(deploy()?.getAttribute("data-status")).toBe("denied")
  await waitFor(() => expect(conversation()).toContain("Okay, no preview."), { timeout: 10_000 })
  await waitFor(() => expect(onPage("Send")).toBeDefined(), { timeout: 10_000 })
})

test("a message written while it waits is queued, and goes once the answer is done", async () => {
  // A person writes it: the composer's agent action inserts at a caret, which jsdom's field lacks.
  await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "Then open a pull request{Enter}")
  const queue = () => screen.queryByRole("region", { name: "Queued messages" })
  expect(queue()?.textContent).toContain("1 queued")
  await bridge.press("Allow")
  await waitFor(() => expect(queue()).toBeNull(), { timeout: 10_000 })
  expect(userMessages().at(-1)?.textContent).toContain("Then open a pull request")
})

test("Restore cuts the answer back to its checkpoint and stops it", async () => {
  await bridge.press(/^Restore Before the fix/)
  await waitFor(() => expect(deploy()).toBeUndefined())
  expect(onPage(/^Restore Before the fix/)).toBeDefined()
  await waitFor(() => expect(onPage("Send")).toBeDefined())
})
