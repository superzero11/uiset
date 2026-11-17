// The Agent Console for Web Components: the human side of UI SDK's agent bridge, as the
// React AgentConsole parts are. <uiset-agent-console> frames it with a status lamp,
// <uiset-agent-step> is one step of a plan, <uiset-agent-approvals> asks before risky
// steps (above any modal), <uiset-agent-activity> lists the agent's changes with Show and
// Undo, and <uiset-agent-snapshot> shows what the agent can see. The approvals and
// highlight helpers are the React ones (agent/approvals.ts, agent/highlight.ts).
import { bindPersistentLayer } from "@ui-sdk/core"
import type { AgentComponent } from "@ui-sdk/core/agent"
import { elementOf } from "@ui-sdk/core/observe"
import "@ui-sdk/web/button"
import { describeEntry, type createHistory } from "@ui-sdk/web/history"
import type { createApprovals } from "@/registry/uiset/ui/agent/approvals"
import { highlightElement } from "@/registry/uiset/ui/agent/highlight"
import "@/registry/uiset/ui/agent/console.css"
import { attr, defineElement, ElementBase, h, uid, upgradeProperties } from "./dom"

type History = ReturnType<typeof createHistory>
type Approvals = ReturnType<typeof createApprovals>
type Agent = { snapshot: () => AgentComponent[]; subscribe: (listener: () => void) => () => unknown }

const statusText: Record<string, string> = { idle: "Idle", working: "Working…", waiting: "Waiting for you" }
const stepText: Record<string, string> = { running: "Running", done: "Done", failed: "Failed", refused: "You said no" }
const button = (text: string, attrs: Record<string, unknown>, run: () => void) => h("ui-button", null, h("button", { type: "button", ...attrs, onclick: run }, text))

/**
 * <uiset-agent-console title="Agent" status="working"> is a labeled region with the
 * agent's status (idle, working, or waiting for you) and your content under it. It's
 * hidden from agents, so they never act on their own console.
 */
class UISetAgentConsole extends ElementBase {
  static observedAttributes = ["title", "status"]
  #header?: { title: HTMLElement; status: HTMLElement }

  connectedCallback() {
    if (!this.#header) {
      const titleId = uid("agent-console")
      const title = h("h2", { id: titleId })
      const status = h("span", { class: "agent-console-status", role: "status" })
      this.prepend(h("header", { class: "agent-console-header" }, title, status))
      this.#header = { title, status }
      this.classList.add("agent-console")
      this.setAttribute("role", "region")
      this.setAttribute("aria-labelledby", titleId)
      this.setAttribute("data-agent-hidden", "")
    }
    this.attributeChangedCallback()
  }

  attributeChangedCallback() {
    const header = this.#header
    if (!header) return
    // `title` names the console; it isn't a tooltip here.
    const title = this.getAttribute("title")
    if (title !== null) {
      this.dataset.title = title
      this.removeAttribute("title")
      return
    }
    header.title.textContent = this.dataset.title ?? "Agent"
    const status = this.getAttribute("status") ?? "idle"
    this.dataset.status = status
    header.status.replaceChildren(h("span", { class: "agent-console-lamp", "aria-hidden": "true" }), statusText[status] ?? status)
  }
}

/** <uiset-agent-step status="running">Rename the project</uiset-agent-step>: one step, with its state in words. */
class UISetAgentStep extends ElementBase {
  static observedAttributes = ["status"]
  #parts?: { text: HTMLElement; status: HTMLElement }

  connectedCallback() {
    if (!this.#parts) {
      const text = h("span", { class: "agent-step-text" }, ...this.childNodes)
      const status = h("span", { class: "agent-step-status" })
      this.replaceChildren(h("span", { class: "agent-step-mark", "aria-hidden": "true" }), text, status)
      this.classList.add("agent-step")
      this.#parts = { text, status }
    }
    this.attributeChangedCallback()
  }

