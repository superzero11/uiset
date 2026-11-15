import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent, type AgentAction } from "@ui-sdk/react/agent"
import { createHistory } from "@ui-sdk/react/history"
import { expect, test } from "vitest"
import { createApprovals, describeStep } from "@/registry/uiset/ui/agent/approvals"
import { runAgentTool } from "@/registry/uiset/ui/agent/tools"
import {
  AgentActivity,
  AgentApprovals,
  AgentConsole,
} from "@/registry/uiset/ui/agent-console"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/registry/uiset/ui/dialog"
import { Field, FieldLabel, Input } from "@/registry/uiset/ui/field"
import { Switch } from "@/registry/uiset/ui/switch"

const step = (patch: Partial<AgentAction> = {}): AgentAction => ({
  ref: "c1",
  component: "button",
  label: "Delete project",
  action: "press",
  args: [],
  ...patch,
})

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

test("unmarked steps pass, marked steps wait for a person", async () => {
  const approvals = createApprovals()
  const signal = new AbortController().signal
  expect(approvals.allow(step(), { signal })).toBe(true)

  const answer = approvals.allow(step({ confirm: "Deletes Apollo and its data" }), {
    signal,
  })
  expect(answer).toBeInstanceOf(Promise)
  expect(approvals.pending()).toHaveLength(1)
  expect(approvals.pending()[0]?.message).toBe("Deletes Apollo and its data")

  approvals.approve(approvals.pending()[0]!.id)
  await expect(answer).resolves.toBe(true)
  expect(approvals.pending()).toHaveLength(0)
})

test("denying refuses the step, and a timeout clears the card", async () => {
  const approvals = createApprovals()
  const denied = approvals.allow(step({ confirm: "Sends the invoice" }), {
    signal: new AbortController().signal,
  })
  approvals.deny(approvals.pending()[0]!.id)
  await expect(denied).resolves.toBe(false)

  const timeout = new AbortController()
  const waiting = approvals.allow(step({ confirm: "Pays $20" }), {
    signal: timeout.signal,
  })
  expect(approvals.pending()).toHaveLength(1)
  timeout.abort()
  await expect(waiting).resolves.toBe(false)
  expect(approvals.pending()).toHaveLength(0)
})

test("a policy can ask about steps that aren't marked", async () => {
  const approvals = createApprovals({
    policy: (s) => (s.action === "setValue" ? "ask" : true),
  })
  const signal = new AbortController().signal
  const answer = approvals.allow(
    step({ component: "select", label: "Region", action: "setValue", args: ["Europe"] }),
    { signal },
  )
  expect(approvals.pending()[0]?.message).toBe("Set Region to “Europe”")
  approvals.deny(approvals.pending()[0]!.id)
  await expect(answer).resolves.toBe(false)
})

test("steps are described in plain words", () => {
  expect(
    describeStep(
      step({ component: "switch", label: "Digest", action: "setChecked", args: [true] }),
    ),
  ).toBe("Turn Digest on")
  expect(describeStep(step({ args: ["Delete forever"] }))).toBe(
    "Press “Delete forever” in Delete project",
  )
  expect(describeStep(step({ label: "Volume", action: "setValue", args: [80] }))).toBe(
    "Set Volume to 80",
  )
})

test("the agent waits on the console card, and Allow lets the step run", async () => {
  const approvals = createApprovals()
  const agent = createAgent({ allow: approvals.allow })
  let deleted = 0
  render(
    <>
      <AlertDialog>
        <AlertDialogTrigger>Delete project</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Apollo?</AlertDialogTitle>
          <AlertDialogClose>Keep it</AlertDialogClose>
          <AlertDialogClose
            value="confirm"
            data-agent-confirm="Deletes Apollo and all its data"
            onClick={() => deleted++}
          >
            Delete forever
          </AlertDialogClose>
        </AlertDialogContent>
      </AlertDialog>
      <AgentConsole>
        <AgentApprovals approvals={approvals} />
      </AgentConsole>
    </>,
  )
  await tick()

  const run = agent.act({
    steps: [{ ref: "Delete project", action: "press", args: ["Delete forever"] }],
  })
  const allow = await screen.findByRole("button", { name: "Allow" })
  expect(screen.getByText("Deletes Apollo and all its data")).toBeTruthy()
  expect(screen.getByText(/The agent is waiting for you: Deletes Apollo/)).toBeTruthy()
  await userEvent.click(allow)
  const result = await run
  expect(result.ok, result.error?.message).toBe(true)
  expect(deleted).toBe(1)
  expect(screen.queryByRole("button", { name: "Allow" })).toBeNull()
})

test("the console hides itself from agents, so one can't press its own Allow", async () => {
  const approvals = createApprovals()
  const agent = createAgent({ allow: approvals.allow })
  render(
    <AgentConsole>
      <Switch aria-label="Inside the console" />
    </AgentConsole>,
  )
  await tick()
  expect(agent.snapshot().some((entry) => entry.label === "Inside the console")).toBe(
    false,
  )
})

test("activity lists the agent's changes and undo keeps the person's", async () => {
  const agent = createAgent()
  const history = createHistory(agent)
  render(
    <>
      <Field>
        <FieldLabel>Project name</FieldLabel>
        <Input defaultValue="Apollo" />
      </Field>
      <Switch aria-label="Weekly digest" />
      <AgentActivity history={history} />
    </>,
  )
  await tick()
  expect(screen.getByText(/Nothing yet/)).toBeTruthy()

  await agent.act({
    steps: [
      { ref: "Project name", action: "setValue", args: ["Atlas"] },
      { ref: "Weekly digest", action: "setChecked", args: [true] },
    ],
  })
  await userEvent.click(screen.getByRole("switch", { name: "Weekly digest" }))
  await tick()

  expect(await screen.findByText("2 changes by the agent")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Show Project name" })).toBeTruthy()

  await userEvent.click(screen.getByRole("button", { name: "Undo agent changes" }))
  await waitFor(() =>
    expect(screen.getByLabelText<HTMLInputElement>("Project name").value).toBe("Apollo"),
  )
  // The person turned the digest off after the agent turned it on; their choice stays.
  expect(
    screen.getByRole("switch", { name: "Weekly digest" }).getAttribute("aria-checked"),
  ).toBe("false")
  // Both of the agent's changes are undone; the digest keeps the person's later choice.
  expect(await screen.findAllByText("Undone")).toHaveLength(2)
  expect(screen.getByText("No changes to undo")).toBeTruthy()
  history.destroy()
})

test("tool calls from a model route to the bridge", async () => {
  const agent = createAgent()
  render(<Switch aria-label="Deploy on push" />)
  await tick()
  const snapshot = (await runAgentTool(agent, "snapshot", {})) as { label?: string }[]
  expect(snapshot.some((entry) => entry.label === "Deploy on push")).toBe(true)
  const result = (await runAgentTool(agent, "act", {
    steps: [{ ref: "Deploy on push", action: "setChecked", args: [true] }],
  })) as { ok: boolean }
  expect(result.ok).toBe(true)
  expect(await runAgentTool(agent, "delete_everything", {})).toEqual({
    error: 'Unknown tool "delete_everything". The tools are snapshot, query and act.',
  })
})
