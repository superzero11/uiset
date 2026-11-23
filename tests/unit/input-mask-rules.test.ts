import { expect, test } from "vitest"
import { formatEdit } from "@/registry/uiset/ui/shell/format-as-you-type"
import { cardBrand, cardCode, cardExpiry, cardNumber, currency, iban, ibanChecks, luhn, maskMessages as words, pattern, type Mask } from "@/registry/uiset/ui/input-mask/masks"

/** Typing text into an empty field, a character at a time, as the field does. */
function typeInto(mask: Mask, typed: string) {
  let text = ""
  let before = ""
  for (const char of typed) {
    const edit = formatEdit({ text: text + char, caret: text.length + 1, inputType: "insertText", before }, mask)
    text = edit.text
    before = edit.kept
  }
  return { text, kept: before, value: mask.value(before) }
}

test("a card number groups by its brand, names the brand, and stops at its length", () => {
  expect(typeInto(cardNumber(), "4242424242424242")).toEqual({ text: "4242 4242 4242 4242", kept: "4242424242424242", value: "4242424242424242" })
  expect(typeInto(cardNumber(), "378282246310005").text).toBe("3782 822463 10005")
  expect(typeInto(cardNumber(), "36227206271667").text).toBe("3622 720627 1667")
  // Amex stops at 15 digits.
  expect(typeInto(cardNumber(), "3782822463100059999").kept).toBe("378282246310005")
  expect(cardNumber().addon!("4242")).toBe("Visa")
  expect(cardNumber().addon!("5555")).toBe("Mastercard")
  expect(cardNumber().addon!("2223")).toBe("Mastercard")
  expect(cardNumber().addon!("34")).toBe("American Express")
  expect(cardNumber().addon!("6011")).toBe("Discover")
  expect(cardNumber().addon!("3530")).toBe("JCB")
  expect(cardNumber().addon!("62")).toBe("UnionPay")
  expect(cardNumber().addon!("9")).toBeNull()
  expect(cardBrand("378282246310005")?.codeLength).toBe(4)
})

test("a card number is checked by its length and the Luhn check", () => {
  const mask = cardNumber()
  expect(luhn("4242424242424242")).toBe(true)
  expect(luhn("4242424242424241")).toBe(false)
  expect(mask.check("4242424242424242", words)).toBeNull()
  expect(mask.check("424242424242", words)).toBe("Not a whole card number yet.")
  expect(mask.check("4242424242424241", words)).toBe("This card number has a typo. Check it digit by digit.")
  expect(mask.check("", words)).toBeNull()
})

test("an expiry date shows as MM / YY, a month typed as 4 becomes 04, and a past date is refused", () => {
  const mask = cardExpiry({ now: () => new Date(2026, 10, 23) })
  expect(typeInto(mask, "1227")).toEqual({ text: "12 / 27", kept: "1227", value: "12/27" })
  expect(typeInto(mask, "427")).toEqual({ text: "04 / 27", kept: "0427", value: "04/27" })
  expect(mask.check("1326", words)).toBe("There's no month 13.")
  expect(mask.check("1026", words)).toBe("This card has expired.")
  expect(mask.check("1126", words)).toBeNull()
  expect(mask.check("12", words)).toBe("Give the month and year on the card, like 04 / 27.")
  expect(mask.read!("12/2027")).toBe("1227")
  expect(mask.read!("1-27")).toBe("0127")
})

test("a security code is three digits, or four for American Express", () => {
  expect(cardCode().check("12", words)).toBe("The security code is 3 digits.")
  expect(cardCode().check("123", words)).toBeNull()
  const amex = cardCode({ brand: () => cardBrand("3782") })
  expect(amex.check("123", words)).toBe("The security code is 4 digits.")
  expect(amex.check("1234", words)).toBeNull()
})

