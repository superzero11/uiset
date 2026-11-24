// The sortable list and tree in Solid, with React's assertions (tests/unit/sortable-list.test.tsx
// and sortable-tree.test.tsx). The keyboard model is UISet's own primitive, tested once there;
// these check the Solid views over it.
import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library"
import { createAgent } from "@ui-sdk/solid/agent"
import { usePrimitive } from "@ui-sdk/solid/primitive"
import { createRoot, createSignal } from "solid-js"
import { expect, test, vi } from "vitest"
import { SortableList } from "@/solid/src/sortable-list"
import { SortableTree, type SortableTreeItem } from "@/solid/src/sortable-tree"
import { sortableTree } from "@/registry/uiset/ui/sortable-tree/sortable-tree"
import { settle } from "./solid-bridge"

const keys = ["a", "b", "c", "d"]
const names: Record<string, string> = { a: "Alpha", b: "Bravo", c: "Charlie", d: "Delta" }
const letters = keys.map((key) => ({ value: key, label: names[key]! }))
const options = () => screen.getAllByRole("option")

test("SortableList is a listbox of named options, described by how to move them", async () => {
  render(() => <SortableList label="Priorities" items={letters} numbered />)
  await settle()
  const list = screen.getByRole("listbox", { name: "Priorities" })
  expect(list.getAttribute("aria-roledescription")).toBe("sortable list")
  expect(list.getAttribute("aria-orientation")).toBe("vertical")
  expect(options().map((el) => el.getAttribute("aria-label"))).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
  expect(options().map((el) => el.getAttribute("aria-roledescription"))).toEqual(Array(4).fill("sortable item"))
  expect(options().filter((el) => el.getAttribute("tabindex") === "0")).toHaveLength(1)
  expect(document.getElementById(list.getAttribute("aria-describedby")!)?.textContent).toContain("Space picks an item up")
  expect(options().map((el) => el.querySelector(".sortable-list-position")?.textContent)).toEqual(["1", "2", "3", "4"])
  expect(list.classList.contains("sortable-list-numbered")).toBe(true)
})

test("a moved item's place number follows it, and a description describes its item", async () => {
  const onValueChange = vi.fn()
  render(() => <SortableList label="Priorities" items={[...letters.slice(0, 3), { value: "d", label: "Delta", description: "Last for now" }]} numbered onValueChange={onValueChange} />)
  await settle()
  const delta = screen.getByRole("option", { name: "Delta" })
  expect(document.getElementById(delta.getAttribute("aria-describedby")!)?.textContent).toBe("Last for now")
  expect(delta.querySelector(".sortable-list-text")!.textContent).toBe("Delta Last for now")
  delta.focus()
  for (const key of [" ", "ArrowUp", " "]) fireEvent.keyDown(document.activeElement!, { key })
  await settle()
  expect(onValueChange).toHaveBeenLastCalledWith(["a", "b", "d", "c"], expect.anything())
  expect(options().map((el) => el.getAttribute("aria-label"))).toEqual(["Alpha", "Bravo", "Delta", "Charlie"])
  expect(screen.getByRole("option", { name: "Delta" }).querySelector(".sortable-list-position")!.textContent).toBe("3")
  expect(screen.getByRole("option", { name: "Charlie" }).querySelector(".sortable-list-position")!.textContent).toBe("4")
})

test("with multiple, items show a check and the help says how to select", async () => {
  render(() => <SortableList label="Priorities" items={[...letters.slice(0, 3), { ...letters[3]!, locked: true }]} multiple />)
  await settle()
  const list = screen.getByRole("listbox", { name: "Priorities" })
  expect(document.getElementById(list.getAttribute("aria-describedby")!)?.textContent).toContain("Shift+Space selects")
  expect(options().map((el) => !!el.querySelector("[data-sortable-check]"))).toEqual([true, true, true, false])
  // A locked item can't be picked up, and its grip is a lock.
  const delta = screen.getByRole("option", { name: "Delta" })
  expect(delta.getAttribute("aria-disabled")).toBe("true")
  expect(screen.getByRole("option", { name: "Alpha" }).hasAttribute("aria-disabled")).toBe(false)
  expect(delta.querySelector(".sortable-list-handle")!.innerHTML).not.toBe(screen.getByRole("option", { name: "Alpha" }).querySelector(".sortable-list-handle")!.innerHTML)
  expect(list.classList.contains("sortable-list-numbered")).toBe(false)
})

