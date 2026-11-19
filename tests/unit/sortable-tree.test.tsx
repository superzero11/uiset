import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { checkDirection, checkServer } from "@ui-sdk/core/testing"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { SortableTree, type SortableTreeItem } from "@/registry/uiset/ui/sortable-tree"
import { build, flatten, nodesOf, sortableTree } from "@/registry/uiset/ui/sortable-tree/sortable-tree"

const files: SortableTreeItem[] = [
  {
    value: "src",
    label: "src",
    children: [
      { value: "lib", label: "lib", children: [{ value: "utils", label: "utils.ts" }] },
      { value: "app", label: "app.tsx" },
    ],
  },
  { value: "docs", label: "docs", children: [] },
  { value: "package", label: "package.json" },
  { value: "readme", label: "README.md", locked: true },
]

function Demo(props: { onMove?: (items: SortableTreeItem[]) => void; onAction?: (key: string) => void; expanded?: string[] }) {
  const [items, setItems] = useState(files)
  return (
    <SortableTree
      label="Files"
      items={items}
      defaultExpanded={props.expanded ?? ["src"]}
      onAction={props.onAction}
      onItemsChange={(next) => {
        setItems(next)
        props.onMove?.(next)
      }}
    />
  )
}

const row = (name: string) => screen.getByRole("treeitem", { name })
/** The rows that show, indented by level, with branches marked open (v) or closed (>). */
const outline = () =>
  screen.getAllByRole("treeitem").map((el) => {
    const open = el.getAttribute("aria-expanded")
    return `${"  ".repeat(Number(el.getAttribute("aria-level")) - 1)}${el.getAttribute("aria-label")}${open === "true" ? " v" : open === "false" ? " >" : ""}`
  })
const press = async (...keys: string[]) => {
  for (const key of keys) await act(async () => void fireEvent.keyDown(document.activeElement!, { key }))
}

test("a tree of rows with their levels, places and open branches, one tab stop", () => {
  render(<Demo />)
  const tree = screen.getByRole("tree", { name: "Files" })
  expect(tree.getAttribute("aria-roledescription")).toBe("sortable tree")
  expect(outline()).toEqual(["src v", "  lib >", "  app.tsx", "docs >", "package.json", "README.md"])
  expect(row("app.tsx").getAttribute("aria-posinset")).toBe("2")
  expect(row("app.tsx").getAttribute("aria-setsize")).toBe("2")
  expect(row("README.md").getAttribute("aria-disabled")).toBe("true")
  expect(screen.getAllByRole("treeitem").filter((el) => el.getAttribute("tabindex") === "0")).toHaveLength(1)
  expect(document.getElementById(tree.getAttribute("aria-describedby")!)?.textContent).toContain("Space picks a row up")
})

test("Right opens a branch and goes into it; Left goes to the parent and closes it", async () => {
  render(<Demo />)
  act(() => row("lib").focus())
  await press("ArrowRight")
  expect(row("lib").getAttribute("aria-expanded")).toBe("true")
  await press("ArrowRight")
  expect(document.activeElement).toBe(row("utils.ts"))
  await press("ArrowLeft")
  expect(document.activeElement).toBe(row("lib"))
  await press("ArrowLeft")
  expect(row("lib").getAttribute("aria-expanded")).toBe("false")
  await press("ArrowDown", "ArrowDown")
  expect(document.activeElement).toBe(row("docs"))
})

test("typing a name's first letters goes to it", async () => {
  render(<Demo />)
  act(() => row("src").focus())
  await press("p")
  expect(document.activeElement).toBe(row("package.json"))
})

test("Space picks a row up; Up and Down move it, Right takes it in a level, and Space drops it", async () => {
  const onMove = vi.fn()
  render(<Demo onMove={onMove} />)
  act(() => row("package.json").focus())
  await press(" ", "ArrowUp")
  expect(row("package.json").hasAttribute("data-moving")).toBe(true)
  // Above docs, a level in is inside src, after app.tsx.
  await press("ArrowRight")
  expect(outline()).toEqual(["src v", "  lib >", "  app.tsx", "  package.json", "docs >", "README.md"])
  // Back below docs and a level in: into the empty docs branch, which shows open while it's carried there.
  await press("ArrowLeft", "ArrowDown", "ArrowRight")
  expect(outline()).toContain("  package.json")
  expect(row("docs").getAttribute("aria-expanded")).toBe("true")
  await press(" ")
  expect(onMove).toHaveBeenCalledTimes(1)
  expect(outline()).toEqual(["src v", "  lib >", "  app.tsx", "docs v", "  package.json", "README.md"])
  expect(document.activeElement).toBe(row("package.json"))
})

