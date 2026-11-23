import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { TagInput, type TagInputProps } from "@/registry/uiset/ui/tag-input"
import { createBridge, settle } from "./bridge"

const input = () => screen.getByRole<HTMLInputElement>("combobox", { name: "Topics" })
const chips = () => [...document.querySelectorAll(".tag-input-tag .tag-input-text")].map((chip) => chip.textContent)
const error = () => document.querySelector('[data-slot="field-error"]')?.textContent ?? null

function Topics(props: Partial<TagInputProps>) {
  const [tags, setTags] = useState<string[]>(props.defaultValue ?? ["css"])
  return (
    <>
      <TagInput label="Topics" {...props} defaultValue={undefined} value={tags} onValueChange={(next, details) => (setTags(next), props.onValueChange?.(next, details))} />
      <button type="button">Elsewhere</button>
    </>
  )
}

test("Enter adds what's typed, and a comma ends a tag as you type", async () => {
  const onValueChange = vi.fn()
  render(<Topics onValueChange={onValueChange} />)
  await userEvent.type(input(), "html{Enter}")
  expect(chips()).toEqual(["css", "html"])
  expect(input().value).toBe("")
  expect(onValueChange).toHaveBeenLastCalledWith(["css", "html"], { reason: "add", source: "user" })
  await userEvent.type(input(), "js,  web  components, ty")
  expect(chips()).toEqual(["css", "html", "js", "web components"])
  expect(input().value).toBe(" ty")
})

test("a pasted list becomes one tag each, line breaks too", async () => {
  render(<Topics />)
  await userEvent.click(input())
  await userEvent.paste("react, vue\nsvelte\nCSS")
  expect(chips()).toEqual(["css", "react", "vue", "svelte"])
  expect(error()).toBe("Already added: CSS")
  expect(input().value).toBe("CSS")
})

test("what's typed is added when focus leaves, unless addOnBlur is off", async () => {
  const { unmount } = render(<Topics />)
  await userEvent.type(input(), "html")
  await userEvent.tab()
  expect(chips()).toEqual(["css", "html"])
  unmount()
  render(<Topics addOnBlur={false} />)
  await userEvent.type(input(), "html")
  await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }))
  expect(chips()).toEqual(["css"])
  expect(input().value).toBe("html")
})

test("a duplicate is refused with the reason, announced, and stays typed to fix", async () => {
  render(<Topics />)
  await userEvent.type(input(), "CSS{Enter}")
  expect(chips()).toEqual(["css"])
  expect(error()).toBe("Already added: CSS")
  expect(input().getAttribute("aria-invalid")).toBe("true")
  expect(input().value).toBe("CSS")
  await settle(150)
  expect(document.body.textContent).toContain("Already added: CSS")
  await userEvent.clear(input())
  await userEvent.type(input(), "sass{Enter}")
  expect(error()).toBeNull()
  expect(chips()).toEqual(["css", "sass"])
})

test("max counts the tags and refuses past it; maxLength and validate give reasons", async () => {
  render(<Topics max={3} maxLength={12} validate={(tag) => (/^[a-z ]+$/.test(tag) ? null : `Letters only: ${tag}`)} />)
  expect(screen.getByText("1 of 3")).toBeTruthy()
  await userEvent.type(input(), "averylongtopicname{Enter}")
  expect(error()).toBe("Longer than 12 characters: averylongtopicname")
  await userEvent.clear(input())
  await userEvent.type(input(), "h1{Enter}")
  expect(error()).toBe("Letters only: h1")
  await userEvent.clear(input())
  await userEvent.type(input(), "html, js, ts,")
  expect(chips()).toEqual(["css", "html", "js"])
  expect(error()).toBe("Up to 3 tags")
  expect(screen.getByText("3 of 3")).toBeTruthy()
})

test("Enter or F2 on a tag edits it in its place; Escape keeps the old one", async () => {
  const onValueChange = vi.fn()
  render(<Topics defaultValue={["css", "htlm", "js"]} onValueChange={onValueChange} />)
  await userEvent.click(input())
  await userEvent.keyboard("{ArrowLeft}{ArrowLeft}")
  expect(document.activeElement?.textContent).toBe("htlm")
  await userEvent.keyboard("{Enter}")
  await settle()
  expect(document.activeElement).toBe(input())
  expect(input().value).toBe("htlm")
  expect(document.querySelector(".tag-input-tag[data-editing]")?.textContent).toBe("htlm")
  // Its text is selected, so typing replaces it.
  await userEvent.keyboard("html{Enter}")
  expect(chips()).toEqual(["css", "html", "js"])
  expect(onValueChange).toHaveBeenLastCalledWith(["css", "html", "js"], { reason: "edit", source: "user" })
  expect(document.querySelector("[data-editing]")).toBeNull()

  await userEvent.keyboard("{ArrowLeft}{F2}")
  await settle()
  expect(input().value).toBe("js")
  await userEvent.keyboard("ts{Escape}")
  expect(chips()).toEqual(["css", "html", "js"])
  expect(input().value).toBe("")
})

