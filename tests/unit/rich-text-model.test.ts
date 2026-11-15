// The rich text editor's document edits and its HTML and Markdown, without a DOM editor:
// what typing, Enter, Backspace, marks, links, blocks, lists and Markdown shortcuts do to
// the document, and that HTML and Markdown read back what they wrote.
import { describe, expect, test } from "vitest"
import {
  activeBlock,
  activeLink,
  block,
  blockText,
  caret,
  counts,
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
  markActive,
  outdent,
  paragraph,
  safeHref,
  sameDoc,
  select,
  selectAll,
  setBlock,
  setLink,
  splitBlock,
  toggleMark,
  toggleTask,
  type EditorState,
} from "@/registry/uiset/ui/rich-text/model"
import { applyMarkdown, fromHTML, fromMarkdown, toHTML, toMarkdown, toText } from "@/registry/uiset/ui/rich-text/serialize"

const at = (state: EditorState, block: number, offset: number) => select(state, caret({ block, offset }))
const range = (state: EditorState, b1: number, o1: number, b2: number, o2: number) => select(state, { anchor: { block: b1, offset: o1 }, focus: { block: b2, offset: o2 } })
const typed = (text: string) => insertText(at(createState(), 0, 0), text)
const texts = (s: EditorState) => s.doc.map(blockText)

describe("typing and deleting", () => {
  test("text goes in at the caret, and new lines split blocks", () => {
    let s = typed("Hello world")
    expect(texts(s)).toEqual(["Hello world"])
    s = insertText(at(s, 0, 5), ",\nthere")
    expect(texts(s)).toEqual(["Hello,", "there world"])
    expect(s.selection!.focus).toEqual({ block: 1, offset: 5 })
  })

  test("Backspace removes a whole emoji, and a word with Alt", () => {
    let s = typed("Hi 👍🏽")
    s = deleteBy(s)
    expect(texts(s)).toEqual(["Hi "])
    s = deleteBy(insertText(s, "there friend"), "word")
    expect(texts(s)).toEqual(["Hi there "])
  })

  test("Backspace at a block's start joins it to the one above", () => {
    let s = insertText(typed("One"), "\nTwo")
    s = deleteBy(at(s, 1, 0))
    expect(texts(s)).toEqual(["OneTwo"])
    expect(s.selection!.focus).toEqual({ block: 0, offset: 3 })
  })

  test("deleting a selection across blocks keeps the first block's type", () => {
    let s = createState([block("heading", [{ text: "Title" }], { level: 2 }), paragraph("Body text")])
    s = deleteBy(range(s, 0, 2, 1, 5))
    expect(s.doc).toHaveLength(1)
    expect(s.doc[0]!.type).toBe("heading")
    expect(texts(s)).toEqual(["Titext"])
  })

  test("Shift+Enter is a line break inside the block", () => {
    const s = insertText(insertLineBreak(typed("a")), "b")
    expect(s.doc).toHaveLength(1)
    expect(texts(s)).toEqual(["a\nb"])
  })
})

describe("Enter", () => {
  test("a heading continues as a paragraph; a list item as an item", () => {
    let s = createState([block("heading", [{ text: "Title" }], { level: 1 })])
    s = splitBlock(at(s, 0, 5))
    expect(s.doc.map((b) => b.type)).toEqual(["heading", "paragraph"])
    s = createState([block("bullet", [{ text: "Item" }], { indent: 0 })])
    s = splitBlock(at(s, 0, 4))
    expect(s.doc.map((b) => b.type)).toEqual(["bullet", "bullet"])
  })

  test("on an empty item, Enter steps out a level, then out of the list", () => {
    let s = createState([block("bullet", [{ text: "a" }], { indent: 0 }), block("bullet", [], { indent: 1 })])
    s = splitBlock(at(s, 1, 0))
    expect(s.doc[1]).toMatchObject({ type: "bullet", indent: 0 })
    s = splitBlock(s)
    expect(s.doc[1]!.type).toBe("paragraph")
  })

  test("at the very start of a block, the new empty block goes above", () => {
    const s = splitBlock(at(createState([paragraph("Text")]), 0, 0))
    expect(texts(s)).toEqual(["", "Text"])
    expect(s.selection!.focus).toEqual({ block: 1, offset: 0 })
  })

  test("in code, Enter adds a line", () => {
    const s = splitBlock(at(createState([block("code", [{ text: "let a" }])]), 0, 5))
    expect(s.doc).toHaveLength(1)
    expect(texts(s)).toEqual(["let a\n"])
  })
})

