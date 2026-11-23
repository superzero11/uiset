"use client"

import { announce } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/react/primitive"
import { parsePhoneNumberFromString } from "libphonenumber-js/min"
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "./combobox"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "./field"
import { afterPress } from "./shell/after-press"
import { Icon } from "./shell/icons"
import { phoneInput, type PhoneInputReason } from "./phone-input/phone-input"
import {
  checkPhone,
  countryList,
  countryOf,
  editPhone,
  findCountry,
  keepPhone,
  phoneMessages,
  readPhone,
  showPhone,
  startCountry,
  typePhone,
  type CountryCode,
  type PhoneMessages,
} from "./phone-input/phone"
import "./shell/shell.css"
import "./phone-input/phone-input.css"

const parts = createParts(phoneInput, { root: "div" })

type PhoneInputDetails = { reason: PhoneInputReason; source: "user" | "agent" }

type PhoneInputProps = {
  /** What the number is, like "Phone" or "Mobile". It names the field. */
  label: string
  /** The number in E.164, like "+14155550123", or "" for none. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: PhoneInputDetails) => void
  /** The country, an ISO code like "GB". A typed calling code changes it. */
  country?: string
  /** The country to start in. By default, the page language's region, else the United States. */
  defaultCountry?: string
  onCountryChange?: (country: string, details: PhoneInputDetails) => void
  /** Only these countries, by code. */
  countries?: readonly string[]
  /** These countries first in the list, by code. */
  preferredCountries?: readonly string[]
  /** What's wrong with a number beyond its country's rules, or nothing. */
  validate?: (value: string) => string | null | undefined
  /** A line under the field. */
  description?: ReactNode
  placeholder?: string
  /** The name the number submits under, in E.164. */
  name?: string
  form?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  /** A problem from outside, like a form's. The field's own check shows first. */
  error?: string | null
  /** Runs when focus leaves the number. */
  onBlur?: () => void
  /** The language country names are in. The page's by default. */
  locale?: string
  messages?: Partial<PhoneMessages>
  className?: string
}

