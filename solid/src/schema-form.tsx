import type { JSX } from "@solidjs/web"
import { Dynamic } from "@solidjs/web"
import type { ChangeDetails, StateOf } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/solid/primitive"
import { createEffect, createSignal, createUniqueId, For, Match, omit, onSettled, Show, Switch as Choose } from "solid-js"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { DateInput } from "./date-input"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "./field"
import { NumberInput, NumberInputControl, NumberInputDecrement, NumberInputGroup, NumberInputIncrement } from "./number-input"
import { Radio, RadioGroup } from "./radio"
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select"
import { Stepper } from "./stepper"
import { Switch } from "./switch"
import { MaskedInput } from "./input-mask"
import { TagInput } from "./tag-input"
import { Textarea } from "./textarea"
import { schemaForm, type SchemaFormStepReason, type SchemaFormValueReason, type SubmitDetails } from "../../registry/uiset/ui/schema-form/form"
import type { ChoiceField, Fields, FieldSpec, FormDefinition, FormErrors, FormValues, PhoneField, TagsField, TextField } from "../../registry/uiset/ui/schema-form/schema"
import { maskNamed } from "../../registry/uiset/ui/input-mask/masks"
import { autocompleteFor, controlIn, defaultLabels, focusProblem, shownValue, type SchemaFormLabels } from "../../registry/uiset/ui/schema-form/labels"
import { afterPress } from "../../registry/uiset/ui/shell/after-press"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/schema-form/schema-form.css"

type RootState = StateOf<typeof schemaForm, "root">
type Api = ReturnType<typeof usePrimitive<typeof schemaForm>>["api"]

type SchemaFormProps<F extends Fields> = Omit<PartProps<"form", RootState>, "children" | "defaultValue" | "onSubmit" | "title"> & {
  /** What `defineForm` returns: the fields, their rules, and the steps. */
  form: FormDefinition<F>
  value?: FormValues<F>
  defaultValue?: Partial<FormValues<F>>
  onValueChange?: (value: FormValues<F>, details: ChangeDetails<SchemaFormValueReason>) => void
  step?: number
  defaultStep?: number
  onStepChange?: (step: number, details: ChangeDetails<SchemaFormStepReason>) => void
  /** Sends the values once they pass. Return problems by field, or under `form`, to show them. */
  onSubmit?: (value: FormValues<F>, details: SubmitDetails) => void | FormErrors | Promise<void | FormErrors>
  disabled?: boolean
  /**
   * What the submit does, as a sentence a person approves when an agent presses it, like
   * "Sends the invite to the address given". An agent fills the form; a person sends it.
   * `false` lets an agent send it on its own.
   */
  confirm?: string | false
  /** Said, and shown under the form, once it's sent. */
  doneMessage?: string
  /** The title's heading level, or `false` to leave the title to your page (then give `aria-label`). */
  heading?: 2 | 3 | 4 | false
  labels?: Partial<SchemaFormLabels>
  locale?: string
}

// The phone input (and libphonenumber-js) loads only when a form has one, once it's on the page.
// The server and the hydrating page both draw the plain field first, so they agree, and no
// asset manifest is needed, which Solid's lazy() asks the server for.
type PhoneInputComponent = typeof import("./phone-input").PhoneInput
let phoneCode: Promise<PhoneInputComponent> | undefined
const loadPhone = () => (phoneCode ??= import("./phone-input").then((module) => module.PhoneInput))

/** The phone input once its code is in, and the fallback until then. */
function WithPhoneInput(props: { fallback: JSX.Element; children: (PhoneInput: PhoneInputComponent) => JSX.Element }) {
  const [phoneInput, setPhoneInput] = createSignal<PhoneInputComponent | undefined>(undefined)
  onSettled(() => {
    let live = true
    void loadPhone().then((component) => live && setPhoneInput(() => component))
    return () => {
      live = false
    }
  })
  return (
    <Show when={phoneInput()} keyed fallback={props.fallback}>
      {(component) => props.children(component)}
    </Show>
  )
}

