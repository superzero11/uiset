// The editor's DOM positions: where a caret in the page lands in the document's text.
import { expect, test } from "vitest"
import { createState } from "@/registry/uiset/ui/rich-text/model"
import { fromMarkdown } from "@/registry/uiset/ui/rich-text/serialize"
import { createRichTextView, offsetIn } from "@/registry/uiset/ui/rich-text/view"

test("a point after a line break inside bold text counts to there, not to the block's end", () => {
  const p = document.createElement("p")
  p.innerHTML = "<strong>ab<br></strong>cd"
  const strong = p.querySelector("strong")!
  // (strong, 2): after the <br>, the point the caret takes after Shift+Enter in bold text.
  expect(offsetIn(p, strong, 2)).toBe(3)
  expect(offsetIn(p, p.lastChild!, 1)).toBe(4)
})

// Firefox, 2026-11-19: Bold pressed with the pointer focuses the button, the redraw collapses
// the page's selection, and the editor took that as the person's, so Ctrl+I after Bold made
// nothing italic. The selection is theirs only while the text has focus.
test("a selection change while the text doesn't have focus leaves the editor's selection alone", async () => {
  const root = document.createElement("div")
  const button = document.createElement("button")
  document.body.append(root, button)
  const view = createRichTextView(root, { state: createState(fromMarkdown("make this loud")) })
  // jsdom focuses editable text only with a tabindex; browsers don't need one.
  root.tabIndex = 0
  const text = root.querySelector("p")!.firstChild!
  const change = (from: number, to: number) => {
    document.getSelection()!.setBaseAndExtent(text, from, text, to)
    document.dispatchEvent(new Event("selectionchange"))
  }
  root.focus()
  change(10, 14)
  expect(view.state.selection).toEqual({ anchor: { block: 0, offset: 10 }, focus: { block: 0, offset: 14 } })
  button.focus()
  change(0, 0)
  expect(view.state.selection).toEqual({ anchor: { block: 0, offset: 10 }, focus: { block: 0, offset: 14 } })
  // Back in the text, its selection is put back, and the person's next change counts again.
  root.focus()
  await Promise.resolve()
  change(0, 0)
  expect(view.state.selection).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } })
  view.destroy()
  root.remove()
  button.remove()
})
