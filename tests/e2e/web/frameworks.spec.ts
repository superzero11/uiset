import { expect, test } from "@playwright/test"

// What frameworks do to custom elements, done by hand on a page with no framework: Vue sets
// a property when it finds a member by an attribute's name, both Vue and Svelte write
// "false" for a false binding, either may hand an attribute's text to a property, and all of
// them add children after an element has mounted.

type AnyElement = HTMLElement & Record<string, unknown>

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("uiset-root").first()).toHaveAttribute("data-uiset", "")
})

/** Adds elements to the page's root from HTML, and waits a frame for them to draw. */
const mount = (page: import("@playwright/test").Page, html: string) =>
  page.evaluate(async (markup) => {
    const host = document.createElement("div")
    host.id = "probe"
    host.innerHTML = markup
    document.querySelector("uiset-root")!.append(host)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }, html)

test("the grid's label, locale, selectable and editable can be set as properties", async ({ page }) => {
  await mount(page, `<uiset-data-grid id="grid"></uiset-data-grid>`)
  const state = await page.evaluate(async () => {
    const grid = document.querySelector("#grid") as AnyElement
    const found = ["label", "locale", "selectable", "editable"].map((name) => name in grid)
    // What Vue does for each attribute once it has found a member of that name.
    grid.label = "Orders"
    grid.locale = "de-DE"
    grid.selectable = ""
    grid.editable = true
    grid.getRowId = (row: { id: string }) => row.id
    grid.columns = [
      { id: "name", header: "Name", value: (row: { name: string }) => row.name, editable: true },
      { id: "total", header: "Total", type: "number", value: (row: { total: number }) => row.total, editable: true },
    ]
    grid.rows = [
      { id: "a", name: "Ada", total: 1234.5 },
      { id: "b", name: "Grace", total: 20 },
    ]
    grid.addEventListener("celledit", (event) => ((window as unknown as { edited: unknown }).edited = (event as CustomEvent<{ value: unknown }>).detail.value))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return {
      found,
      attributes: ["label", "locale", "selectable", "editable"].map((name) => grid.getAttribute(name)),
      read: [grid.label, grid.locale, grid.selectable, grid.editable],
    }
  })
  expect(state.found).toEqual([true, true, true, true])
  expect(state.attributes).toEqual(["Orders", "de-DE", "", ""])
  expect(state.read).toEqual(["Orders", "de-DE", true, true])
  const grid = page.getByRole("grid", { name: "Orders" })
  await expect(grid).toBeVisible()
  // Rows drew (setting `editable` used to throw and leave the grid empty), with checkboxes
  // and editable cells.
  await expect(grid.getByRole("row")).toHaveCount(3)
  await expect(grid.getByRole("checkbox", { name: /Ada/ })).toHaveCount(1)
  await expect(grid.getByRole("gridcell", { name: "Ada", exact: true })).toHaveAttribute("data-editable", "")
  // The locale reached it: a number typed the German way is read as that number.
  await grid.getByRole("gridcell", { name: "1234.5" }).dblclick()
  await page.keyboard.press("ControlOrMeta+A")
  await page.keyboard.type("2.000,5")
  await page.keyboard.press("Enter")
  await expect.poll(() => page.evaluate(() => (window as unknown as { edited: unknown }).edited)).toBe(2000.5)

  // And off again, as a framework would write it.
  await page.evaluate(() => {
    const grid = document.querySelector("#grid") as AnyElement
    grid.selectable = false
    grid.editable = false
  })
  await expect(grid.getByRole("checkbox")).toHaveCount(0)
  await expect(grid.getByRole("gridcell", { name: "Ada", exact: true })).not.toHaveAttribute("data-editable", "")
  expect(await page.evaluate(() => (document.querySelector("#grid") as AnyElement).hasAttribute("selectable"))).toBe(false)
})

test("Clear on the search field fires input, once, so two-way bindings follow it", async ({ page }) => {
  const field = page.locator("#search")
  const box = page.getByRole("searchbox", { name: "Search projects" })
  await box.fill("atlas")
  await field.evaluate((el) => {
    const seen: string[] = []
    // What Vue's v-model listens for on the element, reading the field's value.
    el.addEventListener("input", (event) => seen.push(`input:${(event.target as HTMLInputElement).value}`))
    el.addEventListener("valuechange", (event) => seen.push(`valuechange:${(event as CustomEvent<{ value: string }>).detail.value}`))
    ;(window as unknown as { heard: string[] }).heard = seen
  })
  await page.getByRole("button", { name: "Clear search projects" }).click()
  await expect(box).toHaveValue("")
  await expect(box).toBeFocused()
  // Each once: the field's own listener answers the input with valuechange before it bubbles.
  expect(await page.evaluate(() => (window as unknown as { heard: string[] }).heard)).toEqual(["valuechange:", "input:"])
})

