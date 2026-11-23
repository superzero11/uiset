import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// <uiset-masked-input> on web/content.html, with no React: the same masks as React's
// MaskedInput, `valuechange` out, and the agent's setValue.

type Live = HTMLElement & { value: string; validate?: (value: string) => string | null }

const el = (id: string) => document.getElementById(id) as Live
const input = (id: string, name: string) => within(el(id)).getByRole<HTMLInputElement>("textbox", { name })
const error = (id: string) => el(id).querySelector("ui-field-error")?.textContent || null
const open = () => openWebPage("content.html", "content-demo.ts")

beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("a card number groups as typed, names its brand, and valuechange carries its digits", async () => {
  await open()
  const changes: string[] = []
  el("card").addEventListener("valuechange", (event) => changes.push(`${(event as CustomEvent).detail.value} ${(event as CustomEvent).detail.reason}`))
  await userEvent.type(input("card", "Card number"), "5555555555554444")
  await settle()
  expect(input("card", "Card number").value).toBe("5555 5555 5555 4444")
  expect(within(el("card")).getByText("Mastercard")).toBeTruthy()
  expect(el("card").value).toBe("5555555555554444")
  expect(changes.at(-1)).toBe("5555555555554444 type")
  expect(el("card").hasAttribute("data-agent-secret")).toBe(true)
})

test("an expiry month typed as 4 becomes 04, and leaving a past date says it's expired", async () => {
  await open()
  await userEvent.type(input("expiry", "Expiry"), "419")
  expect(input("expiry", "Expiry").value).toBe("04 / 19")
  input("expiry", "Expiry").blur()
  await settle()
  expect(error("expiry")).toBe("This card has expired.")
})

test("Backspace on a gap removes the digit before it", async () => {
  await open()
  await userEvent.type(input("iban", "IBAN"), "DE89370400440532013000")
  await userEvent.type(input("iban", "IBAN"), "{Backspace}", { initialSelectionStart: 5, initialSelectionEnd: 5 })
  await settle()
  // "DE89 |3704…": the gap goes, and the 9 before it.
  expect(input("iban", "IBAN").value).toBe("DE83 7040 0440 5320 1300 0")
})

test("an amount shows in its locale with its symbol, from a value set in the page", async () => {
  await open()
  expect(input("amount", "Amount").value).toBe("1.234,5")
  expect(within(el("amount")).getByText("€")).toBeTruthy()
  await userEvent.type(input("amount", "Amount"), "6")
  await settle()
  expect(el("amount").value).toBe("1234.56")
})

test('what was typed stays as typed when the amount it reports is shorter: "12," and "12,50"', async () => {
  await open()
  await userEvent.clear(input("amount", "Amount"))
  await userEvent.type(input("amount", "Amount"), "12,")
  await settle()
  expect(el("amount").value).toBe("12")
  expect(input("amount", "Amount").value).toBe("12,")
  await userEvent.type(input("amount", "Amount"), "50")
  await settle()
  // The amount is 12.5; what was typed stays as typed.
  expect(el("amount").value).toBe("12.5")
  expect(input("amount", "Amount").value).toBe("12,50")
})

test("an agent sets each in any format; a refusal says why, and a secret field's is redacted", async () => {
  const bridge = await open()
  expect((await bridge.run("IBAN", "setValue", "gb82 west 1234 5698 7654 32")).ok).toBe(true)
  expect(el("iban").value).toBe("GB82WEST12345698765432")
  expect(input("iban", "IBAN").value).toBe("GB82 WEST 1234 5698 7654 32")
  expect(await bridge.run("IBAN", "setValue", "GB82 WEST 1234 5698 7654 33")).toMatchObject({ ok: false, error: { message: expect.stringContaining("typo") } })
  expect((await bridge.run("Expiry", "setValue", "12/2030")).ok).toBe(true)
  expect(el("expiry").value).toBe("12/30")
  expect((await bridge.run("Card number", "setValue", "4242 4242 4242 4242")).ok).toBe(true)
  expect(bridge.entry("Card number").value).toBe("[redacted]")
  expect(await bridge.run("Card number", "setValue", "4242")).toMatchObject({ ok: false, error: { message: expect.stringContaining("[redacted]") } })
  expect(screen.getAllByRole("textbox").length).toBeGreaterThan(5)
})
