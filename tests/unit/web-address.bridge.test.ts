import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/combobox"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/toast"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Address kit as a web element (web/address.html), with no React: the country's fields,
// a person's edits and check(), and an agent's fill.

type Address = HTMLElement & { value: Record<string, string>; check(): boolean }

const group = () => screen.getByRole("group", { name: "Delivery address" })
const address = () => document.getElementById("address") as Address
const open = () => openWebPage("address.html", "address-demo.ts")

beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("it starts in its country, and a country typed out changes the fields to that country's", async () => {
  await open()
  expect(address().value.country).toBe("US")
  expect(within(group()).getByRole("textbox", { name: "ZIP code" }).getAttribute("autocomplete")).toBe("shipping postal-code")
  const country = within(group()).getByRole("combobox", { name: "Country or region" })
  await userEvent.clear(country)
  await userEvent.type(country, "Japan")
  await settle()
  expect(address().value.country).toBe("JP")
  const labels = [...group().querySelectorAll("[data-address-field]")].map((field) => field.getAttribute("data-address-field"))
  expect(labels).toEqual(["country", "name", "postalCode", "region", "line1", "line2"])
  expect(within(group()).getByRole("combobox", { name: "Country or region" })).toBe(country)
})

test("check() shows what's missing with focus on the first; a postal code's shape is checked as focus leaves", async () => {
  await open()
  expect(address().check()).toBe(false)
  await settle()
  expect(document.activeElement).toBe(within(group()).getByRole("textbox", { name: "Full name" }))
  expect(within(group()).getByText("ZIP code is required.")).toBeTruthy()
  const zip = within(group()).getByRole("textbox", { name: "ZIP code" })
  await userEvent.type(zip, "941")
  await userEvent.tab()
  expect(within(group()).getByText("ZIP code should look like 95014.")).toBeTruthy()
  await userEvent.type(zip, "10")
  expect(within(group()).queryByText("ZIP code should look like 95014.")).toBeNull()
  expect(within(group()).queryByText("ZIP code is required.")).toBeNull()
  expect(address().value.postalCode).toBe("94110")
})

test("a region is chosen by typing its name, and a ZIP code outside it says so", async () => {
  await open()
  await userEvent.type(within(group()).getByRole("combobox", { name: "State" }), "California")
  await settle()
  expect(address().value.region).toBe("CA")
  await userEvent.type(within(group()).getByRole("textbox", { name: "ZIP code" }), "10001")
  await userEvent.tab()
  expect(within(group()).getByText("ZIP code 10001 is outside California.")).toBeTruthy()
})

test("an agent sees one component and fills it in one step, the country first; what's wrong comes back", async () => {
  const bridge = await open()
  expect(bridge.find("City")).toBeUndefined()
  const filled = await bridge.run("Delivery address", "fill", { country: "Canada", name: "Ada Lovelace", address: "100 King St W", city: "Toronto", province: "Ontario", "postal code": "m5x 1a9" })
  expect(filled.ok, filled.error?.message).toBe(true)
  expect(address().value).toMatchObject({ country: "CA", region: "ON", postalCode: "M5X 1A9", line1: "100 King St W" })
  expect(within(group()).getByRole("textbox", { name: "Postal code" }).getAttribute("value") ?? (within(group()).getByRole("textbox", { name: "Postal code" }) as HTMLInputElement).value).toBe("M5X 1A9")
  const wrong = await bridge.run("Delivery address", "fill", { province: "Texas" })
  expect(wrong.error?.message).toBe('Province "Texas" isn\'t one in Canada.')
  expect(address().check()).toBe(true)
})

test("a page sets its value as it would a native input's: the fields follow, and nothing fires", async () => {
  await open()
  const heard: unknown[] = []
  address().addEventListener("valuechange", (event) => heard.push(event))
  address().value = { country: "DE", name: "Ada Lovelace", line1: "Hauptstr. 1", line2: "", district: "", city: "Berlin", region: "", postalCode: "10115" }
  await settle()
  const fields = [...group().querySelectorAll("[data-address-field]")].map((field) => field.getAttribute("data-address-field"))
  expect(fields).toEqual(["country", "name", "line1", "line2", "postalCode", "city"])
  expect((within(group()).getByRole("textbox", { name: "Postal code" }) as HTMLInputElement).value).toBe("10115")
  expect(heard).toEqual([])
  expect(address().check()).toBe(true)
})
