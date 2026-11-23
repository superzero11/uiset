"use client"

import { announce } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/react/primitive"
import { useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "./field"
import { maskedInput, type MaskedInputReason } from "./input-mask/input-mask"
import { maskMessages, type Mask, type MaskMessages } from "./input-mask/masks"
import { afterPress } from "./shell/after-press"
import { formatEdit } from "./shell/format-as-you-type"
import "./shell/shell.css"
import "./input-mask/input-mask.css"

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
  description?: ReactNode
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
  className?: string
}

const asText = (value: MaskedValue | undefined) => (value === null || value === undefined ? "" : String(value))

function MaskedInput({
  label,
  mask,
  value,
  defaultValue,
  onValueChange,
  validate,
  description,
  placeholder,
  name,
  form,
  required,
  disabled,
  readOnly,
  error: outside,
  onBlur,
  messages: messageOverrides,
  className,
}: MaskedInputProps) {
  const words = { ...maskMessages, ...messageOverrides }
  const [own, setOwn] = useState<MaskedValue>(defaultValue ?? null)
  const current = value === undefined ? own : value
  const [kept, setKept] = useState(() => mask.fromValue(current))
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const reported = useRef(asText(current))

  // A value set from outside (not the one this field just reported) is shown again.
  useLayoutEffect(() => {
    if (asText(current) === reported.current) return
    reported.current = asText(current)
    setKept(mask.fromValue(current))
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (caret.current === null || !inputRef.current) return
    inputRef.current.setSelectionRange(caret.current, caret.current)
    caret.current = null
  })

  // The input's own validity, so a form's submit stops on what the mask refuses.
  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(error ?? "")
  }, [error])

  const refuse = (reason: string | null) => {
    setError(reason)
    if (reason) announce(reason)
  }

  const commit = (next: string, reason: MaskedInputReason, source: MaskedInputDetails["source"]) => {
    setKept(next)
    const reportedValue = mask.value(next)
    if (asText(reportedValue) === reported.current) return
    reported.current = asText(reportedValue)
    if (value === undefined) setOwn(reportedValue)
    onValueChange?.(reportedValue, { reason, source })
  }

  const check = (at = kept) => mask.check(at, words) ?? (at ? (validate?.(mask.value(at)) ?? null) : null)

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const inputType = (event.nativeEvent as InputEvent).inputType
    if (inputType === "insertFromPaste" && mask.read) {
      const read = mask.read(input.value)
      caret.current = mask.format(read).length
      commit(read, "paste", "user")
    } else {
      const edit = formatEdit({ text: input.value, caret: input.selectionStart ?? input.value.length, inputType, before: kept }, mask)
      caret.current = edit.caret
      commit(edit.kept, inputType === "insertFromPaste" ? "paste" : "type", "user")
    }
    if (error) setError(null)
  }

  // What an agent's setValue asks for: the mask's reading and checks, and the reason back when refused.
  const request = (text: string) => {
    const read = mask.read ? mask.read(text) : mask.keep(text)
    const problem = check(read)
    if (problem) return problem
    commit(read, "set", "agent")
    refuse(null)
    return null
  }

  const problem = error ?? outside ?? null
  const addon = mask.addon?.(kept) ?? null
  const side = mask.addonAt ?? "end"
  const shown = addon && (
    // Said once when it changes, like a card's brand once its first digits are in.
    <span className="masked-input-addon" aria-live="polite" data-side={side}>
      {addon}
    </span>
  )

  return (
    <parts.Root
      aria-label={label}
      value={asText(current)}
      request={request}
      disabled={disabled}
      className={["masked-input", className].filter(Boolean).join(" ")}
      data-mask={mask.kind}
      data-agent-secret={mask.secret ? "" : undefined}
    >
      <Field invalid={problem ? true : undefined} disabled={disabled} className="masked-input-body" data-agent-hidden="">
        <FieldLabel>{label}</FieldLabel>
        <div className="masked-input-field" data-field-box="">
          {side === "start" && shown}
          <Input
            ref={inputRef}
            type="text"
            inputMode={mask.inputMode}
            autoComplete={mask.autoComplete}
            autoCapitalize={mask.kind === "iban" ? "characters" : undefined}
            spellCheck={false}
            dir="ltr"
            className="masked-input-text"
            value={mask.format(kept)}
            placeholder={placeholder ?? mask.placeholder}
            required={required}
            readOnly={readOnly}
            disabled={disabled}
            onChange={onInput}
            onBlur={() => {
              afterPress(() => refuse(check()))
              onBlur?.()
            }}
          />
          {side === "end" && shown}
        </div>
        {description && <FieldDescription>{description}</FieldDescription>}
        {problem && <FieldError match>{problem}</FieldError>}
      </Field>
      {name && <input type="hidden" name={name} form={form} value={asText(current)} disabled={disabled} />}
    </parts.Root>
  )
}

export { MaskedInput }
export { cardBrand, cardCode, cardExpiry, cardNumber, currency, iban, pattern } from "./input-mask/masks"
export type { CardBrand, Mask, MaskMessages } from "./input-mask/masks"
export type { MaskedInputDetails, MaskedInputProps, MaskedInputReason, MaskedValue }