test("an IBAN groups in fours, upper case, and is checked by its country's length and mod 97", () => {
  const mask = iban({ locale: "en" })
  expect(typeInto(mask, "de89370400440532013000")).toMatchObject({ text: "DE89 3704 0044 0532 0130 00", value: "DE89370400440532013000" })
  // Well-known example IBANs from twelve countries pass the check and their lengths.
  for (const example of [
    "DE89 3704 0044 0532 0130 00",
    "GB82 WEST 1234 5698 7654 32",
    "FR14 2004 1010 0505 0001 3M02 606",
    "NL91 ABNA 0417 1643 00",
    "BE68 5390 0754 7034",
    "CH93 0076 2011 6238 5295 7",
    "ES91 2100 0418 4502 0005 1332",
    "IT60 X054 2811 1010 0000 0123 456",
    "NO93 8601 1117 947",
    "AT61 1904 3002 3457 3201",
    "PL61 1090 1014 0000 0712 1981 2874",
    "IE64 IRCE 9205 0112 3456 78",
  ]) expect(mask.check(mask.keep(example), words), example).toBeNull()
  expect(ibanChecks("DE89370400440532013001")).toBe(false)
  expect(mask.check("DE89370400440532013001", words)).toBe("This IBAN has a typo. Check it character by character.")
  expect(mask.check("DE8937040044", words)).toBe("An IBAN in Germany has 22 characters.")
  expect(mask.check("ZZ12", words)).toBe("No IBAN starts with ZZ.")
  expect(mask.addon!("GB82")).toBe("United Kingdom")
})

test("an amount groups as it's typed in its locale, keeps its currency's decimals, and is a number", () => {
  const dollars = currency({ currency: "USD", locale: "en-US" })
  expect(typeInto(dollars, "1234567.891")).toEqual({ text: "1,234,567.89", kept: "1234567.89", value: 1234567.89 })
  expect(dollars.addon!("")).toBe("$")
  expect(dollars.addonAt).toBe("start")
  const euros = currency({ currency: "EUR", locale: "de-DE" })
  expect(typeInto(euros, "1234,5")).toMatchObject({ text: "1.234,5", value: 1234.5 })
  expect(euros.addon!("")).toBe("€")
  expect(euros.addonAt).toBe("end")
  // Yen has no decimals: the point is left out.
  const yen = currency({ currency: "JPY", locale: "ja-JP" })
  expect(typeInto(yen, "12345.6")).toMatchObject({ text: "123,456", value: 123456 })
  // Other scripts' digits; an agent's amount in either style.
  expect(typeInto(dollars, "١٢٣٤").text).toBe("1,234")
  expect(dollars.read!("$1,234.50")).toBe("1234.50")
  expect(euros.read!("1234.5")).toBe("1234.5")
  expect(euros.read!("1.234,50")).toBe("1234.50")
  expect(euros.read!("1.234")).toBe("1234")
  expect(dollars.fromValue(1234.5)).toBe("1234.5")
  expect(euros.fromValue("1234.5")).toBe("1234.5")
  expect(dollars.fromValue("")).toBe("")
  expect(dollars.value("")).toBeNull()
})

test("Backspace on a group mark in an amount takes the digit before it", () => {
  const dollars = currency({ currency: "USD", locale: "en-US" })
  // "1,|234": Backspace removed the comma.
  expect(formatEdit({ text: "1234", caret: 1, inputType: "deleteContentBackward", before: "1234" }, dollars)).toMatchObject({ text: "234", caret: 0 })
})

test("a pattern: 9 a digit, A a letter, * either; the rest shows as typed past it", () => {
  const ssn = pattern("999-99-9999")
  expect(typeInto(ssn, "123456789")).toEqual({ text: "123-45-6789", kept: "123456789", value: "123456789" })
  expect(typeInto(ssn, "12a3")).toMatchObject({ text: "123" })
  expect(ssn.check("12345", words)).toBe("Not complete yet: like 000-00-0000.")
  expect(ssn.inputMode).toBe("numeric")
  const postcode = pattern("A9A 9A9")
  expect(typeInto(postcode, "k1a0b1")).toMatchObject({ text: "k1a 0b1" })
  expect(postcode.inputMode).toBe("text")
  expect(typeInto(pattern("(999) 999-9999"), "4155550123").text).toBe("(415) 555-0123")
})
