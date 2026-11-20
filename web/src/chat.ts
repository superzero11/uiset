// Chat for Web Components, shaped like the messages AI apps already hold: <uiset-chat> takes
// `messages`, each with `parts` (text, reasoning, tool calls, sources, files, tasks), the
// format AI SDK's useChat produces in Vue, Svelte and plain JavaScript. It draws them the way
// the React chat kit does, with the same CSS: a log that follows new text, markdown with
// highlighted code, reasoning that opens while the model thinks, tool calls and their
// approvals, sources, and actions under each answer. <uiset-chat-composer> is the message box
// and <uiset-chat-threads> the list of chats.
//
// A message keeps its element, and each part its own, as text streams in: open disclosures,
// a code block's Wrap and colors, and focus all stay, and a screen reader hears what's new
// rather than the conversation again.
import { announce, createInputHistory, isComposing } from "@ui-sdk/core"
import "@ui-sdk/web/alert-dialog"
import "@ui-sdk/web/avatar"
import "@ui-sdk/web/button"
import "@ui-sdk/web/collapsible"
import "@ui-sdk/web/field"
import "@ui-sdk/web/file-input"
import "@ui-sdk/web/input"
import "@ui-sdk/web/menu"
import "@ui-sdk/web/meter"
import "@ui-sdk/web/select"
import "@ui-sdk/web/toggle"
import "@ui-sdk/web/toolbar"
import "@ui-sdk/web/trigger-menu"
import { actionName } from "@/registry/uiset/ui/chat/opening"
import { tokenize } from "@/registry/uiset/ui/code/highlight"
import "@/registry/uiset/ui/chat/chat.css"
import "@/registry/uiset/ui/code/code.css"
import "./chat.css"
import { attr, defineElement, ElementBase, Evented, h, isOn, keepInputInside, place, reportInput, upgradeProperties } from "./dom"
import { nameScrollArea, scrollArea, type ScrollAreaApi } from "./scroll"
import { safeUrl, sameOriginImages } from "./urls"

type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied"
type TaskStatus = "pending" | "running" | "done" | "failed"

type ChatPart =
  | { type: "text"; text: string; state?: "streaming" | "done" }
  | { type: "reasoning"; text: string; state?: "streaming" | "done"; seconds?: number }
  | { type: "source-url"; url: string; title?: string }
  | { type: "source-document"; title: string; filename?: string; mediaType?: string }
  | { type: "file"; mediaType: string; url: string; filename?: string }
  | { type: "tasks"; title?: string; tasks: { id: string; title: string; status: TaskStatus; detail?: string }[] }
  | { type: "checkpoint"; id: string; label?: string; time?: string | Date }
  | { type: "subagent"; id: string; name: string; task?: string; status: "running" | "done" | "failed"; seconds?: number; parts: ChatPart[] }
  | { type: string; toolName?: string; title?: string; state?: ToolState | string; input?: unknown; output?: unknown; errorText?: string }

type ChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  parts: ChatPart[]
  name?: string
  avatar?: { src?: string; fallback: string }
  time?: Date
}

type Feedback = "good" | "bad"

const icons = {
  copy: "M8 8h11v11H8zM5 16V5h11",
  check: "M5 12.5l4.5 4.5L19 7.5",
  retry: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  up: "M7 11v9H4v-9zM7 11l4-8a2.5 2.5 0 0 1 2.5 2.5V9h5.2a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.5 20H7",
  down: "M7 13V4H4v9zM7 13l4 8a2.5 2.5 0 0 0 2.5-2.5V15h5.2a2 2 0 0 0 2-2.3l-1.2-7A2 2 0 0 0 17.5 4H7",
  paperclip: "M15.5 7.5l-6.8 6.8a2 2 0 0 0 2.8 2.8l7-7a4 4 0 0 0-5.6-5.6l-7 7a6 6 0 0 0 8.5 8.5l6.3-6.3",
  remove: "M6 6l12 12M18 6L6 18",
  more: "M4.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M10.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M16.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0",
}

function icon(path: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("focusable", "false")
  svg.setAttribute("class", "chat-icon")
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path")
  p.setAttribute("d", path)
  svg.append(p)
  return svg
}

const hidden = (text: string) => h("span", { class: "chat-visually-hidden" }, text)
const isTool = (part: ChatPart) => part.type === "dynamic-tool" || part.type.startsWith("tool-")
const textOf = (message: ChatMessage) =>
  message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n")

/** A signature for "did this change": BigInt and circular tool input or output can't stop it. */
function signature(value: unknown) {
  const seen = new WeakSet<object>()
  try {
    return JSON.stringify(value, (_key, v) => {
      if (typeof v === "bigint") return `${v}n`
      if (v && typeof v === "object") {
        if (seen.has(v)) return "[circular]"
        seen.add(v)
      }
      return v
    })
  } catch {
    return String(Math.random())
  }
}

/* ------------------------------------------------------------------ Markdown */

// The parser loads on first use, so pages without a chat don't carry it.
let markdown: typeof import("./markdown") | null = null
let loading: Promise<unknown> | null = null
function withMarkdown(then: () => void) {
  if (markdown) return true
  loading ??= import("./markdown").then((m) => (markdown = m))
  void loading.then(then)
  return false
}

type CodeFigure = { figure: HTMLElement; code: HTMLElement; text: string; language?: string; colored: string | null; timer?: ReturnType<typeof setTimeout> }

/** A code block: its language or file name, a Wrap toggle, Copy, and shiki's colors. */
function codeFigure(text: string, language: string | undefined, name: string): CodeFigure {
  const title = language ?? "Code"
  const code = h("code", { translate: "no" }, text)
  const view: CodeFigure = { figure: h("figure"), code, text, language, colored: null }
  const copyButton = h("button", { type: "button", "data-variant": "ghost", "aria-label": `Copy ${title}` }, icon(icons.copy))
  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(view.text)
    copyButton.replaceChildren(icon(icons.check))
    announce("Copied")
    setTimeout(() => copyButton.replaceChildren(icon(icons.copy)), 1600)
  })
  const toggle = h("ui-toggle", null, h("button", { type: "button", "aria-label": "Wrap lines", class: "chat-code-toggle" }, "Wrap"))
  // Code reads left to right in every language.
  const figure = h(
    "figure",
    { class: "chat-code" },
    h("figcaption", { class: "chat-code-header" }, h("span", { translate: "no" }, title), h("span", { class: "chat-code-actions" }, toggle, h("ui-button", null, copyButton))),
    scrollArea(h("pre", null, code), { axis: "x", frame: { class: "chat-code-scroll", dir: "ltr" }, viewport: { role: "region", "aria-label": name } }).root,
  )
  toggle.addEventListener("pressedchange", (event) => figure.toggleAttribute("data-wrap", !!(event as CustomEvent<{ value: boolean }>).detail.value))
  view.figure = figure
  return view
}

/** New text for a figure: shown at once, colored once it stops changing for a moment. */
function updateFigure(view: CodeFigure, text: string, settled: boolean) {
  if (view.text !== text) {
    view.text = text
    if (view.colored !== text) view.code.textContent = text
  }
  clearTimeout(view.timer)
  if (!view.language || view.colored === text) return
  const color = () => {
    const wanted = view.text
    void tokenize(wanted, view.language!)
      .then((lines) => {
        if (!lines || view.text !== wanted) return
        view.colored = wanted
        view.code.replaceChildren(
          ...lines.map((line) => {
            const row = h("span", { class: "chat-code-line" })
            for (const token of line) {
              const span = h("span", null, token.content)
              if (token.color) span.style.color = token.color
              row.append(span)
            }
            row.append("\n")
            return row
          }),
        )
      })
      .catch(() => {})
  }
  // While a block streams it's colored when it pauses, not on every token.
  if (settled) color()
  else view.timer = setTimeout(color, 400)
}

