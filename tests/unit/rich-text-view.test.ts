// The editor's DOM positions: where a caret in the page lands in the document's text.
import { expect, test } from "vitest"
import { offsetIn } from "@/registry/uiset/ui/rich-text/view"

test("a point after a line break inside bold text counts to there, not to the block's end", () => {
  const p = document.createElement("p")
  p.innerHTML = "<strong>ab<br></strong>cd"
  const strong = p.querySelector("strong")!
  // (strong, 2): after the <br>, the point the caret takes after Shift+Enter in bold text.
  expect(offsetIn(p, strong, 2)).toBe(3)
  expect(offsetIn(p, p.lastChild!, 1)).toBe(4)
})
