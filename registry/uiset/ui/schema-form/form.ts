import { announce, createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core"
import { checkField, checkFields, coerceValue, defineForm, fieldFor, initialValues, validateForm, type FormDefinition, type FormErrors } from "./schema"

type Values = Record<string, unknown>
type SchemaFormValueReason = "input" | "fill" | "reset" | "imperative"
type SchemaFormStepReason = "next" | "back" | "step-press" | "imperative"
/** Who sent the form: a person's submit, or a press an agent made. */
type SubmitDetails = { event?: Event }
type SubmitResult = void | FormErrors | Promise<void | FormErrors>

type SchemaFormOptions = {
  form: FormDefinition
  value?: Values
  defaultValue?: Values
  onValueChange?: (value: Values, details: ChangeDetails<SchemaFormValueReason>) => void
  /** The step showing, from 0; the review is the step after the last. */
  step?: number
  defaultStep?: number
  onStepChange?: (step: number, details: ChangeDetails<SchemaFormStepReason>) => void
  /** Sends the values once they pass. Return problems by field, or under `form`, to show them. */
  onSubmit?: (value: Values, details: SubmitDetails) => SubmitResult
  disabled?: boolean
  /** Said once the form is sent. */
  doneMessage?: string
}

const labelOf = (form: FormDefinition, name: string) => form.fields[name]?.label ?? name
/** "Seats is at least 1." stands alone; "Enter a number." gets its field's name in front. */
const said = (form: FormDefinition, name: string, problem: string) => {
  const label = labelOf(form, name)
  return problem.startsWith(label) ? problem : `${label}: ${problem}`
}
/** What a form shows before it's given a definition, as an element is before a page sets `form`. */
const noForm: FormDefinition = defineForm({ name: "form", title: "", fields: {} })
const sameValues = (a: Values, b: Values) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => Object.is(a[key], b[key]))

const stepOf = (form: FormDefinition, name: string) => form.steps?.findIndex((step) => step.fields.includes(name)) ?? -1

/**
 * What a submit finds speaks where it shows: a field's problem under the field, read out as
 * focus moves there, and the form's own in its alert. Said again from here, each was heard
 * twice. Two things nothing else says are: the same alert again, and a problem with no place.
 */
const sayUnsaid = (form: FormDefinition, found: FormErrors, before: string | undefined) => {
  const nowhere = Object.entries(found).find(([name]) => name !== "form" && !(name in form.fields))?.[1]
  const unsaid = found.form && found.form === before ? found.form : nowhere
  if (unsaid) announce(unsaid)
}

