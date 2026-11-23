// Formatting a field as it's typed, with the caret kept in place: a phone number, a card, an
// IBAN. The format only adds separators; the characters people type are the "kept" ones, and
// the caret stays after the same kept character however the separators move. No DOM here:
// React and Web Components each read the edit from their input event and apply the result.

type FormatAsYouType = {
  /** The characters that count, from any text: digits for a phone number, normalized. */
  keep: (text: string) => string
  /** The text to show for the kept characters. */
  format: (kept: string) => string
}

type Edit = {
  /** The field's text after the browser's edit. */
  text: string
  /** The caret after the edit. */
  caret: number
  /** The edit's `inputType`, like "insertText" or "deleteContentBackward". */
  inputType?: string
  /** The kept characters before the edit, to tell a deleted separator from a deleted character. */
  before: string
}

/** Where the caret goes: just after the `count`th kept character of `text`, or at its start. */
function caretAfter(text: string, count: number, keep: FormatAsYouType["keep"]): number {
  if (count <= 0) return 0
  let seen = 0
  for (let index = 0; index < text.length; index++) {
    if (keep(text.slice(0, index + 1)).length > seen) seen++
    if (seen >= count) return index + 1
  }
  return text.length
}

/**
 * The text and caret after an edit. A deleted separator takes the kept character beyond it
 * with it (Backspace the one before, Delete the one after), so the caret never sticks on a
 * separator the format puts back.
 */
function formatEdit(edit: Edit, { keep, format }: FormatAsYouType): { text: string; caret: number; kept: string } {
  let kept = keep(edit.text)
  let count = keep(edit.text.slice(0, edit.caret)).length
  if (kept === edit.before && edit.inputType?.startsWith("delete")) {
    if (edit.inputType === "deleteContentForward") kept = kept.slice(0, count) + kept.slice(count + 1)
    else if (count > 0) {
      kept = kept.slice(0, count - 1) + kept.slice(count)
      count--
    }
  }
  const text = format(kept)
  return { text, caret: caretAfter(text, count, keep), kept }
}

export { caretAfter, formatEdit }
export type { Edit, FormatAsYouType }
