// The rich text document in and out: HTML (to store, render or paste), Markdown (for
// agents, docs and paste from editors that copy it) and plain text. Reading HTML keeps
// only what the editor can show and drops everything else, scripts and styles included,
// so pasted or stored HTML can't bring code along.

import {
  block,
  blockLength,
  isList,
  isMention,
  normalize,
  paragraph,
  plainText,
  safeHref,
  safeImage,
  type Block,
  type Doc,
  type Inline,
  type Marks,
} from "./model"

/* ------------------------------------------------------------------ HTML out */

const headingLevel = (b: Block) => Math.min(3, Math.max(1, Math.trunc(Number(b.level)) || 1))
/** A list item's depth, kept in range whatever document comes in. */
const listIndent = (b: Block) => Math.min(4, Math.max(0, Math.trunc(Number(b.indent)) || 0))

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function inlineHtml(content: Inline[]): string {
  return content
    .map((run) => {
      if (isMention(run)) return `<span data-mention="${escapeHtml(run.id)}" data-trigger="${escapeHtml(run.trigger ?? "@")}">${escapeHtml(`${run.trigger ?? "@"}${run.label}`)}</span>`
      let html = escapeHtml(run.text).replace(/\n/g, "<br>")
      const m = run.marks ?? {}
      if (m.code) html = `<code>${html}</code>`
      if (m.bold) html = `<strong>${html}</strong>`
      if (m.italic) html = `<em>${html}</em>`
      if (m.underline) html = `<u>${html}</u>`
      if (m.strike) html = `<s>${html}</s>`
      if (m.link) html = `<a href="${escapeHtml(m.link)}">${html}</a>`
      return html
    })
    .join("")
}

const listTag = (b: Block) => (b.type === "ordered" ? "ol" : "ul")

/** The document as clean HTML: lists nest by indent, tasks carry `data-checked`. */
function toHTML(doc: Doc): string {
  let html = ""
  // Open lists, outermost first: [tag, indent].
  const open: { tag: string; indent: number; task: boolean }[] = []
  const closeTo = (indent: number) => {
    while (open.length && open.at(-1)!.indent >= indent) html += `</li></${open.pop()!.tag}>`
  }
  for (const [i, b] of doc.entries()) {
    if (isList(b)) {
      const indent = listIndent(b)
      const tag = listTag(b)
      const task = b.type === "task"
      // Deeper lists end first; a different kind of list at this level ends too.
      closeTo(indent + 1)
      const top = open.at(-1)
      if (top && top.indent === indent && (top.tag !== tag || top.task !== task)) closeTo(indent)
      if (open.at(-1)?.indent === indent) html += "</li>"
      else {
        while ((open.at(-1)?.indent ?? -1) < indent) {
          const level = (open.at(-1)?.indent ?? -1) + 1
          html += task && level === indent ? `<${tag} data-type="task">` : `<${tag}>`
          open.push({ tag, indent: level, task: task && level === indent })
          if (level < indent) html += "<li>"
        }
      }
      html += task ? `<li data-checked="${b.checked ? "true" : "false"}">${inlineHtml(b.content)}` : `<li>${inlineHtml(b.content)}`
      continue
    }
    closeTo(0)
    // A run of quote blocks is one quote, a paragraph each.
    if (b.type === "quote") {
      html += `${doc[i - 1]?.type === "quote" ? "" : "<blockquote>"}<p>${inlineHtml(b.content)}</p>`
      if (doc[i + 1]?.type !== "quote") html += "</blockquote>"
      continue
    }
    switch (b.type) {
      case "heading":
        html += `<h${headingLevel(b)}>${inlineHtml(b.content)}</h${headingLevel(b)}>`
        break
      case "code":
        html += `<pre><code${b.language ? ` class="language-${escapeHtml(b.language)}"` : ""}>${escapeHtml(plainText(b))}</code></pre>`
        break
      case "divider":
        html += "<hr>"
        break
      case "image":
        html += b.src ? `<img src="${escapeHtml(b.src)}" alt="${escapeHtml(b.alt ?? "")}">` : ""
        break
      default:
        html += `<p>${inlineHtml(b.content)}</p>`
    }
  }
  closeTo(0)
  return html
}

