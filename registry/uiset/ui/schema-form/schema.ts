// A form described once. Its fields render the form, check what's entered, and become the
// JSON Schema of an agent tool that fills it. No framework here, so every renderer shares it.

type FieldOption = { value: string; label: string }

/** What's wrong with a value, or nothing when it can be saved. Gets every value, for rules across fields. */
type FieldCheck<Value> = (value: Value, values: Record<string, unknown>) => string | null | undefined | void

type FieldBase = {
  label: string
  /** A line under the label, like a format or a reason. */
  description?: string
  required?: boolean
  placeholder?: string
}

type TextField = FieldBase & {
  kind: "text" | "email" | "url" | "tel" | "textarea"
  /** The fewest and most characters. */
  min?: number
  max?: number
  /** A regular expression the whole text matches, with `patternMessage` saying what's expected. */
  pattern?: string
  patternMessage?: string
  default?: string
  validate?: FieldCheck<string>
}

type NumberField = FieldBase & {
  kind: "number"
  min?: number
  max?: number
  /** 1 for whole numbers. */
  step?: number
  default?: number | null
  validate?: FieldCheck<number | null>
}

type ChoiceField = FieldBase & {
  kind: "choice"
  options: readonly FieldOption[]
  /** A select (the default), or radio buttons for a few options seen at once. */
  display?: "select" | "radio"
  default?: string | null
  validate?: FieldCheck<string | null>
}

type BooleanField = FieldBase & {
  kind: "boolean"
  /** A checkbox (the default) or a switch. With `required`, it must be on, like accepting terms. */
  display?: "checkbox" | "switch"
  default?: boolean
  validate?: FieldCheck<boolean>
}

type DateField = FieldBase & {
  kind: "date"
  /** ISO dates, like "2026-11-20". */
  min?: string
  max?: string
  default?: string
  validate?: FieldCheck<string>
}

type FieldSpec = TextField | NumberField | ChoiceField | BooleanField | DateField
type Fields = Record<string, FieldSpec>

type ValueOf<F> = F extends { kind: "number" }
  ? number | null
  : F extends { kind: "boolean" }
    ? boolean
    : F extends { kind: "choice"; options: readonly { value: infer V extends string }[] }
      ? V | null
      : string

/** The values a form holds, by field name, typed from its fields. */
type FormValues<F extends Fields> = { -readonly [K in keyof F]: ValueOf<F[K]> }
/** Problems by field name; a problem with the whole form is under `form`. */
type FormErrors = Partial<Record<string, string>>

type FormStep<F extends Fields> = { title: string; description?: string; fields: readonly (keyof F & string)[] }

/** A Standard Schema (zod, valibot, arktype and others implement it), for rules across fields. */
type StandardSchemaV1 = {
  readonly "~standard": {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) => StandardResult | Promise<StandardResult>
  }
}
type StandardResult =
  | { readonly value: unknown; readonly issues?: undefined }
  | { readonly issues: readonly { readonly message: string; readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] }[] }

type FormMessages = {
  required: (label: string) => string
  tooShort: (label: string, min: number) => string
  tooLong: (label: string, max: number) => string
  pattern: (label: string) => string
  email: string
  url: string
  number: string
  wholeNumber: string
  tooLow: (label: string, min: number) => string
  tooHigh: (label: string, max: number) => string
  choice: (options: string[]) => string
  date: string
  tooEarly: (label: string, min: string) => string
  tooLate: (label: string, max: string) => string
  boolean: string
  unknownField: (key: string, fields: string[]) => string
}

const defaultMessages: FormMessages = {
  required: (label) => `${label} is required.`,
  tooShort: (label, min) => `${label} needs at least ${min} characters.`,
  tooLong: (label, max) => `${label} takes at most ${max} characters.`,
  pattern: (label) => `${label} isn't in the expected format.`,
  email: "Enter an email address, like name@example.com.",
  url: "Enter a web address, like https://example.com.",
  number: "Enter a number.",
  wholeNumber: "Enter a whole number.",
  tooLow: (label, min) => `${label} is at least ${min}.`,
  tooHigh: (label, max) => `${label} is at most ${max}.`,
  choice: (options) => `Choose one of: ${options.join(", ")}.`,
  date: "Enter a date like 2026-11-20.",
  tooEarly: (label, min) => `${label} is on or after ${min}.`,
  tooLate: (label, max) => `${label} is on or before ${max}.`,
  boolean: "Use true or false.",
  unknownField: (key, fields) => `No field "${key}". Its fields: ${fields.join(", ")}.`,
}

type FormSpec<F extends Fields> = {
  /** The agent tool's name: lowercase letters, digits and underscores, like "invite_teammate". */
  name: string
  /** What the form does, like "Invite a teammate". It names the form and starts the tool's description. */
  title: string
  description?: string
  fields: F
  /** Steps of a longer form, each with some of the fields in order, then a review. Every field is in one step. */
  steps?: readonly FormStep<F>[]
  /** Rules across fields, checked on submit after each field's own. */
  schema?: StandardSchemaV1
  messages?: Partial<FormMessages>
}

