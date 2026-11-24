// The rich text kit in Solid: what the shared browser tests (tests/e2e/rich-text-tests.ts)
// don't reach. Agents through the bridge, a document set from outside, read-only and
// disabled, form values, the count, and the read-only view of a document.
import { render, screen, waitFor } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { expect, test, vi } from "vitest"
import { fromMarkdown, RichTextContent, RichTextEditor, toMarkdown, type RichTextDocument } from "@/solid/src/rich-text"
import { UISet } from "@/solid/src/uiset"
import { createSolidBridge, settle } from "./solid-bridge"

const bridge = createSolidBridge()
const editor = () => screen.getByRole("textbox", { name: "Notes" })
// Toolbar buttons turn off with aria-disabled and stay focusable; jsdom keeps contentEditable
// as a property only.
const off = (button: HTMLElement) => button.getAttribute("aria-disabled") === "true"

test("an agent sets, adds to and clears the text as Markdown, and the page hears each", async () => {
  const onValueChange = vi.fn()
  render(() => (
    <UISet>
      <RichTextEditor label="Notes" defaultValue="Start" onValueChange={onValueChange} />
    </UISet>
  ))
  await settle()
  const entry = bridge.entry("Notes")
  expect(entry.actions).toEqual(["setValue", "insert", "clear"])
  expect(String(entry.value)).toBe("Start")
  await bridge.run("Notes", "setValue", "## Plan\n\n- one\n- two")
  expect(editor().querySelector("h2")?.textContent).toBe("Plan")
  expect(editor().querySelectorAll("li")).toHaveLength(2)
  expect(toMarkdown(onValueChange.mock.lastCall![0] as RichTextDocument)).toBe("## Plan\n\n- one\n- two")
  await bridge.run("Notes", "insert", "Signed")
  expect(toMarkdown(onValueChange.mock.lastCall![0] as RichTextDocument)).toBe("## Plan\n\n- one\n- two\n\nSigned")
  expect(String(bridge.entry("Notes").value)).toContain("Signed")
  await bridge.run("Notes", "clear")
  expect(editor().hasAttribute("data-empty")).toBe(true)
})

test("moving the caret isn't a change to the text: the page hears only edits", async () => {
  const onValueChange = vi.fn()
  render(() => <RichTextEditor label="Notes" defaultValue="make this loud" onValueChange={onValueChange} />)
  await settle()
  const text = editor().querySelector("p")!.firstChild!
  editor().focus()
  document.getSelection()!.setBaseAndExtent(text, 10, text, 14)
  document.dispatchEvent(new Event("selectionchange"))
  await settle()
  // The toolbar heard it (the caret's block is a paragraph), and the page didn't.
  expect(screen.getByRole("combobox", { name: "Block type" }).textContent).toContain("Text")
  expect(onValueChange).not.toHaveBeenCalled()
  await bridge.run("Notes", "insert", "More")
  expect(onValueChange).toHaveBeenCalledTimes(1)
})

test("a document the page sets replaces what's shown, and undo comes on once there's something to undo", async () => {
  const [doc, setDoc] = createSignal<RichTextDocument>(fromMarkdown("First"))
  render(() => <RichTextEditor label="Notes" value={doc()} onValueChange={setDoc} />)
  await settle()
  expect(editor().textContent).toBe("First")
  expect(off(screen.getByRole("button", { name: "Undo" }))).toBe(true)
  setDoc(fromMarkdown("# Second"))
  await settle()
  expect(editor().querySelector("h1")?.textContent).toBe("Second")
  await bridge.run("Notes", "insert", "More")
  expect(toMarkdown(doc())).toBe("# Second\n\nMore")
  expect(off(screen.getByRole("button", { name: "Undo" }))).toBe(false)
})

test("read-only: no toolbar and no editing, still reachable to read, and an agent is told why", async () => {
  render(() => <RichTextEditor label="Notes" defaultValue="Fixed text" readOnly />)
  await settle()
  expect(screen.queryByRole("toolbar")).toBeNull()
  expect(editor().contentEditable).toBe("false")
  expect(editor().getAttribute("aria-readonly")).toBe("true")
  expect(editor().tabIndex).toBe(0)
  const result = await bridge.agent.act({ steps: [{ ref: "Notes", action: "setValue", args: ["changed"] }] })
  expect(result.error?.message).toContain("The editor is read-only.")
  expect(editor().textContent).toBe("Fixed text")
})

