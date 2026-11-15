import { elementOf } from "@ui-sdk/react/observe"
import type { AgentComponent, AgentStep } from "@ui-sdk/react/agent"
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react"
import { Button } from "@/registry/uiset/ui/button"
import { agent } from "./agent"

type Script = { say: string; steps: AgentStep[] }

let version = 0
const listeners = new Set<() => void>()
agent.subscribe(() => {
  version++
  for (const listener of listeners) listener()
})

function useAgentVersion() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => version,
  )
}

function stateOf(entry: AgentComponent) {
  const value = entry.checked ?? entry.value ?? entry.open
  if (value === undefined || value === null) return "—"
  return typeof value === "string" ? `“${value}”` : String(value)
}

type AgentPanelProps = {
  within: RefObject<HTMLElement | null>
  script: Script[]
  showSnapshot?: boolean
  beforeRun?: () => void
}

function AgentPanel({ within, script, showSnapshot = true, beforeRun }: AgentPanelProps) {
  const tick = useAgentVersion()
  const [entries, setEntries] = useState<AgentComponent[]>([])
  const [log, setLog] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = within.current
      setEntries(
        agent
          .snapshot()
          .filter(
            (entry) => !entry.offPage && root?.contains(elementOf(entry.ref) ?? null),
          ),
      )
    })
    return () => cancelAnimationFrame(frame)
  }, [tick, within])

  async function run(line: Script) {
    beforeRun?.()
    const result = await agent.act({ steps: line.steps })
    setLog((previous) =>
      [
        result.ok
          ? `✓ ${line.say}`
          : `✕ ${line.say} — ${result.error?.message ?? "refused"}`,
        ...previous,
      ].slice(0, 6),
    )
  }

  async function playAll() {
    setRunning(true)
    for (const line of script) {
      await run(line)
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
    setRunning(false)
  }

  return (
    <div
      className="agent-panel"
      data-agent-hidden=""
      data-compact={showSnapshot ? undefined : ""}
    >
      {showSnapshot && (
        <div className="agent-snapshot">
          <h3>agent.snapshot()</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Component</th>
                <th scope="col">State</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.ref}>
                  <td>{entry.label ?? <em>unnamed</em>}</td>
                  <td>{entry.component}</td>
                  <td>{stateOf(entry)}</td>
                  <td>{entry.actions.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="agent-script">
        <h3>Ask the agent</h3>
        <ul>
          {script.map((line) => (
            <li key={line.say}>
              <Button variant="ghost" disabled={running} onClick={() => run(line)}>
                {line.say}
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="outline" disabled={running} onClick={playAll}>
          Play all {script.length}
        </Button>
        <output className="agent-log" aria-live="polite">
          {log.map((line, index) => (
            <span key={`${index}-${line}`}>{line}</span>
          ))}
        </output>
      </div>
    </div>
  )
}

export { AgentPanel }
export type { Script }
