import type { JSX } from "@solidjs/web"
import { announce, createInputHistory, isComposing, matchesShortcut } from "@ui-sdk/core"
import { usePart, usePrimitive } from "@ui-sdk/solid/primitive"
import { createMemo, createSignal, createUniqueId, For, onCleanup, onSettled, Show } from "solid-js"
import { Button } from "./button"
import { Input } from "./field"
import { createScrollAreaController, ScrollBox } from "./scroll-area"
import { plain, Screen, urlPattern, type Run, type ScreenLine } from "../../registry/uiset/ui/terminal/ansi"
import {
  createTerminalController,
  createTerminalSession,
  english,
  terminalPrimitive,
  words,
  type TerminalCommand,
  type TerminalController,
  type TerminalIO,
  type TerminalMessages,
  type TerminalResult,
} from "../../registry/uiset/ui/terminal/session"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/terminal/terminal.css"

// The terminal kit in Solid, as React's: the screen (ANSI, cursor codes, links) and the session
// (commands, history, Tab, Ctrl+C) are the shared terminal/ansi.ts and terminal/session.ts.

/** A run's text with its links: an OSC 8 link, or the URLs in plain text. */
function runParts(run: Run): { text: string; href?: string }[] {
  if (run.link) return [{ text: run.text, href: run.link }]
  const parts: { text: string; href?: string }[] = []
  let last = 0
  for (const match of run.text.matchAll(urlPattern)) {
    if (match.index! > last) parts.push({ text: run.text.slice(last, match.index) })
    parts.push({ text: match[0], href: match[0] })
    last = match.index! + match[0].length
  }
  if (last < run.text.length) parts.push({ text: run.text.slice(last) })
  return parts
}

function RunText(props: { run: Run }) {
  // By place, so a line redrawn in place (a progress bar) changes its text, not its nodes:
  // the log announces additions, and a redraw isn't one.
  return (
    <For each={runParts(props.run)} keyed={false}>
      {(part) => (
        <Show when={part().href} fallback={part().text}>
          {(href) => (
            <a href={href()} target="_blank" rel="noreferrer">
              {part().text}
            </a>
          )}
        </Show>
      )}
    </For>
  )
}

const styled = (run: Run) => !!(run.fg || run.bg || run.bold || run.dim || run.italic || run.underline || run.strike || run.inverse || run.link)

/** A line as drawn: kept while its version holds, so an unchanged line isn't drawn again. */
type Row = { id: number; version: number; kind: ScreenLine["kind"]; quiet?: boolean; runs: Run[] }

function TerminalLine(props: { row: Row; prompt: string }) {
  return (
    <div class="terminal-line" data-kind={props.row.kind} aria-hidden={props.row.quiet ? "true" : undefined}>
      <Show when={props.row.kind === "command"}>
        <span class="terminal-ps1" aria-hidden="true">
          {props.prompt}{" "}
        </span>
      </Show>
      <For each={props.row.runs} keyed={false}>
        {(run) => (
          <Show when={styled(run())} fallback={<RunText run={run()} />}>
            <span
              data-fg={run().fg}
              data-bg={run().bg}
              data-bold={run().bold ? "" : undefined}
              data-dim={run().dim ? "" : undefined}
              data-italic={run().italic ? "" : undefined}
              data-underline={run().underline ? "" : undefined}
              data-strike={run().strike ? "" : undefined}
              data-inverse={run().inverse ? "" : undefined}
            >
              <RunText run={run()} />
            </span>
          </Show>
        )}
      </For>
    </div>
  )
}

/**
 * A terminal: output with ANSI colors, cursor codes and links, and a prompt with history
 * (Up and Down), Tab completion, Ctrl+C to stop a command and Ctrl+L to clear. Commands
 * print, stream (an async iterable) or fail; `help`, `clear` and `history` come built in.
 */