/* --------------------------------------------------------------------- Parts */

const toolWords: Record<string, [status: string, words: string]> = {
  "input-streaming": ["pending", "Queued"],
  "input-available": ["running", "Running"],
  "approval-requested": ["approval", "Needs your approval"],
  "approval-responded": ["running", "Approved, running"],
  "output-available": ["done", "Done"],
  "output-error": ["error", "Failed"],
  "output-denied": ["denied", "Not allowed"],
}

const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })

function json(value: unknown) {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? `${v}n` : v), 2)
  } catch {
    return String(value)
  }
}

/** A tool's input or output, in a scroll area of its own named by `label`. */
function toolCode(code: Node, label: string) {
  return scrollArea(h("pre", null, code), { axis: "both", frame: { class: "chat-tool-code", dir: "ltr" }, viewport: { role: "region", "aria-label": label } }).root
}

function host(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return href
  }
}

/* --------------------------------------------------------------------- Chat */

type PartView = { sig: string; node: HTMLElement; figures?: CodeFigure[] }
type MessageView = {
  el: HTMLElement
  body: HTMLElement
  meta: HTMLElement
  metaSig: string
  avatarSig: string
  content: HTMLElement
  parts: PartView[]
  sources?: { sig: string; node: HTMLElement }
  actions?: { sig: string; node: HTMLElement | null }
}

/**
 * <uiset-chat label="Conversation"> with `messages` and `status` ("ready", "submitted",
 * "streaming" or "error", as useChat reports it). Events: `retry` and `edit` with a message
 * id, `feedbackchange` with `{ value, id }`, `suggestion` with its text, and `approve` with
 * `{ value: approved, id, part }` for a tool call waiting on the person. `allowImage(url)`
 * decides which images in answers load (same-origin, data: and blob: by default).
 */
/** What `<uiset-chat>` fires, each naming the message by its `id`. */
type UISetChatEvents = {
  /** Retry on the last response, or on the error: `value` is the response's id, if any. */
  retry: CustomEvent<{ value: string | null }>
  suggestion: CustomEvent<{ value: string }>
  /** Allow or Deny on a tool call that needs approval. */
  approve: CustomEvent<{ value: boolean; id: string; part: number }>
  /** Restore on a checkpoint: `value` is the checkpoint's id, `id` its message's. */
  restore: CustomEvent<{ value: string; id: string; part: number }>
  feedbackchange: CustomEvent<{ value: Feedback | null; id: string }>
  /** Edit on a user's message, with `editable`. */
  edit: CustomEvent<{ value: string }>
}

class UISetChat extends Evented<UISetChatEvents>() {
  static observedAttributes = ["label", "empty-title", "editable"]
  #messages: ChatMessage[] = []
  #status = "ready"
  #suggestions: string[] = []
  #feedback: Record<string, Feedback> = {}
  #allowImage: (url: URL) => boolean = sameOriginImages
  #queued = false
  #views = new Map<string, MessageView>()
  #dom?: { area: HTMLElement & { api: ScrollAreaApi }; scroller: HTMLElement; log: HTMLElement; jump: HTMLElement; jumpButton: HTMLButtonElement; empty: HTMLElement; thinking: HTMLElement; error: HTMLElement }
  // Open or closed, per disclosure, as the person left it.
  #open = new Map<string, boolean>()
  #cleanups: (() => void)[] = []

  constructor() {
    super()
    upgradeProperties(this, ["messages", "status", "suggestions", "feedback", "allowImage"])
  }

