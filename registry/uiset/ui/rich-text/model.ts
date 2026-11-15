// The rich text editor's document and its edits, without a DOM or a framework. A document
// is a flat list of blocks (lists are blocks with an indent, as in most editors people
// use); each text block holds inline runs of text with marks, and mentions. Every edit is
// a pure function from one state to the next, so the React editor and the web element
// apply the same edits, undo is a stack of states, and all of it is unit tested.

type Marks = {
  bold?: true
  italic?: true
  underline?: true
  strike?: true
  code?: true
  /** A safe link target (http, https, mailto, tel, or a relative path). */
  link?: string
}
type MarkName = Exclude<keyof Marks, "link">

type TextRun = { type?: "text"; text: string; marks?: Marks }
/** A mention or other token: one character wide for the caret, never split. */
type MentionRun = { type: "mention"; id: string; label: string; trigger?: string }
type Inline = TextRun | MentionRun

type TextBlockType = "paragraph" | "heading" | "quote" | "code" | "bullet" | "ordered" | "task"
type VoidBlockType = "divider" | "image"
type BlockType = TextBlockType | VoidBlockType

type Block = {
  id: string
  type: BlockType
  content: Inline[]
  /** Headings: 1 to 3. */
  level?: 1 | 2 | 3
  /** List items and tasks: 0 is the outer level. */
  indent?: number
  /** Tasks. */
  checked?: boolean
  /** Code blocks. */
  language?: string
  /** Images. */
  src?: string
  alt?: string
}

type Doc = Block[]
type Position = { block: number; offset: number }
type Selection = { anchor: Position; focus: Position }
type EditorState = {
  doc: Doc
  selection: Selection | null
  /** Marks for what's typed next at a collapsed caret, after Mod+B with nothing selected. */
  stored?: Marks | null
}

const MAX_INDENT = 4
const OBJECT = "￼"
const marks: MarkName[] = ["bold", "italic", "underline", "strike", "code"]

let nextId = 0
const newId = () => `b${Date.now().toString(36)}${(nextId++).toString(36)}`

/* ------------------------------------------------------------------ Basics */

const isVoid = (block: Block) => block.type === "divider" || block.type === "image"
const isList = (block: Block) => block.type === "bullet" || block.type === "ordered" || block.type === "task"
const isMention = (run: Inline): run is MentionRun => run.type === "mention"
const runLength = (run: Inline) => (isMention(run) ? 1 : run.text.length)
const blockLength = (block: Block) => block.content.reduce((n, run) => n + runLength(run), 0)
/** The block's text, a mention as U+FFFC (one character, as the trigger menu reads it). */
const blockText = (block: Block) => block.content.map((run) => (isMention(run) ? OBJECT : run.text)).join("")
/** The block's text as a person reads it: mentions as their label. */
/** Content as code holds it: one plain run, mentions as their text. */
const asCode = (content: Inline[]): Inline[] => {
  const text = content.map((run) => (isMention(run) ? `${run.trigger ?? "@"}${run.label}` : run.text)).join("")
  return text ? [{ text }] : []
}
/** Joins content onto a block; code keeps it plain. */
const joined = (into: Block, content: Inline[]): Inline[] => (into.type === "code" ? asCode(content) : normalize(content))
const plainText = (block: Block) => block.content.map((run) => (isMention(run) ? `${run.trigger ?? "@"}${run.label}` : run.text)).join("")

function block(type: BlockType = "paragraph", content: Inline[] = [], extra: Partial<Block> = {}): Block {
  return { id: newId(), type, content, ...extra }
}

const paragraph = (text = "") => block("paragraph", text ? [{ text }] : [])

const sameMarks = (a?: Marks, b?: Marks) => {
  const x = a ?? {}
  const y = b ?? {}
  return marks.every((m) => !!x[m] === !!y[m]) && (x.link ?? null) === (y.link ?? null)
}

const cleanMarks = (m?: Marks | null): Marks | undefined => {
  if (!m) return undefined
  const out: Marks = {}
  for (const name of marks) if (m[name]) out[name] = true
  if (m.link) out.link = m.link
  return Object.keys(out).length ? out : undefined
}

/** Merges neighbours with the same marks and drops empty runs. */
function normalize(content: Inline[]): Inline[] {
  const out: Inline[] = []
  for (const run of content) {
    if (isMention(run)) {
      out.push(run)
      continue
    }
    if (!run.text) continue
    const last = out.at(-1)
    if (last && !isMention(last) && sameMarks(last.marks, run.marks)) out[out.length - 1] = { text: last.text + run.text, marks: last.marks }
    else out.push({ text: run.text, ...(cleanMarks(run.marks) ? { marks: cleanMarks(run.marks) } : {}) })
  }
  return out
}

/** The runs before `offset` and from it on, splitting a text run at the boundary. */
function splitContent(content: Inline[], offset: number): [Inline[], Inline[]] {
  const before: Inline[] = []
  const after: Inline[] = []
  let at = 0
  for (const run of content) {
    const len = runLength(run)
    if (at + len <= offset) before.push(run)
    else if (at >= offset) after.push(run)
    else if (!isMention(run)) {
      const cut = offset - at
      before.push({ ...run, text: run.text.slice(0, cut) })
      after.push({ ...run, text: run.text.slice(cut) })
    } else after.push(run)
    at += len
  }
  return [normalize(before), normalize(after)]
}

function sliceContent(content: Inline[], from: number, to: number) {
  return splitContent(splitContent(content, to)[0], from)[1]
}

