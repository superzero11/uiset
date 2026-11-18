import { keepFocus } from "@ui-sdk/core"
import { afterEach, expect, test } from "vitest"

// UISet hands focus back with UI SDK's keepFocus wherever a press removes or replaces what had
// it. These hold the cases it depends on, Safari's among them.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => document.body.replaceChildren())

// Safari doesn't focus a clicked button: focus goes to the nearest focusable ancestor, such
// as an app's <main tabindex="-1">. keepFocus reads that as lost (UI SDK 0.1.0-beta.6).
test("focus resting on an ancestor goes to the element", async () => {
  document.body.innerHTML = `<main tabindex="-1"><button id="add">Add a card</button></main>`
  const main = document.querySelector("main")!
  main.focus()
  keepFocus(() => document.getElementById("add") ?? undefined)
  await flush()
  expect(document.activeElement?.id).toBe("add")
})

test("focus the person moved elsewhere stays there", async () => {
  document.body.innerHTML = `<main tabindex="-1"><button id="add">Add a card</button></main><input id="search">`
  document.getElementById("search")!.focus()
  keepFocus(() => document.getElementById("add") ?? undefined)
  await flush()
  expect(document.activeElement?.id).toBe("search")
})

test("focus that was lost goes to the element", async () => {
  document.body.innerHTML = `<button id="add">Add a card</button>`
  ;(document.activeElement as HTMLElement | null)?.blur()
  keepFocus(() => document.getElementById("add") ?? undefined)
  await flush()
  expect(document.activeElement?.id).toBe("add")
})
