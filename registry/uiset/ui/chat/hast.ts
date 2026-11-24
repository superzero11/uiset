// An answer's Markdown, parsed to an HTML tree (hast), names its attributes the DOM way
// (className, ariaDescribedBy, dataFootnoteRef). The Web Components and Solid chats draw that
// tree, so both turn the names back into attributes here.

/** A hast property's name as an HTML attribute: `dataFootnoteRef` is `data-footnote-ref`. */
function attributeName(name: string) {
  if (name === "className") return "class"
  if (name === "htmlFor") return "for"
  if (/^aria[A-Z]/.test(name)) return `aria-${name.slice(4).toLowerCase()}`
  if (/^data[A-Z]/.test(name)) return `data-${name.slice(4, 5).toLowerCase()}${name.slice(5).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
  return name.toLowerCase()
}

export { attributeName }
