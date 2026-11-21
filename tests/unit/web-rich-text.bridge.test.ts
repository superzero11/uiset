import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/tabs"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The rich text editor as a web element (web/rich-text.html), on a page with no React: what its
// properties and attributes turn on. Typing, the menus and focus stay in the browser. Moved
// from tests/e2e/web/rich-text.spec.ts.

const editor = () => screen.getByRole("textbox", { name: "Release notes" })
const toolbar = () => screen.getByRole("toolbar", { name: "Release notes formatting" })
const notes = () => document.getElementById("notes") as HTMLElement & { uploadImage?: () => Promise<null> }
const open = () => openWebPage("rich-text.html", "rich-text-demo.ts")

// jsdom doesn't reflect contentEditable to its attribute, as browsers do.
beforeAll(() => {
  if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, "contentEditable")) return
  Object.defineProperty(HTMLElement.prototype, "contentEditable", {
    configurable: true,
    get(this: HTMLElement) {
      const value = this.getAttribute("contenteditable")
      return value === null ? "inherit" : value === "" ? "true" : value
    },
    set(this: HTMLElement, value: string) {
      if (value === "inherit") this.removeAttribute("contenteditable")
      else this.setAttribute("contenteditable", String(value))
    },
  })
})
// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("uploadImage set after the editor is on the page adds the image button", async () => {
  await open()
  expect(within(toolbar()).queryByRole("button", { name: "Insert image" })).toBeNull()
  notes().uploadImage = async () => null
  await waitFor(() => expect(within(toolbar()).getByRole("button", { name: "Insert image" })).toBeTruthy())
})

test("a read-only editor stays in the Tab order for reading", async () => {
  await open()
  notes().setAttribute("readonly", "")
  await settle()
  expect(editor().getAttribute("tabindex")).toBe("0")
  expect(editor().getAttribute("contenteditable")).toBe("false")
})
