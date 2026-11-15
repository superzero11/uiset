import { afterEach, expect, test } from "vitest"
import { returnFocus } from "@/registry/uiset/ui/uiset/focus"

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => document.body.replaceChildren())

// Safari doesn't focus a clicked button: focus goes to the nearest focusable ancestor, such
// as an app's <main tabindex="-1">. UI SDK's keepFocus reads that as focus the person moved.
test("focus resting on an ancestor goes to the element", async () => {
  document.body.innerHTML = `<main tabindex="-1"><button id="add">Add a card</button></main>`
  const main = document.querySelector("main")!
  main.focus()
  returnFocus(() => document.getElementById("add") ?? undefined)
  await flush()
  expect(document.activeElement?.id).toBe("add")
})

test("focus the person moved elsewhere stays there", async () => {
  document.body.innerHTML = `<main tabindex="-1"><button id="add">Add a card</button></main><input id="search">`
  document.getElementById("search")!.focus()
  returnFocus(() => document.getElementById("add") ?? undefined)
  await flush()
  expect(document.activeElement?.id).toBe("search")
})

test("focus that was lost goes to the element, as keepFocus does", async () => {
  document.body.innerHTML = `<button id="add">Add a card</button>`
  ;(document.activeElement as HTMLElement | null)?.blur()
  returnFocus(() => document.getElementById("add") ?? undefined)
  await flush()
  expect(document.activeElement?.id).toBe("add")
})
