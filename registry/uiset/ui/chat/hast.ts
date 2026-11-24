// An answer's Markdown, parsed to an HTML tree (hast), names its attributes the DOM way
// (className, ariaDescribedBy, dataFootnoteRef). The Web Components and Solid chats draw that
// tree, so both turn the names back into attributes here. React's draws it with
// react-markdown, which takes the ids through `rehypeMessageIds`.

/** A hast property's name as an HTML attribute: `dataFootnoteRef` is `data-footnote-ref`. */
function attributeName(name: string) {
  if (name === "className") return "class"
  if (name === "htmlFor") return "for"
  if (/^aria[A-Z]/.test(name)) return `aria-${name.slice(4).toLowerCase()}`
  if (/^data[A-Z]/.test(name)) return `data-${name.slice(4, 5).toLowerCase()}${name.slice(5).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
  return name.toLowerCase()
}

/**
 * An id in a message's Markdown, made the message's own. remark names every message's
 * footnotes alike (`user-content-fn-1`, and the heading `footnote-label`), so two answers on a
 * page shared them and a footnote link could jump to another answer.
 */
function messageId(attribute: string, value: string, prefix: string) {
  if (attribute === "id" || attribute === "href") value = value.replace(/^(#?)user-content-/, `$1${prefix}-`)
  if ((attribute === "id" || attribute === "aria-describedby") && value === "footnote-label") return `${prefix}-footnote-label`
  return value
}

type HastNode = { type: string; properties?: Record<string, unknown>; children?: HastNode[] }

/**
 * A rehype plugin for react-markdown: the message's ids, as `messageId` makes them, and the
 * footnotes' heading hidden by UISet's class, not Tailwind's `sr-only`, which may not be there.
 */
function rehypeMessageIds(options: { prefix: string }) {
  const walk = (node: HastNode) => {
    const properties = node.properties ?? {}
    if (Array.isArray(properties.className))
      properties.className = properties.className.map((name) => (name === "sr-only" ? "chat-visually-hidden" : name))
    for (const name of ["id", "href", "ariaDescribedBy"]) {
      const value = properties[name]
      const attribute = attributeName(name)
      if (typeof value === "string") properties[name] = messageId(attribute, value, options.prefix)
      else if (Array.isArray(value)) properties[name] = value.map((token) => messageId(attribute, String(token), options.prefix))
    }
    node.children?.forEach(walk)
  }
  return (tree: HastNode) => walk(tree)
}

export { attributeName, messageId, rehypeMessageIds }
