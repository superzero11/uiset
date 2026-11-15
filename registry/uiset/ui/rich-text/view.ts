// The rich text editor on the page, without a framework: it draws the document into an
// editable element, keeps the caret in sync both ways, and turns what people do (typing,
// dictation, input methods, Enter, Backspace, shortcuts, paste, drop) into the document
// edits in model.ts. The React editor and the web element both mount it, so they behave
// the same. The browser never edits the DOM by itself: each input is cancelled and
// applied to the document, except text an input method is still composing, which is read
// back once it's done.

import { announce, createUndoStack, isComposing, matchesShortcut } from "@ui-sdk/core"
import type { EditorChange, TextEditorAdapter, TextRange, TokenInsert } from "@ui-sdk/core/trigger-menu"
import {
  plainText,
  typingMarks,
  OBJECT,
  insertContent,
  sanitizeDoc,
  activeBlock,
  block,
  blockLength,
  blockText,
  caret,
  collapsed,
  createState,
  deleteBy,
  deleteSelection,
  fragment,
  indent,
  inputRule,
  insertBlock,
  insertFragment,
  insertLineBreak,
  insertMention,
  insertText,
  isEmpty,
  isList,
  isMention,
  isVoid,
  markActive,
  normalize,
  ordered,
  outdent,
  replaceRange,
  select,
  setBlock,
  splitBlock,
  toggleMark,
  toggleTask,
  type Block,
  type Doc,
  type EditorState,
  type Inline,
  type MarkName,
  type Marks,
  type Position,
  type Selection,
} from "./model"
import { fromHTML, fromMarkdown, toHTML, toText } from "./serialize"

const MIME = "application/x-uiset-rich-text"

type ChangeReason = "input" | "format" | "paste" | "drop" | "undo" | "redo" | "selection" | "set" | "composition"

type ViewOptions = {
  state?: EditorState
  /** Called after every change to the document or the selection. */
  onChange?: (state: EditorState, reason: ChangeReason) => void
  /** Mod+K: open your link editor. */
  onLinkRequest?: () => void
  /** Mod+Enter outside a task item. */
  onSubmit?: () => void
  /** Pasted or dropped image files: upload and return where they live, or null to skip. */
  uploadImage?: (file: File) => Promise<{ src: string; alt?: string } | null>
  /** Words for announcements, for translation. */
  messages?: Partial<Messages>
}

type Messages = { markOn: (mark: string) => string; markOff: (mark: string) => string; block: (name: string) => string; undo: string; redo: string }
const english: Messages = {
  markOn: (mark) => `${mark} on`,
  markOff: (mark) => `${mark} off`,
  block: (name) => name,
  undo: "Undone",
  redo: "Redone",
}
const markNames: Record<MarkName, string> = { bold: "Bold", italic: "Italic", underline: "Underline", strike: "Strikethrough", code: "Code" }

/* ------------------------------------------------------------------ Drawing */

const tagFor = (b: Block) => {
  switch (b.type) {
    case "heading":
      return `h${b.level ?? 1}`
    case "quote":
      return "blockquote"
    case "code":
      return "pre"
    case "bullet":
    case "ordered":
    case "task":
      return "li"
    case "divider":
    case "image":
      return "div"
    default:
      return "p"
  }
}

/** One run as DOM: text (with <br> for line breaks) inside its mark elements, or a mention chip. */
function drawRun(run: Inline): Node {
  if (isMention(run)) {
    const chip = document.createElement("span")
    chip.className = "rich-text-mention"
    chip.contentEditable = "false"
    chip.dataset.mention = run.id
    chip.dataset.trigger = run.trigger ?? "@"
    chip.textContent = `${run.trigger ?? "@"}${run.label}`
    return chip
  }
  const frag = document.createDocumentFragment()
  run.text.split("\n").forEach((part, i) => {
    if (i > 0) frag.append(document.createElement("br"))
    if (part) frag.append(document.createTextNode(part))
  })
  let node: Node = frag
  const m = run.marks ?? {}
  const wrap = (tag: string, attrs: Record<string, string> = {}) => {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.append(node)
    node = el
  }
  if (m.code) wrap("code")
  if (m.bold) wrap("strong")
  if (m.italic) wrap("em")
  if (m.underline) wrap("u")
  if (m.strike) wrap("s")
  if (m.link) wrap("a", { href: m.link, rel: "noopener noreferrer", target: "_blank" })
  return node
}

function drawBlock(b: Block, listNumber: number): HTMLElement {
  const el = document.createElement(tagFor(b))
  el.dataset.block = b.id
  el.className = `rich-text-block rich-text-${b.type}`
  if (b.type !== "code") el.dir = "auto"
  if (b.type === "divider") {
    el.contentEditable = "false"
    el.append(document.createElement("hr"))
    return el
  }
  if (b.type === "image") {
    el.contentEditable = "false"
    const img = document.createElement("img")
    img.src = b.src ?? ""
    img.alt = b.alt ?? ""
    img.draggable = false
    el.append(img)
    return el
  }
  if (isList(b)) {
    el.setAttribute("aria-level", String((b.indent ?? 0) + 1))
    el.dataset.indent = String(b.indent ?? 0)
    if (b.type === "ordered") el.setAttribute("value", String(listNumber))
    if (b.type === "task") {
      el.dataset.checked = String(!!b.checked)
      const box = document.createElement("span")
      box.className = "rich-text-check"
      box.contentEditable = "false"
      box.setAttribute("role", "checkbox")
      box.setAttribute("aria-checked", String(!!b.checked))
      // Named by its task; checked or not is aria-checked's to say.
      box.setAttribute("aria-label", plainText(b).trim() || "To-do")
      el.append(box)
    }
  }
  const body = b.type === "code" ? document.createElement("code") : el
  if (b.type === "code") {
    el.append(body)
    if (b.language) el.dataset.language = b.language
  }
  for (const run of b.content) body.append(drawRun(run))
  // An empty block, or one ending in a line break, needs a <br> to hold the caret's line.
  const text = blockText(b)
  if (!text || text.endsWith("\n")) {
    const br = document.createElement("br")
    br.dataset.placeholder = ""
    body.append(br)
  }
  return el
}

