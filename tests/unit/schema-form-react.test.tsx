import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { expect, test, vi } from "vitest"
import { defineForm, formTool, registerFormTool, SchemaForm } from "@/registry/uiset/ui/schema-form"

const agent = createAgent()
const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

const contact = defineForm({
  name: "contact_sales",
  title: "Contact sales",
  fields: {
    email: { kind: "email", label: "Work email", required: true },
    seats: { kind: "number", label: "Seats", min: 1, step: 1 },
    plan: {
      kind: "choice",
      label: "Plan",
      display: "radio",
      options: [
        { value: "team", label: "Team" },
        { value: "enterprise", label: "Enterprise" },
      ],
    },
    terms: { kind: "boolean", label: "I agree to be contacted", required: true },
  },
})

const steps = defineForm({
  name: "new_project",
  title: "New project",
  fields: {
    name: { kind: "text", label: "Project name", required: true },
    region: { kind: "text", label: "Region" },
    notes: { kind: "textarea", label: "Notes" },
  },
  steps: [
    { title: "Basics", fields: ["name"] },
    { title: "Details", fields: ["region", "notes"] },
  ],
})

const form = () => screen.getByRole("form", { name: "Contact sales" })
const email = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Work email" })

test("a submit with problems shows each under its field, and focus goes to the first", async () => {
  const onSubmit = vi.fn()
  render(<SchemaForm form={contact} onSubmit={onSubmit} />)
  await userEvent.type(email(), "nobody@")
  await userEvent.click(screen.getByRole("button", { name: "Submit" }))
  await tick()
  expect(onSubmit).not.toHaveBeenCalled()
  expect(email().getAttribute("aria-invalid")).toBe("true")
  expect(document.activeElement).toBe(email())
  expect(form().textContent).toContain("Enter an email address, like name@example.com.")
  expect(form().textContent).toContain("I agree to be contacted is required.")
})

test("leaving a field shows what's wrong with what was typed, and fixing it clears it", async () => {
  render(<SchemaForm form={contact} />)
  await userEvent.type(email(), "ada@")
  await userEvent.tab()
  expect(email().getAttribute("aria-invalid")).toBe("true")
  await userEvent.type(email(), "example.com")
  await tick()
  expect(email().getAttribute("aria-invalid")).toBeNull()
})

test("a submit that passes sends the values; problems sent back show where they belong", async () => {
  const onSubmit = vi.fn(async (values: Record<string, unknown>) => (values.email === "taken@example.com" ? { email: "That address has an account." } : undefined))
  render(<SchemaForm form={contact} onSubmit={onSubmit} doneMessage="We'll be in touch." />)
  await userEvent.type(email(), "taken@example.com")
  await userEvent.click(screen.getByRole("radio", { name: "Enterprise" }))
  await userEvent.click(screen.getByRole("checkbox", { name: "I agree to be contacted" }))
  await userEvent.click(screen.getByRole("button", { name: "Submit" }))
  await tick()
  expect(onSubmit.mock.calls[0]![0]).toEqual({ email: "taken@example.com", seats: null, plan: "enterprise", terms: true })
  expect(form().textContent).toContain("That address has an account.")
  expect(document.activeElement).toBe(email())
  await userEvent.clear(email())
  await userEvent.type(email(), "new@example.com")
  await userEvent.click(screen.getByRole("button", { name: "Submit" }))
  await tick()
  expect(form().getAttribute("data-status")).toBe("done")
  expect(form().textContent).toContain("We'll be in touch.")
})