type FieldProps = {
  name: string
  field: FieldSpec
  value: unknown
  error?: string
  api: Api
  disabled: boolean
  labels: SchemaFormLabels
  words: FormDefinition["words"]
}

/** One field: its label, its control, its description and its problem, connected by Field. */
function FormField(props: FieldProps) {
  const set = (next: unknown) => props.api.setField(props.name, next)
  const leave = () => afterPress(() => props.api.leaveField(props.name))
  const required = () => (props.field.required ? ("true" as const) : undefined)
  const description = () => (
    <Show when={props.field.description}>
      <FieldDescription>{props.field.description}</FieldDescription>
    </Show>
  )
  const problem = () => <Show when={props.error}>{(error) => <FieldError match>{error()}</FieldError>}</Show>
  const common = () => ({ disabled: props.disabled, "aria-required": required(), onBlur: leave })
  // A field of its own (its label, description and problem inside), as the tag, phone and
  // masked inputs are; every other kind is a control inside UISet's Field.
  const mask = () => {
    const given = (props.field as TextField).mask
    if (!given) return null
    return typeof given === "string" ? maskNamed(given) : maskNamed("pattern", { pattern: given.pattern })
  }
  const inField = (control: JSX.Element) => (
    <Field name={props.name} invalid={props.error ? true : undefined} class="schema-form-field" data-schema-field={props.name}>
      <FieldLabel>{props.field.label}</FieldLabel>
      {control}
      {description()}
      {problem()}
    </Field>
  )
  const choice = () => props.field as ChoiceField
  const phone = () => props.field as PhoneField
  const tags = () => props.field as TagsField
  return (
    <Choose
      fallback={inField(
        <Input
          {...common()}
          type={props.field.kind === "text" ? "text" : props.field.kind}
          value={props.value as string}
          placeholder={(props.field as TextField).placeholder}
          autocomplete={autocompleteFor(props.field.kind)}
          onValueChange={(next) => set(next)}
        />,
      )}
    >
      <Match when={props.field.kind === "textarea"}>
        {inField(<Textarea {...common()} value={props.value as string} placeholder={(props.field as TextField).placeholder} onValueChange={(next) => set(next)} />)}
      </Match>
      <Match when={props.field.kind === "number" && props.field}>
        {(field) => {
          const number = () => field() as Extract<FieldSpec, { kind: "number" }>
          return inField(
            <NumberInput
              {...common()}
              value={props.value as number | null}
              min={number().min}
              max={number().max}
              step={number().step}
              format={number().currency ? { style: "currency", currency: number().currency! } : undefined}
              onValueChange={(next) => set(next)}
            >
              <NumberInputGroup>
                <NumberInputDecrement aria-label={props.labels.decrease} />
                <NumberInputControl />
                <NumberInputIncrement aria-label={props.labels.increase} />
              </NumberInputGroup>
            </NumberInput>,
          )
        }}
      </Match>
      <Match when={props.field.kind === "date" && props.field}>
        {(field) => {
          const date = () => field() as Extract<FieldSpec, { kind: "date" }>
          return inField(<DateInput {...common()} value={(props.value as string) || null} min={date().min} max={date().max} onValueChange={(next) => set(next ?? "")} />)
        }}
      </Match>
      <Match when={props.field.kind === "choice" && choice().display === "radio"}>
        {inField(
          <RadioGroup {...common()} value={props.value as string | null} onValueChange={(next) => set(next)} class="schema-form-options">
            <For each={choice().options}>
              {(option) => (
                <label>
                  <Radio value={option.value} />
                  {option.label}
                </label>
              )}
            </For>
          </RadioGroup>,
        )}
      </Match>
      <Match when={props.field.kind === "choice"}>
        {inField(
          <Select disabled={props.disabled} value={props.value as string | null} onValueChange={(next) => set(next)} onOpenChange={(open) => !open && leave()}>
            <SelectTrigger aria-required={required()} />
            <SelectContent>
              <For each={choice().options}>{(option) => <SelectItem value={option.value}>{option.label}</SelectItem>}</For>
            </SelectContent>
          </Select>,
        )}
      </Match>
      <Match when={props.field.kind === "phone"}>
        <div class="schema-form-field" data-schema-field={props.name}>
          {/* Until its code is in, a plain field takes the number. */}
          <WithPhoneInput
            fallback={
              <Field name={props.name} invalid={props.error ? true : undefined} class="schema-form-field">
                <FieldLabel>{props.field.label}</FieldLabel>
                <Input {...common()} type="tel" autocomplete="tel" value={props.value as string} placeholder={phone().placeholder} onValueChange={(next) => set(next)} />
                {description()}
                {problem()}
              </Field>
            }
          >
            {(PhoneInput) => (
              <PhoneInput
                label={props.field.label}
                value={props.value as string}
                onValueChange={(next) => set(next)}
                defaultCountry={phone().defaultCountry}
                countries={phone().countries}
                description={props.field.description}
                placeholder={phone().placeholder}
                required={props.field.required}
                disabled={props.disabled}
                error={props.error}
                onBlur={leave}
                messages={{ tooShort: () => props.words.phoneTooShort(props.field.label), tooLong: () => props.words.phoneTooLong(props.field.label), invalid: () => props.words.phoneInvalid(props.field.label) }}
              />
            )}
          </WithPhoneInput>
        </div>
      </Match>
      <Match when={props.field.kind === "tags"}>
        <div class="schema-form-field" data-schema-field={props.name}>
          <TagInput
            label={props.field.label}
            value={props.value as string[]}
            onValueChange={(next) => set(next)}
            suggestions={tags().suggestions}
            max={tags().max}
            maxLength={tags().maxLength}
            description={props.field.description}
            placeholder={tags().placeholder}
            required={props.field.required}
            disabled={props.disabled}
            error={props.error}
            onBlur={leave}
          />
        </div>
      </Match>
      <Match when={props.field.kind === "boolean"}>
        <Field name={props.name} invalid={props.error ? true : undefined} class="schema-form-field" data-schema-field={props.name}>
          <div class="schema-form-toggle">
            <Dynamic
              component={(props.field as Extract<FieldSpec, { kind: "boolean" }>).display === "switch" ? Switch : Checkbox}
              disabled={props.disabled}
              aria-required={required()}
              checked={props.value === true}
              onCheckedChange={(next: unknown) => set(next === true)}
            />
            <FieldLabel>{props.field.label}</FieldLabel>
          </div>
          {description()}
          {problem()}
        </Field>
      </Match>
      <Match when={mask()}>
        {(given) => (
          <div class="schema-form-field" data-schema-field={props.name}>
            <MaskedInput
              label={props.field.label}
              mask={given()}
              value={props.value as string}
              onValueChange={(next) => set(next === null ? "" : String(next))}
              description={props.field.description}
              placeholder={(props.field as TextField).placeholder}
              required={props.field.required}
              disabled={props.disabled}
              error={props.error}
              onBlur={leave}
              messages={props.words.masks}
            />
          </div>
        )}
      </Match>
    </Choose>
  )
}

