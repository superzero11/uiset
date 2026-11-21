import { act, cleanup, render } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { afterEach, expect, test, vi } from "vitest"
import { Toaster, toast } from "@/registry/uiset/ui/toast"
import { UISet } from "@/registry/uiset/ui/uiset"

// An agent that just ran an action reads the toast it caused and can press its Undo
// (vercel-labs/ui#978: the toast region used to be marked data-agent-hidden). An empty
// region stays out of the snapshot on its own.
const agent = createAgent()
afterEach(() => {
  toast.dismiss?.()
  cleanup()
})

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))

test("an agent sees a toast while it shows, and presses its action", async () => {
  render(
    <UISet>
      <Toaster />
    </UISet>,
  )
  await settle()
  expect(agent.snapshot().filter((e) => e.component === "toast")).toEqual([])

  const undo = vi.fn()
  act(() => {
    toast("Message archived", { action: { label: "Undo", onAction: undo } })
  })
  await settle()
  const seen = agent.snapshot().find((e) => e.component === "toast")
  expect(seen?.label).toBe("Message archived")

  const result = await agent.act({ steps: [{ ref: seen!.ref, action: "press", args: ["Undo"] }] })
  expect(result.ok, JSON.stringify(result)).toBe(true)
  expect(undo).toHaveBeenCalledOnce()
})
