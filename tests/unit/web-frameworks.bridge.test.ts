import { waitFor, within } from "@testing-library/react"
import { createAgent } from "@ui-sdk/web/agent"
import { afterEach, beforeAll, expect, test } from "vitest"
import { createBridge, settle } from "./bridge"

// What frameworks do to custom elements, done by hand in jsdom: Vue sets a property when it
// finds a member by an attribute's name, both Vue and Svelte write "false" for a false binding,
// either may hand an attribute's text to a property, and all of them add children after an
// element has mounted. Moved from tests/e2e/web/frameworks.spec.ts, which used the web build's
// home page for its <uiset-root>; here the root is on its own, so nothing on that page (its
// own stepper, its "/" search) is mistaken for what a test mounts.

type AnyElement = HTMLElement & Record<string, unknown>
const $ = (selector: string) => document.querySelector(selector) as AnyElement
const shown = (el: Element | null) => !!el && !(el as HTMLElement).closest("[hidden]") && (el as HTMLElement).style.display !== "none"

/** Adds elements to the page's root from HTML, and lets them draw. */
async function mount(html: string) {
  const host = document.createElement("div")
  host.id = "probe"
  host.innerHTML = html
  document.querySelector("uiset-root")!.append(host)
  await settle()
  return host
}

/** A page with UISet's root and nothing else, and a bridge to it. */
async function openRoot() {
  await import("../../web/src/uiset")
  document.body.innerHTML = `<uiset-root skin="base" id="root"></uiset-root>`
  await settle()
  return createBridge(createAgent)
}

// The elements' modules load once per file, and the first load can take a while.
beforeAll(() => import("../../web/src/uiset"), 60_000)

beforeAll(() => {
  // jsdom has no matchMedia: the app shell asks it whether the screen is narrow.
  window.matchMedia ??= (query: string) =>
    ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList
})

afterEach(() => {
  document.body.innerHTML = ""
})

test("the search field's label and shortcut, the editor's label and the activity's source are properties too", async () => {
  await openRoot()
  await mount(`<uiset-search-field id="find"></uiset-search-field><uiset-rich-text id="notes"></uiset-rich-text><uiset-agent-activity id="log"></uiset-agent-activity>`)
  const [find, notes, log] = [$("#find"), $("#notes"), $("#log")]
  expect([find.label, find.shortcut, notes.label, log.source]).toEqual(["Search", "/", "Text", "agent"])
  find.label = "Find a customer"
  find.shortcut = ""
  notes.label = "Release notes"
  log.source = "importer"
  expect([find.getAttribute("label"), find.getAttribute("shortcut"), notes.getAttribute("label"), log.getAttribute("source")]).toEqual(["Find a customer", "", "Release notes", "importer"])
  await settle()
  const box = within(find).getByRole("searchbox", { name: "Find a customer" })
  // No shortcut: no hint, and "/" doesn't take focus.
  expect(shown(find.querySelector(".search-field-hint"))).toBe(false)
  expect(box.getAttribute("aria-keyshortcuts")).not.toBe("/")
  within(notes).getByRole("textbox", { name: "Release notes" })
})

test(`"false" turns a presence attribute off`, async () => {
  await openRoot()
  await mount(
    `<uiset-data-grid id="off" label="Off" toolbar="false" selectable="false" editable="false"></uiset-data-grid>
     <uiset-data-grid id="on" label="On" toolbar selectable></uiset-data-grid>`,
  )
  for (const id of ["off", "on"]) {
    const grid = $(`#${id}`)
    grid.getRowId = (row: { id: string }) => row.id
    grid.columns = [{ id: "name", header: "Name", value: (row: { name: string }) => row.name, editable: true }]
    grid.rows = [{ id: "a", name: "Ada" }]
  }
  await settle()
  const [on, off] = [$("#on"), $("#off")]
  await waitFor(() => expect(within(on).getAllByRole("searchbox")).toHaveLength(1))
  expect(within(on).getAllByRole("checkbox", { name: /Ada/ })).toHaveLength(1)
  within(off).getByRole("grid", { name: "Off" })
  expect(within(off).queryAllByRole("searchbox")).toHaveLength(0)
  expect(within(off).queryAllByRole("checkbox")).toHaveLength(0)
  expect(within(off).getByRole("gridcell", { name: "Ada" }).hasAttribute("data-editable")).toBe(false)
})

