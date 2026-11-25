// The IDE kit in Solid, with React's assertions (tests/unit/ide.test.tsx). The editing,
// highlighting and linting are shared (ide/editing.ts, code/highlight.ts, ide-sample.ts) and
// tested there; these check the Solid parts over UI SDK's Tree, Tabs, Command and Dialog.
import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { beforeAll, expect, test, vi } from "vitest"
import { CodeEditor, CommandPalette, EditorTabs, FileTree, nextTab, ProblemsList, StatusBar, StatusBarItem, type CodeEditorHandle } from "@/solid/src/ide"
import { settle } from "./solid-bridge"

// jsdom has no matchMedia; the IDE asks whether the screen is narrow. A wide one, here.
beforeAll(() => {
  window.matchMedia ??= ((media: string) => ({ matches: false, media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia
})

function Tabs(props: { onClose: (path: string) => void }) {
  const [files, setFiles] = createSignal([{ path: "a.ts" }, { path: "lib/b.ts", dirty: true }, { path: "other/b.ts" }])
  const [active, setActive] = createSignal<string | null>("lib/b.ts")
  return (
    <EditorTabs
      files={files()}
      value={active()}
      onValueChange={setActive}
      onClose={(path) => {
        props.onClose(path)
        // The parent closes: it drops the file and picks the tab that takes over.
        setActive((current) => (current === path ? nextTab(files().map((f) => f.path), path) : current))
        setFiles((all) => all.filter((f) => f.path !== path))
      }}
      empty={<p>Nothing open</p>}
    >
      {(path) => <p>Editing {path}</p>}
    </EditorTabs>
  )
}

test("tabs name unsaved files and same-named files by folder; Delete closes and the next tab takes over", async () => {
  const onClose = vi.fn()
  render(() => <Tabs onClose={onClose} />)
  await settle()
  expect(screen.getByRole("tab", { name: "b.ts lib, unsaved" }).getAttribute("aria-selected")).toBe("true")
  expect(screen.getByRole("tab", { name: "b.ts other" })).toBeTruthy()
  expect(screen.getByText("Editing lib/b.ts")).toBeTruthy()
  screen.getByRole("tab", { name: "b.ts lib, unsaved" }).focus()
  fireEvent.keyDown(screen.getByRole("tab", { name: "b.ts lib, unsaved" }), { key: "Delete" })
  await settle()
  expect(onClose).toHaveBeenCalledWith("lib/b.ts")
  expect(screen.getByRole("tab", { name: "b.ts" }).getAttribute("aria-selected")).toBe("true")
  expect(screen.getByText("Editing other/b.ts")).toBeTruthy()
  // Focus went to the tab that took over.
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "b.ts" })))
  // Every open file keeps its panel; the last one closed leaves the empty pane, focused.
  for (const name of ["b.ts", "a.ts"]) {
    fireEvent.keyDown(screen.getByRole("tab", { name }), { key: "Delete" })
    await settle()
  }
  expect(screen.getByText("Nothing open")).toBeTruthy()
  await waitFor(() => expect(document.activeElement?.classList.contains("ide-editor-empty")).toBe(true))
})

test("tabs given a value that's no longer open show the first file, never a blank editor", async () => {
  render(() => (
    <EditorTabs files={[{ path: "a.ts" }, { path: "b.ts" }]} value="gone.ts" onValueChange={() => {}} onClose={() => {}}>
      {(path) => <p>Editing {path}</p>}
    </EditorTabs>
  ))
  await settle()
  expect(screen.getByRole("tab", { name: "a.ts" }).getAttribute("aria-selected")).toBe("true")
  expect(screen.getByRole("tabpanel")).toHaveProperty("textContent", "Editing a.ts")
})

test("problems list worst first and say their severity in words", async () => {
  const onChoose = vi.fn()
  render(() => (
    <ProblemsList
      problems={[
        { path: "a.ts", line: 3, severity: "info", message: "Note this" },
        { path: "b.ts", line: 1, col: 2, severity: "error", message: "Broken" },
      ]}
      onChoose={onChoose}
    />
  ))
  await settle()
  const buttons = screen.getAllByRole("button")
  expect(buttons.map((b) => b.textContent)).toEqual(["Error: Broken b.ts:1:2", "Note: Note this a.ts:3"])
  fireEvent.click(buttons[0]!)
  expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ path: "b.ts", line: 1 }))
})

test("no problems says so, and the status bar's items are text or buttons", async () => {
  const onClick = vi.fn()
  render(() => (
    <>
      <ProblemsList problems={[]} onChoose={() => {}} empty="All clear." />
      <StatusBar>
        <StatusBarItem>main</StatusBarItem>
        <StatusBarItem onClick={onClick} label="Show problems">
          0 errors
        </StatusBarItem>
      </StatusBar>
    </>
  ))
  await settle()
  expect(screen.getByText("All clear.")).toBeTruthy()
  const bar = screen.getByRole("group", { name: "Status" })
  expect(within(bar).getAllByRole("button")).toHaveLength(1)
  fireEvent.click(within(bar).getByRole("button", { name: "Show problems" }))
  expect(onClick).toHaveBeenCalled()
})

