import { expect, test } from "vitest"
import { addTags, normalizeTag, replaceTags, splitTags, takeEnded } from "@/registry/uiset/ui/tag-input/tags"

test("a tag is trimmed and its inner spaces collapse; transform runs after", () => {
  expect(normalizeTag("  design   systems ")).toBe("design systems")
  expect(normalizeTag("   ")).toBe("")
  expect(normalizeTag(" React ", { transform: (tag) => tag.toLowerCase() })).toBe("react")
})

test("pasted text splits on the delimiters and on line breaks", () => {
  expect(splitTags("a, b,,c")).toEqual(["a", " b", "c"])
  expect(splitTags("a\nb\r\nc")).toEqual(["a", "b", "c"])
  expect(splitTags("a; b, c", [";"])).toEqual(["a", " b, c"])
  expect(splitTags("a.b|c", [".", "|"])).toEqual(["a", "b", "c"])
})

test("while typing, a delimiter ends the tags before it and the rest stays", () => {
  expect(takeEnded("css,")).toEqual({ ended: ["css"], rest: "" })
  expect(takeEnded("css, html, ja")).toEqual({ ended: ["css", " html"], rest: " ja" })
  expect(takeEnded("css")).toEqual({ ended: [], rest: "css" })
})

test("duplicates are refused, ignoring case by default", () => {
  expect(addTags(["React"], ["react"])).toEqual({ tags: ["React"], error: "Already added: react", refused: "react" })
  expect(addTags(["React"], ["react"], { unique: true }).tags).toEqual(["React", "react"])
  expect(addTags(["a"], ["a"], { unique: false }).tags).toEqual(["a", "a"])
  // Within one paste too.
  expect(addTags([], ["a", "A", "b"]).tags).toEqual(["a", "b"])
})

test("max and maxLength refuse what's past them, and the reasons join", () => {
  const change = addTags(["a", "b"], ["c", "d", "averyverylongtag", "a"], { max: 3, maxLength: 10 })
  expect(change.tags).toEqual(["a", "b", "c"])
  expect(change.error).toBe("Already added: a. Longer than 10 characters: averyverylongtag. Up to 3 tags")
  expect(change.refused).toBe("d, averyverylongtag, a")
  expect(addTags([], ["a", "b"], { max: 1 }).error).toBe("Up to 1 tag")
})

test("validate gives its own reason, and sees the other tags", () => {
  const rules = { validate: (tag: string, tags: readonly string[]) => (tag.includes("@") ? null : `Not an email: ${tag} (${tags.length} others)`) }
  expect(addTags(["a@b.co"], ["c@d.co", "nope"], rules)).toEqual({
    tags: ["a@b.co", "c@d.co"],
    error: "Not an email: nope (2 others)",
    refused: "nope",
  })
})

test("an edit puts the new text in the tag's place, and doesn't count against max", () => {
  expect(addTags(["css", "htlm", "js"], ["html"], { max: 3 }, undefined, 1).tags).toEqual(["css", "html", "js"])
  // The tag being edited isn't a duplicate of itself.
  expect(addTags(["css", "HTML"], ["html"], {}, undefined, 1).tags).toEqual(["css", "html"])
  expect(addTags(["css", "js"], ["css"], {}, undefined, 1)).toMatchObject({ tags: ["css", "js"], error: "Already added: css" })
})

test("a whole new list keeps what was there, in its new order, and checks what's new", () => {
  expect(replaceTags(["a", "b"], ["b", "a", " c "])).toEqual({ tags: ["b", "a", "c"], error: null, refused: "" })
  expect(replaceTags(["a", "b"], ["a"]).tags).toEqual(["a"])
  expect(replaceTags(["a"], ["a", "A"]).error).toBe("Already added: A")
  expect(replaceTags(["a"], ["a", "b", "c"], { max: 2 }).error).toBe("Up to 2 tags")
})
