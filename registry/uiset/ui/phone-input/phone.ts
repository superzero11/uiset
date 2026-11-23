// The phone field's rules, shared by React and Web Components: formatting as typed for a
// country, reading a number in any format, the checks, and the list of countries. The phone
// data is libphonenumber-js's small build; country names come from Intl.DisplayNames.
import {
  AsYouType,
  Metadata,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parseIncompletePhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js/min"
import { formatEdit, type Edit } from "../shell/format-as-you-type"

type PhoneCountry = {
  /** ISO 3166 code, like "GB". */
  code: CountryCode
  /** Its name in the page's language. */
  name: string
  /** Its calling code with the plus, like "+44". */
  dial: string
  flag: string
}

/** The words a phone field says, for other languages. */
type PhoneMessages = {
  /** The country button's name: "Country: United Kingdom, +44". */
  country: (country: PhoneCountry) => string
  search: string
  noCountries: string
  tooShort: (country: string) => string
  tooLong: (country: string) => string
  invalid: (country: string) => string
  notANumber: (text: string) => string
  noCountry: (query: string) => string
}

const phoneMessages: PhoneMessages = {
  country: (country) => `Country: ${country.name}, ${country.dial}`,
  search: "Search countries",
  noCountries: "No country by that name or code.",
  tooShort: (country) => `Too short for a number in ${country}.`,
  tooLong: (country) => `Too long for a number in ${country}.`,
  invalid: (country) => `Not a valid number in ${country}.`,
  notANumber: (text) => `Not a phone number: ${text}`,
  noCountry: (query) => `No country "${query}". Use its name, its code like GB, or its calling code like +44.`,
}

/** A flag from two regional indicator letters. Some systems draw the letters instead. */
const flagOf = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1a5 + letter.charCodeAt(0)))

const names = new Map<string, Intl.DisplayNames>()
/** A country's name in `locale` (the page's language by default). */
function countryName(code: string, locale?: string) {
  const key = locale ?? ""
  let display = names.get(key)
  if (!display) names.set(key, (display = new Intl.DisplayNames(locale ? [locale] : undefined, { type: "region" })))
  return display.of(code) ?? code
}

function countryOf(code: CountryCode, locale?: string): PhoneCountry {
  return { code, name: countryName(code, locale), dial: `+${getCountryCallingCode(code)}`, flag: flagOf(code) }
}

/** The countries to choose from, by name in `locale`, with `preferred` first. */
function countryList({ locale, only, preferred = [] }: { locale?: string; only?: readonly string[]; preferred?: readonly string[] } = {}): PhoneCountry[] {
  const codes = (only ?? getCountries()).filter((code): code is CountryCode => isSupportedCountry(code))
  const collator = new Intl.Collator(locale)
  const all = codes.map((code) => countryOf(code, locale)).sort((a, b) => collator.compare(a.name, b.name))
  const first = preferred.flatMap((code) => all.filter((country) => country.code === code))
  return [...first, ...all.filter((country) => !preferred.includes(country.code))]
}

let mainCountries: Record<string, CountryCode[]> | undefined
/** The main country for a calling code: "1" is the United States, "44" the United Kingdom. */
function countryForCallingCode(callingCode: string): CountryCode | undefined {
  // Not in the package's types, but in its metadata API; the version is pinned exactly.
  mainCountries ??= (new Metadata() as unknown as { countryCallingCodes(): Record<string, CountryCode[]> }).countryCallingCodes()
  return mainCountries[callingCode]?.[0]
}

/** The digits and a leading plus, from any text: other scripts' digits become 0 to 9. */
const keepPhone = (text: string) => parseIncompletePhoneNumber(text)

type Typed = {
  /** The text to show. */
  text: string
  /** The number so far in E.164, or "" with no digits. */
  value: string
  /** The country: the one given, or the one a typed calling code names. */
  country: CountryCode
}