test("items that come and go keep the order people chose", async () => {
  const [items, setItems] = createSignal(letters)
  render(() => <SortableList label="Priorities" items={items()} defaultValue={["d", "a", "b", "c"]} />)
  await settle()
  expect(options().map((el) => el.getAttribute("aria-label"))).toEqual(["Delta", "Alpha", "Bravo", "Charlie"])
  setItems([...letters.filter((item) => item.value !== "a"), { value: "e", label: "Echo" }])
  await settle()
  expect(options().map((el) => el.getAttribute("aria-label"))).toEqual(["Delta", "Bravo", "Charlie", "Echo"])
})

test("an agent finds the list by its name and moves an item by its name", async () => {
  const agent = createAgent()
  render(() => <SortableList label="Priorities" items={letters} />)
  await settle()
  const entry = (await agent.snapshot()).find((item) => item.label === "Priorities")
  expect(entry?.actions).toEqual(expect.arrayContaining(["moveItem", "selectItems"]))
  const result = await agent.act({ steps: [{ ref: "Priorities", action: "moveItem", args: ["Delta", 1] }] })
  expect(result.ok).toBe(true)
  await settle()
  expect(options().map((el) => el.getAttribute("aria-label"))).toEqual(["Delta", "Alpha", "Bravo", "Charlie"])
})

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