/** The element that holds a block's text (a code block's <code>, otherwise the block itself). */
const textHost = (el: HTMLElement): HTMLElement => (el.tagName === "PRE" ? ((el.querySelector(":scope > code") as HTMLElement) ?? el) : el)

/** Where two documents first differ, as a caret in `next`: after any text `next` adds there. */
function changePoint(prev: Doc, next: Doc): Selection | null {
  const key = (b: Block) => JSON.stringify([b.type, b.level, b.indent, b.checked, b.content])
  let i = 0
  while (i < prev.length && i < next.length && key(prev[i]!) === key(next[i]!)) i++
  if (i >= next.length) i = next.length - 1
  if (i < 0) return null
  const b = next[i]!
  if (isVoid(b)) return caret({ block: i, offset: 0 })
  const now = blockText(b)
  const was = prev[i] && !isVoid(prev[i]!) ? blockText(prev[i]!) : ""
  let start = 0
  while (start < now.length && start < was.length && now[start] === was[start]) start++
  let end = 0
  while (end < now.length - start && end < was.length - start && now[now.length - 1 - end] === was[was.length - 1 - end]) end++
  return caret({ block: i, offset: Math.max(start, now.length - end) })
}

/* ------------------------------------------------------------------ Positions */

/** How many characters of a block's text come before (node, offset), with mentions as one and <br> as a newline. */
function offsetIn(host: HTMLElement, node: Node, offset: number): number {
  let count = 0
  let done = false
  const target = node.nodeType === 3 ? node : (node.childNodes[offset] ?? null)
  const walk = (n: Node): void => {
    if (done) return
    if (n === target && node.nodeType !== 3) {
      done = true
      return
    }
    if (n.nodeType === 3) {
      if (n === node) {
        count += offset
        done = true
        return
      }
      count += (n.nodeValue ?? "").length
      return
    }
    const el = n as HTMLElement
    if (el.dataset?.mention !== undefined) {
      count += 1
      return
    }
    if (el.classList?.contains("rich-text-check")) return
    if (el.tagName === "BR") {
      if (el.dataset.placeholder === undefined) count += 1
      return
    }
    for (const child of n.childNodes) walk(child)
    // A point after an element's last child (as after a <br> inside <strong>) ends there.
    if (n === node && target === null) done = true
  }
  // A point inside a mention chip is before or after it.
  const chip = (node.nodeType === 3 ? node.parentElement : (node as Element))?.closest?.("[data-mention]")
  if (chip && host.contains(chip)) return offsetIn(host, chip.parentNode!, [...chip.parentNode!.childNodes].indexOf(chip as ChildNode)) + (offset > 0 ? 1 : 0)
  if (node === host && target === null) {
    for (const child of host.childNodes) walk(child)
    return count
  }
  for (const child of host.childNodes) walk(child)
  return count
}

/** The DOM point for a character offset in a block. */
function pointIn(host: HTMLElement, offset: number): [Node, number] {
  let left = offset
  let result: [Node, number] | null = null
  const walk = (n: Node): void => {
    if (result) return
    if (n.nodeType === 3) {
      const len = (n.nodeValue ?? "").length
      if (left <= len) result = [n, left]
      else left -= len
      return
    }
    const el = n as HTMLElement
    const index = () => [...n.parentNode!.childNodes].indexOf(n as ChildNode)
    if (el.dataset?.mention !== undefined || (el.tagName === "BR" && el.dataset.placeholder === undefined)) {
      if (left === 0) result = [n.parentNode!, index()]
      else if (left === 1 && el.tagName !== "BR") result = [n.parentNode!, index() + 1]
      else left -= 1
      // After a <br>, the next line starts: the point is in front of what follows.
      if (!result && el.tagName === "BR" && left === 0) result = [n.parentNode!, index() + 1]
      return
    }
    if (el.classList?.contains("rich-text-check") || el.tagName === "BR") return
    for (const child of n.childNodes) walk(child)
  }
  for (const child of host.childNodes) walk(child)
  if (result) return result
  const last = host.lastChild
  if (last && (last as HTMLElement).dataset?.placeholder !== undefined) return [host, host.childNodes.length - 1]
  return [host, host.childNodes.length]
}

/** Reads a block's text and marks back from its DOM, after an input method wrote into it. */
function readBlock(host: HTMLElement): Inline[] {
  const runs: Inline[] = []
  const walk = (n: Node, marks: Marks) => {
    if (n.nodeType === 3) {
      if (n.nodeValue) runs.push({ text: n.nodeValue, ...(Object.keys(marks).length ? { marks: { ...marks } } : {}) })
      return
    }
    const el = n as HTMLElement
    if (el.classList?.contains("rich-text-check")) return
    if (el.dataset?.mention !== undefined) {
      const text = el.textContent ?? ""
      const trigger = el.dataset.trigger ?? "@"
      runs.push({ type: "mention", id: el.dataset.mention!, label: trigger && text.startsWith(trigger) ? text.slice(trigger.length) : text, trigger })
      return
    }
    if (el.tagName === "BR") {
      if (el.dataset.placeholder === undefined) runs.push({ text: "\n", ...(Object.keys(marks).length ? { marks: { ...marks } } : {}) })
      return
    }
    const m = { ...marks }
    const tag = el.tagName
    if (tag === "STRONG" || tag === "B") m.bold = true
    if (tag === "EM" || tag === "I") m.italic = true
    if (tag === "U") m.underline = true
    if (tag === "S") m.strike = true
    if (tag === "CODE" && host.tagName !== "CODE") m.code = true
    if (tag === "A" && el.getAttribute("href")) m.link = el.getAttribute("href")!
    for (const child of n.childNodes) walk(child, m)
  }
  for (const child of host.childNodes) walk(child, {})
  return normalize(runs)
}

