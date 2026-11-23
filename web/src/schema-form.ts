// The schema form for Web Components, on the same primitive as React's `SchemaForm`:
// <uiset-schema-form confirm="Sends the invite"> with `form` set to what `defineForm` returns
// and `send` to the function that sends the values. It draws the fields with UI SDK's own
// elements, the steps and a review, checks what people type, and an agent fills it by field
// name or label while a person approves the submit.
import "@ui-sdk/web/button"
import "@ui-sdk/web/checkbox"
import "@ui-sdk/web/date-input"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/number-input"
import "@ui-sdk/web/radio"
import "@ui-sdk/web/select"
import "@ui-sdk/web/switch"
import "@ui-sdk/web/textarea"
import { createParts, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import { schemaForm, type SchemaFormStepReason, type SchemaFormValueReason, type SubmitDetails } from "@/registry/uiset/ui/schema-form/form"
import { autocompleteFor, controlIn, defaultLabels, shownValue, type SchemaFormLabels } from "@/registry/uiset/ui/schema-form/labels"
import type { FieldSpec, FormDefinition, FormErrors } from "@/registry/uiset/ui/schema-form/schema"
import "@/registry/uiset/ui/schema-form/schema-form.css"
import { attr, h, holdRender, keepInputInside, place, reportPartInput, showIn, uid } from "./dom"
import type { UISetStepper } from "./shell-parts"
import type { TagInputElement } from "./tag-input"

type Values = Record<string, unknown>
type SendResult = void | FormErrors | Promise<void | FormErrors>

/** What `<uiset-schema-form>` fires: `valuechange` as a field changes, `stepchange` as the step does. `preventDefault()` refuses either. */
type UISetSchemaFormEvents = {
  valuechange: UiChangeEvent<Values, SchemaFormValueReason>
  stepchange: UiChangeEvent<number, SchemaFormStepReason>
}

type UISetSchemaForm = UiElement<UISetSchemaFormEvents> & {
  /** What `defineForm` returns: the fields, their rules and the steps. */
  form?: FormDefinition
  /** Every field's value, live. Setting it fills the fields, as setting a text field's does, and fires nothing; fields left out go to their defaults. */
  value: Values
  /** The values at first, and what a reset goes back to. Fields left out start at their own defaults. */
  defaultValue?: Values
  /** Sends the values once they pass. Return problems by field, or under `form`, to show them; a throw shows under the form. */
  send?: (value: Values, details: SubmitDetails) => SendResult
  labels?: Partial<SchemaFormLabels>
  disabled: boolean
  /** Said, and shown under the form, once it's sent. */
  doneMessage?: string
  /** Fill, move and send from code. `fill` takes values by field name or label, as an agent does. */
  api?: {
    fill(entries: Values): string[]
    goTo(step: number): boolean
    next(): boolean
    back(): boolean
    submit(): Promise<boolean>
    reset(): void
  }
}

type Api = {
  setField(name: string, value: unknown, event?: Event): boolean
  leaveField(name: string): void
  goTo(step: number, event?: Event): boolean
  next(event?: Event): boolean
  back(event?: Event): boolean
  focused(): void
}
type State = { form: FormDefinition; value: Values; errors: FormErrors; step: number; status: "idle" | "submitting" | "done"; focus: string | null; disabled: boolean }
type Instance = { get(): State; subscribe(run: () => void): () => void; api: Api }

type FieldView = {
  spec: FieldSpec
  root: HTMLElement
  error: HTMLElement
  write(value: unknown): void
  disable(on: boolean): void
  /** A control that shows its own problem, like the tag input: given it instead of `error`. */
  showProblem?(problem: string | null): void
}

/** A button inside UI SDK's <ui-button>, so it's a real button and agents can press it. */
const button = (text: string, attrs: Record<string, unknown>) => {
  const native = h("button", { type: "button", ...attrs }, text)
  return { wrap: h("ui-button", null, native), native }
}

/**
 * One field: its label, its control, its description and its problem, connected by <ui-field>.
 * `api` is read when a control changes: an element moved on the page gets a new instance.
 */
function buildField(name: string, spec: FieldSpec, apiOf: () => Api, labels: SchemaFormLabels): FieldView {
  const required = spec.required ? "true" : null
  const set = (next: unknown, event?: Event) => apiOf().setField(name, next, event)
  const leaveOn = (control: HTMLElement) =>
    control.addEventListener("focusout", (event) => {
      if (!control.contains(event.relatedTarget as Node | null)) apiOf().leaveField(name)
    })
  const label = h("ui-field-label", null, spec.label)
  const description = spec.description ? h("ui-field-description", null, spec.description) : null
  const error = h("ui-field-error", { match: "true" })
  const root = h("ui-field", { name, class: "schema-form-field", "data-schema-field": name })
  type Live = HTMLElement & { value: unknown; checked: boolean }
  let control: HTMLElement
  let write: (value: unknown) => void
  let disable: (on: boolean) => void

  switch (spec.kind) {
    case "number": {
      const input = h("input", { "aria-required": required })
      const live = h(
        "ui-number-input",
        { min: spec.min, max: spec.max, step: spec.step },
        h(
          "ui-number-input-group",
          null,
          h("ui-number-input-decrement", null, h("button", { type: "button", "aria-label": labels.decrease })),
          h("ui-number-input-control", null, input),
          h("ui-number-input-increment", null, h("button", { type: "button", "aria-label": labels.increase })),
        ),
      ) as Live
      live.addEventListener("valuechange", (event) => set((event as CustomEvent<{ value: number | null }>).detail.value, event))
      leaveOn(live)
      control = live
      write = (value) => {
        if (live.value !== (value ?? null)) live.value = value ?? null
      }
      disable = (on) => attr(live, "disabled", on)
      break
    }
    case "date": {
      const live = h("ui-date-input", { min: spec.min, max: spec.max, required: spec.required }) as Live
      live.addEventListener("valuechange", (event) => set((event as CustomEvent<{ value: string | null }>).detail.value ?? "", event))
      leaveOn(live)
      control = live
      write = (value) => {
        if ((live.value ?? "") !== (value ?? "")) live.value = (value as string) || null
      }
      disable = (on) => attr(live, "disabled", on)
      break
    }
    case "choice": {
      if (spec.display === "radio") {
        const live = h(
          "ui-radio-group",
          { class: "schema-form-options", "aria-required": required },
          ...spec.options.map((option) => h("label", null, h("ui-radio", { value: option.value }, h("ui-radio-indicator")), option.label)),
        ) as Live
        live.addEventListener("valuechange", (event) => set((event as CustomEvent<{ value: string | null }>).detail.value, event))
        leaveOn(live)
        control = live
        write = (value) => {
          if (live.value !== (value ?? null)) live.value = value ?? null
        }
        disable = (on) => attr(live, "disabled", on)
      } else {
        const trigger = h("button", { type: "button", "aria-required": required }, h("ui-select-value"))
        const live = h(
          "ui-select",
          null,
          h("ui-select-trigger", null, trigger),
          h("ui-select-content", null, ...spec.options.map((option) => h("ui-select-item", { value: option.value }, option.label))),
        ) as Live
        live.addEventListener("valuechange", (event) => set((event as CustomEvent<{ value: string | null }>).detail.value, event))
        // Its list takes focus while open: leaving is closing it.
        live.addEventListener("openchange", (event) => {
          if (!(event as CustomEvent<{ value: boolean }>).detail.value) apiOf().leaveField(name)
        })
        control = live
        write = (value) => {
          if (live.value !== (value ?? null)) live.value = value ?? null
        }
        disable = (on) => attr(live, "disabled", on)
      }
      break
    }
    case "boolean": {
      const live = (
        spec.display === "switch" ? h("ui-switch", { "aria-required": required }, h("ui-switch-thumb")) : h("ui-checkbox", { "aria-required": required }, h("ui-checkbox-indicator"))
      ) as Live
      live.addEventListener("checkedchange", (event) => set((event as CustomEvent<{ value: unknown }>).detail.value === true, event))
      leaveOn(live)
      write = (value) => {
        if (live.checked !== (value === true)) live.checked = value === true
      }
      disable = (on) => attr(live, "disabled", on)
      // A checkbox or switch sits before its label, on one line.
      root.append(h("div", { class: "schema-form-toggle" }, live, label))
      if (description) root.append(description)
      return { spec, root, error, write, disable }
    }
    case "tags": {
      // The tag input is a field of its own: label, description and problem included.
      const live = h("uiset-tag-input", {
        label: spec.label,
        placeholder: spec.placeholder,
        description: spec.description,
        max: spec.max,
        "max-length": spec.maxLength,
        required,
      }) as TagInputElement
      if (spec.suggestions) live.suggestions = spec.suggestions
      live.addEventListener("valuechange", (event) => set([...(event as CustomEvent<{ value: string[] }>).detail.value], event))
      leaveOn(live)
      write = (value) => {
        const next = Array.isArray(value) ? (value as string[]) : []
        if ((live.value ?? []).join("\u0000") !== next.join("\u0000")) live.value = [...next]
      }
      disable = (on) => attr(live, "disabled", on)
      const wrap = h("div", { class: "schema-form-field", "data-schema-field": name }, live)
      return { spec, root: wrap, error, write, disable, showProblem: (problem) => attr(live, "error", problem) }
    }
    case "textarea": {
      const input = h("textarea", { "aria-required": required, placeholder: spec.placeholder }) as HTMLTextAreaElement
      input.addEventListener("input", (event) => set(input.value, event))
      leaveOn(input)
      control = h("ui-textarea", null, input)
      write = (value) => {
        if (input.value !== String(value ?? "")) input.value = String(value ?? "")
      }
      disable = (on) => attr(input, "disabled", on)
      break
    }
    default: {
      const input = h("input", {
        type: spec.kind === "text" ? "text" : spec.kind,
        "aria-required": required,
        placeholder: spec.placeholder,
        autocomplete: autocompleteFor(spec.kind),
      }) as HTMLInputElement
      input.addEventListener("input", (event) => set(input.value, event))
      leaveOn(input)
      control = h("ui-input", null, input)
      write = (value) => {
        if (input.value !== String(value ?? "")) input.value = String(value ?? "")
      }
      disable = (on) => attr(input, "disabled", on)
    }
  }
  root.append(label, control)
  if (description) root.append(description)
  return { spec, root, error, write, disable }
}

type View = {
  instance: Instance
  form: HTMLFormElement
  titleId: string
  head: HTMLElement
  heading: HTMLElement | null
  description: HTMLElement
  stepper: UISetStepper
  stepsKey: string
  fields: HTMLElement
  review: HTMLElement
  reviewOf: unknown[]
  problem: HTMLElement
  done: HTMLElement
  actions: HTMLElement
  back: ReturnType<typeof button>
  next: ReturnType<typeof button>
  submit: ReturnType<typeof button>
  cache: Map<string, FieldView>
  labelsGiven?: Partial<SchemaFormLabels>
}

const views = new WeakMap<HTMLElement, View>()
// A dialog form's native submit does nothing outside an open dialog: in server HTML, before
// the element is defined, Enter or Next can't load the page with what was typed in its URL.
const formOf = (el: HTMLElement) =>
  el.querySelector<HTMLFormElement>(":scope > form") ?? el.appendChild(h("form", { class: "schema-form", novalidate: true, method: "dialog" }) as HTMLFormElement)

/** The parts that stay, made once per element: a property set draws again with them. */
function viewOf(el: HTMLElement, instance: Instance): View {
  const known = views.get(el)
  if (known) {
    known.instance = instance
    return known
  }
  const form = formOf(el)
  const titleId = uid("schema-form-title")
  const stepper = h("uiset-stepper") as UISetStepper
  const view: View = {
    instance,
    form,
    titleId,
    head: h("div", { class: "schema-form-head" }),
    heading: null,
    description: h("p"),
    stepper,
    stepsKey: "",
    fields: h("div", { class: "schema-form-fields" }),
    review: h("div", { class: "schema-form-review" }),
    reviewOf: [],
    problem: h("p", { class: "schema-form-problem", role: "alert" }),
    done: h("p", { class: "schema-form-done" }),
    actions: h("div", { class: "schema-form-actions" }),
    back: button("Back", { "data-variant": "outline" }),
    // On a step, Next is the form's submit, so Enter in any field goes on too; the form's
    // submit goes to the next step until the review. Apart from the send: one button that
    // changed into the other during its own click would send the form.
    next: button("Next", { type: "submit" }),
    submit: button("Submit", { type: "submit" }),
    cache: new Map(),
  }
  stepper.addEventListener("valuechange", (event) => {
    const api = view.instance.api
    try {
      api.goTo(Number((event as CustomEvent<{ value: string }>).detail.value), event)
    } catch {
      // A step on the way has problems: they show, and the steps show where the form is.
      stepper.value = String(view.instance.get().step)
    }
  })
  view.back.native.addEventListener("click", (event) => view.instance.api.back(event))
  // The element reports its own value once; its controls' input and change stay inside.
  keepInputInside(form)
  views.set(el, view)
  return view
}

function update(el: UISetSchemaForm, view: View) {
  const state = view.instance.get()
  const api = view.instance.api
  const { form: definition, value, errors, step, status, disabled } = state
  const labels = { ...defaultLabels, ...el.labels }
  const locale = el.getAttribute("locale") ?? (document.documentElement.lang || undefined)
  const steps = definition.steps
  const review = steps ? step >= steps.length : false
  const names = steps ? (steps[step]?.fields ?? []) : definition.names
  const hadFocus = view.form.contains(document.activeElement)

  // The title: a heading at `heading` (2 by default, "false" for none), naming the form.
  const level = el.getAttribute("heading") ?? "2"
  const tag = level === "false" ? null : `h${["2", "3", "4"].includes(level) ? level : "2"}`
  if (view.heading?.localName !== tag) {
    view.heading?.remove()
    view.heading = tag ? h(tag, { id: view.titleId }) : null
    if (view.heading) view.head.prepend(view.heading)
  }
  if (view.heading && view.heading.textContent !== definition.title) view.heading.textContent = definition.title
  if (view.description.textContent !== (definition.description ?? "")) view.description.textContent = definition.description ?? ""
  showIn(view.head, view.description, !!definition.description)
  const label = el.getAttribute("label")
  attr(view.form, "aria-label", label ?? (view.heading ? null : definition.title || null))
  attr(view.form, "aria-labelledby", label || !view.heading ? null : view.titleId)

  if (steps) {
    const items = [...steps.map((s, index) => ({ value: String(index), label: s.title, description: s.description })), { value: String(steps.length), label: labels.review }]
    const key = JSON.stringify(items)
    if (key !== view.stepsKey) {
      view.stepsKey = key
      view.stepper.steps = items
    }
    attr(view.stepper, "label", labels.steps)
    attr(view.stepper, "value", String(step))
  }

  // Fields made once per name, and again for another definition of it.
  if (view.labelsGiven !== el.labels) {
    view.labelsGiven = el.labels
    view.cache.clear()
  }
  const shown = names.map((name) => {
    const spec = definition.fields[name]!
    let field = view.cache.get(name)
    if (!field || field.spec !== spec) view.cache.set(name, (field = buildField(name, spec, () => view.instance.api, labels)))
    field.write(value[name])
    field.disable(disabled)
    const problem = errors[name]
    if (field.showProblem) field.showProblem(problem ?? null)
    else {
      ;(field.root as HTMLElement & { invalid?: boolean }).invalid = !!problem
      if (problem && field.error.textContent !== problem) field.error.textContent = problem
      showIn(field.root, field.error, !!problem)
    }
    return field.root
  })
  if (!review) place(view.fields, shown, () => true)

  if (review && (view.reviewOf[0] !== value || view.reviewOf[1] !== definition || view.reviewOf[2] !== el.labels)) {
    view.reviewOf = [value, definition, el.labels]
    view.review.replaceChildren(
      ...steps!.map((s, index) => {
        const id = `${view.titleId}-review-${index}`
        const edit = button(labels.edit(s.title), { "data-variant": "ghost" })
        edit.native.addEventListener("click", (event) => view.instance.api.goTo(index, event))
        return h(
          "section",
          { class: "schema-form-review-step", "aria-labelledby": id },
          h("header", null, h("h3", { id }, s.title), edit.wrap),
          h(
            "dl",
            null,
            ...s.fields.map((name) =>
              h("div", { class: "schema-form-review-row" }, h("dt", null, definition.fields[name]!.label), h("dd", null, shownValue(definition.fields[name]!, value[name], labels, locale))),
            ),
          ),
        )
      }),
    )
  }

  if (view.problem.textContent !== (errors.form ?? "")) view.problem.textContent = errors.form ?? ""
  const doneMessage = el.doneMessage ?? ""
  if (view.done.textContent !== doneMessage) view.done.textContent = doneMessage

  const sending = status === "submitting"
  const confirm = el.getAttribute("confirm")
  // Written only when they change: WebKit drops a click whose pressed text was replaced.
  for (const [part, text] of [
    [view.back, labels.back],
    [view.next, labels.next],
    [view.submit, sending ? labels.submitting : labels.submit],
  ] as const) {
    if (part.native.textContent !== text) part.native.textContent = text
  }
  attr(view.submit.native, "aria-disabled", sending || disabled || null)
  attr(view.submit.native, "data-agent-confirm", confirm === "false" ? null : confirm || definition.title || null)
  place(
    view.actions,
    [steps && step > 0 && view.back.wrap, steps && !review ? view.next.wrap : view.submit.wrap].filter((part): part is HTMLElement => !!part),
    () => true,
  )

  place(
    view.form,
    [
      (view.heading || definition.description) && view.head,
      steps && view.stepper,
      review ? view.review : view.fields,
      errors.form && view.problem,
      status === "done" && doneMessage && view.done,
      view.actions,
    ].filter((part): part is HTMLElement => !!part),
    (child) => [view.head, view.stepper, view.review, view.fields, view.problem, view.done, view.actions].includes(child as HTMLElement),
  )

  // After a submit or Next finds problems, the first one takes focus once its step shows.
  if (state.focus) {
    queueMicrotask(() => {
      const focus = view.instance.get().focus
      if (!focus) return
      const control = controlIn(view.form.querySelector(`[data-schema-field="${CSS.escape(focus)}"]`))
      if (!control) return
      control.focus()
      api.focused()
    })
  } else if (hadFocus && !view.form.contains(document.activeElement)) {
    // What had focus went with its step (a field on Enter, Back on the first step, an Edit on
    // the review): it goes on to the new step's first field, or to the send on the review,
    // once the new step's controls are bound (a radio group picks its tab stop then).
    queueMicrotask(() => {
      if (!view.form.contains(document.activeElement)) (review ? view.submit.native : controlIn(view.fields))?.focus()
    })
  }
}

function draw(el: UISetSchemaForm, instance: Instance) {
  const view = viewOf(el, instance)
  // One draw at a time: taking a focused field out fires its blur, whose check changes the
  // state while the draw is still placing parts. That change draws once this one is done.
  let drawing = false
  let again = false
  const run = () => {
    if (drawing) {
      again = true
      return
    }
    drawing = true
    try {
      do {
        again = false
        update(el, view)
      } while (again)
    } finally {
      drawing = false
    }
  }
  run()
  const stop = instance.subscribe(run)
  const watch = new MutationObserver(run)
  watch.observe(el, { attributeFilter: ["heading", "label", "confirm", "locale"] })
  return () => {
    stop()
    watch.disconnect()
  }
}

function defineSchemaForm() {
  createParts(schemaForm, {
    root: {
      tag: "uiset-schema-form",
      display: "block",
      // `send` is a function to call, not an event to fire: what it returns shows.
      kinds: { onSubmit: null },
      properties: ["send", "labels"],
      options: (el) => ({ onSubmit: (value: Values, details: SubmitDetails) => (el as UISetSchemaForm).send?.(value, details) }),
      // Live, as a text field's value is: read it after `input`, set it to fill the form.
      state: {
        value: { get: (api) => api.values(), set: (api, value) => api.setValues(value ?? {}) },
      },
      api: ["fill", "goTo", "next", "back", "submit", "reset"],
      // The root binds the <form> inside, so it submits as a form does and has the form role.
      target: formOf,
      render: holdRender((el, instance) => {
        reportPartInput(el, "valuechange")
        return draw(el as UISetSchemaForm, instance as unknown as Instance)
      }),
    },
  })
}

export { defineSchemaForm }
export type { UISetSchemaForm, UISetSchemaFormEvents }
