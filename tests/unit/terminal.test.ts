import { expect, test } from "vitest"
import { plain, Screen } from "@/registry/uiset/ui/terminal/ansi"
import { words } from "@/registry/uiset/ui/terminal"

const lines = (screen: Screen) => screen.lines.map(Screen.text)
const write = (...chunks: string[]) => {
  const screen = new Screen()
  for (const chunk of chunks) screen.write(chunk)
  return screen
}

test("styles become runs, and carry across lines and chunks", () => {
  const screen = write("a\x1b[1;31mb\x1b[22mc", "\nd\x1b[0me")
  expect(Screen.runs(screen.lines[0]!)).toEqual([{ text: "a" }, { text: "b", bold: true, fg: "red" }, { text: "c", fg: "red" }])
  expect(Screen.runs(screen.lines[1]!)).toEqual([{ text: "d", fg: "red" }, { text: "e" }])
})

test("bright black is grey; colon codes, true colors and underline colors keep the skin's colors", () => {
  expect(Screen.runs(write("\x1b[90mnote").lines[0]!)).toEqual([{ text: "note", fg: "grey" }])
  expect(lines(write("\x1b[38:5:196mx\x1b[38;2;200;1;3my\x1b[58;2;9;9;9mz\x1b[4:3mw"))).toEqual(["xyzw"])
  expect(Screen.runs(write("\x1b[38;2;200;1;3mtext").lines[0]!)).toEqual([{ text: "text" }])
})

test("a carriage return goes back to the line's start: what follows overwrites, nothing else erases", () => {
  expect(lines(write("50%\r"))).toEqual(["50%"])
  expect(lines(write("Building…\n", "\r10%", "\r50%", "\r100%\n", "done\n"))).toEqual(["Building…", "100%", "done", ""])
  // A "\r\n" split across chunks is still one line break.
  expect(lines(write("first line\r", "\nsecond\r\n"))).toEqual(["first line", "second", ""])
})

test("spinners that erase the line and move to column 1 redraw in place", () => {
  const frames = ["⠋", "⠙", "⠹"].map((f) => `\x1b[2K\x1b[1G${f} Installing`)
  expect(lines(write(...frames))).toEqual(["⠹ Installing"])
  // Two lines redrawn by moving up, erasing and writing again.
  expect(lines(write("a 1\nb 1", "\x1b[1A\x1b[2K\x1b[Ga 2\n\x1b[2K\x1b[Gb 2"))).toEqual(["a 2", "b 2"])
  expect(lines(write("abc\bX"))).toEqual(["abX"])
  // A shorter frame after a longer one: the erase leaves nothing of the old text behind.
  expect(lines(write("Installing 10 of 10", "\x1b[2K\x1b[1GDone"))).toEqual(["Done"])
})

test("an escape cut between two chunks waits for the rest", () => {
  expect(Screen.runs(write("x\x1b[3", "2mgreen").lines[0]!)).toEqual([{ text: "x" }, { text: "green", fg: "green" }])
})

test("OSC 8 links are kept only for http(s); control and bidi characters are dropped", () => {
  const screen = write("\x1b]8;;https://example.com\x07docs\x1b]8;;\x07 and \x1b]8;;javascript:alert(1)\x07bad\x1b]8;;\x07")
  expect(Screen.runs(screen.lines[0]!)).toEqual([{ text: "docs", link: "https://example.com" }, { text: " and bad" }])
  expect(lines(write("a\x07b\x00c‮exe.live"))).toEqual(["abcexe.live"])
  expect(plain("\x1b[32m✓\x1b[0m done\x07")).toBe("✓ done")
})

test("error output without its own color takes the danger tone", () => {
  const screen = new Screen()
  screen.write("oops ", { error: true })
  screen.write("\x1b[33mwarned", { error: true })
  expect(Screen.runs(screen.lines[0]!)).toEqual([{ text: "oops ", fg: "red" }, { text: "warned", fg: "yellow" }])
})

test("the terminal's own lines stand apart, and trimming keeps the newest", () => {
  const screen = write("partial")
  screen.note("ls", "command")
  screen.write("a\nb\nc\n")
  expect(screen.lines.map((l) => [l.kind, Screen.text(l)])).toEqual([
    ["out", "partial"],
    ["command", "ls"],
    ["out", "a"],
    ["out", "b"],
    ["out", "c"],
    ["out", ""],
  ])
  screen.trim(2)
  expect(lines(screen)).toEqual(["c", ""])
})

test("command lines split into words, keeping quoted words whole", () => {
  expect(words(`git commit -m "first try" 'it is'`)).toEqual(["git", "commit", "-m", "first try", "it is"])
  expect(words("   ")).toEqual([])
})
