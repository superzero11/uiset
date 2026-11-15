// A small terminal screen: text and ANSI escapes in, styled lines out. It keeps a cursor,
// so "\r" goes back to the start of the line and what follows overwrites it (progress
// bars), "\b" steps back, and the erase-line and cursor codes spinners use work. Styles
// carry across lines and chunks; an escape split between two chunks waits for the rest.

type Color = "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "grey"

type Style = {
  fg?: Color
  bg?: Color
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  inverse?: boolean
  /** An http(s) link from an OSC 8 hyperlink. */
  link?: string
}

type Run = { text: string } & Style

type Cell = { ch: string; style: Style }

type ScreenLine = {
  id: number
  kind: "out" | "command" | "info"
  cells: Cell[]
  /** Bumped on every change, so a line re-renders only when it changed. */
  version: number
  /** Lines the screen reader shouldn't hear (they're announced another way). */
  quiet?: boolean
}

const colors: Color[] = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"]
const plainStyle: Style = Object.freeze({})

function applyCodes(style: Style, params: string): Style {
  const codes = params === "" ? [0] : params.split(/[;:]/).map((n) => Number(n) || 0)
  const next: Style = { ...style }
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]!
    if (code === 0) {
      for (const key of Object.keys(next) as (keyof Style)[]) if (key !== "link") delete next[key]
    } else if (code === 1) next.bold = true
    else if (code === 2) next.dim = true
    else if (code === 3) next.italic = true
    else if (code === 4) next.underline = true
    else if (code === 7) next.inverse = true
    else if (code === 9) next.strike = true
    else if (code === 22) (delete next.bold, delete next.dim)
    else if (code === 23) delete next.italic
    else if (code === 24) delete next.underline
    else if (code === 27) delete next.inverse
    else if (code === 29) delete next.strike
    else if (code >= 30 && code <= 37) next.fg = colors[code - 30]
    // Bright black is the grey that test runners and package managers write their asides in.
    else if (code === 90) next.fg = "grey"
    else if (code >= 91 && code <= 97) next.fg = colors[code - 90]
    else if (code === 39) delete next.fg
    else if (code >= 40 && code <= 47) next.bg = colors[code - 40]
    else if (code === 100) next.bg = "grey"
    else if (code >= 101 && code <= 107) next.bg = colors[code - 100]
    else if (code === 49) delete next.bg
    // 256-color, true-color and underline-color codes name colors the skin can't promise to
    // keep readable: their arguments are skipped and the text keeps the skin's colors.
    else if (code === 38 || code === 48 || code === 58) i += codes[i + 1] === 5 ? 2 : codes[i + 1] === 2 ? 4 : 0
  }
  return next
}

const csi = /^\x1b\[([0-?]*)([ -/]*)([@-~])/
const osc = /^\x1b\]([^\x07\x1b]*)(?:\x07|\x1b\\)/
// Characters that would reorder or hide text: bidi overrides and isolates.
const bidi = /[‪-‮⁦-⁩]/

class Screen {
  lines: ScreenLine[] = []
  private row = -1
  private col = 0
  private style: Style = plainStyle
  private partial = ""
  private nextId = 0
  private errorStyles = new WeakMap<Style, Style>()

  constructor(private onTouch: () => void = () => {}) {}

  /** The text of a line, without styles. */
  static text(line: ScreenLine) {
    return line.cells.map((cell) => cell.ch).join("")
  }

  /** A line as runs of one style. Cells share style objects, so runs group by reference. */
  static runs(line: ScreenLine): Run[] {
    const runs: Run[] = []
    let current: Style | null = null
    for (const cell of line.cells) {
      if (cell.style === current) runs[runs.length - 1]!.text += cell.ch
      else {
        runs.push({ ...cell.style, text: cell.ch })
        current = cell.style
      }
    }
    return runs
  }

  private line(): ScreenLine {
    if (this.row < 0 || this.row >= this.lines.length) {
      this.lines.push({ id: this.nextId++, kind: "out", cells: [], version: 0 })
      this.row = this.lines.length - 1
    }
    return this.lines[this.row]!
  }

  private touch(line: ScreenLine) {
    line.version++
  }

  private put(ch: string, style: Style) {
    const line = this.line()
    while (line.cells.length < this.col) line.cells.push({ ch: " ", style: plainStyle })
    line.cells[this.col] = { ch, style }
    this.col++
    this.touch(line)
  }

