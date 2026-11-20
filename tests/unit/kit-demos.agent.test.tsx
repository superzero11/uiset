import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { afterEach, expect, test } from "vitest"
import { formatAgentReadiness, checkAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import { ChatAppTemplate } from "@/registry/uiset/ui/templates/chat-app"
import type { Assistant } from "@/registry/uiset/ui/templates/chat-app-sample"
import { UISet } from "@/registry/uiset/ui/uiset"
import { BoardDemo } from "@/src/site/board-demo"
import { ChatDemo } from "@/src/site/chat-demo"

// The kits page's demos are what people judge the kits by: each scores 100 through the agent
// bridge, as uiset.dev/check and agent-check's bookmarklet would score it.
const agent = createAgent()
afterEach(cleanup)

for (const [name, Demo] of [
  ["chat", ChatDemo],
  ["board", BoardDemo],
] as const) {
  test(`the ${name} demo scores 100`, async () => {
    render(
      <UISet>
        <Demo />
      </UISet>,
    )
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    const report = await checkAgentReadiness(agent)
    expect(report.score, formatAgentReadiness(report, name)).toBe(100)
  })
}

// Empty, the chat template has no message actions to clash; a reply brings them.
test("the chat template scores 100 with a reply on screen", async () => {
  const assistant: Assistant = async function* () {
    yield { type: "text", delta: "Cancel the last request before you start the next one." }
  }
  render(
    <UISet>
      <ChatAppTemplate assistant={assistant} />
    </UISet>,
  )
  await userEvent.click(screen.getByRole("button", { name: "Draft release notes" }))
  await screen.findByText("Cancel the last request before you start the next one.")
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
  const report = await checkAgentReadiness(agent)
  expect(report.score, formatAgentReadiness(report, "chat template")).toBe(100)
})
