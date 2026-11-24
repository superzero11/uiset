// Markdown for the web chat, through the same remark parser the React response uses
// (react-markdown is remark too): GitHub's tables, task lists, footnotes and strikethrough,
// raw HTML dropped, never rendered (model output is untrusted), links limited to safe
// protocols, remote images held back unless the page allows them, and half-written markdown
// completed while it streams (remend). Code blocks become the chat's code figures.
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import remend from "remend"
import { unified } from "unified"
import { scrollArea } from "./scroll"
import { attributeName, messageId } from "@/registry/uiset/ui/chat/hast"
import { safeUrl, sameOriginImages } from "@/registry/uiset/ui/chat/urls"

type HastNode =
  | { type: "element"; tagName: string; properties?: Record<string, unknown>; children: HastNode[] }
  | { type: "text"; value: string }
  | { type: "root"; children: HastNode[] }
  | { type: string; children?: HastNode[]; value?: string }

// Without `allowDangerousHtml`, remark-rehype leaves HTML out of the tree.
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)

type Options = {
  /** Draws a fenced code block (the nth in this text): the React ChatCodeBlock, here as DOM. */
  code: (code: string, language: string | undefined, index: number) => Node
  /** Whether an image may load. Others show as a link to it. */
  allowImage?: (url: URL) => boolean
  /** Makes footnote ids unique to this message, so one message's links don't jump to another's. */
  idPrefix?: string
}


function toDom(nodes: HastNode[], options: Options, counter: { code: number }): Node[] {
  const out: Node[] = []
  for (const node of nodes) {
    if (node.type === "text") {
      out.push(document.createTextNode((node as { value: string }).value))
      continue
    }
    if (node.type !== "element") continue
    const el = node as { tagName: string; properties?: Record<string, unknown>; children: HastNode[] }
    const tag = el.tagName
    // A fenced block: <pre><code class="language-ts">…</code></pre>.
    if (tag === "pre") {
      const code = el.children.find((c) => c.type === "element" && (c as { tagName: string }).tagName === "code") as typeof el | undefined
      if (code) {
        const classes = (code.properties?.className as string[] | undefined) ?? []
        const language = classes.find((c) => c.startsWith("language-"))?.slice("language-".length)
        const text = code.children.map((c) => (c as { value?: string }).value ?? "").join("")
        out.push(options.code(text.replace(/\n$/, ""), language, counter.code++))
        continue
      }
    }
    if (tag === "img") {
      const src = safeUrl(String(el.properties?.src ?? ""), ["data", "blob"])
      const alt = String(el.properties?.alt ?? "")
      let url: URL | null = null
      try {
        url = src ? new URL(src, location.href) : null
      } catch {
        url = null
      }
      if (url && (options.allowImage ?? sameOriginImages)(url)) {
        const img = document.createElement("img")
        img.src = url.href
        img.alt = alt
        img.loading = "lazy"
        img.decoding = "async"
        out.push(img)
      } else if (url && /^https?:$/.test(url.protocol)) {
        // A remote image could carry what the model read to someone else's server: it's a
        // link the person can follow instead.
        const link = document.createElement("a")
        link.href = url.href
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        link.className = "chat-image-link"
        link.textContent = `Image: ${alt || url.hostname}`
        const note = document.createElement("span")
        note.className = "chat-visually-hidden"
        note.textContent = " (opens in a new tab)"
        link.append(note)
        out.push(link)
      } else if (alt) out.push(document.createTextNode(alt))
      continue
    }
    const element = document.createElement(tag)
    for (const [name, value] of Object.entries(el.properties ?? {})) {
      if (value === false || value == null) continue
      let text = value === true ? "" : Array.isArray(value) ? value.join(" ") : String(value)
      const attribute = attributeName(name)
      if (attribute === "href") {
        const safe = safeUrl(text)
        if (safe === null) continue
        text = safe
      }
      // Footnotes: ids, their links and their heading made unique to the message.
      if (options.idPrefix) text = messageId(attribute, text, options.idPrefix)
      if (attribute === "class") text = text.replace(/\bsr-only\b/, "chat-visually-hidden")
      element.setAttribute(attribute, text)
    }
    element.append(...toDom(el.children, options, counter))
    if (tag === "a") {
      const href = element.getAttribute("href") ?? ""
      if (/^https?:\/\//i.test(href)) {
        element.setAttribute("target", "_blank")
        element.setAttribute("rel", "noopener noreferrer")
        const note = document.createElement("span")
        note.className = "chat-visually-hidden"
        note.textContent = " (opens in a new tab)"
        element.append(note)
      }
    }
    if (tag === "table") {
      out.push(scrollArea(element, { axis: "x", frame: { class: "chat-table" }, viewport: { role: "region", "aria-label": "Table" } }).root)
      continue
    }
    out.push(element)
  }
  return out
}

/** Markdown as DOM nodes; `streaming` completes what's half written. */
function renderMarkdown(text: string, streaming: boolean, options: Options): Node[] {
  const tree = processor.runSync(processor.parse(streaming ? remend(text) : text)) as unknown as HastNode
  return toDom((tree as { children: HastNode[] }).children, options, { code: 0 })
}

export { renderMarkdown }
