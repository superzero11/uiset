import type { JSX } from "@solidjs/web"
import { announce } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/solid/primitive"
import { createEffect, createMemo, createSignal, Show } from "solid-js"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "./field"
import { maskedInput, type MaskedInputReason } from "../../registry/uiset/ui/input-mask/input-mask"
import { maskMessages, type Mask, type MaskMessages } from "../../registry/uiset/ui/input-mask/masks"
import { afterPress } from "../../registry/uiset/ui/shell/after-press"
import { formatEdit } from "../../registry/uiset/ui/shell/format-as-you-type"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/input-mask/input-mask.css"

const parts = createParts(maskedInput, { root: "div" })

type MaskedValue = string | number | null

type MaskedInputDetails = { reason: MaskedInputReason; source: "user" | "agent" }

type MaskedInputProps = {
  /** What the field is, like "Card number". It names it. */
  label: string
  /** How it formats and checks: `cardNumber()`, `cardExpiry()`, `cardCode()`, `iban()`, `currency()`, `pattern()`. */
  mask: Mask
  /** What the field reports: text without separators, or a number for an amount. */
  value?: MaskedValue
  defaultValue?: MaskedValue
  onValueChange?: (value: MaskedValue, details: MaskedInputDetails) => void
  /** What's wrong beyond the mask's own checks, or nothing. */
  validate?: (value: MaskedValue) => string | null | undefined
  description?: JSX.Element
  /** The mask's example by default. */
  placeholder?: string
  /** The name the value submits under. */
  name?: string
  form?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  /** A problem from outside, like a form's. The field's own check shows first. */
  error?: string | null
  /** Runs when focus leaves the field. */
  onBlur?: () => void
  messages?: Partial<MaskMessages>
  class?: string
}

const asText = (value: MaskedValue | undefined) => (value === null || value === undefined ? "" : String(value))

function MaskedInput(props: MaskedInputProps) {
  const words = () => ({ ...maskMessages, ...props.messages })
  const [own, setOwn] = createSignal<MaskedValue>(() => props.defaultValue ?? null)
  const current = () => (props.value === undefined ? own() : props.value)
  // What was typed, and the value it reported. While the value is still that one, the field
  // shows what was typed ("12." stays "12."); a value set from outside is read anew.
  const [typed, setTyped] = createSignal<{ text: string; value: string } | null>(null)
  const kept = createMemo(() => {
    const was = typed()
    return was && was.value === asText(current()) ? was.text : props.mask.fromValue(current())
  })
  const [error, setError] = createSignal<string | null>(null)
  let input: HTMLInputElement | undefined

  // The field's text follows the value set from outside. What's typed is written as it's typed.
  createEffect(
    () => props.mask.format(kept()),
    (text) => {
      if (input && input.value !== text) input.value = text
    },
  )
  // The input's own validity, so a form's submit stops on what the mask refuses.
  createEffect(
    () => error(),
    (reason) => input?.setCustomValidity(reason ?? ""),
  )

  const refuse = (reason: string | null) => {
    setError(reason)
    if (reason) announce(reason)
  }

  const commit = (next: string, reason: MaskedInputReason, source: MaskedInputDetails["source"]) => {
    const reportedValue = props.mask.value(next)
    setTyped({ text: next, value: asText(reportedValue) })
    if (asText(reportedValue) === asText(current())) return
    if (props.value === undefined) setOwn(reportedValue)
    props.onValueChange?.(reportedValue, { reason, source })
  }

  const check = (at = kept()) => props.mask.check(at, words()) ?? (at ? (props.validate?.(props.mask.value(at)) ?? null) : null)

  const onInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    const field = event.currentTarget
    const inputType = event.inputType
    let next: string
    let caret: number
    if (inputType === "insertFromPaste" && props.mask.read) {
      next = props.mask.read(field.value)
      caret = props.mask.format(next).length
    } else {
      const edit = formatEdit({ text: field.value, caret: field.selectionStart ?? field.value.length, inputType, before: kept() }, props.mask)
      next = edit.kept
      caret = edit.caret
    }
    // Written now, caret and all: what was refused never shows.
    field.value = props.mask.format(next)
    field.setSelectionRange(caret, caret)
    commit(next, inputType === "insertFromPaste" ? "paste" : "type", "user")
    if (error()) setError(null)
  }

  // What an agent's setValue asks for: the mask's reading and checks, and the reason back when refused.
  const request = (text: string) => {
    const read = props.mask.read ? props.mask.read(text) : props.mask.keep(text)
    const problem = check(read)
    if (problem) return problem
    commit(read, "set", "agent")
    refuse(null)
    return null
  }

  const problem = () => error() ?? props.error ?? null
  const side = () => props.mask.addonAt ?? "end"
  const addon = (at: "start" | "end") => (
    <Show when={side() === at && props.mask.addon?.(kept())}>
      {(text) => (
        // Said once when it changes, like a card's brand once its first digits are in.
        <span class="masked-input-addon" aria-live="polite" data-side={at}>
          {text()}
        </span>
      )}
    </Show>
  )

  return (
    <parts.Root
      aria-label={props.label}
      value={asText(current())}
      request={request}
      disabled={props.disabled}
      class={["masked-input", props.class]}
      data-mask={props.mask.kind}
      data-agent-secret={props.mask.secret ? "" : undefined}
    >
      <Field invalid={problem() ? true : undefined} disabled={props.disabled} class="masked-input-body" data-agent-hidden="">
        <FieldLabel>{props.label}</FieldLabel>
        <div class="masked-input-field" data-field-box="">
          {addon("start")}
          <Input
            ref={(el: HTMLInputElement) => {
              input = el
            }}
            type="text"
            inputmode={props.mask.inputMode}
            autocomplete={props.mask.autoComplete}
            autocapitalize={props.mask.kind === "iban" ? "characters" : undefined}
            spellcheck={false}
            dir="ltr"
            class="masked-input-text"
            placeholder={props.placeholder ?? props.mask.placeholder}
            required={props.required}
            readonly={props.readOnly}
            disabled={props.disabled}
            onInput={onInput}
            onBlur={() => {
              afterPress(() => refuse(check()))
              props.onBlur?.()
            }}
          />
          {addon("end")}
        </div>
        <Show when={props.description}>{(description) => <FieldDescription>{description()}</FieldDescription>}</Show>
        <Show when={problem()}>
          {(text) => <FieldError match>{text()}</FieldError>}
        </Show>
      </Field>
      <Show when={props.name}>{(name) => <input type="hidden" name={name()} form={props.form} value={asText(current())} disabled={props.disabled} />}</Show>
    </parts.Root>
  )
}

export { MaskedInput }
export { cardBrand, cardCode, cardExpiry, cardNumber, currency, iban, pattern } from "../../registry/uiset/ui/input-mask/masks"
export type { CardBrand, Mask, MaskMessages } from "../../registry/uiset/ui/input-mask/masks"
export type { MaskedInputDetails, MaskedInputProps, MaskedInputReason, MaskedValue }