test("steps: Next checks this step, the review shows every value, and reaching it sends nothing", async () => {
  const onSubmit = vi.fn()
  render(<SchemaForm form={steps} onSubmit={onSubmit} labels={{ submit: "Create project" }} />)
  await userEvent.click(screen.getByRole("button", { name: "Next" }))
  await tick()
  expect(screen.getByRole("textbox", { name: "Project name" }).getAttribute("aria-invalid")).toBe("true")
  await userEvent.type(screen.getByRole("textbox", { name: "Project name" }), "Atlas")
  await userEvent.click(screen.getByRole("button", { name: "Next" }))
  await userEvent.type(screen.getByRole("textbox", { name: "Region" }), "Frankfurt")
  // Next on the last step shows the review, and sends nothing.
  await userEvent.click(screen.getByRole("button", { name: "Next" }))
  await tick()
  expect(onSubmit).not.toHaveBeenCalled()
  const review = within(form2()).getByRole("region", { name: "Details" })
  expect(review.textContent).toContain("Frankfurt")
  expect(review.textContent).toContain("Not given")
  // Edit goes back to that step with its values.
  await userEvent.click(within(review).getByRole("button", { name: "Edit Details" }))
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Region" }).value).toBe("Frankfurt")
  await userEvent.click(screen.getByRole("button", { name: "Next" }))
  await userEvent.click(screen.getByRole("button", { name: "Create project" }))
  await tick()
  expect(onSubmit.mock.calls[0]![0]).toEqual({ name: "Atlas", region: "Frankfurt", notes: "" })
})
const form2 = () => screen.getByRole("form", { name: "New project" })

test("agents: the form is one component; fill sets fields by name or label and says what's wrong", async () => {
  const onValueChange = vi.fn()
  render(<SchemaForm form={contact} onValueChange={onValueChange} />)
  await tick()
  const entry = agent.snapshot().find((c) => !c.offPage && c.label === "Contact sales")
  expect(entry?.component).toBe("schema-form")
  expect(entry?.actions).toEqual(["fill", "goTo", "reset"])
  expect(entry?.items?.map((item) => item.label)).toEqual(["Work email", "Seats", "Plan", "I agree to be contacted"])
  const bad = await agent.act({ steps: [{ ref: "Contact sales", action: "fill", args: [{ "work email": "x@", seats: "lots", phone: "1" }] }] })
  expect(bad.ok).toBe(false)
  expect(bad.error?.message).toContain("Seats: Enter a number.")
  expect(bad.error?.message).toContain('No field "phone". Its fields: Work email, Seats, Plan, I agree to be contacted.')
  expect(bad.error?.message).toContain("Work email: Enter an email address")
  const good = await agent.act({ steps: [{ ref: "Contact sales", action: "fill", args: [{ "Work email": "ada@example.com", seats: "12", plan: "Enterprise", terms: "yes" }] }] })
  expect(good.ok, good.error?.message).toBe(true)
  expect(onValueChange.mock.calls.at(-1)![0]).toEqual({ email: "ada@example.com", seats: 12, plan: "enterprise", terms: true })
  expect(onValueChange.mock.calls.at(-1)![1]).toMatchObject({ source: "agent", reason: "fill" })
  expect(email().value).toBe("ada@example.com")
})

test("agents: the submit waits for a person, and says what it does", async () => {
  render(<SchemaForm form={contact} confirm="Sends your details to the sales team" />)
  await tick()
  const submit = agent.snapshot().find((c) => !c.offPage && c.component === "button" && c.label === "Submit")
  expect(submit?.confirm).toBe("Sends your details to the sales team")
  const pressed = await agent.act({ steps: [{ ref: "Submit", action: "press" }] })
  expect(pressed.ok).toBe(false)
  expect(pressed.error?.message).toContain("Needs a person")
})

test("formTool: the fields are the tool's input, and a call fills the form through the bridge", async () => {
  render(<SchemaForm form={contact} />)
  await tick()
  const tool = formTool(contact, agent)
  expect(tool.name).toBe("contact_sales")
  expect(tool.description).toContain('Fills the "Contact sales" form on the page (Work email, Seats, Plan, I agree to be contacted).')
  expect((tool.inputSchema as { required: string[] }).required).toEqual(["email", "terms"])
  expect(await tool.execute({ email: "grace@example.com", plan: "team" })).toEqual({ ok: true, filled: ["email", "plan"] })
  expect(email().value).toBe("grace@example.com")
  expect(await tool.execute({ seats: 0 })).toEqual({ ok: false, error: "Seats is at least 1." })
  // With `submit`, the press goes through the bridge too, and waits for a person.
  const sending = await formTool(contact, agent, { submit: "Submit" }).execute({ terms: true })
  expect(sending).toMatchObject({ ok: false })
  expect((sending as { error: string }).error).toContain("Needs a person")
})