  attributeChangedCallback() {
    if (!this.#parts) return
    const status = this.getAttribute("status") ?? "running"
    this.dataset.status = status
    this.#parts.status.textContent = stepText[status] ?? status
  }
}

/**
 * <uiset-agent-approvals> shows `approvals` (from createApprovals) as cards: the step in
 * words, Allow and Don't allow. Agents usually ask after opening a modal, whose backdrop
 * covers the page; the cards go to the top layer above it, and stay usable while it's open.
 */
class UISetAgentApprovals extends ElementBase {
  #approvals?: Approvals
  #stop?: () => void
  #parts?: { live: HTMLElement; waiting: HTMLElement; layer: HTMLElement }
  #unbind?: () => void

  get approvals() {
    return this.#approvals
  }
  set approvals(v: Approvals | undefined) {
    this.#stop?.()
    this.#approvals = v
    this.#stop = v ? (() => { const off = v.subscribe(() => this.render()); return () => void off() })() : undefined
    this.render()
  }

  connectedCallback() {
    if (!this.#parts) {
      const live = h("p", { class: "agent-visually-hidden", role: "status" })
      const waiting = h("p", { class: "agent-approvals-waiting" }, "Waiting for your answer…")
      const layer = h("div", { popover: "manual", role: "group", "aria-label": "Agent requests", class: "agent-approvals" })
      this.replaceChildren(live, waiting, layer)
      this.#parts = { live, waiting, layer }
    }
    this.#unbind = bindPersistentLayer(this.#parts.layer)
    upgradeProperties(this, ["approvals"])
    this.render()
  }

  disconnectedCallback() {
    this.#unbind?.()
  }

