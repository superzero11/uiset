// The Terminal for Web Components: <uiset-terminal> draws output with ANSI colors, cursor
// codes and links, and a prompt with history (Up and Down), Tab completion, Ctrl+C and
// Ctrl+L, on the same screen (terminal/ansi.ts) and the same session (terminal/session.ts)
// as the React Terminal: built-in help, clear and history, streaming commands, agents
// running commands through the same path as the person.
import { announce, createInputHistory, createStickToBottom, isComposing, matchesShortcut } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/web"
import "@ui-sdk/web/button"
import "@ui-sdk/web/input"
import { plain, Screen, urlPattern, type Run, type ScreenLine } from "@/registry/uiset/ui/terminal/ansi"
import { createTerminalSession, english, terminalPrimitive, type TerminalCommand, type TerminalIO, type TerminalMessages, type TerminalResult } from "@/registry/uiset/ui/terminal/session"
import "@/registry/uiset/ui/terminal/terminal.css"
import { attr, h, uid } from "./dom"

type TerminalElement = HTMLElement & {
  commands?: Record<string, TerminalCommand>
  /** Runs a line no command matched; without it, the terminal says it's not found. */
  handle?: (line: string, io: TerminalIO) => TerminalResult
  messages?: Partial<TerminalMessages>
  /** Commands Up brings back before any are typed. */
  history?: string[]
}

type TerminalInstance = { get: () => object; subscribe: (run: () => void) => () => void }

const styled = (run: Run) => !!(run.fg || run.bg || run.bold || run.dim || run.italic || run.underline || run.strike || run.inverse || run.link)

/** A run's text, with its links: an OSC 8 link, or http(s) addresses in plain text. */
function runText(run: Run): Node[] {
  const link = (href: string, text: string) => h("a", { href, target: "_blank", rel: "noreferrer" }, text)
  if (run.link) return [link(run.link, run.text)]
  const parts: Node[] = []
  let last = 0
  for (const match of run.text.matchAll(urlPattern)) {
    if (match.index! > last) parts.push(document.createTextNode(run.text.slice(last, match.index)))
    parts.push(link(match[0], match[0]))
    last = match.index! + match[0].length
  }
  if (last < run.text.length) parts.push(document.createTextNode(run.text.slice(last)))
  return parts
}

// Each terminal keeps its screen, session and lines across renders (a property set
// renders again).
const views = new WeakMap<TerminalElement, TerminalView>()
const viewOf = (el: TerminalElement) => {
  let view = views.get(el)
  if (!view) views.set(el, (view = new TerminalView(el)))
  return view
}

class TerminalView {
  readonly screen: Screen
  readonly session: ReturnType<typeof createTerminalSession>
  private scroller = h("div", { class: "terminal-scroll", role: "log", "aria-relevant": "additions", tabindex: "0", translate: "no" })
  private jump: HTMLElement
  private input: HTMLInputElement
  private status = h("span", { class: "terminal-status", "aria-hidden": "true" })
  private ps1 = h("span", { class: "terminal-ps1", "aria-hidden": "true" })
  private help = h("p", { id: uid("terminal-help"), hidden: true })
  private lines = new Map<number, { el: HTMLElement; version: number; prompt: string }>()
  private stick = createStickToBottom({ threshold: 24 })
  private frame: number | null = null
  private lastTab: string | null = null
  private welcomed = false
  private history: ReturnType<typeof createInputHistory>