test(`"false" turns the root's sound and haptics off`, async () => {
  await openRoot()
  const read = (html: string) => {
    const host = document.createElement("div")
    host.innerHTML = html
    document.body.append(host)
    const root = host.firstElementChild!
    const state = [root.getAttribute("data-sound"), root.getAttribute("data-haptics")]
    host.remove()
    return state
  }
  expect(read(`<uiset-root></uiset-root>`)).toEqual(["off", "on"])
  expect(read(`<uiset-root sound haptics></uiset-root>`)).toEqual(["on", "on"])
  expect(read(`<uiset-root sound="true" haptics="true"></uiset-root>`)).toEqual(["on", "on"])
  expect(read(`<uiset-root sound="false" haptics="false"></uiset-root>`)).toEqual(["off", "off"])
  expect(read(`<uiset-root sound="off" haptics="off"></uiset-root>`)).toEqual(["off", "off"])
})

test(`"false" leaves the editor writable and the inspector without its Rename form`, async () => {
  const bridge = await openRoot()
  await mount(
    `<uiset-rich-text id="open" label="Open" readonly="false"></uiset-rich-text>
     <uiset-rich-text id="shut" label="Shut" readonly></uiset-rich-text>
     <uiset-canvas id="flow" label="Flow"></uiset-canvas>
     <uiset-canvas-inspector id="plain" for="flow" renamable="false"></uiset-canvas-inspector>
     <uiset-canvas-inspector id="named" for="flow" renamable></uiset-canvas-inspector>`,
  )
  expect($("#shut").querySelectorAll("[data-readonly]")).toHaveLength(1)
  expect($("#open").querySelectorAll("[data-readonly]")).toHaveLength(0)
  // jsdom keeps contentEditable as a property; a browser writes the attribute too.
  expect(within($("#open")).getByRole("textbox", { name: "Open" }).contentEditable).toBe("true")

  $("#flow").nodes = [{ id: "a", title: "Only node", x: 40, y: 40 }]
  await settle()
  // A person clicks the node; an agent selects it by name.
  const selected = await bridge.run("Flow", "select", "Only node")
  expect(selected.ok, selected.error?.message).toBe(true)
  await waitFor(() => within(within($("#named")).getByRole("form", { name: "Rename Only node" })).getByRole("button", { name: "Rename" }))
  expect($("#plain").textContent).toContain("Only node")
  expect(within($("#plain")).queryAllByRole("form")).toHaveLength(0)
})

test("a list handed to a property as text is read like the attribute", async () => {
  await openRoot()
  await mount(`<uiset-sparkline id="spark" label="Signups"></uiset-sparkline><uiset-stat id="stat" label="Revenue" value="$48,200"></uiset-stat>`)
  $("#spark").values = "4,6,,8"
  $("#stat").trend = "31,35,33,40,48"
  await settle()
  // The name says where the values went, so it proves they were read as numbers, gap included.
  within($("#spark")).getByRole("img", { name: /from 4 to 8/ })
  expect($("#spark").values).toEqual([4, 6, null, 8])
  within($("#stat")).getByRole("img", { name: /Revenue trend: from 31 to 48/ })
  expect($("#stat").trend).toEqual([31, 35, 33, 40, 48])
  // An array still works, and replaces the text.
  $("#spark").values = [1, 2, 3]
  await waitFor(() => within($("#spark")).getByRole("img", { name: /from 1 to 3/ }))
})

