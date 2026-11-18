import type { AgentComponent } from "@ui-sdk/react/agent"
import { elementOf } from "@ui-sdk/react/observe"
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react"
import { checkAgentReadiness, slotNames, type AgentBridge } from "@/registry/uiset/ui/agent-check/check"
import { highlightElement } from "@/registry/uiset/ui/agent/highlight"
import { Button } from "@/registry/uiset/ui/button"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/registry/uiset/ui/collapsible"
import { Field, FieldLabel, Input } from "@/registry/uiset/ui/field"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "@/registry/uiset/ui/select"
import { Switch } from "@/registry/uiset/ui/switch"
import { agent } from "./agent"
import { useAgentVersion } from "./agent-panel"
import { CodeBlock } from "./shell/code"

// Agent view: beside a live example, what UI SDK's agent bridge reads from it, its
// agent-check score, and every action it offers, run through the real bridge. The panel
// itself is hidden from agents, so it never changes what they see or a page's score.

const KEY = "uiset-agent-view"
const listeners = new Set<() => void>()
let shown = (() => {
  try {
    return localStorage.getItem(KEY) === "on"
  } catch {
    return false
  }
})()

function setAgentView(next: boolean) {
  shown = next
  try {
    localStorage.setItem(KEY, next ? "on" : "off")
  } catch {
    // Storage blocked: the switch still works for this page.
  }
  for (const listener of listeners) listener()
}

/** Whether Agent view is on, the same on every page and kept between visits. */
function useAgentView() {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => shown,
    () => false,
  )
}

function AgentViewSwitch() {
  const on = useAgentView()
  return (
    <label className="agent-view-switch" data-agent-hidden="">
      <Switch checked={on} onCheckedChange={(next) => setAgentView(Boolean(next))} />
      Agent view
    </label>
  )
}

// Omit<> would turn its fields into unknown (it has an index signature); `source` is dropped where it's printed.
type Entry = AgentComponent

const within = (root: Element | null, ref: string) => !!root && root.contains(elementOf(ref) ?? null)

/** The bridge, as it reads one example: what's outside `root` isn't there. A "more" entry
    stays, so a check past the snapshot's first 100 components queries for the rest. */
function scopedBridge(root: Element): AgentBridge {
  return {
    snapshot: () => agent.snapshot().filter((e) => e.component === "more" || within(root, e.ref)),
    query: async (input) => {
      const found = await agent.query(input)
      return Array.isArray(found) ? found.filter((e) => e.component !== "more" && within(root, e.ref)) : found
    },
  }
}

function stateText(entry: Entry) {
  const parts: string[] = []
  const show = (value: unknown) => (typeof value === "string" ? `“${value}”` : Array.isArray(value) ? value.map((v) => (typeof v === "string" ? `“${v}”` : String(v))).join(", ") : String(value))
  if (entry.value !== undefined && entry.value !== null && entry.value !== "") parts.push(show(entry.value))
  if (entry.checked !== undefined) parts.push(entry.checked === "mixed" ? "partly checked" : entry.checked ? "checked" : "not checked")
  if (entry.open !== undefined) parts.push(entry.open ? "open" : "closed")
  if (entry.pending) parts.push("working…")
  if (typeof entry.error === "string") parts.push(`error: ${entry.error}`)
  return parts.join(" · ") || "—"
}

// Actions that take nothing run on a press; the rest take what's typed or chosen.
const BARE = new Set(["press", "open", "close", "toggle", "clear", "clearSelection", "expand", "collapse", "increment", "decrement", "next", "previous", "play", "pause", "stop", "reset", "submit", "dismiss", "selectAll", "first", "last", "undo", "redo", "zoomIn", "zoomOut", "fitView"])

function argsFrom(text: string, current: unknown): unknown[] {
  const t = text.trim()
  if (t.startsWith("[")) {
    try {
      const list = JSON.parse(t)
      if (Array.isArray(list)) return list
    } catch {
      // Not a list after all: take it as one value.
    }
  }
  if (typeof current === "number" && t !== "" && !Number.isNaN(Number(t))) return [Number(t)]
  if (typeof current === "boolean" && (t === "true" || t === "false")) return [t === "true"]
  return [t]
}

/** For `setChecked`, `setOpen` and the like on a yes-or-no state: the opposite of what it is now. */
function flipOf(entry: Entry, action: string): boolean | undefined {
  const key = action.startsWith("set") ? action[3]!.toLowerCase() + action.slice(4) : ""
  const now = entry[key]
  return typeof now === "boolean" ? !now : undefined
}

