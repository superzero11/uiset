import { fireEvent, render, screen, within } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/solid/agent"
import { createSignal, flush, For } from "solid-js"
import { afterEach, expect, test, vi } from "vitest"
import { Avatar, AvatarFallback } from "@/solid/src/avatar"
import { AvatarGroup } from "@/solid/src/avatar-group"
import { CountBadge } from "@/solid/src/badge"
import { Button, ConfirmButton } from "@/solid/src/button"
import { Checkbox } from "@/solid/src/checkbox"
import { Field, FieldLabel } from "@/solid/src/field"
import { Meter } from "@/solid/src/meter"
import { NumberInput } from "@/solid/src/number-input"
import { OTPInput } from "@/solid/src/otp-input"
import { Pagination } from "@/solid/src/pagination"
import { PasswordInput } from "@/solid/src/password-input"
import { Progress } from "@/solid/src/progress"
import { Radio, RadioGroup } from "@/solid/src/radio"
import { Rating } from "@/solid/src/rating"
import { ScrollBox } from "@/solid/src/scroll-area"
import { Slider } from "@/solid/src/slider"
import { Toaster, toast } from "@/solid/src/toast"
import { TokenInput, TokenInputEditor } from "@/solid/src/token-input"
import { settle } from "./solid-bridge"

// UISet's Solid components that bring their own parts, with React's assertions
// (tests/unit/base-components.test.tsx, confirm-button.test.tsx, data-parts.test.tsx).

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const tick = () => settle(0)

test("a checkbox brings its check mark", async () => {
  const { container } = render(() => <Checkbox aria-label="Accept terms" defaultChecked />)
  await tick()
  expect(container.querySelector('[data-slot="checkbox-indicator"]')).toBeTruthy()
  await userEvent.click(screen.getByRole("checkbox", { name: "Accept terms" }))
  expect(screen.getByRole("checkbox", { name: "Accept terms" }).getAttribute("aria-checked")).toBe("false")
})

test("radios bring their dot and stay one choice", async () => {
  const { container } = render(() => (
    <RadioGroup aria-label="Plan" defaultValue="pro">
      <Radio value="hobby" aria-label="Hobby" />
      <Radio value="pro" aria-label="Pro" />
    </RadioGroup>
  ))
  await tick()
  expect(container.querySelectorAll('[data-slot="radio-indicator"]').length).toBeGreaterThan(0)
  await userEvent.click(screen.getByRole("radio", { name: "Hobby" }))
  expect(screen.getByRole("radio", { name: "Hobby" }).getAttribute("aria-checked")).toBe("true")
  expect(screen.getByRole("radio", { name: "Pro" }).getAttribute("aria-checked")).toBe("false")
})

test("a number input brings named step buttons that work", async () => {
  render(() => (
    <Field>
      <FieldLabel>Seats</FieldLabel>
      <NumberInput defaultValue={5} />
    </Field>
  ))
  await tick()
  await userEvent.click(screen.getByRole("button", { name: "Increase" }))
  const seats = screen.getByRole("textbox", { name: "Seats" }) as HTMLInputElement
  expect(seats.getAttribute("aria-valuenow") ?? seats.value).toMatch(/6/)
  expect(screen.getByRole("button", { name: "Decrease" })).toBeTruthy()
})

test("a password input brings a show toggle", async () => {
  render(() => (
    <Field>
      <FieldLabel>Password</FieldLabel>
      <PasswordInput />
    </Field>
  ))
  await tick()
  const field = screen.getByLabelText("Password") as HTMLInputElement
  expect(field.type).toBe("password")
  await userEvent.click(screen.getByRole("button", { name: "Show password" }))
  expect(field.type).toBe("text")
})

test("a one-time code renders one slot per character, following maxLength", async () => {
  const [length, setLength] = createSignal(6)
  const { container } = render(() => <OTPInput maxLength={length()} aria-label="Code" />)
  await tick()
  expect(container.querySelectorAll('[data-slot="otp-input-slot"]')).toHaveLength(6)
  setLength(4)
  flush()
  expect(container.querySelectorAll('[data-slot="otp-input-slot"]')).toHaveLength(4)
})

test("pagination brings named previous and next pages", async () => {
  render(() => <Pagination aria-label="Results" pageCount={8} />)
  await tick()
  expect(screen.getByRole("navigation", { name: "Results" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Previous page" })).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Next page" }))
  await tick()
  expect(screen.getByRole("button", { name: /^2/ }).getAttribute("aria-current")).toBe("page")
})

