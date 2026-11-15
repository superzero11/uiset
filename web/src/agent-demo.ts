// The Agent Console page's own script: project settings, an agent bridge that asks before
// risky steps, a history of what it changed, and a stand-in model (the gallery's planner)
// so the page runs without an API key. Everything it drives is the real bridge.
import { createAgent, type AgentStep } from "@ui-sdk/web/agent"
import { createHistory } from "@ui-sdk/web/history"
import { elementOf } from "@ui-sdk/web/observe"
import { createApprovals } from "@/registry/uiset/ui/agent/approvals"
import { highlightAgent } from "@/registry/uiset/ui/agent/highlight"
import { plan } from "@/src/site/demo-agent"

const approvals = createApprovals()
const agent = createAgent({ allow: approvals.allow })
highlightAgent()
const settings = () => document.getElementById("project-settings")
const history = createHistory(agent, { within: settings })

const consoleEl = document.getElementById("console")!
const log = document.getElementById("log")!
;(document.getElementById("approvals") as HTMLElement & { approvals: unknown }).approvals = approvals
;(document.getElementById("activity") as HTMLElement & { history: unknown }).history = history
;(document.getElementById("snapshot") as HTMLElement & { agent: unknown }).agent = agent

let running = false
const setStatus = () => consoleEl.setAttribute("status", approvals.pending().length ? "waiting" : running ? "working" : "idle")
approvals.subscribe(setStatus)

document.getElementById("project-form")!.addEventListener("submit", (event) => {
  event.preventDefault()
  document.getElementById("notice")!.textContent = "Saved."
})
document.getElementById("delete-forever")!.addEventListener("click", () => (document.getElementById("notice")!.textContent = "Deleted. In this demo nothing is lost."))

const message = (from: "you" | "agent", text = "") => {
  const item = document.createElement("li")
  item.className = "web-agent-message"
  item.dataset.from = from
  const name = document.createElement("strong")
  name.textContent = from === "you" ? "You" : "Agent"
  const body = document.createElement("p")
  body.textContent = text
  item.append(name, body)
  log.append(item)
  return { item, body }
}
message("agent", "Hi. Tell me what to change in the project settings.")

// Labels match by words; like a real model reading the bridge's "Use a ref" error, the
// demo picks the control with that exact label in the settings.
// A dialog is named by its title here ("Delete Apollo?"); asked for by its trigger's words
// ("Delete project"), the demo finds it by those, as a model would from what it sees.
function inSettings(step: AgentStep): AgentStep {
  const root = settings()
  const here = agent.snapshot().filter((entry) => root?.contains(elementOf(entry.ref) ?? null))
  const match =
    here.find((entry) => entry.label === step.ref) ??
    here.find((entry) => {
      const el = elementOf(entry.ref)
      const dialog = el?.closest("ui-alert-dialog, ui-dialog") ?? el
      return dialog?.querySelector("ui-alert-dialog-trigger, ui-dialog-trigger")?.textContent?.trim() === step.ref
    })
  return match ? { ...step, ref: match.ref } : step
}

async function send(text: string) {
  if (running || !text.trim()) return
  running = true
  setStatus()
  document.getElementById("suggestions")!.hidden = true
  message("you", text)
  const reply = message("agent")
  const intent = plan(text)
  if (intent.kind === "help") reply.body.textContent = "I can rename the project, change its visibility or region, turn the weekly digest or deploy on push on or off, save it, or delete it. I'll ask you before anything destructive."
  else if (intent.kind === "look") reply.body.textContent = `I can see ${agent.snapshot().filter((e) => !e.offPage).length} controls here.`
  else if (intent.kind === "undo") {
    const missed = await history.undoSource("agent")
    reply.body.textContent = missed.length ? `I put most things back, but ${missed.length} control${missed.length === 1 ? " was" : "s were"} gone or locked.` : "Done. Everything I changed is back the way it was."
  } else {
    let done = 0
    for (const { say, step } of intent.steps) {
      const row = document.createElement("uiset-agent-step")
      row.setAttribute("status", "running")
      row.textContent = say
      reply.item.insertBefore(row, reply.body)
      const result = await agent.act({ steps: [inSettings(step)] })
      const problem = result.error?.message ?? ""
      row.setAttribute("status", result.ok ? "done" : /said no|refused|Needs a person/i.test(problem) ? "refused" : "failed")
      if (result.ok) done++
    }
    const total = intent.steps.length
    reply.body.textContent = done === total ? `Done: ${done === 1 ? "one change" : `${done} changes`}. You can see and undo ${done === 1 ? "it" : "them"} in Activity.` : done === 0 ? "I didn't change anything." : `I made ${done} of ${total} changes. The rest didn't go through.`
  }
  running = false
  setStatus()
}

const suggestions = document.getElementById("suggestions")!
for (const text of ["Make it public and move it to Europe", "Turn on the weekly digest", "Rename it to Atlas", "Delete the project", "Undo that"]) {
  const wrap = document.createElement("ui-button")
  const button = document.createElement("button")
  button.type = "button"
  button.dataset.variant = "outline"
  button.textContent = text
  button.addEventListener("click", () => void send(text))
  wrap.append(button)
  suggestions.append(wrap)
}
const prompt = document.getElementById("prompt") as HTMLFormElement
prompt.addEventListener("submit", (event) => {
  event.preventDefault()
  const input = prompt.querySelector("input")!
  const text = input.value
  input.value = ""
  void send(text)
})

setStatus()
Object.assign(window, { agent, agentHistory: history })