/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const schemaForm = definePrimitive({
  name: "schema-form",
  options: {
    form: "value",
    value: "value",
    defaultValue: "value",
    onValueChange: "callback",
    step: "number",
    defaultStep: "number",
    onStepChange: "callback",
    onSubmit: "action",
    disabled: "boolean",
    doneMessage: "string",
  },
  controlled: ["value", "step"],
  state: (options: SchemaFormOptions) => ({
    form: options.form ?? noForm,
    // A partial default fills the rest from each field's own default.
    value: options.value ?? { ...(initialValues(options.form ?? noForm) as Values), ...options.defaultValue },
    step: options.step ?? options.defaultStep ?? 0,
    errors: {} as FormErrors,
    status: "idle" as "idle" | "submitting" | "done",
    /** A field to take focus once it's drawn: the first problem after a submit or Next. */
    focus: null as string | null,
    disabled: options.disabled ?? false,
  }),
  sync: (options) => ({
    form: options.form ?? noForm,
    ...(options.value === undefined ? {} : { value: options.value }),
    ...(options.step === undefined ? {} : { step: options.step }),
    disabled: options.disabled ?? false,
  }),
  api: (context) => {
    const change = createChange(context)
    const { store } = context
    const form = () => store.get().form
    const values = () => store.get().value
    const lastStep = () => form().steps?.length ?? 0

    /** Shows these problems in place of the named fields' old ones. */
    const show = (names: readonly string[], found: FormErrors, focus: boolean) => {
      const errors: FormErrors = { ...store.get().errors }
      for (const name of names) delete errors[name]
      Object.assign(errors, found)
      const first = form().names.find((name) => found[name]) ?? null
      store.set({ errors, focus: focus ? first : store.get().focus })
      return first
    }

    // A definition given later (an element's `form`, set after it's on the page), or another
    // one: the fields it adds start at their defaults, and values it keeps stay.
    context.onOptions((options) => {
      const next = options.form ?? noForm
      const state = store.get()
      if (next === state.form || options.value !== undefined) return
      const kept = Object.fromEntries(Object.entries(state.value).filter(([name]) => name in next.fields))
      store.set({ value: { ...(initialValues(next) as Values), ...options.defaultValue, ...kept } })
    })

    const setStep = (step: number, reason: SchemaFormStepReason, event?: Event) => change("step", Math.max(0, Math.min(lastStep(), step)), { reason, event })

    /** Whether every step before `target` passes; if not, shows the first that doesn't. */
    const reach = (target: number, event?: Event) => {
      const steps = form().steps ?? []
      for (let index = 0; index < Math.min(target, steps.length); index++) {
        const names = steps[index]!.fields
        const found = checkFields(form(), values(), names)
        if (Object.keys(found).length) {
          show(names, found, true)
          // The press or submit that asked isn't one an "imperative" change takes.
          if (store.get().step !== index) setStep(index, "imperative")
          return Object.entries(found).map(([name, problem]) => said(form(), name, problem!))
        }
      }
      return []
    }

    return {
      /** A person's change to one field. A field showing a problem is checked again. */
      setField(name: string, value: unknown, event?: Event) {
        const next = { ...values(), [name]: value }
        if (!change("value", next, { reason: "input", event })) return false
        if (store.get().errors[name]) {
          const problem = checkField(form(), name, value, next)
          show([name], problem ? { [name]: problem } : {}, false)
        }
        return true
      },
      /**
       * Leaving a field shows what's wrong with what was typed. An empty field waits for the
       * submit. A problem showing stays until the value changes: a fuller check than this one
       * may have found it, like a phone number's country rules or the server's.
       */
      leaveField(name: string) {
        const value = values()[name]
        if (value === "" || value === null || value === undefined) return
        const problem = checkField(form(), name, value, values())
        if (problem) show([name], { [name]: problem }, false)
      },
      /**
       * Fills fields by name or label, as an agent does: `fill({ Email: "ada@example.com", role: "Admin" })`.
       * Values are read as each field takes them (numbers from text, a choice by its label).
       * What can't be filled, and what's filled but wrong, is shown and thrown, so the agent hears why.
       */
      fill(entries: Record<string, unknown>) {
        if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
          throw new Error(`fill takes the values by field name or label, like { "${form().names[0] ?? "name"}": "…" }.`)
        }
        const problems: string[] = []
        const next = { ...values() }
        const filled: string[] = []
        for (const [key, input] of Object.entries(entries)) {
          const name = fieldFor(form(), key)
          if (!name) {
            problems.push(form().words.unknownField(key, form().names.map((n) => labelOf(form(), n))))
            continue
          }
          const result = coerceValue(form(), name, input)
          if ("error" in result) problems.push(said(form(), name, result.error))
          else {
            next[name] = result.value
            filled.push(name)
          }
        }
        if (filled.length && !change("value", next, { reason: "fill" })) throw new Error("The change was refused.")
        const found = checkFields(form(), next, filled)
        show(filled, found, false)
        for (const name of filled) if (found[name]) problems.push(said(form(), name, found[name]))
        // A person sees what the agent filled: the step with the first field it filled shows.
        const first = filled.length ? stepOf(form(), filled[0]!) : -1
        if (first >= 0 && first !== store.get().step && !problems.length) setStep(first, "imperative")
        if (problems.length) throw new Error(problems.join(" "))
        return filled.map((name) => labelOf(form(), name))
      },
      /** Shows a step. Going forward checks the steps on the way, as Next does; the review is `steps.length`. */
      goTo(step: number, event?: Event) {
        const target = Number(step)
        if (!Number.isInteger(target) || target < 0 || target > lastStep()) throw new Error(`Steps go from 0 to ${lastStep()}.`)
        if (target > store.get().step) {
          const problems = reach(target, event)
          if (problems.length) throw new Error(problems.join(" "))
        }
        return setStep(target, target > store.get().step ? "next" : "back", event)
      },
      /** The next step, once this one's fields pass. */
      next(event?: Event) {
        const at = store.get().step
        if (reach(at + 1, event).length) return false
        return setStep(at + 1, "next", event)
      },
      back(event?: Event) {
        return setStep(store.get().step - 1, "back", event)
      },
      /** Checks everything, then sends it through `onSubmit`. Problems show, and focus goes to the first. */
      async submit(details: SubmitDetails = {}) {
        if (store.get().status === "submitting" || store.get().disabled) return false
        const before = store.get().errors.form
        const found = await validateForm(form(), values())
        const first = show(form().names, found, true)
        if (Object.keys(found).length) {
          const step = first ? stepOf(form(), first) : -1
          if (step >= 0 && step !== store.get().step) setStep(step, "imperative")
          sayUnsaid(form(), found, before)
          return false
        }
        store.set({ status: "submitting" })
        let result: void | FormErrors
        try {
          result = await context.options().onSubmit?.(values(), details)
        } catch (error) {
          result = { form: error instanceof Error ? error.message : String(error) }
        }
        const sent = !result || Object.keys(result).length === 0
        if (!sent) {
          const failed = show(form().names, result as FormErrors, true)
          store.set({ status: "idle" })
          const step = failed ? stepOf(form(), failed) : -1
          if (step >= 0 && step !== store.get().step) setStep(step, "imperative")
          sayUnsaid(form(), result as FormErrors, before)
          return false
        }
        store.set({ status: "done" })
        const done = context.options().doneMessage
        if (done) announce(done)
        return true
      },
      /** Every field's value now. */
      values: () => values(),
      /**
       * Sets the values from code, as a controller would: fields left out go to their defaults,
       * and a field showing a problem is checked again. The same values change nothing.
       */
      setValues(given: Values, event?: Event) {
        const next = { ...(initialValues(form()) as Values), ...given }
        if (sameValues(next, values())) return false
        if (!change("value", next, { reason: "imperative", event })) return false
        const showing = Object.keys(store.get().errors).filter((name) => name in form().fields)
        if (showing.length) show(showing, checkFields(form(), next, showing), false)
        return true
      },
      /** Back to the defaults, with no problems showing, at the first step. */
      reset(event?: Event) {
        change("value", { ...(initialValues(form()) as Values), ...context.options().defaultValue }, { reason: "reset", event })
        store.set({ errors: {}, status: "idle", focus: null })
        setStep(0, "imperative", event)
      },
      /** The field that took focus after a problem, so it isn't focused again. */
      focused() {
        store.set({ focus: null })
      },
      /** The fields, for an agent: what `fill` takes. */
      fields: () => form().names.map((name) => ({ value: name, label: labelOf(form(), name) })),
    }
  },
  slots: (slot) => ({
    root: slot<
      {},
      { value: Values; errors: FormErrors; step: number; status: "idle" | "submitting" | "done"; disabled: boolean; focus: string | null; form: FormDefinition }
    >({
      state: (state) => ({
        value: state.value,
        errors: state.errors,
        step: state.step,
        status: state.status,
        disabled: state.disabled,
        focus: state.focus,
        form: state.form,
      }),
      attrs: (state) => ({
        "aria-busy": state.status === "submitting" ? "true" : undefined,
        "data-status": state.status,
        "data-invalid": Object.keys(state.errors).length ? "" : undefined,
        "data-disabled": state.disabled ? "" : undefined,
      }),
      on: {
        // The form's own submit, from Enter in a field or the submit button, a person's or an
        // agent's press. Before the review, Enter in a field goes on to the next step.
        submit: (event, { api, store }) => {
          event.preventDefault()
          const steps = store.get().form.steps
          if (steps && store.get().step < steps.length) api.next(event)
          else void api.submit({ event })
        },
      },
    }),
  }),
  agent: { actions: ["fill", "goTo", "reset"], items: (api) => api.fields() },
})

export { schemaForm }
export type { SchemaFormOptions, SchemaFormStepReason, SchemaFormValueReason, SubmitDetails }