test("turned off: marked for everyone, its toolbar too, and an agent is told why", async () => {
  const [disabled, setDisabled] = createSignal(true)
  render(() => <RichTextEditor label="Notes" defaultValue="Text" disabled={disabled()} />)
  await settle()
  expect(editor().getAttribute("aria-disabled")).toBe("true")
  expect(screen.getByRole("toolbar", { name: "Notes formatting" }).getAttribute("aria-disabled")).toBe("true")
  const result = await bridge.agent.act({ steps: [{ ref: "Notes", action: "setValue", args: ["changed"] }] })
  expect(result.error?.message).toContain("The editor is turned off.")
  setDisabled(false)
  await settle()
  expect(editor().hasAttribute("aria-disabled")).toBe(false)
  expect(editor().contentEditable).toBe("true")
})

test("a form gets the text as HTML, or as Markdown, and keeps up as it changes", async () => {
  const [format, setFormat] = createSignal<"html" | "markdown">("html")
  const { container } = render(() => <RichTextEditor label="Notes" defaultValue="**Hi**" name="notes" format={format()} />)
  await settle()
  const field = () => container.querySelector<HTMLInputElement>('input[type="hidden"][name="notes"]')!
  expect(field().value).toBe("<p><strong>Hi</strong></p>")
  setFormat("markdown")
  await settle()
  expect(field().value).toBe("**Hi**")
  await bridge.run("Notes", "setValue", "# Title")
  expect(field().value).toBe("# Title")
})

test("the count reads in words, describes the editor, and marks going over", async () => {
  render(() => <RichTextEditor label="Notes" defaultValue="Hello" maxLength={10} />)
  await settle()
  const count = document.querySelector(".rich-text-count")!
  expect(count.textContent).toBe("5 / 10 characters")
  expect(editor().getAttribute("aria-describedby")).toBe(count.id)
  await bridge.run("Notes", "setValue", "Hello, world!")
  expect(count.textContent).toBe("3 over the limit of 10 characters")
  expect(count.getAttribute("data-over")).toBe("true")
})

test("an image button comes with uploadImage, even one given after the editor is on the page", async () => {
  const [upload, setUpload] = createSignal<((file: File) => Promise<{ src: string } | null>) | undefined>(undefined)
  render(() => <RichTextEditor label="Notes" uploadImage={upload()} />)
  await settle()
  expect(screen.queryByRole("button", { name: "Insert image" })).toBeNull()
  setUpload(() => async () => ({ src: "/cat.png" }))
  await settle()
  expect(screen.getByRole("button", { name: "Insert image" })).toBeTruthy()
})

test("a document shown read-only: lists numbered by level, tasks marked, links kept safe, mentions as chips", async () => {
  const doc = fromMarkdown("## Plan\n\n1. one\n   1. inner\n2. two\n\n- [x] done\n- [ ] todo\n\n[safe](https://example.com) [bad](javascript:alert(1))")
  doc.push({ id: "m", type: "paragraph", content: [{ type: "mention", id: "grace", label: "Grace Hopper" } as never, { text: " signs off" }] } as never)
  const { container } = render(() => <RichTextContent value={doc} />)
  await settle()
  expect(container.querySelector("h2")?.textContent).toBe("Plan")
  expect([...container.querySelectorAll("ol li")].map((li) => [li.getAttribute("value"), li.getAttribute("aria-level")])).toEqual([
    ["1", "1"],
    ["1", "2"],
    ["2", "1"],
  ])
  expect([...container.querySelectorAll('[role="img"]')].map((mark) => mark.getAttribute("aria-label"))).toEqual(["Done", "Not done"])
  const links = [...container.querySelectorAll("a")]
  expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([["safe", "https://example.com/"]])
  expect(links[0]!.getAttribute("rel")).toBe("noopener noreferrer")
  expect(container.querySelector(".rich-text-mention")?.textContent).toBe("@Grace Hopper")
  expect(container.querySelector("script, [onerror]")).toBeNull()
})

test("a document shown read-only is made safe, even one built by hand", async () => {
  const doc = [{ id: "a", type: "paragraph", content: [{ text: "bad", marks: { link: "javascript:alert(1)" } }, { text: " good", marks: { link: "https://example.com/ok" } }] }] as unknown as RichTextDocument
  const { container } = render(() => <RichTextContent value={doc} />)
  await settle()
  expect([...container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["https://example.com/ok"])
  expect(container.textContent).toBe("bad good")
})

test("a document shown read-only follows the document it's given", async () => {
  const [text, setText] = createSignal("First")
  const { container } = render(() => <RichTextContent value={text()} />)
  await settle()
  expect(container.textContent).toBe("First")
  setText("# Second")
  await settle()
  await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("Second"))
})