/** A described form. Its steps name fields as plain text here; `defineForm` checked them. */
type FormDefinition<F extends Fields = Fields> = Readonly<Omit<FormSpec<F>, "steps">> & {
  readonly steps?: readonly { readonly title: string; readonly description?: string; readonly fields: readonly string[] }[]
  readonly names: readonly (keyof F & string)[]
  readonly words: FormMessages
}

/**
 * Describes a form. The values' type comes from the fields: `FormValues<typeof form.fields>`.
 * @example
 * const invite = defineForm({
 *   name: "invite_teammate",
 *   title: "Invite a teammate",
 *   fields: {
 *     email: { kind: "email", label: "Email", required: true },
 *     role: { kind: "choice", label: "Role", options: [{ value: "viewer", label: "Viewer" }, { value: "admin", label: "Admin" }] },
 *   },
 * })
 */
function defineForm<const F extends Fields>(spec: FormSpec<F>): FormDefinition<F> {
  if (!/^[a-z][a-z0-9_]*$/.test(spec.name)) throw new Error(`defineForm: "${spec.name}" isn't a tool name. Use lowercase letters, digits and underscores.`)
  const names = Object.keys(spec.fields) as (keyof F & string)[]
  if (spec.steps) {
    const seen = new Set<string>()
    for (const step of spec.steps) {
      for (const field of step.fields) {
        if (!(field in spec.fields)) throw new Error(`defineForm: step "${step.title}" names no field "${field}".`)
        if (seen.has(field)) throw new Error(`defineForm: "${field}" is in two steps.`)
        seen.add(field)
      }
    }
    const left = names.filter((name) => !seen.has(name))
    if (left.length) throw new Error(`defineForm: ${left.join(", ")} ${left.length === 1 ? "is" : "are"} in no step.`)
  }
  return { ...spec, names, words: { ...defaultMessages, ...spec.messages } }
}

/** Each field's default: its `default`, or empty. */
function initialValues<F extends Fields>(form: FormDefinition<F>): FormValues<F> {
  const values: Record<string, unknown> = {}
  for (const name of form.names) {
    const field = form.fields[name]!
    values[name] =
      field.kind === "number" ? (field.default ?? null) : field.kind === "boolean" ? (field.default ?? false) : field.kind === "choice" ? (field.default ?? null) : (field.default ?? "")
  }
  return values as FormValues<F>
}

