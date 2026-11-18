// The terminal's behavior without a framework: its primitive (what agents run and read),
// command lines split into words, the built-in commands, running and stopping a command,
// and Tab completion. The React Terminal and the web element both run on it, so they can't
// drift; each only draws the screen and the prompt.
import { announce, createController, definePrimitive } from "@ui-sdk/core"
import { plain, Screen } from "./ansi"

type TerminalIO = {
  /** Writes output. "\n" ends a line; "\r" goes back to its start, so a progress bar redraws. */
  print: (text: string) => void
  /** Writes to the error stream: text without its own color shows in the danger tone. */
  error: (text: string) => void
  /** Aborts when someone presses Ctrl+C. The prompt comes back at once either way. */
  signal: AbortSignal
}

type TerminalResult = void | string | Promise<void | string> | AsyncIterable<string>

type TerminalCommand = {
  /** One line for `help`. */
  description?: string
  /** Its arguments, like "<file>", shown by `help`. */
  usage?: string
  run: (args: string[], io: TerminalIO) => TerminalResult
  /** Suggestions for the argument being typed, for Tab. */
  complete?: (args: string[]) => string[]
}

type TerminalMessages = {
  notFound: (name: string) => string
  stillRunning: string
  stopped: string
  busy: string
  newOutput: string
  command: string
  help: string
}

const english: TerminalMessages = {
  notFound: (name) => `${name}: command not found. Type help for the list.`,
  stillRunning: "Still running. Press Ctrl+C to stop it.",
  stopped: "Stopped.",
  busy: "A command is still running. Wait for it, or the person can press Ctrl+C.",
  newOutput: "New output below",
  command: "Command line",
  help: "Up and Down bring back earlier commands. Tab completes. Ctrl+C stops a running command, Ctrl+L clears.",
}

/** What code outside the terminal can do: write output from a server, run, clear. */
type TerminalControllerApi = {
  run(command: string): boolean
  clear(): boolean
  print(text: string): boolean
  error(text: string): boolean
}
const createTerminalController = () => createController<TerminalControllerApi>()
type TerminalController = ReturnType<typeof createTerminalController>

// Agents run commands and read output through the same paths as the person.
/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const terminalPrimitive = definePrimitive({
  name: "terminal",
  options: {
    onRun: "action",
    onClear: "callback",
    onWrite: "callback",
    running: "boolean",
    busy: "string",
    output: "value",
    controller: "value",
  },
  state: (_options: {
    onRun?: (line: string) => void
    onClear?: () => void
    onWrite?: (text: string, error: boolean) => void
    running?: boolean
    busy?: string
    output?: () => { id: number; text: string }[]
    controller?: TerminalController
  }) => ({}),
  api: (context) => {
    const opts = () => context.options()
    return {
      /** Runs one line, as if typed at the prompt. */
      run(command: string) {
        const line = String(command ?? "")
        if (opts().running) throw new Error(opts().busy ?? english.busy)
        if (!line.trim()) throw new Error("Give a command to run.")
        // One line of text: control characters could fake what the person sees echoed.
        if (/[\x00-\x1f\x7f‪-‮⁦-⁩]/.test(line)) throw new Error("Give one line of plain text, without control characters.")
        opts().onRun?.(line)
        return true
      },
      /** Clears the output. */
      clear() {
        opts().onClear?.()
        return true
      },
      print(text: string) {
        opts().onWrite?.(String(text), false)
        return true
      },
      error(text: string) {
        opts().onWrite?.(String(text), true)
        return true
      },
      /** The last lines of output, as plain text, keyed by line. */
      items: () => (opts().output?.() ?? []).slice(-50).map((line) => ({ value: String(line.id), label: line.text })),
    }
  },
  slots: (slot) => ({
    root: slot({
      role: "group",
      attrs: () => ({ "aria-roledescription": "terminal" }),
    }),
  }),
  agent: { actions: ["run", "clear"], items: (api) => api.items() },
})

/** Splits a command line into words, keeping quoted words whole. */
function words(line: string) {
  return [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]!)
}

