import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { PhoneInput, type PhoneInputProps } from "@/registry/uiset/ui/phone-input"
import { createBridge, settle } from "./bridge"

const number = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Phone" })
const countryButton = () => screen.getByRole("button", { name: /^Country: / })
const error = () => document.querySelector('[data-slot="field-error"]')?.textContent ?? null

function Phone(props: Partial<PhoneInputProps>) {
  const [value, setValue] = useState(props.defaultValue ?? "")
  return (
    <>
      <PhoneInput
        label="Phone"
        defaultCountry="US"
        {...props}
        defaultValue={undefined}
        value={value}
        onValueChange={(next, details) => (setValue(next), props.onValueChange?.(next, details))}
      />
      <button type="button">Elsewhere</button>
    </>
  )
}

test("the label names the number, and the country button says the country and its code", async () => {
  render(<Phone />)
  expect(number().getAttribute("type")).toBe("tel")
  expect(number().getAttribute("dir")).toBe("ltr")
  expect(countryButton().getAttribute("aria-label")).toBe("Country: United States, +1")
})

test("digits format for the country as they're typed, and the value is E.164", async () => {
  const onValueChange = vi.fn()
  render(<Phone onValueChange={onValueChange} />)
  await userEvent.type(number(), "4155550123")
  expect(number().value).toBe("(415) 555-0123")
  expect(onValueChange).toHaveBeenLastCalledWith("+14155550123", { reason: "type", source: "user" })
})

test("a typed + and calling code chooses the country", async () => {
  const onCountryChange = vi.fn()
  render(<Phone onCountryChange={onCountryChange} />)
  await userEvent.type(number(), "+442079460958")
  expect(number().value).toBe("+44 20 7946 0958")
  expect(countryButton().getAttribute("aria-label")).toBe("Country: United Kingdom, +44")
  expect(onCountryChange).toHaveBeenLastCalledWith("GB", { reason: "type", source: "user" })
})

test("Backspace on a separator removes the digit before it, and the caret stays", async () => {
  render(<Phone defaultValue="+14155550123" />)
  expect(number().value).toBe("(415) 555-0123")
  // The caret after "-": "(415) 555-|0123".
  await userEvent.type(number(), "{Backspace}", { initialSelectionStart: 10, initialSelectionEnd: 10 })
  expect(number().value).toBe("(415) 550-123")
  expect(number().value.slice(0, number().selectionStart!)).toBe("(415) 55")
})

test("a pasted number in any format is read whole, its country too", async () => {
  const onValueChange = vi.fn()
  render(<Phone onValueChange={onValueChange} />)
  await userEvent.click(number())
  await userEvent.paste("+44 (0)20 7946-0958")
  expect(onValueChange).toHaveBeenLastCalledWith("+442079460958", { reason: "paste", source: "user" })
  expect(countryButton().getAttribute("aria-label")).toBe("Country: United Kingdom, +44")
})

test("Arabic-Indic digits are read as 0 to 9", async () => {
  const onValueChange = vi.fn()
  render(<Phone defaultCountry="SA" onValueChange={onValueChange} />)
  await userEvent.type(number(), "٠٥١٢٣٤٥٦٧٨")
  expect(number().value).toBe("051 234 5678")
  expect(onValueChange).toHaveBeenLastCalledWith("+966512345678", expect.anything())
})

test("the country list searches names, codes and calling codes, and a choice reformats the digits", async () => {
  const onCountryChange = vi.fn()
  render(<Phone onCountryChange={onCountryChange} preferredCountries={["GB", "US"]} />)
  await userEvent.type(number(), "02079460958")
  await userEvent.click(countryButton())
  const search = screen.getByRole("combobox", { name: "Search countries" })
  const options = () => screen.queryAllByRole("option").map((option) => option.textContent)
  expect(options().slice(0, 2)).toEqual(["🇬🇧United Kingdom+44", "🇺🇸United States+1"])
  await userEvent.type(search, "+49")
  expect(options()).toEqual(["🇩🇪Germany+49"])
  await userEvent.clear(search)
  await userEvent.type(search, "united k")
  await userEvent.click(screen.getByRole("option", { name: /United Kingdom/ }))
  expect(onCountryChange).toHaveBeenLastCalledWith("GB", { reason: "country", source: "user" })
  expect(number().value).toBe("020 7946 0958")
  await settle()
  expect(document.activeElement).toBe(countryButton())
})