const isEmpty = (value: unknown) => value === null || value === undefined || value === "" || value === false
const isoDate = /^\d{4}-\d{2}-\d{2}$/
const realDate = (text: string) => isoDate.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00Z`)) && new Date(`${text}T00:00:00Z`).toISOString().startsWith(text)

/** What's wrong with one field's value, from its own rules, or null. */
function checkField(form: FormDefinition, name: string, value: unknown, values: Record<string, unknown>): string | null {
  const field = form.fields[name]
  if (!field) return null
  const words = form.words
  if (isEmpty(value)) return field.required ? words.required(field.label) : null
  const own = () => (field.validate ? ((field.validate as FieldCheck<unknown>)(value, values) ?? null) : null) || null
  switch (field.kind) {
    case "text":
    case "email":
    case "url":
    case "tel":
    case "textarea": {
      const text = String(value)
      if (field.min !== undefined && text.length < field.min) return words.tooShort(field.label, field.min)
      if (field.max !== undefined && text.length > field.max) return words.tooLong(field.label, field.max)
      if (field.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return words.email
      if (field.kind === "url" && !URL.canParse(text)) return words.url
      if (field.pattern && !new RegExp(`^(?:${field.pattern})$`, "u").test(text)) return field.patternMessage ?? words.pattern(field.label)
      return own()
    }
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) return words.number
      if (field.step === 1 && !Number.isInteger(value)) return words.wholeNumber
      if (field.min !== undefined && value < field.min) return words.tooLow(field.label, field.min)
      if (field.max !== undefined && value > field.max) return words.tooHigh(field.label, field.max)
      return own()
    }
    case "choice":
      if (!field.options.some((option) => option.value === value)) return words.choice(field.options.map((option) => option.label))
      return own()
    case "boolean":
      return own()
    case "date": {
      const text = String(value)
      if (!realDate(text)) return words.date
      if (field.min && text < field.min) return words.tooEarly(field.label, field.min)
      if (field.max && text > field.max) return words.tooLate(field.label, field.max)
      return own()
    }
  }
}

/** Each named field's problems (every field without `names`), from the fields' own rules. */
function checkFields(form: FormDefinition, values: Record<string, unknown>, names: readonly string[] = form.names): FormErrors {
  const errors: FormErrors = {}
  for (const name of names) {
    const problem = checkField(form, name, values[name], values)
    if (problem) errors[name] = problem
  }
  return errors
}

/** Every problem: the fields' own rules, then the form's `schema` once those pass. */
async function validateForm(form: FormDefinition, values: Record<string, unknown>): Promise<FormErrors> {
  const errors = checkFields(form, values)
  if (Object.keys(errors).length || !form.schema) return errors
  const result = await form.schema["~standard"].validate(values)
  for (const issue of result.issues ?? []) {
    const first = issue.path?.[0]
    const key = typeof first === "object" && first !== null ? first.key : first
    const name = typeof key === "string" && key in form.fields ? key : "form"
    errors[name] ??= issue.message
  }
  return errors
}

/** The field a key names: its name, or its label, regardless of case. */
function fieldFor(form: FormDefinition, key: string): string | undefined {
  if (key in form.fields) return key
  const wanted = key.trim().toLowerCase()
  return form.names.find((name) => name.toLowerCase() === wanted) ?? form.names.find((name) => form.fields[name]!.label.toLowerCase() === wanted)
}

/**
 * A value an agent or a script gives, as the field holds it: a number from "12", a choice by
 * its value or its label, a date from a Date or a timestamp. Says what's wrong when it can't.
 */
function coerceValue(form: FormDefinition, name: string, input: unknown): { value: unknown } | { error: string } {
  const field = form.fields[name]!
  const words = form.words
  if (input === null || input === undefined || input === "") {
    return { value: field.kind === "number" || field.kind === "choice" ? null : field.kind === "boolean" ? false : "" }
  }
  switch (field.kind) {
    case "number": {
      const value = typeof input === "number" ? input : typeof input === "string" && input.trim() !== "" ? Number(input) : Number.NaN
      return Number.isNaN(value) ? { error: words.number } : { value }
    }
    case "boolean": {
      if (typeof input === "boolean") return { value: input }
      const text = String(input).trim().toLowerCase()
      if (["true", "yes", "on", "1"].includes(text)) return { value: true }
      if (["false", "no", "off", "0"].includes(text)) return { value: false }
      return { error: words.boolean }
    }
    case "choice": {
      const text = String(input).trim()
      const option =
        field.options.find((o) => o.value === text) ??
        field.options.find((o) => o.value.toLowerCase() === text.toLowerCase()) ??
        field.options.find((o) => o.label.toLowerCase() === text.toLowerCase())
      return option ? { value: option.value } : { error: words.choice(field.options.map((o) => o.label)) }
    }
    case "date": {
      const text = input instanceof Date ? input.toISOString().slice(0, 10) : String(input).trim().slice(0, 10)
      return realDate(text) ? { value: text } : { error: words.date }
    }
    default:
      return { value: typeof input === "string" ? input : String(input) }
  }
}

type JSONSchema = Record<string, unknown>

/** The form's fields as JSON Schema: an agent tool's input, the shape model APIs and WebMCP take. */
function toJSONSchema(form: FormDefinition): JSONSchema {
  const properties: Record<string, JSONSchema> = {}
  const required: string[] = []
  for (const name of form.names) {
    const field = form.fields[name]!
    const notes = [field.description].filter(Boolean) as string[]
    let property: JSONSchema
    switch (field.kind) {
      case "number":
        property = { type: field.step === 1 ? "integer" : "number", minimum: field.min, maximum: field.max, multipleOf: field.step === 1 ? undefined : field.step }
        break
      case "boolean":
        property = { type: "boolean" }
        if (field.required) notes.push("Must be true.")
        break
      case "choice":
        property = { type: "string", enum: field.options.map((o) => o.value) }
        notes.push(`One of: ${field.options.map((o) => (o.label === o.value ? o.value : `${o.value} (${o.label})`)).join(", ")}.`)
        break
      case "date":
        property = { type: "string", format: "date", formatMinimum: field.min, formatMaximum: field.max }
        break
      default:
        property = {
          type: "string",
          format: field.kind === "email" ? "email" : field.kind === "url" ? "uri" : undefined,
          minLength: field.min,
          maxLength: field.max,
          pattern: field.pattern ? `^(?:${field.pattern})$` : undefined,
        }
    }
    property = Object.fromEntries(Object.entries({ title: field.label, ...property, description: notes.join(" ") || undefined }).filter(([, v]) => v !== undefined))
    properties[name] = property
    if (field.required) required.push(name)
  }
  return { type: "object", properties, required, additionalProperties: false }
}

export { checkField, checkFields, coerceValue, defaultMessages, defineForm, fieldFor, initialValues, toJSONSchema, validateForm }
export type {
  BooleanField,
  ChoiceField,
  DateField,
  FieldOption,
  FieldSpec,
  Fields,
  FormDefinition,
  FormErrors,
  FormMessages,
  FormSpec,
  FormStep,
  FormValues,
  JSONSchema,
  NumberField,
  StandardSchemaV1,
  TextField,
}
