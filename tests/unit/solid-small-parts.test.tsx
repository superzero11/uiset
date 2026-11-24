import { render, screen, within } from "@solidjs/testing-library"
import { createSignal, flush } from "solid-js"
import { beforeEach, expect, test } from "vitest"
import { Card, CardContent, CardTitle } from "@/solid/src/card"
import { DescriptionList } from "@/solid/src/description-list"
import { EmptyState } from "@/solid/src/empty-state"
import { Field, FieldLabel } from "@/solid/src/field"
import { Item, ItemList } from "@/solid/src/item-list"
import { Kbd } from "@/solid/src/kbd"
import { PageHeader } from "@/solid/src/page-header"
import { PasswordRules } from "@/solid/src/password-input"
import { RadioCard, RadioGroup } from "@/solid/src/radio"
import { SegmentedControl, SegmentedControlItem } from "@/solid/src/segmented-control"
import { SkeletonText } from "@/solid/src/skeleton"
import { Spinner } from "@/solid/src/spinner"
import { Textarea, TextareaCount } from "@/solid/src/textarea"
import { createSolidBridge, settle } from "./solid-bridge"

// UISet's small Solid parts: what each draws, what it says to a screen reader, and what an
// agent can do with it.

const said = () => document.querySelector('[data-ui-sdk-announcer=""]')?.textContent ?? ""
const hush = () => document.querySelectorAll("[data-ui-sdk-announcer]").forEach((region) => (region.textContent = ""))
beforeEach(hush)

test("a textarea's count is its description, and says once when it's near the limit and when it's full", async () => {
  const [value, setValue] = createSignal("")
  render(() => (
    <Field>
      <FieldLabel>Bio</FieldLabel>
      <Textarea value={value()} maxlength={30} />
      <TextareaCount value={value()} max={30} warnAt={5} />
    </Field>
  ))
  await settle()
  const count = () => document.querySelector(".uiset-textarea-count span")!
  expect(count().textContent).toBe("0 / 30 characters")
  expect(screen.getByRole("textbox", { name: "Bio" }).getAttribute("aria-describedby")).toContain(document.querySelector(".uiset-textarea-count")!.id)
  setValue("a".repeat(20))
  flush()
  await settle()
  expect(count().hasAttribute("data-near")).toBe(false)
  expect(said()).toBe("")
  setValue("a".repeat(26))
  flush()
  await settle(200)
  expect(count().hasAttribute("data-near")).toBe(true)
  expect(said()).toBe("4 characters left")
  hush()
  setValue("a".repeat(27))
  flush()
  await settle(200)
  expect(said()).toBe("")
  setValue("a".repeat(30))
  flush()
  await settle(200)
  expect(count().hasAttribute("data-full")).toBe(true)
  expect(said()).toBe("No characters left")
})

test("a textarea's count that starts near the limit says nothing until it changes band", async () => {
  render(() => <TextareaCount value={"a".repeat(28)} max={30} warnAt={5} />)
  await settle(200)
  expect(document.querySelector(".uiset-textarea-count span")!.hasAttribute("data-near")).toBe(true)
  expect(said()).toBe("")
})

test("password rules tick off as typed, say each change once, and say when all are met", async () => {
  const [value, setValue] = createSignal("")
  const rules = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { label: "A number", test: (p: string) => /\d/.test(p) },
  ]
  render(() => <PasswordRules value={value()} rules={rules} />)
  await settle()
  const list = screen.getByRole("list", { name: "Password rules" })
  expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["To do: At least 8 characters", "To do: A number"])
  setValue("abc1")
  flush()
  await settle(200)
  expect(said()).toBe("Done: A number")
  expect(within(list).getAllByRole("listitem")[1]!.hasAttribute("data-met")).toBe(true)
  setValue("abcdefg1")
  flush()
  await settle(200)
  expect(said()).toBe("Every rule is met")
})