  private render() {
    const parts = this.#parts
    if (!parts) return
    const pending = this.#approvals?.pending() ?? []
    const latest = pending.at(-1)
    parts.live.textContent = latest ? `The agent is waiting for you: ${latest.message}` : ""
    parts.waiting.style.display = pending.length ? "" : "none"
    // A card already shown keeps its element, so focus on its button stays.
    const shown = new Map([...parts.layer.children].map((card) => [(card as HTMLElement).dataset.id, card as HTMLElement]))
    parts.layer.replaceChildren(
      ...pending.map((approval) => {
        const kept = shown.get(approval.id)
        if (kept) return kept
        return h(
          "div",
          { class: "agent-approval", "data-id": approval.id },
          h("p", { class: "agent-approval-ask" }, "The agent wants to:"),
          h("blockquote", null, approval.message),
          h(
            "div",
            { class: "agent-approval-actions" },
            button("Allow", {}, () => this.#approvals?.approve(approval.id)),
            button("Don’t allow", { "data-variant": "outline" }, () => this.#approvals?.deny(approval.id)),
          ),
        )
      }),
    )
    const layer = parts.layer as HTMLElement & { showPopover?: () => void; hidePopover?: () => void }
    if (typeof layer.showPopover !== "function") return
    const open = (() => {
      try {
        return layer.matches(":popover-open")
      } catch {
        return false
      }
    })()
    if (pending.length) {
      // Showing it again moves it above anything that opened since.
      if (open) layer.hidePopover!()
      layer.showPopover()
    } else if (open) layer.hidePopover!()
  }
}

/**
 * <uiset-agent-activity source="agent"> lists the changes `history` (from createHistory)
 * recorded for an agent, newest first: Show highlights the control, and Undo agent changes
 * puts back what the agent changed, leaving what people changed.
 */
class UISetAgentActivity extends ElementBase {
  static observedAttributes = ["source"]
  #history?: History
  #stop?: () => void
  #problem: string | null = null

  get history() {
    return this.#history
  }
  set history(v: History | undefined) {
    this.#stop?.()
    this.#history = v
    this.#stop = v ? (() => { const off = v.subscribe(() => this.render()); return () => void off() })() : undefined
    this.render()
  }

  connectedCallback() {
    upgradeProperties(this, ["history"])
    this.classList.add("agent-activity")
    this.render()
  }
  attributeChangedCallback() {
    this.render()
  }

  /** Whose changes this lists. An attribute and a property. */
  get source(): string {
    return this.getAttribute("source") ?? "agent"
  }
  set source(value: string | null) {
    attr(this, "source", value)
  }

  private async undo() {
    const missed = (await this.#history?.undoSource(this.source)) ?? []
    this.#problem = missed.length ? `Couldn't put back ${missed.length} change${missed.length === 1 ? "" : "s"}: those controls are gone or locked. Change them yourself.` : null
    this.render()
  }

  private render() {
    if (!this.isConnected) return
    const entries = (this.#history?.entries() ?? []).filter((entry) => entry.source === this.source)
    const active = entries.filter((entry) => !entry.reverted)
    const hadFocus = this.contains(document.activeElement)
    const undo = button("Undo agent changes", { "data-variant": "outline", disabled: !active.length }, () => void this.undo())
    this.replaceChildren(
      h("div", { class: "agent-activity-header" }, h("p", null, active.length ? `${active.length} change${active.length === 1 ? "" : "s"} by the agent` : "No changes to undo"), undo),
      ...(this.#problem ? [h("p", { class: "agent-activity-problem", role: "alert" }, this.#problem)] : []),
      entries.length === 0
        ? h("p", { class: "agent-empty" }, "Nothing yet. Changes the agent makes show up here, and you can undo them.")
        : h(
            "ol",
            { class: "agent-activity-list" },
            ...[...entries].reverse().map((entry) =>
              h(
                "li",
                { "data-reverted": entry.reverted },
                h("span", null, describeEntry(entry)),
                entry.reverted ? h("span", { class: "agent-activity-badge" }, "Undone") : button("Show", { "data-variant": "ghost", "aria-label": `Show ${entry.label}` }, () => highlightElement(elementOf(entry.ref))),
              ),
            ),
          ),
    )
    // Undo turns itself off once it's done: focus stays in the list rather than the page.
    if (hadFocus && !this.contains(document.activeElement)) this.querySelector<HTMLElement>("button:not([disabled])")?.focus() ?? undo.querySelector("button")?.focus()
  }
}

/** <uiset-agent-snapshot within="#settings"> is a table of what `agent` can see: each control, its kind, state and actions. */
class UISetAgentSnapshot extends ElementBase {
  static observedAttributes = ["within"]
  #agent?: Agent
  #stop?: () => void
  #frame = 0

  get agent() {
    return this.#agent
  }
  set agent(v: Agent | undefined) {
    this.#stop?.()
    this.#agent = v
    this.#stop = v ? (() => { const off = v.subscribe(() => this.schedule()); return () => void off() })() : undefined
    this.schedule()
  }

  connectedCallback() {
    upgradeProperties(this, ["agent"])
    this.classList.add("agent-snapshot-view")
    this.schedule()
  }
  attributeChangedCallback() {
    this.schedule()
  }

  private schedule() {
    cancelAnimationFrame(this.#frame)
    this.#frame = requestAnimationFrame(() => this.render())
  }

  private render() {
    if (!this.isConnected) return
    const selector = this.getAttribute("within")
    const root = selector ? document.querySelector(selector) : null
    const entries = (this.#agent?.snapshot() ?? []).filter((entry) => !entry.offPage && entry.component !== "more" && (!root || root.contains(elementOf(entry.ref) ?? null)))
    const stateOf = (entry: AgentComponent) => {
      const value = entry.checked ?? entry.value ?? entry.open
      if (value === undefined || value === null) return "—"
      return typeof value === "string" ? `“${value}”` : String(value)
    }
    this.replaceChildren(
      h(
        "table",
        null,
        h("caption", { class: "agent-visually-hidden" }, "What the agent can see on this page"),
        h("thead", null, h("tr", null, ...["Label", "Kind", "State", "Actions"].map((text) => h("th", { scope: "col" }, text)))),
        h(
          "tbody",
          null,
          ...entries.map((entry) =>
            h("tr", null, h("th", { scope: "row" }, entry.label ?? "Unnamed"), h("td", null, entry.component), h("td", null, entry.confirm ? "Needs you" : stateOf(entry)), h("td", null, entry.actions.join(", "))),
          ),
        ),
      ),
    )
  }
}

function defineAgentConsole() {
  defineElement("uiset-agent-console", UISetAgentConsole)
  defineElement("uiset-agent-step", UISetAgentStep)
  defineElement("uiset-agent-approvals", UISetAgentApprovals)
  defineElement("uiset-agent-activity", UISetAgentActivity)
  defineElement("uiset-agent-snapshot", UISetAgentSnapshot)
}

export { defineAgentConsole }
export { UISetAgentConsole, UISetAgentStep, UISetAgentApprovals, UISetAgentActivity, UISetAgentSnapshot }