  get messages() {
    return this.#messages
  }
  set messages(v: ChatMessage[]) {
    this.#messages = v ?? []
    this.schedule()
  }
  get status() {
    return this.#status
  }
  set status(v: string) {
    this.#status = v
    this.schedule()
  }
  get suggestions() {
    return this.#suggestions
  }
  set suggestions(v: string[]) {
    this.#suggestions = v ?? []
    this.schedule()
  }
  /** Feedback by message id. Setting it fires no event; a person's choice does. */
  get feedback() {
    return this.#feedback
  }
  set feedback(v: Record<string, Feedback>) {
    this.#feedback = v ?? {}
    this.schedule()
  }
  get allowImage() {
    return this.#allowImage
  }
  set allowImage(v: (url: URL) => boolean) {
    this.#allowImage = v ?? sameOriginImages
    // Images already drawn under the old rule are drawn again.
    for (const view of this.#views.values()) view.parts = []
    this.schedule()
  }

  attributeChangedCallback(name: string) {
    // Only Edit depends on an attribute; the rest is read as it draws.
    if (name === "editable") for (const view of this.#views.values()) view.actions = undefined
    this.schedule()
  }

  connectedCallback() {
    if (!this.#dom) {
      this.classList.add("chat-thread")
      const log = h("div", { role: "log", class: "chat-thread-log" })
      // The scroll area follows new text until you scroll up (stick-to-end); away from the end,
      // Jump to latest brings you back.
      const area = scrollArea(log, { frame: { class: "chat-thread-frame", "stick-to-end": true }, viewport: { class: "chat-thread-scroller", role: "region" } })
      const scroller = area.view
      const root = area.root as HTMLElement & { api: ScrollAreaApi }
      const jumpButton = h("button", { type: "button", "data-variant": "outline", class: "chat-thread-jump" }, "Jump to latest") as HTMLButtonElement
      jumpButton.addEventListener("click", () => {
        root.api.scrollToEnd({ behavior: "smooth" })
        // The button goes once the log is at its end; focus goes to the log.
        scroller.focus({ preventScroll: true })
      })
      const jump = h("ui-button", null, jumpButton)
      const empty = h("div", { class: "chat-empty" })
      const thinking = h("div", { class: "chat-message", "data-from": "assistant", "aria-busy": "true" }, h("div", { class: "chat-message-body" }, h("span", { class: "chat-shimmer" }, "Thinking…")))
      const error = h("div", { class: "chat-error", role: "alert" })
      this.replaceChildren(area.root, jump)
      this.#dom = { area: root, scroller, log, jump, jumpButton, empty, thinking, error }
    }
    this.#cleanups.forEach((cleanup) => cleanup())
    const scroller = this.#dom.scroller
    const onScroll = () => this.showJump()
    scroller.addEventListener("scroll", onScroll, { passive: true })
    this.#cleanups = [() => scroller.removeEventListener("scroll", onScroll)]
    this.schedule()
  }

  disconnectedCallback() {
    this.#cleanups.forEach((cleanup) => cleanup())
    this.#cleanups = []
  }

  private showJump() {
    if (this.#dom) this.#dom.jump.style.display = this.#dom.area.api && !this.#dom.area.api.isAtEnd() ? "" : "none"
  }

  private schedule() {
    if (this.#queued) return
    this.#queued = true
    queueMicrotask(() => {
      this.#queued = false
      if (this.isConnected) this.render()
    })
  }

  private emit(type: string, detail: object) {
    this.dispatchEvent(new CustomEvent(type, { detail }))
  }

  private render() {
    const dom = this.#dom
    if (!dom) return
    const focusInside = this.contains(document.activeElement)
    nameScrollArea(dom.area, this.getAttribute("label") ?? "Conversation")
    this.showJump()
    const messages = this.#messages
    const status = this.#status
    const streaming = status === "streaming"
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
    const nodes: HTMLElement[] = []
    if (!messages.length) {
      dom.empty.replaceChildren(h("p", { class: "chat-empty-title" }, this.getAttribute("empty-title") ?? "How can I help?"))
      if (this.#suggestions.length) dom.empty.append(this.suggestionsBar())
      nodes.push(dom.empty)
    }
    const index = new Map(messages.map((m, i) => [m.id, i]))
    for (const message of messages) {
      const live = streaming && message === messages.at(-1) && message.role === "assistant"
      nodes.push(this.drawMessage(message, live, message === lastAssistant, index.get(message.id)! + 1))
    }
    for (const [id, view] of this.#views) if (!index.has(id)) (view.el.remove(), this.#views.delete(id))
    // Submitted and nothing back yet: the model is thinking.
    if (status === "submitted") nodes.push(dom.thinking)
    if (status === "error") {
      const retry = h("button", { type: "button", "data-variant": "outline" }, "Retry")
      retry.addEventListener("click", () => this.emit("retry", { value: lastAssistant?.id ?? null }))
      dom.error.replaceChildren(h("span", null, "Something went wrong."), h("ui-button", null, retry))
      nodes.push(dom.error)
    }
    // Only what's out of place moves, so a screen reader hears what's new.
    place(dom.log, nodes, () => true)
    // Focus on something that's gone (an action, a hidden control) goes to the log.
    if (focusInside && !this.contains(document.activeElement)) dom.scroller.focus({ preventScroll: true })
  }

  private suggestionsBar() {
    const bar = h("ui-toolbar", { class: "chat-suggestions", "aria-label": "Suggestions" })
    for (const suggestion of this.#suggestions) {
      const button = h("button", { type: "button" }, suggestion)
      button.addEventListener("click", () => this.emit("suggestion", { value: suggestion }))
      bar.append(h("ui-toolbar-button", null, button))
    }
    return bar
  }

  private drawMessage(message: ChatMessage, live: boolean, last: boolean, ordinal: number) {
    let view = this.#views.get(message.id)
    if (!view) {
      const meta = h("div", { class: "chat-message-meta" })
      const content = h("div", { class: "chat-message-content" })
      const body = h("div", { class: "chat-message-body" }, meta, content)
      const el = h("div", { class: "chat-message", "data-id": message.id }, body)
      view = { el, body, meta, metaSig: "", avatarSig: "", content, parts: [] }
      this.#views.set(message.id, view)
    }
    const el = view.el
    el.dataset.from = message.role
    el.toggleAttribute("data-streaming", live)
    if (live) el.setAttribute("aria-busy", "true")
    else el.removeAttribute("aria-busy")
    const who = message.name ?? (message.role === "user" ? "You" : message.role === "assistant" ? "Assistant" : "System")
    const metaSig = signature([who, message.time?.toISOString()])
    if (view.metaSig !== metaSig) {
      view.metaSig = metaSig
      view.meta.replaceChildren(h("span", { class: "chat-message-name" }, who))
      if (message.time) view.meta.append(h("time", { datetime: message.time.toISOString() }, new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(message.time)))
    }
    const avatarSig = signature([message.avatar, who])
    if (view.avatarSig !== avatarSig) {
      view.avatarSig = avatarSig
      el.querySelector(":scope > ui-avatar")?.remove()
      if (message.avatar)
        el.prepend(
          h(
            "ui-avatar",
            { class: "chat-message-avatar", role: "img", "aria-label": who },
            message.avatar.src && safeUrl(message.avatar.src, ["data", "blob"]) ? h("img", { src: message.avatar.src, alt: "" }) : null,
            h("ui-avatar-fallback", null, message.avatar.fallback),
          ),
        )
    }

    // Each part is drawn again only when it changed; what it holds (open, wrapped, focused) stays.
    const sources = message.parts.filter((p) => p.type === "source-url" || p.type === "source-document")
    const nodes: HTMLElement[] = []
    message.parts.forEach((part, i) => {
      const streamingPart = live && (part as { state?: string }).state !== "done"
      const sig = signature([part, streamingPart, markdown !== null])
      const known = view!.parts[i]
      if (known && known.sig === sig) {
        nodes.push(known.node)
        return
      }
      const drawn = this.drawPart(message, part, i, streamingPart, ordinal, known)
      if (!drawn) {
        view!.parts[i] = { sig, node: h("span", { hidden: true }) }
        return
      }
      view!.parts[i] = { sig, ...drawn }
      nodes.push(drawn.node)
    })
    view.parts.length = message.parts.length
    // Sources come once the answer is complete, so they don't sit ahead of text still arriving.
    if (sources.length && !live) {
      const sig = signature(sources)
      if (view.sources?.sig !== sig) view.sources = { sig, node: this.drawSources(message, sources) }
      nodes.push(view.sources.node)
    } else view.sources = undefined
    place(view.content, nodes, () => true)

    // The actions are their own: a new answer or a feedback choice redraws only them.
    const actionSig = signature([live, last, this.#feedback[message.id] ?? null, textOf(message), message.role, isOn(this, "editable")])
    if (view.actions?.sig !== actionSig) {
      const focusKey = (document.activeElement as HTMLElement | null)?.closest?.("[data-focus-key]")?.getAttribute("data-focus-key")
      const hadFocus = !!view.actions?.node?.contains(document.activeElement)
      view.actions?.node?.remove()
      const node = live ? null : this.actions(message, last)
      view.actions = { sig: actionSig, node }
      if (node) view.body.append(node)
      if (hadFocus && node) node.querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`)?.focus()
    }
    return el
  }

  private disclosure(key: string, className: string, defaultOpen: boolean, trigger: Node[], panel: Node[], panelClass?: string) {
    const open = this.#open.get(key) ?? defaultOpen
    const node = h(
      "ui-collapsible",
      { class: className, "default-open": open },
      h("ui-collapsible-trigger", null, h("button", { type: "button", class: "chat-disclosure", "data-focus-key": key }, ...trigger)),
      h("ui-collapsible-panel", { class: panelClass }, ...panel),
    )
    node.addEventListener("openchange", (event) => this.#open.set(key, !!(event as CustomEvent<{ value: boolean }>).detail.value))
    return node
  }

  private drawPart(message: ChatMessage, part: ChatPart, index: number, streaming: boolean, ordinal: number, known?: PartView): { node: HTMLElement; figures?: CodeFigure[] } | null {
    const key = `${message.id}:${index}`
    // A part redrawn while it has focus gets it back on the same control.
    const focusKey = known?.node.contains(document.activeElement) ? (document.activeElement as HTMLElement).closest("[data-focus-key]")?.getAttribute("data-focus-key") : null
    const result = this.partNode(message, part, index, streaming, ordinal, key, known)
    if (result && known && known.node !== result.node) {
      known.node.replaceWith(result.node)
      if (focusKey) result.node.querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`)?.focus()
    }
    return result
  }

  private partNode(message: ChatMessage, part: ChatPart, index: number, streaming: boolean, ordinal: number, key: string, known?: PartView): { node: HTMLElement; figures?: CodeFigure[] } | null {
    if (part.type === "text") {
      const text = (part as { text: string }).text
      const box = known?.node.classList.contains("chat-response") ? known.node : h("div", { class: "chat-response" })
      if (message.role === "user") {
        box.textContent = text
        return { node: box }
      }
      if (!withMarkdown(() => this.schedule())) {
        box.textContent = text
        return { node: box }
      }
      // Code figures are kept by their place in the text: their Wrap and colors survive
      // every token, and only their text changes.
      const old = known?.figures ?? []
      const figures: CodeFigure[] = []
      const nodes = markdown!.renderMarkdown(text, streaming, {
        allowImage: this.#allowImage,
        idPrefix: `m${ordinal}`,
        code: (code, language, n) => {
          const previous = old[n]
          const view = previous && previous.language === language ? previous : codeFigure(code, language, `${language ?? "Code"}, block ${n + 1} of message ${ordinal}`)
          updateFigure(view, code, !streaming)
          figures.push(view)
          return view.figure
        },
      })
      // A kept figure is put back in place; if it had focus, focus goes back to it.
      const active = document.activeElement as HTMLElement | null
      const focused = active && box.contains(active) ? active : null
      box.replaceChildren(...nodes)
      if (focused && focused.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true })
      return { node: box, figures }
    }
    if (part.type === "reasoning") {
      const reasoning = part as { text: string; state?: string; seconds?: number }
      const thinking = streaming
      // Opens while the model thinks, closes when it's done, unless the person chose.
      const chosen = this.#open.has(key)
      const node = this.disclosure(
        key,
        "chat-reasoning",
        chosen ? this.#open.get(key)! : thinking,
        [thinking ? h("span", { class: "chat-shimmer" }, "Thinking…") : h("span", null, reasoning.seconds ? `Thought for ${Math.max(1, Math.round(reasoning.seconds))}s` : "Reasoning")],
        [document.createTextNode(reasoning.text)],
        "chat-reasoning-panel",
      )
      if (!chosen) this.#open.delete(key)
      return { node }
    }
    if (part.type === "file") {
      const file = part as { mediaType: string; url: string; filename?: string }
      const url = safeUrl(file.url, ["data", "blob"])
      if (!url) return { node: h("span", null, file.filename ?? "File") }
      if (file.mediaType.startsWith("image/"))
        return { node: h("figure", { class: "chat-image" }, h("img", { src: url, alt: file.filename ?? "", loading: "lazy", decoding: "async" }), file.filename ? h("figcaption", null, file.filename) : null) }
      return { node: h("a", { href: url, download: file.filename ?? "" }, file.filename ?? "File") }
    }
    if (part.type === "tasks") {
      const { title = "Plan", tasks } = part as { title?: string; tasks: { id: string; title: string; status: TaskStatus; detail?: string }[] }
      const words: Record<TaskStatus, string> = { pending: "To do", running: "In progress", done: "Done", failed: "Failed" }
      const done = tasks.filter((t) => t.status === "done").length
      return {
        node: this.disclosure(
          key,
          "chat-tasks",
          true,
          [h("span", null, title), hidden(", "), h("span", { class: "chat-disclosure-meta" }, `${done} of ${tasks.length} done`)],
          [
            h(
              "ol",
              { class: "chat-task-list" },
              ...tasks.map((t) =>
                h(
                  "li",
                  { "data-status": t.status },
                  h("span", { class: "chat-task-mark", "aria-hidden": "true" }),
                  h("span", { class: "chat-task-title" }, t.title),
                  h("span", { class: "chat-task-status" }, words[t.status]),
                  t.detail ? h("span", { class: "chat-task-detail" }, t.detail) : null,
                ),
              ),
            ),
          ],
        ),
      }
    }
    if (part.type === "checkpoint") {
      const checkpoint = part as { id: string; label?: string; time?: string | Date }
      const label = checkpoint.label ?? "Checkpoint"
      const time = checkpoint.time === undefined ? null : new Date(checkpoint.time)
      const when = time ? clock.format(time) : ""
      const restore = h(
        "button",
        { type: "button", "data-variant": "ghost", "aria-label": `Restore ${label}${when ? `, ${when}` : ""}`, "data-agent-confirm": "Puts the conversation back to this checkpoint", "data-focus-key": `${key}:restore` },
        "Restore",
      )
      restore.addEventListener("click", () => this.emit("restore", { value: checkpoint.id, id: message.id, part: index }))
      return {
        node: h(
          "div",
          { class: "chat-checkpoint", "data-slot": "chat-checkpoint" },
          h("span", { class: "chat-checkpoint-text" }, label, time ? ", " : null, time ? h("time", { datetime: time.toISOString() }, when) : null),
          h("ui-button", null, restore),
        ),
      }
    }
    if (part.type === "subagent") {
      const run = part as { name: string; task?: string; status: "running" | "done" | "failed"; seconds?: number; parts: ChatPart[] }
      const status =
        run.status === "running" ? h("span", { class: "chat-shimmer" }, "Working…") : run.status === "failed" ? "Failed" : run.seconds ? `Done in ${Math.max(1, Math.round(run.seconds))}s` : "Done"
      // The run's steps are the same parts, drawn inside it.
      const steps = run.parts.map((inner, i) => this.partNode(message, inner, i, streaming && run.status === "running", ordinal, `${key}:${i}`)?.node).filter((n): n is HTMLElement => !!n)
      const node = this.disclosure(
        key,
        "chat-subagent",
        run.status === "failed",
        [
          h("span", { class: "chat-tool-name" }, h("span", { class: "chat-tool-mark", "aria-hidden": "true" }), h("span", null, run.name)),
          ...(run.task ? [hidden(", "), h("span", { class: "chat-subagent-task" }, run.task)] : []),
          hidden(", "),
          h("span", { class: "chat-tool-status" }, status),
        ],
        steps,
        "chat-subagent-panel",
      )
      node.dataset.status = run.status
      return { node }
    }
    if (isTool(part)) return { node: this.drawTool(message, part as { type: string; toolName?: string; title?: string; state?: string; input?: unknown; output?: unknown; errorText?: string }, index, key, ordinal) }
    return null
  }

  private drawTool(message: ChatMessage, part: { type: string; toolName?: string; title?: string; state?: string; input?: unknown; output?: unknown; errorText?: string }, index: number, key: string, ordinal: number) {
    const name = part.toolName ?? part.type.replace(/^tool-/, "")
    const title = part.title ?? name
    const [status, words] = toolWords[part.state ?? "input-available"] ?? ["running", "Running"]
    // Named apart from other calls of the same tool.
    const where = `message ${ordinal}, step ${index + 1}`
    const panel: Node[] = []
    if (part.input !== undefined)
      panel.push(h("section", null, h("h4", null, "Input"), toolCode(h("code", { translate: "no" }, json(part.input)), `${title} input, ${where}`)))
    if (part.errorText) panel.push(h("section", null, h("h4", null, "Error"), h("p", { class: "chat-tool-error" }, part.errorText)))
    else if (part.output !== undefined)
      panel.push(h("section", null, h("h4", null, "Output"), toolCode(h("code", { translate: "no" }, json(part.output)), `${title} output, ${where}`)))
    if (status === "approval") {
      const decide = (approved: boolean) => this.emit("approve", { value: approved, id: message.id, part: index })
      const allow = h("button", { type: "button", "data-variant": "solid", "data-agent-confirm": `Runs ${title}`, "data-focus-key": `${key}:allow` }, "Allow")
      const deny = h("button", { type: "button", "data-variant": "outline", "data-focus-key": `${key}:deny` }, "Deny")
      allow.addEventListener("click", () => decide(true))
      deny.addEventListener("click", () => decide(false))
      panel.push(h("div", { class: "chat-dialog-actions" }, h("ui-button", null, deny), h("ui-button", null, allow)))
    }
    const node = this.disclosure(
      key,
      "chat-tool",
      status === "approval" || status === "error",
      [h("span", { class: "chat-tool-name" }, h("span", { class: "chat-tool-mark", "aria-hidden": "true" }), h("span", { translate: "no" }, title)), hidden(", "), h("span", { class: "chat-tool-status" }, words)],
      panel,
      "chat-tool-panel",
    )
    node.dataset.status = status
    return node
  }

  private drawSources(message: ChatMessage, sources: ChatPart[]) {
    const items = sources.map((s) => {
      if (s.type === "source-url") {
        const source = s as { url: string; title?: string }
        const url = safeUrl(source.url)
        return h(
          "li",
          null,
          url ? h("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, source.title ?? host(source.url), hidden(" (opens in a new tab)")) : h("span", null, source.title ?? source.url),
          h("span", { class: "chat-source-host" }, host(source.url)),
        )
      }
      const doc = s as { title: string; filename?: string }
      return h("li", null, h("span", null, doc.title), doc.filename ? h("span", { class: "chat-source-host" }, doc.filename) : null)
    })
    return this.disclosure(`${message.id}:sources`, "chat-sources", false, [h("span", null, `Used ${sources.length} source${sources.length === 1 ? "" : "s"}`)], [h("ol", { class: "chat-source-list" }, ...items)])
  }

  private actions(message: ChatMessage, last: boolean) {
    // Every message has these actions, so each is named with its message's first words: an
    // agent can tell which reply it presses. The toolbar and the feedback group too, and
    // without "message", which the composer is named. The focus key stays the action's.
    const named = (action: string) => actionName(action, textOf(message))
    const toolbar = h("ui-toolbar", { class: "chat-actions", "aria-label": named("Actions") })
    const button = (action: string, path: string, run: () => void) => {
      const el = h("button", { type: "button", "aria-label": named(action), "data-focus-key": action }, icon(path))
      el.addEventListener("click", run)
      toolbar.append(h("ui-toolbar-button", null, el))
    }
    if (message.role === "assistant") {
      const text = textOf(message)
      if (text)
        button("Copy message", icons.copy, async () => {
          await navigator.clipboard.writeText(text)
          announce("Copied")
        })
      if (last) button("Retry message", icons.retry, () => this.emit("retry", { value: message.id }))
      const current = this.#feedback[message.id]
      const group = h(
        "ui-toggle-group",
        { "aria-label": named("Feedback"), "default-value": current ?? "" },
        h("ui-toggle", { value: "good" }, h("button", { type: "button", "aria-label": named("Good response"), "data-focus-key": "good" }, icon(icons.up))),
        h("ui-toggle", { value: "bad" }, h("button", { type: "button", "aria-label": named("Bad response"), "data-focus-key": "bad" }, icon(icons.down))),
      )
      group.addEventListener("valuechange", (event) => {
        const value = ((event as CustomEvent<{ value: string[] }>).detail.value[0] as Feedback | undefined) ?? null
        const next = { ...this.#feedback }
        if (value) next[message.id] = value
        else delete next[message.id]
        // The group already shows the choice; the actions aren't drawn again for it.
        this.#feedback = next
        const view = this.#views.get(message.id)
        if (view?.actions) view.actions.sig = signature([false, last, value, textOf(message), message.role, isOn(this, "editable")])
        this.emit("feedbackchange", { value, id: message.id })
      })
      toolbar.append(group)
      return toolbar
    }
    if (message.role === "user" && isOn(this, "editable")) {
      button("Edit message", icons.edit, () => this.emit("edit", { value: message.id }))
      return toolbar
    }
    return null
  }
}

/* ------------------------------------------------------------------ Composer */

type ComposerItem = { value: string; label: string; description?: string }

/**
 * <uiset-chat-composer label="Message"> fires `send` with `{ text, files }` on Enter or
 * Send (not `submit`, which its own form's native event would share), and `stop` while
 * `running`. `files` is a FileList, as AI SDK's sendMessage takes. `commands` (after "/")
 * and `mentions` (after "@") suggest as you type; `attachments` takes files (its value is the
 * input's accept list, or empty). Up and Down bring back what you sent. Its children go in
 * the toolbar beside Send, like <uiset-chat-model-picker> and <uiset-chat-usage>.
 */
/** What `<uiset-chat-composer>` fires. */
type UISetChatComposerEvents = {
  /** `files` is a FileList, as AI SDK's `sendMessage({ files })` takes. */
  send: CustomEvent<{ text: string; files: FileList }>
  stop: CustomEvent<null>
}

class UISetChatComposer extends Evented<UISetChatComposerEvents>() {
  #draft = ""
  static observedAttributes = ["running", "label", "placeholder", "attachments"]
  #commands: ComposerItem[] = []
  #mentions: ComposerItem[] = []
  #sent: string[] = []
  #files: File[] = []
  #tools?: Node[]
  #dom?: { form: HTMLFormElement; field: HTMLTextAreaElement; send: HTMLButtonElement; stop: HTMLButtonElement; menu: HTMLElement & { triggers?: unknown }; fileInput?: HTMLElement & { value?: File[]; accept?: string } }
  #menuOpen = false
  #history = createInputHistory({
    entries: () => this.#sent,
    read: () => this.#dom?.field.value ?? "",
    write: (value) => this.write(value as string),
  })

  constructor() {
    super()
    upgradeProperties(this, ["commands", "mentions"])
  }

  get commands() {
    return this.#commands
  }
  set commands(v: ComposerItem[]) {
    this.#commands = v ?? []
    if (this.#dom) this.sync()
  }
  get mentions() {
    return this.#mentions
  }
  set mentions(v: ComposerItem[]) {
    this.#mentions = v ?? []
    if (this.#dom) this.sync()
  }

  connectedCallback() {
    upgradeProperties(this, ["value"])
    if (!this.#dom) {
      this.build()
      if (this.#draft) this.#dom!.field.value = this.#draft
    }
    this.sync()
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (!this.#dom) return
    // Attachments on or off rebuilds the box; the text in it stays.
    if (name === "attachments" && (old === null) !== (value === null)) {
      const text = this.#dom.field.value
      this.#dom = undefined
      this.build()
      this.#dom!.field.value = text
    }
    this.sync()
  }

  /** Focuses the message box. */
  override focus(options?: FocusOptions) {
    this.#dom?.field.focus(options)
  }

  /** The text in the message box. Setting it fires nothing, like a text field's. */
  get value() {
    return this.#dom?.field.value ?? this.#draft
  }
  set value(v: string) {
    const text = String(v ?? "")
    if (!this.#dom) {
      this.#draft = text
      return
    }
    if (this.#dom.field.value === text) return
    this.#dom.field.value = text
    this.sync()
  }

  private write(value: string) {
    const field = this.#dom?.field
    if (!field) return
    field.value = value
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }

  private submit() {
    const dom = this.#dom!
    const text = dom.field.value.trim()
    if ((!text && !this.#files.length) || isOn(this, "running")) return
    if (text) this.#sent = [...this.#sent, text]
    this.#history.reset()
    // A FileList, as AI SDK's sendMessage({ files }) takes.
    const transfer = new DataTransfer()
    for (const file of this.#files) transfer.items.add(file)
    this.dispatchEvent(new CustomEvent("send", { detail: { text, files: transfer.files } }))
    this.write("")
    this.#files = []
    if (dom.fileInput) dom.fileInput.value = []
    this.sync()
    // Send turns into Stop: focus stays in the message box.
    dom.field.focus()
  }

  private describeItems(list: HTMLElement) {
    for (const item of list.querySelectorAll<HTMLElement>("ui-trigger-menu-item")) {
      if (item.querySelector(":scope > .chat-menu-hint")) continue
      const value = item.getAttribute("value")
      const description = [...this.#commands, ...this.#mentions].find((entry) => entry.value === value)?.description
      if (description) item.append(h("span", { class: "chat-menu-hint" }, description))
    }
  }

  private build() {
    // Your controls (a model picker, usage) join the toolbar, after Attach.
    this.#tools ??= [...this.children]
    const field = h("textarea", { rows: "1", class: "chat-composer-input" }) as HTMLTextAreaElement
    const list = h("ui-trigger-menu-list")
    const menu = h(
      "ui-trigger-menu",
      null,
      h("ui-trigger-menu-input", null, field),
      h("ui-trigger-menu-content", { class: "chat-menu" }, h("ui-trigger-menu-empty", null, "No matches"), list),
    ) as HTMLElement & { triggers?: unknown }
    menu.addEventListener("openchange", (event) => (this.#menuOpen = !!(event as CustomEvent<{ value: boolean }>).detail.value))
    // The menu draws the items that match; each gets its command's or person's description
    // under its name, as in React.
    new MutationObserver(() => this.describeItems(list)).observe(list, { childList: true, subtree: true })
    const send = h("button", { type: "submit" }, "Send") as HTMLButtonElement
    const stop = h("button", { type: "button", "data-variant": "outline" }, "Stop") as HTMLButtonElement
    stop.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("stop"))
      field.focus()
    })
    const toolbar = h("div", { class: "chat-composer-toolbar" })
    field.addEventListener("input", () => this.sync())
    field.addEventListener("keydown", (event) => {
      // An open menu with suggestions takes Enter; one showing "No matches" doesn't.
      if (this.#menuOpen && list.querySelector("ui-trigger-menu-item")) return
      if (this.#history.keydown(event)) return
      if (event.key === "Enter" && !event.shiftKey && !isComposing(event)) {
        event.preventDefault()
        this.submit()
      }
    })
    const form = h("form", { class: "chat-composer" }) as HTMLFormElement
    // The form's own submit stays inside: the page hears `send`.
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.submit()
    })
    let fileInput: (HTMLElement & { value?: File[] }) | undefined
    if (isOn(this, "attachments")) {
      const files = h("ui-file-input-list", { class: "chat-attachments", "aria-label": "Attachments" }, h("template"))
      // The list's template: each file's name, size and a Remove button, named for its file.
      ;(files.querySelector("template") as HTMLTemplateElement).innerHTML =
        `<ui-file-input-item class="chat-attachment"><span class="chat-attachment-name" data-file="name"></span><span class="chat-attachment-size" data-file="size"></span><ui-file-input-item-remove><button type="button" aria-label="Remove file">${icon(icons.remove).outerHTML}</button></ui-file-input-item-remove></ui-file-input-item>`
      const attach = h("ui-file-input-trigger", null, h("button", { type: "button", "aria-label": "Attach files", class: "chat-composer-attach" }, icon(icons.paperclip)))
      toolbar.append(attach)
      fileInput = h("ui-file-input", { multiple: true }, h("ui-file-input-dropzone", { class: "chat-composer-box" }, files, menu, toolbar)) as HTMLElement & { value?: File[] }
      fileInput.addEventListener("valuechange", (event) => {
        this.#files = [...((event as CustomEvent<{ value: File[] }>).detail.value ?? [])]
        this.sync()
        requestAnimationFrame(() => {
          for (const item of files.querySelectorAll("ui-file-input-item")) {
            const name = item.querySelector('[data-file="name"]')?.textContent
            if (name) item.querySelector("ui-file-input-item-remove button")?.setAttribute("aria-label", `Remove ${name}`)
          }
        })
      })
      form.append(fileInput)
    } else form.append(h("div", { class: "chat-composer-box" }, menu, toolbar))
    toolbar.append(...this.#tools, h("span", { class: "chat-composer-spacer" }), h("ui-button", null, stop), h("ui-button", null, send))
    this.replaceChildren(form)
    this.#dom = { form, field, send, stop, menu, fileInput }
  }

  private sync() {
    const dom = this.#dom!
    dom.field.setAttribute("aria-label", this.getAttribute("label") ?? "Message")
    dom.field.placeholder = this.getAttribute("placeholder") ?? "Message…"
    const running = isOn(this, "running")
    const stopHadFocus = dom.stop.contains(document.activeElement)
    ;(dom.stop.parentElement as HTMLElement).style.display = running ? "" : "none"
    ;(dom.send.parentElement as HTMLElement).style.display = running ? "none" : ""
    if (stopHadFocus && !running) dom.field.focus()
    dom.send.disabled = !dom.field.value.trim() && !this.#files.length
    attr(dom.send, "data-disabled", dom.send.disabled)
    if (dom.fileInput) {
      const accept = this.getAttribute("attachments")
      if (accept) dom.fileInput.setAttribute("accept", accept)
      else dom.fileInput.removeAttribute("accept")
    }
    dom.menu.triggers = [
      ...(this.#commands.length ? [{ char: "/", boundary: "start", items: this.#commands }] : []),
      ...(this.#mentions.length ? [{ char: "@", items: this.#mentions }] : []),
    ]
  }
}

/* ------------------------------------------------------ Model picker and usage */

type Model = { value: string; label: string; description?: string }
type SelectElement = HTMLElement & { value?: string | null; items?: unknown }
type MeterElement = HTMLElement & { format?: (value: number) => string }

/**
 * <uiset-chat-model-picker label="Model" value="balanced"> chooses one of `models`, each
 * with its description under its name. Choosing fires `valuechange` with `{ value }`.
 */
/** What `<uiset-chat-model-picker>` fires: `valuechange` with the model's id. */
type UISetChatModelPickerEvents = { valuechange: CustomEvent<{ value: string }> }

class UISetChatModelPicker extends Evented<UISetChatModelPickerEvents>() {
  static observedAttributes = ["label", "value"]
  #models: Model[] = []
  #dom?: { select: SelectElement; label: HTMLElement; list: HTMLElement }

  constructor() {
    super()
    upgradeProperties(this, ["models"])
  }

  get models() {
    return this.#models
  }
  set models(v: Model[]) {
    this.#models = v ?? []
    if (this.#dom) this.render()
  }
  /** The chosen model's value. */
  get value() {
    return this.getAttribute("value") ?? this.#models[0]?.value ?? ""
  }
  set value(v: string) {
    this.setAttribute("value", v)
  }

  connectedCallback() {
    if (!this.#dom) {
      const label = h("ui-select-label", { class: "chat-visually-hidden" })
      const list = h("ui-select-content", { class: "chat-model-list" })
      // The select starts on the model given, so it never shows empty.
      const select = h(
        "ui-select",
        { "default-value": this.value || null },
        label,
        h("ui-select-trigger", null, h("button", { type: "button", "data-variant": "outline", class: "chat-model-trigger" }, h("ui-select-value"))),
        list,
      ) as SelectElement
      select.addEventListener("valuechange", (event) => {
        const value = (event as CustomEvent<{ value: string | null }>).detail.value
        if (!value || value === this.getAttribute("value")) return
        this.setAttribute("value", value)
        this.dispatchEvent(new CustomEvent("valuechange", { detail: { value } }))
        reportInput(this)
      })
      keepInputInside(select)
      this.replaceChildren(select)
      this.#dom = { select, label, list }
    }
    this.render()
  }

  attributeChangedCallback() {
    if (this.#dom) this.render()
  }

  private render() {
    const dom = this.#dom!
    dom.label.textContent = this.getAttribute("label") ?? "Model"
    dom.select.items = this.#models.map(({ value, label }) => ({ value, label }))
    // An item stays while its model reads the same, so the list's focus and highlight do too.
    const shown = new Map([...dom.list.children].map((item) => [(item as HTMLElement).dataset.sig, item]))
    dom.list.replaceChildren(
      ...this.#models.map((model) => {
        const sig = signature([model.value, model.label, model.description])
        return (
          shown.get(sig) ??
          h(
            "ui-select-item",
            { value: model.value, "data-sig": sig },
            h("span", { class: "chat-model-name" }, model.label),
            model.description ? h("span", { class: "chat-model-description" }, model.description) : null,
          )
        )
      }),
    )
    if (this.value && dom.select.value !== this.value) dom.select.value = this.value
  }
}

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })

/** <uiset-chat-usage used="1200" limit="200000" label="Context used" unit="tokens">: how full the context is. */
type QueuedMessage = { id: string; text: string }
/** What `<uiset-chat-queue>` fires, naming the message by its `id`. */
type UISetChatQueueEvents = {
  remove: CustomEvent<{ value: string }>
  /** Send now, on the first message, with `send-now`. */
  send: CustomEvent<{ value: string }>
}

/**
 * <uiset-chat-queue items send-now>: messages a person wrote while the agent was still working,
 * sent in turn when it's done. "2 queued", each with Remove, and Send now for the first.
 */
class UISetChatQueue extends Evented<UISetChatQueueEvents>() {
  static observedAttributes = ["label", "send-now"]
  #items: QueuedMessage[] = []

  get items() {
    return this.#items
  }
  set items(v: QueuedMessage[]) {
    this.#items = v
    this.render()
  }

  connectedCallback() {
    upgradeProperties(this, ["items"])
    this.render()
  }
  attributeChangedCallback() {
    this.render()
  }

  private render() {
    if (!this.isConnected) return
    this.hidden = this.#items.length === 0
    this.setAttribute("role", "region")
    this.setAttribute("aria-label", this.getAttribute("label") ?? "Queued messages")
    this.classList.add("chat-queue")
    // The slot makes `hidden` win over the queue's own display, as for every UISet part.
    this.dataset.slot = "chat-queue"
    const sendNow = isOn(this, "send-now")
    const button = (label: string, name: string, content: Node | string, onClick: () => void) => {
      const b = h("button", { type: "button", "data-variant": "ghost", "aria-label": label, class: name }, content)
      b.addEventListener("click", onClick)
      return h("ui-button", null, b)
    }
    this.replaceChildren(
      h("p", { class: "chat-queue-head" }, `${this.#items.length} queued`, h("span", { class: "chat-queue-note" }, ", sent when the answer is done")),
      h(
        "ol",
        { class: "chat-queue-list" },
        ...this.#items.map((item, index) =>
          h(
            "li",
            null,
            h("span", { class: "chat-queue-text" }, item.text),
            index === 0 && sendNow ? button(`Send now: ${item.text}`, "", "Send now", () => this.dispatchEvent(new CustomEvent("send", { detail: { value: item.id } }))) : null,
            button(`Remove from queue: ${item.text}`, "chat-queue-remove", icon(icons.remove), () => this.dispatchEvent(new CustomEvent("remove", { detail: { value: item.id } }))),
          ),
        ),
      ),
    )
  }
}

class UISetChatUsage extends ElementBase {
  static observedAttributes = ["used", "limit", "label", "unit"]
  #dom?: { meter: MeterElement; text: HTMLElement }

  connectedCallback() {
    if (!this.#dom) {
      const text = h("span", { class: "chat-usage-text", "aria-hidden": "true" })
      const meter = h("ui-meter", { class: "chat-usage", min: "0" }, h("ui-meter-track", null, h("ui-meter-indicator")), text) as MeterElement
      this.replaceChildren(meter)
      this.#dom = { meter, text }
    }
    this.render()
  }

  attributeChangedCallback() {
    if (this.#dom) this.render()
  }

  private render() {
    const { meter, text } = this.#dom!
    const used = Math.max(0, Number(this.getAttribute("used")) || 0)
    const limit = Math.max(1, Number(this.getAttribute("limit")) || 1)
    const words = `${compact.format(used)} of ${compact.format(limit)} ${this.getAttribute("unit") ?? "tokens"}`
    text.textContent = words
    meter.format = () => words
    attr(meter, "aria-label", this.getAttribute("label") ?? "Context used")
    attr(meter, "max", String(limit))
    attr(meter, "value", String(Math.min(used, limit)))
    attr(meter, "data-level", used / limit > 0.9 ? "high" : used / limit > 0.7 ? "medium" : null)
  }
}

/* ------------------------------------------------------------------- Threads */

type Thread = { id: string; title: string; updatedAt?: Date }
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" })
function ago(date: Date) {
  const minutes = Math.round((date.getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, "hour")
  return relative.format(Math.round(hours / 24), "day")
}

/**
 * <uiset-chat-threads label="Chats" value="t1"> lists `threads`. Choosing one sets `value`
 * and fires `valuechange` (cancelable; not `select`, which a text field's native event
 * shares). Also `new`, `rename` with `{ value: id, title }` and `delete` with an id (after
 * the person confirms). Add `renamable` and `deletable` for those, and `newable` for New chat.
 */
/** What `<uiset-chat-threads>` fires, each with a thread's id. */
type UISetChatThreadsEvents = {
  /** A chat chosen; `preventDefault()` keeps the current one. */
  valuechange: CustomEvent<{ value: string }>
  new: CustomEvent<Record<string, never>>
  rename: CustomEvent<{ value: string; title: string }>
  delete: CustomEvent<{ value: string }>
}

class UISetChatThreads extends Evented<UISetChatThreadsEvents>() {
  static observedAttributes = ["label", "value", "renamable", "deletable", "newable"]
  #threads: Thread[] = []
  #editing: string | null = null
  #deleting: Thread | null = null
  #dom?: { nav: HTMLElement; newSlot: HTMLElement; list: HTMLElement; empty: HTMLElement; dialog: HTMLElement & { open?: boolean } }
  #items = new Map<string, { li: HTMLElement; sig: string }>()

  constructor() {
    super()
    upgradeProperties(this, ["threads", "value"])
  }

  /** The open chat's id. An attribute and a property. */
  get value() {
    return this.getAttribute("value") ?? ""
  }
  set value(v: string | null) {
    attr(this, "value", v)
  }

  get threads() {
    return this.#threads
  }
  set threads(v: Thread[]) {
    this.#threads = v ?? []
    if (this.#dom) this.render()
  }

  connectedCallback() {
    if (!this.#dom) this.build()
    this.render()
  }
  attributeChangedCallback() {
    if (this.#dom) this.render()
  }

  private emit(type: string, detail: object) {
    this.dispatchEvent(new CustomEvent(type, { detail }))
  }

  private build() {
    const newButton = h("button", { type: "button", "data-variant": "outline", class: "chat-threads-new" }, "New chat")
    newButton.addEventListener("click", () => this.emit("new", {}))
    const newSlot = h("ui-button", null, newButton)
    const list = h("ul")
    const empty = h("p", { class: "chat-threads-empty" }, "No chats yet.")
    const nav = h("nav", { class: "chat-threads" }, newSlot, empty, list)
    // The dialog lives outside the list, so a new list never takes it away while it's open.
    const dialog = this.deleteDialog()
    this.replaceChildren(nav, dialog)
    this.#dom = { nav, newSlot, list, empty, dialog }
  }

  private render() {
    const dom = this.#dom!
    const value = this.getAttribute("value")
    dom.nav.setAttribute("aria-label", this.getAttribute("label") ?? "Chats")
    dom.newSlot.hidden = !isOn(this, "newable")
    dom.empty.hidden = this.#threads.length > 0
    // Chats are kept by id: the one that's focused, or being renamed, stays as it was.
    const menus = isOn(this, "renamable") || isOn(this, "deletable")
    const items = this.#threads.map((thread) => {
      const sig = signature([thread.title, thread.updatedAt?.toISOString(), thread.id === value, this.#editing === thread.id, menus, isOn(this, "renamable"), isOn(this, "deletable")])
      const known = this.#items.get(thread.id)
      if (known && known.sig === sig) return known.li
      const li = this.drawItem(thread, value)
      if (known) {
        const focusKey = known.li.contains(document.activeElement) ? (document.activeElement as HTMLElement).closest("[data-focus-key]")?.getAttribute("data-focus-key") : null
        known.li.replaceWith(li)
        if (focusKey) li.querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`)?.focus()
      }
      this.#items.set(thread.id, { li, sig })
      return li
    })
    const ids = new Set(this.#threads.map((t) => t.id))
    for (const [id, item] of this.#items) if (!ids.has(id)) (item.li.remove(), this.#items.delete(id))
    place(dom.list, items, () => true)
  }

  private drawItem(thread: Thread, value: string | null) {
    const li = h("li", { "data-active": thread.id === value })
    if (this.#editing === thread.id) {
      const id = `rename-${thread.id}`
      const input = h("input", { id, value: thread.title }) as HTMLInputElement
      const finish = (title: string | null, refocus: boolean) => {
        if (this.#editing !== thread.id) return
        this.#editing = null
        const next = title?.trim()
        if (next && next !== thread.title) this.emit("rename", { value: thread.id, title: next })
        this.render()
        // Enter and Escape hand focus back to the chat; a click elsewhere leaves it there.
        if (refocus) requestAnimationFrame(() => this.querySelector<HTMLElement>(`[data-thread="${CSS.escape(thread.id)}"]`)?.focus())
      }
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") finish(input.value, true)
        if (event.key === "Escape") finish(null, true)
      })
      input.addEventListener("blur", () => finish(input.value, false))
      li.append(h("ui-field", { class: "chat-thread-rename" }, h("ui-field-label", { class: "chat-visually-hidden", for: id }, `Rename ${thread.title}`), h("ui-input", null, input)))
      queueMicrotask(() => input.focus())
      return li
    }
    const link = h(
      "button",
      {
        type: "button",
        "data-variant": "ghost",
        class: "chat-thread-link",
        "data-thread": thread.id,
        "data-focus-key": "link",
        // A verb of its own, so neither this nor "More for …" is the bare title a step by that
        // title would find twice.
        "aria-label": `Open ${thread.title}`,
        "aria-description": thread.updatedAt ? `Updated ${ago(thread.updatedAt)}` : null,
        "aria-current": thread.id === value ? "page" : null,
      },
      h("span", { class: "chat-thread-title" }, thread.title),
      thread.updatedAt ? h("time", { datetime: thread.updatedAt.toISOString(), "aria-hidden": "true" }, ago(thread.updatedAt)) : null,
    )
    link.addEventListener("click", () => {
      const change = new CustomEvent("valuechange", { detail: { value: thread.id }, cancelable: true })
      if (!this.dispatchEvent(change)) return
      this.setAttribute("value", thread.id)
      reportInput(this)
    })
    li.append(h("ui-button", null, link))
    if (isOn(this, "renamable") || isOn(this, "deletable")) {
      const menu = h(
        "ui-menu",
        null,
        h("ui-menu-trigger", null, h("button", { type: "button", class: "chat-thread-more", "data-variant": "ghost", "aria-label": `More for ${thread.title}`, "data-focus-key": "more" }, icon(icons.more))),
        h(
          "ui-menu-content",
          null,
          isOn(this, "renamable") ? h("ui-menu-item", { value: "rename" }, "Rename") : null,
          isOn(this, "deletable") ? h("ui-menu-item", { value: "delete", destructive: true }, "Delete") : null,
        ),
      )
      menu.addEventListener("action", (event) => {
        const action = (event as CustomEvent<{ value: string }>).detail.value
        if (action === "rename") {
          this.#editing = thread.id
          queueMicrotask(() => this.render())
        } else if (action === "delete") this.confirmDelete(thread)
      })
      li.append(menu)
    }
    return li
  }

  private deleteDialog() {
    const title = h("ui-alert-dialog-title")
    const confirm = h("button", { type: "button", "data-variant": "solid" }, "Delete chat")
    confirm.addEventListener("click", () => {
      if (this.#deleting) this.emit("delete", { value: this.#deleting.id })
    })
    return h(
      "ui-alert-dialog",
      null,
      h("ui-alert-dialog-backdrop", { hidden: true }),
      h(
        "ui-alert-dialog-content",
        { hidden: true },
        title,
        h("ui-alert-dialog-description", null, "The chat and its messages are removed."),
        h("div", { class: "chat-dialog-actions" }, h("ui-alert-dialog-close", null, h("button", { type: "button" }, "Keep it")), h("ui-alert-dialog-close", { value: "confirm" }, confirm)),
      ),
    ) as HTMLElement & { open?: boolean }
  }

  private confirmDelete(thread: Thread) {
    this.#deleting = thread
    const dialog = this.#dom!.dialog
    dialog.querySelector("ui-alert-dialog-title")!.textContent = `Delete “${thread.title}”?`
    dialog.querySelector<HTMLElement>('ui-alert-dialog-close[value="confirm"] button')!.dataset.agentConfirm = `Deletes the chat “${thread.title}” and its messages`
    dialog.open = true
  }
}

function defineChat() {
  defineElement("uiset-chat", UISetChat)
  defineElement("uiset-chat-composer", UISetChatComposer)
  defineElement("uiset-chat-threads", UISetChatThreads)
  defineElement("uiset-chat-model-picker", UISetChatModelPicker)
  defineElement("uiset-chat-usage", UISetChatUsage)
  defineElement("uiset-chat-queue", UISetChatQueue)
}

export { defineChat, UISetChat, UISetChatComposer, UISetChatModelPicker, UISetChatQueue, UISetChatThreads, UISetChatUsage }
export type { ChatMessage, ChatPart, ComposerItem, Feedback, Model, Thread }
export type { QueuedMessage as ChatQueuedMessage, UISetChatEvents, UISetChatComposerEvents, UISetChatModelPickerEvents, UISetChatQueueEvents, UISetChatThreadsEvents }