function Terminal(props: {
  /** The terminal's name, for people and agents. */
  label: string
  /** What the prompt shows, like "~/app $". */
  prompt?: string
  commands?: Record<string, TerminalCommand>
  /** Runs a line no command matched; without it, the terminal says it's not found. */
  onCommand?: (line: string, io: TerminalIO) => TerminalResult
  /** Printed first. */
  welcome?: string
  defaultHistory?: string[]
  /** How many lines to keep; older ones go, and what you're reading stays put. */
  scrollback?: number
  /** The terminal's own words, for other languages. */
  messages?: Partial<TerminalMessages>
  /** Writes output, runs and clears from outside, like a socket's messages: `createTerminalController()`. */
  controller?: TerminalController
  class?: string
  style?: JSX.CSSProperties | string
}) {
  const messages = (): TerminalMessages => ({ ...english, ...props.messages })
  const prompt = () => props.prompt ?? "$"
  const inputId = createUniqueId()
  const helpId = createUniqueId()
  const [running, setRunning] = createSignal(false)
  let field: HTMLInputElement | undefined
  let lastTab: string | null = null

  // The scroll area follows the output's end until you scroll up (stickToEnd). Output that
  // arrives while you read above offers New output below.
  const area = createScrollAreaController()
  const [unseen, setUnseen] = createSignal(false)

  // Output goes into a screen and the page catches up once a frame, however fast it comes.
  // Writes before the terminal is on the page (a controller, a slow page) wait, and one frame
  // follows once it is. The welcome text is drawn by the first render.
  const [frame, setFrame] = createSignal(0)
  let pending: number | null = null
  let mounted = false
  let missed = false
  const screen = new Screen(() => {
    if (!mounted) {
      missed = true
      return
    }
    if (pending !== null || typeof requestAnimationFrame === "undefined") return
    pending = requestAnimationFrame(() => {
      pending = null
      // Past scrollback, old lines go even while you're scrolled up: the view stays put.
      screen.trim(props.scrollback ?? 2000)
      if (!area.isSticking()) setUnseen(true)
      setFrame((n) => n + 1)
    })
  })
  props.welcome?.split("\n").forEach((line) => screen.note(line, "info"))
  missed = false
  onSettled(() => {
    mounted = true
    if (missed) {
      missed = false
      setFrame((n) => n + 1)
    }
    return () => {
      mounted = false
    }
  })

  const session = createTerminalSession({
    screen,
    commands: () => props.commands ?? {},
    onCommand: () => props.onCommand,
    messages,
    onRunning: setRunning,
    history: props.defaultHistory ?? [],
  })
  onCleanup(() => {
    session.dispose()
    // The server runs cleanups too, where there are no frames.
    if (pending !== null && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(pending)
    pending = null
  })

  // Each line as drawn, reused while its version holds: For keeps a line's element and updates
  // it when it changes, and leaves the others alone.
  let drawn = new Map<number, Row>()
  const rows = createMemo(() => {
    frame()
    const next = new Map<number, Row>()
    const list = screen.lines.map((line) => {
      const before = drawn.get(line.id)
      const row = before && before.version === line.version ? before : { id: line.id, version: line.version, kind: line.kind, quiet: line.quiet, runs: Screen.runs(line) }
      next.set(line.id, row)
      return row
    })
    drawn = next
    return list
  })

  const setValue = (value: string) => {
    if (!field) return
    field.value = value
    field.setSelectionRange(value.length, value.length)
  }
  const history = createInputHistory({
    entries: () => session.sent(),
    read: () => field?.value ?? "",
    write: (value) => setValue(value as string),
  })

  const keyDown = (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    if (isComposing(event)) return
    if (event.key !== "Tab") lastTab = null
    if (matchesShortcut(event, "ctrl+c")) {
      // With text selected, Ctrl+C copies, as everywhere else.
      const el = event.currentTarget
      if (el.selectionStart !== el.selectionEnd) return
      event.preventDefault()
      if (session.running()) session.stop()
      else {
        if (el.value) screen.note(`${plain(el.value)}^C`, "command", { quiet: true })
        setValue("")
        history.reset()
      }
      return
    }
    if (matchesShortcut(event, "ctrl+l")) {
      event.preventDefault()
      screen.clear()
      return
    }
    if (history.keydown(event)) return
    // Tab completes what's typed; with nothing to complete, it moves on like anywhere else.
    if (event.key === "Tab" && !event.shiftKey && event.currentTarget.value.trim()) {
      const value = event.currentTarget.value
      const found = session.tab(value, lastTab)
      if (!found) return
      event.preventDefault()
      if (found.set !== undefined) setValue(found.set)
      // Several matches: the second Tab lists them, as shells do.
      else if (found.list) {
        screen.note(found.list.join("   "), "info", { quiet: true })
        announce(`${found.list.length} matches: ${found.list.join(", ")}`)
      }
      lastTab = event.currentTarget.value
    }
  }

  const handle = usePrimitive(terminalPrimitive, () => ({
    onRun: (line: string) => {
      area.scrollToEnd()
      void session.execute(line)
    },
    onClear: () => screen.clear(),
    onWrite: (text: string, error: boolean) => screen.write(text, { error }),
    running: running(),
    busy: messages().busy,
    controller: props.controller,
    output: () =>
      screen.lines.map((line) => ({
        id: line.id,
        text: line.kind === "command" ? `${prompt()} ${Screen.text(line)}` : Screen.text(line),
      })),
  }))

  return usePart(
    handle,
    "root",
    undefined,
    {
      get "aria-label"() {
        return props.label
      },
      get class() {
        return ["terminal", props.class].filter(Boolean).join(" ")
      },
      get style() {
        return props.style
      },
      get "data-running"() {
        return running() ? "" : undefined
      },
      onPointerUp: (event: PointerEvent) => {
        // A click on the output puts the caret in the prompt, unless it selected text. A tap
        // doesn't: it would open the phone's keyboard over what you're reading.
        if (event.pointerType !== "mouse" || (event.target as Element).closest("a, button, input")) return
        if (!window.getSelection()?.toString()) field?.focus({ preventScroll: true })
      },
      // A getter, so the children are built once, inside the part: given as a function,
      // they're built again, whole, whenever something at their top changes (New output below),
      // and the log would be new.
      get children() {
        return (
          <>
            <ScrollBox
              data-frame="none"
              class="terminal-frame"
              stickToEnd
              controller={area}
              viewport={{
                onScroll: () => {
                  if (area.isAtEnd()) setUnseen(false)
                },
                class: "terminal-scroll",
                role: "log",
                // Not "<label> output": that would contain the terminal's own name, and a step naming
                // the terminal would find both.
                "aria-label": "Output",
                // New lines are read out; a line redrawn in place (a progress bar) isn't.
                "aria-relevant": "additions",
                translate: "no",
              }}
            >
              <For each={rows()} keyed={(row) => row.id}>
                {(row) => <TerminalLine row={row()} prompt={prompt()} />}
              </For>
            </ScrollBox>
            <Show when={unseen()}>
              <Button
                variant="outline"
                class="terminal-jump"
                onClick={() => {
                  area.scrollToEnd()
                  setUnseen(false)
                  // The button goes once you're at the end; the prompt takes focus.
                  field?.focus({ preventScroll: true })
                }}
              >
                {messages().newOutput}
              </Button>
            </Show>
            <form
              class="terminal-prompt"
              onSubmit={(event) => {
                event.preventDefault()
                const value = field?.value ?? ""
                if (running()) {
                  announce(messages().stillRunning)
                  return
                }
                history.reset()
                setValue("")
                area.scrollToEnd()
                void session.execute(value)
              }}
            >
              <span class="terminal-ps1" aria-hidden="true">
                {prompt()}
              </span>
              <Input
                ref={(el: HTMLInputElement) => {
                  field = el
                }}
                id={inputId}
                class="terminal-input"
                aria-label={messages().command}
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck={false}
                translate="no"
                enterkeyhint="send"
                aria-describedby={helpId}
                onKeyDown={keyDown}
              />
              <span class="terminal-status" aria-hidden="true">
                {running() ? "Running… Ctrl+C stops it" : ""}
              </span>
            </form>
            <p id={helpId} hidden>
              {messages().help}
            </p>
          </>
        )
      },
    } as never,
    "div",
  )
}

export { createTerminalController, Terminal, words }
export type { TerminalCommand, TerminalController, TerminalIO, TerminalMessages, TerminalResult }
