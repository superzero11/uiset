import { render, screen, waitFor } from "@solidjs/testing-library"
import { beforeEach, expect, test } from "vitest"
import { UISet } from "@/solid/src/uiset"
import ChatAgentExample from "@/solid/demo/examples/chat-agent"
import { createSolidBridge as createBridge, settle } from "./solid-bridge"

// Agent parts in Solid, drawn from AI SDK message parts by ChatMessageParts and driven through
// the agent bridge, with React's assertions (tests/unit/agent-parts.bridge.test.tsx): a tool
// waiting for approval, a subagent's run, a checkpoint, and the messages queued meanwhile.

const bridge = createBridge()
const status = () => screen.getByRole("status").textContent

beforeEach(async () => {
  bridge.asked.length = 0
  render(() => (
    <UISet>
      <ChatAgentExample />
    </UISet>
  ))
  await settle()
})

test("a tool waiting for approval runs once allowed, and an agent must ask a person first", async () => {
  expect(bridge.entry("Allow").confirm).toBe("Runs Deploy preview")
  expect((await bridge.pressUnattended("Allow")).ok).toBe(false)
  expect(bridge.find("Deploy preview, Needs your approval")).toBeDefined()

  expect((await bridge.press("Allow")).ok).toBe(true)
  expect(bridge.asked).toEqual(["Runs Deploy preview"])
  expect(status()).toBe("Allowed: deploying the preview.")
  await waitFor(() => expect(bridge.find("Deploy preview, Done")).toBeDefined(), { timeout: 2000 })
})

test("a denied tool says so and doesn't run", async () => {
  await bridge.press("Deny")
  expect(bridge.find("Deploy preview, Not allowed")).toBeDefined()
  expect(bridge.find("Allow")).toBeUndefined()
})

test("a subagent's run shows its task and time, and opens to its own steps", async () => {
  const run = bridge.entry("Researcher, Find where the date format comes from, Done in 12s")
  expect(run.open).toBe(false)
  await bridge.run(run.label!, "setOpen", true)
  expect(bridge.find(/^Search code/)).toBeDefined()
  expect(screen.getByText(/which ignores the locale/)).toBeTruthy()
})

test("a checkpoint restores, after an agent asks a person", async () => {
  await bridge.press("Deny")
  const restore = bridge.entry(/^Restore Checkpoint/)
  expect(restore.confirm).toBe("Puts the conversation back to this checkpoint")
  expect((await bridge.pressUnattended(/^Restore Checkpoint/)).ok).toBe(false)

  await bridge.press(/^Restore Checkpoint/)
  expect(bridge.asked).toEqual(["Puts the conversation back to this checkpoint"])
  expect(status()).toBe("Restored to the checkpoint.")
  expect(bridge.find("Deploy preview, Needs your approval")).toBeDefined()
})

test("queued messages can be removed, and the first sent now", async () => {
  expect(screen.getByRole("region", { name: "Queued messages" }).textContent).toContain("2 queued")
  await bridge.press("Remove from queue: Then open a pull request")
  expect(screen.getByRole("region", { name: "Queued messages" }).textContent).toContain("1 queued")
  await bridge.press("Send now: Also check the French locale")
  expect(screen.queryByRole("region", { name: "Queued messages" })).toBeNull()
  expect(status()).toBe("Sent now.")
})
