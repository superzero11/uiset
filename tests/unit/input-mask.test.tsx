import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { expect, test, vi } from "vitest"
import { MaskedInput, cardExpiry, cardNumber, currency, iban, type MaskedInputProps, type MaskedValue } from "@/registry/uiset/ui/input-mask"
import { createBridge, settle } from "./bridge"

const field = (name: string) => screen.getByRole<HTMLInputElement>("textbox", { name })
const error = () => document.querySelector('[data-slot="field-error"]')?.textContent ?? null

function Masked(props: Partial<MaskedInputProps> & Pick<MaskedInputProps, "label" | "mask">) {
  const [value, setValue] = useState<MaskedValue>(props.defaultValue ?? null)
  return (
    <>
      <MaskedInput {...props} defaultValue={undefined} value={value} onValueChange={(next, details) => (setValue(next), props.onValueChange?.(next, details))} />
      <button type="button">Elsewhere</button>
    </>
  )
}

test("a card number groups as typed, names its brand, and reports its digits", async () => {
  const onValueChange = vi.fn()
  render(<Masked label="Card number" mask={cardNumber()} onValueChange={onValueChange} />)
  expect(field("Card number").getAttribute("inputmode")).toBe("numeric")
  expect(field("Card number").getAttribute("autocomplete")).toBe("cc-number")
  await userEvent.type(field("Card number"), "378282246310005")
  expect(field("Card number").value).toBe("3782 822463 10005")
  expect(screen.getByText("American Express")).toBeTruthy()
  expect(onValueChange).toHaveBeenLastCalledWith("378282246310005", { reason: "type", source: "user" })
})

test("Backspace on a gap removes the digit before it", async () => {
  render(<Masked label="Card number" mask={cardNumber()} defaultValue="4242424242424242" />)
  expect(field("Card number").value).toBe("4242 4242 4242 4242")
  // "4242 |4242…": Backspace on the gap.
  await userEvent.type(field("Card number"), "{Backspace}", { initialSelectionStart: 5, initialSelectionEnd: 5 })
  expect(field("Card number").value).toBe("4244 2424 2424 242")
  expect(field("Card number").value.slice(0, field("Card number").selectionStart!)).toBe("424")
})

test("leaving the field checks it, with the reason under it and in the input's validity", async () => {
  render(<Masked label="Card number" mask={cardNumber()} />)
  await userEvent.type(field("Card number"), "4242424242424241")
  await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }))
  expect(error()).toBe("This card number has a typo. Check it digit by digit.")
  expect(field("Card number").validationMessage).toBe("This card number has a typo. Check it digit by digit.")
  await userEvent.type(field("Card number"), "{Backspace}2")
  expect(error()).toBeNull()
})

test("a pasted expiry in any style is read: 12/2027 becomes 12 / 27", async () => {
  const onValueChange = vi.fn()
  render(<Masked label="Expiry" mask={cardExpiry({ now: () => new Date(2026, 10, 23) })} onValueChange={onValueChange} />)
  await userEvent.click(field("Expiry"))
  await userEvent.paste("12/2027")
  expect(field("Expiry").value).toBe("12 / 27")
  expect(onValueChange).toHaveBeenLastCalledWith("12/27", { reason: "paste", source: "user" })
})

test("an amount groups in its locale with its symbol beside it, and its value is a number", async () => {
  const onValueChange = vi.fn()
  render(<Masked label="Amount" mask={currency({ currency: "EUR", locale: "de-DE" })} onValueChange={onValueChange} />)
  await userEvent.type(field("Amount"), "1234,5")
  expect(field("Amount").value).toBe("1.234,5")
  expect(screen.getByText("€")).toBeTruthy()
  expect(onValueChange).toHaveBeenLastCalledWith(1234.5, { reason: "type", source: "user" })
})

test("an IBAN goes upper case in groups of four, names its country, and is checked", async () => {
  render(<Masked label="IBAN" mask={iban({ locale: "en" })} />)
  await userEvent.type(field("IBAN"), "gb82west12345698765433")
  expect(field("IBAN").value).toBe("GB82 WEST 1234 5698 7654 33")
  expect(screen.getByText("United Kingdom")).toBeTruthy()
  field("IBAN").blur()
  await settle()
  expect(error()).toBe("This IBAN has a typo. Check it character by character.")
})

test("the value submits under name", async () => {
  render(
    <form aria-label="Pay">
      <MaskedInput label="Card number" mask={cardNumber()} name="card" defaultValue="4242424242424242" />
    </form>,
  )
  await act(async () => {})
  expect(new FormData(screen.getByRole("form", { name: "Pay" }) as HTMLFormElement).get("card")).toBe("4242424242424242")
})

test("an agent sets it in any format and hears why it's refused; a card number reads as a secret", async () => {
  const onValueChange = vi.fn()
  render(
    <>
      <Masked label="Card number" mask={cardNumber()} onValueChange={onValueChange} />
      <Masked label="Amount" mask={currency({ currency: "USD", locale: "en-US" })} />
    </>,
  )
  const bridge = createBridge()
  await settle()
  expect(bridge.entry("Card number")).toMatchObject({ component: "masked-input", actions: ["setValue"] })
  expect((await bridge.run("Card number", "setValue", "4242-4242-4242-4242")).ok).toBe(true)
  expect(onValueChange).toHaveBeenLastCalledWith("4242424242424242", { reason: "set", source: "agent" })
  expect(field("Card number").value).toBe("4242 4242 4242 4242")
  expect(bridge.entry("Card number").value).toBe("[redacted]")
  // A secret field's every word is redacted for agents, its refusals too: the step fails.
  expect(await bridge.run("Card number", "setValue", "4242 4242 4242 4241")).toMatchObject({ ok: false, error: { message: expect.stringContaining("[redacted]") } })
  // A field that isn't secret says why.
  expect(await bridge.run("Amount", "setValue", "")).toMatchObject({ ok: true })
  expect((await bridge.run("Amount", "setValue", "$1,234.50")).ok).toBe(true)
  expect(field("Amount").value).toBe("1,234.50")
  expect(bridge.entry("Amount").value).toBe("1234.5")
  expect(bridge.agent.snapshot().filter((entry) => !entry.offPage).map((entry) => entry.component)).toEqual(["masked-input", "masked-input"])
})