function ActionInput({ entry, action, run, done }: { entry: Entry; action: string; run: (args: unknown[]) => void; done: () => void }) {
  const [text, setText] = useState("")
  const name = entry.label ?? entry.component
  const choosing = /^(setValue|select)$/.test(action)
  // A closed list's items aren't in the snapshot; `query` within it returns them.
  const [items, setItems] = useState(entry.items ?? [])
  // What the bridge tells an agent about this action, like "setValue takes an item's label".
  const [note, setNote] = useState("")
  useEffect(() => {
    if (!choosing || entry.items?.length) return
    let live = true
    void agent.query({ within: entry.ref }).then((found) => {
      const self = Array.isArray(found) ? found.find((e) => e.ref === entry.ref) : undefined
      if (!live || !self) return
      if (self.items?.length) setItems(self.items)
      if (typeof self.note === "string") setNote(self.note)
    })
    return () => {
      live = false
    }
  }, [choosing, entry.ref, entry.items])
  if (choosing && items.length) {
    return (
      <div className="agent-view-arg">
        <Select onValueChange={(value: unknown) => (run([value]), done())}>
          <SelectLabel className="visually-hidden">{`${action} for ${name}`}</SelectLabel>
          <SelectTrigger />
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={done}>
          Cancel
        </Button>
      </div>
    )
  }
  return (
    <form
      className="agent-view-arg"
      onSubmit={(event) => {
        event.preventDefault()
        run(argsFrom(text, entry.value ?? entry.checked))
        done()
      }}
    >
      <Field name="arg">
        <FieldLabel className="visually-hidden">{`${action} for ${name}`}</FieldLabel>
        <Input value={text} onValueChange={(v: string) => setText(v)} placeholder={choosing ? "An item's label or value" : "Value, or a JSON list"} autoComplete="off" />
      </Field>
      <Button type="submit" variant="outline">
        Run
      </Button>
      <Button variant="ghost" onClick={done}>
        Cancel
      </Button>
      {note && <p className="agent-view-note">The bridge says: {note}</p>}
    </form>
  )
}

function AgentViewRow({ entry, run }: { entry: Entry; run: (ref: string, label: string, action: string, args?: unknown[]) => void }) {
  const [editing, setEditing] = useState<string | null>(null)
  const name = entry.label ?? entry.component
  const point = () => highlightElement(elementOf(entry.ref), { duration: 900, scroll: false })
  return (
    <li className="agent-view-row" onMouseEnter={point}>
      <div className="agent-view-head">
        <span className="agent-view-name">{entry.label ?? <em>no name</em>}</span>
        <span className="agent-view-kind">{entry.component}</span>
      </div>
      <p className="agent-view-state">{stateText(entry)}</p>
      {entry.confirm && <p className="agent-view-confirm">Asks a person first: {entry.confirm}</p>}
      {entry.actions.length > 0 && (
        <div className="agent-view-actions" onFocus={point}>
          {entry.actions.map((action) => {
            const flip = flipOf(entry, action)
            return flip !== undefined ? (
              <Button key={action} variant="outline" aria-label={`${action} ${flip} for ${name}`} onClick={() => run(entry.ref, name, action, [flip])}>
                {action}({String(flip)})
              </Button>
            ) : BARE.has(action) ? (
              <Button key={action} variant="outline" aria-label={`${action} ${name}`} onClick={() => run(entry.ref, name, action)}>
                {action}
              </Button>
            ) : (
              <Button key={action} variant="outline" aria-label={`${action} ${name}…`} aria-expanded={editing === action} onClick={() => setEditing(editing === action ? null : action)}>
                {action}…
              </Button>
            )
          })}
        </div>
      )}
      {editing && <ActionInput entry={entry} action={editing} run={(args) => run(entry.ref, name, editing, args)} done={() => setEditing(null)} />}
    </li>
  )
}

/**
 * The components inside `root`, in page order. Past the snapshot's first 100, the rest come
 * from `query`, one kind at a time, as an agent finds them; `fromQuery` says how many.
 */
async function readWithin(root: Element) {
  const listed = agent.snapshot()
  const entries = listed.filter((e) => !e.offPage && e.component !== "more" && within(root, e.ref))
  let fromQuery = 0
  if (listed.some((e) => e.component === "more")) {
    const seen = new Set(entries.map((e) => e.ref))
    for (const kind of slotNames(root)) {
      const found = await agent.query({ kind })
      if (!Array.isArray(found)) continue
      for (const e of found)
        if (!e.offPage && e.component !== "more" && !seen.has(e.ref) && within(root, e.ref)) {
          seen.add(e.ref)
          entries.push(e)
          fromQuery++
        }
    }
    const at = (e: Entry) => elementOf(e.ref)
    entries.sort((a, b) => {
      const x = at(a)
      const y = at(b)
      return x && y ? (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1) : 0
    })
  }
  return { entries, fromQuery }
}

/**
 * Runs `work` after `tick` changes, one run at a time and at most once per `delay`, and keeps
 * every result. A busy page (a stream, a meter) ticks faster than a check finishes, so
 * restarting on each tick would never show one.
 */
