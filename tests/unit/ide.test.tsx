import { act, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { EditorTabs, nextTab, ProblemsList } from "@/registry/uiset/ui/ide"
import { indent, lineCol, newline, offsetOf, outdent, type Edit } from "@/registry/uiset/ui/ide/editing"
import { languageOf } from "@/registry/uiset/ui/code/highlight"
import { lint } from "@/registry/uiset/ui/templates/ide-app"

const run = (text: string, edit: Edit) => ({
  text: text.slice(0, edit.from) + edit.insert + text.slice(edit.to),
  selection: [edit.start, edit.end],
})

test("lines and columns count from 1 and clamp to the text", () => {
  const text = "ab\ncde\n\nf"
  expect(lineCol(text, 0)).toEqual({ line: 1, col: 1 })
  expect(lineCol(text, 4)).toEqual({ line: 2, col: 2 })
  expect(lineCol(text, 7)).toEqual({ line: 3, col: 1 })
  expect(offsetOf(text, 2, 3)).toBe(5)
  expect(offsetOf(text, 2, 99)).toBe(6)
  expect(offsetOf(text, 99)).toBe(8)
})

test("Tab indents at the caret, or every line a selection touches", () => {
  expect(run("ab", indent("ab", 1, 1))).toEqual({ text: "a  b", selection: [3, 3] })
  const text = "one\ntwo\n\nthree"
  // From inside "one" to inside "three": every line but the empty one gets an indent.
  expect(run(text, indent(text, 1, 11)).text).toBe("  one\n  two\n\n  three")
  // A selection ending at a line's start leaves that line alone.
  expect(run(text, indent(text, 0, 8)).text).toBe("  one\n  two\n\nthree")
})

test("Shift+Tab takes up to one indent off each line, and keeps the caret on its text", () => {
  const text = "    a\n  b\nc"
  expect(run(text, outdent(text, 0, text.length)).text).toBe("  a\nb\nc")
  expect(run(text, outdent(text, 6, 6))).toEqual({ text: "    a\nb\nc", selection: [6, 6] })
  expect(run("\tx", outdent("\tx", 2, 2)).text).toBe("x")
  expect(run("  ab", outdent("  ab", 3, 3)).selection).toEqual([1, 1])
})

test("Enter keeps the indent, goes one deeper after a bracket, and splits a pair", () => {
  expect(run("  a", newline("  a", 3, 3))).toEqual({ text: "  a\n  ", selection: [6, 6] })
  expect(run("f() {", newline("f() {", 5, 5)).text).toBe("f() {\n  ")
  const pair = "f() {}"
  expect(run(pair, newline(pair, 5, 5))).toEqual({ text: "f() {\n  \n}", selection: [8, 8] })
})

test("files map to the languages shiki colors", () => {
  expect(languageOf("src/app.tsx")).toBe("tsx")
  expect(languageOf("README.md")).toBe("markdown")
  expect(languageOf("Makefile")).toBeUndefined()
})

test("the sample linter finds open braces, console.log, var and TODOs", () => {
  const problems = lint("a.ts", "// TODO: x\nvar n = 1\nconsole.log(n)\nfunction f() {\n")
  expect(problems.map((p) => [p.severity, p.line])).toEqual([
    ["info", 1],
    ["warning", 2],
    ["warning", 3],
    ["error", 5],
  ])
  expect(lint("notes.md", "TODO {")).toEqual([])
})

function Tabs({ onClose }: { onClose: (path: string) => void }) {
  const [files, setFiles] = useState([{ path: "a.ts" }, { path: "lib/b.ts", dirty: true }, { path: "other/b.ts" }])
  const [active, setActive] = useState<string | null>("lib/b.ts")
  return (
    <EditorTabs
      files={files}
      value={active}
      onValueChange={setActive}
      onClose={(path) => {
        onClose(path)
        // The parent closes: it drops the file and picks the tab that takes over.
        setActive((current) => (current === path ? nextTab(files.map((f) => f.path), path) : current))
        setFiles((all) => all.filter((f) => f.path !== path))
      }}
    >
      {(path) => <p>Editing {path}</p>}
    </EditorTabs>
  )
}

test("tabs name unsaved files and same-named files by folder; Delete closes and the next tab takes over", async () => {
  const onClose = vi.fn()
  render(<Tabs onClose={onClose} />)
  expect(screen.getByRole("tab", { name: "b.ts lib, unsaved" }).getAttribute("aria-selected")).toBe("true")
  expect(screen.getByRole("tab", { name: "b.ts other" })).toBeTruthy()
  expect(screen.getByText("Editing lib/b.ts")).toBeTruthy()
  fireEvent.keyDown(screen.getByRole("tab", { name: "b.ts lib, unsaved" }), { key: "Delete" })
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(onClose).toHaveBeenCalledWith("lib/b.ts")
  expect(screen.getByRole("tab", { name: "b.ts" }).getAttribute("aria-selected")).toBe("true")
  expect(screen.getByText("Editing other/b.ts")).toBeTruthy()
})

test("problems list worst first and say their severity in words", () => {
  const onChoose = vi.fn()
  render(
    <ProblemsList
      problems={[
        { path: "a.ts", line: 3, severity: "info", message: "Note this" },
        { path: "b.ts", line: 1, col: 2, severity: "error", message: "Broken" },
      ]}
      onChoose={onChoose}
    />,
  )
  const buttons = screen.getAllByRole("button")
  expect(buttons.map((b) => b.textContent)).toEqual(["Error: Broken b.ts:1:2", "Note: Note this a.ts:3"])
  fireEvent.click(buttons[0]!)
  expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ path: "b.ts", line: 1 }))
})

test("tabs given a value that's no longer open show the first file, never a blank editor", () => {
  render(
    <EditorTabs files={[{ path: "a.ts" }, { path: "b.ts" }]} value="gone.ts" onValueChange={() => {}} onClose={() => {}}>
      {(path) => <p>Editing {path}</p>}
    </EditorTabs>,
  )
  expect(screen.getByRole("tab", { name: "a.ts" }).getAttribute("aria-selected")).toBe("true")
  expect(screen.getByRole("tabpanel")).toHaveProperty("textContent", "Editing a.ts")
})