function PhoneInput({
  label,
  value,
  defaultValue,
  onValueChange,
  country: countryProp,
  defaultCountry,
  onCountryChange,
  countries,
  preferredCountries,
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
  locale,
  messages: messageOverrides,
  className,
}: PhoneInputProps) {
  const messages = { ...phoneMessages, ...messageOverrides }
  const [initial] = useState(() =>
    showPhone(
      value ?? defaultValue ?? "",
      startCountry(countryProp ?? defaultCountry, locale),
    ),
  )
  const [ownValue, setOwnValue] = useState(value ?? defaultValue ?? "")
  const [ownCountry, setOwnCountry] = useState<CountryCode>(initial.country)
  const number = value ?? ownValue
  const country = (countryProp ? startCountry(countryProp) : ownCountry) as CountryCode
  const [text, setText] = useState(initial.text)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const kept = useRef(keepPhone(initial.text))
  const shownFor = useRef(number)
  const caret = useRef<number | null>(null)
  const list = useMemo(
    () => countryList({ locale, only: countries, preferred: preferredCountries }),
    [locale, countries, preferredCountries],
  )
  const current = countryOf(country, locale)

  // A value set from outside (not the one this field just reported) is shown again.
  useLayoutEffect(() => {
    if (number === shownFor.current) return
    shownFor.current = number
    const shown = showPhone(number, country)
    kept.current = keepPhone(shown.text)
    setText(shown.text)
    if (shown.country !== country && countryProp === undefined)
      setOwnCountry(shown.country)
  }, [number]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (caret.current === null || !inputRef.current) return
    inputRef.current.setSelectionRange(caret.current, caret.current)
    caret.current = null
  })

  const refuse = (reason: string | null) => {
    setError(reason)
    if (reason) announce(reason)
  }

  const commit = (
    next: string,
    nextCountry: CountryCode,
    reason: PhoneInputReason,
    source: PhoneInputDetails["source"],
  ) => {
    if (nextCountry !== country) {
      if (countryProp === undefined) setOwnCountry(nextCountry)
      onCountryChange?.(nextCountry, { reason, source })
    }
    if (next !== number) {
      shownFor.current = next
      if (value === undefined) setOwnValue(next)
      onValueChange?.(next, { reason, source })
    }
  }

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const inputType = (event.nativeEvent as InputEvent).inputType
    const edit = editPhone(
      {
        text: input.value,
        caret: input.selectionStart ?? input.value.length,
        inputType,
        before: kept.current,
      },
      country,
    )
    kept.current = edit.kept
    caret.current = edit.caret
    setText(edit.text)
    if (error) setError(null)
    commit(
      edit.value,
      edit.country,
      inputType === "insertFromPaste" ? "paste" : "type",
      "user",
    )
  }

  const check = (next = number, at = country) =>
    checkPhone(next, at, messages, locale) ?? (next ? (validate?.(next) ?? null) : null)

  /** A new country for the digits already typed: a number typed with its own calling code drops it. */
  const chooseCountry = (code: CountryCode, source: PhoneInputDetails["source"]) => {
    const national = kept.current.startsWith("+")
      ? (parsePhoneNumberFromString(kept.current)?.nationalNumber ??
        kept.current.replace(/^\+\d{0,3}/, ""))
      : kept.current
    const typed = typePhone(national, code)
    kept.current = keepPhone(typed.text)
    setText(typed.text)
    commit(typed.value, code, "country", source)
    if (error) refuse(check(typed.value, code))
  }

  // What an agent's setValue and setCountry ask for: the same rules, and the reason back when refused.
  const request = (text: string, at?: string) => {
    const target = at ? findCountry(at, locale) : country
    if (!target) return messages.noCountry(at!)
    const read = readPhone(text, target, messages, locale)
    if ("error" in read) return read.error
    const own = read.value ? validate?.(read.value) : null
    if (own) return own
    const shown = showPhone(read.value, read.country)
    kept.current = keepPhone(shown.text)
    setText(shown.text)
    commit(read.value, read.country, "set", "agent")
    refuse(null)
    return null
  }
  const requestCountry = (query: string) => {
    const code = findCountry(query, locale)
    if (!code) return messages.noCountry(query)
    if (countries && !countries.includes(code)) return messages.noCountry(query)
    chooseCountry(code, "agent")
    return null
  }

  // The input's own validity, so a form's submit stops on a number that isn't one.
  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(error ?? "")
  }, [error])

  const problem = error ?? outside ?? null

  return (
    <parts.Root
      aria-label={label}
      value={number}
      country={country}
      request={request}
      requestCountry={requestCountry}
      disabled={disabled}
      className={["phone-input", className].filter(Boolean).join(" ")}
    >
      <Field
        invalid={problem ? true : undefined}
        disabled={disabled}
        className="phone-input-body"
        data-agent-hidden=""
      >
        <FieldLabel>{label}</FieldLabel>
        <div ref={setBox} className="phone-input-field" data-field-box="">
          {/* A field of its own, so the number's label and problem stay off the country search. */}
          <Field className="phone-input-country-field">
            <Combobox
              value={country}
              onValueChange={(next) => next && chooseCountry(next as CountryCode, "user")}
              query={search}
              onQueryChange={setSearch}
              onOpenChange={(open) => open && setSearch("")}
              onOpenChangeComplete={(open) => !open && trigger?.focus()}
              itemToLabel={(code) => countryOf(code as CountryCode, locale).name}
              disabled={disabled || readOnly}
            >
              <ComboboxTrigger
                ref={setTrigger}
                aria-label={messages.country(current)}
                className="phone-input-country"
              >
                <span className="phone-input-flag" aria-hidden="true">
                  {current.flag}
                </span>
                <bdi className="phone-input-dial" dir="ltr">
                  {current.dial}
                </bdi>
                <Icon name="down" />
              </ComboboxTrigger>
              <ComboboxContent anchor={box} className="phone-input-countries">
                <ComboboxInput
                  autoFocus
                  aria-label={messages.search}
                  placeholder={messages.search}
                  className="phone-input-search"
                />
                <ComboboxEmpty>{messages.noCountries}</ComboboxEmpty>
                <ComboboxList>
                  {list.map((item) => (
                    <ComboboxItem
                      key={item.code}
                      value={item.code}
                      label={item.name}
                      keywords={[item.code, item.dial, item.dial.slice(1)]}
                    >
                      <span className="phone-input-flag" aria-hidden="true">
                        {item.flag}
                      </span>
                      <span className="phone-input-name">{item.name}</span>
                      <bdi className="phone-input-dial" dir="ltr">
                        {item.dial}
                      </bdi>
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
          <Input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            className="phone-input-number"
            value={text}
            placeholder={placeholder}
            required={required}
            readOnly={readOnly}
            disabled={disabled}
            onChange={onInput}
            onBlur={() => {
              afterPress(() => refuse(check()))
              onBlur?.()
            }}
          />
        </div>
        {description && <FieldDescription>{description}</FieldDescription>}
        {problem && <FieldError match>{problem}</FieldError>}
      </Field>
      {name && (
        <input type="hidden" name={name} form={form} value={number} disabled={disabled} />
      )}
    </parts.Root>
  )
}

export { PhoneInput }
export { checkPhone, countryList, findCountry, readPhone } from "./phone-input/phone"
export type { PhoneCountry, PhoneMessages } from "./phone-input/phone"
export type { PhoneInputDetails, PhoneInputProps, PhoneInputReason }