describe("marks and links", () => {
  test("a mark over a selection, and off again", () => {
    let s = range(typed("make this bold"), 0, 5, 0, 9)
    s = toggleMark(s, "bold")
    expect(markActive(s, "bold")).toBe(true)
    expect(toHTML(s.doc)).toBe("<p>make <strong>this</strong> bold</p>")
    s = toggleMark(s, "bold")
    expect(toHTML(s.doc)).toBe("<p>make this bold</p>")
  })

  test("Mod+B at a caret marks what's typed next", () => {
    let s = toggleMark(typed("plain "), "bold")
    expect(markActive(s, "bold")).toBe(true)
    s = insertText(s, "loud")
    expect(toHTML(s.doc)).toBe("<p>plain <strong>loud</strong></p>")
  })

  test("a link over a selection; typing at its end doesn't grow it", () => {
    let s = range(typed("see the docs"), 0, 8, 0, 12)
    s = setLink(s, "example.com/docs")
    expect(activeLink(s)).toBe("https://example.com/docs")
    s = insertText(at(s, 0, 12), " now")
    expect(toHTML(s.doc)).toBe('<p>see the <a href="https://example.com/docs">docs</a> now</p>')
  })

  test("a caret inside a link edits or removes the whole link", () => {
    let s = setLink(range(typed("read this"), 0, 5, 0, 9), "https://a.test/")
    s = setLink(at(s, 0, 6), null)
    expect(toHTML(s.doc)).toBe("<p>read this</p>")
  })

  test("unsafe link targets are refused", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull()
    expect(safeHref("data:text/html,x")).toBeNull()
    expect(safeHref("mailto:a@b.test")).toBe("mailto:a@b.test")
    expect(safeHref("/docs")).toBe("/docs")
    const s = setLink(range(typed("x"), 0, 0, 0, 1), "javascript:alert(1)")
    expect(toHTML(s.doc)).toBe("<p>x</p>")
  })
})

describe("blocks and lists", () => {
  test("setting a block type, and the same type again makes a paragraph", () => {
    let s = setBlock(at(typed("Title"), 0, 0), "heading", { level: 2 })
    expect(activeBlock(s)).toEqual({ type: "heading", level: 2 })
    s = setBlock(s, "heading", { level: 2 })
    expect(activeBlock(s)).toEqual({ type: "paragraph" })
  })

  test("Tab nests an item at most one level below the item above", () => {
    let s = createState([block("bullet", [{ text: "a" }], { indent: 0 }), block("bullet", [{ text: "b" }], { indent: 0 })])
    s = indent(indent(at(s, 1, 0)))
    expect(s.doc[1]!.indent).toBe(1)
    s = outdent(s)
    expect(s.doc[1]!.indent).toBe(0)
    // The first item has nothing to nest under.
    expect(indent(at(s, 0, 0)).doc[0]!.indent).toBe(0)
  })

  test("tasks toggle", () => {
    const s = toggleTask(createState([block("task", [{ text: "Ship" }], { indent: 0, checked: false })]), 0)
    expect(s.doc[0]!.checked).toBe(true)
  })

  test("a rule replaces an empty paragraph and leaves a paragraph to type in", () => {
    const s = insertBlock(at(createState(), 0, 0), block("divider"))
    expect(s.doc.map((b) => b.type)).toEqual(["divider", "paragraph"])
    expect(s.selection!.focus).toEqual({ block: 1, offset: 0 })
  })
})