test("an edit that leaves the text the same, or names another tag, changes nothing", async () => {
  render(<Topics defaultValue={["css", "html"]} />)
  fireEvent.doubleClick(screen.getByText("html"))
  await settle()
  expect(input().value).toBe("html")
  await userEvent.keyboard("{Enter}")
  expect(chips()).toEqual(["css", "html"])
  expect(error()).toBeNull()
  fireEvent.doubleClick(screen.getByText("html"))
  await settle()
  await userEvent.clear(input())
  await userEvent.type(input(), "CSS{Enter}")
  expect(chips()).toEqual(["css", "html"])
  expect(error()).toBe("Already added: CSS")
})

test("Backspace in an emptied edit doesn't remove other tags", async () => {
  render(<Topics defaultValue={["css", "html", "js"]} />)
  fireEvent.doubleClick(screen.getByText("html"))
  await settle()
  // Its text is selected: the first Backspace clears it, the next ones find the field empty.
  await userEvent.keyboard("{Backspace}{Backspace}{Backspace}")
  expect(chips()).toEqual(["css", "html", "js"])
  await userEvent.keyboard("{Escape}")
  expect(chips()).toEqual(["css", "html", "js"])
})

test("an edit emptied and saved removes the tag", async () => {
  render(<Topics defaultValue={["css", "html"]} />)
  fireEvent.doubleClick(screen.getByText("css"))
  await settle()
  await userEvent.clear(input())
  await userEvent.keyboard("{Enter}")
  expect(chips()).toEqual(["html"])
})

test("a tag's remove button is named for it, and Backspace in the empty field removes the last", async () => {
  const onValueChange = vi.fn()
  render(<Topics defaultValue={["css", "html", "js"]} onValueChange={onValueChange} />)
  await userEvent.click(screen.getByRole("button", { name: "Remove html" }))
  expect(chips()).toEqual(["css", "js"])
  expect(onValueChange).toHaveBeenLastCalledWith(["css", "js"], { reason: "remove", source: "user" })
  await userEvent.click(input())
  await userEvent.keyboard("{Backspace}")
  expect(chips()).toEqual(["css"])
})

test("suggestions filter as you type, a pick adds it, and tags already in aren't offered", async () => {
  render(<Topics suggestions={["CSS", "HTML", "JavaScript", "TypeScript"]} />)
  await userEvent.type(input(), "script")
  const options = () => screen.queryAllByRole("option").map((option) => option.textContent)
  expect(options()).toEqual(["JavaScript", "TypeScript"])
  await userEvent.click(screen.getByRole("option", { name: "TypeScript" }))
  expect(chips()).toEqual(["css", "TypeScript"])
  await userEvent.clear(input())
  await userEvent.click(input())
  await userEvent.keyboard("{ArrowDown}")
  expect(options()).toEqual(["HTML", "JavaScript"])
})

test("without suggestions there's no list to open", async () => {
  render(<Topics />)
  await userEvent.type(input(), "html")
  expect(input().getAttribute("aria-expanded")).not.toBe("true")
  expect(screen.queryByRole("listbox")).toBeNull()
})

test("an agent sees one component named by the label, and sets, adds and removes tags through the same rules", async () => {
  const onValueChange = vi.fn()
  render(<Topics defaultValue={["css", "html"]} max={4} onValueChange={onValueChange} />)
  const bridge = createBridge()
  await settle()
  expect(bridge.entry("Topics")).toMatchObject({ component: "tag-input", value: ["css", "html"], actions: ["setValue", "add", "remove"] })
  // The combobox inside is the person's; the agent has the tag input's own actions.
  expect(bridge.agent.snapshot().filter((entry) => !entry.offPage).map((entry) => entry.component)).toEqual(["tag-input"])

  expect((await bridge.run("Topics", "add", "  web   components ")).ok).toBe(true)
  expect(chips()).toEqual(["css", "html", "web components"])
  expect(onValueChange).toHaveBeenLastCalledWith(["css", "html", "web components"], { reason: "set", source: "agent" })
  expect(bridge.entry("Topics").value).toEqual(["css", "html", "web components"])

  expect(await bridge.run("Topics", "add", "HTML")).toMatchObject({ ok: false, error: { message: expect.stringContaining("Already added: HTML") } })
  expect(await bridge.run("Topics", "setValue", ["css", "a", "b", "c", "d"])).toMatchObject({ ok: false, error: { message: expect.stringContaining("Up to 4 tags") } })
  expect(chips()).toEqual(["css", "html", "web components"])

  expect((await bridge.run("Topics", "remove", "HTML")).ok).toBe(true)
  expect(chips()).toEqual(["css", "web components"])
  expect(await bridge.run("Topics", "remove", "rust")).toMatchObject({
    ok: false,
    error: { message: expect.stringContaining("No tag named rust. Its tags: css, web components.") },
  })
  expect((await bridge.run("Topics", "setValue", ["web components", "css"])).ok).toBe(true)
  expect(chips()).toEqual(["web components", "css"])
})

test("each tag submits under name as its own entry", async () => {
  render(
    <form aria-label="Post">
      <TagInput label="Topics" name="topic" defaultValue={["css", "html"]} />
    </form>,
  )
  await act(async () => {})
  const data = new FormData(screen.getByRole("form", { name: "Post" }) as HTMLFormElement)
  expect(data.getAll("topic")).toEqual(["css", "html"])
})

test("uncontrolled, it keeps its own tags", async () => {
  render(<TagInput label="Topics" defaultValue={["css"]} />)
  await userEvent.type(input(), "html,")
  expect(chips()).toEqual(["css", "html"])
})
