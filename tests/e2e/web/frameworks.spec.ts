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

test("the search field's label and shortcut, the editor's label and the activity's source are properties too", async ({ page }) => {
  await mount(page, `<uiset-search-field id="find"></uiset-search-field><uiset-rich-text id="notes"></uiset-rich-text><uiset-agent-activity id="log"></uiset-agent-activity>`)
  const written = await page.evaluate(() => {
    const find = document.querySelector("#find") as AnyElement
    const notes = document.querySelector("#notes") as AnyElement
    const log = document.querySelector("#log") as AnyElement
    const defaults = [find.label, find.shortcut, notes.label, log.source]
    find.label = "Find a customer"
    find.shortcut = ""
    notes.label = "Release notes"
    log.source = "importer"
    return { defaults, attributes: [find.getAttribute("label"), find.getAttribute("shortcut"), notes.getAttribute("label"), log.getAttribute("source")] }
  })
  expect(written.defaults).toEqual(["Search", "/", "Text", "agent"])
  expect(written.attributes).toEqual(["Find a customer", "", "Release notes", "importer"])
  const box = page.locator("#find").getByRole("searchbox", { name: "Find a customer" })
  await expect(box).toBeVisible()
  // No shortcut: no hint, and "/" doesn't take focus.
  await expect(page.locator("#find .search-field-hint")).toBeHidden()
  await expect(box).not.toHaveAttribute("aria-keyshortcuts", "/")
  await expect(page.locator("#notes").getByRole("textbox", { name: "Release notes" })).toBeVisible()
})