/* ------------------------------------------------------------------ The view */

type Listener = (state: EditorState, reason: ChangeReason) => void

function createRichTextView(root: HTMLElement, options: ViewOptions = {}) {
  let state = options.state ?? createState()
  const messages = { ...english, ...options.messages }
  const listeners = new Set<Listener>()
  const adapterListeners = new Set<(change: EditorChange) => void>()
  const undo = createUndoStack({ doc: state.doc, selection: state.selection }, { limit: 300, groupDelay: 700 })
  const drawn = new Map<string, { block: Block; el: HTMLElement; number: number }>()
  let composing = false
  /** The block and marks typing would use when a composition started. */
  let composeFrom: { block: Block; marks: Marks | undefined } | null = null
  let applyingSelection = false
  let readOnly = false
  let destroyed = false
  let lastSelectionKey = ""

  root.contentEditable = "true"
  root.setAttribute("role", "textbox")
  root.setAttribute("aria-multiline", "true")
  root.spellcheck = true
  root.translate = true
  root.classList.add("rich-text-content")

  /* -------------------------------------------------------- draw */

  function draw() {
    // List numbers per level: a numbered item counts on from the item before it at its level.
    const counters: number[] = []
    const wanted: HTMLElement[] = []
    let list: HTMLElement | null = null
    let listKind = ""
    const top: Node[] = []
    state.doc.forEach((b) => {
      let number = 0
      if (isList(b)) {
        const level = b.indent ?? 0
        counters.length = level + 1
        counters[level] = b.type === "ordered" ? (counters[level] ?? 0) + 1 : 0
        number = counters[level]!
      } else counters.length = 0
      const known = drawn.get(b.id)
      let el: HTMLElement
      if (known && known.block === b && known.number === number) el = known.el
      else {
        el = drawBlock(b, number)
        drawn.set(b.id, { block: b, el, number })
      }
      wanted.push(el)
      if (isList(b)) {
        const kind = b.type
        if (!list || listKind !== kind) {
          // Reuse the container the first item already sits in, so a list isn't rebuilt per keystroke.
          const tag = kind === "ordered" ? "OL" : "UL"
          const existing = el.parentElement && el.parentElement !== root && el.parentElement.tagName === tag && el.parentElement.parentElement === root && !top.includes(el.parentElement) ? el.parentElement : null
          list = existing ?? document.createElement(tag.toLowerCase())
          list.className = `rich-text-list rich-text-list-${kind}`
          listKind = kind
          top.push(list)
        }
        if (list.children[[...wantedIn(list)].length] !== el) list.insertBefore(el, list.children[[...wantedIn(list)].length] ?? null)
        markWanted(list, el)
      } else {
        list = null
        listKind = ""
        top.push(el)
      }
    })
    // Put the top-level nodes in order, then drop anything else (old blocks, empty lists).
    top.forEach((node, i) => {
      if (root.childNodes[i] !== node) root.insertBefore(node, root.childNodes[i] ?? null)
    })
    while (root.childNodes.length > top.length) root.lastChild!.remove()
    for (const node of top) {
      if ((node as HTMLElement).classList?.contains("rich-text-list")) {
        const keep = wantedSets.get(node as HTMLElement)!
        for (const child of [...(node as HTMLElement).children]) if (!keep.has(child as HTMLElement)) child.remove()
      }
    }
    wantedSets = new WeakMap()
    const ids = new Set(state.doc.map((b) => b.id))
    for (const id of drawn.keys()) if (!ids.has(id)) drawn.delete(id)
    root.toggleAttribute("data-empty", isEmpty(state.doc))
    drawSelectedVoid()
  }
  let wantedSets = new WeakMap<HTMLElement, Set<HTMLElement>>()
  const wantedIn = (list: HTMLElement) => wantedSets.get(list) ?? new Set<HTMLElement>()
  const markWanted = (list: HTMLElement, el: HTMLElement) => {
    let set = wantedSets.get(list)
    if (!set) wantedSets.set(list, (set = new Set()))
    set.add(el)
  }

  /** A selected rule or image shows as selected (it has no caret of its own). */
  function drawSelectedVoid() {
    for (const el of root.querySelectorAll("[data-selected]")) el.removeAttribute("data-selected")
    const sel = state.selection
    if (!sel || !collapsed(sel)) return
    const b = state.doc[sel.focus.block]
    if (b && isVoid(b)) drawn.get(b.id)?.el.setAttribute("data-selected", "")
  }

  /* -------------------------------------------------------- selection */

  const blockIndexOf = (el: Element | null): number => {
    const host = el?.closest?.("[data-block]")
    if (!host || !root.contains(host)) return -1
    const id = (host as HTMLElement).dataset.block
    return state.doc.findIndex((b) => b.id === id)
  }

  function positionFromDom(node: Node, offset: number): Position | null {
    if (node === root) {
      // Between blocks: the start of the block at `offset`, or the end of the last one.
      const child = root.childNodes[offset] as HTMLElement | undefined
      if (child) {
        const first = child.matches?.("[data-block]") ? child : child.querySelector?.("[data-block]")
        const index = blockIndexOf(first ?? null)
        if (index >= 0) return { block: index, offset: 0 }
      }
      const last = state.doc.length - 1
      return { block: last, offset: blockLength(state.doc[last]!) }
    }
    const el = node.nodeType === 3 ? node.parentElement : (node as Element)
    const index = blockIndexOf(el)
    if (index < 0) return null
    const b = state.doc[index]!
    if (isVoid(b)) return { block: index, offset: 0 }
    const host = textHost(drawn.get(b.id)!.el)
    if (!host.contains(node) && node !== host) return { block: index, offset: 0 }
    return { block: index, offset: Math.min(blockLength(b), offsetIn(host, node, offset)) }
  }

  function readSelection(): Selection | null {
    const sel = root.ownerDocument.getSelection()
    if (!sel || !sel.anchorNode || !sel.focusNode || !root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return null
    const anchor = positionFromDom(sel.anchorNode, sel.anchorOffset)
    const focus = positionFromDom(sel.focusNode, sel.focusOffset)
    return anchor && focus ? { anchor, focus } : null
  }

  function writeSelection() {
    const sel = state.selection
    const domSel = root.ownerDocument.getSelection()
    if (!sel || !domSel || root.ownerDocument.activeElement !== root) return
    const point = (pos: Position): [Node, number] => {
      const b = state.doc[pos.block]!
      const el = drawn.get(b.id)!.el
      if (isVoid(b)) return [el.parentNode!, [...el.parentNode!.childNodes].indexOf(el)]
      return pointIn(textHost(el), pos.offset)
    }
    const [an, ao] = point(sel.anchor)
    const [fn, fo] = point(sel.focus)
    applyingSelection = true
    try {
      if (domSel.anchorNode !== an || domSel.anchorOffset !== ao || domSel.focusNode !== fn || domSel.focusOffset !== fo) domSel.setBaseAndExtent(an, ao, fn, fo)
    } finally {
      queueMicrotask(() => (applyingSelection = false))
    }
    revealCaret(fn, fo)
  }

  /** Keeps the caret in view as it moves: in the editor's own scroll box, then the page. */
  function revealCaret(node: Node, offset: number) {
    const range = root.ownerDocument.createRange()
    try {
      range.setStart(node, offset)
    } catch {
      return
    }
    range.collapse(true)
    let rect = range.getBoundingClientRect()
    if (!rect.height) {
      const el = (node.nodeType === 3 ? node.parentElement : (node as Element)) as HTMLElement | null
      rect = el?.getBoundingClientRect() ?? rect
      if (!rect.height) return
    }
    const margin = 8
    if (root.scrollHeight > root.clientHeight) {
      const box = root.getBoundingClientRect()
      if (rect.bottom > box.bottom - margin) root.scrollTop += rect.bottom - box.bottom + margin
      else if (rect.top < box.top + margin) root.scrollTop -= box.top + margin - rect.top
      rect = range.getBoundingClientRect().height ? range.getBoundingClientRect() : rect
    }
    const view = root.ownerDocument.defaultView
    if (!view) return
    if (rect.bottom > view.innerHeight - margin) view.scrollBy(0, rect.bottom - view.innerHeight + margin)
    else if (rect.top < margin) view.scrollBy(0, rect.top - margin)
  }

  /* -------------------------------------------------------- applying */

  const notifyAdapter = (change: EditorChange) => adapterListeners.forEach((l) => l(change))

  function commit(next: EditorState, reason: ChangeReason, group?: string, change?: { inserted: string; range: TextRange; user: boolean }) {
    if (destroyed) return
    const docChanged = next.doc !== state.doc
    state = next
    draw()
    writeSelection()
    if (docChanged && reason !== "undo" && reason !== "redo") undo.record({ doc: state.doc, selection: state.selection }, group ? { group } : undefined)
    if (!group) undo.seal()
    lastSelectionKey = selectionKey(state.selection)
    listeners.forEach((l) => l(state, reason))
    options.onChange?.(state, reason)
    if (change) notifyAdapter({ type: "input", ...change })
    else notifyAdapter({ type: "selection" })
  }

  const selectionKey = (s: Selection | null) => (s ? `${s.anchor.block}:${s.anchor.offset}:${s.focus.block}:${s.focus.offset}` : "")

  /** Applies an edit to the current selection (read from the page first). */
  function edit(update: (s: EditorState) => EditorState | null, reason: ChangeReason = "input", group?: string, change?: { inserted: string; range: TextRange; user: boolean }) {
    if (readOnly) return false
    const fresh = readSelection()
    const base = fresh ? select(state, fresh) : state
    const next = update(base)
    if (!next) return false
    commit(next, reason, group, change)
    return true
  }

  /** The block-local range an edit replaces, for the trigger menu's change events. */
  const localRange = (s: EditorState): TextRange | null => {
    if (!s.selection) return null
    const [from, to] = ordered(s.selection)
    if (from.block !== to.block) return null
    return { start: from.offset, end: to.offset }
  }

  /* -------------------------------------------------------- input */

  function targetSelection(event: InputEvent): Selection | null {
    const range = event.getTargetRanges?.()[0]
    if (!range) return null
    const anchor = positionFromDom(range.startContainer, range.startOffset)
    const focus = positionFromDom(range.endContainer, range.endOffset)
    return anchor && focus ? { anchor, focus } : null
  }

  function typeText(text: string, target: Selection | null) {
    const base = target ? select(state, target) : select(state, readSelection() ?? state.selection)
    const range = localRange(base)
    let next: EditorState
    // A single character might complete Markdown (a space after "#", a closing "**").
    const rule = text.length === 1 && base.selection && collapsed(base.selection) ? inputRule(base, text) : null
    if (rule) next = text === " " && rule.doc[base.selection!.focus.block]!.type !== base.doc[base.selection!.focus.block]!.type ? rule : rule
    else next = insertText(base, text)
    commit(next, "input", "typing", range ? { inserted: text, range, user: true } : undefined)
  }

  const deleteUnits: Record<string, ["char" | "word" | "line", boolean]> = {
    deleteContentBackward: ["char", false],
    deleteContentForward: ["char", true],
    deleteWordBackward: ["word", false],
    deleteWordForward: ["word", true],
    deleteSoftLineBackward: ["line", false],
    deleteSoftLineForward: ["line", true],
    deleteHardLineBackward: ["line", false],
    deleteHardLineForward: ["line", true],
  }

  function onBeforeInput(event: InputEvent) {
    if (readOnly) return event.preventDefault()
    const type = event.inputType
    // Input methods compose in the DOM; their text is read back when they finish.
    if (type === "insertCompositionText" || type === "deleteCompositionText" || type === "insertFromComposition" || (isComposing(event) && type !== "insertParagraph")) return
    event.preventDefault()
    const target = targetSelection(event)
    if (type === "insertText" || type === "insertReplacementText") {
      const text = event.data ?? event.dataTransfer?.getData("text/plain") ?? ""
      if (text) typeText(text, type === "insertReplacementText" ? target : (target ?? readSelection()))
      return
    }
    if (type === "insertParagraph") {
      edit((s) => inputRule(s, "enter") ?? splitBlock(s), "input")
      return
    }
    if (type === "insertLineBreak") {
      edit(insertLineBreak, "input", "typing")
      return
    }
    const del = deleteUnits[type]
    if (del) {
      const base = select(state, readSelection() ?? state.selection)
      // The browser's own range for word and line deletes (it knows where words end in every language).
      const useTarget = target && !collapsed(target) && del[0] !== "char"
      const before = localRange(base)
      const next = useTarget ? deleteSelection(select(base, target)) : deleteBy(base, del[0], del[1])
      const after = localRange(next)
      commit(next, "input", "delete", before && after && base.selection!.focus.block === next.selection?.focus.block ? { inserted: "", range: { start: Math.min(before.start, after.start), end: Math.max(before.end, before.start === after.start && !del[1] ? before.end : before.end) }, user: true } : undefined)
      return
    }
    const format: Record<string, MarkName> = { formatBold: "bold", formatItalic: "italic", formatUnderline: "underline", formatStrikeThrough: "strike" }
    if (format[type]) return void toggle(format[type]!)
    if (type === "historyUndo") return void doUndo()
    if (type === "historyRedo") return void doRedo()
    // Paste, drop and cut arrive as their own events; anything else (insertOrderedList…) is ignored.
  }

  function onComposition(event: CompositionEvent) {
    if (event.type === "compositionstart") {
      composing = true
      // A selection across blocks goes first, so the input method writes into one block.
      if (state.selection && !collapsed(state.selection)) {
        const fresh = readSelection()
        if (fresh && fresh.anchor.block !== fresh.focus.block) commit(deleteSelection(select(state, fresh)), "input")
      }
      const at = state.selection ? state.doc[ordered(state.selection)[0].block] : undefined
      composeFrom = at && !isVoid(at) ? { block: at, marks: typingMarks(state) } : null
      notifyAdapter({ type: "compositionstart" })
      return
    }
    composing = false
    reconcile()
    notifyAdapter({ type: "compositionend" })
  }

  /** Reads back the blocks an input method or the browser changed by itself. */
  function reconcile() {
    const sel = root.ownerDocument.getSelection()
    const el = sel?.focusNode ? (sel.focusNode.nodeType === 3 ? sel.focusNode.parentElement : (sel.focusNode as Element)) : null
    const index = blockIndexOf(el)
    if (index < 0) return
    const b = state.doc[index]!
    const entry = drawn.get(b.id)
    if (!entry || isVoid(b)) return
    const host = textHost(entry.el)
    const content = readBlock(host)
    const caretOffset = sel?.focusNode ? offsetIn(host, sel.focusNode, sel.focusOffset) : blockLength(b)
    const doc = state.doc.slice()
    doc[index] = { ...b, content: b.type === "code" ? [{ text: content.map((r) => (isMention(r) ? r.label : r.text)).join("") }] : content }
    // Text an input method only added goes in with the marks typing would have used there
    // (after Mod+B, or inside `code`), whatever the browser wrote into the page.
    const from = composeFrom
    composeFrom = null
    if (from && from.block.id === b.id && b.type !== "code") {
      const was = blockText(b)
      const now = content.map((r) => (isMention(r) ? OBJECT : r.text)).join("")
      let start = 0
      while (start < was.length && was[start] === now[start]) start++
      let end = 0
      while (end < was.length - start && end < now.length - start && was[was.length - 1 - end] === now[now.length - 1 - end]) end++
      const added = now.slice(start, now.length - end)
      if (added && was.length - start - end === 0 && !added.includes(OBJECT)) {
        const typed = insertContent(select(state, caret({ block: index, offset: start })), [{ text: added, ...(from.marks ? { marks: from.marks } : {}) }])
        doc[index] = typed.doc[index]!
      }
    }
    // The DOM the input method left behind is redrawn from the document.
    drawn.delete(b.id)
    commit({ ...state, doc, selection: caret({ block: index, offset: caretOffset }) }, "composition", "typing")
  }

  function onInput(event: Event) {
    // Anything that slipped past beforeinput (an input method in some browsers, a spellcheck
    // replacement) is read back from the page.
    if (composing || isComposing(event as InputEvent)) return
    reconcile()
  }

  // Focus coming back to the text without a press in it (after a popover, a dialog, Tab)
  // puts the selection it had back at once. Safari places the caret at the start on focus
  // and reports that with a late selectionchange, which would otherwise replace the person's
  // selection. A press in the text is left alone: the browser puts the caret where the
  // person clicked (writing the old selection there broke clicking in Firefox).
  let pressing = false
  const released = () => (pressing = false)
  function onFocus() {
    if (state.selection && !pressing) writeSelection()
  }

  function onSelectionChange() {
    if (applyingSelection || composing || destroyed) return
    const fresh = readSelection()
    if (!fresh) return
    const key = selectionKey(fresh)
    if (key === lastSelectionKey) return
    lastSelectionKey = key
    state = select(state, fresh)
    undo.seal()
    drawSelectedVoid()
    listeners.forEach((l) => l(state, "selection"))
    options.onChange?.(state, "selection")
    notifyAdapter({ type: "selection" })
  }

  /* -------------------------------------------------------- keys */

  function toggle(mark: MarkName) {
    // A locked editor changes nothing, so it announces nothing either.
    if (readOnly) return
    let on = false
    edit((s) => {
      const next = toggleMark(s, mark)
      on = markActive(next, mark)
      return next
    }, "format")
    announce(on ? messages.markOn(markNames[mark]) : messages.markOff(markNames[mark]))
  }

  function onKeyDown(event: KeyboardEvent) {
    // An open "/" or "@" menu handles its own keys (Enter, Tab, arrows) first.
    if (event.defaultPrevented || isComposing(event) || readOnly) return
    const shortcuts: [string, () => void][] = [
      ["mod+b", () => toggle("bold")],
      ["mod+i", () => toggle("italic")],
      ["mod+u", () => toggle("underline")],
      ["mod+shift+s", () => toggle("strike")],
      ["mod+shift+x", () => toggle("strike")],
      ["mod+e", () => toggle("code")],
      // The link popover reads the selection now, not after the last selectionchange lands.
      ["mod+k", () => (onSelectionChange(), options.onLinkRequest?.())],
      ["mod+z", () => doUndo()],
      ["mod+shift+z", () => doRedo()],
      ["mod+y", () => doRedo()],
      ["mod+alt+0", () => blockType("paragraph")],
      ["mod+alt+1", () => blockType("heading", 1)],
      ["mod+alt+2", () => blockType("heading", 2)],
      ["mod+alt+3", () => blockType("heading", 3)],
      ["mod+shift+7", () => blockType("ordered")],
      ["mod+shift+8", () => blockType("bullet")],
      ["mod+shift+9", () => blockType("task")],
    ]
    for (const [keys, run] of shortcuts) {
      if (!matchesShortcut(event, keys)) continue
      event.preventDefault()
      run()
      return
    }
    const sel = readSelection() ?? state.selection
    const current = sel ? state.doc[ordered(sel)[0].block] : undefined
    if (matchesShortcut(event, "mod+enter")) {
      event.preventDefault()
      if (current?.type === "task" && sel) edit((s) => toggleTask(s, ordered(sel)[0].block), "format")
      else options.onSubmit?.()
      return
    }
    // Tab nests list items; elsewhere it moves on, as in any other field.
    if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey && current && isList(current)) {
      event.preventDefault()
      edit(event.shiftKey ? outdent : indent, "format")
      return
    }
    // Arrows onto a rule or image select it; Backspace/Delete there removes it.
    if (current && isVoid(current) && (event.key === "Backspace" || event.key === "Delete")) {
      event.preventDefault()
      edit((s) => deleteBy(s, "char", event.key === "Delete"), "input")
    }
  }

  function blockType(type: "paragraph" | "heading" | "bullet" | "ordered" | "task" | "quote" | "code", level?: 1 | 2 | 3) {
    if (readOnly) return
    edit((s) => setBlock(s, type, level ? { level } : {}), "format")
    const now = activeBlock(state)
    if (now) announce(messages.block(blockLabel(now.type, now.level)))
  }

  /* -------------------------------------------------------- clipboard */

  function writeClipboard(data: DataTransfer) {
    const fresh = readSelection()
    const s = fresh ? select(state, fresh) : state
    let blocks = fragment(s)
    if (!blocks.length) return false
    // Part of one block is inline text: no list marker, no heading.
    const sel = s.selection
    if (sel && blocks.length === 1 && sel.anchor.block === sel.focus.block && !isVoid(blocks[0]!)) {
      const b = s.doc[sel.anchor.block]!
      if (b.type !== "code" || blockLength(blocks[0]!) < blockLength(b)) blocks = [{ ...blocks[0]!, type: b.type === "code" ? "code" : "paragraph", level: undefined, indent: undefined, checked: undefined }]
    }
    data.setData("text/plain", toText(blocks))
    data.setData("text/html", toHTML(blocks))
    data.setData(MIME, JSON.stringify(blocks))
    return true
  }

  function readTransfer(data: DataTransfer): Doc | null {
    const own = data.getData(MIME)
    if (own) {
      try {
        // Any page can put this type on the clipboard or a drag: it's checked like any other input.
        return sanitizeDoc(JSON.parse(own)).map((b) => ({ ...b, id: block().id }))
      } catch {
        /* fall through */
      }
    }
    const html = data.getData("text/html")
    // Images from pasted pages only come in when the app takes images (uploadImage): no
    // hotlinks, tracking pixels or huge data: addresses otherwise.
    if (html) return fromHTML(html).filter((b) => b.type !== "image" || !!options.uploadImage)
    const text = data.getData("text/plain")
    if (!text) return null
    // Text that looks like Markdown (a heading, a list, a fence, **bold**) is read as Markdown.
    if (/(^|\n)(#{1,3} |[-*+] |\d+[.)] |> |```|- \[[ x]\] )|\*\*[^*\n]+\*\*|\[[^\]]+\]\([^)]+\)/.test(text)) return fromMarkdown(text)
    return null
  }

  async function insertFiles(files: File[], at: Selection | null) {
    const images = files.filter((f) => f.type.startsWith("image/"))
    if (!images.length || !options.uploadImage) return false
    for (const file of images) {
      const uploaded = await options.uploadImage(file)
      if (!uploaded) continue
      const base = at ? select(state, at) : state
      commit(insertBlock(base, block("image", [], { src: uploaded.src, alt: uploaded.alt ?? file.name.replace(/\.[^.]+$/, "") })), "paste")
      at = null
    }
    return true
  }

  function onCopy(event: ClipboardEvent) {
    if (event.clipboardData && writeClipboard(event.clipboardData)) event.preventDefault()
  }

  function onCut(event: ClipboardEvent) {
    if (!event.clipboardData || readOnly) return
    if (writeClipboard(event.clipboardData)) {
      event.preventDefault()
      edit(deleteSelection, "input")
    }
  }

  function onPaste(event: ClipboardEvent) {
    if (readOnly || !event.clipboardData) return
    event.preventDefault()
    const data = event.clipboardData
    const files = [...data.files]
    const at = readSelection()
    if (files.length && options.uploadImage) {
      void insertFiles(files, at)
      return
    }
    const current = at ? state.doc[ordered(at)[0].block] : undefined
    const plain = data.getData("text/plain")
    // Into code, everything pastes as its text.
    if (current?.type === "code") return void edit((s) => insertText(s, plain), "paste")
    const blocks = readTransfer(data)
    const fromPlain = !data.getData(MIME) && !data.getData("text/html")
    if (blocks && fromPlain && blocks.length === 1 && current && blockLength(current) > 0 && plain) edit((s) => insertText(s, plain), "paste")
    else if (blocks) edit((s) => insertFragment(s, blocks), "paste")
    else if (plain) edit((s) => insertText(s, plain), "paste")
  }

  let dragged: Selection | null = null
  function onDragStart(event: DragEvent) {
    dragged = readSelection()
    if (event.dataTransfer) writeClipboard(event.dataTransfer)
  }

  function onDragEnd() {
    dragged = null
  }

  function onDrop(event: DragEvent) {
    if (readOnly || !event.dataTransfer) return
    event.preventDefault()
    const doc = root.ownerDocument as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }
    let point: Position | null = null
    const pos = doc.caretPositionFromPoint?.(event.clientX, event.clientY)
    if (pos) point = positionFromDom(pos.offsetNode, pos.offset)
    else {
      const range = doc.caretRangeFromPoint?.(event.clientX, event.clientY)
      if (range) point = positionFromDom(range.startContainer, range.startOffset)
    }
    const files = [...event.dataTransfer.files]
    if (files.length) return void insertFiles(files, point ? caret(point) : null)
    const blocks = readTransfer(event.dataTransfer)
    const plain = event.dataTransfer.getData("text/plain")
    const own = dragged && event.dataTransfer.types.includes(MIME) ? dragged : null
    dragged = null
    if (!point) return
    let base = state
    // Moving within the editor: take the text out first, then put it where it was dropped.
    if (own && !collapsed(own) && !event.altKey && !(event.ctrlKey && !navigator.platform.startsWith("Mac"))) {
      const [from, to] = ordered(own)
      const inside = (point.block > from.block || (point.block === from.block && point.offset >= from.offset)) && (point.block < to.block || (point.block === to.block && point.offset <= to.offset))
      if (inside) return
      const before = point.block < from.block || (point.block === from.block && point.offset < from.offset)
      const removed = deleteSelection(select(state, own))
      if (!before) {
        // Positions after the removed text shift back by what was removed.
        const removedBlocks = to.block - from.block
        point = point.block === to.block ? { block: from.block, offset: from.offset + (point.offset - to.offset) } : { block: point.block - removedBlocks, offset: point.offset }
      }
      base = removed
    }
    const at = select(base, caret(point))
    commit(blocks ? insertFragment(at, blocks) : insertText(at, plain), "drop")
  }

  /* -------------------------------------------------------- tasks and voids by pointer */

  function onPointerDown(event: PointerEvent) {
    pressing = true
    const target = event.target as HTMLElement
    const box = target.closest(".rich-text-check")
    // A to-do's box keeps the caret where it is; the click toggles it.
    if (box) {
      event.preventDefault()
      return
    }
    const voidEl = target.closest(".rich-text-divider, .rich-text-image")
    if (voidEl) {
      event.preventDefault()
      root.focus({ preventScroll: true })
      const index = blockIndexOf(voidEl)
      if (index >= 0) commit(select(state, caret({ block: index, offset: 0 })), "selection")
    }
  }

  function onClick(event: MouseEvent) {
    const box = (event.target as HTMLElement).closest(".rich-text-check")
    if (!box || readOnly) return
    event.preventDefault()
    const index = blockIndexOf(box)
    if (index >= 0) commit(toggleTask(state, index), "format")
  }

  /* -------------------------------------------------------- undo */

  function restore(entry: unknown, reason: "undo" | "redo") {
    if (!entry) return false
    const { doc } = entry as { doc: Doc; selection: Selection | null }
    // The caret goes where the change was: after text that comes back, or where text went.
    commit({ doc, selection: changePoint(state.doc, doc), stored: null }, reason)
    announce(reason === "undo" ? messages.undo : messages.redo)
    return true
  }
  const doUndo = () => !readOnly && restore(undo.undo(), "undo")
  const doRedo = () => !readOnly && restore(undo.redo(), "redo")

  /* -------------------------------------------------------- the trigger menu */

  const adapter: TextEditorAdapter = {
    get element() {
      return root
    },
    textBefore(length) {
      const sel = state.selection
      if (!sel || !collapsed(sel)) return null
      const b = state.doc[sel.focus.block]
      if (!b || isVoid(b)) return null
      const text = blockText(b).slice(0, sel.focus.offset)
      const start = Math.max(0, text.length - length)
      return { text: text.slice(start), offset: start }
    },
    selection() {
      if (root.ownerDocument.activeElement !== root || !state.selection) return null
      return localRange(state)
    },
    rectAt(offset) {
      const sel = state.selection
      if (!sel) return null
      const b = state.doc[sel.focus.block]
      const el = b && drawn.get(b.id)?.el
      if (!el || isVoid(b!)) return null
      const [node, at] = pointIn(textHost(el), offset)
      const range = root.ownerDocument.createRange()
      range.setStart(node, at)
      range.collapse(true)
      let rect = range.getBoundingClientRect()
      // An empty line has no box of its own; use the block's.
      if (!rect.height) rect = el.getBoundingClientRect()
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height || parseFloat(getComputedStyle(el).lineHeight) || 16 }
    },
    replace(range, content) {
      const sel = state.selection
      if (!sel) return
      const index = sel.focus.block
      // A token keeps the character that started it ("@", "#"), read from the text it replaces.
      const startChar = blockText(state.doc[index]!).slice(range.start, range.start + 1)
      const trigger = startChar && !/[\p{L}\p{N}\s]/u.test(startChar) ? startChar : "@"
      const run: Inline[] = typeof content === "string" ? [{ text: content }] : [{ type: "mention", id: (content as TokenInsert).value, label: (content as TokenInsert).label, trigger }, { text: " " }]
      commit(replaceRange(state, index, range.start, range.end, run), "input", undefined, { inserted: typeof content === "string" ? content : "￼ ", range, user: false })
    },
    subscribe(listener) {
      adapterListeners.add(listener)
      return () => adapterListeners.delete(listener)
    },
    composing: () => composing,
    tokens: true,
    submit: () => options.onSubmit?.(),
  }

  /* -------------------------------------------------------- wiring */

  const doc = root.ownerDocument
  root.addEventListener("beforeinput", onBeforeInput as EventListener)
  root.addEventListener("input", onInput)
  root.addEventListener("compositionstart", onComposition as EventListener)
  root.addEventListener("compositionend", onComposition as EventListener)
  root.addEventListener("keydown", onKeyDown)
  root.addEventListener("copy", onCopy)
  root.addEventListener("cut", onCut)
  root.addEventListener("paste", onPaste)
  root.addEventListener("dragstart", onDragStart)
  root.addEventListener("dragend", onDragEnd)
  root.addEventListener("click", onClick)
  root.addEventListener("drop", onDrop)
  root.addEventListener("pointerdown", onPointerDown)
  root.addEventListener("focus", onFocus)
  doc.addEventListener("pointerup", released, true)
  doc.addEventListener("pointercancel", released, true)
  doc.addEventListener("selectionchange", onSelectionChange)
  draw()

  return {
    get state() {
      return state
    },
    /** Replaces the state from outside (a controlled value). Undo starts over from it. */
    set(next: EditorState, reason: ChangeReason = "set") {
      state = next
      draw()
      writeSelection()
      if (reason === "set") undo.reset({ doc: state.doc, selection: state.selection })
      listeners.forEach((l) => l(state, reason))
    },
    /** Applies an edit to the current selection, as a toolbar button or an agent does. */
    run(update: (s: EditorState) => EditorState | null, reason: ChangeReason = "format") {
      return edit(update, reason)
    },
    toggleMark: toggle,
    setBlock: blockType,
    insertMention(mention: { id: string; label: string; trigger?: string }) {
      return edit((s) => insertMention(s, mention), "input")
    },
    undo: doUndo,
    redo: doRedo,
    canUndo: () => undo.canUndo(),
    canRedo: () => undo.canRedo(),
    setReadOnly(value: boolean) {
      readOnly = value
      root.contentEditable = value ? "false" : "true"
      root.setAttribute("aria-readonly", String(value))
      root.tabIndex = 0
    },
    focus(options?: FocusOptions) {
      root.focus(options)
      if (!state.selection) state = select(state, caret({ block: state.doc.length - 1, offset: blockLength(state.doc.at(-1)!) }))
      writeSelection()
    },
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    adapter,
    destroy() {
      destroyed = true
      root.removeEventListener("beforeinput", onBeforeInput as EventListener)
      root.removeEventListener("input", onInput)
      root.removeEventListener("compositionstart", onComposition as EventListener)
      root.removeEventListener("compositionend", onComposition as EventListener)
      root.removeEventListener("keydown", onKeyDown)
      root.removeEventListener("copy", onCopy)
      root.removeEventListener("cut", onCut)
      root.removeEventListener("paste", onPaste)
      root.removeEventListener("dragstart", onDragStart)
      root.removeEventListener("dragend", onDragEnd)
      root.removeEventListener("click", onClick)
      root.removeEventListener("drop", onDrop)
      root.removeEventListener("pointerdown", onPointerDown)
      root.removeEventListener("focus", onFocus)
      doc.removeEventListener("pointerup", released, true)
      doc.removeEventListener("pointercancel", released, true)
      doc.removeEventListener("selectionchange", onSelectionChange)
      listeners.clear()
      adapterListeners.clear()
    },
  }
}