describe("Markdown as you type", () => {
  const rule = (text: string, key = " ") => inputRule(typed(text), key)

  test("block shortcuts after a space", () => {
    expect(rule("##")!.doc[0]).toMatchObject({ type: "heading", level: 2 })
    expect(rule("-")!.doc[0]!.type).toBe("bullet")
    expect(rule("1.")!.doc[0]!.type).toBe("ordered")
    expect(rule("[x]")!.doc[0]).toMatchObject({ type: "task", checked: true })
    expect(rule(">")!.doc[0]!.type).toBe("quote")
    expect(rule("hello")).toBeNull()
  })

  test("``` and --- on Enter", () => {
    expect(rule("```ts", "enter")!.doc[0]).toMatchObject({ type: "code", language: "ts" })
    expect(rule("---", "enter")!.doc.map((b) => b.type)).toEqual(["divider", "paragraph"])
  })

  test("a closing ** marks what it wraps and drops the delimiters", () => {
    const s = inputRule(typed("say **hi*"), "*")!
    expect(toHTML(s.doc)).toBe("<p>say <strong>hi</strong></p>")
    // What's typed next isn't bold.
    expect(toHTML(insertText(s, "!").doc)).toBe("<p>say <strong>hi</strong>!</p>")
  })

  test("inline code with backticks", () => {
    expect(toHTML(inputRule(typed("run `npm i"), "`")!.doc)).toBe("<p>run <code>npm i</code></p>")
  })
})

describe("mentions and paste", () => {
  test("a mention is one character for the caret and reads as @label", () => {
    const s = insertMention(typed("hi "), { id: "u1", label: "Ada" })
    expect(s.selection!.focus.offset).toBe(5)
    expect(toText(s.doc)).toBe("hi @Ada ")
    expect(toHTML(s.doc)).toContain('data-mention="u1"')
  })

  test("pasting blocks into a paragraph splits it around them", () => {
    const s = insertFragment(at(typed("start end"), 0, 6), [paragraph("one"), block("bullet", [{ text: "two" }], { indent: 0 })])
    expect(texts(s)).toEqual(["start one", "twoend"])
    expect(s.doc[1]!.type).toBe("bullet")
  })

  test("copy takes the selected part of each block", () => {
    const s = range(insertText(typed("first"), "\nsecond"), 0, 2, 1, 3)
    expect(fragment(s).map(blockText)).toEqual(["rst", "sec"])
  })
})

describe("HTML", () => {
  test("round trip of every block and mark", () => {
    const html =
      '<h2>Plan</h2><p>Some <strong>bold</strong>, <em>italic</em>, <u>under</u>, <s>gone</s>, <code>x()</code> and <a href="https://a.test/">a link</a>.</p><ul><li>one<ul><li>nested</li></ul></li><li>two</li></ul><ol><li>first</li><li>second</li></ol><ul data-type="task"><li data-checked="true">done</li><li data-checked="false">todo</li></ul><blockquote><p>quoted</p></blockquote><pre><code class="language-ts">let a = 1</code></pre><hr>'
    const doc = fromHTML(html)
    expect(toHTML(doc)).toBe(html + "")
  })

  test("pasted HTML keeps only what the editor shows", () => {
    const doc = fromHTML('<p onclick="x()">Hi<script>alert(1)</script><img src="javascript:x" onerror="y()"><a href="javascript:z()">link</a></p><style>p{}</style>')
    expect(toHTML(doc)).toBe("<p>Hilink</p>")
  })

  test("Google Docs and Word style marks", () => {
    const doc = fromHTML('<b style="font-weight:normal" id="docs-internal-guid-1"><span style="font-weight:700">Bold</span> <span style="font-style:italic">it</span></b>')
    expect(toHTML(doc)).toBe("<p><strong>Bold</strong> <em>it</em></p>")
  })
})

describe("Markdown", () => {
  test("reads and writes the same document", () => {
    const md = [
      "# Release notes",
      "",
      "Ship **faster** with _less_ code, ~~no~~ `config` and [docs](https://a.test/).",
      "",
      "- one",
      "  - nested",
      "- two",
      "1. first",
      "2. second",
      "- [x] done",
      "- [ ] todo",
      "",
      "> quoted",
      "",
      "```ts",
      "let a = 1",
      "```",
      "",
      "---",
    ].join("\n")
    const doc = fromMarkdown(md)
    expect(doc.map((b) => b.type)).toEqual(["heading", "paragraph", "bullet", "bullet", "bullet", "ordered", "ordered", "task", "task", "quote", "code", "divider"])
    expect(doc[3]!.indent).toBe(1)
    expect(sameDoc(fromMarkdown(toMarkdown(doc)), doc)).toBe(true)
  })

  test("special characters are escaped so they read back as text", () => {
    const doc = typed("2 * 3 = 6 and a_b").doc
    expect(sameDoc(fromMarkdown(toMarkdown(doc)), doc)).toBe(true)
  })
})