/** What digits typed for `country` show as, and the number and country they make. */
function typePhone(kept: string, country: CountryCode): Typed {
  if (!kept) return { text: "", value: "", country }
  const international = kept.startsWith("+")
  const typer = new AsYouType(international ? undefined : country)
  const text = typer.input(kept)
  const callingCode = typer.getCallingCode()
  const found =
    typer.getCountry() ??
    (international && callingCode && getCountryCallingCode(country) !== callingCode ? countryForCallingCode(callingCode) : undefined)
  return { text, value: typer.getNumberValue() ?? (international ? kept : ""), country: found ?? country }
}

/** An edit to the field: the text and caret to show, and the number and country it makes. */
function editPhone(edit: Edit, country: CountryCode) {
  let typed: Typed | undefined
  const { text, caret, kept } = formatEdit(edit, {
    keep: keepPhone,
    format: (digits) => (typed = typePhone(digits, country)).text,
  })
  typed ??= typePhone(kept, country)
  return { text, caret, kept, value: typed.value, country: typed.country }
}

/** The text to show for a number from outside (a value set in E.164): national, in its own country. */
function showPhone(value: string, country: CountryCode): { text: string; country: CountryCode } {
  if (!value) return { text: "", country }
  const number = parsePhoneNumberFromString(value, country)
  if (number?.country) return { text: number.formatNational(), country: number.country }
  const typed = typePhone(keepPhone(value), country)
  return { text: typed.text, country: typed.country }
}

/** What's wrong with a number for its country, or null; an empty one is fine here (`required` is the field's). */
function checkPhone(value: string, country: CountryCode, messages: PhoneMessages = phoneMessages, locale?: string): string | null {
  if (!value) return null
  const name = countryName(parsePhoneNumberFromString(value)?.country ?? country, locale)
  const length = validatePhoneNumberLength(value)
  if (length === "TOO_SHORT" || length === "NOT_A_NUMBER") return messages.tooShort(name)
  if (length === "TOO_LONG") return messages.tooLong(name)
  return parsePhoneNumberFromString(value)?.isValid() ? null : messages.invalid(name)
}

/**
 * A number in any format, as an agent or a script gives it ("020 7946 0958", "+44 20…",
 * "(415) 555-0123"), read for `country` unless it carries its own calling code.
 */
function readPhone(text: string, country: CountryCode, messages: PhoneMessages = phoneMessages, locale?: string): { value: string; country: CountryCode } | { error: string } {
  const kept = keepPhone(text)
  if (!kept.replace("+", "")) return text.trim() ? { error: messages.notANumber(text) } : { value: "", country }
  const number = parsePhoneNumberFromString(kept, country)
  if (!number) return { error: messages.notANumber(text) }
  const problem = checkPhone(number.number, number.country ?? country, messages, locale)
  return problem ? { error: problem } : { value: number.number, country: number.country ?? country }
}

/** The country a name, a code or a calling code names: "United Kingdom", "gb", "+44". */
function findCountry(query: string, locale?: string): CountryCode | undefined {
  const text = query.trim()
  if (!text) return undefined
  if (/^\+?\d+$/.test(text)) return countryForCallingCode(text.replace("+", ""))
  if (/^[a-z]{2}$/i.test(text) && isSupportedCountry(text.toUpperCase())) return text.toUpperCase() as CountryCode
  const wanted = text.toLowerCase()
  const list = countryList({ locale })
  return (
    list.find((country) => country.name.toLowerCase() === wanted)?.code ??
    countryList().find((country) => country.name.toLowerCase() === wanted)?.code ??
    list.find((country) => country.name.toLowerCase().startsWith(wanted))?.code
  )
}

/** The country to start in: the one given, else the page language's region, else the United States. */
function startCountry(given?: string, locale?: string): CountryCode {
  if (given && isSupportedCountry(given.toUpperCase())) return given.toUpperCase() as CountryCode
  const region = (() => {
    try {
      return new Intl.Locale(locale ?? (typeof navigator === "undefined" ? "en-US" : navigator.language)).maximize().region
    } catch {
      return undefined
    }
  })()
  return region && isSupportedCountry(region) ? (region as CountryCode) : "US"
}

export { checkPhone, countryForCallingCode, countryList, countryName, countryOf, editPhone, findCountry, flagOf, keepPhone, phoneMessages, readPhone, showPhone, startCountry, typePhone }
export type { CountryCode, PhoneCountry, PhoneMessages }