test("a country chosen after a number typed with its own calling code takes the national digits", async () => {
  render(<Phone />)
  await userEvent.type(number(), "+442079460958")
  await userEvent.click(countryButton())
  await userEvent.type(screen.getByRole("combobox", { name: "Search countries" }), "united states")
  await userEvent.click(screen.getByRole("option", { name: /United States/ }))
  expect(countryButton().getAttribute("aria-label")).toBe("Country: United States, +1")
  expect(number().value).toBe("(207) 946-0958")
})

test("leaving the number checks it for its country; validate adds rules of your own", async () => {
  render(<Phone validate={(value) => (value.startsWith("+1900") ? "No premium numbers." : null)} />)
  await userEvent.type(number(), "415555")
  await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }))
  expect(error()).toBe("Too short for a number in United States.")
  expect(number().getAttribute("aria-invalid")).toBe("true")
  expect(number().validationMessage).toBe("Too short for a number in United States.")
  await userEvent.type(number(), "0123")
  expect(error()).toBeNull()
  await userEvent.clear(number())
  await userEvent.type(number(), "9005550123")
  await userEvent.tab()
  expect(error()).toBe("No premium numbers.")
  // The number's problem isn't the country search's.
  await userEvent.click(countryButton())
  const search = screen.getByRole("combobox", { name: "Search countries" })
  expect(search.getAttribute("aria-invalid")).not.toBe("true")
  expect(search.getAttribute("aria-describedby") ?? "").not.toContain(document.querySelector('[data-slot="field-error"]')?.id ?? "none")
})

test("a value set from outside shows nationally, and its country follows", async () => {
  function Outside() {
    const [value, setValue] = useState("")
    return (
      <>
        <PhoneInput label="Phone" defaultCountry="US" value={value} onValueChange={setValue} />
        <button type="button" onClick={() => setValue("+442079460958")}>
          Use the office
        </button>
      </>
    )
  }
  render(<Outside />)
  await userEvent.click(screen.getByRole("button", { name: "Use the office" }))
  expect(number().value).toBe("020 7946 0958")
  expect(countryButton().getAttribute("aria-label")).toBe("Country: United Kingdom, +44")
})

test("the number submits under name in E.164", async () => {
  render(
    <form aria-label="Contact">
      <PhoneInput label="Phone" name="phone" defaultCountry="GB" defaultValue="+442079460958" />
    </form>,
  )
  await act(async () => {})
  const data = new FormData(screen.getByRole("form", { name: "Contact" }) as HTMLFormElement)
  expect(data.getAll("phone")).toEqual(["+442079460958"])
})

test("an agent sees one component with its number and country, sets both, and hears why it's refused", async () => {
  const onValueChange = vi.fn()
  render(<Phone onValueChange={onValueChange} />)
  const bridge = createBridge()
  await settle()
  expect(bridge.entry("Phone")).toMatchObject({ component: "phone-input", value: "", actions: ["setValue", "setCountry"] })
  expect(bridge.agent.snapshot().filter((entry) => !entry.offPage).map((entry) => entry.component)).toEqual(["phone-input"])
  expect((await bridge.run("Phone", "setValue", "020 7946 0958", "United Kingdom")).ok).toBe(true)
  expect(onValueChange).toHaveBeenLastCalledWith("+442079460958", { reason: "set", source: "agent" })
  expect(number().value).toBe("020 7946 0958")
  expect(bridge.entry("Phone")).toMatchObject({ value: "+442079460958" })
  expect(await bridge.run("Phone", "setValue", "555")).toMatchObject({ ok: false, error: { message: expect.stringContaining("Too short for a number in United Kingdom.") } })
  expect(await bridge.run("Phone", "setCountry", "Narnia")).toMatchObject({ ok: false, error: { message: expect.stringContaining('No country "Narnia"') } })
  expect((await bridge.run("Phone", "setCountry", "+1")).ok).toBe(true)
  expect(countryButton().getAttribute("aria-label")).toBe("Country: United States, +1")
  expect((await bridge.run("Phone", "setValue", "+1 (415) 555-0123")).ok).toBe(true)
  expect(number().value).toBe("(415) 555-0123")
})