test("registerFormTool hands the tool to the browser's agent, and unregisters it", () => {
  const registered: { tool: { name: string }; signal: AbortSignal }[] = []
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: { registerTool: (tool: { name: string }, options: { signal: AbortSignal }) => (registered.push({ tool, signal: options.signal }), Promise.resolve()) },
  })
  const stop = registerFormTool(contact, agent)
  expect(registered[0]!.tool.name).toBe("contact_sales")
  expect(registered[0]!.signal.aborted).toBe(false)
  stop()
  expect(registered[0]!.signal.aborted).toBe(true)
  Object.defineProperty(document, "modelContext", { configurable: true, value: undefined })
  expect(registerFormTool(contact, agent)).toBeTypeOf("function")
})

test("Enter in a step's field goes on to the next step; on the review it sends", async () => {
  const onSubmit = vi.fn()
  render(<SchemaForm form={steps} onSubmit={onSubmit} labels={{ submit: "Create project" }} />)
  await userEvent.type(screen.getByRole("textbox", { name: "Project name" }), "Atlas{Enter}")
  await tick()
  expect(screen.getByRole("textbox", { name: "Region" })).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole("button", { name: "Next" }))
  await userEvent.click(screen.getByRole("button", { name: "Create project" }))
  await tick()
  expect(onSubmit).toHaveBeenCalledTimes(1)
})

test("a partial default fills the rest from each field's own; reset goes back to it", async () => {
  const onValueChange = vi.fn()
  render(<SchemaForm form={contact} defaultValue={{ plan: "team" }} onValueChange={onValueChange} />)
  expect(email().value).toBe("")
  expect(screen.getByRole<HTMLInputElement>("radio", { name: "Team" }).getAttribute("aria-checked") ?? (screen.getByRole("radio", { name: "Team" }) as HTMLInputElement).checked.toString()).toBe("true")
  await userEvent.type(email(), "a")
  expect(onValueChange.mock.calls[0]![0]).toEqual({ email: "a", seats: null, plan: "team", terms: false })
  await agent.act({ steps: [{ ref: "Contact sales", action: "reset" }] })
  expect(onValueChange.mock.calls.at(-1)![0]).toEqual({ email: "", seats: null, plan: "team", terms: false })
})

const post = defineForm({
  name: "new_post",
  title: "New post",
  fields: { title: { kind: "text", label: "Title" }, topics: { kind: "tags", label: "Topics", max: 3, suggestions: ["CSS", "HTML"] } },
})

test("a tags field is a tag input; an agent fills it with a list or with text, and hears what's wrong", async () => {
  const onValueChange = vi.fn()
  render(<SchemaForm form={post} onValueChange={onValueChange} />)
  await tick()
  await userEvent.type(screen.getByRole("combobox", { name: "Topics" }), "css, html,")
  expect(onValueChange.mock.calls.at(-1)![0]).toEqual({ title: "", topics: ["css", "html"] })
  const filled = await agent.act({ steps: [{ ref: "New post", action: "fill", args: [{ topics: "design, research" }] }] })
  expect(filled.ok, filled.error?.message).toBe(true)
  await tick()
  expect(onValueChange.mock.calls.at(-1)![0]).toEqual({ title: "", topics: ["design", "research"] })
  expect([...document.querySelectorAll(".tag-input-text")].map((tag) => tag.textContent)).toEqual(["design", "research"])
  const tooMany = await agent.act({ steps: [{ ref: "New post", action: "fill", args: [{ Topics: ["a", "b", "c", "d"] }] }] })
  expect(tooMany.ok).toBe(false)
  expect(tooMany.error?.message).toContain("Topics takes at most 3 tags.")
  await tick()
  expect(screen.getByRole("combobox", { name: "Topics" }).getAttribute("aria-invalid")).toBe("true")
  expect(screen.getByText("Topics takes at most 3 tags.")).toBeTruthy()
})

