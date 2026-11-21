import { act } from "@testing-library/react"
import { createAgent, type AgentComponent } from "@ui-sdk/react/agent"

// Behavior tests through UI SDK's agent bridge, in jsdom: find components by the names people
// see and act on them the way an agent does. A step on a control marked data-agent-confirm
// goes through here only because `allow` stands in for the person; `asked` keeps what each
// such step said it would do, and `unattended` has no person to ask, so it's refused.

/** Lets effects, timers under `ms` and the bridge's own bookkeeping run. */
export const settle = (ms = 50) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

export function createBridge() {
  const asked: string[] = []
  const agent = createAgent({
    allow: (step) => {
      if (step.confirm) asked.push(step.confirm)
      return true
    },
  })
  const unattended = createAgent()

  const matches = (entry: AgentComponent, label: string | RegExp) =>
    typeof label === "string" ? entry.label === label : label.test(entry.label ?? "")
  const find = (label: string | RegExp) => agent.snapshot().find((entry) => matches(entry, label))
  const entry = (label: string | RegExp) => {
    const found = find(label)
    if (!found) throw new Error(`Nothing named ${label} for an agent. It sees: ${agent.snapshot().map((e) => e.label ?? e.component).join(" | ")}`)
    return found
  }
  const act_ = async (label: string | RegExp, action: string, args: unknown[] = [], by = agent) => {
    const result = await by.act({ steps: [{ ref: entry(label).ref, action, args }] })
    await settle()
    return result
  }

  return {
    agent,
    asked,
    /** The component an agent finds by this name, or undefined. */
    find,
    /** The component an agent finds by this name; throws with what it sees instead. */
    entry,
    press: (label: string | RegExp, ...args: unknown[]) => act_(label, "press", args),
    run: (label: string | RegExp, action: string, ...args: unknown[]) => act_(label, action, args),
    /** The same press with no person to ask: steps marked data-agent-confirm fail. */
    pressUnattended: (label: string | RegExp) => act_(label, "press", [], unattended),
  }
}