/* ------------------------------------------------------------------ HTML in */

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "UL", "OL", "LI", "HR", "IMG", "TABLE", "TR", "SECTION", "ARTICLE", "HEADER", "FOOTER", "FIGURE"])
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "HEAD", "TITLE", "META", "LINK", "BUTTON", "SELECT", "TEXTAREA"])

/** An image source that can't run code: http(s), or a data: image. */

/** Marks that an element adds to its text, including the inline styles Google Docs and Word use. */
function marksOf(el: Element, inherited: Marks): Marks {
  const m: Marks = { ...inherited }
  const tag = el.tagName
  if (tag === "B" || tag === "STRONG") m.bold = true
  if (tag === "I" || tag === "EM") m.italic = true
  if (tag === "U" || tag === "INS") m.underline = true
  if (tag === "S" || tag === "STRIKE" || tag === "DEL") m.strike = true
  if (tag === "CODE" || tag === "KBD" || tag === "SAMP" || tag === "TT") m.code = true
  if (tag === "A") {
    const href = safeHref(el.getAttribute("href") ?? "")
    if (href) m.link = href
  }
  const style = (el as HTMLElement).style
  if (style) {
    const weight = style.fontWeight
    if (weight === "bold" || Number(weight) >= 600) m.bold = true
    if (weight === "normal" || (Number(weight) > 0 && Number(weight) < 600)) delete m.bold
    if (style.fontStyle === "italic") m.italic = true
    if (style.fontStyle === "normal") delete m.italic
    const deco = style.textDecorationLine || style.textDecoration
    if (deco?.includes("underline")) m.underline = true
    if (deco?.includes("line-through")) m.strike = true
  }
  return m
}

type ReadContext = { marks: Marks; listIndent: number; listType: "bullet" | "ordered" | "task" | null; inPre: boolean; quote: boolean }

