// Text edits a code editor makes on keys, as pure functions over the text and selection,
// so they're testable and the editor applies each as one native edit (keeping undo).

type Edit = {
  /** Replace the text from `from` to `to` with `insert`… */
  from: number
  to: number
  insert: string
  /** …then select from `start` to `end`. */
  start: number
  end: number
}

const lineStart = (text: string, at: number) => text.lastIndexOf("\n", at - 1) + 1

/** Line and column of an offset, both from 1. */
function lineCol(text: string, at: number) {
  const before = text.slice(0, at)
  const line = before.split("\n").length
  return { line, col: at - lineStart(text, at) + 1 }
}

/** The offset of a line and column (from 1), clamped to the text. */
function offsetOf(text: string, line: number, col = 1) {
  const lines = text.split("\n")
  const l = Math.max(1, Math.min(line, lines.length))
  let at = 0
  for (let i = 0; i < l - 1; i++) at += lines[i]!.length + 1
  return at + Math.max(0, Math.min(col - 1, lines[l - 1]!.length))
}

/**
 * Tab: with no selection, an indent at the caret; across lines, an indent at the start of
 * each line the selection touches.
 */
function indent(text: string, start: number, end: number, unit = "  "): Edit {
  if (start === end || !text.slice(start, end).includes("\n")) {
    return { from: start, to: end, insert: unit, start: start + unit.length, end: start + unit.length }
  }
  const from = lineStart(text, start)
  const to = end > from && text[end - 1] === "\n" ? end - 1 : end
  const block = text.slice(from, to)
  const lines = block.split("\n")
  const insert = lines.map((line) => (line.length ? unit + line : line)).join("\n")
  return { from, to, insert, start: start + unit.length, end: end + (insert.length - block.length) }
}

/** Shift+Tab: up to one indent off the start of each line the selection touches. */
function outdent(text: string, start: number, end: number, unit = "  "): Edit {
  const from = lineStart(text, start)
  // A selection ending at the very start of a line leaves that line alone.
  const last = end > start && text[end - 1] === "\n" ? end - 1 : end
  const lineEnd = text.indexOf("\n", last)
  const to = lineEnd < 0 ? text.length : lineEnd
  const block = text.slice(from, to)
  const cuts: number[] = []
  const insert = block
    .split("\n")
    .map((line) => {
      const lead = line.match(/^[ \t]*/)![0]
      const cut = lead.startsWith("\t") ? 1 : Math.min(lead.length, unit.length)
      cuts.push(cut)
      return line.slice(cut)
    })
    .join("\n")
  const removed = block.length - insert.length
  return {
    from,
    to,
    insert,
    start: Math.max(from, start - cuts[0]!),
    end: start === end ? Math.max(from, start - cuts[0]!) : Math.max(from, end - removed),
  }
}

/** Enter: a new line indented like the current one, one deeper after an opening bracket. */
function newline(text: string, start: number, end: number, unit = "  "): Edit {
  const line = text.slice(lineStart(text, start), start)
  const current = line.match(/^[ \t]*/)![0]
  const opens = /[{[(]\s*$/.test(line)
  const closes = /^\s*[}\])]/.test(text.slice(end, text.indexOf("\n", end) < 0 ? undefined : text.indexOf("\n", end)))
  if (opens && closes) {
    // Between a pair: the caret goes on its own indented line, the closer below it.
    const insert = `\n${current}${unit}\n${current}`
    const caret = start + 1 + current.length + unit.length
    return { from: start, to: end, insert, start: caret, end: caret }
  }
  const insert = `\n${current}${opens ? unit : ""}`
  return { from: start, to: end, insert, start: start + insert.length, end: start + insert.length }
}

/** The offset `delta` lines up or down from `at`, keeping its column where the line allows. */
function moveLines(text: string, at: number, delta: number) {
  const { line, col } = lineCol(text, at)
  return offsetOf(text, Math.max(1, line + delta), col)
}

export { indent, lineCol, moveLines, newline, offsetOf, outdent }
export type { Edit, Problem }

/** A problem in a file, from a linter or a language server: marked in the gutter, listed in Problems. */
type Problem = {
  path: string
  line: number
  col?: number
  severity: "error" | "warning" | "info"
  message: string
}
