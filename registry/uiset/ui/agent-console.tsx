"use client"

import {
  bindPersistentLayer,
  createInputHistory,
  createStickToBottom,
} from "@ui-sdk/core"
import type { AgentComponent } from "@ui-sdk/react/agent"
import { describeEntry, type createHistory } from "@ui-sdk/react/history"
import { elementOf } from "@ui-sdk/react/observe"
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import type { Approvals } from "./agent/approvals"
import { highlightElement } from "./agent/highlight"
import type { Agent } from "./agent/tools"
import { Button } from "./button"
import { ScrollBox } from "./scroll-area"
import "./agent/console.css"

type History = ReturnType<typeof createHistory>
type Status = "idle" | "working" | "waiting"

const statusText: Record<Status, string> = {
  idle: "Idle",
  working: "Working…",
  waiting: "Waiting for you",
}

function AgentConsole({
  title = "Agent",
  status = "idle",
  className,
  children,
}: {
  title?: string
  status?: Status
  className?: string
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      data-agent-hidden=""
      data-status={status}
      className={["agent-console", className].filter(Boolean).join(" ")}
    >
      <header className="agent-console-header">
        <h2 id={titleId}>{title}</h2>
        <span className="agent-console-status" role="status">
          <span className="agent-console-lamp" aria-hidden="true" />
          {statusText[status]}
        </span>
      </header>
      {children}
    </section>
  )
}

type StepStatus = "running" | "done" | "failed" | "refused"
const stepText: Record<StepStatus, string> = {
  running: "Running",
  done: "Done",
  failed: "Failed",
  refused: "You said no",
}

function AgentStep({ status, children }: { status: StepStatus; children: ReactNode }) {
  return (
    <div className="agent-step" data-status={status}>
      <span className="agent-step-mark" aria-hidden="true" />
      <span className="agent-step-text">{children}</span>
      <span className="agent-step-status">{stepText[status]}</span>
    </div>
  )
}

function popoverOpen(el: HTMLElement) {
  try {
    return el.matches(":popover-open")
  } catch {
    return false
  }
}

function AgentApprovals({ approvals }: { approvals: Approvals }) {
  const pending = useSyncExternalStore(
    approvals.subscribe,
    approvals.pending,
    approvals.pending,
  )
  const latest = pending.at(-1)
  const layer = useRef<HTMLDivElement>(null)

  // Agents usually ask after opening a modal, whose backdrop covers the page and whose
  // focus trap makes it inert. The cards go to the top layer, above that modal, and
  // bindPersistentLayer keeps them usable while it's open.
  useEffect(() => (layer.current ? bindPersistentLayer(layer.current) : undefined), [])
  useEffect(() => {
    const el = layer.current
    if (!el || typeof el.showPopover !== "function") return
    if (pending.length) {
      // Showing it again moves it above anything that opened since.
      if (popoverOpen(el)) el.hidePopover()
      el.showPopover()
    } else if (popoverOpen(el)) {
      el.hidePopover()
    }
  }, [pending])

  return (
    <>
      <p className="agent-visually-hidden" role="status">
        {latest ? `The agent is waiting for you: ${latest.message}` : ""}
      </p>
      {pending.length > 0 && (
        <p className="agent-approvals-waiting">Waiting for your answer…</p>
      )}
      <div
        ref={layer}
        popover="manual"
        role="group"
        aria-label="Agent requests"
        className="agent-approvals"
      >
        {pending.map((approval) => (
          <div key={approval.id} className="agent-approval">
            <p className="agent-approval-ask">The agent wants to:</p>
            <blockquote>{approval.message}</blockquote>
            <div className="agent-approval-actions">
              <Button onClick={() => approvals.approve(approval.id)}>Allow</Button>
              <Button variant="outline" onClick={() => approvals.deny(approval.id)}>
                Don&rsquo;t allow
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function useVersion(subscribe: (listener: () => void) => () => unknown) {
  const version = useRef(0)
  return useSyncExternalStore(
    (listener) => {
      const stop = subscribe(() => {
        version.current++
        listener()
      })
      return () => void stop()
    },
    () => version.current,
    () => version.current,
  )
}

function AgentActivity({
  history,
  source = "agent",
}: {
  history: History
  source?: string
}) {
  useVersion(history.subscribe)
  const [problem, setProblem] = useState<string | null>(null)
  const entries = history.entries().filter((entry) => entry.source === source)
  const active = entries.filter((entry) => !entry.reverted)

  const undo = async () => {
    const missed = await history.undoSource(source)
    setProblem(
      missed.length
        ? `Couldn't put back ${missed.length} change${missed.length === 1 ? "" : "s"}: those controls are gone or locked. Change them yourself.`
        : null,
    )
  }

  return (
    <div className="agent-activity">
      <div className="agent-activity-header">
        <p>
          {active.length
            ? `${active.length} change${active.length === 1 ? "" : "s"} by the agent`
            : "No changes to undo"}
        </p>
        <Button variant="outline" disabled={!active.length} onClick={undo}>
          Undo agent changes
        </Button>
      </div>
      {problem && (
        <p className="agent-activity-problem" role="alert">
          {problem}
        </p>
      )}
      {entries.length === 0 ? (
        <p className="agent-empty">
          Nothing yet. Changes the agent makes show up here, and you can undo them.
        </p>
      ) : (
        <ol className="agent-activity-list">
          {[...entries].reverse().map((entry) => (
            <li key={entry.id} data-reverted={entry.reverted ? "" : undefined}>
              <span>{describeEntry(entry)}</span>
              {entry.reverted ? (
                <span className="agent-activity-badge">Undone</span>
              ) : (
                <Button
                  variant="ghost"
                  aria-label={`Show ${entry.label}`}
                  onClick={() => highlightElement(elementOf(entry.ref))}
                >
                  Show
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function stateOf(entry: AgentComponent) {
  const value = entry.checked ?? entry.value ?? entry.open
  if (value === undefined || value === null) return "—"
  return typeof value === "string" ? `“${value}”` : String(value)
}

function AgentSnapshot({
  agent,
  within,
}: {
  agent: Agent
  within?: () => Element | null
}) {
  const version = useVersion(agent.subscribe)
  const [entries, setEntries] = useState<AgentComponent[]>([])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = within?.()
      setEntries(
        agent
          .snapshot()
          .filter(
            (entry) =>
              !entry.offPage &&
              entry.component !== "more" &&
              (!root || root.contains(elementOf(entry.ref) ?? null)),
          ),
      )
    })
    return () => cancelAnimationFrame(frame)
  }, [agent, within, version])

  return (
    <ScrollBox
      axis="both"
      data-frame="none"
      className="agent-snapshot-frame"
      viewport={{ className: "agent-snapshot-view", role: "region", "aria-label": "Snapshot" }}
    >
      <table>
        <caption className="agent-visually-hidden">
          What the agent can see on this page
        </caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Kind</th>
            <th scope="col">State</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.ref}>
              <th scope="row">{entry.label ?? "Unnamed"}</th>
              <td>{entry.component}</td>
              <td>{entry.confirm ? "Needs you" : stateOf(entry)}</td>
              <td>{entry.actions.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  )
}

export { AgentActivity, AgentApprovals, AgentConsole, AgentSnapshot, AgentStep }
export type { Status as AgentStatus, StepStatus as AgentStepStatus }