test("the file tree sorts folders first, marks changes in words, opens files and selects", async () => {
  const onOpen = vi.fn()
  const onValueChange = vi.fn()
  render(() => (
    <FileTree
      label="Files"
      paths={["src/b.ts", "README.md", "src/a.ts", "docs/"]}
      status={{ "src/a.ts": "modified" }}
      defaultExpanded={["src"]}
      onOpen={onOpen}
      onValueChange={onValueChange}
    />
  ))
  await settle()
  const tree = screen.getByRole("tree", { name: "Files" })
  expect(within(tree).getAllByRole("treeitem").map((i) => i.querySelector(".ide-tree-name")?.textContent)).toEqual(["docs", "src", "a.ts", "b.ts", "README.md"])
  expect(within(tree).getByRole("treeitem", { name: "a.ts, modified" })).toBeTruthy()
  expect(within(tree).getByRole("treeitem", { name: "src, has changes" })).toBeTruthy()
  fireEvent.click(within(tree).getByRole("treeitem", { name: "b.ts" }).querySelector(".ide-tree-label")!)
  await settle()
  expect(onValueChange).toHaveBeenLastCalledWith("src/b.ts")
  expect(onOpen).toHaveBeenLastCalledWith("src/b.ts")
  // Read-only: no actions to offer.
  expect(screen.queryByRole("button", { name: "New file" })).toBeNull()
})

test("the file tree's dialogs create, refuse a name that's taken, rename with F2 and delete after asking", async () => {
  const onCreate = vi.fn()
  const onRename = vi.fn()
  const onDelete = vi.fn()
  function Project() {
    const [paths, setPaths] = createSignal(["src/a.ts", "src/b.ts"])
    return (
      <FileTree
        label="Files"
        paths={paths()}
        defaultExpanded={["src"]}
        defaultValue="src/a.ts"
        onCreate={(path, kind) => {
          onCreate(path, kind)
          setPaths([...paths(), kind === "folder" ? `${path}/` : path])
        }}
        onRename={(from, to) => {
          onRename(from, to)
          setPaths(paths().map((p) => (p === from ? to : p)))
        }}
        onDelete={(path) => {
          onDelete(path)
          setPaths(paths().filter((p) => p !== path))
        }}
      />
    )
  }
  render(() => <Project />)
  await settle()
  fireEvent.click(screen.getByRole("button", { name: "New file" }))
  const dialog = await screen.findByRole("dialog", { name: "New file" })
  expect(within(dialog).getByText("In src.")).toBeTruthy()
  const name = within(dialog).getByRole("textbox", { name: "Name" }) as HTMLInputElement
  name.value = "b.ts"
  fireEvent.submit(within(dialog).getByRole("form"))
  await settle()
  expect(dialog.textContent).toContain("b.ts already exists there.")
  expect(onCreate).not.toHaveBeenCalled()
  name.value = "c/d.ts"
  fireEvent.submit(within(dialog).getByRole("form"))
  await settle()
  expect(dialog.textContent).toContain("A name can't have slashes.")
  name.value = "c.ts"
  fireEvent.submit(within(dialog).getByRole("form"))
  await settle()
  expect(onCreate).toHaveBeenCalledWith("src/c.ts", "file")
  const tree = screen.getByRole("tree", { name: "Files" })
  await waitFor(() => expect(within(tree).getByRole("treeitem", { name: "c.ts" }).getAttribute("aria-selected")).toBe("true"))
  // F2 on the focused item renames it, whatever is selected.
  const a = within(tree).getByRole("treeitem", { name: "a.ts" })
  fireEvent.keyDown(a.querySelector(".ide-tree-label") ?? a, { key: "F2" })
  const rename = await screen.findByRole("dialog", { name: "Rename a.ts" })
  const field = within(rename).getByRole("textbox", { name: "Name" }) as HTMLInputElement
  expect(field.value).toBe("a.ts")
  field.value = "first.ts"
  fireEvent.submit(within(rename).getByRole("form"))
  await settle()
  expect(onRename).toHaveBeenCalledWith("src/a.ts", "src/first.ts")
  // Delete asks, then deletes, and selects the neighbor.
  fireEvent.keyDown(within(tree).getByRole("treeitem", { name: "b.ts" }), { key: "Delete" })
  const ask = await screen.findByRole("alertdialog", { name: "Delete b.ts?" })
  fireEvent.click(within(ask).getByRole("button", { name: "Delete" }))
  await settle()
  expect(onDelete).toHaveBeenCalledWith("src/b.ts")
  await waitFor(() => expect(within(tree).getByRole("treeitem", { name: "c.ts" }).getAttribute("aria-selected")).toBe("true"))
})