test("children added to the app shell after it mounts go where the first ones went", async () => {
  await openRoot()
  await mount(
    `<uiset-app-shell id="shell" label="Main navigation" content="div"><a data-part="brand" href="#">Acme</a><nav data-part="sidebar" class="sidebar-nav" aria-label="Sections"><a class="sidebar-link" href="#a"><span class="sidebar-label">Overview</span></a></nav><p id="first">First</p><!--marker--></uiset-app-shell>`,
  )
  const shell = $("#shell")
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
  expect(marker).toBeDefined()
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
  expect(steps).toEqual(["appendChild", "insertBefore", "append", "header"])
  await settle()
  expect([...content.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["First", "inserted", "appended", "via-append"])
  expect(shell.querySelector(".app-header-content #in-header")).not.toBeNull()
  // The shell still has one child of its own: nothing was left outside the layout.
  expect(shell.children).toHaveLength(1)

  // And a framework removes a child by asking the element it gave it to.
  let removed = "removed"
  try {
    shell.removeChild(shell.querySelector("#inserted")!)
  } catch (error) {
    removed = `threw: ${String(error)}`
  }
  expect(removed).toBe("removed")
  expect([...content.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["First", "appended", "via-append"])
})

// Hydration: a framework hydrating server HTML expects to find the HTML it rendered. Under
// `data-uiset-hydrating` the elements are defined (the framework sets data as properties)
// but wait to draw; removing the attribute lets them.
test("under data-uiset-hydrating, elements take their data but draw only once it goes", async () => {
  await openRoot()
  const server = `<div id="app" data-uiset-hydrating><uiset-app-shell id="shell" label="Main navigation"><a data-part="brand" href="#">Acme</a><main id="content"><uiset-stepper id="stepper" label="Setup" value="details"></uiset-stepper><uiset-patch-bay id="bay" aria-label="Bay"><uiset-patch-bay-jack value="a:out"><button aria-label="A out"></button></uiset-patch-bay-jack><uiset-patch-bay-jack value="b:in"><button aria-label="B in"></button></uiset-patch-bay-jack></uiset-patch-bay><uiset-data-grid id="grid" label="Orders" height="10rem"></uiset-data-grid><uiset-stepper id="dropped" label="Removed"></uiset-stepper></main></uiset-app-shell></div>`
  document.querySelector("uiset-root")!.insertAdjacentHTML("beforeend", server)
  await settle()
  const app = $("#app")
  const in$ = (id: string) => app.querySelector(`#${id}`) as AnyElement
  // What a framework does while it hydrates: properties, found because the elements are defined.
  expect(["steps", "rows", "columns", "value"].map((name) => name in in$(name === "value" ? "bay" : name === "steps" ? "stepper" : "grid"))).toEqual([true, true, true, true])
  in$("stepper").steps = [
    { value: "account", label: "Account" },
    { value: "details", label: "Details" },
  ]
  in$("bay").value = [{ from: "a:out", to: "b:in" }]
  in$("grid").getRowId = (row: { id: string }) => row.id
  in$("grid").columns = [{ id: "name", header: "Name", value: (row: { name: string }) => row.name }]
  in$("grid").rows = [{ id: "1", name: "Ada" }]
  in$("dropped").remove()
  await settle()
  // The tree a framework hydrates against: elements and text, in order. (UI SDK's parts set
  // their own attributes, like a jack's role; a framework doesn't compare those.)
  const shape = (node: Node): string =>
    node.nodeType === Node.TEXT_NODE ? node.textContent! : `<${(node as Element).localName}>${[...node.childNodes].map(shape).join("")}</>`
  // Nothing drew: the tree is the server's, less the element taken out.
  expect(shape(app)).toBe(
    "<div><uiset-app-shell><a>Acme</><main><uiset-stepper></><uiset-patch-bay><uiset-patch-bay-jack><button></></><uiset-patch-bay-jack><button></></></><uiset-data-grid></></></></>",
  )

  app.removeAttribute("data-uiset-hydrating")
  await waitFor(() => expect(app.querySelector("#shell .app-content #content")).not.toBeNull())
  await waitFor(() => expect(in$("stepper").querySelector("[aria-current=step]")?.textContent).toContain("Details"))
  await waitFor(() => within(in$("grid")).getByRole("gridcell", { name: "Ada" }))
  await waitFor(() => expect(in$("bay").querySelectorAll("svg path")).toHaveLength(1))
})
