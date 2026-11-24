// The form's own words, how the review shows each value, and what takes focus in a field:
// shared by React's SchemaForm and the <uiset-schema-form> element, so both read the same.
import { announce } from "@ui-sdk/core"
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

const unreachable = "[tabindex='-1'], [aria-hidden=true]"
const typing = `input:not([type=hidden], [type=checkbox], [type=radio], ${unreachable}), textarea:not(${unreachable})`
const any = "input:not([type=hidden], [tabindex='-1']), textarea, [role=combobox], [role=spinbutton], [tabindex]:not([tabindex='-1']), button:not([tabindex='-1'])"
/** The first match that isn't in something hidden, like a closed popup's search box. */
const firstShown = (field: Element, selector: string) => [...field.querySelectorAll<HTMLElement>(selector)].find((el) => !el.closest("[hidden], [inert]"))

/**
 * What takes focus in a field: a box to type in first (a phone's number, not its country
 * button; a tag input's field, not its tags), else its combobox, its checked radio (the
 * radios' one tab stop) or its button.
 */
const controlIn = (field: Element | null | undefined) => (field ? (firstShown(field, typing) ?? firstShown(field, any) ?? null) : null)

/**
 * Focus goes to the field with a problem, and moving there reads the problem out with the
 * field. When focus is there already nothing moves, so the problem is said.
 */
function focusProblem(field: Element | null | undefined, problem: string | undefined) {
  const control = controlIn(field)
  if (!control) return
  if (control !== control.ownerDocument.activeElement) control.focus()
  else if (problem) announce(problem)
}

export { autocompleteFor, controlIn, defaultLabels, focusProblem, shownValue }
export type { SchemaFormLabels }
