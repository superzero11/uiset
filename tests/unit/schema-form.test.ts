import { describe, expect, test } from "vitest"
import {
  checkField,
  checkFields,
  coerceValue,
  defineForm,
  fieldFor,
  initialValues,
  toJSONSchema,
  validateForm,
  type FormValues,
  type StandardSchemaV1,
} from "@/registry/uiset/ui/schema-form/schema"
import { schemaForm } from "@/registry/uiset/ui/schema-form/form"

const invite = defineForm({
  name: "invite_teammate",
  title: "Invite a teammate",
  fields: {
    email: { kind: "email", label: "Email", required: true },
    name: { kind: "text", label: "Name", max: 5 },
    role: {
      kind: "choice",
      label: "Role",
      options: [
        { value: "viewer", label: "Viewer" },
        { value: "admin", label: "Admin" },
      ],
      default: "viewer",
    },
    seats: { kind: "number", label: "Seats", min: 1, max: 50, step: 1 },
    start: { kind: "date", label: "Start date", min: "2026-01-01" },
    terms: { kind: "boolean", label: "Accept the terms", required: true },
    site: { kind: "url", label: "Website" },
    code: { kind: "text", label: "Code", pattern: "[A-Z]{3}", patternMessage: "Three capital letters." },
  },
})

// The values' type comes from the fields: a choice is one of its options.
export const typed = (values: FormValues<typeof invite.fields>) => {
  const role: "viewer" | "admin" | null = values.role
  const seats: number | null = values.seats
  const terms: boolean = values.terms
  // @ts-expect-error Not one of Role's options.
  values.role = "owner"
  return [role, seats, terms]
}

describe("defineForm", () => {
  test("refuses a name a tool can't have, and steps that miss or repeat a field", () => {
    expect(() => defineForm({ name: "Invite Teammate", title: "x", fields: {} })).toThrow(/tool name/)
    const fields = { a: { kind: "text", label: "A" }, b: { kind: "text", label: "B" } } as const
    expect(() => defineForm({ name: "f", title: "F", fields, steps: [{ title: "One", fields: ["a"] }] })).toThrow(/b is in no step/)
    expect(() =>
      defineForm({
        name: "f",
        title: "F",
        fields,
        steps: [
          { title: "One", fields: ["a", "b"] },
          { title: "Two", fields: ["b"] },
        ],
      }),
    ).toThrow(/"b" is in two steps/)
  })

  test("each field starts at its default, or empty", () => {
    expect(initialValues(invite)).toEqual({ email: "", name: "", role: "viewer", seats: null, start: "", terms: false, site: "", code: "" })
  })
})

describe("a field's own rules", () => {
  const values = initialValues(invite)
  test.each([
    ["email", "", "Email is required."],
    ["email", "ada@", "Enter an email address, like name@example.com."],
    ["email", "ada@example.com", null],
    ["name", "Lovelace", "Name takes at most 5 characters."],
    ["role", "owner", "Choose one of: Viewer, Admin."],
    ["seats", 2.5, "Enter a whole number."],
    ["seats", 0, "Seats is at least 1."],
    ["seats", 51, "Seats is at most 50."],
    ["seats", null, null],
    ["start", "2025-12-31", "Start date is on or after 2026-01-01."],
    ["start", "2026-02-30", "Enter a date like 2026-11-20."],
    ["terms", false, "Accept the terms is required."],
    ["terms", true, null],
    ["site", "not a url", "Enter a web address, like https://example.com."],
    ["code", "ab1", "Three capital letters."],
    ["code", "ABC", null],
  ])("%s = %j: %s", (name, value, problem) => {
    expect(checkField(invite, name, value, values)).toBe(problem)
  })

  test("a field's own check sees every value", () => {
    const form = defineForm({
      name: "range",
      title: "Range",
      fields: {
        from: { kind: "number", label: "From" },
        to: { kind: "number", label: "To", validate: (to, all) => (to !== null && to < (all.from as number) ? "To comes after From." : null) },
      },
    })
    expect(checkFields(form, { from: 5, to: 3 })).toEqual({ to: "To comes after From." })
    expect(checkFields(form, { from: 5, to: 9 })).toEqual({})
  })
})

describe("the form's schema", () => {
  const schema = (issues: { message: string; path?: (string | { key: string })[] }[]): StandardSchemaV1 => ({
    "~standard": { version: 1, vendor: "test", validate: async (value) => (issues.length ? { issues } : { value }) },
  })
  const fields = { password: { kind: "text", label: "Password" }, again: { kind: "text", label: "Again" } } as const

  test("runs once the fields' own rules pass, and puts each issue on its field", async () => {
    const form = defineForm({ name: "f", title: "F", fields, schema: schema([{ message: "They differ.", path: [{ key: "again" }] }, { message: "Not today." }]) })
    expect(await validateForm(form, { password: "a", again: "b" })).toEqual({ again: "They differ.", form: "Not today." })
  })

  test("waits while a field's own rule fails", async () => {
    const form = defineForm({ name: "f", title: "F", fields: { ...fields, password: { kind: "text", label: "Password", required: true } }, schema: schema([{ message: "They differ.", path: ["again"] }]) })
    expect(await validateForm(form, { password: "", again: "b" })).toEqual({ password: "Password is required." })
  })
})

