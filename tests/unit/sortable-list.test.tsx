import { act, render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { checkDirection, checkServer, mount } from "@ui-sdk/core/testing"
import { expect, test } from "vitest"
import { SortableList } from "@/registry/uiset/ui/sortable-list"
import { reconcile, sortableList } from "@/registry/uiset/ui/sortable-list/sortable-list"

const keys = ["a", "b", "c", "d"]
const names: Record<string, string> = { a: "Alpha", b: "Bravo", c: "Charlie", d: "Delta" }
const markup = (order = keys) =>
  `<root aria-label="Letters">${order.map((key) => `<item value="${key}">${names[key]}</item>`).join("")}</root>`
const options = (more: object = {}) => ({ keys, itemLabel: (key: string) => names[key]!, ...more })

test("Space picks an item up, arrows move it, Space drops it, and Escape puts it back", async () => {
  const view = mount(sortableList, options(), markup())
  try {
    await view.keys("Tab", "Space", "ArrowDown", "ArrowDown", "Space")
    expect(view.state.value).toEqual(["b", "c", "a", "d"])
    expect(view.changes.at(-1)).toMatchObject({ key: "value", reason: "move-key" })
    expect(view.announced.join(" ")).toContain("Alpha")
    // Escape while it's up puts it back where it was.
    await view.keys("Space", "ArrowUp", "ArrowUp", "Escape")
    expect(view.state.value).toEqual(["b", "c", "a", "d"])
    expect(view.state.moving).toBeNull()
  } finally {
    view.unmount()
  }
})

test("arrows move focus while nothing is up, and one item holds the tab stop", async () => {
  const view = mount(sortableList, options(), markup())
  try {
    await view.keys("Tab", "ArrowDown", "ArrowDown")
    expect(document.activeElement).toBe(view.part("item", "c"))
    const tabbable = keys.filter((key) => view.part("item", key)!.getAttribute("tabindex") === "0")
    expect(tabbable).toEqual(["c"])
    expect(view.state.value).toEqual(keys)
  } finally {
    view.unmount()
  }
})

test("a locked item can't be picked up, and others move past it", async () => {
  const view = mount(sortableList, options({ locked: (key: string) => key === "b" }), markup())
  try {
    expect(view.part("item", "b")!.getAttribute("aria-disabled")).toBe("true")
    await view.keys("Tab", "ArrowDown", "Space")
    expect(view.state.moving).toBeNull()
    await view.keys("ArrowUp", "Space", "ArrowDown", "ArrowDown", "Space")
    expect(view.state.value).toEqual(["b", "c", "a", "d"])
  } finally {
    view.unmount()
  }
})

test("with multiple, Shift+Space and Shift with the arrows select, and the selection moves together", async () => {
  const view = mount(sortableList, options({ multiple: true }), markup())
  try {
    expect(view.root.getAttribute("aria-multiselectable")).toBe("true")
    await view.keys("Tab", "Shift+Space", "Shift+ArrowDown")
    expect(view.state.selected).toEqual(["a", "b"])
    expect(view.part("item", "a")!.getAttribute("aria-selected")).toBe("true")
    expect(view.part("item", "c")!.getAttribute("aria-selected")).toBe("false")
    // Picking up a selected item carries the selection.
    await view.keys("Space", "ArrowDown", "ArrowDown", "Space")
    expect(view.state.value).toEqual(["c", "d", "a", "b"])
    // Escape clears the selection.
    await view.keys("Escape")
    expect(view.state.selected).toEqual([])
  } finally {
    view.unmount()
  }
})

test("Shift+Space selects items apart and lets go of one pressed again", async () => {
  const view = mount(sortableList, options({ multiple: true }), markup())
  try {
    await view.keys("Tab", "Shift+Space", "ArrowDown", "ArrowDown", "Shift+Space")
    expect(view.state.selected).toEqual(["a", "c"])
    await view.keys("Shift+Space")
    expect(view.state.selected).toEqual(["a"])
    expect(view.state.moving).toBeNull()
  } finally {
    view.unmount()
  }
})

test("Command or Control+A selects every item that can move", async () => {
  const view = mount(sortableList, options({ multiple: true, locked: (key: string) => key === "d" }), markup())
  try {
    await view.keys("Tab", "Control+a")
    expect(view.state.selected).toEqual(["a", "b", "c"])
  } finally {
    view.unmount()
  }
})

test("without multiple, the picked-up item is the selected one, and Shift+Space doesn't pick up", async () => {
  const view = mount(sortableList, options(), markup())
  try {
    expect(view.root.getAttribute("aria-multiselectable")).toBeNull()
    await view.keys("Tab", "Shift+Space")
    expect(view.state.moving).toBeNull()
    await view.keys("Space")
    expect(view.part("item", "a")!.getAttribute("aria-selected")).toBe("true")
    expect(view.part("item", "a")!.hasAttribute("data-moving")).toBe(true)
    await view.keys("Escape")
    expect(view.part("item", "a")!.getAttribute("aria-selected")).toBe("false")
  } finally {
    view.unmount()
  }
})

test("moveItem moves by name to a place from 1, one item or several, and says why it can't", async () => {
  const view = mount(sortableList, options({ locked: (key: string) => key === "d" }), markup())
  try {
    expect(view.api.moveItem("Charlie", 1)).toBe(true)
    expect(view.state.value).toEqual(["c", "a", "b", "d"])
    expect(view.changes.at(-1)).toMatchObject({ key: "value", reason: "imperative" })
    view.api.moveItem(["a", "Bravo"], 1)
    expect(view.state.value).toEqual(["a", "b", "c", "d"])
    view.api.moveItem(["Alpha", "b"], 2)
    expect(view.state.value).toEqual(["c", "a", "b", "d"])
    expect(() => view.api.moveItem("Delta", 1)).toThrow("Delta can't be moved.")
    expect(() => view.api.moveItem("Echo", 1)).toThrow('No item "Echo"')
    expect(() => view.api.moveItem("Alpha", 0)).toThrow("position from 1")
  } finally {
    view.unmount()
  }
})

test("items that come and go keep the order people chose", () => {
  expect(reconcile(["c", "a", "b"], ["a", "b", "c", "d"])).toEqual(["c", "a", "b", "d"])
  expect(reconcile(["c", "a", "b"], ["a", "c"])).toEqual(["c", "a"])
  const same = ["b", "a"]
  expect(reconcile(same, ["a", "b"])).toBe(same)
})

test("renders on the server and works in both directions", async () => {
  checkServer(sortableList, options(), markup())
  await checkDirection(sortableList, options({ orientation: "horizontal" }), markup())
})

// Not checkPattern's listbox: there Space selects, and in a sortable list (UI SDK's own too)
// Space picks the item up. The roles, names, help and one tab stop are checked here instead.
test("SortableList is a listbox of named options, described by how to move them", () => {
  render(<SortableList label="Priorities" items={keys.map((key) => ({ value: key, label: names[key]! }))} numbered />)
  const list = screen.getByRole("listbox", { name: "Priorities" })
  expect(list.getAttribute("aria-roledescription")).toBe("sortable list")
  expect(list.getAttribute("aria-orientation")).toBe("vertical")
  const options = screen.getAllByRole("option")
  expect(options.map((el) => el.getAttribute("aria-label"))).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
  expect(options.map((el) => el.getAttribute("aria-roledescription"))).toEqual(Array(4).fill("sortable item"))
  expect(options.filter((el) => el.getAttribute("tabindex") === "0")).toHaveLength(1)
  expect(document.getElementById(list.getAttribute("aria-describedby")!)?.textContent).toContain("Space picks an item up")
})

test("an agent finds the list by its name and moves an item by its name", async () => {
  const agent = createAgent()
  render(<SortableList label="Priorities" items={keys.map((key) => ({ value: key, label: names[key]! }))} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const entry = (await agent.snapshot()).find((item) => item.label === "Priorities")
  expect(entry?.actions).toEqual(expect.arrayContaining(["moveItem", "selectItems"]))
  const result = await act(() => agent.act({ steps: [{ ref: "Priorities", action: "moveItem", args: ["Delta", 1] }] }))
  expect(result.ok).toBe(true)
  expect(screen.getAllByRole("option").map((el) => el.getAttribute("aria-label"))).toEqual(["Delta", "Alpha", "Bravo", "Charlie"])
})

test("typing a name's first letters goes to it", async () => {
  const view = mount(sortableList, options(), markup())
  try {
    await view.keys("Tab", "c")
    expect(document.activeElement).toBe(view.part("item", "c"))
    // Letters typed together are one name: "ch" is still Charlie, "cd" is nobody.
    await view.keys("h")
    expect(document.activeElement).toBe(view.part("item", "c"))
    expect(view.state.value).toEqual(keys)
  } finally {
    view.unmount()
  }
})
