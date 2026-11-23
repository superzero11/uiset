// Masks for fields formatted as they're typed: card numbers, expiry dates and security codes,
// IBANs, amounts of money, and patterns of your own. Each says which characters it keeps,
// how they show, what the field reports, and what's wrong. No DOM and no framework: React and
// Web Components share them, on shell/format-as-you-type.ts.

/** The words masks say, for other languages. */
type MaskMessages = {
  cardIncomplete: string
  cardTypo: string
  expiryIncomplete: string
  expiryMonth: (month: string) => string
  expired: string
  codeLength: (digits: number) => string
  ibanCountry: (code: string) => string
  ibanLength: (country: string, length: number) => string
  ibanTypo: string
  patternIncomplete: (example: string) => string
}

const maskMessages: MaskMessages = {
  cardIncomplete: "Not a whole card number yet.",
  cardTypo: "This card number has a typo. Check it digit by digit.",
  expiryIncomplete: "Give the month and year on the card, like 04 / 27.",
  expiryMonth: (month) => `There's no month ${month}.`,
  expired: "This card has expired.",
  codeLength: (digits) => `The security code is ${digits} digits.`,
  ibanCountry: (code) => `No IBAN starts with ${code}.`,
  ibanLength: (country, length) => `An IBAN in ${country} has ${length} characters.`,
  ibanTypo: "This IBAN has a typo. Check it character by character.",
  patternIncomplete: (example) => `Not complete yet: like ${example}.`,
}

type Mask = {
  /** The mask's name, as Web Components and a schema form write it. */
  kind: string
  /** The characters that count, from any text. */
  keep: (text: string) => string
  /** How the kept characters show. */
  format: (kept: string) => string
  /** What the field reports. */
  value: (kept: string) => string | number | null
  /** The kept characters for a value from outside. */
  fromValue: (value: unknown) => string
  /** Text in any format, as an agent or a paste gives it, read into kept characters. */
  read?: (text: string) => string
  /** What's wrong, or null. Empty is fine here: `required` is the field's. */
  check: (kept: string, messages: MaskMessages) => string | null
  /** Words beside the field, like the card's brand or the currency's symbol. */
  addon?: (kept: string) => string | null
  /** Where the words go: before the text, or after it. */
  addonAt?: "start" | "end"
  inputMode: "numeric" | "decimal" | "text"
  autoComplete?: string
  placeholder?: string
  /** An agent can fill it but reads "[redacted]", as for a password. */
  secret?: boolean
}

// Digits from other scripts, by the code point of their zero: Arabic-Indic, Persian,
// Devanagari, Bengali, Thai, Myanmar, full width.
const zeros = [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xe50, 0x1040, 0xff10]
function asciiDigit(char: string): string | null {
  const code = char.codePointAt(0)!
  for (const zero of zeros) if (code >= zero && code <= zero + 9) return String(code - zero)
  return null
}
const digitsOf = (text: string) => [...text].map(asciiDigit).filter((digit): digit is string => digit !== null).join("")

/* ------------------------------------------------------------------ cards */

type CardBrand = {
  id: "visa" | "mastercard" | "amex" | "discover" | "diners" | "jcb" | "unionpay"
  name: string
  lengths: readonly number[]
  /** Digit groups by length; the last entry fits any other length. */
  groups: (length: number) => readonly number[]
  codeLength: number
  luhn: boolean
}

const fours = () => [4, 4, 4, 4, 3]
const brands: readonly (CardBrand & { starts: RegExp })[] = [
  { id: "amex", name: "American Express", starts: /^3[47]/, lengths: [15], groups: () => [4, 6, 5], codeLength: 4, luhn: true },
  { id: "diners", name: "Diners Club", starts: /^3(0[0-5]|[689])/, lengths: [14, 15, 16, 17, 18, 19], groups: (length) => (length === 14 ? [4, 6, 4] : fours()), codeLength: 3, luhn: true },
  { id: "jcb", name: "JCB", starts: /^35(2[89]|[3-8])/, lengths: [16, 17, 18, 19], groups: fours, codeLength: 3, luhn: true },
  { id: "visa", name: "Visa", starts: /^4/, lengths: [13, 16, 19], groups: fours, codeLength: 3, luhn: true },
  { id: "mastercard", name: "Mastercard", starts: /^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/, lengths: [16], groups: fours, codeLength: 3, luhn: true },
  { id: "discover", name: "Discover", starts: /^(6011|64[4-9]|65)/, lengths: [16, 17, 18, 19], groups: fours, codeLength: 3, luhn: true },
  // UnionPay cards don't all pass the Luhn check.
  { id: "unionpay", name: "UnionPay", starts: /^62/, lengths: [16, 17, 18, 19], groups: fours, codeLength: 3, luhn: false },
]

