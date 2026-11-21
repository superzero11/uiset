import { render, screen, within } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import ButtonExample from "@/src/site/examples/button"
import RadioExample from "@/src/site/examples/radio"
import { createBridge, settle } from "./bridge"

// The radio and button examples from their docs pages (src/site/examples/), driven through the
// agent bridge: a radio card chosen by the group's name, and a confirm button an agent's press
// can't arm on its own. Moved from tests/e2e/new-parts.spec.ts.

const bridge = createBridge()

test("an agent chooses a radio card's option by the group's name", async () => {
  render(
    <UISet>
      <RadioExample />
    </UISet>,
  )
  await settle()
  const radio = (name: string) => screen.getByRole("radio", { name }) as HTMLInputElement
  expect(radio("Pro").getAttribute("aria-checked") ?? String(radio("Pro").checked)).toBe("true")
  const done = await bridge.run("Plan", "setValue", "hobby")
  expect(done.ok, done.error?.message).toBe(true)
  expect(radio("Hobby").getAttribute("aria-checked") ?? String(radio("Hobby").checked)).toBe("true")
})

test("an agent's press on a confirm button waits for the person, and nothing happens meanwhile", async () => {
  const { container } = render(
    <UISet>
      <ButtonExample />
    </UISet>,
  )
  await settle()
  const area = within(container)
  const found = await bridge.agent.query({ text: "Delete project" })
  expect(Array.isArray(found) ? found[0]?.confirm : found).toBe("Deletes the Atlas project and its deploys")
  // An agent whose person hasn't answered yet.
  let answer: (ok: boolean) => void = () => {}
  const waiting = createAgent({ allow: () => new Promise<boolean>((resolve) => (answer = resolve)) })
  const pressed = waiting.act({ steps: [{ ref: "Delete project", action: "press" }] })
  await settle(800)
  expect(area.getByRole("button", { name: "Delete project" }).hasAttribute("data-armed")).toBe(false)
  expect(area.getByRole("status").textContent).toBe("")
  answer(false)
  await pressed
})