function FormBody(props: {
  state: RootState
  api: Api
  titleId: string
  heading: 2 | 3 | 4 | false
  labels: SchemaFormLabels
  confirm: string | false
  locale?: string
  doneMessage?: string
}) {
  let body: HTMLDivElement | undefined
  const form = () => props.state.form
  const steps = () => form().steps
  const review = () => (steps() ? props.state.step >= steps()!.length : false)
  const names = () => (steps() ? (steps()![props.state.step]?.fields ?? []) : form().names)

  // After a submit or Next finds problems, the first one takes focus once it's drawn.
  createEffect(
    () => ({ focus: props.state.focus, problem: props.state.focus ? props.state.errors[props.state.focus] : undefined }),
    ({ focus, problem }) => {
      if (!focus) return
      focusProblem(body?.closest("form")?.querySelector(`[data-schema-field="${CSS.escape(focus)}"]`), problem)
      // Cleared after this flush: clearing it here would rerun this effect off its own write.
      queueMicrotask(() => props.api.focused())
    },
  )

  // What had focus may go with its step (a field on Enter, Back on the first step, an Edit on
  // the review): focus goes on to the new step's first field, or to the send on the review,
  // once the new step's controls are bound (a radio group picks its tab stop then).
  let focusInside = false
  createEffect(
    () => ({ step: props.state.step, focus: props.state.focus }),
    (now, before) => {
      const root = body
      if (!before || now.step === before.step) return
      if (!root || !focusInside || now.focus || root.contains(document.activeElement)) return
      queueMicrotask(() => {
        if (root.contains(document.activeElement)) return
        ;(root.querySelector(".schema-form-review") ? root.querySelector<HTMLElement>(".schema-form-actions [type=submit]") : controlIn(root.querySelector(".schema-form-fields")))?.focus()
      })
    },
  )

  const sending = () => props.state.status === "submitting"
  return (
    <div
      ref={(el) => (body = el)}
      class="schema-form-body"
      onFocusIn={() => (focusInside = true)}
      onFocusOut={() => queueMicrotask(() => (focusInside = !!body?.contains(document.activeElement)))}
    >
      <Show when={props.heading || form().description}>
        <div class="schema-form-head">
          <Show when={props.heading}>
            {(level) => (
              <Dynamic component={`h${level()}`} id={props.titleId}>
                {form().title}
              </Dynamic>
            )}
          </Show>
          <Show when={form().description}>
            <p>{form().description}</p>
          </Show>
        </div>
      </Show>
      <Show when={steps()}>
        {(list) => (
          <Stepper
            label={props.labels.steps}
            steps={[...list().map((s, index) => ({ value: String(index), label: s.title, description: s.description })), { value: String(list().length), label: props.labels.review }]}
            value={String(props.state.step)}
            onValueChange={(next) => props.api.goTo(Number(next))}
          />
        )}
      </Show>
      <Show
        when={review()}
        fallback={
          <div class="schema-form-fields">
            <For each={names()}>
              {(name) => (
                <FormField
                  name={name}
                  field={form().fields[name]!}
                  value={props.state.value[name]}
                  error={props.state.errors[name]}
                  api={props.api}
                  disabled={props.state.disabled}
                  labels={props.labels}
                  words={form().words}
                />
              )}
            </For>
          </div>
        }
      >
        <div class="schema-form-review">
          <For each={steps()!}>
            {(s, index) => (
              <section class="schema-form-review-step" aria-labelledby={`${props.titleId}-review-${index()}`}>
                <header>
                  <h3 id={`${props.titleId}-review-${index()}`}>{s.title}</h3>
                  <Button type="button" variant="ghost" onClick={(event) => props.api.goTo(index(), event)}>
                    {props.labels.edit(s.title)}
                  </Button>
                </header>
                <dl>
                  <For each={s.fields}>
                    {(name) => (
                      <div class="schema-form-review-row">
                        <dt>{form().fields[name]!.label}</dt>
                        <dd>{shownValue(form().fields[name]!, props.state.value[name], props.labels, props.locale)}</dd>
                      </div>
                    )}
                  </For>
                </dl>
              </section>
            )}
          </For>
        </div>
      </Show>
      <Show when={props.state.errors.form}>
        {(problem) => (
          <p class="schema-form-problem" role="alert">
            {problem()}
          </p>
        )}
      </Show>
      <Show when={props.state.status === "done" && props.doneMessage}>{(done) => <p class="schema-form-done">{done()}</p>}</Show>
      <div class="schema-form-actions">
        <Show when={steps() && props.state.step > 0}>
          <Button type="button" variant="outline" onClick={(event) => props.api.back(event)}>
            {props.labels.back}
          </Button>
        </Show>
        {/* On a step, Next is the form's submit, so Enter in any field goes on too; the form's
            submit goes to the next step until the review. A separate element from the send: one
            button that changed into the other during its own click would send the form. */}
        <Show
          when={steps() && !review()}
          fallback={
            <Button type="submit" aria-disabled={sending() || props.state.disabled ? "true" : undefined} data-agent-confirm={props.confirm || undefined}>
              {sending() ? props.labels.submitting : props.labels.submit}
            </Button>
          }
        >
          <Button type="submit">{props.labels.next}</Button>
        </Show>
      </div>
    </div>
  )
}

