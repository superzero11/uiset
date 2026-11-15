// What the rich text editor offers, shared by React and Web Components: the "/" commands
// and the toolbar's marks, lists and block types.

import type { IconName } from "../shell/icon-paths"
import { block, insertBlock, setBlock, type EditorState, type MarkName, type TextBlockType } from "./model"

type RichTextCommand = {
  value: string
  label: string
  description?: string
  /** An icon, or a short glyph like "H1" where no icon says it better. */
  icon?: IconName
  glyph?: string
  run: (state: EditorState) => EditorState
}

const blockCommand = (type: TextBlockType, level?: 1 | 2 | 3) => (s: EditorState) => setBlock(s, type, level ? { level } : {})

/** What "/" offers at the start of a line. */
const defaultCommands: RichTextCommand[] = [
  { value: "text", label: "Text", description: "A plain paragraph", glyph: "T", run: blockCommand("paragraph") },
  { value: "h1", label: "Heading 1", glyph: "H1", description: "A big section title", run: blockCommand("heading", 1) },
  { value: "h2", label: "Heading 2", glyph: "H2", description: "A section title", run: blockCommand("heading", 2) },
  { value: "h3", label: "Heading 3", glyph: "H3", description: "A small section title", run: blockCommand("heading", 3) },
  { value: "bullet", label: "Bulleted list", description: "A list with dots", icon: "list-bullet", run: blockCommand("bullet") },
  { value: "ordered", label: "Numbered list", description: "A list with numbers", icon: "list-ordered", run: blockCommand("ordered") },
  { value: "task", label: "To-do list", description: "A list with checkboxes", icon: "list-check", run: blockCommand("task") },
  { value: "quote", label: "Quote", description: "Set text apart", icon: "quote", run: blockCommand("quote") },
  { value: "code", label: "Code block", description: "Code, as it's typed", icon: "code-block", run: blockCommand("code") },
  { value: "divider", label: "Divider", description: "A line between sections", icon: "rule", run: (s) => insertBlock(s, block("divider")) },
]

const markButtons: { mark: MarkName; label: string; icon: IconName; keys: string }[] = [
  { mark: "bold", label: "Bold", icon: "bold", keys: "mod+b" },
  { mark: "italic", label: "Italic", icon: "italic", keys: "mod+i" },
  { mark: "underline", label: "Underline", icon: "underline", keys: "mod+u" },
  { mark: "strike", label: "Strikethrough", icon: "strike", keys: "mod+shift+x" },
  { mark: "code", label: "Code", icon: "code-inline", keys: "mod+e" },
]

const listButtons: { type: "bullet" | "ordered" | "task"; label: string; icon: IconName }[] = [
  { type: "bullet", label: "Bulleted list", icon: "list-bullet" },
  { type: "ordered", label: "Numbered list", icon: "list-ordered" },
  { type: "task", label: "To-do list", icon: "list-check" },
]

/** The block-type menu's choices: a value per type ("h1"–"h3" for headings). */
const blockOptions = [
  { value: "paragraph", label: "Text" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "quote", label: "Quote" },
  { value: "code", label: "Code block" },
]

/** The block-type menu's value for a block ("paragraph" for lists and anything it doesn't list). */
function blockOptionValue(b: { type: string; level?: number } | undefined): string {
  if (!b) return "paragraph"
  if (b.type === "heading") return `h${b.level ?? 1}`
  return b.type === "quote" || b.type === "code" ? b.type : "paragraph"
}

/** The block type and level for a block-type menu value. */
function blockOptionType(value: string): { type: "paragraph" | "heading" | "quote" | "code"; level?: 1 | 2 | 3 } {
  if (value === "h1" || value === "h2" || value === "h3") return { type: "heading", level: Number(value[1]) as 1 | 2 | 3 }
  return { type: value === "quote" || value === "code" ? value : "paragraph" }
}

/** Where a "/" command's text starts: the last "/" before the caret in the block. */
function commandStart(text: string, caret: number): number {
  return Math.max(0, text.lastIndexOf("/", caret - 1))
}

export { blockOptions, blockOptionType, blockOptionValue, commandStart, defaultCommands, listButtons, markButtons }
export type { RichTextCommand }
