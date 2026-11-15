"use client"

import {
  announce,
  createController,
  createInputHistory,
  createStickToBottom,
  definePrimitive,
  isComposing,
  matchesShortcut,
} from "@ui-sdk/core"
import { usePart, usePrimitive } from "@ui-sdk/react/primitive"
import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react"
import { Button } from "./button"
import { Input } from "./field"
import { plain, Screen, urlPattern, type Run, type ScreenLine } from "./terminal/ansi"
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
} from "./terminal/session"
import "./terminal/terminal.css"

function RunText({ run }: { run: Run }) {
  if (run.link)
    return (
      <a href={run.link} target="_blank" rel="noreferrer">
        {run.text}
      </a>
    )
  const parts: ReactNode[] = []
  let last = 0
  for (const match of run.text.matchAll(urlPattern)) {
    if (match.index! > last) parts.push(run.text.slice(last, match.index))
    parts.push(
      <a key={match.index} href={match[0]} target="_blank" rel="noreferrer">
        {match[0]}
      </a>,
    )
    last = match.index! + match[0].length
  }
  if (last < run.text.length) parts.push(run.text.slice(last))
  return <>{parts}</>
}

/** One line, drawn again only when it changed. */
const TerminalLine = memo(
  function TerminalLine({ line, prompt }: { line: ScreenLine; version: number; prompt: string }) {
    return (
      <div className="terminal-line" data-kind={line.kind} aria-hidden={line.quiet ? "true" : undefined}>
        {line.kind === "command" && (
          <span className="terminal-ps1" aria-hidden="true">
            {prompt}{" "}
          </span>
        )}
        {Screen.runs(line).map((run, i) =>
          !run.fg && !run.bg && !run.bold && !run.dim && !run.italic && !run.underline && !run.strike && !run.inverse && !run.link ? (
            <RunText key={i} run={run} />
          ) : (
            <span
              key={i}
              data-fg={run.fg}
              data-bg={run.bg}
              data-bold={run.bold ? "" : undefined}
              data-dim={run.dim ? "" : undefined}
              data-italic={run.italic ? "" : undefined}
              data-underline={run.underline ? "" : undefined}
              data-strike={run.strike ? "" : undefined}
              data-inverse={run.inverse ? "" : undefined}
            >
              <RunText run={run} />
            </span>
          ),
        )}
      </div>
    )
  },
  (a, b) => a.line === b.line && a.version === b.version && a.prompt === b.prompt,
)

/**
 * A terminal: output with ANSI colors, cursor codes and links, and a prompt with history
 * (Up and Down), Tab completion, Ctrl+C to stop a command and Ctrl+L to clear. Commands
 * print, stream (an async iterable) or fail; `help`, `clear` and `history` come built in.
 */