function useEachChange<T>(tick: number | null, delay: number, work: () => Promise<T> | undefined): T | null {
  const [value, setValue] = useState<T | null>(null)
  const latest = useRef(work)
  const request = useRef(() => {})
  useEffect(() => {
    latest.current = work
  })
  useEffect(() => {
    let live = true
    let timer: number | undefined
    let running = false
    let again = false
    const start = () => {
      timer = undefined
      if (running) return void (again = true)
      const job = latest.current()
      if (!job) return
      running = true
      job
        .then((next) => live && setValue(() => next))
        .catch(() => {})
        .finally(() => {
          running = false
          if (again && live) {
            again = false
            request.current()
          }
        })
    }
    request.current = () => {
      if (timer === undefined) timer = window.setTimeout(start, delay)
    }
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [delay])
  useEffect(() => {
    if (tick !== null) request.current()
  }, [tick])
  return value
}

/**
 * Whether `ref`'s element is on screen or close to it. The bridge queues every `query` in
 * order, so on Kits eleven panels checking at once kept each waiting seconds for the rest.
 */
function useNearView(ref: RefObject<Element | null>) {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const watch = new IntersectionObserver(([seen]) => setNear(Boolean(seen?.isIntersecting)), { rootMargin: "400px 0px" })
    watch.observe(el)
    return () => watch.disconnect()
  }, [ref])
  return near
}

/** What the agent bridge reads inside `root`, scored, with its actions to run. */
function AgentViewPanel({ root, title }: { root: RefObject<HTMLElement | null>; title: string }) {
  const panel = useRef<HTMLElement>(null)
  const near = useNearView(panel)
  const version = useAgentVersion()
  const tick = near ? version : null
  const [said, setSaid] = useState("")
  const read = useEachChange(tick, 50, () => (root.current ? readWithin(root.current) : undefined))
  const report = useEachChange(tick, 250, () => {
    const el = root.current
    return el ? checkAgentReadiness(scopedBridge(el), { root: el }) : undefined
  })
  const entries = read?.entries ?? null
  const fromQuery = read?.fromQuery ?? 0

  async function run(ref: string, label: string, action: string, args: unknown[] = []) {
    const result = await agent.act({ steps: [{ ref, action, args }] })
    const step = result.ok ? (result.steps as { result?: unknown }[] | undefined)?.[0]?.result : undefined
    setSaid(result.ok ? (typeof step === "string" ? step : `Ran ${action} on “${label}”.`) : (result.error?.message ?? `“${label}” refused ${action}.`))
  }

  const problems = report?.problems.filter((p) => p.severity === "error") ?? []
  return (
    <section ref={panel} className="agent-view" data-agent-hidden="" aria-label={`Agent view of ${title}`}>
      <header className="agent-view-top">
        <h3>What an agent sees</h3>
        <p className="agent-view-score" data-perfect={report && report.score === 100 ? "" : undefined}>
          {report ? (
            <>
              agent-check <strong>{report.score}/100</strong>
              <span>
                {report.ready} of {report.controls} {report.controls === 1 ? "control" : "controls"} an agent can find by name
              </span>
            </>
          ) : (
            "Checking…"
          )}
        </p>
      </header>
      {fromQuery > 0 && (
        <p className="agent-view-note">
          This page has more than 100 components, so an agent's snapshot stops before {fromQuery === entries?.length ? "these" : `${fromQuery} of these`}. It finds them with{" "}
          <code>query</code>.
        </p>
      )}
      {problems.length > 0 && (
        <ul className="agent-view-problems">
          {problems.map((p, i) => (
            <li key={i}>{p.message}</li>
          ))}
        </ul>
      )}
      {entries === null ? (
        <p className="agent-view-note">Reading the example…</p>
      ) : entries.length === 0 ? (
        <p className="agent-view-note">No controls here for an agent to use: it shows content, which an agent reads as page text.</p>
      ) : (
        <ul className="agent-view-list" aria-label="Components an agent sees">
          {entries.map((entry) => (
            <AgentViewRow key={entry.ref} entry={entry} run={run} />
          ))}
        </ul>
      )}
      <output className="agent-view-said" aria-live="polite">
        {said}
      </output>
      {entries && entries.length > 0 && (
        <Collapsible className="agent-view-raw">
          <CollapsibleTrigger>The snapshot as JSON</CollapsibleTrigger>
          <CollapsiblePanel>
            <CodeBlock code={JSON.stringify(entries.map(({ source: _source, ...rest }) => rest), null, 2)} language="json" title="agent.snapshot()" />
          </CollapsiblePanel>
        </Collapsible>
      )}
    </section>
  )
}

export { AgentViewPanel, AgentViewSwitch, scopedBridge, useAgentView }