test(`"false" turns a presence attribute off`, async ({ page }) => {
  await mount(
    page,
    `<uiset-data-grid id="off" label="Off" toolbar="false" selectable="false" editable="false"></uiset-data-grid>
     <uiset-data-grid id="on" label="On" toolbar selectable></uiset-data-grid>`,
  )
  await page.evaluate(async () => {
    for (const id of ["off", "on"]) {
      const grid = document.querySelector(`#${id}`) as AnyElement
      grid.getRowId = (row: { id: string }) => row.id
      grid.columns = [{ id: "name", header: "Name", value: (row: { name: string }) => row.name, editable: true }]
      grid.rows = [{ id: "a", name: "Ada" }]
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  await expect(page.locator("#on").getByRole("searchbox")).toHaveCount(1)
  await expect(page.locator("#on").getByRole("checkbox", { name: /Ada/ })).toHaveCount(1)
  await expect(page.locator("#off").getByRole("grid", { name: "Off" })).toBeVisible()
  await expect(page.locator("#off").getByRole("searchbox")).toHaveCount(0)
  await expect(page.locator("#off").getByRole("checkbox")).toHaveCount(0)
  await expect(page.locator("#off").getByRole("gridcell", { name: "Ada", exact: true })).not.toHaveAttribute("data-editable", "")
})

test(`"false" turns the root's sound and haptics off`, async ({ page }) => {
  const read = (markup: string) =>
    page.evaluate((html) => {
      const host = document.createElement("div")
      host.innerHTML = html
      document.body.append(host)
      const root = host.firstElementChild!
      const state = [root.getAttribute("data-sound"), root.getAttribute("data-haptics")]
      host.remove()
      return state
    }, markup)
  expect(await read(`<uiset-root></uiset-root>`)).toEqual(["off", "on"])
  expect(await read(`<uiset-root sound haptics></uiset-root>`)).toEqual(["on", "on"])
  expect(await read(`<uiset-root sound="true" haptics="true"></uiset-root>`)).toEqual(["on", "on"])
  expect(await read(`<uiset-root sound="false" haptics="false"></uiset-root>`)).toEqual(["off", "off"])
  expect(await read(`<uiset-root sound="off" haptics="off"></uiset-root>`)).toEqual(["off", "off"])
})

test(`"false" leaves the editor writable and the inspector without its Rename form`, async ({ page }) => {
  await mount(
    page,
    `<uiset-rich-text id="open" label="Open" readonly="false"></uiset-rich-text>
     <uiset-rich-text id="shut" label="Shut" readonly></uiset-rich-text>
     <uiset-canvas id="flow" label="Flow"></uiset-canvas>
     <uiset-canvas-inspector id="plain" for="flow" renamable="false"></uiset-canvas-inspector>
     <uiset-canvas-inspector id="named" for="flow" renamable></uiset-canvas-inspector>`,
  )
  await expect(page.locator("#shut [data-readonly]")).toHaveCount(1)
  await expect(page.locator("#open [data-readonly]")).toHaveCount(0)
  await expect(page.locator("#open").getByRole("textbox", { name: "Open" })).toHaveAttribute("contenteditable", "true")

  await page.evaluate(async () => {
    const flow = document.querySelector("#flow") as AnyElement
    flow.nodes = [{ id: "a", title: "Only node", x: 40, y: 40 }]
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  await page.locator("#flow").getByRole("option", { name: /^Only node/ }).click()
  await expect(page.locator("#named").getByRole("form", { name: "Rename Only node" }).getByRole("button", { name: "Rename" })).toBeVisible()
  await expect(page.locator("#plain").getByText("Only node")).toBeVisible()
  await expect(page.locator("#plain").getByRole("form")).toHaveCount(0)
})

test("a list handed to a property as text is read like the attribute", async ({ page }) => {
  await mount(page, `<uiset-sparkline id="spark" label="Signups"></uiset-sparkline><uiset-stat id="stat" label="Revenue" value="$48,200"></uiset-stat>`)
  await page.evaluate(async () => {
    ;(document.querySelector("#spark") as AnyElement).values = "4,6,,8"
    ;(document.querySelector("#stat") as AnyElement).trend = "31,35,33,40,48"
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  // The name says where the values went, so it proves they were read as numbers, gap included.
  await expect(page.locator("#spark").getByRole("img")).toHaveAccessibleName(/from 4 to 8/)
  expect(await page.evaluate(() => (document.querySelector("#spark") as AnyElement).values)).toEqual([4, 6, null, 8])
  await expect(page.locator("#stat").getByRole("img")).toHaveAccessibleName(/Revenue trend: from 31 to 48/)
  expect(await page.evaluate(() => (document.querySelector("#stat") as AnyElement).trend)).toEqual([31, 35, 33, 40, 48])
  // An array still works, and replaces the text.
  await page.evaluate(() => void ((document.querySelector("#spark") as AnyElement).values = [1, 2, 3]))
  await expect(page.locator("#spark").getByRole("img")).toHaveAccessibleName(/from 1 to 3/)
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

test("children added to the app shell after it mounts go where the first ones went", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(String(error)))
  await mount(
    page,
    `<uiset-app-shell id="shell" label="Main navigation" content="div"><a data-part="brand" href="#">Acme</a><nav data-part="sidebar" class="sidebar-nav" aria-label="Sections"><a class="sidebar-link" href="#a"><span class="sidebar-label">Overview</span></a></nav><p id="first">First</p><!--marker--></uiset-app-shell>`,
  )
  const result = await page.evaluate(() => {
    const shell = document.querySelector("#shell") as HTMLElement
    const content = shell.querySelector(".app-content")!
    const make = (id: string, part?: string) => {
      const el = document.createElement("p")
      el.id = id
      el.textContent = id
      if (part) el.dataset.part = part
      return el
    }
    // A framework's marker is a comment among the children; it went into the content too.
    const marker = [...content.childNodes].find((node) => node.nodeType === Node.COMMENT_NODE)!
    const steps: string[] = []
    try {
      shell.appendChild(make("appended"))
      steps.push("appendChild")
      // Vue: insert before the marker it left, which is no longer a direct child.
      shell.insertBefore(make("inserted"), marker)
      steps.push("insertBefore")
      shell.append(make("via-append"))
      steps.push("append")
      shell.appendChild(make("in-header", "header"))
      steps.push("header")
    } catch (error) {
      steps.push(`threw: ${String(error)}`)
    }
    return { steps, marker: !!marker }
  })
  expect(result.marker).toBe(true)
  expect(result.steps).toEqual(["appendChild", "insertBefore", "append", "header"])
  const content = page.locator("#shell .app-content")
  await expect(content.locator("p")).toHaveText(["First", "inserted", "appended", "via-append"])
  await expect(page.locator("#shell .app-header-content #in-header")).toBeVisible()
  // The shell still has one child of its own: nothing was left outside the layout.
  expect(await page.locator("#shell").evaluate((el) => el.children.length)).toBe(1)

  // And a framework removes a child by asking the element it gave it to.
  const removed = await page.evaluate(() => {
    const shell = document.querySelector("#shell") as HTMLElement
    try {
      shell.removeChild(shell.querySelector("#inserted")!)
      return "removed"
    } catch (error) {
      return `threw: ${String(error)}`
    }
  })
  expect(removed).toBe("removed")
  await expect(content.locator("p")).toHaveText(["First", "appended", "via-append"])
  expect(errors).toEqual([])
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
    const $ = (id: string) => document.getElementById(id) as AnyElement
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
  await expect(page.locator("#stepper [aria-current=step]")).toContainText("Details")
  await expect(page.locator("#knob")).toHaveAttribute("aria-valuenow", "40")
  await expect(page.locator("#threads [aria-current=page]")).toContainText("First chat")
  await expect(page.getByRole("textbox", { name: "Code" })).toHaveValue("let a = 1")
  for (const id of ["stepper", "knob", "bay", "threads", "picker", "tree", "tabs", "code", "notes"]) expect(await heard(id), id).toEqual([])

  // Read back: a person's or agent's change, once it's in.
  await page.locator("#stepper").getByRole("button", { name: /Account/ }).click()
  expect(await heard("stepper")).toEqual(["account"])
  await page.locator("#knob").focus()
  await page.keyboard.press("ArrowUp")
  // The knob was given its value, and still moves: the value is live, as a slider's is.
  await expect(page.locator("#knob")).toHaveAttribute("aria-valuenow", "41")
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
  await page.locator("#knob").focus()
  await page.keyboard.press("ArrowUp")
  await expect(page.locator("#knob")).toHaveAttribute("aria-valuenow", "41")
  expect(await heard("knob")).toEqual([41])
})

// Hydration: a framework hydrating server HTML expects to find the HTML it rendered. Under
// `data-uiset-hydrating` the elements are defined (the framework sets data as properties)
// but wait to draw; removing the attribute lets them.
test("under data-uiset-hydrating, elements take their data but draw only once it goes", async ({ page }) => {
  const server = `<div id="app" data-uiset-hydrating><uiset-app-shell id="shell" label="Main navigation"><a data-part="brand" href="#">Acme</a><main id="content"><uiset-stepper id="stepper" label="Setup" value="details"></uiset-stepper><uiset-patch-bay id="bay" aria-label="Bay"><uiset-patch-bay-jack value="a:out"><button aria-label="A out"></button></uiset-patch-bay-jack><uiset-patch-bay-jack value="b:in"><button aria-label="B in"></button></uiset-patch-bay-jack></uiset-patch-bay><uiset-data-grid id="grid" label="Orders" height="10rem"></uiset-data-grid><uiset-stepper id="dropped" label="Removed"></uiset-stepper></main></uiset-app-shell></div>`
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(String(error)))
  const held = await page.evaluate(async (markup) => {
    document.querySelector("uiset-root")!.insertAdjacentHTML("beforeend", markup)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const $ = (id: string) => document.getElementById(id) as AnyElement
    // What a framework does while it hydrates: properties, found because the elements are defined.
    const found = ["steps", "rows", "columns", "value"].map((name) => name in ($(name === "value" ? "bay" : name === "steps" ? "stepper" : "grid") as object))
    $("stepper").steps = [
      { value: "account", label: "Account" },
      { value: "details", label: "Details" },
    ]
    $("bay").value = [{ from: "a:out", to: "b:in" }]
    $("grid").getRowId = (row: { id: string }) => row.id
    $("grid").columns = [{ id: "name", header: "Name", value: (row: { name: string }) => row.name }]
    $("grid").rows = [{ id: "1", name: "Ada" }]
    $("dropped").remove()
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    // The tree a framework hydrates against: elements and text, in order. (UI SDK's parts set
    // their own attributes, like a jack's role; a framework doesn't compare those.)
    const shape = (node: Node): string =>
      node.nodeType === Node.TEXT_NODE ? node.textContent! : `<${(node as Element).localName}>${[...node.childNodes].map(shape).join("")}</>`
    return { found, shape: shape(document.getElementById("app")!) }
  }, server)
  expect(held.found).toEqual([true, true, true, true])
  // Nothing drew: the tree is the server's, less the element taken out.
  expect(held.shape).toBe(
    "<div><uiset-app-shell><a>Acme</><main><uiset-stepper></><uiset-patch-bay><uiset-patch-bay-jack><button></></><uiset-patch-bay-jack><button></></></><uiset-data-grid></></></></>",
  )

  await page.evaluate(() => document.getElementById("app")!.removeAttribute("data-uiset-hydrating"))
  await expect(page.locator("#shell .app-content #content")).toBeAttached()
  await expect(page.locator("#stepper [aria-current=step]")).toContainText("Details")
  await expect(page.locator("#grid").getByRole("gridcell", { name: "Ada" })).toBeVisible()
  await expect(page.locator("#bay svg path")).toHaveCount(1)
  expect(errors).toEqual([])
})