/** Reads HTML into blocks, keeping only what the editor can show. Pass a DOMParser outside a browser. */
function fromHTML(html: string, parser: DOMParser = new DOMParser()): Doc {
  const dom = parser.parseFromString(html, "text/html")
  const doc: Doc = []
  let current: Block | null = null
  const flush = () => {
    if (current && (current.content.length || current.type !== "paragraph")) {
      current.content = normalize(current.content)
      doc.push(current)
    }
    current = null
  }
  const start = (b: Block) => {
    flush()
    current = b
  }
  const text = (value: string, ctx: ReadContext) => {
    const t = ctx.inPre ? value : value.replace(/[\t\r\n ]+/g, " ")
    if (!t) return
    if (!current) {
      if (!ctx.inPre && !t.trim()) return
      current = block(ctx.quote ? "quote" : "paragraph")
    }
    const prev = current.content.at(-1)
    // Collapse a space at a block's start or after another space, as browsers render it.
    const trimmed = !ctx.inPre && (!prev || (!isMention(prev) && prev.text.endsWith(" "))) ? t.replace(/^ /, "") : t
    if (trimmed) current.content.push({ text: trimmed, ...(Object.keys(ctx.marks).length && current.type !== "code" ? { marks: { ...ctx.marks } } : {}) })
  }
  const walk = (node: Node, ctx: ReadContext) => {
    if (node.nodeType === 3) return text(node.nodeValue ?? "", ctx)
    if (node.nodeType !== 1) return
    const el = node as Element
    const tag = el.tagName
    if (DROP_TAGS.has(tag)) return
    if ((el as HTMLElement).hidden || (el as HTMLElement).style?.display === "none") return
    if (tag === "BR") {
      if (current) current.content.push({ text: "\n", ...(Object.keys(ctx.marks).length ? { marks: { ...ctx.marks } } : {}) })
      return
    }
    if (tag === "HR") {
      flush()
      doc.push(block("divider"))
      return
    }
    if (tag === "IMG") {
      const src = safeImage(el.getAttribute("src"))
      if (!src) return
      flush()
      doc.push(block("image", [], { src, alt: el.getAttribute("alt") ?? "" }))
      return
    }
    if (el.hasAttribute("data-mention")) {
      if (!current) current = block("paragraph")
      const trigger = el.getAttribute("data-trigger") ?? "@"
      const text = el.textContent ?? ""
      const label = trigger && text.startsWith(trigger) ? text.slice(trigger.length) : text
      current.content.push({ type: "mention", id: el.getAttribute("data-mention")!, label, trigger })
      return
    }
    if (tag === "UL" || tag === "OL") {
      flush()
      const task = el.getAttribute("data-type") === "task" || !!el.querySelector(":scope > li > input[type=checkbox]")
      const inner: ReadContext = { ...ctx, listIndent: ctx.listType ? ctx.listIndent + 1 : 0, listType: task ? "task" : tag === "OL" ? "ordered" : "bullet" }
      for (const child of el.childNodes) walk(child, inner)
      flush()
      return
    }
    if (tag === "LI") {
      const type = ctx.listType ?? "bullet"
      const box = el.querySelector(":scope > input[type=checkbox]") as HTMLInputElement | null
      const checked = el.getAttribute("data-checked") === "true" || el.getAttribute("aria-checked") === "true" || !!box?.hasAttribute("checked")
      start(block(type, [], { indent: Math.min(4, ctx.listIndent), ...(type === "task" ? { checked } : {}) }))
      for (const child of el.childNodes) {
        if ((child as Element).tagName === "INPUT") continue
        // A paragraph inside an item is the item's text, not a new block.
        if ((child as Element).tagName === "P") for (const c of child.childNodes) walk(c, ctx)
        else walk(child, ctx)
      }
      flush()
      return
    }
    const heading = /^H([1-6])$/.exec(tag)
    if (heading) {
      start(block("heading", [], { level: Math.min(3, Number(heading[1])) as 1 | 2 | 3 }))
      for (const child of el.childNodes) walk(child, { ...ctx, marks: {} })
      flush()
      return
    }
    if (tag === "PRE") {
      const code = el.querySelector("code")
      const language = /language-([\w+-]+)/.exec(code?.className ?? "")?.[1]
      start(block("code", [], language ? { language } : {}))
      current!.content.push({ text: (el.textContent ?? "").replace(/\n$/, "") })
      flush()
      return
    }
    if (tag === "BLOCKQUOTE") {
      flush()
      for (const child of el.childNodes) walk(child, { ...ctx, quote: true })
      flush()
      return
    }
    // A table row is a line, its cells apart by a tab, so pasted tables stay readable.
    if (tag === "TD" || tag === "TH") {
      if (el.previousElementSibling) text("\t", { ...ctx, inPre: true })
      const marks = marksOf(el, ctx.marks)
      for (const child of el.childNodes) walk(child, { ...ctx, marks })
      return
    }
    if (BLOCK_TAGS.has(tag)) {
      flush()
      if (tag !== "DIV" || ctx.quote) current = block(ctx.quote ? "quote" : "paragraph")
      for (const child of el.childNodes) walk(child, ctx)
      flush()
      return
    }
    const marks = marksOf(el, ctx.marks)
    for (const child of el.childNodes) walk(child, { ...ctx, marks })
  }
  for (const child of dom.body.childNodes) walk(child, { marks: {}, listIndent: 0, listType: null, inPre: false, quote: false })
  flush()
  // Trailing line breaks at a block's end don't show; drop them.
  for (const b of doc) {
    const last = b.content.at(-1)
    if (last && !isMention(last) && b.type !== "code") last.text = last.text.replace(/\n+$/, "")
    b.content = normalize(b.content)
  }
  return doc.length ? doc : [paragraph()]
}