// Vue's v-model on a custom element works as on a text field: it sets `value`, and on `input`
// it reads `value` back. Each element with a value a person changes keeps that bargain.
test("v-model: each element takes `value` and fires `input` once a change is in", async ({ page }) => {
  await mount(
    page,
    `<uiset-stepper id="stepper" label="Setup"></uiset-stepper>
    <span id="level">Level</span>
    <uiset-knob id="knob" aria-labelledby="level"><uiset-knob-indicator></uiset-knob-indicator><uiset-knob-value></uiset-knob-value></uiset-knob>
    <uiset-patch-bay id="bay" aria-label="Bay"><uiset-patch-bay-jack value="a:out"><button aria-label="A out"></button></uiset-patch-bay-jack><uiset-patch-bay-jack value="b:in"><button aria-label="B in"></button></uiset-patch-bay-jack></uiset-patch-bay>
    <uiset-chat-threads id="threads" label="Chats"></uiset-chat-threads>
    <uiset-chat-model-picker id="picker" label="Model"></uiset-chat-model-picker>
    <uiset-chat-composer id="composer" label="Message"></uiset-chat-composer>
    <uiset-file-tree id="tree" label="Files" default-expanded="src"></uiset-file-tree>
    <uiset-editor-tabs id="tabs"></uiset-editor-tabs>
    <uiset-code-editor id="code" label="Code" path="a.ts"></uiset-code-editor>
    <uiset-rich-text id="notes" label="Notes"></uiset-rich-text>`,
  )
  await page.evaluate(async () => {
    // The index page has its own #stepper: look only in what this test mounted.
    const $ = (id: string) => document.querySelector(`#probe #${id}`) as AnyElement
    $("stepper").steps = [
      { value: "account", label: "Account" },
      { value: "details", label: "Details" },
    ]
    $("threads").threads = [
      { id: "t1", title: "First chat" },
      { id: "t2", title: "Second chat" },
    ]
    $("picker").models = [
      { value: "fast", label: "Fast" },
      { value: "balanced", label: "Balanced" },
    ]
    $("tree").paths = ["src/a.ts", "src/b.ts"]
    $("tabs").files = [{ path: "src/a.ts" }, { path: "src/b.ts" }]
    // What v-model does: write the state in, and read `value` back on every `input`.
    const state: Record<string, unknown> = { stepper: "details", knob: 40, bay: [], threads: "t1", picker: "fast", composer: "", tree: null, tabs: "src/a.ts", code: "let a = 1", notes: "Hello" }
    const heard: Record<string, unknown[]> = {}
    for (const [id, value] of Object.entries(state)) {
      const el = $(id)
      el.value = value
      heard[id] = []
      el.addEventListener("input", () => heard[id]!.push(el.value))
    }
    ;(window as unknown as { heard: typeof heard }).heard = heard
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  const heard = async (id: string) => (await page.evaluate(() => (window as unknown as { heard: Record<string, unknown[]> }).heard))[id]!
  const last = async (id: string) => (await heard(id)).at(-1)

  // Written in: each element shows the state it was given, and hearing it fired nothing.
  await expect(page.locator("#probe #stepper [aria-current=step]")).toContainText("Details")
  await expect(page.locator("#probe #knob")).toHaveAttribute("aria-valuenow", "40")
  await expect(page.locator("#probe #threads [aria-current=page]")).toContainText("First chat")
  await expect(page.getByRole("textbox", { name: "Code" })).toHaveValue("let a = 1")
  for (const id of ["stepper", "knob", "bay", "threads", "picker", "tree", "tabs", "code", "notes"]) expect(await heard(id), id).toEqual([])

  // Read back: a person's or agent's change, once it's in.
  await page.locator("#probe #stepper").getByRole("button", { name: /Account/ }).click()
  expect(await heard("stepper")).toEqual(["account"])
  await page.locator("#probe #knob").focus()
  await page.keyboard.press("ArrowUp")
  // The knob was given its value, and still moves: the value is live, as a slider's is.
  await expect(page.locator("#probe #knob")).toHaveAttribute("aria-valuenow", "41")
  await expect.poll(() => heard("knob")).toEqual([41])
  await page.evaluate(() => (document.getElementById("bay") as AnyElement & { api: { plug: (a: string, b: string) => void } }).api.plug("a:out", "b:in"))
  await expect.poll(() => heard("bay")).toEqual([[{ from: "a:out", to: "b:in" }]])
  await page.getByRole("button", { name: "Second chat" }).click()
  expect(await heard("threads")).toEqual(["t2"])
  await page.getByRole("combobox", { name: "Model" }).click()
  await page.getByRole("option", { name: "Balanced" }).click()
  await expect.poll(() => heard("picker")).toEqual(["balanced"])
  await page.getByRole("textbox", { name: "Message" }).pressSequentially("Hi")
  expect(await heard("composer")).toEqual(["H", "Hi"])
  await page.getByRole("treeitem", { name: /b\.ts/ }).click()
  expect(await last("tree")).toBe("src/b.ts")
  await page.getByRole("tab", { name: /b\.ts/ }).click()
  expect(await heard("tabs")).toEqual(["src/b.ts"])
  const code = page.getByRole("textbox", { name: "Code" })
  await code.click()
  await code.press("End")
  await code.press("0")
  expect(await last("code")).toBe("let a = 10")
  // The editor's own undo is no keystroke the field reports; the element reports it.
  await code.press("ControlOrMeta+z")
  await expect(code).toHaveValue("let a = 1")
  expect(await last("code")).toBe("let a = 1")
  const notes = page.getByRole("textbox", { name: "Notes", exact: true })
  await notes.click()
  await notes.press("End")
  await notes.pressSequentially(" world")
  expect(String(await last("notes")).trim()).toBe("Hello world")

  // A refused change fires nothing, and the value stays.
  await page.evaluate(() => document.getElementById("knob")!.addEventListener("valuechange", (event) => event.preventDefault()))
  await page.locator("#probe #knob").focus()
  await page.keyboard.press("ArrowUp")
  await expect(page.locator("#probe #knob")).toHaveAttribute("aria-valuenow", "41")
  expect(await heard("knob")).toEqual([41])
})