const ordered = (s: Selection): [Position, Position] => {
  const a = s.anchor
  const f = s.focus
  return a.block < f.block || (a.block === f.block && a.offset <= f.offset) ? [a, f] : [f, a]
}
const collapsed = (s: Selection) => s.anchor.block === s.focus.block && s.anchor.offset === s.focus.offset
const caret = (pos: Position): Selection => ({ anchor: pos, focus: pos })

function clampPosition(doc: Doc, pos: Position): Position {
  const b = Math.max(0, Math.min(pos.block, doc.length - 1))
  return { block: b, offset: Math.max(0, Math.min(pos.offset, blockLength(doc[b]!))) }
}

/** A document is never empty, and a void block never ends it, so there's always a place to type. */
function ensureDoc(doc: Doc): Doc {
  if (!doc.length) return [paragraph()]
  if (isVoid(doc.at(-1)!)) return [...doc, paragraph()]
  return doc
}

function withDoc(state: EditorState, doc: Doc, selection: Selection | null, stored: Marks | null = null): EditorState {
  const next = ensureDoc(doc)
  return { doc: next, selection: selection && { anchor: clampPosition(next, selection.anchor), focus: clampPosition(next, selection.focus) }, stored }
}

/* ------------------------------------------------------------------ Reading */

/** The marks of the character before the caret (or after it at a block start). */
function marksAtPosition(doc: Doc, pos: Position): Marks | undefined {
  const content = doc[pos.block]?.content ?? []
  let at = 0
  let before: Inline | undefined
  let after: Inline | undefined
  for (const run of content) {
    const len = runLength(run)
    if (at < pos.offset && pos.offset <= at + len) before = run
    if (!after && at >= pos.offset && len) after = run
    at += len
  }
  const run = before ?? after
  return run && !isMention(run) ? run.marks : undefined
}

/** Marks typing would use now: the stored ones, or the character before's, minus a link at its end. */
function typingMarks(state: EditorState): Marks | undefined {
  if (state.stored !== undefined && state.stored !== null) return cleanMarks(state.stored)
  if (!state.selection) return undefined
  // Typing over a selection (or a spellcheck replacing a word) keeps the marks the whole
  // selection shares, its link included.
  if (!collapsed(state.selection)) {
    let shared: Marks | null = null
    forEachRun(state, (run) => {
      if (isMention(run)) return
      const m = run.marks ?? {}
      if (shared === null) shared = { ...m }
      else for (const key of Object.keys(shared) as (keyof Marks)[]) if (m[key] !== shared[key]) delete shared[key]
    })
    if (shared !== null) return cleanMarks(shared)
  }
  const pos = ordered(state.selection)[0]
  const m = marksAtPosition(state.doc, pos)
  if (!m?.link) return m
  // A link doesn't grow when you type at its end.
  const next = marksAtPosition(state.doc, { block: pos.block, offset: pos.offset + 1 })
  const atEnd = !next?.link || next.link !== m.link || pos.offset === blockLength(state.doc[pos.block]!)
  if (!atEnd) return m
  const { link: _link, ...rest } = m
  return cleanMarks(rest)
}

/** Whether `mark` is on for the whole selection (or for typing, when it's a caret). */
function markActive(state: EditorState, mark: MarkName): boolean {
  if (!state.selection) return false
  if (collapsed(state.selection)) return !!typingMarks(state)?.[mark]
  let any = false
  let all = true
  forEachRun(state, (run) => {
    if (isMention(run)) return
    any = true
    if (!run.marks?.[mark]) all = false
  })
  return any && all
}

/** The link under the caret or shared by the whole selection. */
function activeLink(state: EditorState): string | null {
  if (!state.selection) return null
  if (collapsed(state.selection)) {
    const pos = state.selection.focus
    const m = marksAtPosition(state.doc, pos)
    return m?.link ?? marksAtPosition(state.doc, { block: pos.block, offset: pos.offset + 1 })?.link ?? null
  }
  let link: string | null | undefined
  forEachRun(state, (run) => {
    const l = isMention(run) ? null : (run.marks?.link ?? null)
    link = link === undefined ? l : link === l ? l : null
  })
  return link ?? null
}

/** The range of the link run around a caret, to select it before editing the link. */
function linkRange(state: EditorState): Selection | null {
  const href = activeLink(state)
  if (!href || !state.selection) return null
  const pos = state.selection.focus
  const content = state.doc[pos.block]!.content
  let at = 0
  let start = -1
  let end = -1
  for (const run of content) {
    const len = runLength(run)
    const linked = !isMention(run) && run.marks?.link === href
    if (linked && start < 0 && at <= pos.offset) start = at
    if (linked && start >= 0) end = at + len
    if (!linked && start >= 0 && end >= pos.offset) break
    if (!linked && at + len <= pos.offset) start = -1
    at += len
  }
  if (start < 0 || end < pos.offset) return null
  return { anchor: { block: pos.block, offset: start }, focus: { block: pos.block, offset: end } }
}

/** The type the selection's blocks share, or null when they differ. */
function activeBlock(state: EditorState): { type: BlockType; level?: number } | null {
  if (!state.selection) return null
  const [from, to] = ordered(state.selection)
  const first = state.doc[from.block]!
  for (let i = from.block; i <= to.block; i++) {
    const b = state.doc[i]!
    if (b.type !== first.type || (b.type === "heading" && b.level !== first.level)) return null
  }
  return { type: first.type, ...(first.type === "heading" ? { level: first.level } : {}) }
}