/* ------------------------------------------------------------------ Markdown out */

const escapeMd = (text: string) =>
  text
    .replace(/([\\`*_~[\]<>])/g, "\\$1")
    .replace(/^(\s*)([#>+-])(\s)/gm, "$1\\$2$3")
    // A number and its dot or parenthesis would start a list: the punctuation is escaped.
    .replace(/^(\s*)(\d+)([.)])(\s)/gm, "$1$2\\$3$4")
    // A line of dashes would read back as a rule.
    .replace(/^(\s*)(-{3,}\s*)$/gm, "$1\\$2")

/** A link address for Markdown: in angle brackets when it holds parentheses or spaces. */
const mdDestination = (href: string) => (/[()\s]/.test(href) ? `<${href.replace(/[<>]/g, encodeURIComponent)}>` : href)

function inlineMd(content: Inline[]): string {
  return content
    .map((run) => {
      if (isMention(run)) return `${run.trigger ?? "@"}${run.label}`
      const m = run.marks ?? {}
      if (m.code) {
        // The fence is one backtick longer than any run inside; a backtick at an edge gets a space.
        const longest = Math.max(0, ...(run.text.match(/`+/g) ?? []).map((t) => t.length))
        const ticks = "`".repeat(longest + 1)
        const pad = /^`|`$/.test(run.text) ? " " : ""
        const code = `${ticks}${pad}${run.text}${pad}${ticks}`
        return m.link ? `[${code}](${mdDestination(m.link)})` : code
      }
      // Delimiters hug the text; surrounding spaces stay outside them.
      const [, lead, body, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text)!
      if (!body) return run.text
      let md = escapeMd(body!).replace(/\n/g, "  \n")
      if (m.bold) md = `**${md}**`
      if (m.italic) md = `*${md}*`
      if (m.strike) md = `~~${md}~~`
      if (m.underline) md = `<u>${md}</u>`
      if (m.link) md = `[${md}](${mdDestination(m.link)})`
      return `${lead}${md}${trail}`
    })
    .join("")
}

/** The document as Markdown (GitHub flavored: tasks, strikethrough, fenced code). */
function toMarkdown(doc: Doc): string {
  const out: string[] = []
  const counters: number[] = []
  doc.forEach((b, i) => {
    const prev = doc[i - 1]
    const list = isList(b)
    // A blank line between blocks, except between items of the same list.
    // Quote blocks in a row stay one quote, with a ">" line between them.
    if (i > 0 && !(list && prev && isList(prev))) out.push(b.type === "quote" && prev?.type === "quote" ? ">" : "")
    if (!list) counters.length = 0
    switch (b.type) {
      case "heading":
        out.push(`${"#".repeat(b.level ?? 1)} ${inlineMd(b.content)}`)
        break
      case "quote":
        out.push(`> ${inlineMd(b.content).replace(/\n/g, "\n> ")}`)
        break
      case "code": {
        const body = plainText(b)
        const fence = body.includes("```") ? "````" : "```"
        out.push(`${fence}${b.language ?? ""}\n${body}\n${fence}`)
        break
      }
      case "divider":
        out.push("---")
        break
      case "image":
        out.push(`![${(b.alt ?? "").replace(/[[\]]/g, "")}](${mdDestination(b.src ?? "")})`)
        break
      case "bullet":
      case "ordered":
      case "task": {
        const indent = listIndent(b)
        counters.length = indent + 1
        counters[indent] = b.type === "ordered" ? (counters[indent] ?? 0) + 1 : 0
        const marker = b.type === "ordered" ? `${counters[indent]}.` : b.type === "task" ? `- [${b.checked ? "x" : " "}]` : "-"
        out.push(`${"  ".repeat(indent)}${marker} ${inlineMd(b.content)}`)
        break
      }
      default:
        out.push(inlineMd(b.content))
    }
  })
  return out.join("\n")
}