test("counts characters and words as people do", () => {
  // Spaces count as characters; 世界 is one word; an emoji with its skin tone is one character.
  expect(counts(typed("Hello, 世界 👋🏽").doc)).toEqual({ characters: 11, words: 2 })
})

test("select all spans the document", () => {
  const s = selectAll(insertText(typed("a"), "\nbc"))
  expect(s.selection).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 1, offset: 2 } })
})

test("quote blocks in a row are one quote in HTML and Markdown, and read back as blocks", () => {
  const doc = [block("quote", [{ text: "one" }]), block("quote", [{ text: "two\nlines" }]), block("paragraph", [{ text: "after" }])]
  expect(toHTML(doc)).toBe("<blockquote><p>one</p><p>two<br>lines</p></blockquote><p>after</p>")
  expect(toMarkdown(doc)).toBe("> one\n>\n> two  \n> lines\n\nafter")
  expect(sameDoc(fromMarkdown(toMarkdown(doc)), doc)).toBe(true)
  expect(sameDoc(fromHTML(toHTML(doc)), doc)).toBe(true)
  // A blank line ends a quote; the next one is its own.
  expect(fromMarkdown("> a\n\n> b").map((b) => blockText(b))).toEqual(["a", "b"])
})

test("deleting everything leaves one empty paragraph, whatever the first block was", () => {
  const s = selectAll(createState(fromMarkdown("## Title\n\n- item\n\n---")))
  const cleared = deleteSelection(s)
  expect(cleared.doc).toHaveLength(1)
  expect(cleared.doc[0]!.type).toBe("paragraph")
  expect(isEmpty(cleared.doc)).toBe(true)
})

test('"[ ] " at the start of a bulleted item makes it a to-do', () => {
  let s = insertText(at(createState([block("bullet")]), 0, 0), "[x]")
  s = inputRule(s, " ")!
  expect(s.doc[0]!.type).toBe("task")
  expect(s.doc[0]!.checked).toBe(true)
  expect(blockText(s.doc[0]!)).toBe("")
})

describe("review fixes", () => {
  test("a link at a caret is checked like any other: unsafe refused, a bare domain gets https", () => {
    const s = at(createState([block("paragraph", [{ text: "see " }])]), 0, 4)
    expect(setLink(s, "javascript:alert(1)")).toBe(s)
    expect(setLink(s, "//evil.example")).toBe(s)
    const linked = setLink(s, "example.com")
    expect(toHTML(linked.doc)).toBe('<p>see <a href="https://example.com/">example.com</a></p>')
  })

  test("documents from outside are made safe before they're edited or shown", () => {
    const hostile = [
      { type: "heading", level: "1 onmouseover=alert(1) x", content: [{ text: "Hi", marks: { link: "javascript:alert(1)", bold: "yes" } }] },
      { type: "bullet", indent: 1e9, content: [{ text: "deep" }] },
      { type: "image", src: "javascript:alert(1)" },
      { type: "script", content: [{ text: "x" }] },
    ] as unknown as Parameters<typeof createState>[0]
    const doc = createState(hostile).doc
    expect(doc.map((b) => b.type)).toEqual(["heading", "bullet", "paragraph"])
    expect(doc[0]!.level).toBe(1)
    expect(doc[0]!.content[0]).toEqual({ text: "Hi" })
    expect(doc[1]!.indent).toBe(4)
    expect(toHTML(hostile as never)).not.toContain("onmouseover")
    expect(() => toMarkdown(hostile as never)).not.toThrow()
  })

  test("deleting a triple-click selection keeps the next block as it was", () => {
    const s = createState(fromMarkdown("First paragraph\n\n## Title"))
    const sel = { ...s, selection: { anchor: { block: 0, offset: 0 }, focus: { block: 1, offset: 0 } } }
    const after = deleteSelection(sel)
    expect(after.doc.map((b) => [b.type, blockText(b)])).toEqual([["paragraph", ""], ["heading", "Title"]])
    expect(insertText(sel, "New").doc.map((b) => blockText(b))).toEqual(["New", "Title"])
  })

  test("Enter on the empty last line of a code block leaves it", () => {
    let s = at(createState([block("code", [{ text: "npm i" }])]), 0, 5)
    s = splitBlock(s)
    expect(blockText(s.doc[0]!)).toBe("npm i\n")
    s = splitBlock(s)
    expect(s.doc.map((b) => [b.type, blockText(b)])).toEqual([["code", "npm i"], ["paragraph", ""]])
    expect(s.selection?.focus).toEqual({ block: 1, offset: 0 })
  })

  test("Markdown marks don't fire inside words", () => {
    const typeAll = (text: string) => {
      let s = at(createState(), 0, 0)
      for (const ch of text) s = inputRule(s, ch) ?? insertText(s, ch)
      return toHTML(s.doc)
    }
    expect(typeAll("use my_var_name here")).toBe("<p>use my_var_name here</p>")
    expect(typeAll("2*3*4")).toBe("<p>2*3*4</p>")
    expect(typeAll("a *real* one")).toBe("<p>a <em>real</em> one</p>")
  })
})

