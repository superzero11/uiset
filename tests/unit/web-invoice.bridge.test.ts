import { screen, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { openWebPage } from "./web-page"

// The invoice as a web page (web/templates/invoice.html), with no React: the same status,
// addresses, lines and sums as the React template, and its copy buttons and Print by name.

const open = () => openWebPage("templates/invoice.html", "templates/invoice.ts")

beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("an open invoice: its status, both addresses as their countries write them, the lines and sums, and how to pay", async () => {
  await open()
  expect(screen.getByRole("heading", { level: 1, name: "Invoice INV-0142" })).toBeTruthy()
  // The sample is always issued 11 days ago and due 30 days after.
  expect(screen.getByText("Due in 19 days")).toBeTruthy()
  const billTo = screen.getByRole("region", { name: "Bill to" })
  expect([...billTo.querySelectorAll("address span")].map((line) => line.textContent)).toEqual(["Orchard Lane Café", "220 Pine St", "Suite 4", "Portland, OR 97204", "United States"])
  const items = screen.getByRole("region", { name: "Items" })
  expect(within(items).getByRole("row", { name: /Stoneware mugs/ }).textContent).toContain("€348.00")
  expect(within(items).getByRole("row", { name: /Total/ }).textContent).toContain("€906.51")
  expect(screen.getByRole("region", { name: "How to pay" }).textContent).toContain("IE42 SAMP 9901 0012 3456 78")
}, 20_000)

test("an agent finds the copy buttons and Print by name; Print prints", async () => {
  const print = vi.fn()
  window.print = print
  const bridge = await open()
  expect(bridge.entry("Copy the IBAN")).toBeTruthy()
  expect(bridge.entry("Copy the reference")).toBeTruthy()
  const pressed = await bridge.press("Print invoice INV-0142")
  expect(pressed.ok, pressed.error?.message).toBe(true)
  expect(print).toHaveBeenCalledTimes(1)
}, 20_000)
