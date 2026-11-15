// The rich text editor as a UI SDK primitive: what agents read (the text as Markdown) and
// what they can do (set it, insert at the end, clear it), through the same change path
// as a person's edits, so the app's onValueChange sees `details.source === "agent"` and can
// refuse it. The React editor and the web element both run on it.

import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core"

type RichTextReason = "set-value" | "insert" | "clear"

type RichTextPrimitiveOptions = {
  /** The text as Markdown: what an agent reads. */
  value?: string
  defaultValue?: string
  disabled?: boolean
  readOnly?: boolean
  onValueChange?: (markdown: string, details: ChangeDetails<RichTextReason>) => void
}

const richTextPrimitive = definePrimitive({
  name: "rich-text",
  options: {
    value: "string",
    defaultValue: "string",
    disabled: "boolean",
    readOnly: "boolean",
    onValueChange: "callback",
  },
  controlled: ["value"],
  state: (options: RichTextPrimitiveOptions) => ({ value: options.value ?? options.defaultValue ?? "" }),
  // The editor passes its text back as it changes, so agents always read what's shown.
  sync: (options) => (options.value === undefined ? {} : { value: options.value }),
  api: (context) => {
    const change = createChange(context)
    const opts = () => context.options()
    const refuse = () => {
      if (opts().disabled) throw new Error("The editor is turned off.")
      if (opts().readOnly) throw new Error("The editor is read-only.")
    }
    const current = () => String(context.store.get().value ?? "")
    return {
      /** Replaces the text with Markdown (headings, lists, tasks, quotes, code, links, **bold**, _italic_). */
      setValue(markdown: string, event?: Event) {
        refuse()
        return change("value", String(markdown ?? ""), { reason: "set-value", event })
      },
      /** Adds Markdown at the end, as new blocks. */
      insert(markdown: string, event?: Event) {
        refuse()
        const text = String(markdown ?? "").trim()
        if (!text) throw new Error("Give some text to insert.")
        const before = current().trimEnd()
        return change("value", before ? `${before}\n\n${text}` : text, { reason: "insert", event })
      },
      clear(event?: Event) {
        refuse()
        return change("value", "", { reason: "clear", event })
      },
    }
  },
  slots: (slot) => ({
    root: slot({ attrs: () => ({ role: "textbox", "aria-multiline": "true" }) }),
  }),
  agent: { actions: ["setValue", "insert", "clear"] },
})

export { richTextPrimitive }
export type { RichTextPrimitiveOptions, RichTextReason }
