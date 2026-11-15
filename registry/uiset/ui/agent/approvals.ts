import type { AgentAction } from "@ui-sdk/core/agent"

type Approval = {
  id: string
  step: AgentAction
  message: string
}

type Verdict = boolean | "ask"
type ApprovalOptions = {
  // Which steps to ask about besides the ones marked data-agent-confirm, which always ask.
  policy?: (step: AgentAction) => Verdict
}

const verbs: Record<string, string> = {
  setValue: "Set",
  setChecked: "Turn",
  setOpen: "Open",
  press: "Press",
  clear: "Clear",
  toggle: "Toggle",
}

function show(value: unknown): string {
  if (typeof value === "string") return `“${value}”`
  if (typeof value === "boolean") return value ? "on" : "off"
  if (Array.isArray(value)) return value.map(show).join(", ")
  return String(value)
}

function describeStep(step: AgentAction) {
  const verb =
    verbs[step.action] ??
    step.action.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  const target = step.label ?? step.component
  if (step.action === "setChecked") return `${verb} ${target} ${show(step.args[0])}`
  if (step.action === "press" && step.args.length)
    return `Press “${step.args[0]}” in ${target}`
  return step.args.length
    ? `${verb} ${target} to ${step.args.map(show).join(", ")}`
    : `${verb} ${target}`
}

function createApprovals(options: ApprovalOptions = {}) {
  type Waiting = Approval & { settle: (ok: boolean) => void }
  let queue: Waiting[] = []
  let snapshot: readonly Approval[] = []
  let count = 0
  const listeners = new Set<() => void>()

  const emit = () => {
    snapshot = queue.map(({ settle: _, ...approval }) => approval)
    for (const listener of listeners) listener()
  }

  const ask = (step: AgentAction, signal: AbortSignal) =>
    new Promise<boolean>((resolve) => {
      if (signal.aborted) return resolve(false)
      const id = `approval-${++count}`
      let settled = false
      const settle = (ok: boolean) => {
        if (settled) return
        settled = true
        queue = queue.filter((item) => item.id !== id)
        emit()
        resolve(ok)
      }
      signal.addEventListener("abort", () => settle(false), { once: true })
      queue = [
        ...queue,
        { id, step, message: step.confirm ?? describeStep(step), settle },
      ]
      emit()
    })

  return {
    allow(
      step: AgentAction,
      { signal }: { signal: AbortSignal },
    ): boolean | Promise<boolean> {
      const verdict: Verdict = step.confirm ? "ask" : (options.policy?.(step) ?? true)
      return verdict === "ask" ? ask(step, signal) : verdict
    },
    pending: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    approve: (id: string) => queue.find((item) => item.id === id)?.settle(true),
    deny: (id: string) => queue.find((item) => item.id === id)?.settle(false),
    denyAll: () => {
      for (const item of [...queue]) item.settle(false)
    },
  }
}

type Approvals = ReturnType<typeof createApprovals>

export { createApprovals, describeStep }
export type { Approval, ApprovalOptions, Approvals, Verdict }