/** Calls `visit` for each run (or part of one) inside the selection. */
function forEachRun(state: EditorState, visit: (run: Inline, block: Block) => void) {
  if (!state.selection) return
  const [from, to] = ordered(state.selection)
  for (let i = from.block; i <= to.block; i++) {
    const b = state.doc[i]!
    if (isVoid(b)) continue
    const start = i === from.block ? from.offset : 0
    const end = i === to.block ? to.offset : blockLength(b)
    for (const run of sliceContent(b.content, start, end)) visit(run, b)
  }
}

/** The selected part of the document, as blocks (for copy and drag). */
function fragment(state: EditorState): Doc {
  if (!state.selection || collapsed(state.selection)) return []
  const [from, to] = ordered(state.selection)
  const out: Doc = []
  for (let i = from.block; i <= to.block; i++) {
    const b = state.doc[i]!
    if (isVoid(b)) {
      out.push({ ...b })
      continue
    }
    const start = i === from.block ? from.offset : 0
    const end = i === to.block ? to.offset : blockLength(b)
    out.push({ ...b, id: newId(), content: sliceContent(b.content, start, end) })
  }
  return out
}

/* ------------------------------------------------------------------ Edits */

/** Removes the selected content, joining the first and last block. */
function deleteSelection(state: EditorState): EditorState {
  if (!state.selection || collapsed(state.selection)) return state
  const doc = state.doc
  let [from, to] = ordered(state.selection)
  // Everything selected and deleted leaves a fresh paragraph, as a new document starts.
  const end = doc[to.block]!
  if (from.block === 0 && from.offset === 0 && to.block === doc.length - 1 && (isVoid(end) || to.offset >= blockLength(end))) {
    return withDoc(state, [{ ...paragraph(), id: doc[0]!.id }], caret({ block: 0, offset: 0 }))
  }
  // Whole blocks selected up to the start of the next one (as a triple-click selects):
  // the next block isn't part of it, so it keeps its own type and text.
  if (from.offset === 0 && to.offset === 0 && to.block > from.block) to = { block: to.block - 1, offset: blockLength(doc[to.block - 1]!) }
  const first = doc[from.block]!
  const last = doc[to.block]!
  const head = isVoid(first) ? [] : splitContent(first.content, from.offset)[0]
  const tail = isVoid(last) ? [] : splitContent(last.content, to.offset)[1]
  // The first block keeps its type, unless it was a void block (then the last one's type).
  const base = isVoid(first) ? (isVoid(last) ? paragraph() : { ...last, content: [] }) : first
  const merged: Block = { ...base, content: joined(base, [...head, ...tail]) }
  const next = [...doc.slice(0, from.block), merged, ...doc.slice(to.block + 1)]
  return withDoc(state, next, caret({ block: from.block, offset: isVoid(first) ? 0 : from.offset }))
}

/** Inserts runs at the caret, replacing any selection. Runs take `marks` unless they have their own. */
function insertContent(state: EditorState, content: Inline[]): EditorState {
  const cleared = deleteSelection(state)
  if (!cleared.selection) return state
  const pos = cleared.selection.focus
  const target = cleared.doc[pos.block]!
  if (isVoid(target)) {
    // Typing on an image or a rule makes a paragraph after it.
    const p = block("paragraph", normalize(content))
    const doc = [...cleared.doc.slice(0, pos.block + 1), p, ...cleared.doc.slice(pos.block + 1)]
    return withDoc(cleared, doc, caret({ block: pos.block + 1, offset: blockLength(p) }))
  }
  // Code keeps plain text: no marks, mentions read as their text.
  const runs = target.type === "code" ? content.map((run) => ({ text: isMention(run) ? `${run.trigger ?? "@"}${run.label}` : run.text })) : content
  const [before, after] = splitContent(target.content, pos.offset)
  const inserted = normalize(runs)
  const doc = cleared.doc.slice()
  doc[pos.block] = { ...target, content: normalize([...before, ...inserted, ...after]) }
  const length = inserted.reduce((n, run) => n + runLength(run), 0)
  return withDoc(cleared, doc, caret({ block: pos.block, offset: pos.offset + length }), cleared.stored ?? null)
}

/** Types text at the caret: new lines split blocks, as pasting plain text does. */
function insertText(state: EditorState, text: string): EditorState {
  if (!state.selection) return state
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  const marksNow = typingMarks(state)
  const inCode = state.doc[ordered(state.selection)[0].block]?.type === "code"
  if (inCode) return keepStored(insertContent(state, [{ text: lines.join("\n") }]), null)
  let next = state
  lines.forEach((line, i) => {
    if (i > 0) next = splitBlock(next)
    if (line) next = insertContent({ ...next, stored: next.stored }, [{ text: line, ...(marksNow ? { marks: marksNow } : {}) }])
  })
  // Stored marks stay on while typing continues, until the caret moves.
  return keepStored(next, state.stored ?? null)
}

const keepStored = (state: EditorState, stored: Marks | null): EditorState => ({ ...state, stored })

/** A soft line break inside the block (Shift+Enter). */
function insertLineBreak(state: EditorState): EditorState {
  return insertContent(state, [{ text: "\n", ...(typingMarks(state) ? { marks: typingMarks(state) } : {}) }])
}

/** Inserts a mention (or any token) at the caret, then a space. */
function insertMention(state: EditorState, mention: Omit<MentionRun, "type">): EditorState {
  return insertContent(state, [{ type: "mention", ...mention }, { text: " " }])
}

