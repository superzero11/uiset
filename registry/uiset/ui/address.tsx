"use client"

import { createParts } from "@ui-sdk/react/primitive"
import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from "./combobox"
import { Field, FieldError, FieldLabel, Input } from "./field"
import { afterPress } from "./shell/after-press"
import { Icon } from "./shell/icons"
import { addressFields, type AddressFieldsReason } from "./address/address-fields"
import {
  addressCountries,
  addressLayout,
  addressMessages,
  checkAddress,
  countryName,
  emptyAddress,
  fillAddress,
  findCountry,
  findRegion,
  shownLabel,
  startCountry,
  tidyPostal,
  type AddressFieldName,
  type AddressMessages,
  type AddressPart,
  type AddressValue,
  type Region,
} from "./address/address"
import "./shell/shell.css"
import "./address/address.css"

const parts = createParts(addressFields, { root: "div" })

type AddressFieldsDetails = { field: AddressFieldName | null; reason: AddressFieldsReason; source: "user" | "agent" }

type AddressFieldsProps = {
  /** The address's name, like "Delivery address": what agents and screen readers call it. */
  label?: string
  value?: AddressValue
  defaultValue?: Partial<AddressValue>
  onValueChange?: (value: AddressValue, details: AddressFieldsDetails) => void
  /** Which address autofill fills: `shipping` or `billing`. */
  section?: "shipping" | "billing"
  /** Only these countries, by code. */
  countries?: readonly string[]
  /** These countries first in the list, by code. */
  preferredCountries?: readonly string[]
  /** Region lists of your own, by country: `[key, name, postal code start?][]`. */
  regions?: Record<string, readonly Region[]>
  /** Problems from a submit (`checkAddress`), by field. Focus goes to the first. */
  errors?: Partial<Record<AddressFieldName, string>>
  /** Submits each field as `name.field` (`shipping.city`) in a form. */
  name?: string
  disabled?: boolean
  /** The language country names are in. The page's by default. */
  locale?: string
  messages?: Partial<AddressMessages>
  className?: string
}

const autofill: Record<AddressFieldName, string> = {
  country: "country-name",
  name: "name",
  line1: "address-line1",
  line2: "address-line2",
  district: "address-level3",
  city: "address-level2",
  region: "address-level1",
  postalCode: "postal-code",
}

type ChoiceProps = {
  label: string
  value: string
  items: readonly { value: string; label: string; flag?: string; keywords?: string[] }[]
  onChoose: (value: string, source: "user") => void
  /** Text that names one item outright, as autofill types it. */
  find: (text: string) => string | undefined
  autoComplete: string
  required: boolean
  disabled?: boolean
  name?: string
  empty: string
  showList: string
}

