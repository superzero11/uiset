import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { expect, test } from "vitest"
import { Checkbox } from "@/registry/uiset/ui/checkbox"
import { Field, FieldLabel } from "@/registry/uiset/ui/field"
import { Meter } from "@/registry/uiset/ui/meter"
import { NumberInput } from "@/registry/uiset/ui/number-input"
import { OTPInput } from "@/registry/uiset/ui/otp-input"
import { Pagination } from "@/registry/uiset/ui/pagination"
import { PasswordInput } from "@/registry/uiset/ui/password-input"
import { Progress } from "@/registry/uiset/ui/progress"
import { Radio, RadioGroup } from "@/registry/uiset/ui/radio"
import { Rating } from "@/registry/uiset/ui/rating"
import { ScrollBox } from "@/registry/uiset/ui/scroll-area"
import { Slider } from "@/registry/uiset/ui/slider"
import { Toaster, toast } from "@/registry/uiset/ui/toast"
import { TokenInput, TokenInputEditor } from "@/registry/uiset/ui/token-input"

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

test("a checkbox brings its check mark", async () => {
  const { container } = render(<Checkbox aria-label="Accept terms" defaultChecked />)
  await tick()
  expect(container.querySelector('[data-slot="checkbox-indicator"]')).toBeTruthy()
  await userEvent.click(screen.getByRole("checkbox", { name: "Accept terms" }))
  expect(
    screen.getByRole("checkbox", { name: "Accept terms" }).getAttribute("aria-checked"),
  ).toBe("false")
})

test("radios bring their dot and stay one choice", async () => {
  const { container } = render(
    <RadioGroup aria-label="Plan" defaultValue="pro">
      <Radio value="hobby" aria-label="Hobby" />
      <Radio value="pro" aria-label="Pro" />
    </RadioGroup>,
  )
  await tick()
  expect(
    container.querySelectorAll('[data-slot="radio-indicator"]').length,
  ).toBeGreaterThan(0)
  await userEvent.click(screen.getByRole("radio", { name: "Hobby" }))
  expect(screen.getByRole("radio", { name: "Hobby" }).getAttribute("aria-checked")).toBe(
    "true",
  )
  expect(screen.getByRole("radio", { name: "Pro" }).getAttribute("aria-checked")).toBe(
    "false",
  )
})

test("a number input brings named step buttons that work", async () => {
  render(
    <Field>
      <FieldLabel>Seats</FieldLabel>
      <NumberInput defaultValue={5} />
    </Field>,
  )
  await tick()
  await userEvent.click(screen.getByRole("button", { name: "Increase" }))
  expect(
    screen.getByRole("textbox", { name: "Seats" }).getAttribute("aria-valuenow") ??
      (screen.getByRole("textbox", { name: "Seats" }) as HTMLInputElement).value,
  ).toMatch(/6/)
  expect(screen.getByRole("button", { name: "Decrease" })).toBeTruthy()
})

test("a password input brings a show toggle", async () => {
  render(
    <Field>
      <FieldLabel>Password</FieldLabel>
      <PasswordInput />
    </Field>,
  )
  await tick()
  const field = screen.getByLabelText("Password") as HTMLInputElement
  expect(field.type).toBe("password")
  await userEvent.click(screen.getByRole("button", { name: "Show password" }))
  expect(field.type).toBe("text")
})

test("a one-time code renders one slot per character", async () => {
  const { container } = render(<OTPInput maxLength={6} aria-label="Code" />)
  await tick()
  expect(container.querySelectorAll('[data-slot="otp-input-slot"]')).toHaveLength(6)
})

test("pagination brings named previous and next pages", async () => {
  render(<Pagination aria-label="Results" pageCount={8} />)
  await tick()
  expect(screen.getByRole("navigation", { name: "Results" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Previous page" })).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Next page" }))
  expect(screen.getByRole("button", { name: /^2/ }).getAttribute("aria-current")).toBe(
    "page",
  )
})

test("progress and meter bring their track and fill", async () => {
  const { container } = render(
    <>
      <Progress value={40} aria-label="Upload" />
      <Meter value={70} aria-label="Storage" />
    </>,
  )
  await tick()
  expect(container.querySelector('[data-slot="progress-indicator"]')).toBeTruthy()
  expect(container.querySelector('[data-slot="meter-indicator"]')).toBeTruthy()
  expect(
    screen.getByRole("meter", { name: "Storage" }).getAttribute("aria-valuenow"),
  ).toBe("70")
})

test("a rating brings its stars", async () => {
  render(<Rating aria-label="Your rating" defaultValue={3} />)
  await tick()
  expect(screen.getAllByRole("radio").length).toBe(5)
})

test("tokens show as chips with a remove button", async () => {
  const { container } = render(
    <TokenInput
      defaultValue={["Summarize ", { type: "file", value: "a.ts", label: "a.ts" }]}
    >
      <TokenInputEditor aria-label="Prompt" />
    </TokenInput>,
  )
  await tick()
  expect(
    container.querySelector('[data-slot="token-input-token"]')?.textContent,
  ).toContain("a.ts")
  expect(container.querySelector('[data-slot="token-input-token-remove"]')).toBeTruthy()
})

test("the toaster shows a toast and keeps it away from agents", async () => {
  const agent = createAgent()
  render(<Toaster />)
  await tick()
  act(() => {
    toast("Project created", { description: "Atlas is ready." })
  })
  expect(await screen.findByText("Project created")).toBeTruthy()
  expect(screen.getByText("Atlas is ready.")).toBeTruthy()
  expect(agent.snapshot().some((entry) => entry.component === "toast-region")).toBe(false)
})

test("a scroll box wraps its content in a viewport with a scrollbar", async () => {
  const { container } = render(
    <ScrollBox aria-label="Changelog">
      <p>Line</p>
    </ScrollBox>,
  )
  await tick()
  expect(container.querySelector('[data-slot="scroll-area-viewport"] p')).toBeTruthy()
  expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeTruthy()
})

test("a range slider's thumbs each hold their own value", async () => {
  render(<Slider defaultValue={[20, 80]} thumbLabels={["Minimum price", "Maximum price"]} />)
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(screen.getByRole("slider", { name: "Minimum price" })).toHaveProperty("value", "20")
  expect(screen.getByRole("slider", { name: "Maximum price" })).toHaveProperty("value", "80")
})