describe("filling by name or label", () => {
  test("a key is a field's name or its label, in any case", () => {
    expect(fieldFor(invite, "email")).toBe("email")
    expect(fieldFor(invite, "Start Date")).toBe("start")
    expect(fieldFor(invite, "SEATS")).toBe("seats")
    expect(fieldFor(invite, "phone")).toBeUndefined()
  })

  test.each([
    ["seats", "12", { value: 12 }],
    ["seats", "twelve", { error: "Enter a number." }],
    ["role", "Admin", { value: "admin" }],
    ["role", "ADMIN", { value: "admin" }],
    ["role", "owner", { error: "Choose one of: Viewer, Admin." }],
    ["terms", "yes", { value: true }],
    ["terms", "maybe", { error: "Use true or false." }],
    ["start", "2026-11-20T09:00:00Z", { value: "2026-11-20" }],
    ["start", new Date("2026-11-21T00:00:00Z"), { value: "2026-11-21" }],
    ["start", "next week", { error: "Enter a date like 2026-11-20." }],
    ["name", 42, { value: "42" }],
    ["role", null, { value: null }],
  ])("%s from %j", (name, input, result) => {
    expect(coerceValue(invite, name, input)).toEqual(result)
  })
})

test("the fields become JSON Schema for an agent tool", () => {
  const schema = toJSONSchema(invite) as { properties: Record<string, Record<string, unknown>>; required: string[]; additionalProperties: boolean }
  expect(schema.required).toEqual(["email", "terms"])
  expect(schema.additionalProperties).toBe(false)
  expect(schema.properties.email).toEqual({ title: "Email", type: "string", format: "email" })
  expect(schema.properties.role).toEqual({ title: "Role", type: "string", enum: ["viewer", "admin"], description: "One of: viewer (Viewer), admin (Admin)." })
  expect(schema.properties.seats).toEqual({ title: "Seats", type: "integer", minimum: 1, maximum: 50 })
  expect(schema.properties.terms).toEqual({ title: "Accept the terms", type: "boolean", description: "Must be true." })
  expect(schema.properties.start).toEqual({ title: "Start date", type: "string", format: "date", formatMinimum: "2026-01-01" })
  expect(schema.properties.code).toEqual({ title: "Code", type: "string", pattern: "^(?:[A-Z]{3})$" })
})

describe("the form primitive", () => {
  const contact = defineForm({
    name: "contact_sales",
    title: "Contact sales",
    fields: {
      email: { kind: "email", label: "Work email", required: true },
      seats: { kind: "number", label: "Seats", min: 1 },
      terms: { kind: "boolean", label: "I agree", default: true },
    },
  })
  type Instance = { get: () => { value: Record<string, unknown>; errors: Record<string, string> }; api: Record<string, (...args: unknown[]) => unknown>; setOptions: (o: object) => void; destroy: () => void }
  const start = (options: object) => schemaForm(options as Parameters<typeof schemaForm>[0]) as unknown as Instance

  test("setValues: fields left out go to their defaults, a problem showing is checked again, and the same values change nothing", () => {
    const changes: unknown[] = []
    const form = start({ form: contact, onValueChange: (value: unknown) => changes.push(value) })
    expect(form.api.setValues!({ email: "ada@" })).toBe(true)
    expect(form.get().value).toEqual({ email: "ada@", seats: null, terms: true })
    form.api.leaveField!("email")
    expect(form.get().errors.email).toBe("Enter an email address, like name@example.com.")
    form.api.setValues!({ email: "ada@example.com" })
    expect(form.get().errors.email).toBeUndefined()
    expect(form.api.setValues!({ ...(form.api.values!() as object) })).toBe(false)
    expect(changes).toHaveLength(2)
    form.destroy()
  })

  test("a definition given later (an element's `form`): its fields start at their defaults, with a default given first", () => {
    const form = start({ defaultValue: { seats: 4 } })
    expect(form.get().value).toEqual({ seats: 4 })
    form.setOptions({ form: contact, defaultValue: { seats: 4 } })
    expect(form.get().value).toEqual({ email: "", seats: 4, terms: true })
    // Another definition keeps the values of the fields it shares.
    form.api.setField!("email", "ada@example.com")
    const longer = defineForm({ name: "contact_sales", title: "Contact sales", fields: { ...contact.fields, phone: { kind: "tel", label: "Phone" } } })
    form.setOptions({ form: longer, defaultValue: { seats: 4 } })
    expect(form.get().value).toEqual({ email: "ada@example.com", seats: 4, terms: true, phone: "" })
    form.destroy()
  })
})

test("a tags field holds a list: counted, each tag's length checked, coerced from a list or text, an array in JSON Schema", () => {
  const post = defineForm({
    name: "post",
    title: "Post",
    fields: { topics: { kind: "tags", label: "Topics", required: true, min: 2, max: 3, maxLength: 10, suggestions: ["css", "html"] } },
  })
  expect(initialValues(post)).toEqual({ topics: [] })
  expect(checkField(post, "topics", [], {})).toBe("Topics is required.")
  expect(checkField(post, "topics", ["css"], {})).toBe("Topics needs at least 2 tags.")
  expect(checkField(post, "topics", ["a", "b", "c", "d"], {})).toBe("Topics takes at most 3 tags.")
  expect(checkField(post, "topics", ["css", "averyverylongtag"], {})).toBe("Each of Topics takes at most 10 characters.")
  expect(checkField(post, "topics", "css", {})).toBe("Give a list of tags.")
  expect(checkField(post, "topics", ["css", "html"], {})).toBeNull()
  expect(coerceValue(post, "topics", "css, html\nCSS")).toEqual({ value: ["css", "html"] })
  expect(coerceValue(post, "topics", [" css ", 3])).toEqual({ value: ["css", "3"] })
  expect(coerceValue(post, "topics", "")).toEqual({ value: [] })
  expect(toJSONSchema(post).properties).toEqual({
    topics: { title: "Topics", type: "array", items: { type: "string", maxLength: 10 }, minItems: 2, maxItems: 3, uniqueItems: true, description: "Suggested: css, html." },
  })
})
