# Terminal

A terminal for commands your app defines, like a web shell, a dev console or a CLI in the
browser. Built on UI SDK's `createInputHistory` (Up and Down) and `createStickToBottom`
(output follows its end unless you scroll up).

```bash
npx shadcn@latest add @uiset/terminal
```

## Use

```tsx
<Terminal
  label="Shell"
  prompt="~/app $"
  welcome="Type help for the commands."
  commands={{
    echo: { description: "Prints its words", usage: "<words…>", run: (args) => args.join(" ") },
    cat: {
      description: "Prints a file",
      usage: "<file>",
      complete: () => Object.keys(files),
      run: (args, io) => io.print(read(args[0])),
    },
    build: {
      description: "Builds, with a progress bar",
      async *run(_args, io) {
        for (let p = 0; p <= 100; p += 10) {
          await step(io.signal)
          yield `\r${p}%`
        }
        yield "\n\x1b[32m✓\x1b[0m done\n"
      },
    },
  }}
  onCommand={(line, io) => sendToServer(line, { signal: io.signal, onOutput: io.print })}
/>

// Output from elsewhere, like a socket:
const [shell] = useState(createTerminalController)
<Terminal label="Shell" controller={shell} … />
socket.onmessage = (event) => shell.print(event.data)
```

- A command's `run(args, io)` returns a string, a Promise of one, nothing (after calling
  `io.print` and `io.error`), or an async iterable that streams. A thrown error prints in the
  danger tone. `io.signal` aborts on Ctrl+C, and the prompt comes back at once even if the
  command doesn't listen.
- Output goes through a small screen with a cursor, as a real terminal's does: `\r` returns to
  the line's start and what follows overwrites it (progress bars), `\b` steps back, and the
  erase-line, column and cursor-up codes spinners use (`\e[2K`, `\e[G`, `\e[A`) redraw in
  place. An escape split across two chunks waits for the rest; styles carry across lines.
- ANSI styles: the 16 colors as 9 tokens (bright black is a muted grey), backgrounds as tints,
  bold, dim, italic, underline, strikethrough, and inverse as a solid fill (so test runners'
  PASS and FAIL badges stay readable). 256-color and true-color codes keep the skin's colors.
  URLs and OSC 8 links become links, http(s) only. Control and bidi-override characters are
  dropped.
- The page catches up once a frame, however fast output comes, and only changed lines draw
  again. Old lines go only while you're following the end, so what you're reading stays put.
- `help`, `clear` and `history` come built in. `onCommand` gets lines no command matched.
- `messages` replaces the terminal's own words, for other languages.
- `controller` (`createTerminalController()`) writes output (`print`, `error`), runs and clears
  from outside, like a socket's messages.
- `scrollback` caps the lines kept (2000).
- The colors are `--term-red` and friends, checked at 4.5:1 on the terminal in every skin and
  scheme. "Black" and "white" follow the scheme instead of vanishing into it.

## Keys

| Keys              | Does                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| Enter             | Runs the line                                                        |
| Up, Down          | Earlier and later commands; Down past the newest brings back your draft |
| Tab               | Completes a command, or an argument with `complete` (quoting words with spaces); a second Tab lists several. With nothing to complete, Tab moves on |
| Ctrl+C            | Stops the running command, or drops the line; with text selected, copies |
| Ctrl+L            | Clears the screen                                                    |

The output is a `log` region that takes focus for scrolling by keyboard; a click on it puts
the caret in the prompt unless you were selecting text.

## For agents

`runCommand(command)` and `clear()`. `runCommand` takes one line of plain text: control
characters, which could fake what the person sees echoed, are refused. `query({ within:
"Shell" })` returns the last 50 lines as plain text, keyed by line. Commands can do
anything your app lets them, so gate `runCommand` with the agent bridge's `allow` callback
where that matters. (Your code calls the same thing as `run`; since UI SDK 0.1.0-beta.8 the
bridge reads a `run` action's argument as one of the component's items.)

## Screen readers

The output is a log that reads out new lines, not lines redrawn in place, so a progress
bar is read once. Lines the terminal also announces (Ctrl+C, a completion list) are
hidden from it. A very fast stream still reads every line; summarize long output in your
command if that matters.