test("a branch moves with everything in it, and Escape puts a row back", async () => {
  render(<Demo expanded={["src", "lib"]} />)
  act(() => row("lib").focus())
  await press(" ", "ArrowDown", " ")
  expect(outline()).toEqual(["src v", "  app.tsx", "  lib v", "    utils.ts", "docs >", "package.json", "README.md"])
  await press(" ", "ArrowUp", "Escape")
  expect(outline()).toEqual(["src v", "  app.tsx", "  lib v", "    utils.ts", "docs >", "package.json", "README.md"])
})

test("a row dropped inside an item that isn't a branch goes back, and says why", async () => {
  const onMove = vi.fn()
  render(<Demo onMove={onMove} />)
  act(() => row("app.tsx").focus())
  // Below package.json and in a level: inside a file.
  await press(" ", "ArrowDown", "ArrowDown", "ArrowRight")
  expect(row("app.tsx").hasAttribute("data-invalid")).toBe(true)
  await press(" ")
  expect(onMove).not.toHaveBeenCalled()
  expect(outline()).toEqual(["src v", "  lib >", "  app.tsx", "docs >", "package.json", "README.md"])
  await waitFor(() => expect(document.body.textContent).toContain("app.tsx can't go inside package.json."))
})

test("a locked row can't be picked up", async () => {
  render(<Demo />)
  act(() => row("README.md").focus())
  await press(" ")
  expect(row("README.md").hasAttribute("data-moving")).toBe(false)
})

test("Enter opens a branch or runs the action on anything else", async () => {
  const onAction = vi.fn()
  render(<Demo onAction={onAction} />)
  act(() => row("docs").focus())
  await press("Enter")
  expect(row("docs").getAttribute("aria-expanded")).toBe("true")
  expect(onAction).not.toHaveBeenCalled()
  act(() => row("app.tsx").focus())
  await press("Enter")
  expect(onAction).toHaveBeenCalledWith("app")
})

test("rows become nested items and back, each keeping its own fields", () => {
  const rows = flatten(files)
  expect(rows.map((r) => `${r.depth}${r.key}`)).toEqual(["0src", "1lib", "2utils", "1app", "0docs", "0package", "0readme"])
  expect(build(rows, nodesOf(files))).toEqual(files)
  const moved = build([...rows.slice(0, 5), { key: "package", depth: 1 }, rows[6]!], nodesOf(files))
  expect(moved[1]).toEqual({ value: "docs", label: "docs", children: [{ value: "package", label: "package.json" }] })
})

test("an agent moves an item into a branch by name, and is told when it can't", async () => {
  const agent = createAgent()
  render(<Demo />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const entry = (await agent.snapshot()).find((item) => item.label === "Files")
  expect(entry?.actions).toEqual(expect.arrayContaining(["moveItem", "expandItem", "collapseItem"]))
  const ok = await act(() => agent.act({ steps: [{ ref: "Files", action: "moveItem", args: ["package.json", "src", 1] }] }))
  expect(ok.ok).toBe(true)
  expect(outline()).toEqual(["src v", "  package.json", "  lib >", "  app.tsx", "docs >", "README.md"])
  const bad = await act(() => agent.act({ steps: [{ ref: "Files", action: "moveItem", args: ["app.tsx", "README.md"] }] }))
  expect(bad.error?.message).toContain("README.md can't hold other items.")
  const self = await act(() => agent.act({ steps: [{ ref: "Files", action: "moveItem", args: ["src", "lib"] }] }))
  expect(self.error?.message).toContain("src can't go inside itself.")
})

test("renders on the server and works in both directions", async () => {
  const markup = `<root aria-label="Files"><row value="src">src</row><row value="lib">lib</row><row value="app">app.tsx</row><row value="docs">docs</row></root>`
  const items = files.slice(0, 2)
  checkServer(sortableTree, { defaultItems: items, defaultExpanded: ["src"] }, markup)
  await checkDirection(sortableTree, { defaultItems: items, defaultExpanded: ["src"] }, markup)
})