const callback = defineForm({
  name: "callback",
  title: "Call me back",
  fields: { mobile: { kind: "phone", label: "Mobile", defaultCountry: "US", required: true } },
})

test("a phone field is a phone input, loaded when the form has one; an agent fills it with an international number", async () => {
  const onValueChange = vi.fn()
  const onSubmit = vi.fn()
  render(<SchemaForm form={callback} onValueChange={onValueChange} onSubmit={onSubmit} confirm={false} />)
  // The phone input comes in on its own; until then a plain field takes the number.
  const country = await screen.findByRole("button", { name: /^Country: United States/ })
  expect(country).toBeTruthy()
  await userEvent.type(screen.getByRole("textbox", { name: "Mobile" }), "4155550123")
  expect(onValueChange.mock.calls.at(-1)![0]).toEqual({ mobile: "+14155550123" })
  const bad = await agent.act({ steps: [{ ref: "Call me back", action: "fill", args: [{ mobile: "020 7946 0958" }] }] })
  expect(bad.ok).toBe(false)
  expect(bad.error?.message).toContain("Mobile: Give the number with its country code")
  const good = await agent.act({ steps: [{ ref: "Call me back", action: "fill", args: [{ Mobile: "+44 20 7946 0958" }] }] })
  expect(good.ok, good.error?.message).toBe(true)
  await tick()
  expect(onValueChange.mock.calls.at(-1)![0]).toEqual({ mobile: "+442079460958" })
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Mobile" }).value).toBe("020 7946 0958")
  expect(screen.getByRole("button", { name: /^Country: / }).getAttribute("aria-label")).toBe("Country: United Kingdom, +44")
})

test("a phone number too short for its country stops the submit, with the form's words", async () => {
  const onSubmit = vi.fn()
  render(<SchemaForm form={callback} defaultValue={{ mobile: "+1415555" }} onSubmit={onSubmit} confirm={false} />)
  await screen.findByRole("button", { name: /^Country: / })
  await userEvent.click(screen.getByRole("button", { name: "Submit" }))
  await tick()
  expect(onSubmit).not.toHaveBeenCalled()
  expect(await screen.findByText("Mobile is too short for a phone number in its country.")).toBeTruthy()
})

const refund = defineForm({
  name: "refund",
  title: "Refund",
  fields: { iban: { kind: "text", label: "IBAN", mask: "iban", required: true }, amount: { kind: "number", label: "Amount", currency: "EUR" } },
})

test("a masked field is a masked input; an agent fills it in any format; a currency shows on the number", async () => {
  const onValueChange = vi.fn()
  render(<SchemaForm form={refund} onValueChange={onValueChange} />)
  await tick()
  await userEvent.type(screen.getByRole("textbox", { name: "IBAN" }), "gb82west12345698765432")
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "IBAN" }).value).toBe("GB82 WEST 1234 5698 7654 32")
  expect(onValueChange.mock.calls.at(-1)![0]).toMatchObject({ iban: "GB82WEST12345698765432" })
  const filled = await agent.act({ steps: [{ ref: "Refund", action: "fill", args: [{ IBAN: "de89 3704 0044 0532 0130 00", amount: 12.5 }] }] })
  expect(filled.ok, filled.error?.message).toBe(true)
  await tick()
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "IBAN" }).value).toBe("DE89 3704 0044 0532 0130 00")
  const bad = await agent.act({ steps: [{ ref: "Refund", action: "fill", args: [{ iban: "DE89 3704 0044 0532 0130 01" }] }] })
  expect(bad.ok).toBe(false)
  expect(bad.error?.message).toContain("typo")
  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Amount" }).value).toBe("€12.50")
})