/** Replaces a range of one block's text (the trigger menu's query) with runs. */
function replaceRange(state: EditorState, block: number, from: number, to: number, content: Inline[]): EditorState {
  return insertContent({ ...state, selection: { anchor: { block, offset: from }, focus: { block, offset: to } } }, content)
}

/** Enter: splits the block. An empty list item or quote ends the list or quote instead. */
function splitBlock(state: EditorState): EditorState {
  const cleared = deleteSelection(state)
  if (!cleared.selection) return state
  const pos = cleared.selection.focus
  const target = cleared.doc[pos.block]!
  if (target.type === "code") {
    // Enter on an empty block, or on the empty last line, leaves the code for a paragraph.
    const text = blockText(target)
    if (!text) return setBlock(cleared, "paragraph")
    if (pos.offset === text.length && text.endsWith("\n")) {
      const trimmed = replaceRange(cleared, pos.block, text.length - 1, text.length, [])
      const doc = [...trimmed.doc.slice(0, pos.block + 1), paragraph(), ...trimmed.doc.slice(pos.block + 1)]
      return withDoc(trimmed, doc, caret({ block: pos.block + 1, offset: 0 }))
    }
    return insertContent(cleared, [{ text: "\n" }])
  }
  if (isVoid(target)) {
    const p = paragraph()
    return withDoc(cleared, [...cleared.doc.slice(0, pos.block + 1), p, ...cleared.doc.slice(pos.block + 1)], caret({ block: pos.block + 1, offset: 0 }))
  }
  const empty = blockLength(target) === 0
  if (empty && (isList(target) || target.type === "quote")) {
    // Enter on an empty item steps out one level, then out of the list.
    if (isList(target) && (target.indent ?? 0) > 0) return outdent(cleared)
    return setBlock(cleared, "paragraph")
  }
  const [before, after] = splitContent(target.content, pos.offset)
  // A heading continues as a paragraph; lists and quotes continue as themselves.
  const nextType: BlockType = target.type === "heading" ? "paragraph" : target.type
  const head: Block = { ...target, content: before }
  const tail: Block = {
    id: newId(),
    type: nextType,
    content: after,
    ...(isList(target) ? { indent: target.indent ?? 0 } : {}),
    ...(target.type === "task" ? { checked: false } : {}),
  }
  // At the very start of a non-empty block, the new empty block goes above and keeps the caret's block as it was.
  if (pos.offset === 0 && !empty) {
    const above: Block = { ...tail, content: [], type: target.type === "heading" ? "paragraph" : target.type }
    const doc = [...cleared.doc.slice(0, pos.block), above, target, ...cleared.doc.slice(pos.block + 1)]
    return withDoc(cleared, doc, caret({ block: pos.block + 1, offset: 0 }))
  }
  const doc = [...cleared.doc.slice(0, pos.block), head, tail, ...cleared.doc.slice(pos.block + 1)]
  return withDoc(cleared, doc, caret({ block: pos.block + 1, offset: 0 }))
}

const segmenters = new Map<string, Intl.Segmenter>()
function segmenter(granularity: "grapheme" | "word") {
  let s = segmenters.get(granularity)
  if (!s) segmenters.set(granularity, (s = new Intl.Segmenter(undefined, { granularity })))
  return s
}

/** Where a delete of one `unit` before (or after) `offset` lands in `text`. */
function stepFrom(text: string, offset: number, unit: "char" | "word" | "line", forward: boolean): number {
  if (unit === "line") {
    if (forward) {
      const nl = text.indexOf("\n", offset)
      return nl < 0 ? text.length : Math.max(nl, offset + 1)
    }
    const nl = text.lastIndexOf("\n", offset - 1)
    return nl < 0 ? 0 : Math.min(nl + 1, offset - 1)
  }
  const parts = [...segmenter(unit === "char" ? "grapheme" : "word").segment(text)]
  if (unit === "char") {
    // Whole graphemes: an emoji with its modifiers, or a letter with its accents, goes at once.
    if (forward) {
      const next = parts.find((p) => p.index + p.segment.length > offset)
      return next ? next.index + next.segment.length : text.length
    }
    const prev = parts.filter((p) => p.index < offset).at(-1)
    return prev ? prev.index : 0
  }
  // Words: skip spaces next to the caret, then the word.
  if (forward) {
    let i = offset
    while (i < text.length && /\s/.test(text[i]!)) i++
    const word = parts.find((p) => p.index <= i && p.index + p.segment.length > i)
    return word ? word.index + word.segment.length : text.length
  }
  let i = offset
  while (i > 0 && /\s/.test(text[i - 1]!)) i--
  const word = parts.filter((p) => p.index < i).at(-1)
  return word ? word.index : 0
}

