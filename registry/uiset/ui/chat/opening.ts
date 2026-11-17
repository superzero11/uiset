/**
 * A message's first words, "Here's a summary of the…", for naming its actions. Every message
 * has the same Copy, Retry and feedback buttons, so the words tell one message's apart.
 */
function openingWords(text: string) {
  const words = text.replace(/[*_`#>[\]]/g, "").split(/\s+/).filter(Boolean)
  const start = words.slice(0, 5).join(" ")
  const cut = start.length > 40 ? start.slice(0, 40).trimEnd() : start
  return cut && (cut !== start || words.length > 5) ? `${cut}…` : cut
}

/** An action's name for the message it acts on: `Copy message: "Here's a summary of the…"`. */
function actionName(action: string, text: string) {
  const opening = openingWords(text)
  return opening ? `${action}: "${opening}"` : action
}

export { actionName, openingWords }