/* ------------------------------------------------------------------ Markdown in */

/** Reads inline Markdown: **bold**, _italic_, ~~strike~~, `code`, [links](url), <u>underline</u>. */
function parseInline(source: string, marks: Marks = {}): Inline[] {
  const runs: Inline[] = []
  let i = 0
  let buffer = ""
  const push = (text: string, m: Marks) => text && runs.push({ text, ...(Object.keys(m).length ? { marks: { ...m } } : {}) })
  const flush = () => {
    push(buffer, marks)
    buffer = ""
  }
  while (i < source.length) {
    const rest = source.slice(i)
    if (rest[0] === "\\" && rest[1] && /[\\`*_~[\]<>#+\-.!()]/.test(rest[1])) {
      buffer += rest[1]
      i += 2
      continue
    }
    const code = /^(`+)([\s\S]+?)\1/.exec(rest)
    if (code) {
      flush()
      push(code[2]!.replace(/^ (.*) $/, "$1"), { ...marks, code: true })
      i += code[0].length
      continue
    }
    const link = /^\[((?:\\.|[^\]\\])*)\]\((?:<([^>]*)>|([^)\s]+))(?:\s+"[^"]*")?\)/.exec(rest)
    if (link) {
      flush()
      const href = safeHref(link[2] ?? link[3]!)
      runs.push(...parseInline(link[1]!, href ? { ...marks, link: href } : marks))
      i += link[0].length
      continue
    }
    const under = /^<u>([\s\S]+?)<\/u>/.exec(rest)
    if (under) {
      flush()
      runs.push(...parseInline(under[1]!, { ...marks, underline: true }))
      i += under[0].length
      continue
    }
    const pairs: [RegExp, keyof Marks][] = [
      [/^\*\*(?=\S)([\s\S]*?\S)\*\*/, "bold"],
      [/^__(?=\S)([\s\S]*?\S)__/, "bold"],
      [/^~~(?=\S)([\s\S]*?\S)~~/, "strike"],
      [/^\*(?=\S)([\s\S]*?\S)\*/, "italic"],
      [/^_(?=\S)([\s\S]*?\S)_(?![\w])/, "italic"],
    ]
    const hit = pairs.map(([re, mark]) => [re.exec(rest), mark] as const).find(([m]) => m)
    if (hit && !(hit[1] === "italic" && rest[0] === "_" && /\w/.test(source[i - 1] ?? ""))) {
      flush()
      runs.push(...parseInline(hit[0]![1]!, { ...marks, [hit[1]]: true }))
      i += hit[0]![0].length
      continue
    }
    if (rest.startsWith("  \n") || rest.startsWith("\\\n")) {
      buffer += "\n"
      i += 3
      continue
    }
    buffer += rest[0]
    i += 1
  }
  flush()
  return normalize(runs)
}

/** Lines of one paragraph: two trailing spaces are a hard break (kept), one is a soft break. */
const softBreaks = (text: string) => text.replace(/[ \t]+\n/g, (m) => (m.length >= 3 ? "  \n" : " "))