function Terminal({
  label,
  prompt = "$",
  commands = {},
  onCommand,
  welcome,
  defaultHistory = [],
  scrollback = 2000,
  messages: given,
  controller,
  className,
  style,
}: {
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
  /** How many lines to keep; older ones go while you're following the end. */
  scrollback?: number
  /** The terminal's own words, for other languages. */
  messages?: Partial<TerminalMessages>
  /** Writes output, runs and clears from outside, like a socket's messages: `createTerminalController()`. */
  controller?: TerminalController
  className?: string
  style?: CSSProperties
}) {
  const messages = { ...english, ...given }
  const inputId = useId()
  const helpId = useId()
  const [running, setRunning] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const lastTab = useRef<string | null>(null)

  const stick = useMemo(() => createStickToBottom({ threshold: 24 }), [])
  const stuck = useSyncExternalStore(
    (listener) => stick.subscribe(listener),
    () => stick.get(),
    () => stick.get(),
  )
  useEffect(() => (scroller.current ? stick.connect(scroller.current) : undefined), [stick])

  // Output goes into a screen and the page catches up once a frame, however fast it comes.
  const [, setFrame] = useState(0)
  const frame = useRef<number | null>(null)
  // Writes before the terminal mounts (a controller, a slow page) can't update it yet: they
  // wait, and one frame follows on mount. The welcome text is drawn by the first render.
  const mounted = useRef(false)
  const missed = useRef(false)
  const [screen] = useState(() => {
    const made = new Screen(() => {
      if (!mounted.current) {
        missed.current = true
        return
      }
      if (frame.current !== null || typeof requestAnimationFrame === "undefined") return
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        // Old lines go only while you're following the end, so what you read stays put.
        if (stick.get().following) made.trim(scrollback)
        setFrame((n) => n + 1)
      })
    })
    welcome?.split("\n").forEach((line) => made.note(line, "info"))
    missed.current = false
    return made
  })
  useEffect(() => {
    mounted.current = true
    if (missed.current) {
      missed.current = false
      setFrame((n) => n + 1)
    }
    return () => {
      mounted.current = false
    }
  }, [])

  // The commands, words and handler as of this render, read by the session at each use.
  const latest = useRef({ commands, onCommand, messages })
  latest.current = { commands, onCommand, messages }
  const [session] = useState(() =>
    createTerminalSession({
      screen,
      commands: () => latest.current.commands,
      onCommand: () => latest.current.onCommand,
      messages: () => latest.current.messages,
      onRunning: setRunning,
      history: defaultHistory,
    }),
  )
  useEffect(
    () => () => {
      session.dispose()
      // Cleared as well as cancelled: an effect that runs again (React's development
      // remount) must be able to schedule frames.
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    },
    [session],
  )

  const setValue = (value: string) => {
    const el = field.current
    if (!el) return
    el.value = value
    el.setSelectionRange(value.length, value.length)
  }
  const history = useMemo(
    () =>
      createInputHistory({
        entries: () => session.sent(),
        read: () => field.current?.value ?? "",
        write: (value) => setValue(value as string),
      }),
    [],
  )

  const keyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const native = event.nativeEvent
    if (isComposing(native)) return
    if (event.key !== "Tab") lastTab.current = null
    if (matchesShortcut(native, "ctrl+c")) {
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
    if (matchesShortcut(native, "ctrl+l")) {
      event.preventDefault()
      screen.clear()
      return
    }
    if (history.keydown(native)) return
    // Tab completes what's typed; with nothing to complete, it moves on like anywhere else.
    if (event.key === "Tab" && !event.shiftKey && event.currentTarget.value.trim()) {
      const value = event.currentTarget.value
      const found = session.tab(value, lastTab.current)
      if (!found) return
      event.preventDefault()
      if (found.set !== undefined) setValue(found.set)
      // Several matches: the second Tab lists them, as shells do.
      else if (found.list) {
        screen.note(found.list.join("   "), "info", { quiet: true })
        announce(`${found.list.length} matches: ${found.list.join(", ")}`)
      }
      lastTab.current = event.currentTarget.value
    }
  }

  const handle = usePrimitive(terminalPrimitive, {
    onRun: (line) => {
      stick.scrollToBottom()
      void session.execute(line)
    },
    onClear: () => screen.clear(),
    onWrite: (text, error) => screen.write(text, { error }),
    running,
    busy: messages.busy,
    controller,
    output: () =>
      screen.lines.map((line) => ({
        id: line.id,
        text: line.kind === "command" ? `${prompt} ${Screen.text(line)}` : Screen.text(line),
      })),
  })

  return usePart(
    handle,
    "root",
    {},
    {
      "aria-label": label,
      className: ["terminal", className].filter(Boolean).join(" "),
      style,
      "data-running": running ? "" : undefined,
      onPointerUp: (event: React.PointerEvent) => {
        // A click on the output puts the caret in the prompt, unless it selected text. A tap
        // doesn't: it would open the phone's keyboard over what you're reading.
        if (event.pointerType !== "mouse" || (event.target as Element).closest("a, button, input")) return
        if (!window.getSelection()?.toString()) field.current?.focus({ preventScroll: true })
      },
      children: (
        <>
          <div
            ref={scroller}
            className="terminal-scroll"
            role="log"
            aria-label={`${label} output`}
            // New lines are read out; a line redrawn in place (a progress bar) isn't.
            aria-relevant="additions"
            tabIndex={0}
            translate="no"
          >
            {screen.lines.map((line) => (
              <TerminalLine key={line.id} line={line} version={line.version} prompt={prompt} />
            ))}
          </div>
          {stuck.unseen && !stuck.following && (
            <Button
              variant="outline"
              className="terminal-jump"
              onClick={() => {
                stick.scrollToBottom()
                // The button goes once you're at the end; the prompt takes focus.
                field.current?.focus({ preventScroll: true })
              }}
            >
              {messages.newOutput}
            </Button>
          )}
          <form
            className="terminal-prompt"
            onSubmit={(event) => {
              event.preventDefault()
              const value = field.current?.value ?? ""
              if (running) {
                announce(messages.stillRunning)
                return
              }
              history.reset()
              setValue("")
              stick.scrollToBottom()
              void session.execute(value)
            }}
          >
            <span className="terminal-ps1" aria-hidden="true">
              {prompt}
            </span>
            <Input
              ref={field}
              id={inputId}
              className="terminal-input"
              aria-label={messages.command}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              translate="no"
              enterKeyHint="send"
              aria-describedby={helpId}
              onKeyDown={keyDown}
            />
            <span className="terminal-status" aria-hidden="true">
              {running ? "Running… Ctrl+C stops it" : ""}
            </span>
          </form>
          <p id={helpId} hidden>
            {messages.help}
          </p>
        </>
      ),
    } as never,
    "div",
  )
}

export { createTerminalController, Terminal, words }
export type { TerminalCommand, TerminalController, TerminalIO, TerminalMessages, TerminalResult }
