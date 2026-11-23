import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/combobox"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// <uiset-phone-input> on web/content.html, with no React: the same rules as React's
// PhoneInput, loaded as a chunk of their own, `valuechange` and `countrychange` out, and the
// agent's setValue and setCountry.

type Live = HTMLElement & { value: string; country: string; validate?: (value: string) => string | null }

const phone = () => document.getElementById("phone") as Live
const number = () => within(phone()).getByRole<HTMLInputElement>("textbox", { name: "Phone" })
const countryButton = () => within(phone()).getByRole("button", { name: /^Country: / })
const error = () => phone().querySelector("ui-field-error")?.textContent || null
async function open() {
  const bridge = await openWebPage("content.html", "content-demo.ts")
  await waitFor(() => expect(phone().querySelector(".phone-input-number")).toBeTruthy())
  await settle()
  return bridge
}

beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("it shows its value nationally, named by its label, its country on the button", async () => {
  await open()
  expect(number().value).toBe("(415) 555-0123")
  expect(number().getAttribute("dir")).toBe("ltr")
  expect(countryButton().getAttribute("aria-label")).toBe("Country: United States, +1")
})

test("digits format as typed, a + and calling code chooses the country, and both events say why", async () => {
  await open()
  const events: string[] = []
  phone().addEventListener("valuechange", (event) => events.push(`value ${(event as CustomEvent).detail.value} ${(event as CustomEvent).detail.reason}`))
  phone().addEventListener("countrychange", (event) => events.push(`country ${(event as CustomEvent).detail.value} ${(event as CustomEvent).detail.reason}`))
  await userEvent.clear(number())
  await userEvent.type(number(), "+442079460958")
  await settle()
  expect(number().value).toBe("+44 20 7946 0958")
  expect(phone().value).toBe("+442079460958")
  expect(phone().country).toBe("GB")
  expect(countryButton().getAttribute("aria-label")).toBe("Country: United Kingdom, +44")
  expect(events).toContain("country GB type")
  expect(events.at(-1)).toBe("value +442079460958 type")
})

test("Backspace on a separator removes the digit before it", async () => {
  await open()
  await userEvent.type(number(), "{Backspace}", { initialSelectionStart: 10, initialSelectionEnd: 10 })
  await settle()
  expect(number().value).toBe("(415) 550-123")
  expect(phone().value).toBe("+1415550123")
})

test("the country list searches by calling code, and a choice reformats the digits", async () => {
  await open()
  await userEvent.clear(number())
  await userEvent.type(number(), "02079460958")
  await userEvent.click(countryButton())
  await settle()
  const search = screen.getByRole("combobox", { name: "Search countries" })
  await userEvent.type(search, "+44")
  await settle()
  await userEvent.click(screen.getByRole("option", { name: /United Kingdom/ }))
  await settle()
  expect(phone().country).toBe("GB")
  expect(number().value).toBe("020 7946 0958")
  expect(phone().value).toBe("+442079460958")
})

test("leaving a number that's too short says so, and validate adds rules", async () => {
  await open()
  phone().validate = (value) => (value.startsWith("+1900") ? "No premium numbers." : null)
  await userEvent.clear(number())
  await userEvent.type(number(), "415555")
  number().blur()
  await settle()
  expect(error()).toBe("Too short for a number in United States.")
  expect(number().validationMessage).toBe("Too short for a number in United States.")
  await userEvent.clear(number())
  await userEvent.type(number(), "9005550123")
  number().blur()
  await settle()
  expect(error()).toBe("No premium numbers.")
})

test("an agent sets the number in any format and the country by name, and hears why it's refused", async () => {
  const bridge = await open()
  expect(bridge.entry("Phone")).toMatchObject({ component: "phone-input", value: "+14155550123", country: "US" })
  const set = await bridge.run("Phone", "setValue", "020 7946 0958", "United Kingdom")
  expect(set.ok, set.error?.message).toBe(true)
  expect(phone().value).toBe("+442079460958")
  expect(number().value).toBe("020 7946 0958")
  expect(await bridge.run("Phone", "setValue", "555")).toMatchObject({ ok: false, error: { message: expect.stringContaining("Too short for a number in United Kingdom.") } })
  expect(await bridge.run("Phone", "setCountry", "Atlantis")).toMatchObject({ ok: false, error: { message: expect.stringContaining('No country "Atlantis"') } })
  expect((await bridge.run("Phone", "setCountry", "Germany")).ok).toBe(true)
  expect(phone().country).toBe("DE")
})
