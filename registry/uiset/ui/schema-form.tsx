"use client"

import type { StateOf } from "@ui-sdk/core"
import { usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive"
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { DateInput } from "./date-input"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "./field"
import { NumberInput, NumberInputControl, NumberInputDecrement, NumberInputGroup, NumberInputIncrement } from "./number-input"
import { Radio, RadioGroup } from "./radio"
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select"
import { Stepper } from "./stepper"
import { Switch } from "./switch"
import { TagInput } from "./tag-input"
import { Textarea } from "./textarea"
import { schemaForm, type SchemaFormStepReason, type SchemaFormValueReason, type SubmitDetails } from "./schema-form/form"
import type { Fields, FieldSpec, FormDefinition, FormErrors, FormValues } from "./schema-form/schema"
import { autocompleteFor, controlIn, defaultLabels, shownValue, type SchemaFormLabels } from "./schema-form/labels"
import type { ChangeDetails } from "@ui-sdk/core"
import "./shell/shell.css"
import "./schema-form/schema-form.css"

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

/** One field: its label, its control, its description and its problem, connected by Field. */
function FormField({ name, field, value, error, api, disabled, labels }: { name: string; field: FieldSpec; value: unknown; error?: string; api: Api; disabled: boolean; labels: SchemaFormLabels }) {
  const set = (next: unknown) => api.setField(name, next)
  const leave = () => api.leaveField(name)
  const required = field.required || undefined
  const description = field.description && <FieldDescription>{field.description}</FieldDescription>
  const problem = error && <FieldError match>{error}</FieldError>
  const common = { disabled, "aria-required": required, onBlur: leave }
  let control: ReactNode
  switch (field.kind) {
    case "textarea":
      control = <Textarea {...common} value={value as string} placeholder={field.placeholder} onValueChange={(next) => set(next)} />
      break
    case "number":
      control = (
        <NumberInput {...common} value={value as number | null} min={field.min} max={field.max} step={field.step} onValueChange={(next) => set(next)}>
          <NumberInputGroup>
            <NumberInputDecrement aria-label={labels.decrease} />
            <NumberInputControl />
            <NumberInputIncrement aria-label={labels.increase} />
          </NumberInputGroup>
        </NumberInput>
      )
      break
    case "date":
      control = <DateInput {...common} value={(value as string) || null} min={field.min} max={field.max} onValueChange={(next) => set(next ?? "")} />
      break
    case "choice":
      control =
        field.display === "radio" ? (
          <RadioGroup {...common} value={value as string | null} onValueChange={(next) => set(next)} className="schema-form-options">
            {field.options.map((option) => (
              <label key={option.value}>
                <Radio value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        ) : (
          <Select disabled={disabled} value={value as string | null} onValueChange={(next) => set(next)} onOpenChange={(open) => !open && leave()}>
            <SelectTrigger aria-required={required} />
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      break
    case "tags":
      // The tag input is a field of its own: label, description and problem included.
      return (
        <div className="schema-form-field" data-schema-field={name}>
          <TagInput
            label={field.label}
            value={value as string[]}
            onValueChange={(next) => set(next)}
            suggestions={field.suggestions}
            max={field.max}
            maxLength={field.maxLength}
            description={field.description}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            error={error}
            onBlur={leave}
          />
        </div>
      )
    case "boolean": {
      const Toggle = field.display === "switch" ? Switch : Checkbox
      return (
        <Field name={name} invalid={error ? true : undefined} className="schema-form-field" data-schema-field={name}>
          <div className="schema-form-toggle">
            <Toggle disabled={disabled} aria-required={required} checked={value === true} onCheckedChange={(next: unknown) => set(next === true)} />
            <FieldLabel>{field.label}</FieldLabel>
          </div>
          {description}
          {problem}
        </Field>
      )
    }
    default:
      control = (
        <Input
          {...common}
          type={field.kind === "text" ? "text" : field.kind}
          value={value as string}
          placeholder={field.placeholder}
          autoComplete={autocompleteFor(field.kind)}
          onValueChange={(next) => set(next)}
        />
      )
  }
  return (
    <Field name={name} invalid={error ? true : undefined} className="schema-form-field" data-schema-field={name}>
      <FieldLabel>{field.label}</FieldLabel>
      {control}
      {description}
      {problem}
    </Field>
  )
}

function FormBody({
  state,
  api,
  titleId,
  heading,
  labels,
  confirm,
  locale,
  doneMessage,
}: {
  state: RootState
  api: Api
  titleId: string
  heading: 2 | 3 | 4 | false
  labels: SchemaFormLabels
  confirm: string | false
  locale?: string
  doneMessage?: string
}) {
  const { form, value, errors, step, status, disabled } = state
  const body = useRef<HTMLDivElement>(null)
  const steps = form.steps
  const review = steps ? step >= steps.length : false
  const names = steps ? (steps[step]?.fields ?? []) : form.names

  // After a submit or Next finds problems, the first one takes focus once it's drawn.
  useEffect(() => {
    if (!state.focus) return
    controlIn(body.current?.closest("form")?.querySelector(`[data-schema-field="${CSS.escape(state.focus)}"]`))?.focus()
    api.focused()
  }, [state.focus, api])

  // What had focus may go with its step (a field on Enter, Back on the first step, an Edit on
  // the review): focus goes on to the new step's first field, or to the send on the review,
  // once the new step's controls are bound (a radio group picks its tab stop then). A blur
  // with nowhere to go is settled after the draw that caused it.
  const focusInside = useRef(false)
  useLayoutEffect(() => {
    const root = body.current
    if (!root || !focusInside.current || state.focus || root.contains(document.activeElement)) return
    queueMicrotask(() => {
      if (root.contains(document.activeElement)) return
      ;(review ? root.querySelector<HTMLElement>(".schema-form-actions [type=submit]") : controlIn(root.querySelector(".schema-form-fields")))?.focus()
    })
    // Only a step change takes the focused element out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const Heading = heading ? (`h${heading}` as const) : null
  const sending = status === "submitting"
  return (
    <div
      ref={body}
      className="schema-form-body"
      onFocus={() => (focusInside.current = true)}
      onBlur={() => queueMicrotask(() => (focusInside.current = !!body.current?.contains(document.activeElement)))}
    >
      {(Heading || form.description) && (
        <div className="schema-form-head">
          {Heading && <Heading id={titleId}>{form.title}</Heading>}
          {form.description && <p>{form.description}</p>}
        </div>
      )}
      {steps && (
        <Stepper
          label={labels.steps}
          steps={[...steps.map((s, index) => ({ value: String(index), label: s.title, description: s.description })), { value: String(steps.length), label: labels.review }]}
          value={String(step)}
          onValueChange={(next) => api.goTo(Number(next))}
        />
      )}
      {review ? (
        <div className="schema-form-review">
          {steps!.map((s, index) => (
            <section key={s.title} className="schema-form-review-step" aria-labelledby={`${titleId}-review-${index}`}>
              <header>
                <h3 id={`${titleId}-review-${index}`}>{s.title}</h3>
                <Button type="button" variant="ghost" onClick={(event) => api.goTo(index, event.nativeEvent)}>
                  {labels.edit(s.title)}
                </Button>
              </header>
              <dl>
                {s.fields.map((name) => (
                  <div key={name} className="schema-form-review-row">
                    <dt>{form.fields[name]!.label}</dt>
                    <dd>{shownValue(form.fields[name]!, value[name], labels, locale)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <div className="schema-form-fields">
          {names.map((name) => (
            <FormField key={name} name={name} field={form.fields[name]!} value={value[name]} error={errors[name]} api={api} disabled={disabled} labels={labels} />
          ))}
        </div>
      )}
      {errors.form && (
        <p className="schema-form-problem" role="alert">
          {errors.form}
        </p>
      )}
      {status === "done" && doneMessage && <p className="schema-form-done">{doneMessage}</p>}
      <div className="schema-form-actions">
        {steps && step > 0 && (
          <Button type="button" variant="outline" onClick={(event) => api.back(event.nativeEvent)}>
            {labels.back}
          </Button>
        )}
        {/* On a step, Next is the form's submit, so Enter in any field goes on too; the form's
            submit goes to the next step until the review. Keyed apart from the send: one
            button that changed into the other during its own click would send the form. */}
        {steps && !review ? (
          <Button key="next" type="submit">
            {labels.next}
          </Button>
        ) : (
          <Button key="submit" type="submit" aria-disabled={sending || disabled || undefined} data-agent-confirm={confirm || undefined}>
            {sending ? labels.submitting : labels.submit}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * A form drawn from one definition: its fields with UISet's controls, its steps and a review,
 * checked as people type and on submit. An agent fills it by field name or label with `fill`,
 * and a person approves the submit (`confirm`). `formTool` makes the same definition a tool.
 */
function SchemaForm<F extends Fields>({
  form,
  value,
  defaultValue,
  onValueChange,
  step,
  defaultStep,
  onStepChange,
  onSubmit,
  disabled,
  confirm,
  doneMessage,
  heading = 2,
  labels: given,
  locale,
  className,
  ...props
}: SchemaFormProps<F>) {
  const titleId = useId()
  const labels = { ...defaultLabels, ...given }
  const handle = usePrimitive(schemaForm, {
    form: form as FormDefinition,
    value: value as Record<string, unknown> | undefined,
    defaultValue: defaultValue && { ...(defaultValue as Record<string, unknown>) },
    onValueChange: onValueChange as ((value: Record<string, unknown>, details: ChangeDetails<SchemaFormValueReason>) => void) | undefined,
    step,
    defaultStep,
    onStepChange,
    onSubmit: onSubmit as ((value: Record<string, unknown>, details: SubmitDetails) => void | FormErrors | Promise<void | FormErrors>) | undefined,
    disabled,
    doneMessage,
  })
  return usePart(
    handle,
    "root",
    {},
    {
      "aria-labelledby": heading ? titleId : undefined,
      // The form checks its own fields, so the browser's bubbles stay out of the way.
      noValidate: true,
      // Before hydration a native submit (Enter, or Next) would load the page with what was
      // typed in its URL. Outside an open dialog, a dialog form's submit does nothing.
      method: "dialog",
      ...props,
      className: ["schema-form", className].filter(Boolean).join(" "),
      children: (state: RootState) => (
        <FormBody
          state={state}
          api={handle.api}
          titleId={titleId}
          heading={heading}
          labels={labels}
          confirm={confirm === undefined ? form.title : confirm}
          locale={locale}
          doneMessage={doneMessage}
        />
      ),
    },
    "form",
  )
}

export { SchemaForm }
export { defineForm, toJSONSchema, validateForm } from "./schema-form/schema"
export { formTool, registerFormTool } from "./schema-form/tool"
export type { FormTool, FormToolOptions, FormToolResult } from "./schema-form/tool"
export type { SchemaFormLabels, SchemaFormProps }
export type { FieldSpec, FormDefinition, FormErrors, FormValues, StandardSchemaV1 } from "./schema-form/schema"
