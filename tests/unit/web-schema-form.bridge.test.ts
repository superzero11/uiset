import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { createBridge, settle } from "./bridge"
import { openWebPage } from "./web-page"

// <uiset-schema-form> on the Content page (web/content.html), driven through the web agent
// bridge: a person through its steps, an agent filling it while the person approves the send,
// every kind of control, and what a framework does to it. Moved from
// tests/e2e/web/schema-form.spec.ts.

type FormElement = HTMLElement & { value: Record<string, unknown>; form?: unknown }
type Bridge = ReturnType<typeof createBridge>
const invite = () => document.getElementById("invite") as FormElement
const form = (name = "Invite a teammate") => screen.getByRole("form", { name })
const region = (name: string) => within(form()).getByRole("region", { name })

/** A step on the component of this kind with this name: the form's steps share names with its fields ("Message"). */
async function on(bridge: Bridge, component: string, label: string, action: string, ...args: unknown[]) {
  const target = bridge.agent.snapshot().find((entry) => !entry.offPage && entry.component === component && entry.label === label)
  if (!target) throw new Error(`No ${component} named ${label}`)
  const result = await bridge.agent.act({ steps: [{ ref: target.ref, action, args }] })
  await settle()
  expect(result.ok, result.error?.message).toBe(true)
}
const next = (bridge: Bridge) => bridge.press("Next")

// The elements' modules load once per file, and the first load can take a while.
beforeAll(async () => {
  await import("@ui-sdk/web/button")
  await import("../../web/src/uiset")
}, 60_000)

afterEach(() => {
  document.body.innerHTML = ""
})

test("each control sets its field: a radio, the number's buttons, a date, a text area and a switch", async () => {
  const bridge = await openWebPage("content.html", "content-demo.ts")
  await on(bridge, "input", "Email", "setValue", "grace@example.com")
  await next(bridge)
  await on(bridge, "radio", "Role", "setValue", "Admin")
  await on(bridge, "number-input", "Seats", "increment")
  await on(bridge, "number-input", "Seats", "increment")
  expect((within(form()).getByRole("textbox", { name: "Seats" }) as HTMLInputElement).value).toBe("3")
  invite().value = { ...invite().value, start: "2026-12-01" }
  await next(bridge)
  await on(bridge, "textarea", "Message", "setValue", "Welcome aboard.")
  await on(bridge, "switch", "Email me when they join", "setChecked", false)
  await next(bridge)
  const access = region("Access").textContent
  expect(access).toContain("Admin")
  expect(access).toContain("3")
  expect(access).toContain("Dec 1, 2026")
  const message = region("Message").textContent
  expect(message).toContain("Welcome aboard.")
  expect(message).toContain("No")
  expect(invite().value).toEqual({
    email: "grace@example.com",
    name: "",
    role: "admin",
    seats: 3,
    start: "2026-12-01",
    message: "Welcome aboard.",
    notify: false,
  })
})

test("an agent fills it by label; its press on Send waits for the person, who sends it", async () => {
  const bridge = await openWebPage("content.html", "content-demo.ts")
  const filled = await bridge.agent.act({
    steps: [
      { ref: "Invite a teammate", action: "fill", args: [{ Email: "grace@example.com", Role: "Admin", seats: "3", "Email me when they join": "no" }] },
      { ref: "Invite a teammate", action: "goTo", args: [3] },
    ],
  })
  await settle()
  expect(filled.ok, filled.error?.message).toBe(true)
  expect(region("Access").textContent).toContain("Admin")
  expect(region("Access").textContent).toContain("3")
  const found = await bridge.agent.query({ text: "Send invite" })
  if ("error" in found) throw new Error(found.error)
  expect(found[0]?.confirm).toBe("Sends an invite email to the address given")
  const pressed = await bridge.pressUnattended("Send invite")
  expect(pressed.ok).toBe(false)
  expect(pressed.error?.message).toContain("Needs a person")
  expect(form().getAttribute("data-status")).toBe("idle")
  // The person sends it.
  await bridge.press("Send invite")
  expect(bridge.asked).toEqual(["Sends an invite email to the address given"])
  await waitFor(() => expect(form().textContent).toContain("Invite sent."))
})

test("an agent's fill with problems shows them under the fields, and tells the agent", async () => {
  const bridge = await openWebPage("content.html", "content-demo.ts")
  const result = await bridge.run("Invite a teammate", "fill", { email: "grace@", seats: 99 })
  expect(result.ok).toBe(false)
  expect(result.error?.message).toContain("Email: Enter an email address, like name@example.com.")
  expect(result.error?.message).toContain("Seats is at most 50.")
  expect(within(form()).getByRole("textbox", { name: "Email" }).getAttribute("aria-invalid")).toBe("true")
})

test("formTool: the same definition as a tool fills the element through the bridge", async () => {
  await openWebPage("content.html", "content-demo.ts")
  const { formTool } = await import("../../web/src/uiset")
  // The page's own bridge, as the browser test used.
  const tool = formTool(invite().form as Parameters<typeof formTool>[0], (window as unknown as { agent: Parameters<typeof formTool>[1] }).agent)
  const result = await tool.execute({ email: "grace@example.com", role: "viewer" })
  await settle()
  expect({ name: tool.name, required: tool.inputSchema.required, result }).toEqual({ name: "invite_teammate", required: ["email", "role"], result: { ok: true, filled: ["email", "role"] } })
  expect((within(form()).getByRole("textbox", { name: "Email" }) as HTMLInputElement).value).toBe("grace@example.com")
})

test("`disabled` turns every control off and the send can't send; `heading=\"false\"` with `label` names the form", async () => {
  await openWebPage("content.html", "content-demo.ts")
  invite().setAttribute("heading", "false")
  invite().setAttribute("label", "Invite")
  invite().setAttribute("disabled", "")
  await settle()
  const named = form("Invite")
  expect(named.hasAttribute("data-disabled")).toBe(true)
  expect(within(named).queryAllByRole("heading", { name: "Invite a teammate" })).toHaveLength(0)
  const email = within(named).getByRole("textbox", { name: "Email" })
  expect(email.matches(":disabled")).toBe(true)
  invite().removeAttribute("disabled")
  await settle()
  expect(email.matches(":disabled")).toBe(false)
})

test("taken off the page and put back, as a framework may, it keeps its values and still works", async () => {
  const bridge = await openWebPage("content.html", "content-demo.ts")
  await on(bridge, "input", "Email", "setValue", "grace@example.com")
  // Long enough out that it's given a new instance on its return.
  const el = invite()
  el.remove()
  await settle(1000)
  document.querySelector("main")!.prepend(el)
  await settle()
  const email = within(form()).getByRole("textbox", { name: "Email" }) as HTMLInputElement
  expect(email.value).toBe("grace@example.com")
  await on(bridge, "input", "Email", "setValue", "ada@example.com")
  await waitFor(() => expect(invite().value.email).toBe("ada@example.com"))
  await next(bridge)
  within(form()).getByRole("radio", { name: "Editor" })
})