test("an agent chooses a radio card's option by the group's name; each card is named by its label alone", async () => {
  const bridge = createSolidBridge()
  render(() => (
    <RadioGroup aria-label="Plan" defaultValue="pro">
      <RadioCard value="hobby" label="Hobby" description="For side projects" aside="$0" />
      <RadioCard value="pro" label="Pro" description="For teams" aside="$20" />
    </RadioGroup>
  ))
  await settle()
  const radio = (name: string) => screen.getByRole("radio", { name })
  expect(radio("Pro").getAttribute("aria-checked")).toBe("true")
  expect(document.querySelectorAll(".uiset-radio-card")).toHaveLength(2)
  const done = await bridge.run("Plan", "setValue", "hobby")
  expect(done.ok, done.error?.message).toBe(true)
  expect(radio("Hobby").getAttribute("aria-checked")).toBe("true")
})

test("a segmented control puts its indicator first, and takes children as a function of its state", async () => {
  const { container } = render(() => (
    <>
      <SegmentedControl aria-label="View" defaultValue="list">
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      </SegmentedControl>
      <SegmentedControl aria-label="Size" defaultValue="s">
        {(state) => (
          <>
            <SegmentedControlItem value="s">Small</SegmentedControlItem>
            <SegmentedControlItem value="l">Large</SegmentedControlItem>
            <output>{state.value}</output>
          </>
        )}
      </SegmentedControl>
    </>
  ))
  await settle()
  const [view, size] = container.querySelectorAll('[data-slot="segmented-control"]')
  expect(view!.firstElementChild!.getAttribute("data-slot")).toBe("segmented-control-indicator")
  expect(size!.firstElementChild!.getAttribute("data-slot")).toBe("segmented-control-indicator")
  expect(size!.querySelector("output")!.textContent).toBe("s")
  screen.getByRole("radio", { name: "Large" }).click()
  await settle()
  expect(size!.querySelector("output")!.textContent).toBe("l")
})

test("an empty state, a page header and a card title use the heading levels they're given", () => {
  const [level, setLevel] = createSignal<2 | 3 | 4>(3)
  render(() => (
    <>
      <PageHeader title="Projects" description="All of them" actions={<button>New</button>} />
      <EmptyState title="No projects yet" level={level()} description="Create one to start." />
      <Card>
        <CardTitle level={4}>Usage</CardTitle>
        <CardContent>12 GB</CardContent>
      </Card>
    </>
  ))
  expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeTruthy()
  expect(screen.getByRole("heading", { level: 3, name: "No projects yet" })).toBeTruthy()
  expect(screen.getByRole("heading", { level: 4, name: "Usage" })).toBeTruthy()
  expect(screen.getByText("Create one to start.").className).toBe("empty-state-description")
  setLevel(2)
  flush()
  expect(screen.getByRole("heading", { level: 2, name: "No projects yet" })).toBeTruthy()
  expect(document.querySelector(".empty-state-icon")).toBeTruthy()
})

test("an empty state with icon={null} draws none", () => {
  render(() => <EmptyState title="Nothing" icon={null} />)
  expect(document.querySelector(".empty-state-icon")).toBeNull()
})

test("description and item lists, a spinner, skeleton text and keys say what they show", () => {
  render(() => (
    <>
      <DescriptionList items={[{ term: "Plan", details: "Pro" }]} layout="stacked" />
      <ItemList label="Members">
        <Item title="Ada" description="Owner" href="/ada" meta="Today" />
        <Item title="Grace" />
      </ItemList>
      <Spinner label="Saving" />
      <SkeletonText lines={2} />
      <Kbd keys="Mod+K" />
    </>
  ))
  expect(document.querySelector('dl[data-layout="stacked"] dt')!.textContent).toBe("Plan")
  const members = screen.getByRole("list", { name: "Members" })
  expect(within(members).getByRole("link", { name: "Ada" }).getAttribute("href")).toBe("/ada")
  expect(within(members).getByText("Grace").tagName).toBe("SPAN")
  expect(document.querySelector(".spinner")!.getAttribute("role")).toBe("status")
  expect(document.querySelector(".spinner")!.textContent).toBe("Saving")
  const lines = document.querySelectorAll(".skeleton-text .skeleton") as NodeListOf<HTMLElement>
  expect([...lines].map((line) => line.style.width)).toEqual(["100%", "60%"])
  // UI SDK wraps the hint in direction isolates, so it reads the same in right-to-left text.
  expect(document.querySelector("kbd.kbd")!.textContent).toMatch(/^\u2066?(⌘K|Ctrl\+K)\u2069?$/)
})