test("progress and meter bring their track and fill", async () => {
  const { container } = render(() => (
    <>
      <Progress value={40} aria-label="Upload" />
      <Meter value={70} aria-label="Storage" />
    </>
  ))
  await tick()
  expect(container.querySelector('[data-slot="progress-indicator"]')).toBeTruthy()
  expect(container.querySelector('[data-slot="meter-indicator"]')).toBeTruthy()
  expect(screen.getByRole("meter", { name: "Storage" }).getAttribute("aria-valuenow")).toBe("70")
})

test("a rating brings its stars", async () => {
  render(() => <Rating aria-label="Your rating" defaultValue={3} />)
  await tick()
  expect(screen.getAllByRole("radio").length).toBe(5)
})

test("tokens show as chips with a remove button", async () => {
  const { container } = render(() => (
    <TokenInput defaultValue={["Summarize ", { type: "file", value: "a.ts", label: "a.ts" }]}>
      <TokenInputEditor aria-label="Prompt" />
    </TokenInput>
  ))
  await tick()
  expect(container.querySelector('[data-slot="token-input-token"]')?.textContent).toContain("a.ts")
  expect(container.querySelector('[data-slot="token-input-token-remove"]')).toBeTruthy()
})

test("the toaster shows a toast; an empty region stays out of the agent's view", async () => {
  const agent = createAgent()
  render(() => <Toaster />)
  await tick()
  expect(agent.snapshot().some((entry) => entry.component === "toast-region" && !entry.offPage)).toBe(false)
  toast("Project created", { description: "Atlas is ready." })
  expect(await screen.findByText("Project created")).toBeTruthy()
  expect(screen.getByText("Atlas is ready.")).toBeTruthy()
})

test("a scroll box wraps its content in a viewport with a scrollbar, both scrollbars for both axes", async () => {
  const [axis, setAxis] = createSignal<"y" | "both">("y")
  const { container } = render(() => (
    <ScrollBox aria-label="Changelog" axis={axis()}>
      <p>Line</p>
    </ScrollBox>
  ))
  await tick()
  expect(container.querySelector('[data-slot="scroll-area-viewport"] p')).toBeTruthy()
  expect(container.querySelectorAll('[data-slot="scroll-area-scrollbar"]')).toHaveLength(1)
  setAxis("both")
  flush()
  expect(container.querySelectorAll('[data-slot="scroll-area-scrollbar"]')).toHaveLength(2)
  expect(container.querySelector('[data-slot="scroll-area-corner"]')).toBeTruthy()
})

test("a range slider's thumbs each hold their own value", async () => {
  render(() => <Slider defaultValue={[20, 80]} thumbLabels={["Minimum price", "Maximum price"]} />)
  await tick()
  expect(screen.getByRole("slider", { name: "Minimum price" })).toHaveProperty("value", "20")
  expect(screen.getByRole("slider", { name: "Maximum price" })).toHaveProperty("value", "80")
})

test("a slider with one thumb takes its name from aria-label, and children replace the parts", async () => {
  render(() => (
    <>
      <Slider defaultValue={40} aria-label="Volume" showValue />
      <Slider aria-label="Custom" defaultValue={10}>
        <span>Own parts</span>
      </Slider>
    </>
  ))
  await tick()
  expect(screen.getByRole("slider", { name: "Volume" })).toHaveProperty("value", "40")
  expect(screen.getByText("Own parts")).toBeTruthy()
})

test("a button is solid by default, with no data-variant, and outline or ghost when asked", () => {
  const [variant, setVariant] = createSignal<"solid" | "outline" | "ghost" | undefined>(undefined)
  render(() => <Button variant={variant()}>Save</Button>)
  const button = screen.getByRole("button", { name: "Save" })
  expect(button.hasAttribute("data-variant")).toBe(false)
  setVariant("solid")
  flush()
  expect(button.hasAttribute("data-variant")).toBe(false)
  setVariant("ghost")
  flush()
  expect(button.getAttribute("data-variant")).toBe("ghost")
})

function Delete(props: { onConfirm?: () => void; timeout?: number }) {
  return (
    <ConfirmButton confirmLabel="Press again to delete" confirm="Deletes the Atlas project" onConfirm={() => props.onConfirm?.()} timeout={props.timeout}>
      Delete project
    </ConfirmButton>
  )
}

test("a confirm button: a person's first press arms it, a quick second press doesn't act, a later one does", async () => {
  const onConfirm = vi.fn()
  let now = 1_000
  vi.spyOn(Date, "now").mockImplementation(() => now)
  render(() => <Delete onConfirm={onConfirm} />)
  await userEvent.click(screen.getByRole("button", { name: "Delete project" }))
  await tick()
  const armed = screen.getByRole("button", { name: "Press again to delete" })
  expect(armed.getAttribute("data-armed")).toBe("")
  expect(armed.getAttribute("data-variant")).toBe("destructive")
  // A double-click's second press lands at once: it isn't a decision.
  now += 100
  await userEvent.click(armed)
  expect(onConfirm).not.toHaveBeenCalled()
  now += 1_000
  await userEvent.click(armed)
  await tick()
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Delete project" }).hasAttribute("data-armed")).toBe(false)
})

