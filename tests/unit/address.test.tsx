import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { expect, test } from "vitest"
import { AddressFields, addressLayout, checkAddress, emptyAddress, fillAddress, type AddressFieldName, type AddressValue } from "@/registry/uiset/ui/address"
import { createBridge, settle } from "./bridge"

test("each country's fields come in its own order, with its own names and required ones", () => {
  const us = addressLayout("US")
  expect(us.rows).toEqual([["line1"], ["line2"], ["city", "region", "postalCode"]])
  expect([us.labels.region, us.labels.postalCode]).toEqual(["State", "ZIP code"])
  const gb = addressLayout("GB")
  expect(gb.rows).toEqual([["line1"], ["line2"], ["city"], ["postalCode"]])
  expect(gb.labels.city).toBe("Town or city")
  expect(gb.regions).toBeNull()
  expect(addressLayout("DE").rows.at(-1)).toEqual(["postalCode", "city"])
  // Japan writes the postal code first and has no city field; Brazil writes a neighborhood.
  expect(addressLayout("JP").rows).toEqual([["postalCode"], ["region"], ["line1"], ["line2"]])
  expect(addressLayout("BR").labels.district).toBe("Neighborhood")
  expect(addressLayout("IE").labels.postalCode).toBe("Eircode")
  expect(addressLayout("IN").labels.postalCode).toBe("PIN code")
  expect([...addressLayout("AE").required]).not.toContain("postalCode")
  expect(addressLayout("CA").regions?.find(([key]) => key === "ON")?.[1]).toBe("Ontario")
})

const us = (fields: Partial<AddressValue>): AddressValue => ({ ...emptyAddress("US"), name: "Ada Lovelace", line1: "1 Main St", city: "Springfield", region: "CA", postalCode: "94110", ...fields })

test("an address is checked as a whole: what's missing, a postal code's shape, and a ZIP code outside its state", () => {
  expect(checkAddress(us({}))).toEqual({})
  expect(checkAddress(emptyAddress("US"))).toEqual({
    name: "Full name is required.",
    line1: "Address is required.",
    city: "City is required.",
    region: "State is required.",
    postalCode: "ZIP code is required.",
  })
  expect(checkAddress(us({ postalCode: "9411" }))).toEqual({ postalCode: "ZIP code should look like 95014." })
  expect(checkAddress(us({ postalCode: "10001" }))).toEqual({ postalCode: "ZIP code 10001 is outside California." })
  expect(checkAddress(us({ region: "Ontario" }))).toEqual({ region: 'State "Ontario" isn\'t one in United States.' })
  expect(checkAddress({ ...us({}), country: "CA", region: "QC", postalCode: "h3z 2y7" })).toEqual({})
  // The United Kingdom asks for no region; a Canadian province in it is left alone.
  expect(checkAddress({ ...us({ region: "" }), country: "GB", postalCode: "EC1Y 8SY" })).toEqual({})
})

test("an agent's fill takes names or labels, the country first, a region by name, and says what it can't take", () => {
  const filled = fillAddress(emptyAddress("US"), { "Postal code": "m5v 2t6", country: "Canada", province: "Ontario", City: "Toronto" })
  expect(filled.problems).toEqual([])
  expect(filled.value).toMatchObject({ country: "CA", region: "ON", city: "Toronto", postalCode: "M5V 2T6" })
  expect(filled.filled).toEqual(["Country or region", "Postal code", "Province", "City"])
  const refused = fillAddress(emptyAddress("US"), { country: "Atlantis", county: "Kent" })
  expect(refused.problems).toEqual([
    'No country or region "Atlantis". Use its name or its code, like GB.',
    'No field "county". The fields are Country or region, Full name, Address, Apartment, suite, etc., City, State, ZIP code.',
  ])
})

function Shipping({ errors }: { errors?: Partial<Record<AddressFieldName, string>> }) {
  const [value, setValue] = useState<AddressValue>(emptyAddress("US"))
  return (
    <>
      <AddressFields label="Delivery address" value={value} onValueChange={setValue} errors={errors} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  )
}
const valueOf = () => JSON.parse(screen.getByTestId("value").textContent!) as AddressValue

test("a person fills it; typing a country's whole name, as autofill does, changes the fields to that country's", async () => {
  render(<Shipping />)
  const address = screen.getByRole("group", { name: "Delivery address" })
  expect(within(address).getByRole("textbox", { name: "ZIP code" }).getAttribute("autocomplete")).toBe("shipping postal-code")
  const country = within(address).getByRole("combobox", { name: "Country or region" })
  await userEvent.clear(country)
  await userEvent.type(country, "Canada")
  await settle()
  expect(valueOf().country).toBe("CA")
  expect(within(address).getByRole("textbox", { name: "Postal code" })).toBeTruthy()
  const province = within(address).getByRole("combobox", { name: "Province" })
  await userEvent.type(province, "Quebec")
  await settle()
  expect(valueOf().region).toBe("QC")
  await userEvent.type(within(address).getByRole("textbox", { name: "Full name" }), "Ada Lovelace")
  await userEvent.type(within(address).getByRole("textbox", { name: "Apartment, suite, etc. (optional)" }), "Unit 4")
  const postal = within(address).getByRole("textbox", { name: "Postal code" })
  await userEvent.type(postal, "h3z")
  await userEvent.tab()
  expect(within(address).getByText("Postal code should look like H3Z 2Y7.")).toBeTruthy()
  await userEvent.type(postal, "  2y7")
  await userEvent.tab()
  expect(valueOf()).toMatchObject({ name: "Ada Lovelace", line2: "Unit 4", postalCode: "H3Z 2Y7" })
  expect(within(address).queryByText("Postal code should look like H3Z 2Y7.")).toBeNull()
})

test("problems from a submit show under their fields, and focus goes to the first", async () => {
  render(<Shipping errors={checkAddress(emptyAddress("US"))} />)
  await settle()
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Full name" }))
  expect(screen.getByText("ZIP code is required.")).toBeTruthy()
})

test("an agent sees one component per address and fills it in one step; what's wrong shows and comes back", async () => {
  render(<Shipping />)
  const bridge = createBridge()
  await settle()
  expect(bridge.find("City")).toBeUndefined()
  expect(bridge.entry("Delivery address").items?.map((item) => item.label)).toContain("ZIP code")
  const filled = await bridge.run("Delivery address", "fill", { country: "United Kingdom", name: "Ada Lovelace", address: "12 Hill St", "town or city": "London", postcode: "ec1y 8sy" })
  expect(filled.ok).toBe(false)
  expect(filled.error?.message).toContain('No field "postcode"')
  const done = await bridge.run("Delivery address", "fill", { "Postal code": "ec1y 8sy" })
  expect(done.ok, done.error?.message).toBe(true)
  expect(valueOf()).toMatchObject({ country: "GB", name: "Ada Lovelace", line1: "12 Hill St", city: "London", postalCode: "EC1Y 8SY" })
  const wrong = await bridge.run("Delivery address", "fill", { "Postal code": "12345" })
  expect(wrong.error?.message).toBe("Postal code should look like EC1Y 8SY.")
  expect(screen.getByText("Postal code should look like EC1Y 8SY.")).toBeTruthy()
})