const blockLabels: Record<string, string> = {
  paragraph: "Text",
  quote: "Quote",
  code: "Code block",
  bullet: "Bulleted list",
  ordered: "Numbered list",
  task: "To-do list",
  divider: "Divider",
  image: "Image",
}
/** A block type in words, for the toolbar and announcements. */
const blockLabel = (type: string, level?: number) => (type === "heading" ? `Heading ${level ?? 1}` : (blockLabels[type] ?? type))

type RichTextView = ReturnType<typeof createRichTextView>

/**
 * A document as read-only DOM, with the editor's classes (for showing saved text with the
 * same styles). Built from the document, never from HTML strings.
 */
function renderDocument(unchecked: Doc): DocumentFragment {
  const doc = sanitizeDoc(unchecked)
  const out = document.createDocumentFragment()
  const counters: number[] = []
  let list: HTMLElement | null = null
  let kind = ""
  for (const b of doc) {
    let number = 0
    if (isList(b)) {
      const level = b.indent ?? 0
      counters.length = level + 1
      counters[level] = b.type === "ordered" ? (counters[level] ?? 0) + 1 : 0
      number = counters[level]!
    } else counters.length = 0
    const el = drawBlock(b, number)
    el.removeAttribute("data-block")
    el.removeAttribute("contenteditable")
    for (const part of el.querySelectorAll("[contenteditable]")) part.removeAttribute("contenteditable")
    // A to-do's box is a picture of its state here, not a control.
    const box = el.querySelector(".rich-text-check")
    if (box) {
      box.setAttribute("role", "img")
      box.setAttribute("aria-label", b.type === "task" && b.checked ? "Done" : "Not done")
      box.removeAttribute("aria-checked")
    }
    if (isList(b)) {
      if (!list || kind !== b.type) {
        list = document.createElement(b.type === "ordered" ? "ol" : "ul")
        list.className = `rich-text-list rich-text-list-${b.type}`
        kind = b.type
        out.append(list)
      }
      list.append(el)
    } else {
      list = null
      kind = ""
      out.append(el)
    }
  }
  return out
}

export { blockLabel, createRichTextView, english as richTextMessages, offsetIn, pointIn, readBlock, renderDocument }
export type { ChangeReason, Messages as RichTextMessages, RichTextView, ViewOptions as RichTextViewOptions }