function Files(props: { onMove?: (items: SortableTreeItem[]) => void; onAction?: (key: string) => void; expanded?: string[]; icons?: boolean }) {
  const [items, setItems] = createSignal(files)
  return (
    <SortableTree
      label="Files"
      items={items()}
      icons={props.icons}
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
  for (const key of keys) {
    fireEvent.keyDown(document.activeElement!, { key })
    await settle(0)
  }
}

test("a tree of rows with their levels, places and open branches, one tab stop", async () => {
  render(() => <Files icons />)
  await settle()
  const tree = screen.getByRole("tree", { name: "Files" })
  expect(tree.getAttribute("aria-roledescription")).toBe("sortable tree")
  expect(outline()).toEqual(["src v", "  lib >", "  app.tsx", "docs >", "package.json", "README.md"])
  expect(row("app.tsx").getAttribute("aria-posinset")).toBe("2")
  expect(row("app.tsx").getAttribute("aria-setsize")).toBe("2")
  expect(row("README.md").getAttribute("aria-disabled")).toBe("true")
  expect(screen.getAllByRole("treeitem").filter((el) => el.getAttribute("tabindex") === "0")).toHaveLength(1)
  expect(document.getElementById(tree.getAttribute("aria-describedby")!)?.textContent).toContain("Space picks a row up")
  // Each row's level is its indent, branches have an arrow, and the icons tell folders from files.
  expect(row("app.tsx").style.getPropertyValue("--sortable-tree-depth")).toBe("1")
  expect(row("src").style.getPropertyValue("--sortable-tree-depth")).toBe("0")
  expect(!!row("src").querySelector(".sortable-tree-toggle svg")).toBe(true)
  expect(!!row("app.tsx").querySelector(".sortable-tree-toggle svg")).toBe(false)
  expect(row("README.md").querySelector(".sortable-tree-lock")).toBeTruthy()
  expect(row("app.tsx").querySelector(".sortable-tree-lock")).toBeNull()
  expect(screen.getAllByRole("treeitem").filter((el) => el.querySelector(".sortable-tree-icon")).length).toBe(6)
  expect(row("src").querySelector(".sortable-tree-icon")!.innerHTML).toBe(row("docs").querySelector(".sortable-tree-icon")!.innerHTML)
  expect(row("src").querySelector(".sortable-tree-icon")!.innerHTML).not.toBe(row("app.tsx").querySelector(".sortable-tree-icon")!.innerHTML)
})

test("Right opens a branch and goes into it; Left goes to the parent and closes it", async () => {
  render(() => <Files />)
  await settle()
  expect(document.querySelector(".sortable-tree-icon")).toBeNull()
  row("lib").focus()
  await press("ArrowRight")
  expect(row("lib").getAttribute("aria-expanded")).toBe("true")
  await press("ArrowRight")
  expect(document.activeElement).toBe(row("utils.ts"))
  expect(row("utils.ts").style.getPropertyValue("--sortable-tree-depth")).toBe("2")
  await press("ArrowLeft")
  expect(document.activeElement).toBe(row("lib"))
  await press("ArrowLeft")
  expect(row("lib").getAttribute("aria-expanded")).toBe("false")
  await press("ArrowDown", "ArrowDown")
  expect(document.activeElement).toBe(row("docs"))
})

test("Space picks a row up; Up and Down move it, Right takes it in a level, and Space drops it", async () => {
  const onMove = vi.fn()
  render(() => <Files onMove={onMove} />)
  await settle()
  row("package.json").focus()
  await press(" ", "ArrowUp")
  expect(row("package.json").hasAttribute("data-moving")).toBe(true)
  // Above docs, a level in is inside src, after app.tsx.
  await press("ArrowRight")
  expect(outline()).toEqual(["src v", "  lib >", "  app.tsx", "  package.json", "docs >", "README.md"])
  expect(row("package.json").style.getPropertyValue("--sortable-tree-depth")).toBe("1")
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
  render(() => <Files expanded={["src", "lib"]} />)
  await settle()
  row("lib").focus()
  await press(" ", "ArrowDown", " ")
  expect(outline()).toEqual(["src v", "  app.tsx", "  lib v", "    utils.ts", "docs >", "package.json", "README.md"])
  await press(" ", "ArrowUp", "Escape")
  expect(outline()).toEqual(["src v", "  app.tsx", "  lib v", "    utils.ts", "docs >", "package.json", "README.md"])
})

test("a row dropped inside an item that isn't a branch goes back, and says why", async () => {
  const onMove = vi.fn()
  render(() => <Files onMove={onMove} />)
  await settle()
  row("app.tsx").focus()
  // Below package.json and in a level: inside a file.
  await press(" ", "ArrowDown", "ArrowDown", "ArrowRight")
  expect(row("app.tsx").hasAttribute("data-invalid")).toBe(true)
  await press(" ")
  expect(onMove).not.toHaveBeenCalled()
  expect(outline()).toEqual(["src v", "  lib >", "  app.tsx", "docs >", "package.json", "README.md"])
  await waitFor(() => expect(document.body.textContent).toContain("app.tsx can't go inside package.json."))
})

test("a locked row can't be picked up, and Enter opens a branch or runs the action", async () => {
  const onAction = vi.fn()
  render(() => <Files onAction={onAction} />)
  await settle()
  row("README.md").focus()
  await press(" ")
  expect(row("README.md").hasAttribute("data-moving")).toBe(false)
  row("docs").focus()
  await press("Enter")
  expect(row("docs").getAttribute("aria-expanded")).toBe("true")
  expect(onAction).not.toHaveBeenCalled()
  row("app.tsx").focus()
  await press("Enter")
  expect(onAction).toHaveBeenCalledWith("app")
})

test("a row's own face replaces the icon and name, and sees where the row is", async () => {
  render(() => <SortableTree label="Files" defaultItems={files} defaultExpanded={["src"]} renderItem={(item, at) => <span class="face">{`${item.label} at ${at.depth}${at.branch ? " (branch)" : ""}`}</span>} />)
  await settle()
  expect([...document.querySelectorAll(".face")].map((el) => el.textContent)).toEqual(["src at 0 (branch)", "lib at 1 (branch)", "app.tsx at 1", "docs at 0 (branch)", "package.json at 0", "README.md at 0"])
  expect(document.querySelector(".sortable-tree-name")).toBeNull()
})

test("the same items sync to the same rows, so reading the tree's state settles", () => {
  // Solid syncs controlled options on each read of the state: new rows on each read never settle.
  const handle = createRoot(() => usePrimitive(sortableTree, () => ({ defaultItems: files })))
  const { rows } = handle.state
  expect(rows.map((row) => row.key)).toEqual(["src", "lib", "utils", "app", "docs", "package", "readme"])
  handle.api.writeItems(files)
  expect(handle.state.rows).toBe(rows)
})

test("an agent moves an item into a branch by name, and is told when it can't", async () => {
  const agent = createAgent()
  render(() => <Files />)
  await settle()
  const entry = (await agent.snapshot()).find((item) => item.label === "Files")
  expect(entry?.actions).toEqual(expect.arrayContaining(["moveItem", "expandItem", "collapseItem"]))
  const ok = await agent.act({ steps: [{ ref: "Files", action: "moveItem", args: ["package.json", "src", 1] }] })
  expect(ok.ok).toBe(true)
  await settle()
  expect(outline()).toEqual(["src v", "  package.json", "  lib >", "  app.tsx", "docs >", "README.md"])
  const bad = await agent.act({ steps: [{ ref: "Files", action: "moveItem", args: ["app.tsx", "README.md"] }] })
  expect(bad.error?.message).toContain("README.md can't hold other items.")
  const self = await agent.act({ steps: [{ ref: "Files", action: "moveItem", args: ["src", "lib"] }] })
  expect(self.error?.message).toContain("src can't go inside itself.")
})