/** The card's brand from its first digits, or null while they don't say. */
function cardBrand(digits: string): CardBrand | null {
  return brands.find((brand) => brand.starts.test(digits)) ?? null
}

/** The Luhn check most card numbers carry in their last digit. */
function luhn(digits: string): boolean {
  let sum = 0
  for (let index = 0; index < digits.length; index++) {
    let digit = Number(digits[digits.length - 1 - index])
    if (index % 2 === 1) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2
    sum += digit
  }
  return digits.length > 0 && sum % 10 === 0
}

function group(text: string, sizes: readonly number[], gap = " ") {
  const parts: string[] = []
  let at = 0
  for (const size of sizes) {
    if (at >= text.length) break
    parts.push(text.slice(at, at + size))
    at += size
  }
  if (at < text.length) parts.push(text.slice(at))
  return parts.join(gap)
}

/** A card number: grouped by brand, its brand named beside it, checked by length and Luhn. */
function cardNumber(): Mask {
  const longest = (digits: string) => Math.max(...(cardBrand(digits)?.lengths ?? [19]))
  return {
    kind: "card-number",
    keep: (text) => {
      const digits = digitsOf(text)
      return digits.slice(0, longest(digits))
    },
    format: (kept) => group(kept, (cardBrand(kept)?.groups ?? fours)(kept.length)),
    value: (kept) => kept,
    fromValue: (value) => digitsOf(String(value ?? "")),
    check: (kept, words) => {
      if (!kept) return null
      const brand = cardBrand(kept)
      if (!(brand ? brand.lengths.includes(kept.length) : kept.length >= 12 && kept.length <= 19)) return words.cardIncomplete
      return brand && !brand.luhn ? null : luhn(kept) ? null : words.cardTypo
    },
    addon: (kept) => cardBrand(kept)?.name ?? null,
    addonAt: "end",
    inputMode: "numeric",
    autoComplete: "cc-number",
    placeholder: "1234 1234 1234 1234",
    secret: true,
  }
}

/** A card's expiry date as "MM / YY"; a month typed as 4 becomes 04. `now` for tests. */
function cardExpiry({ now = () => new Date() }: { now?: () => Date } = {}): Mask {
  const keep = (text: string) => {
    let digits = digitsOf(text)
    if (/^[2-9]/.test(digits)) digits = `0${digits}`
    return digits.slice(0, 4)
  }
  return {
    kind: "card-expiry",
    keep,
    format: (kept) => (kept.length > 2 ? `${kept.slice(0, 2)} / ${kept.slice(2)}` : kept),
    value: (kept) => (kept.length > 2 ? `${kept.slice(0, 2)}/${kept.slice(2)}` : kept),
    fromValue: (value) => keep(String(value ?? "")),
    // "12/2027", "12-27", "1/27": the month, and the year's last two digits.
    read: (text) => {
      const parts = text.match(/(\d{1,2})\D+(\d{2}|\d{4})\s*$/)
      return parts ? keep(parts[1]!.padStart(2, "0") + parts[2]!.slice(-2)) : keep(text)
    },
    check: (kept, words) => {
      if (!kept) return null
      if (kept.length < 4) return words.expiryIncomplete
      const month = Number(kept.slice(0, 2))
      if (month < 1 || month > 12) return words.expiryMonth(kept.slice(0, 2))
      const today = now()
      const year = 2000 + Number(kept.slice(2))
      return year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1) ? words.expired : null
    },
    inputMode: "numeric",
    autoComplete: "cc-exp",
    placeholder: "MM / YY",
  }
}

