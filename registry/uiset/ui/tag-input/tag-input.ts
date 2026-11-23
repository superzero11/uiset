import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core"
import { normalizeTag } from "./tags"

/** Why the tags changed: typed or chosen, pasted, edited, removed, or set by an agent or code. */
type TagInputReason = "add" | "paste" | "edit" | "remove" | "set"

type TagInputOptions = {
  value?: string[]
  defaultValue?: string[]
  /** Web Components: reports a change `set` makes (the `valuechange` event); React keeps its own. */
  onValueChange?: (tags: string[], details: ChangeDetails<TagInputReason>) => void
  /** Asks for a new list of tags and returns why it's refused, or nothing once it's in. */
  request?: (tags: string[]) => string | null | undefined
  disabled?: boolean
  // Read by the Web Components element as properties; React takes them as props.
  suggestions?: readonly string[]
  validate?: (tag: string, tags: readonly string[]) => string | null | undefined
  transform?: (tag: string) => string
  messages?: object
}

// The tag input as an agent sees it: one component named by its label, whose value is the
// tags. The Combobox inside is hidden from agents (its setValue waits for a list of options a
// tag input doesn't have, and can't say why a tag is refused). Each action asks the React or
// web part, which keeps the rules, and a refusal fails the step with the reason.
/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const tagInput = definePrimitive({
  name: "tag-input",
  options: {
    value: "list",
    defaultValue: "list",
    onValueChange: "callback",
    request: "action",
    disabled: "boolean",
    suggestions: "value",
    validate: "value",
    transform: "value",
    messages: "value",
  },
  controlled: ["value"],
  state: (options: TagInputOptions) => ({ value: options.value ?? options.defaultValue ?? [], disabled: options.disabled ?? false }),
  sync: (options) => ({ ...(options.value === undefined ? {} : { value: options.value }), disabled: options.disabled ?? false }),
  api: (context) => {
    const change = createChange(context)
    const current = () => context.store.get().value
    const ask = (tags: string[]) => {
      if (context.store.get().disabled) throw new Error("It's disabled, so its tags can't change.")
      const problem = context.options().request?.(tags)
      if (problem) throw new Error(problem)
      return true
    }
    const list = (tags: (string | string[])[]) => tags.flat().map(String)
    return {
      /** A change the rules already passed, as a person made it: reported, and refusable on the web. */
      set: (tags: string[], details: { reason: TagInputReason; event?: Event }) => change("value", tags, details),
      /** Replaces the tags with these. */
      setValue: (tags: string[] | string) => ask(list([tags])),
      /** Adds tags after the others. */
      add: (...tags: (string | string[])[]) => ask([...current(), ...list(tags)]),
      /** Removes tags by name, ignoring case. */
      remove: (...tags: (string | string[])[]) => {
        const names = list(tags).map((tag) => normalizeTag(tag).toLowerCase())
        const missing = names.filter((name) => !current().some((tag) => tag.toLowerCase() === name))
        if (missing.length) throw new Error(`No tag named ${missing.join(", ")}. Its tags: ${current().join(", ") || "none"}.`)
        return ask(current().filter((tag) => !names.includes(tag.toLowerCase())))
      },
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: string[]; disabled: boolean }>({
      role: "group",
      state: (state) => ({ value: state.value, disabled: state.disabled }),
      attrs: (state) => ({ "data-disabled": state.disabled ? "" : undefined }),
    }),
  }),
  agent: { actions: ["setValue", "add", "remove"] },
})

export { tagInput }
export type { TagInputOptions, TagInputReason }