/** Backspace (or Delete with `forward`), by character, word or line. */
function deleteBy(state: EditorState, unit: "char" | "word" | "line" = "char", forward = false): EditorState {
  if (!state.selection) return state
  if (!collapsed(state.selection)) return deleteSelection(state)
  const pos = state.selection.focus
  const target = state.doc[pos.block]!
  const len = blockLength(target)
  if (isVoid(target)) {
    // A selected rule or image goes; the caret moves to the block that takes its place.
    const doc = [...state.doc.slice(0, pos.block), ...state.doc.slice(pos.block + 1)]
    const at = Math.min(pos.block, doc.length - 1)
    return withDoc(state, doc, caret({ block: Math.max(0, forward ? at : pos.block - 1), offset: forward ? 0 : Number.MAX_SAFE_INTEGER }))
  }
  if (!forward && pos.offset === 0) {
    // At a block's start, Backspace first unwraps it: a list item steps out, a heading or quote becomes a paragraph.
    if (isList(target) && (target.indent ?? 0) > 0) return outdent(state)
    if (target.type !== "paragraph") return setBlock(state, "paragraph")
    if (pos.block === 0) return state
    const prev = state.doc[pos.block - 1]!
    if (isVoid(prev)) {
      // The rule or image before goes, as one Backspace.
      const doc = [...state.doc.slice(0, pos.block - 1), ...state.doc.slice(pos.block)]
      return withDoc(state, doc, caret({ block: pos.block - 1, offset: 0 }))
    }
    const merged: Block = { ...prev, content: joined(prev, [...prev.content, ...target.content]) }
    const doc = [...state.doc.slice(0, pos.block - 1), merged, ...state.doc.slice(pos.block + 1)]
    return withDoc(state, doc, caret({ block: pos.block - 1, offset: blockLength(prev) }))
  }
  if (forward && pos.offset === len) {
    if (pos.block === state.doc.length - 1) return state
    const next = state.doc[pos.block + 1]!
    if (isVoid(next)) return withDoc(state, [...state.doc.slice(0, pos.block + 1), ...state.doc.slice(pos.block + 2)], caret(pos))
    const merged: Block = { ...target, content: joined(target, [...target.content, ...next.content]) }
    return withDoc(state, [...state.doc.slice(0, pos.block), merged, ...state.doc.slice(pos.block + 2)], caret(pos))
  }
  const text = blockText(target)
  const to = stepFrom(text, pos.offset, unit, forward)
  const [from, end] = forward ? [pos.offset, Math.min(len, Math.max(to, pos.offset + 1))] : [Math.max(0, Math.min(to, pos.offset - 1)), pos.offset]
  return deleteSelection({ ...state, selection: { anchor: { block: pos.block, offset: from }, focus: { block: pos.block, offset: end } } })
}

/** Turns a mark on or off: over the selection, or for typing at a caret. */
function toggleMark(state: EditorState, mark: MarkName): EditorState {
  if (!state.selection) return state
  const on = !markActive(state, mark)
  if (collapsed(state.selection)) {
    const current = { ...(typingMarks(state) ?? {}) }
    if (on) current[mark] = true
    else delete current[mark]
    return { ...state, stored: cleanMarks(current) ?? {} }
  }
  return mapMarks(state, (m) => {
    const next = { ...(m ?? {}) }
    if (on) next[mark] = true
    else delete next[mark]
    // Code text keeps no other marks but links; other marks drop code.
    if (on && mark === "code") for (const other of marks) if (other !== "code") delete next[other]
    return cleanMarks(next)
  })
}

/** Sets or removes a link over the selection. A caret inside a link changes the whole link. */
function setLink(state: EditorState, href: string | null): EditorState {
  if (!state.selection) return state
  let target = state
  if (collapsed(state.selection)) {
    const range = linkRange(state)
    if (!range) {
      if (!href) return state
      // A link with no text selected inserts its address as the text, once it's safe.
      const safe = safeHref(href)
      if (!safe) return state
      return insertContent(state, [{ text: href.trim(), marks: { ...(typingMarks(state) ?? {}), link: safe } }, { text: "" }])
    }
    target = { ...state, selection: range }
  }
  const safe = href ? safeHref(href) : null
  if (href && !safe) return state
  return mapMarks(target, (m) => {
    const next = { ...(m ?? {}) }
    if (safe) next.link = safe
    else delete next.link
    return cleanMarks(next)
  })
}

function mapMarks(state: EditorState, update: (m: Marks | undefined) => Marks | undefined): EditorState {
  if (!state.selection) return state
  const [from, to] = ordered(state.selection)
  const doc = state.doc.slice()
  for (let i = from.block; i <= to.block; i++) {
    const b = doc[i]!
    if (isVoid(b) || b.type === "code") continue
    const start = i === from.block ? from.offset : 0
    const end = i === to.block ? to.offset : blockLength(b)
    const [head, rest] = splitContent(b.content, start)
    const [mid, tail] = splitContent(rest, end - start)
    const changed = mid.map((run) => (isMention(run) ? run : { text: run.text, ...(update(run.marks) ? { marks: update(run.marks) } : {}) }))
    doc[i] = { ...b, content: normalize([...head, ...changed, ...tail]) }
  }
  return { ...state, doc, stored: null }
}

/** Sets the selection's blocks to a type. Setting the type they already have makes them paragraphs. */
function setBlock(state: EditorState, type: TextBlockType, attrs: { level?: 1 | 2 | 3; language?: string } = {}): EditorState {
  if (!state.selection) return state
  const [from, to] = ordered(state.selection)
  const current = activeBlock(state)
  const same = current?.type === type && (type !== "heading" || current.level === (attrs.level ?? 1))
  const nextType: TextBlockType = same && type !== "paragraph" ? "paragraph" : type
  const doc = state.doc.slice()
  for (let i = from.block; i <= to.block; i++) {
    const b = doc[i]!
    if (isVoid(b)) continue
    const { level: _l, indent: _i, checked: _c, language: _g, ...rest } = b
    const content = nextType === "code" ? [{ text: plainText(b) }] : b.content
    doc[i] = {
      ...rest,
      type: nextType,
      content: normalize(content),
      ...(nextType === "heading" ? { level: attrs.level ?? 1 } : {}),
      ...(nextType === "bullet" || nextType === "ordered" || nextType === "task" ? { indent: b.indent ?? 0 } : {}),
      ...(nextType === "task" ? { checked: b.checked ?? false } : {}),
      ...(nextType === "code" && attrs.language ? { language: attrs.language } : {}),
    }
  }
  return { ...state, doc }
}