/** A card's security code: three digits, or four for American Express (`brand` from its number). */
function cardCode({ brand }: { brand?: () => CardBrand | null } = {}): Mask {
  const length = () => brand?.()?.codeLength ?? 3
  return {
    kind: "card-code",
    keep: (text) => digitsOf(text).slice(0, Math.max(4, length())),
    format: (kept) => kept,
    value: (kept) => kept,
    fromValue: (value) => digitsOf(String(value ?? "")),
    check: (kept, words) => (!kept || kept.length === length() ? null : words.codeLength(length())),
    inputMode: "numeric",
    autoComplete: "cc-csc",
    placeholder: "123",
    secret: true,
  }
}

/* ------------------------------------------------------------------ IBAN */

// Each country's IBAN length, from Wikipedia's table of IBAN formats (2026-11-23). SWIFT's
// IBAN registry is the source of truth.
const ibanLengths: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BI: 27, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24,
  DE: 22, DJ: 27, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FK: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27,
  GT: 28, HN: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20,
  LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MN: 20, MR: 27, MT: 31, MU: 30, NI: 28, NL: 18, NO: 15, OM: 23, PK: 24,
  PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, RU: 33, SA: 24, SC: 31, SD: 18, SE: 24, SI: 19, SK: 24, SM: 27, SO: 23, ST: 25,
  SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20, YE: 30,
}

/** The mod-97 check every IBAN carries in its third and fourth characters. */
function ibanChecks(iban: string): boolean {
  const moved = iban.slice(4) + iban.slice(0, 4)
  let rest = 0
  for (const char of moved) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55)
    for (const digit of digits) rest = (rest * 10 + Number(digit)) % 97
  }
  return rest === 1
}

const countryNames = new Map<string, Intl.DisplayNames>()
function countryName(code: string, locale?: string) {
  let names = countryNames.get(locale ?? "")
  if (!names) countryNames.set(locale ?? "", (names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: "region" })))
  try {
    return names.of(code) ?? code
  } catch {
    return code
  }
}

/** An IBAN: letters and digits in groups of four, checked by its country's length and mod 97. */
function iban({ locale }: { locale?: string } = {}): Mask {
  const keep = (text: string) =>
    [...text]
      .map((char) => asciiDigit(char) ?? (/[a-z]/i.test(char) ? char.toUpperCase() : ""))
      .join("")
      .slice(0, 34)
  return {
    kind: "iban",
    keep,
    format: (kept) => kept.replace(/(.{4})(?=.)/g, "$1 "),
    value: (kept) => kept,
    fromValue: (value) => keep(String(value ?? "")),
    check: (kept, words) => {
      if (!kept) return null
      const code = kept.slice(0, 2)
      const length = ibanLengths[code]
      if (!/^[A-Z]{2}\d{2}/.test(kept) || !length) return words.ibanCountry(code)
      if (kept.length !== length) return words.ibanLength(countryName(code, locale), length)
      return ibanChecks(kept) ? null : words.ibanTypo
    },
    addon: (kept) => (ibanLengths[kept.slice(0, 2)] ? countryName(kept.slice(0, 2), locale) : null),
    addonAt: "end",
    inputMode: "text",
    autoComplete: "off",
  }
}

/* ------------------------------------------------------------------ money */