/**
 * A form drawn from one definition: its fields with UISet's controls, its steps and a review,
 * checked as people type and on submit. An agent fills it by field name or label with `fill`,
 * and a person approves the submit (`confirm`). `formTool` makes the same definition a tool.
 */
function SchemaForm<F extends Fields>(props: SchemaFormProps<F>) {
  const titleId = createUniqueId()
  const labels = () => ({ ...defaultLabels, ...props.labels })
  const heading = () => (props.heading === undefined ? 2 : props.heading)
  const handle = usePrimitive(schemaForm, () => ({
    form: props.form as FormDefinition,
    value: props.value as Record<string, unknown> | undefined,
    defaultValue: props.defaultValue && { ...(props.defaultValue as Record<string, unknown>) },
    onValueChange: props.onValueChange as ((value: Record<string, unknown>, details: ChangeDetails<SchemaFormValueReason>) => void) | undefined,
    step: props.step,
    defaultStep: props.defaultStep,
    onStepChange: props.onStepChange,
    onSubmit: props.onSubmit as ((value: Record<string, unknown>, details: SubmitDetails) => void | FormErrors | Promise<void | FormErrors>) | undefined,
    disabled: props.disabled,
    doneMessage: props.doneMessage,
  }))
  const rest = omit(props, "form", "value", "defaultValue", "onValueChange", "step", "defaultStep", "onStepChange", "onSubmit", "disabled", "confirm", "doneMessage", "heading", "labels", "locale", "class")
  return usePart(
    handle,
    "root",
    undefined,
    {
      get "aria-labelledby"() {
        return heading() ? titleId : undefined
      },
      // The form checks its own fields, so the browser's bubbles stay out of the way.
      novalidate: true,
      // Before hydration a native submit (Enter, or Next) would load the page with what was
      // typed in its URL. Outside an open dialog, a dialog form's submit does nothing.
      method: "dialog",
      ...rest,
      get class() {
        return ["schema-form", props.class as string | undefined]
      },
      // The body reads the state it shows, where it shows it: nothing here reads it.
      children: (state: RootState) => (
        <FormBody
          state={state}
          api={handle.api}
          titleId={titleId}
          heading={heading()}
          labels={labels()}
          confirm={props.confirm === undefined ? props.form.title : props.confirm}
          locale={props.locale}
          doneMessage={props.doneMessage}
        />
      ),
    },
    "form",
  )
}

export { SchemaForm }
export { defineForm, toJSONSchema, validateForm } from "../../registry/uiset/ui/schema-form/schema"
export { formTool, registerFormTool } from "../../registry/uiset/ui/schema-form/tool"
export type { FormTool, FormToolOptions, FormToolResult } from "../../registry/uiset/ui/schema-form/tool"
export type { SchemaFormLabels, SchemaFormProps }
export type { FieldSpec, FormDefinition, FormErrors, FormValues, StandardSchemaV1 } from "../../registry/uiset/ui/schema-form/schema"
