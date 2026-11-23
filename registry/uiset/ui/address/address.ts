// The address kit's rules, shared by React and Web Components: how each country writes an
// address (formats.ts, from Google's address data), the countries to choose from, the checks,
// and what an agent's fill does.
import { addressFormats, addressRegions, type Region } from "./formats"

type AddressValue = {
  /** ISO 3166 code, like "GB". */
  country: string
  name: string
  line1: string
  line2: string
  /** A neighborhood or district, where the country writes one: a colonia, a bairro. */
  district: string
  city: string
  /** A region's key from its list ("CA" for California), or its name where there's no list. */
  region: string
  postalCode: string
}

type AddressFieldName = keyof AddressValue
type AddressPart = Exclude<AddressFieldName, "country" | "name">

/** The words an address says, for other languages. */
type AddressMessages = {
  /** The whole address's name, for agents and screen readers. */
  label: string
  country: string
  name: string
  line1: string
  line2: string
  /** By the country's word for it: zip, postal, pin, eircode. */
  postal: Record<string, string>
  /** state, province, county, prefecture, emirate… */
  region: Record<string, string>
  /** city, district, post_town, suburb. */
  city: Record<string, string>
  /** suburb, district, neighborhood, townland, village_township. */
  district: Record<string, string>
  optional: (label: string) => string
  showList: string
  noCountries: string
  noRegions: string
  required: (label: string) => string
  postalShape: (label: string, example: string) => string
  postalRegion: (label: string, code: string, region: string) => string
  noCountry: (query: string) => string
  noRegion: (label: string, query: string, country: string) => string
  noField: (name: string, names: string) => string
}

const addressMessages: AddressMessages = {
  label: "Address",
  country: "Country or region",
  name: "Full name",
  line1: "Address",
  line2: "Apartment, suite, etc.",
  postal: { zip: "ZIP code", postal: "Postal code", pin: "PIN code", eircode: "Eircode" },
  region: {
    area: "Area",
    county: "County",
    department: "Department",
    district: "District",
    do_si: "Province",
    emirate: "Emirate",
    island: "Island",
    oblast: "Oblast",
    parish: "Parish",
    prefecture: "Prefecture",
    province: "Province",
    state: "State",
  },
  city: { city: "City", district: "District", post_town: "Town or city", suburb: "Suburb" },
  district: { suburb: "Suburb", district: "District", neighborhood: "Neighborhood", townland: "Townland", village_township: "Village or township" },
  optional: (label) => `${label} (optional)`,
  showList: "Show the list",
  noCountries: "No country or region by that name.",
  noRegions: "None by that name.",
  required: (label) => `${label} is required.`,
  postalShape: (label, example) => `${label} should look like ${example}.`,
  postalRegion: (label, code, region) => `${label} ${code} is outside ${region}.`,
  noCountry: (query) => `No country or region "${query}". Use its name or its code, like GB.`,
  noRegion: (label, query, country) => `${label} "${query}" isn't one in ${country}.`,
  noField: (name, names) => `No field "${name}". The fields are ${names}.`,
}

const fieldOf = { A: "line1", D: "district", C: "city", S: "region", Z: "postalCode" } as const
/** How a country with no format of its own writes an address. */
const plainFormat = "%N%n%O%n%A%n%C"
const formatOf = (country: string) => addressFormats[country]?.fmt ?? plainFormat

/** A flag from two regional indicator letters. Some systems draw the letters instead. */
const flagOf = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1a5 + letter.charCodeAt(0)))

const displays = new Map<string, Intl.DisplayNames>()
/** A country's name in `locale` (the page's language by default). */
function countryName(code: string, locale?: string) {
  let display = displays.get(locale ?? "")
  if (!display) displays.set(locale ?? "", (display = new Intl.DisplayNames(locale ? [locale] : undefined, { type: "region" })))
  return display.of(code) ?? code
}

type AddressCountry = { code: string; name: string; flag: string }

/** The countries to choose from, by name in `locale`, with `preferred` first. */
function addressCountries({ locale, only, preferred = [] }: { locale?: string; only?: readonly string[]; preferred?: readonly string[] } = {}): AddressCountry[] {
  const codes = (only ?? Object.keys(addressFormats)).filter((code) => code in addressFormats)
  const collator = new Intl.Collator(locale)
  const all = codes.map((code) => ({ code, name: countryName(code, locale), flag: flagOf(code) })).sort((a, b) => collator.compare(a.name, b.name))
  const first = preferred.flatMap((code) => all.filter((country) => country.code === code))
  return [...first, ...all.filter((country) => !preferred.includes(country.code))]
}

const same = new Intl.Collator(undefined, { sensitivity: "base" })
const sameText = (a: string, b: string) => same.compare(a.trim(), b.trim()) === 0