test("the code editor keeps its text, reports edits and the caret, indents with Tab and walks problems with F8", async () => {
  const onValueChange = vi.fn()
  const onCursorChange = vi.fn()
  let handle: CodeEditorHandle | null = null
  render(() => (
    <CodeEditor
      label="a.ts"
      path="a.ts"
      defaultValue={"one\ntwo\nthree"}
      onValueChange={onValueChange}
      onCursorChange={onCursorChange}
      problems={[
        { path: "a.ts", line: 3, severity: "error", message: "Bad" },
        { path: "a.ts", line: 2, severity: "warning", message: "Meh" },
      ]}
      ref={(h) => (handle = h)}
    />
  ))
  await settle()
  const box = screen.getByRole("textbox", { name: "a.ts" }) as HTMLTextAreaElement
  expect(box.value).toBe("one\ntwo\nthree")
  expect(document.getElementById(box.getAttribute("aria-describedby")!)?.textContent).toContain("2 problems; F8 goes to the next.")
  const gutter = document.querySelector(".ide-code-gutter")!
  expect([...gutter.querySelectorAll("[data-problem]")].map((n) => [n.textContent, n.getAttribute("data-problem")])).toEqual([
    ["▲2", "warning"],
    ["●3", "error"],
  ])
  expect(onCursorChange).toHaveBeenCalledWith({ line: 1, col: 1 })
  box.focus()
  fireEvent.keyDown(box, { key: "F8" })
  expect(box.selectionStart).toBe(4)
  fireEvent.keyDown(box, { key: "F8" })
  expect(box.selectionStart).toBe(8)
  handle!.goTo(1, 2)
  expect(box.selectionStart).toBe(1)
  fireEvent.keyDown(box, { key: "Tab" })
  await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith("o  ne\ntwo\nthree"))
  // Escape, then Tab, leaves: the editor doesn't take that Tab.
  fireEvent.keyDown(box, { key: "Escape" })
  expect(fireEvent.keyDown(box, { key: "Tab" })).toBe(true)
  // Its own undo takes the indent back.
  fireEvent.keyDown(box, { key: "z", ...(/Mac/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true }) })
  await waitFor(() => expect(box.value).toBe("one\ntwo\nthree"))
})

test("the code editor takes text the app sets, and a read-only one says so", async () => {
  const [text, setText] = createSignal("first")
  render(() => (
    <>
      <CodeEditor label="live.ts" value={text()} onValueChange={setText} />
      <CodeEditor label="fixed.ts" defaultValue="x" readOnly />
    </>
  ))
  await settle()
  const live = screen.getByRole("textbox", { name: "live.ts" }) as HTMLTextAreaElement
  setText("second\nline")
  await settle()
  expect(live.value).toBe("second\nline")
  expect(document.querySelectorAll(".ide-code-gutter")[0]!.textContent).toBe("12")
  const fixed = screen.getByRole("textbox", { name: "fixed.ts" }) as HTMLTextAreaElement
  expect(fixed.readOnly).toBe(true)
  expect(document.getElementById(fixed.getAttribute("aria-describedby")!)?.textContent).toBe("Read only.")
  expect(fireEvent.keyDown(fixed, { key: "Tab" })).toBe(true)
})

test("the palette lists recent files first, runs commands after > and goes to a line after :", async () => {
  const onOpenFile = vi.fn()
  const onCommand = vi.fn()
  const onGoToLine = vi.fn()
  render(() => (
    <CommandPalette
      files={["src/a.ts", "src/b.ts", "README.md"]}
      recent={["src/b.ts"]}
      commands={[{ value: "save", label: "Save", shortcut: "mod+s" }]}
      onOpenFile={onOpenFile}
      onCommand={onCommand}
      onGoToLine={onGoToLine}
    />
  ))
  await settle()
  fireEvent.click(screen.getByRole("button", { name: /Go to file/ }))
  const dialog = await screen.findByRole("dialog", { name: "Go to file" })
  const options = () => within(dialog).getAllByRole("option").map((o) => o.textContent)
  expect(options()).toEqual(["b.tssrcrecent", "a.tssrc", "README.md"])
  const input = within(dialog).getByRole("combobox")
  fireEvent.input(input, { target: { value: "> sa" } })
  await settle()
  expect(screen.getByRole("dialog", { name: "Run a command" })).toBeTruthy()
  fireEvent.click(within(dialog).getByRole("option", { name: /Save/ }))
  await settle()
  expect(onCommand).toHaveBeenCalledWith("save")
  fireEvent.click(screen.getByRole("button", { name: /Go to file/ }))
  await settle()
  fireEvent.input(within(dialog).getByRole("combobox"), { target: { value: ":12" } })
  await settle()
  // jsdom drops the space that ends the first highlighted part; a browser keeps it.
  fireEvent.click(within(dialog).getByRole("option", { name: /^Go to line ?12$/ }))
  await settle()
  expect(onGoToLine).toHaveBeenCalledWith(12)
  fireEvent.click(screen.getByRole("button", { name: /Go to file/ }))
  await settle()
  fireEvent.input(within(dialog).getByRole("combobox"), { target: { value: "rdm" } })
  await settle()
  expect(within(dialog).getByRole("option").querySelector("mark")).not.toBeNull()
  fireEvent.click(within(dialog).getByRole("option"))
  await settle()
  expect(onOpenFile).toHaveBeenCalledWith("README.md")
})
