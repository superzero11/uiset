import type { JSX } from "@solidjs/web"
import { announce } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/solid/primitive"
import { parsePhoneNumberFromString } from "libphonenumber-js/min"
import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from "./combobox"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "./field"
import { afterPress } from "../../registry/uiset/ui/shell/after-press"
import { Icon } from "./shell/icons"
import { phoneInput, type PhoneInputReason } from "../../registry/uiset/ui/phone-input/phone-input"
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
} from "../../registry/uiset/ui/phone-input/phone"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/phone-input/phone-input.css"

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
  description?: JSX.Element
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
  class?: string
}

type Typed = { text: string; kept: string; value: string }

function PhoneInput(props: PhoneInputProps) {
  const messages = () => ({ ...phoneMessages, ...props.messages })
  // Seeded from the defaults only. A seed that read `value` would be derived again each time
  // the value changes, and a country the person chose would snap back as they typed.
  const [ownValue, setOwnValue] = createSignal(() => props.defaultValue ?? "")
  const number = () => props.value ?? ownValue()
  const [ownCountry, setOwnCountry] = createSignal<CountryCode>(() => showPhone(props.defaultValue ?? "", startCountry(props.country ?? props.defaultCountry, props.locale)).country)
  // What was typed, and the number it reported. While the number is still that one, the field
  // shows what was typed; a number set from outside is shown anew, in its own country.
  const [typed, setTyped] = createSignal<Typed | null>(null)
  const shown = createMemo(() => {
    const was = typed()
    if (was && was.value === number()) return { text: was.text, kept: was.kept, country: ownCountry() }
    const fallback = props.country ? startCountry(props.country) : ownCountry()
    const view = showPhone(number(), fallback)
    return { text: view.text, kept: keepPhone(view.text), country: view.country }
  })
  const country = () => (props.country ? startCountry(props.country) : shown().country) as CountryCode
  const [error, setError] = createSignal<string | null>(null)
  const [search, setSearch] = createSignal("")
  // The countries list anchors to the whole field box, known once it's built.
  const [box, setBox] = createSignal<HTMLDivElement | undefined>(undefined, { ownedWrite: true })
  let trigger: HTMLButtonElement | undefined
  let input: HTMLInputElement | undefined
  const list = createMemo(() => countryList({ locale: props.locale, only: props.countries, preferred: props.preferredCountries }))
  const current = () => countryOf(country(), props.locale)

  // The field's text follows a number set from outside; what's typed is written as it's typed.
  createEffect(
    () => shown().text,
    (text) => {
      if (input && input.value !== text) input.value = text
    },
  )
  // The input's own validity, so a form's submit stops on a number that isn't one.
  createEffect(
    () => error(),
    (reason) => input?.setCustomValidity(reason ?? ""),
  )

  const refuse = (reason: string | null) => {
    setError(reason)
    if (reason) announce(reason)
  }

  const commit = (next: Typed, nextCountry: CountryCode, reason: PhoneInputReason, source: PhoneInputDetails["source"]) => {
    const before = { value: number(), country: country() }
    setTyped(next)
    if (nextCountry !== before.country || props.country === undefined) setOwnCountry(nextCountry)
    if (nextCountry !== before.country) props.onCountryChange?.(nextCountry, { reason, source })
    if (next.value !== before.value) {
      if (props.value === undefined) setOwnValue(next.value)
      props.onValueChange?.(next.value, { reason, source })
    }
  }

  const onInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    const field = event.currentTarget
    const inputType = event.inputType
    const edit = editPhone({ text: field.value, caret: field.selectionStart ?? field.value.length, inputType, before: shown().kept }, country())
    // Written now, caret and all.
    field.value = edit.text
    field.setSelectionRange(edit.caret, edit.caret)
    if (error()) setError(null)
    commit({ text: edit.text, kept: edit.kept, value: edit.value }, edit.country, inputType === "insertFromPaste" ? "paste" : "type", "user")
  }

  const check = (next = number(), at = country()) => checkPhone(next, at, messages(), props.locale) ?? (next ? (props.validate?.(next) ?? null) : null)

  /** A new country for the digits already typed: a number typed with its own calling code drops it. */
  const chooseCountry = (code: CountryCode, source: PhoneInputDetails["source"]) => {
    const kept = shown().kept
    const national = kept.startsWith("+") ? (parsePhoneNumberFromString(kept)?.nationalNumber ?? kept.replace(/^\+\d{0,3}/, "")) : kept
    const next = typePhone(national, code)
    commit({ text: next.text, kept: keepPhone(next.text), value: next.value }, code, "country", source)
    if (error()) refuse(check(next.value, code))
  }

  // What an agent's setValue and setCountry ask for: the same rules, and the reason back when refused.
  const request = (text: string, at?: string) => {
    const target = at ? findCountry(at, props.locale) : country()
    if (!target) return messages().noCountry(at!)
    const read = readPhone(text, target, messages(), props.locale)
    if ("error" in read) return read.error
    const own = read.value ? props.validate?.(read.value) : null
    if (own) return own
    const view = showPhone(read.value, read.country)
    commit({ text: view.text, kept: keepPhone(view.text), value: read.value }, read.country, "set", "agent")
    refuse(null)
    return null
  }
  const requestCountry = (query: string) => {
    const code = findCountry(query, props.locale)
    if (!code) return messages().noCountry(query)
    if (props.countries && !props.countries.includes(code)) return messages().noCountry(query)
    chooseCountry(code, "agent")
    return null
  }

  const problem = () => error() ?? props.error ?? null

  return (
    <parts.Root
      aria-label={props.label}
      value={number()}
      country={country()}
      request={request}
      requestCountry={requestCountry}
      disabled={props.disabled}
      class={["phone-input", props.class]}
    >
      <Field invalid={problem() ? true : undefined} disabled={props.disabled} class="phone-input-body" data-agent-hidden="">
        <FieldLabel>{props.label}</FieldLabel>
        <div ref={setBox} class="phone-input-field" data-field-box="">
          {/* A field of its own, so the number's label and problem stay off the country search. */}
          <Field class="phone-input-country-field">
            <Combobox
              value={country()}
              onValueChange={(next) => next && chooseCountry(next as CountryCode, "user")}
              query={search()}
              onQueryChange={(next) => setSearch(next)}
              onOpenChange={(open) => open && setSearch("")}
              onOpenChangeComplete={(open) => !open && trigger?.focus()}
              itemToLabel={(code) => countryOf(code as CountryCode, props.locale).name}
              disabled={props.disabled || props.readOnly}
            >
              <ComboboxTrigger
                ref={(el: HTMLButtonElement) => {
                  trigger = el
                }}
                aria-label={messages().country(current())}
                class="phone-input-country"
              >
                <span class="phone-input-flag" aria-hidden="true">
                  {current().flag}
                </span>
                <bdi class="phone-input-dial" dir="ltr">
                  {current().dial}
                </bdi>
                <Icon name="down" />
              </ComboboxTrigger>
              <ComboboxContent anchor={box()} class="phone-input-countries">
                <ComboboxInput autofocus aria-label={messages().search} placeholder={messages().search} class="phone-input-search" />
                <ComboboxEmpty>{messages().noCountries}</ComboboxEmpty>
                <ComboboxList>
                  <For each={list()} keyed={(item) => item.code}>
                    {(item) => (
                      <ComboboxItem value={item().code} label={item().name} keywords={[item().code, item().dial, item().dial.slice(1)]}>
                        <span class="phone-input-flag" aria-hidden="true">
                          {item().flag}
                        </span>
                        <span class="phone-input-name">{item().name}</span>
                        <bdi class="phone-input-dial" dir="ltr">
                          {item().dial}
                        </bdi>
                      </ComboboxItem>
                    )}
                  </For>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
          <Input
            ref={(el: HTMLInputElement) => {
              input = el
            }}
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            dir="ltr"
            class="phone-input-number"
            placeholder={props.placeholder}
            required={props.required}
            readonly={props.readOnly}
            disabled={props.disabled}
            onInput={onInput}
            onBlur={() => {
              afterPress(() => refuse(check()))
              props.onBlur?.()
            }}
          />
        </div>
        <Show when={props.description}>{(description) => <FieldDescription>{description()}</FieldDescription>}</Show>
        <Show when={problem()}>{(text) => <FieldError match>{text()}</FieldError>}</Show>
      </Field>
      <Show when={props.name}>{(name) => <input type="hidden" name={name()} form={props.form} value={number()} disabled={props.disabled} />}</Show>
    </parts.Root>
  )
}

export { PhoneInput }
export { checkPhone, countryList, findCountry, readPhone } from "../../registry/uiset/ui/phone-input/phone"
export type { PhoneCountry, PhoneMessages } from "../../registry/uiset/ui/phone-input/phone"
export type { PhoneInputDetails, PhoneInputProps, PhoneInputReason }