test("a confirm button: Escape, leaving it, or waiting disarms it", async () => {
  vi.useFakeTimers()
  const onConfirm = vi.fn()
  render(() => <Delete onConfirm={onConfirm} timeout={4000} />)
  const button = screen.getByRole("button", { name: "Delete project" })
  fireEvent.click(button)
  flush()
  expect(button.textContent).toBe("Press again to delete")
  fireEvent.keyDown(button, { key: "Escape" })
  flush()
  expect(button.textContent).toBe("Delete project")
  fireEvent.click(button)
  flush()
  fireEvent.blur(button)
  flush()
  expect(button.textContent).toBe("Delete project")
  fireEvent.click(button)
  flush()
  vi.advanceTimersByTime(4000)
  flush()
  expect(button.textContent).toBe("Delete project")
  expect(onConfirm).not.toHaveBeenCalled()
})

test("a confirm button: an agent's press asks the person with its sentence, and once approved acts at once", async () => {
  const asked: (string | undefined)[] = []
  const agent = createAgent({ allow: (step) => (asked.push(step.confirm), true) })
  const onConfirm = vi.fn()
  render(() => <Delete onConfirm={onConfirm} />)
  await tick()
  const result = await agent.act({ steps: [{ ref: "Delete project", action: "press" }] })
  expect(result.ok).toBe(true)
  expect(asked).toEqual(["Deletes the Atlas project"])
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Delete project" }).hasAttribute("data-armed")).toBe(false)
})

test("a confirm button: with no one to approve, an agent's press is refused and nothing happens", async () => {
  const agent = createAgent()
  const onConfirm = vi.fn()
  render(() => <Delete onConfirm={onConfirm} />)
  await tick()
  const result = await agent.act({ steps: [{ ref: "Delete project", action: "press" }] })
  expect(result.ok).toBe(false)
  expect(onConfirm).not.toHaveBeenCalled()
})

const people = ["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Hedy Lamarr", "Annie Easley"]
const avatars = (names = people) => (
  <For each={names}>
    {(name) => (
      <Avatar role="img" aria-label={name}>
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
    )}
  </For>
)

test("an avatar group is named, shows up to max, and counts the rest in words", () => {
  render(() => (
    <AvatarGroup label="Reviewers" max={3}>
      {avatars()}
    </AvatarGroup>
  ))
  const group = screen.getByRole("group", { name: "Reviewers" })
  expect(within(group).getAllByRole("img")).toHaveLength(4)
  expect(within(group).queryByRole("img", { name: "Hedy Lamarr" })).toBeNull()
  expect(within(group).getByRole("img", { name: "2 more" }).textContent).toBe("+2")
})

test("an avatar group with no limit shows everyone, and total counts people it wasn't given", () => {
  const [total, setTotal] = createSignal<number | undefined>(undefined)
  render(() => (
    <AvatarGroup label="Team" total={total()} moreLabel={(count) => `and ${count} others`}>
      {avatars()}
    </AvatarGroup>
  ))
  expect(screen.getAllByRole("img")).toHaveLength(5)
  expect(screen.queryByRole("img", { name: /others/ })).toBeNull()
  setTotal(128)
  flush()
  expect(screen.getByRole("img", { name: "and 123 others" }).textContent).toBe("+123")
})

test("a count badge shows the count, caps it, hides at zero, and reads its label", () => {
  const [props, setProps] = createSignal<{ count: number; label?: string; max?: number; showZero?: boolean; dot?: boolean }>({ count: 3, label: "3 unread" })
  const { container } = render(() => <CountBadge {...props()}>Inbox</CountBadge>)
  const count = () => container.querySelector(".count-badge-count")
  const set = (next: ReturnType<typeof props>) => (setProps(next), flush())
  expect(count()!.textContent).toBe("3")
  expect(count()!.getAttribute("aria-hidden")).toBe("true")
  expect(screen.getByText("3 unread").className).toBe("uiset-visually-hidden")
  set({ count: 128 })
  expect(count()!.textContent).toBe("99+")
  set({ count: 128, max: 999 })
  expect(count()!.textContent).toBe("128")
  set({ count: 0, label: "0 unread" })
  expect(count()).toBeNull()
  expect(screen.queryByText("0 unread")).toBeNull()
  set({ count: 0, showZero: true })
  expect(count()!.textContent).toBe("0")
  set({ count: 1, dot: true })
  expect(count()!.textContent).toBe("")
  expect(count()!.hasAttribute("data-dot")).toBe(true)
})