/** A list to choose from by typing: the country, and a region where the country has a list. */
function Choice({ label, value, items, onChoose, find, autoComplete, required, disabled, name, empty, showList }: ChoiceProps) {
  const chosen = items.find((item) => item.value === value)
  return (
    <Combobox
      value={value || null}
      // Emptying the text asks for no value; an address keeps its country (and a region from
      // its list), so the combobox is told no and shows the chosen one again.
      onValueChange={(next, details) => (next ? onChoose(String(next), "user") : details.cancel())}
      // Autofill and a whole name typed out choose the item at once.
      onQueryChange={(query, details) => {
        if (details.reason !== "input-change") return
        const found = find(query)
        if (found && found !== value) onChoose(found, "user")
      }}
      itemToLabel={(item) => items.find((entry) => entry.value === item)?.label ?? String(item)}
      disabled={disabled}
      required={required}
      name={name}
    >
      <div className="address-choice">
        {chosen?.flag && (
          <span className="address-flag" aria-hidden="true">
            {chosen.flag}
          </span>
        )}
        <ComboboxInput autoComplete={autoComplete} className="address-choice-input" />
        <ComboboxTrigger aria-label={`${showList}: ${label}`} className="address-choice-toggle">
          <Icon name="down" />
        </ComboboxTrigger>
      </div>
      <ComboboxContent className="address-choices">
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        <ComboboxList>
          {items.map((item) => (
            <ComboboxItem key={item.value} value={item.value} label={item.label} keywords={item.keywords}>
              {item.flag && (
                <span className="address-flag" aria-hidden="true">
                  {item.flag}
                </span>
              )}
              <span className="address-choice-name">{item.label}</span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

/** An address whose fields follow its country: their order, names, required ones and postal code shape. */
function AddressFields({
  label: groupLabel,
  value,
  defaultValue,
  onValueChange,
  section = "shipping",
  countries,
  preferredCountries,
  regions,
  errors = {},
  name,
  disabled,
  locale,
  messages: overrides,
  className,
}: AddressFieldsProps) {
  const words = { ...addressMessages, ...overrides }
  const [own, setOwn] = useState<AddressValue>(() => ({ ...emptyAddress(startCountry(defaultValue?.country, locale)), ...defaultValue }))
  const current = value ?? own
  // A field's own problem, found when focus leaves it: a postal code's shape, a region it's outside.
  const [found, setFound] = useState<Partial<Record<AddressFieldName, string>>>({})
  const layout = addressLayout(current.country, { messages: words, regions })
  const list = useMemo(() => addressCountries({ locale, only: countries, preferred: preferredCountries }), [locale, countries, preferredCountries])
  const root = useRef<HTMLDivElement>(null)
  const latest = useRef(current)
  latest.current = current

  const report = (next: AddressValue, field: AddressFieldName | null, source: "user" | "agent") => {
    latest.current = next
    if (value === undefined) setOwn(next)
    onValueChange?.(next, { field, reason: source === "agent" ? "fill" : "input", source })
  }
  const edit = (field: AddressFieldName, text: string) => {
    if (found[field]) setFound(({ [field]: _, ...rest }) => rest)
    report({ ...latest.current, [field]: text }, field, "user")
  }
  const chooseCountry = (code: string) => {
    if (code === latest.current.country) return
    const next = addressLayout(code, { messages: words, regions })
    // A region from another country's list isn't one here.
    const region = next.regions && !next.regions.some(([key]) => key === latest.current.region) ? "" : latest.current.region
    setFound({})
    report({ ...latest.current, country: code, region }, "country", "user")
  }
  const blur = (field: AddressFieldName) => {
    const text = latest.current[field]
    if (field === "postalCode" && text && tidyPostal(text, layout) !== text) report({ ...latest.current, postalCode: tidyPostal(text, layout) }, field, "user")
    afterPress(() => {
      const problem = latest.current[field].trim() ? checkAddress(latest.current, { messages: words, regions, locale })[field] : undefined
      setFound(({ [field]: _, ...rest }) => (problem ? { ...rest, [field]: problem } : rest))
    })
  }

  // An agent's fill: the same rules, and the reasons back when refused.
  const request = (entries: Record<string, unknown>) => {
    const result = fillAddress(latest.current, entries, { messages: words, regions, locale, countries })
    if (result.filled.length) report(result.value, null, "agent")
    // What's filled but wrong shows under its field, as a person's would; what's missing waits for a submit.
    const wrong = Object.fromEntries(
      Object.entries(checkAddress(result.value, { messages: words, regions, locale })).filter(([field]) => result.value[field as AddressFieldName].trim()),
    )
    setFound(wrong)
    const problems = [...result.problems, ...Object.values(wrong)]
    if (problems.length) throw new Error(problems.join(" "))
    return result.filled
  }

  // New problems from a submit: focus goes to the first, in the order the fields show.
  useLayoutEffect(() => {
    const first = layout.fields.find((field) => errors[field])
    if (!first) return
    root.current?.querySelector<HTMLElement>(`[data-address-field="${first}"] input`)?.focus()
  }, [errors]) // eslint-disable-line react-hooks/exhaustive-deps

  // A field's own problem, found as focus left it, is newer than a submit's.
  const problemOf = (field: AddressFieldName) => found[field] ?? errors[field]
  const regionItems = layout.regions?.map(([key, regionName]) => ({ value: key, label: regionName, keywords: [key] })) ?? null

  const field = (part: AddressFieldName) => {
    const problem = problemOf(part)
    const shown = shownLabel(layout, part, words)
    const required = layout.required.has(part)
    const token = `${section} ${autofill[part]}`
    const submitted = name ? `${name}.${part}` : undefined
    return (
      <div key={part} className="address-field" data-address-field={part}>
        <Field invalid={problem ? true : undefined} disabled={disabled}>
          <FieldLabel>{shown}</FieldLabel>
          {part === "country" ? (
            <Choice
              label={shown}
              value={current.country}
              items={list.map((country) => ({ value: country.code, label: country.name, flag: country.flag, keywords: [country.code] }))}
              onChoose={chooseCountry}
              find={(text) => findCountry(text, { locale, only: countries })}
              autoComplete={token}
              required
              disabled={disabled}
              name={submitted}
              empty={words.noCountries}
              showList={words.showList}
            />
          ) : part === "region" && regionItems ? (
            <Choice
              label={shown}
              value={current.region}
              items={regionItems}
              onChoose={(key) => {
                if (key === latest.current.region) return
                if (found.region || found.postalCode) setFound({})
                report({ ...latest.current, region: key }, "region", "user")
              }}
              find={(text) => findRegion(text, layout.regions!)}
              autoComplete={token}
              required={required}
              disabled={disabled}
              name={submitted}
              empty={words.noRegions}
              showList={words.showList}
            />
          ) : (
            <Input
              value={current[part]}
              autoComplete={token}
              required={required}
              name={submitted}
              inputMode={part === "postalCode" && layout.postal.example && /^[\d]+$/.test(layout.postal.example) ? "numeric" : undefined}
              placeholder={part === "postalCode" ? layout.postal.example : undefined}
              onValueChange={(text) => edit(part, text)}
              onBlur={() => blur(part)}
            />
          )}
          {problem && <FieldError match>{problem}</FieldError>}
        </Field>
      </div>
    )
  }

  return (
    <parts.Root
      ref={root}
      aria-label={groupLabel ?? words.label}
      value={current}
      request={request}
      fields={layout.fields.map((part) => ({ value: part, label: layout.labels[part] }))}
      disabled={disabled}
      className={["address-fields", className].filter(Boolean).join(" ")}
    >
      <div className="address-fields-body" data-agent-hidden="">
        {field("country")}
        {field("name")}
        {layout.rows.map((row) =>
          row.length === 1 ? (
            field(row[0] as AddressPart)
          ) : (
            <div key={row.join("-")} className="address-row" data-fields={row.length}>
              {row.map((part) => field(part))}
            </div>
          ),
        )}
      </div>
    </parts.Root>
  )
}

export { AddressFields }
export { addressCountries, addressLayout, addressLines, addressMessages, checkAddress, countryName, emptyAddress, fillAddress, findCountry, startCountry } from "./address/address"
export { addressFormats, addressRegions } from "./address/formats"
export type { AddressCountry, AddressFieldName, AddressLayout, AddressMessages, AddressValue, Region } from "./address/address"
export type { AddressFieldsDetails, AddressFieldsProps, AddressFieldsReason }
