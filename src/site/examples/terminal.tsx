import { Terminal, type TerminalCommand } from "@/registry/uiset/ui/terminal"

const files: Record<string, string> = {
  "README.md":
    "# Greeter\nSays good morning, afternoon or evening.\nDocs: https://example.com/greeter",
  "package.json": '{\n  "name": "greeter",\n  "version": "1.0.0"\n}',
  "notes.txt": "Ship on Friday.\nAsk Grace about the compiler.",
}

// Waits, or stops early on Ctrl+C; the listener goes either way.
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer)
      reject(new Error("stopped"))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", stop)
      resolve()
    }, ms)
    signal.addEventListener("abort", stop, { once: true })
  })

const commands: Record<string, TerminalCommand> = {
  echo: {
    description: "Prints its words",
    usage: "<words…>",
    run: (args) => args.join(" "),
  },
  ls: { description: "Lists the files", run: () => Object.keys(files).join("   ") },
  cat: {
    description: "Prints a file",
    usage: "<file>",
    complete: () => Object.keys(files),
    run: (args, io) => {
      if (!args[0]) throw new Error("cat: which file? Try ls.")
      const text = files[args[0]]
      if (text === undefined) throw new Error(`cat: ${args[0]}: no such file`)
      io.print(`${text}\n`)
    },
  },
  colors: {
    description: "Shows the terminal's colors",
    run: (_args, io) => {
      const names = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
      ]
      io.print(`${names.map((name, i) => `\x1b[3${i}m${name}\x1b[0m`).join(" ")}\n`)
      io.print(
        `\x1b[1mbold\x1b[0m \x1b[2mdim\x1b[0m \x1b[2;31mdim red\x1b[0m \x1b[90mgrey\x1b[0m \x1b[3mitalic\x1b[0m \x1b[4munderline\x1b[0m \x1b[9mstruck\x1b[0m\n`,
      )
      // Test runners' badges are inverse video.
      io.print(
        `\x1b[7m\x1b[1m\x1b[32m PASS \x1b[0m src/greet.test.ts   \x1b[7m\x1b[1m\x1b[31m FAIL \x1b[0m src/format.test.ts\n`,
      )
    },
  },
  install: {
    description: "Installs, with a spinner that redraws its line",
    async *run(_args, io) {
      for (const [i, frame] of ["⠋", "⠙", "⠹", "⠸", "⠼"].entries()) {
        await wait(80, io.signal)
        yield `\x1b[2K\x1b[1G${frame} Installing ${i + 1} of 5…`
      }
      yield "\x1b[2K\x1b[1G\x1b[32m✓\x1b[0m Installed 5 packages\n"
    },
  },
  sleep: {
    description: "Waits, without listening for Ctrl+C (the prompt comes back anyway)",
    usage: "<seconds>",
    run: (args) =>
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("Done waiting."), Number(args[0] ?? 1) * 1000),
      ),
  },
  build: {
    description: "Builds the project, with a progress bar",
    async *run(_args, io) {
      yield "Building greeter…\n"
      for (let percent = 0; percent <= 100; percent += 20) {
        await wait(120, io.signal)
        const bar = "█".repeat(percent / 10).padEnd(10, "░")
        yield `\r${bar} ${percent}%`
      }
      yield "\n\x1b[32m✓\x1b[0m Built in 0.6s\n"
    },
  },
  ping: {
    description: "Pings until you press Ctrl+C",
    usage: "<host>",
    async run(args, io) {
      const host = args[0] ?? "localhost"
      for (let i = 1; !io.signal.aborted; i++) {
        io.print(`reply from ${host}: seq=${i} time=${(10 + (i % 3)).toFixed(1)} ms\n`)
        await wait(400, io.signal).catch(() => {})
      }
    },
  },
}

export default function TerminalExample() {
  return (
    <Terminal
      label="Shell"
      prompt="~/greeter $"
      commands={commands}
      welcome={
        "Welcome. Type help for the commands; Tab completes, Up brings back the last one."
      }
      defaultHistory={["ls"]}
    />
  )
}
