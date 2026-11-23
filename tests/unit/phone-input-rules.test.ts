import { expect, test } from "vitest"
import { caretAfter, formatEdit } from "@/registry/uiset/ui/shell/format-as-you-type"
import {
  checkPhone,
  countryList,
  editPhone,
  findCountry,
  readPhone,
  showPhone,
  startCountry,
  typePhone,
} from "@/registry/uiset/ui/phone-input/phone"

// A format that groups digits in threes, to test the caret on its own.
const groups = { keep: (text: string) => text.replace(/\D/g, ""), format: (kept: string) => kept.replace(/(\d{3})(?=\d)/g, "$1 ") }

test("the caret stays after the same kept character as separators come and go", () => {
  // "123 4|56" with "9" typed after the 4: "123 49|56" becomes "123 495 6", caret after the 9.
  expect(formatEdit({ text: "123 4956", caret: 6, inputType: "insertText", before: "123456" }, groups)).toEqual({ text: "123 495 6", caret: 6, kept: "1234956" })
  expect(caretAfter("123 456", 3, groups.keep)).toBe(3)
  expect(caretAfter("123 456", 4, groups.keep)).toBe(5)
  expect(caretAfter("123 456", 0, groups.keep)).toBe(0)
})

test("Backspace on a separator takes the character before it; Delete, the one after", () => {
  // "123 |456": Backspace removed the space, which the format puts back.
  expect(formatEdit({ text: "123456", caret: 3, inputType: "deleteContentBackward", before: "123456" }, groups)).toEqual({ text: "124 56", caret: 2, kept: "12456" })
  // "123| 456": Delete removed the space.
  expect(formatEdit({ text: "123456", caret: 3, inputType: "deleteContentForward", before: "123456" }, groups)).toEqual({ text: "123 56", caret: 3, kept: "12356" })
  // A real character deleted is left as it is.
  expect(formatEdit({ text: "12 456", caret: 2, inputType: "deleteContentBackward", before: "123456" }, groups)).toEqual({ text: "124 56", caret: 2, kept: "12456" })
})

test("a phone number formats for its country, and its value is E.164", () => {
  expect(typePhone("4155550123", "US")).toEqual({ text: "(415) 555-0123", value: "+14155550123", country: "US" })
  expect(typePhone("02079460958", "GB")).toEqual({ text: "020 7946 0958", value: "+442079460958", country: "GB" })
  expect(typePhone("", "US")).toEqual({ text: "", value: "", country: "US" })
})

test("a typed + and calling code chooses the country, the main one for a shared code", () => {
  expect(typePhone("+442079460958", "US")).toMatchObject({ text: "+44 20 7946 0958", value: "+442079460958", country: "GB" })
  expect(typePhone("+44", "US").country).toBe("GB")
  expect(typePhone("+1", "GB").country).toBe("US")
  // A code the country already has keeps it: Canada stays Canada on +1.
  expect(typePhone("+1", "CA").country).toBe("CA")
})

test("other scripts' digits are read as 0 to 9", () => {
  expect(typePhone("٠٥١٢٣٤٥٦٧٨", "SA")).toMatchObject({ text: "051 234 5678", value: "+966512345678" })
  expect(typePhone("۰۹۱۲۳۴۵۶۷۸۹", "IR").value).toBe("+989123456789")
})

test("an edit in the field keeps the caret and steps over separators", () => {
  // Backspace on the "-" in "(415) 555-|0123" removes the 5 before it, not just the "-".
  const edit = editPhone({ text: "(415) 5550123", caret: 9, inputType: "deleteContentBackward", before: "4155550123" }, "US")
  expect(edit).toMatchObject({ text: "(415) 550-123", kept: "415550123", value: "+1415550123" })
  expect(edit.text.slice(0, edit.caret)).toBe("(415) 55")
})

test("checks: too short, too long or not valid, named by country", () => {
  expect(checkPhone("+14155550123", "US")).toBeNull()
  expect(checkPhone("", "US")).toBeNull()
  expect(checkPhone("+141555", "US")).toBe("Too short for a number in United States.")
  expect(checkPhone("+1415555012345", "US")).toBe("Too long for a number in United States.")
  expect(checkPhone("+11115550123", "US")).toBe("Not a valid number in United States.")
})

test("a number in any format is read for the country, or with its own calling code", () => {
  expect(readPhone("020 7946 0958", "GB")).toEqual({ value: "+442079460958", country: "GB" })
  expect(readPhone("+44 20 7946 0958", "US")).toEqual({ value: "+442079460958", country: "GB" })
  expect(readPhone("(415) 555-0123", "US")).toEqual({ value: "+14155550123", country: "US" })
  expect(readPhone("", "US")).toEqual({ value: "", country: "US" })
  expect(readPhone("call me", "US")).toEqual({ error: "Not a phone number: call me" })
  expect(readPhone("555", "US")).toEqual({ error: "Too short for a number in United States." })
})

test("a value from outside shows nationally, in its own country", () => {
  expect(showPhone("+442079460958", "US")).toEqual({ text: "020 7946 0958", country: "GB" })
  expect(showPhone("", "US")).toEqual({ text: "", country: "US" })
})

test("countries: named in the page's language, preferred ones first, found by name, code or calling code", () => {
  const list = countryList({ locale: "en", preferred: ["GB", "US"] })
  expect(list.slice(0, 2).map((country) => country.code)).toEqual(["GB", "US"])
  expect(list[2]).toMatchObject({ code: "AF", name: "Afghanistan", dial: "+93", flag: "🇦🇫" })
  expect(countryList({ only: ["FR", "DE"], locale: "en" }).map((country) => country.name)).toEqual(["France", "Germany"])
  expect(countryList({ only: ["DE"], locale: "de" })[0]!.name).toBe("Deutschland")
  expect(findCountry("United Kingdom", "en")).toBe("GB")
  expect(findCountry("gb")).toBe("GB")
  expect(findCountry("+44")).toBe("GB")
  expect(findCountry("Ger", "en")).toBe("DE")
  expect(findCountry("Narnia", "en")).toBeUndefined()
})

test("the country to start in: given, else the language's region, else the United States", () => {
  expect(startCountry("gb")).toBe("GB")
  expect(startCountry(undefined, "fr-CA")).toBe("CA")
  expect(startCountry(undefined, "ja")).toBe("JP")
  expect(startCountry("XX", "zz")).toBe("US")
})