/** A word for the command line: quoted when it holds spaces or quotes. */
const quote = (word: string) => (/[\s"']/.test(word) ? `"${word.replace(/"/g, "'")}"` : word)

const commonPrefix = (list: string[]) =>
  list.reduce((prefix, word) => {
    let i = 0
    while (i < prefix.length && prefix[i] === word[i]) i++
    return prefix.slice(0, i)
  })

type SessionOptions = {
  screen: Screen
  /** Read at each use, so new commands, words and handlers take effect at once. */
  commands: () => Record<string, TerminalCommand>
  onCommand: () => ((line: string, io: TerminalIO) => TerminalResult) | undefined
  messages: () => TerminalMessages
  onRunning: (running: boolean) => void
  history?: string[]
}

/**
 * Runs command lines on a screen: the built-in `help`, `clear` and `history`, your
 * commands (printing, streaming an async iterable, or failing), Ctrl+C to stop one, and
 * Tab completion. `onRunning` says when one starts and ends.
 */
function createTerminalSession(options: SessionOptions) {
  const { screen } = options
  let sent = [...(options.history ?? [])]
  let abort: AbortController | null = null

  const builtins: Record<string, TerminalCommand> = {
    help: {
      description: "Lists the commands",
      run: (_args, io) => {
        const all = commands()
        const width = Math.max(...Object.keys(all).map((name) => name.length + (all[name]!.usage?.length ?? 0) + 1))
        for (const [name, command] of Object.entries(all).sort(([a], [b]) => a.localeCompare(b))) {
          const head = `${name}${command.usage ? ` ${command.usage}` : ""}`
          io.print(`\x1b[1m${head}\x1b[22m${" ".repeat(Math.max(2, width - head.length + 2))}${command.description ?? ""}\n`)
        }
      },
    },
    clear: { description: "Clears the screen (Ctrl+L)", run: () => screen.clear() },
    history: {
      description: "Lists the commands you've run",
      run: (_args, io) => sent.forEach((line, i) => io.print(`${String(i + 1).padStart(4)}  ${line}\n`)),
    },
  }
  const commands = () => ({ ...builtins, ...options.commands() })
  // Own commands only: "toString" or "constructor" isn't a command.
  const commandOf = (name: string) => {
    const all = commands()
    return Object.hasOwn(all, name) ? all[name] : undefined
  }

  async function execute(line: string) {
    screen.note(plain(line), "command")
    if (line.trim()) sent = [...sent.filter((l) => l !== line), line].slice(-500)
    const [name, ...args] = words(line)
    if (!name) return
    const command = commandOf(name)
    const onCommand = options.onCommand()
    const messages = options.messages()
    const controller = new AbortController()
    abort = controller
    const io: TerminalIO = {
      print: (text) => void (!controller.signal.aborted && screen.write(text)),
      error: (text) => void (!controller.signal.aborted && screen.write(text, { error: true })),
      signal: controller.signal,
    }
    // Ctrl+C ends the wait, even for a command that never looks at its signal.
    const stopped = new Promise<"stopped">((resolve) => controller.signal.addEventListener("abort", () => resolve("stopped"), { once: true }))
    options.onRunning(true)
    try {
      if (!command && !onCommand) io.error(`${messages.notFound(name)}\n`)
      const result = command ? command.run(args, io) : onCommand ? onCommand(line, io) : undefined
      if (result && typeof result === "object" && Symbol.asyncIterator in result) {
        const chunks = (result as AsyncIterable<string>)[Symbol.asyncIterator]()
        while (true) {
          const next = await Promise.race([chunks.next(), stopped])
          if (next === "stopped") {
            void chunks.return?.()
            break
          }
          if (next.done) break
          io.print(next.value)
        }
      } else {
        const value = await Promise.race([Promise.resolve(result), stopped])
        if (typeof value === "string" && value !== "stopped") io.print(value.endsWith("\n") ? value : `${value}\n`)
      }
    } catch (failure) {
      if (!controller.signal.aborted) io.error(`${failure instanceof Error ? failure.message : String(failure ?? "Failed.")}\n`)
    } finally {
      // Only the command still running clears the running state: a stopped one already did.
      if (abort === controller) {
        screen.finish()
        abort = null
        options.onRunning(false)
      }
    }
  }

  /** Ctrl+C on a running command: it stops, and the prompt comes back at once. */
  function stop() {
    abort?.abort()
    abort = null
    screen.finish()
    screen.note("^C", "info", { quiet: true })
    options.onRunning(false)
    announce(options.messages().stopped)
  }

  /** What Tab can put in: the options for the word being typed, and what comes before it. */
  function complete(value: string) {
    const found = [...value.matchAll(/"([^"]*)"?|'([^']*)'?|(\S+)/g)]
    if (!found.length) return null
    const ending = /\s$/.test(value)
    const last = found.at(-1)!
    const partial = ending ? "" : (last[1] ?? last[2] ?? last[3] ?? "")
    // What's kept is everything before the word being typed, by its place in the line.
    const before = ending ? value : value.slice(0, last.index)
    if (found.length === 1 && !ending) {
      const options = Object.keys(commands()).filter((name) => name.startsWith(partial)).sort()
      return { options, partial, before }
    }
    const command = commandOf(found[0]![1] ?? found[0]![2] ?? found[0]![3]!)
    if (!command?.complete) return null
    const args = found.slice(1).map((m) => m[1] ?? m[2] ?? m[3]!)
    if (ending) args.push("")
    const options = command.complete(args).filter((option) => option.startsWith(partial)).sort()
    return { options, partial, before }
  }

  /**
   * Tab on `value`: the new text for the prompt, or a list to show (the second Tab with
   * several matches, as shells do), or nothing to do (Tab then moves on).
   */
  function tab(value: string, lastTab: string | null): { set?: string; list?: string[] } | null {
    const found = complete(value)
    if (!found || !found.options.length) return null
    if (found.options.length === 1) return { set: `${found.before}${quote(found.options[0]!)} ` }
    const prefix = commonPrefix(found.options)
    if (prefix.length > found.partial.length) return { set: `${found.before}${quote(prefix)}` }
    return lastTab === value ? { list: found.options } : {}
  }

  return {
    execute,
    stop,
    complete,
    tab,
    /** Aborts a running command quietly, as the terminal leaves the page. */
    dispose: () => {
      abort?.abort()
      abort = null
    },
    running: () => abort !== null,
    sent: () => sent,
    /** Commands Up brings back, before any have run here. */
    seed: (lines: string[]) => {
      if (!sent.length) sent = [...lines]
    },
  }
}

export { commonPrefix, createTerminalController, createTerminalSession, english, quote, terminalPrimitive, words }
export type { TerminalCommand, TerminalController, TerminalControllerApi, TerminalIO, TerminalMessages, TerminalResult }
