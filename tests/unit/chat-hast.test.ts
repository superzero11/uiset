import { expect, test } from "vitest"
import { attributeName, messageId, rehypeMessageIds } from "@/registry/uiset/ui/chat/hast"

// The Web Components and Solid chats draw an answer's HTML tree with these names.
test("hast's property names become the attributes they stand for", () => {
  expect(attributeName("className")).toBe("class")
  expect(attributeName("htmlFor")).toBe("for")
  expect(attributeName("ariaDescribedBy")).toBe("aria-describedby")
  expect(attributeName("dataFootnoteRef")).toBe("data-footnote-ref")
  expect(attributeName("dataFootnotes")).toBe("data-footnotes")
  expect(attributeName("colSpan")).toBe("colspan")
})

// Every message's Markdown names its footnotes alike; each chat makes them the message's own.
test("a message's footnote ids, links and heading are made its own; other ids are left alone", () => {
  expect(messageId("id", "user-content-fn-1", "m2")).toBe("m2-fn-1")
  expect(messageId("href", "#user-content-fnref-1", "m2")).toBe("#m2-fnref-1")
  expect(messageId("id", "footnote-label", "m2")).toBe("m2-footnote-label")
  expect(messageId("aria-describedby", "footnote-label", "m2")).toBe("m2-footnote-label")
  expect(messageId("href", "https://example.com/#user-content-x", "m2")).toBe("https://example.com/#user-content-x")
  expect(messageId("class", "footnote-label", "m2")).toBe("footnote-label")
})

test("React's plugin gives a tree the same ids, and hides the footnotes' heading with UISet's class", () => {
  const tree = {
    type: "root",
    children: [
      { type: "element", properties: { href: "#user-content-fn-1", id: "user-content-fnref-1", ariaDescribedBy: ["footnote-label"] }, children: [] },
      { type: "element", properties: { id: "footnote-label", className: ["sr-only"] }, children: [{ type: "text" }] },
    ],
  }
  rehypeMessageIds({ prefix: "a1" })(tree)
  expect(tree.children.map((node) => node.properties)).toEqual([
    { href: "#a1-fn-1", id: "a1-fnref-1", ariaDescribedBy: ["a1-footnote-label"] },
    { id: "a1-footnote-label", className: ["chat-visually-hidden"] },
  ])
})