  /** Writes program output; `error` draws text without its own color in the danger tone. */
  write(text: string, { error = false } = {}) {
    let input = this.partial + text
    this.partial = ""
    // Error output without a color of its own takes the danger tone, one style per style.
    const styleNow = () => {
      if (!error || this.style.fg) return this.style
      let red = this.errorStyles.get(this.style)
      if (!red) this.errorStyles.set(this.style, (red = { ...this.style, fg: "red" }))
      return red
    }
    while (input.length) {
      const ch = input[0]!
      if (ch === "\x1b") {
        const control = input.match(csi)
        if (control) {
          this.control(control[1]!, control[3]!)
          input = input.slice(control[0].length)
          continue
        }
        const command = input.match(osc)
        if (command) {
          const [kind, , url] = command[1]!.split(";")
          if (kind === "8") {
            // Only http(s) links are kept; anything else is plain text.
            const link = url && /^https?:\/\//i.test(url) ? url : undefined
            if (link !== this.style.link) {
              const next = { ...this.style }
              if (link) next.link = link
              else delete next.link
              this.style = next
            }
          }
          input = input.slice(command[0].length)
          continue
        }
        // An escape cut off by the end of the chunk waits for the next one.
        if (/^\x1b(\[[0-?]*[ -/]*|\][^\x07\x1b]*(\x1b)?)?$/.test(input) && input.length < 4096) {
          this.partial = input
          break
        }
        // Any other escape: the escape and its one byte are dropped.
        input = input.slice(2)
        continue
      }
      input = input.slice(ch.length)
      if (ch === "\n") {
        this.row++
        this.col = 0
        if (this.row >= this.lines.length) this.line()
      } else if (ch === "\r") this.col = 0
      else if (ch === "\b") this.col = Math.max(0, this.col - 1)
      else if (ch === "\t") {
        const to = (Math.floor(this.col / 8) + 1) * 8
        while (this.col < to) this.put(" ", plainStyle)
      } else if (ch < " " || ch === "\x7f" || bidi.test(ch)) continue
      else this.put(ch, styleNow())
    }
    this.onTouch()
  }

  private control(params: string, final: string) {
    // Private sequences (like "?25l", hide the cursor) change nothing on a web page.
    if (/^[<=>?]/.test(params)) return
    const n = Number(params.split(";")[0]) || 0
    if (final === "m") this.style = applyCodes(this.style, params)
    else if (final === "K") {
      const line = this.line()
      if (n === 0) line.cells.length = Math.min(line.cells.length, this.col)
      else if (n === 1) for (let i = 0; i <= this.col && i < line.cells.length; i++) line.cells[i] = { ch: " ", style: plainStyle }
      else line.cells = []
      this.touch(line)
    } else if (final === "G") this.col = Math.max(0, (n || 1) - 1)
    else if (final === "C") this.col += n || 1
    else if (final === "D") this.col = Math.max(0, this.col - (n || 1))
    else if (final === "A") this.row = Math.max(0, (this.row < 0 ? this.lines.length - 1 : this.row) - (n || 1))
    else if (final === "B") this.row = Math.min(this.lines.length - 1, this.row + (n || 1))
    else if (final === "J" && (n === 2 || n === 3)) this.clear()
  }

  /** A whole line of the terminal's own, like an echoed command or a notice. */
  note(text: string, kind: "command" | "info", { quiet = false } = {}) {
    this.finish()
    const line: ScreenLine = {
      id: this.nextId++,
      kind,
      cells: [...text].filter((ch) => ch >= " " && !bidi.test(ch)).map((ch) => ({ ch, style: plainStyle })),
      version: 0,
      quiet,
    }
    this.lines.push(line)
    this.row = -1
    this.col = 0
    this.onTouch()
  }

  /** Ends an open line, so what's written next starts on its own. */
  finish() {
    if (this.row >= 0 && this.lines[this.row]?.cells.length === 0 && this.row === this.lines.length - 1) this.lines.pop()
    this.row = -1
    this.col = 0
    this.style = plainStyle
    this.partial = ""
  }

  /** Drops the oldest lines past `keep`. */
  trim(keep: number) {
    if (this.lines.length <= keep) return
    const drop = this.lines.length - keep
    this.lines.splice(0, drop)
    if (this.row >= 0) this.row = Math.max(-1, this.row - drop)
    this.onTouch()
  }

  clear() {
    this.lines = []
    this.row = -1
    this.col = 0
    this.onTouch()
  }
}

/** Plain text with every escape and control removed: for agents and announcements. */
const plain = (text: string) =>
  text
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b./g, "")
    .replace(/[\x00-\x1f\x7f‪-‮⁦-⁩]/g, "")

/** The text's URLs, for links in output; a closing period or comma isn't part of one. */
const urlPattern = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]|\bhttps?:\/\/[^\s<>"']+\([^\s<>"']*\)/g

export { plain, Screen, urlPattern }
export type { Color, Run, ScreenLine, Style }