  constructor(private el: TerminalElement) {
    this.screen = new Screen(() => this.schedule())
    this.session = createTerminalSession({
      screen: this.screen,
      commands: () => el.commands ?? {},
      onCommand: () => el.handle,
      messages: () => this.messages,
      // The running state is the primitive's `running` option, so agents wait their turn.
      onRunning: (running) => {
        attr(el, "running", running)
        attr(el, "data-running", running)
        this.status.textContent = running ? "Running… Ctrl+C stops it" : ""
      },
      history: el.history,
    })
    this.input = h("input", {
      class: "terminal-input",
      autocomplete: "off",
      autocapitalize: "off",
      autocorrect: "off",
      spellcheck: "false",
      translate: "no",
      enterkeyhint: "send",
      "aria-describedby": this.help.id,
    }) as HTMLInputElement
    this.input.addEventListener("keydown", (event) => this.keyDown(event))
    this.history = createInputHistory({
      entries: () => this.session.sent(),
      read: () => this.input.value,
      write: (value) => this.setValue(value as string),
    })
    const jumpButton = h("button", { type: "button", "data-variant": "outline", class: "terminal-jump" })
    jumpButton.addEventListener("click", () => {
      this.stick.scrollToBottom()
      // The button goes once you're at the end; the prompt takes focus.
      this.input.focus({ preventScroll: true })
    })
    this.jump = h("ui-button", null, jumpButton)
    const form = h("form", { class: "terminal-prompt" }, this.ps1, h("ui-input", null, this.input), this.status)
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      const value = this.input.value
      if (this.session.running()) return announce(this.messages.stillRunning)
      this.history.reset()
      this.setValue("")
      this.stick.scrollToBottom()
      void this.session.execute(value)
    })
    el.classList.add("terminal")
    el.replaceChildren(this.scroller, this.jump, form, this.help)
    this.stick.connect(this.scroller)
    this.stick.subscribe(() => this.drawJump())
    // A click on the output puts the caret in the prompt, unless it selected text. A tap
    // doesn't: it would open the phone's keyboard over what you're reading.
    el.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "mouse" || (event.target as Element).closest("a, button, input")) return
      if (!window.getSelection()?.toString()) this.input.focus({ preventScroll: true })
    })
    new MutationObserver(() => this.drawChrome()).observe(el, { attributes: true, attributeFilter: ["label", "aria-label", "prompt"] })
  }

  get messages(): TerminalMessages {
    return { ...english, ...this.el.messages }
  }

  private get prompt() {
    return this.el.getAttribute("prompt") ?? "$"
  }

  attach(_instance: TerminalInstance) {
    // A history given after the element started still comes back with Up.
    if (this.el.history?.length) this.session.seed(this.el.history)
    if (!this.welcomed) {
      this.welcomed = true
      this.el.getAttribute("welcome")?.split("\n").forEach((line) => this.screen.note(line, "info"))
    }
    this.drawChrome()
    this.drawLines()
    return () => {}
  }

  /** Output goes into the screen; the page catches up once a frame, however fast it comes. */
  private schedule() {
    if (this.frame !== null) return
    this.frame = requestAnimationFrame(() => {
      this.frame = null
      // Old lines go only while you're following the end, so what you read stays put.
      if (this.stick.get().following) this.screen.trim(Number(this.el.getAttribute("scrollback")) || 2000)
      this.drawLines()
    })
  }

  private drawChrome() {
    const label = this.el.getAttribute("label") ?? this.el.getAttribute("aria-label") ?? "Terminal"
    attr(this.el, "aria-label", label)
    attr(this.scroller, "aria-label", `${label} output`)
    attr(this.input, "aria-label", this.messages.command)
    this.ps1.textContent = this.prompt
    this.help.textContent = this.messages.help
    ;(this.jump.firstElementChild as HTMLElement).textContent = this.messages.newOutput
    this.drawJump()
  }

  private drawJump() {
    const stuck = this.stick.get()
    this.jump.style.display = stuck.unseen && !stuck.following ? "" : "none"
  }

  /** The lines, kept by id: one is drawn again only when it changed. */
  private drawLines() {
    const prompt = this.prompt
    const kept = new Set<number>()
    const els: HTMLElement[] = []
    for (const line of this.screen.lines) {
      kept.add(line.id)
      let view = this.lines.get(line.id)
      if (!view || view.version !== line.version || view.prompt !== prompt) {
        const el = this.lineElement(line, prompt)
        view?.el.replaceWith(el)
        this.lines.set(line.id, (view = { el, version: line.version, prompt }))
      }
      els.push(view.el)
    }
    for (const [id, view] of this.lines) if (!kept.has(id)) (view.el.remove(), this.lines.delete(id))
    // New lines go at the end; a log hears only what's added.
    let previous: Element | null = null
    for (const el of els) {
      if (el.parentElement !== this.scroller || el.previousElementSibling !== previous) {
        if (previous) previous.after(el)
        else this.scroller.prepend(el)
      }
      previous = el
    }
  }

  private lineElement(line: ScreenLine, prompt: string) {
    return h(
      "div",
      { class: "terminal-line", "data-kind": line.kind, "aria-hidden": line.quiet ? "true" : null },
      ...(line.kind === "command" ? [h("span", { class: "terminal-ps1", "aria-hidden": "true" }, `${prompt} `)] : []),
      ...Screen.runs(line).map((run) =>
        styled(run)
          ? h(
              "span",
              {
                "data-fg": run.fg,
                "data-bg": run.bg,
                "data-bold": run.bold,
                "data-dim": run.dim,
                "data-italic": run.italic,
                "data-underline": run.underline,
                "data-strike": run.strike,
                "data-inverse": run.inverse,
              },
              ...runText(run),
            )
          : h("span", null, ...runText(run)),
      ),
    )
  }

  /** What agents read: the last lines, as plain text. */
  output() {
    const prompt = this.prompt
    return this.screen.lines.map((line) => ({ id: line.id, text: line.kind === "command" ? `${prompt} ${Screen.text(line)}` : Screen.text(line) }))
  }

  run(line: string) {
    this.stick.scrollToBottom()
    void this.session.execute(line)
  }

  private setValue(value: string) {
    this.input.value = value
    this.input.setSelectionRange(value.length, value.length)
  }

  private keyDown(event: KeyboardEvent) {
    if (isComposing(event)) return
    if (event.key !== "Tab") this.lastTab = null
    if (matchesShortcut(event, "ctrl+c")) {
      // With text selected, Ctrl+C copies, as everywhere else.
      if (this.input.selectionStart !== this.input.selectionEnd) return
      event.preventDefault()
      if (this.session.running()) this.session.stop()
      else {
        if (this.input.value) this.screen.note(`${plain(this.input.value)}^C`, "command", { quiet: true })
        this.setValue("")
        this.history.reset()
      }
      return
    }
    if (matchesShortcut(event, "ctrl+l")) {
      event.preventDefault()
      this.screen.clear()
      return
    }
    if (this.history.keydown(event)) return
    // Tab completes what's typed; with nothing to complete, it moves on like anywhere else.
    if (event.key === "Tab" && !event.shiftKey && this.input.value.trim()) {
      const value = this.input.value
      const found = this.session.tab(value, this.lastTab)
      if (!found) return
      event.preventDefault()
      if (found.set !== undefined) this.setValue(found.set)
      // Several matches: the second Tab lists them, as shells do.
      else if (found.list) {
        this.screen.note(found.list.join("   "), "info", { quiet: true })
        announce(`${found.list.length} matches: ${found.list.join(", ")}`)
      }
      this.lastTab = this.input.value
    }
  }

  focus() {
    this.input.focus()
  }
}

function defineTerminal() {
  createParts(terminalPrimitive, {
    root: {
      tag: "uiset-terminal",
      properties: ["commands", "handle", "messages", "history"],
      api: ["run", "clear", "print", "error"],
      options: (el) => {
        const view = viewOf(el as TerminalElement)
        return {
          onRun: (line: string) => view.run(line),
          onClear: () => view.screen.clear(),
          onWrite: (text: string, error: boolean) => view.screen.write(text, { error }),
          busy: view.messages.busy,
          output: () => view.output(),
        }
      },
      render: (el, instance) => viewOf(el as TerminalElement).attach(instance as unknown as TerminalInstance),
    },
  })
  // The prompt takes focus when the terminal is focused from code.
  const Terminal = customElements.get("uiset-terminal")!
  Object.defineProperty(Terminal.prototype, "focus", {
    value(this: TerminalElement) {
      viewOf(this).focus()
    },
  })
}

export { defineTerminal }
export type { TerminalElement }