/** Reads Markdown into blocks: headings, lists (nested, numbered, tasks), quotes, fenced code, rules and images. */
function fromMarkdown(markdown: string): Doc {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
  const doc: Doc = []
  let para: string[] = []
  const flushPara = () => {
    if (para.length) doc.push(block("paragraph", parseInline(softBreaks(para.join("\n")))))
    para = []
  }
  let quoteOpen = false
  let quoteLines: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    // Whether the line before was a quote line (anything else, a blank line too, ends a quote).
    const inQuote = quoteOpen
    quoteOpen = false
    const fence = /^(\s*)(`{3,}|~{3,})\s*([\w+-]*)\s*$/.exec(line)
    if (fence) {
      flushPara()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i]!.trim().startsWith(fence[2]!)) body.push(lines[i++]!)
      doc.push(block("code", [{ text: body.join("\n") }], fence[3] ? { language: fence[3] } : {}))
      continue
    }
    if (!line.trim()) {
      flushPara()
      continue
    }
    const heading = /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(line)
    if (heading) {
      flushPara()
      doc.push(block("heading", parseInline(heading[2]!), { level: Math.min(3, heading[1]!.length) as 1 | 2 | 3 }))
      continue
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushPara()
      doc.push(block("divider"))
      continue
    }
    const image = /^!\[([^\]]*)\]\((?:<([^>]*)>|([^)\s]+))\)\s*$/.exec(line.trim())
    if (image) {
      flushPara()
      const src = safeImage(image[2] ?? image[3]!)
      if (src) doc.push(block("image", [], { src, alt: image[1] }))
      continue
    }
    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      flushPara()
      const text = quote[1]!
      const prev = doc.at(-1)
      // Lines of one quote are one block, with line breaks; a bare ">" starts the next block.
      if (!text.trim()) quoteOpen = false
      else if (inQuote && prev?.type === "quote") {
        quoteLines.push(text)
        doc[doc.length - 1] = { ...prev, content: parseInline(softBreaks(quoteLines.join("\n"))) }
        quoteOpen = true
      } else {
        quoteLines = [text]
        doc.push(block("quote", parseInline(text)))
        quoteOpen = true
      }
      continue
    }
    const item = /^(\s*)([-*+]|\d+[.)])\s+(\[( |x|X)\]\s+)?(.*)$/.exec(line)
    if (item) {
      flushPara()
      const indent = Math.min(4, Math.floor(item[1]!.replace(/\t/g, "  ").length / 2))
      const content = parseInline(item[5]!)
      if (item[3]) doc.push(block("task", content, { indent, checked: item[4]!.toLowerCase() === "x" }))
      else doc.push(block(/\d/.test(item[2]!) ? "ordered" : "bullet", content, { indent }))
      continue
    }
    para.push(line)
  }
  flushPara()
  return doc.length ? doc : [paragraph()]
}

/* ------------------------------------------------------------------ Text */

/** The document as plain text: one block per line, list items with their markers. */
function toText(doc: Doc): string {
  return doc
    .map((b) => {
      if (b.type === "divider") return "---"
      if (b.type === "image") return b.alt ?? ""
      const text = plainText(b)
      if (b.type === "bullet") return `${"  ".repeat(b.indent ?? 0)}• ${text}`
      if (b.type === "task") return `${"  ".repeat(b.indent ?? 0)}${b.checked ? "☑" : "☐"} ${text}`
      if (b.type === "ordered") return `${"  ".repeat(b.indent ?? 0)}${text}`
      return text
    })
    .join("\n")
}

/** Whether a document has anything in it (for "required"). */
const hasContent = (doc: Doc) => doc.some((b) => b.type === "divider" || b.type === "image" || blockLength(b) > 0)

/**
 * An agent's new Markdown applied to a document. Unchanged text changes nothing; text that
 * only adds to the end (an agent's insert) appends its blocks, so what's there keeps what
 * Markdown can't say (mentions, line breaks inside items, empty lines); anything else
 * replaces the document.
 */
function applyMarkdown(doc: Doc, next: string): Doc {
  const current = toMarkdown(doc).trimEnd()
  if (next.trimEnd() === current) return doc
  if (current && next.startsWith(current) && /^\n\n/.test(next.slice(current.length))) {
    const kept = doc.slice()
    while (kept.length > 1 && kept.at(-1)!.type === "paragraph" && !blockLength(kept.at(-1)!)) kept.pop()
    return [...kept, ...fromMarkdown(next.slice(current.length))]
  }
  return fromMarkdown(next)
}

export { applyMarkdown, escapeHtml, fromHTML, fromMarkdown, hasContent, parseInline, safeImage, toHTML, toMarkdown, toText }