function shiftIndent(state: EditorState, by: number): EditorState {
  if (!state.selection) return state
  const [from, to] = ordered(state.selection)
  const doc = state.doc.slice()
  let changed = false
  for (let i = from.block; i <= to.block; i++) {
    const b = doc[i]!
    if (!isList(b)) continue
    // An item goes in at most one level deeper than the item above it.
    const above = doc[i - 1]
    const limit = above && isList(above) ? Math.min(MAX_INDENT, (above.indent ?? 0) + 1) : 0
    const indent = Math.max(0, Math.min(by > 0 ? limit : MAX_INDENT, (b.indent ?? 0) + by))
    if (indent !== (b.indent ?? 0)) changed = true
    doc[i] = { ...b, indent }
  }
  return changed ? { ...state, doc } : state
}

/** Tab in a list. */
const indent = (state: EditorState) => shiftIndent(state, 1)
/** Shift+Tab in a list. */
const outdent = (state: EditorState) => shiftIndent(state, -1)

function toggleTask(state: EditorState, index: number): EditorState {
  const b = state.doc[index]
  if (!b || b.type !== "task") return state
  const doc = state.doc.slice()
  doc[index] = { ...b, checked: !b.checked }
  return { ...state, doc }
}

/** Inserts a rule or an image after the caret's block (in place of an empty paragraph). */
function insertBlock(state: EditorState, inserted: Block): EditorState {
  if (!state.selection) return state
  const pos = ordered(state.selection)[1]
  const current = state.doc[pos.block]!
  const replace = current.type === "paragraph" && blockLength(current) === 0
  const at = replace ? pos.block : pos.block + 1
  const after = paragraph()
  const doc = [...state.doc.slice(0, at), inserted, after, ...state.doc.slice(replace ? pos.block + 1 : pos.block + 1)]
  return withDoc(state, doc, caret({ block: at + 1, offset: 0 }))
}

/** Pastes blocks at the caret: the first joins the caret's block, the rest follow it. */
function insertFragment(state: EditorState, blocks: Doc): EditorState {
  const pasted = blocks.filter((b) => isVoid(b) || b.content.length || blocks.length === 1)
  if (!pasted.length) return state
  if (pasted.length === 1 && !isVoid(pasted[0]!)) {
    // Into an empty block, a pasted heading, item or quote stays one; elsewhere its text joins.
    const only = pasted[0]!
    const cleared = deleteSelection(state)
    const at = cleared.selection?.focus
    const target = at ? cleared.doc[at.block] : undefined
    if (at && target && !isVoid(target) && blockLength(target) === 0 && only.type !== "paragraph" && target.type !== "code") {
      const doc = cleared.doc.slice()
      doc[at.block] = { ...only, id: target.id, content: normalize(only.content) }
      return withDoc(cleared, doc, caret({ block: at.block, offset: blockLength(doc[at.block]!) }))
    }
    return insertContent(state, only.content)
  }
  const cleared = deleteSelection(state)
  if (!cleared.selection) return state
  const pos = cleared.selection.focus
  const target = cleared.doc[pos.block]!
  const [before, after] = isVoid(target) ? [[], []] : splitContent(target.content, pos.offset)
  const first = pasted[0]!
  const last = pasted.at(-1)!
  const middle = pasted.slice(1, -1).map((b) => ({ ...b, id: newId() }))
  // An empty target block takes the first pasted block's type, as in other editors.
  const head: Block = isVoid(first) ? { ...target, content: before } : { ...(before.length || isVoid(target) ? target : { ...first, id: target.id }), content: normalize([...before, ...first.content]) }
  const tail: Block = isVoid(last) ? { ...target, id: newId(), content: after } : { ...last, id: newId(), content: normalize([...last.content, ...after]) }
  const firstVoid = isVoid(first) ? [{ ...first, id: newId() }] : []
  const lastVoid = isVoid(last) && pasted.length > 1 ? [{ ...last, id: newId() }] : []
  const doc = [...cleared.doc.slice(0, pos.block), head, ...firstVoid, ...middle, ...lastVoid, tail, ...cleared.doc.slice(pos.block + 1)].filter(
    (b, i, all) => !(b === head && !isVoid(b) && blockLength(b) === 0 && isVoid(first) && all.length > 1),
  )
  const tailIndex = doc.indexOf(tail)
  return withDoc(cleared, doc, caret({ block: tailIndex, offset: blockLength(tail) - after.reduce((n, r) => n + runLength(r), 0) }))
}

function select(state: EditorState, selection: Selection | null): EditorState {
  if (!selection) return { ...state, selection: null, stored: null }
  const next = { anchor: clampPosition(state.doc, selection.anchor), focus: clampPosition(state.doc, selection.focus) }
  const moved = !state.selection || state.selection.focus.block !== next.focus.block || state.selection.focus.offset !== next.focus.offset || !collapsed(next)
  return { ...state, selection: next, stored: moved ? null : state.stored }
}

function selectAll(state: EditorState): EditorState {
  const last = state.doc.length - 1
  return { ...state, selection: { anchor: { block: 0, offset: 0 }, focus: { block: last, offset: blockLength(state.doc[last]!) } }, stored: null }
}

/* -------------------------------------------------------- Markdown as you type */

/**
 * After a space or Enter, a block that starts with Markdown becomes that block: "# " a
 * heading, "- " a bullet, "1. " a numbered item, "[] " a task, "> " a quote, "```" code,
 * "---" a rule. Inline, a closing **, *, _, ` or ~~ marks what it wraps.
 */