/** A country by its code or its name, in `locale` or English. */
function findCountry(query: string, { locale, only }: { locale?: string; only?: readonly string[] } = {}) {
  const text = query.trim()
  if (!text) return undefined
  const codes = (only ?? Object.keys(addressFormats)).filter((code) => code in addressFormats)
  return codes.find((code) => sameText(code, text) || sameText(countryName(code, locale), text) || sameText(countryName(code, "en"), text))
}

/** The country to start in: the one given, else the page language's region, else the United States. */
function startCountry(given?: string, locale?: string) {
  if (given && given.toUpperCase() in addressFormats) return given.toUpperCase()
  try {
    const region = new Intl.Locale(locale ?? (typeof navigator === "undefined" ? "en-US" : navigator.language)).maximize().region
    if (region && region in addressFormats) return region
  } catch {
    // An odd language tag: fall through.
  }
  return "US"
}

type AddressLayout = {
  country: string
  /** The rows after the name, in the country's order; each row's fields sit side by side. */
  rows: AddressPart[][]
  /** The fields the country shows, the name and country first. */
  fields: AddressFieldName[]
  required: ReadonlySet<AddressFieldName>
  labels: Record<AddressFieldName, string>
  postal: { pattern: RegExp | null; example?: string; upper: boolean }
  /** The regions to choose from, or null where a region is typed. */
  regions: readonly Region[] | null
}

/** How `country` writes an address: its rows, labels and rules. `regions` adds or replaces lists. */
function addressLayout(country: string, { messages = addressMessages, regions }: { messages?: AddressMessages; regions?: Record<string, readonly Region[]> } = {}): AddressLayout {
  const format = addressFormats[country] ?? {}
  const rows: AddressPart[][] = []
  // The rows a form shows, in the country's order; the name comes first in any country.
  const lines = formatOf(country)
    .split("%n")
    .map((line) => [...line.matchAll(/%([ADCSZ])/g)].map((match) => match[1]).join(""))
    .filter(Boolean)
  for (const line of lines) {
    // The street is two rows of its own, wherever the country writes it.
    const [before, after] = line.split("A") as [string, string | undefined]
    const row = (letters: string) => [...letters].map((letter) => fieldOf[letter as keyof typeof fieldOf])
    if (before) rows.push(row(before))
    if (after !== undefined) rows.push(["line1"], ["line2"])
    if (after) rows.push(row(after))
  }
  const required = new Set<AddressFieldName>(["country", "name", ...[...(format.require ?? "AC")].map((letter) => fieldOf[letter as keyof typeof fieldOf])])
  const labels: Record<AddressFieldName, string> = {
    country: messages.country,
    name: messages.name,
    line1: messages.line1,
    line2: messages.line2,
    district: messages.district[format.district ?? "suburb"] ?? messages.district.suburb!,
    city: messages.city[format.city ?? "city"] ?? messages.city.city!,
    region: messages.region[format.region ?? "province"] ?? messages.region.province!,
    postalCode: messages.postal[format.postal ?? "postal"] ?? messages.postal.postal!,
  }
  return {
    country,
    rows,
    fields: ["country", "name", ...rows.flat()],
    required,
    labels,
    postal: { pattern: format.zip ? new RegExp(`^(?:${format.zip})$`, "i") : null, example: format.example, upper: format.upper ?? false },
    regions: regions?.[country] ?? addressRegions[country] ?? null,
  }
}

/** A field's label as it shows: optional ones say so. */
const shownLabel = (layout: AddressLayout, field: AddressFieldName, messages = addressMessages) =>
  layout.required.has(field) ? layout.labels[field] : messages.optional(layout.labels[field])

const emptyAddress = (country = startCountry()): AddressValue => ({ country, name: "", line1: "", line2: "", district: "", city: "", region: "", postalCode: "" })

/** A postal code as it's kept: single spaces, and capitals where the country writes them. */
function tidyPostal(text: string, layout: AddressLayout) {
  const tidy = text.trim().replace(/\s+/g, " ")
  return layout.postal.upper ? tidy.toUpperCase() : tidy
}

/** A region's key, by its key or its name. */
const findRegion = (query: string, regions: readonly Region[]) => regions.find(([key, name]) => sameText(key, query) || sameText(name, query))?.[0]