/** An amount of money, grouped as it's typed in the locale; its value a number. */
function currency({ currency: code = "USD", locale }: { currency?: string; locale?: string } = {}): Mask {
  const plain = new Intl.NumberFormat(locale, { numberingSystem: "latn" })
  const parts = plain.formatToParts(12345.6)
  const groupMark = parts.find((part) => part.type === "group")?.value ?? ","
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? "."
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: code, numberingSystem: "latn" })
  const decimals = money.resolvedOptions().maximumFractionDigits ?? 2
  const moneyParts = money.formatToParts(1)
  const symbol = moneyParts.find((part) => part.type === "currency")?.value ?? code
  const symbolFirst = moneyParts.findIndex((part) => part.type === "currency") < moneyParts.findIndex((part) => part.type === "integer")
  const grouper = new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: true, maximumFractionDigits: 0 })

  const keep = (text: string) => {
    let kept = ""
    let fraction = -1
    for (const char of text) {
      const digit = asciiDigit(char)
      if (digit !== null) {
        if (fraction >= decimals) continue
        if (fraction >= 0) fraction++
        kept += digit
      } else if (char === decimal && fraction < 0 && decimals > 0) {
        kept += "."
        fraction = 0
      }
    }
    return kept
  }
  return {
    kind: "currency",
    keep,
    format: (kept) => {
      const [whole = "", fraction] = kept.split(".")
      const grouped = whole ? grouper.format(BigInt(whole)) : ""
      return fraction === undefined ? grouped : `${grouped}${decimal}${fraction}`
    },
    value: (kept) => (kept && kept !== "." ? Number(kept.startsWith(".") ? `0${kept}` : kept) : null),
    // A number, or one as text ("1234.5", as a web element's value attribute holds it).
    fromValue: (value) => {
      const amount = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN
      return Number.isFinite(amount) ? keep(String(amount).replace(".", decimal)) : ""
    },
    // An agent's "1,234.50", "1234.5" or "€12": with the locale's decimal mark when the text
    // has one; otherwise one point is a decimal point, unless it groups thousands here ("1.234").
    read: (text) => {
      if (text.includes(decimal)) return keep(text.replaceAll(groupMark, ""))
      const point = /^[^.]*\.(\d+)\D*$/.exec(text)
      const groupsThousands = groupMark === "." && point?.[1]?.length === 3
      return keep(point && !groupsThousands ? text.replace(/[,\s]/g, "").replace(".", decimal) : text)
    },
    check: () => null,
    addon: () => symbol,
    addonAt: symbolFirst ? "start" : "end",
    inputMode: "decimal",
    autoComplete: "transaction-amount",
  }
}

/* ------------------------------------------------------------------ patterns */

/** A pattern of your own: `9` is a digit, `A` a letter, `*` either; anything else shows as is. */
function pattern(shape: string): Mask {
  const slots = [...shape].filter((char) => char === "9" || char === "A" || char === "*")
  const fits = (char: string, slot: string) => (slot === "9" ? /\d/.test(char) : slot === "A" ? /\p{L}/u.test(char) : /[\p{L}\d]/u.test(char))
  const keep = (text: string) => {
    let kept = ""
    for (const raw of text) {
      if (kept.length >= slots.length) break
      const char = asciiDigit(raw) ?? raw
      if (fits(char, slots[kept.length]!)) kept += char
    }
    return kept
  }
  const example = shape.replace(/9/g, "0").replace(/\*/g, "0")
  return {
    kind: "pattern",
    keep,
    format: (kept) => {
      let text = ""
      let at = 0
      for (const char of shape) {
        if (at >= kept.length) break
        if (char === "9" || char === "A" || char === "*") text += kept[at++]
        else text += char
      }
      return text
    },
    value: (kept) => kept,
    fromValue: (value) => keep(String(value ?? "")),
    check: (kept, words) => (!kept || kept.length === slots.length ? null : words.patternIncomplete(example)),
    inputMode: slots.every((slot) => slot === "9") ? "numeric" : "text",
    placeholder: example,
  }
}

/** A mask by the name Web Components and a schema form use. `forCard` is the card number a security code is for. */
function maskNamed(name: string, options: { currency?: string; locale?: string; pattern?: string; forCard?: string } = {}): Mask | null {
  switch (name) {
    case "card-number":
      return cardNumber()
    case "card-expiry":
      return cardExpiry()
    case "card-code":
      return cardCode({ brand: () => cardBrand(digitsOf(options.forCard ?? "")) })
    case "iban":
      return iban({ locale: options.locale })
    case "currency":
      return currency({ currency: options.currency, locale: options.locale })
    case "pattern":
      return options.pattern ? pattern(options.pattern) : null
    default:
      return null
  }
}

export { cardBrand, cardCode, cardExpiry, cardNumber, currency, digitsOf, iban, ibanChecks, luhn, maskMessages, maskNamed, pattern }
export type { CardBrand, Mask, MaskMessages }
