import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import SchemaFormExample from "@/src/site/examples/schema-form"
import { createBridge, settle } from "./bridge"

// The gallery's schema form (src/site/examples/schema-form.tsx), driven through the agent
// bridge: an agent filling it by label, its press on Send waiting for the person, and its
// problems shown under the fields. Moved from tests/e2e/schema-form.spec.ts.

const bridge = createBridge()
const form = () => screen.getByRole("form", { name: "Invite a teammate" })

beforeEach(async () => {
  render(
    <UISet>
      <SchemaFormExample />
    </UISet>,
  )
  await settle()
})

test("an agent fills it by label; its press on Send waits for the person, who sends it", async () => {
  const filled = await bridge.agent.act({
    steps: [
      { ref: "Invite a teammate", action: "fill", args: [{ Email: "grace@example.com", Role: "Admin", seats: "3", "Email me when they join": "no" }] },
      { ref: "Invite a teammate", action: "goTo", args: [3] },
    ],
  })
  expect(filled.ok, filled.error?.message).toBe(true)
  await settle()
  const access = within(form()).getByRole("region", { name: "Access" })
  expect(access.textContent).toContain("Admin")
  expect(access.textContent).toContain("3")
  const found = await bridge.agent.query({ text: "Send invite" })
  expect(Array.isArray(found) ? found[0]?.confirm : found).toBe("Sends an invite email to the address given")

  // An agent whose person hasn't answered yet: its press waits, and nothing is sent meanwhile.
  let answer: (ok: boolean) => void = () => {}
  const waiting = createAgent({ allow: () => new Promise<boolean>((resolve) => (answer = resolve)) })
  const pressed = waiting.act({ steps: [{ ref: "Send invite", action: "press" }] })
  await settle(800)
  expect(form().getAttribute("data-status")).toBe("idle")
  await userEvent.click(within(form()).getByRole("button", { name: "Send invite" }))
  await waitFor(() => expect(form().textContent).toContain("Invite sent."))
  answer(false)
  await pressed
})

test("an agent's fill with problems shows them under the fields, and tells the agent", async () => {
  const result = await bridge.run("Invite a teammate", "fill", { email: "grace@", seats: 99 })
  expect(result.ok).toBe(false)
  expect(result.error?.message).toContain("Email: Enter an email address, like name@example.com.")
  expect(result.error?.message).toContain("Seats is at most 50.")
  expect(within(form()).getByRole("textbox", { name: "Email" }).getAttribute("aria-invalid")).toBe("true")
})
