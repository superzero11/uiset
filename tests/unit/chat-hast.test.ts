import { expect, test } from "vitest"
import { attributeName } from "@/registry/uiset/ui/chat/hast"

// The Web Components and Solid chats draw an answer's HTML tree with these names.
test("hast's property names become the attributes they stand for", () => {
  expect(attributeName("className")).toBe("class")
  expect(attributeName("htmlFor")).toBe("for")
  expect(attributeName("ariaDescribedBy")).toBe("aria-describedby")
  expect(attributeName("dataFootnoteRef")).toBe("data-footnote-ref")
  expect(attributeName("dataFootnotes")).toBe("data-footnotes")
  expect(attributeName("colSpan")).toBe("colspan")
})