describe("Markdown round trips (review)", () => {
  const roundTrip = (doc: Parameters<typeof toMarkdown>[0]) => sameDoc(fromMarkdown(toMarkdown(doc)), doc)
  test("text that looks like Markdown stays text", () => {
    for (const [type, text] of [["heading", "C#"], ["paragraph", "1) first"], ["paragraph", "---"], ["paragraph", "2. second"]] as const) {
      const doc = [block(type, [{ text }], type === "heading" ? { level: 2 } : {})]
      expect(roundTrip(doc), `${type} "${text}" → ${JSON.stringify(toMarkdown(doc))}`).toBe(true)
    }
  })
  test("part-word italics, links with parentheses, code with backticks and bracketed link text", () => {
    const doc = [
      block("paragraph", [{ text: "un" }, { text: "believ", marks: { italic: true } }, { text: "able" }]),
      block("paragraph", [{ text: "Foo (bar)", marks: { link: "https://en.wikipedia.org/wiki/Foo_(bar)" } }]),
      block("paragraph", [{ text: "use ``x`` here", marks: { code: true } }]),
      block("paragraph", [{ text: "see [1]", marks: { link: "https://example.com/" } }]),
    ]
    expect(roundTrip(doc), toMarkdown(doc)).toBe(true)
  })
  test("an agent's insert adds blocks and keeps what Markdown can't say", () => {
    const doc = [block("bullet", [{ type: "mention", id: "grace", label: "Grace Hopper", trigger: "@" }, { text: " thanks\nline two" }])]
    const next = applyMarkdown(doc, `${toMarkdown(doc).trimEnd()}\n\nSigned`)
    expect(next.length).toBe(2)
    expect(next[0]).toBe(doc[0])
    expect(blockText(next[1]!)).toBe("Signed")
    expect(applyMarkdown(doc, toMarkdown(doc))).toBe(doc)
  })
})

describe("more review fixes", () => {
  test("typing over a bold word keeps it bold; a replaced linked word keeps its link", () => {
    const doc = [block("paragraph", [{ text: "hello " }, { text: "wrold", marks: { bold: true, link: "https://example.com/" } }])]
    const s = { ...createState(doc), selection: { anchor: { block: 0, offset: 6 }, focus: { block: 0, offset: 11 } } }
    expect(toHTML(insertText(s, "world").doc)).toBe('<p>hello <a href="https://example.com/"><strong>world</strong></a></p>')
  })

  test("a pasted table keeps its cells apart", () => {
    const doc = fromHTML("<table><tr><th>Name</th><th>Age</th></tr><tr><td>Ada</td><td>36</td></tr></table>")
    expect(doc.map((b) => blockText(b))).toEqual(["Name\tAge", "Ada\t36"])
  })
})
