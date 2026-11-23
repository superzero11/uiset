// The form's own words, how the review shows each value, and what takes focus in a field:
// shared by React's SchemaForm and the <uiset-schema-form> element, so both read the same.
import type { FieldSpec } from "./schema"

type SchemaFormLabels = {
  next: string
  back: string
  submit: string
  submitting: string
  /** The review's name in the steps. */
  review: string
  /** Each step's Edit button on the review, like "Edit Who". */
  edit: (step: string) => string
  steps: string
  yes: string
  no: string
  /** What the review shows for a field left empty. */
  empty: string
  /** The number field's step buttons. */
  decrease: string
  increase: string
}

const defaultLabels: SchemaFormLabels = {
  next: "Next",
  back: "Back",
  submit: "Submit",
  submitting: "Sending…",
  review: "Review",
  edit: (step) => `Edit ${step}`,
  steps: "Steps",
  yes: "Yes",
  no: "No",
  empty: "Not given",
  decrease: "Decrease",
  increase: "Increase",
}

/** What the review shows for a value. */
function shownValue(field: FieldSpec, value: unknown, labels: SchemaFormLabels, locale?: string) {
  if (value === null || value === undefined || value === "") return labels.empty
  switch (field.kind) {
    case "boolean":
      return value ? labels.yes : labels.no
    case "choice":
      return field.options.find((option) => option.value === value)?.label ?? String(value)
    case "number":
      return new Intl.NumberFormat(locale).format(value as number)
    case "date":
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
    case "tags":
      return Array.isArray(value) && value.length ? value.join(", ") : labels.empty
    default:
      return String(value)
  }
}

/** The autocomplete a text field asks for, by its kind. */
const autocompleteFor = (kind: FieldSpec["kind"]) => (kind === "email" ? "email" : kind === "tel" ? "tel" : kind === "url" ? "url" : "off")

/** What takes focus in a field: its text box, its spin button, its combobox, or its checked radio (the radios' one tab stop). */
const controlIn = (field: Element | null | undefined) =>
  field?.querySelector<HTMLElement>(
    "input:not([type=hidden], [tabindex='-1']), textarea, [role=combobox], [role=spinbutton], [tabindex]:not([tabindex='-1']), button:not([tabindex='-1'])",
  ) ?? null

export { autocompleteFor, controlIn, defaultLabels, shownValue }
export type { SchemaFormLabels }
