/** The rules a tag input keeps, shared by React and Web Components. No DOM, no framework. */

type TagRules = {
  /** Characters that end a tag as you type, and split pasted text. Enter always ends one. */
  delimiters?: readonly string[]
  /** Refuse a tag that's already there. "ignore-case", the default, treats "React" and "react" as one. */
  unique?: boolean | "ignore-case"
  /** How many tags at most. */
  max?: number
  /** How many characters a tag can have. */
  maxLength?: number
  /** What's wrong with a tag, or nothing when it can be added. `tags` are the others. */
  validate?: (tag: string, tags: readonly string[]) => string | null | undefined
  /** Changes a tag before it's checked, like `(tag) => tag.toLowerCase()`. */
  transform?: (tag: string) => string
}

/** The words a tag input says, for other languages. */
type TagMessages = {
  duplicate: (tags: string[]) => string
  max: (max: number) => string
  tooLong: (tags: string[], maxLength: number) => string
  /** The count under the field when `max` is set. */
  count: (count: number, max: number) => string
  /** The name of a tag's remove button. */
  remove: (tag: string) => string
}

const tagMessages: TagMessages = {
  duplicate: (tags) => `Already added: ${tags.join(", ")}`,
  max: (max) => `Up to ${max} ${max === 1 ? "tag" : "tags"}`,
  tooLong: (tags, maxLength) => `Longer than ${maxLength} characters: ${tags.join(", ")}`,
  count: (count, max) => `${count} of ${max}`,
  remove: (tag) => `Remove ${tag}`,
}

const defaultDelimiters = [","] as const

/** A tag as it's kept: trimmed, inner spaces collapsed, then `transform`. Empty when nothing's left. */
function normalizeTag(text: string, rules: TagRules = {}): string {
  const tag = text.replace(/\s+/g, " ").trim()
  return tag && rules.transform ? rules.transform(tag).trim() : tag
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Text split on the delimiters and on line breaks, as people paste lists. Empty pieces are dropped. */
function splitTags(text: string, delimiters: readonly string[] = defaultDelimiters): string[] {
  const pattern = new RegExp(["\\r?\\n", ...delimiters.filter(Boolean).map(escape)].join("|"))
  return text.split(pattern).filter((piece) => piece.trim())
}

/** While typing: the tags a delimiter has ended, and the text after the last one, still being typed. */
function takeEnded(text: string, delimiters: readonly string[] = defaultDelimiters): { ended: string[]; rest: string } {
  const pattern = new RegExp(["\\r?\\n", ...delimiters.filter(Boolean).map(escape)].join("|"))
  const pieces = text.split(pattern)
  const rest = pieces.pop() ?? ""
  return { ended: pieces.filter((piece) => piece.trim()), rest }
}

const sameTag = (unique: TagRules["unique"]) =>
  unique === false ? () => false : unique === true ? (a: string, b: string) => a === b : (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

type TagChange = {
  /** The tags after the change. */
  tags: string[]
  /** What was refused, with the words to show and announce. Null when everything went in. */
  error: string | null
  /** The refused text, joined back with the first delimiter, to leave in the input. */
  refused: string
}

/**
 * Adds `texts` to `tags`, or puts the first in place of the tag at `at` (an edit). Each is
 * normalized and checked against the rules and the tags before it; the ones refused are
 * reported together, grouped by reason.
 */
function addTags(
  tags: readonly string[],
  texts: readonly string[],
  rules: TagRules = {},
  messages: TagMessages = tagMessages,
  at?: number,
): TagChange {
  const same = sameTag(rules.unique ?? "ignore-case")
  const next = [...tags]
  const others = at === undefined ? next : next.filter((_, index) => index !== at)
  const duplicates: string[] = []
  const tooLong: string[] = []
  const custom: string[] = []
  const refused: string[] = []
  let full = false
  for (const text of texts) {
    const tag = normalizeTag(text, rules)
    if (!tag) continue
    const reason =
      rules.maxLength !== undefined && tag.length > rules.maxLength
        ? (tooLong.push(tag), "long")
        : others.some((other) => same(other, tag))
          ? (duplicates.push(tag), "duplicate")
          : at === undefined && rules.max !== undefined && next.length >= rules.max
            ? ((full = true), "max")
            : rules.validate?.(tag, others)
    if (reason) {
      if (reason !== "long" && reason !== "duplicate" && reason !== "max") custom.push(reason)
      refused.push(tag)
      continue
    }
    if (at !== undefined) {
      next[at] = tag
      others.push(tag)
      at = undefined
    } else {
      next.push(tag)
    }
  }
  const errors = [
    duplicates.length ? messages.duplicate(duplicates) : null,
    tooLong.length && rules.maxLength !== undefined ? messages.tooLong(tooLong, rules.maxLength) : null,
    full && rules.max !== undefined ? messages.max(rules.max) : null,
    ...custom,
  ].filter(Boolean)
  const joiner = `${(rules.delimiters ?? defaultDelimiters)[0] ?? ","} `
  return { tags: next, error: errors.length ? errors.join(". ") : null, refused: refused.join(joiner) }
}

/**
 * A whole new list, as an agent or your code sets it: the tags already there stay, in the
 * new order, and each new one goes through the same rules as typing.
 */
function replaceTags(current: readonly string[], next: readonly string[], rules: TagRules = {}, messages: TagMessages = tagMessages): TagChange {
  return addTags(
    next.filter((tag) => current.includes(tag)),
    next.filter((tag) => !current.includes(tag)),
    rules,
    messages,
  )
}

export { addTags, defaultDelimiters, normalizeTag, replaceTags, splitTags, tagMessages, takeEnded }
export type { TagChange, TagMessages, TagRules }