/** What's wrong with an address, field by field, in the order they show. Empty when it's whole. */
function checkAddress(value: AddressValue, { messages = addressMessages, regions, locale }: { messages?: AddressMessages; regions?: Record<string, readonly Region[]>; locale?: string } = {}) {
  const layout = addressLayout(value.country, { messages, regions })
  const problems: Partial<Record<AddressFieldName, string>> = {}
  for (const field of layout.fields) {
    const text = String(value[field] ?? "").trim()
    if (!text) {
      if (layout.required.has(field)) problems[field] = messages.required(layout.labels[field])
      continue
    }
    if (field === "country" && !(text in addressFormats)) problems.country = messages.noCountry(text)
    if (field === "region" && layout.regions && !layout.regions.some(([key]) => key === text)) {
      problems.region = messages.noRegion(layout.labels.region, text, countryName(value.country, locale))
    }
    if (field === "postalCode" && layout.postal.pattern) {
      if (!layout.postal.pattern.test(text)) problems.postalCode = messages.postalShape(layout.labels.postalCode, layout.postal.example ?? "")
      else {
        const region = layout.regions?.find(([key]) => key === value.region)
        if (region?.[2] && !new RegExp(`^(?:${region[2]})`, "i").test(text)) {
          problems.postalCode = messages.postalRegion(layout.labels.postalCode, tidyPostal(text, layout), region[1])
        }
      }
    }
  }
  return problems
}

/**
 * An address written out as its country writes it, a line each: "1 Main St", "San Francisco,
 * CA 94110", "United States". Parts it has no value for go, with the text that joins them.
 */
function addressLines(value: AddressValue, { locale, country = true }: { locale?: string; country?: boolean } = {}) {
  const part = (token: string) =>
    ({ N: value.name, A: [value.line1, value.line2].filter((line) => line.trim()).join(", "), D: value.district, C: value.city, S: value.region, Z: value.postalCode })[token]?.trim() ?? ""
  const lines: string[] = []
  for (const line of formatOf(value.country).split("%n")) {
    // The street is a line each, wherever the country writes it alone.
    if (line === "%A") {
      lines.push(...[value.line1, value.line2].map((text) => text.trim()).filter(Boolean))
      continue
    }
    const pieces = line.split(/(%[A-Za-z])/).filter(Boolean)
    let text = ""
    let joiner = ""
    let any = false
    for (const piece of pieces) {
      if (!piece.startsWith("%")) {
        joiner += piece
        continue
      }
      const shown = part(piece[1]!)
      if (shown) {
        // The text before a part shows with it: a separator once there's something to separate, a prefix ("CH-") always.
        text += any || !/^[\s,\-/]+$/.test(joiner) ? joiner + shown : shown
        any = true
      }
      joiner = ""
    }
    if (any) lines.push((text + (/[^\s,\-/]/.test(joiner) ? joiner : "")).replace(/\s+/g, " ").trim())
  }
  if (country) lines.push(countryName(value.country, locale))
  return lines
}

/**
 * An agent's fill: values by field name ("postalCode") or label ("ZIP code"), the country by
 * its name or code and a region by its name or key. The country goes first, so the other
 * fields are the ones it uses. Returns the new value, the labels filled, and what was refused.
 */
function fillAddress(
  current: AddressValue,
  entries: Record<string, unknown>,
  { messages = addressMessages, regions, locale, countries }: { messages?: AddressMessages; regions?: Record<string, readonly Region[]>; locale?: string; countries?: readonly string[] } = {},
) {
  const problems: string[] = []
  const filled: string[] = []
  const next = { ...current }
  const pairs = Object.entries(entries).map(([key, raw]) => [key, raw == null ? "" : String(raw)] as const)
  const isCountry = (key: string) => sameText(key, "country") || sameText(key, messages.country)
  const country = pairs.find(([key]) => isCountry(key))
  if (country) {
    const code = findCountry(country[1], { locale, only: countries })
    if (code) {
      if (code !== next.country) next.region = ""
      next.country = code
      filled.push(messages.country)
    } else problems.push(messages.noCountry(country[1]))
  }
  const layout = addressLayout(next.country, { messages, regions })
  for (const [key, text] of pairs) {
    if (isCountry(key)) continue
    const field = layout.fields.find((name) => sameText(key, name) || sameText(key, layout.labels[name]) || sameText(key, shownLabel(layout, name, messages)))
    if (!field) {
      problems.push(messages.noField(key, layout.fields.map((name) => layout.labels[name]).join(", ")))
      continue
    }
    if (field === "region" && layout.regions && text.trim()) {
      const key = findRegion(text, layout.regions)
      if (!key) {
        problems.push(messages.noRegion(layout.labels.region, text, countryName(next.country, locale)))
        continue
      }
      next.region = key
    } else next[field] = field === "postalCode" ? tidyPostal(text, layout) : text.trim()
    filled.push(layout.labels[field])
  }
  return { value: next, filled, problems }
}

export { addressCountries, addressLayout, addressLines, addressMessages, checkAddress, countryName, emptyAddress, fillAddress, findCountry, findRegion, shownLabel, startCountry, tidyPostal }
export type { AddressCountry, AddressFieldName, AddressLayout, AddressMessages, AddressPart, AddressValue }
export type { Region } from "./formats"
