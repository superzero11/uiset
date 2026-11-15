import { checkServer, mount } from "@ui-sdk/core/testing"
import { expect, test, vi } from "vitest"
import { chartPoints } from "@/registry/uiset/ui/chart/points"

const markup = `<root aria-label="Revenue by month">
  <point value="jan" aria-label="January: Revenue 10">Jan</point>
  <point value="feb" aria-label="February: Revenue 12">Feb</point>
  <point value="mar" aria-label="March: Revenue 9">Mar</point>
</root>`

test("one tab stop; arrows move between data positions and make them active", async () => {
  const onActiveChange = vi.fn()
  const view = mount(chartPoints, { onActiveChange }, markup)
  try {
    expect(view.root.getAttribute("role")).toBe("listbox")
    const jan = view.part("point", "jan")!
    expect(jan.getAttribute("role")).toBe("option")
    expect(jan.getAttribute("tabindex")).toBe("0")
    expect(view.part("point", "feb")!.getAttribute("tabindex")).toBe("-1")

    jan.focus()
    await view.keys("ArrowRight")
    expect(document.activeElement).toBe(view.part("point", "feb"))
    expect(view.state.active).toBe("feb")
    expect(onActiveChange).toHaveBeenLastCalledWith("feb")
    await view.keys("End")
    expect(document.activeElement).toBe(view.part("point", "mar"))
  } finally {
    view.unmount()
  }
})

test("Enter pins a position, Enter again or Escape unpins it", async () => {
  const onSelect = vi.fn()
  const view = mount(chartPoints, { onSelect }, markup)
  try {
    view.part("point", "feb")!.focus()
    await view.keys("Enter")
    expect(onSelect).toHaveBeenLastCalledWith("feb", { source: "keyboard", reason: "toggle" })
  } finally {
    view.unmount()
  }
  const pinned = mount(chartPoints, { onSelect, selected: "feb" }, markup)
  try {
    expect(pinned.part("point", "feb")!.getAttribute("aria-selected")).toBe("true")
    pinned.part("point", "feb")!.focus()
    await pinned.keys("Enter")
    expect(onSelect).toHaveBeenLastCalledWith(null, { source: "keyboard", reason: "toggle" })
    await pinned.keys("Escape")
    expect(onSelect).toHaveBeenLastCalledWith(null, { source: "keyboard", reason: "dismiss" })
  } finally {
    pinned.unmount()
  }
})

test("Up and Down move instead when the chart is vertical", async () => {
  const view = mount(chartPoints, { orientation: "vertical" }, markup)
  try {
    view.part("point", "jan")!.focus()
    await view.keys("ArrowDown")
    expect(document.activeElement).toBe(view.part("point", "feb"))
  } finally {
    view.unmount()
  }
})

test("renders on the server", () => {
  checkServer(chartPoints, {}, markup)
})