function inputRule(state: EditorState, typed: string): EditorState | null {
  if (!state.selection || !collapsed(state.selection)) return null
  const pos = state.selection.focus
  const b = state.doc[pos.block]!
  if (isVoid(b) || b.type === "code") return null
  const text = blockText(b).slice(0, pos.offset)
  // "[ ] " in a bulleted item makes it a to-do, as "- [ ] " would in a paragraph.
  if (typed === " " && b.type === "bullet" && /^\[( |x)?\]$/i.test(text) && pos.offset === text.length) {
    const cleared = replaceRange(state, pos.block, 0, pos.offset, [])
    const next = setBlock(select(cleared, caret({ block: pos.block, offset: 0 })), "task")
    if (/x/i.test(text)) next.doc[pos.block] = { ...next.doc[pos.block]!, checked: true }
    return next
  }
  if (typed === " " && b.type === "paragraph") {
    const rules: [RegExp, (m: RegExpMatchArray) => [TextBlockType, { level?: 1 | 2 | 3 }?, boolean?]][] = [
      [/^(#{1,3})$/, (m) => ["heading", { level: m[1]!.length as 1 | 2 | 3 }]],
      [/^[-*+]$/, () => ["bullet"]],
      [/^\d+[.)]$/, () => ["ordered"]],
      [/^\[( |x)?\]$/i, (m) => ["task", {}, m[1]?.toLowerCase() === "x"]],
      [/^>$/, () => ["quote"]],
    ]
    for (const [re, make] of rules) {
      const m = text.match(re)
      if (!m) continue
      const [type, attrs, checked] = make(m)
      const trimmed = deleteSelection({ ...state, selection: { anchor: { block: pos.block, offset: 0 }, focus: pos } })
      const next = setBlock(trimmed, type, attrs)
      if (type === "task" && checked) next.doc[pos.block] = { ...next.doc[pos.block]!, checked: true }
      return next
    }
  }
  if (typed === "enter" && b.type === "paragraph" && pos.offset === blockLength(b)) {
    if (/^```(\w*)$/.test(blockText(b))) {
      const language = blockText(b).slice(3) || undefined
      const emptied = { ...state, doc: state.doc.map((x, i) => (i === pos.block ? { ...x, content: [] } : x)), selection: caret({ block: pos.block, offset: 0 }) }
      return setBlock(emptied, "code", { language })
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(blockText(b))) {
      const doc = state.doc.slice()
      doc[pos.block] = block("divider")
      const next = withDoc(state, [...doc.slice(0, pos.block + 1), paragraph(), ...doc.slice(pos.block + 1)], caret({ block: pos.block + 1, offset: 0 }))
      return next
    }
  }
  // Inline: the closing delimiter was just typed (it isn't in the text yet).
  const inline: [string, MarkName][] = [
    ["**", "bold"],
    ["__", "bold"],
    ["~~", "strike"],
    ["*", "italic"],
    ["_", "italic"],
    ["`", "code"],
  ]
  for (const [delim, mark] of inline) {
    const withTyped = text + typed
    if (!withTyped.endsWith(delim)) continue
    const body = withTyped.slice(0, -delim.length)
    const open = body.lastIndexOf(delim)
    if (open < 0) continue
    const inner = body.slice(open + delim.length)
    // Not empty, not padded with spaces, and a single * isn't half of a **.
    if (!inner || /^\s|\s$/.test(inner) || inner.includes(OBJECT)) continue
    if (delim.length === 1 && (body[open - 1] === delim || inner.startsWith(delim))) continue
    // Inside a word it's text, as Markdown reads it: my_var_name, 2*3*4, a URL.
    if (delim !== "`" && open > 0 && /[\p{L}\p{N}_]/u.test(body[open - 1]!)) continue
    // The typed part of the closing delimiter: everything but what's already in the text.
    const already = delim.length - typed.length
    const start = open
    const end = pos.offset - already
    let next: EditorState = { ...state, selection: { anchor: { block: pos.block, offset: start + delim.length }, focus: { block: pos.block, offset: end } } }
    next = mapMarks(next, (m) => cleanMarks({ ...(m ?? {}), [mark]: true }))
    // Drop the delimiters (closing part already in the text first, then the opening).
    if (already > 0) next = deleteSelection({ ...next, selection: { anchor: { block: pos.block, offset: end }, focus: { block: pos.block, offset: end + already } } })
    next = deleteSelection({ ...next, selection: { anchor: { block: pos.block, offset: start }, focus: { block: pos.block, offset: start + delim.length } } })
    const caretAt = end - delim.length
    // What's typed next isn't marked.
    const after = typingMarks({ ...next, selection: caret({ block: pos.block, offset: caretAt }) }) ?? {}
    const { [mark]: _drop, ...rest } = after as Marks
    return { ...next, selection: caret({ block: pos.block, offset: caretAt }), stored: cleanMarks(rest) ?? {} }
  }
  return null
}

/* ------------------------------------------------------------------ Links */

/** A link target people can safely follow: http(s), mailto, tel, or a relative path. */
function safeHref(href: string): string | null {
  const value = href.trim()
  if (!value) return null
  // "//host" and "/\\host" are other sites, not paths.
  if (/^\/[\\/]/.test(value)) return null
  if (/^(\/|\.\/|\.\.\/|#|\?)/.test(value)) return value
  if (/^(mailto|tel):/i.test(value)) return value
  // A bare domain gets https.
  const withScheme = /^[a-z][\w+.-]*:/i.test(value) ? value : /^[\w-]+(\.[\w-]+)+(\/|$|\?|#)/.test(value) ? `https://${value}` : null
  if (!withScheme) return null
  try {
    const url = new URL(withScheme)
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null
  } catch {
    return null
  }
}

/** An image source that's safe to show: http(s), or an inline PNG, GIF, JPEG, WebP or AVIF. */
function safeImage(src: string | null | undefined): string | null {
  if (!src) return null
  if (/^data:image\/(png|gif|jpe?g|webp|avif);/i.test(src)) return src
  const href = safeHref(src)
  return href && /^https?:/i.test(href) ? href : null
}

/* ------------------------------------------------------------------ Untrusted documents */

const BLOCK_TYPES = new Set<BlockType>(["paragraph", "heading", "quote", "code", "bullet", "ordered", "task", "divider", "image"])
const whole = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function sanitizeMarks(raw: unknown): Marks | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const m = raw as Record<string, unknown>
  const out: Marks = {}
  for (const name of marks) if (m[name] === true) out[name] = true
  if (typeof m.link === "string") {
    const link = safeHref(m.link)
    if (link) out.link = link
  }
  return Object.keys(out).length ? out : undefined
}

function sanitizeContent(raw: unknown): Inline[] {
  if (!Array.isArray(raw)) return []
  const out: Inline[] = []
  for (const r of raw.slice(0, 10000)) {
    if (!r || typeof r !== "object") continue
    const run = r as Record<string, unknown>
    if (run.type === "mention") {
      out.push({ type: "mention", id: String(run.id ?? ""), label: String(run.label ?? ""), trigger: typeof run.trigger === "string" ? run.trigger.slice(0, 4) : "@" })
      continue
    }
    const text = typeof run.text === "string" ? run.text : String(run.text ?? "")
    const m = sanitizeMarks(run.marks)
    out.push(m ? { text, marks: m } : { text })
  }
  return out
}

/**
 * A document from outside (the clipboard, storage, an app) made safe to edit and show:
 * known block types only, levels and indents in range, links and images that pass the
 * same checks typing them does, and strings where strings belong.
 */
function sanitizeDoc(raw: unknown): Doc {
  if (!Array.isArray(raw)) return []
  const out: Doc = []
  for (const r of raw.slice(0, 10000)) {
    if (!r || typeof r !== "object") continue
    const b = r as Record<string, unknown>
    const type: BlockType = BLOCK_TYPES.has(b.type as BlockType) ? (b.type as BlockType) : "paragraph"
    const next: Block = { id: typeof b.id === "string" && b.id ? b.id.slice(0, 64) : newId(), type, content: type === "divider" || type === "image" ? [] : normalize(sanitizeContent(b.content)) }
    if (type === "heading") next.level = whole(b.level, 1, 3, 1) as 1 | 2 | 3
    if (type === "bullet" || type === "ordered" || type === "task") next.indent = whole(b.indent, 0, MAX_INDENT, 0)
    if (type === "task") next.checked = b.checked === true
    if (type === "code" && typeof b.language === "string" && b.language) next.language = b.language.replace(/[^\w+#.-]/g, "").slice(0, 32)
    if (type === "image") {
      const src = safeImage(typeof b.src === "string" ? b.src : null)
      if (!src) continue
      next.src = src
      next.alt = typeof b.alt === "string" ? b.alt : ""
    }
    out.push(next)
  }
  return out
}

/* ------------------------------------------------------------------ State */

function createState(doc: Doc = [paragraph()]): EditorState {
  return { doc: ensureDoc(sanitizeDoc(doc)), selection: null, stored: null }
}

/** Two documents read the same (ignoring block ids). */
function sameDoc(a: Doc, b: Doc) {
  if (a.length !== b.length) return false
  return a.every((x, i) => {
    const y = b[i]!
    const { id: _a, ...rx } = x
    const { id: _b, ...ry } = y
    return JSON.stringify(rx) === JSON.stringify(ry)
  })
}

const isEmpty = (doc: Doc) => doc.length === 1 && doc[0]!.type === "paragraph" && blockLength(doc[0]!) === 0

/** Characters and words, as people count them (a mention is one word). */
function counts(doc: Doc) {
  const text = doc.map(plainText).join("\n")
  const words = [...segmenter("word").segment(text)].filter((s) => s.isWordLike).length
  return { characters: [...segmenter("grapheme").segment(text.replace(/\n/g, ""))].length, words }
}

export {
  activeBlock,
  activeLink,
  block,
  blockLength,
  blockText,
  caret,
  collapsed,
  counts,
  createState,
  deleteBy,
  deleteSelection,
  fragment,
  indent,
  inputRule,
  insertBlock,
  insertContent,
  insertFragment,
  insertLineBreak,
  insertMention,
  insertText,
  isEmpty,
  isList,
  isMention,
  isVoid,
  linkRange,
  markActive,
  marksAtPosition,
  MAX_INDENT,
  newId,
  normalize,
  OBJECT,
  ordered,
  outdent,
  paragraph,
  plainText,
  replaceRange,
  runLength,
  safeHref,
  safeImage,
  sanitizeDoc,
  sameDoc,
  select,
  selectAll,
  setBlock,
  setLink,
  splitBlock,
  splitContent,
  toggleMark,
  toggleTask,
  typingMarks,
}
export type { Block, BlockType, Doc, EditorState, Inline, MarkName, Marks, MentionRun, Position, Selection, TextBlockType, TextRun }
