import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, expect, test } from "vitest"
import "@ui-sdk/web/combobox"
import "@ui-sdk/web/field"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// <uiset-tag-input> on web/content.html ("Invitees": the page's form has an Email field, and an
// agent's step by a name must find one component), with no React: the same rules as React's TagInput,
// a `valuechange` event out, and the agent's add, remove and setValue.

type Live = HTMLElement & { value: string[]; validate?: (tag: string) => string | null }

const topics = () => document.getElementById("topics") as Live
const emails = () => document.getElementById("emails") as Live
const input = (name: string) => screen.getByRole<HTMLInputElement>("combobox", { name })
const chips = (el: HTMLElement) => [...el.querySelectorAll("ui-combobox-chip")].map((chip) => chip.textContent?.trim())
const error = (el: HTMLElement) => el.querySelector("ui-field-error")?.textContent || null
const open = () => openWebPage("content.html", "content-demo.ts")

beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("a comma or Enter adds what's typed, and valuechange says why", async () => {
  await open()
  const changes: string[] = []
  topics().addEventListener("valuechange", (event) => changes.push(`${(event as CustomEvent).detail.value.join("|")} ${(event as CustomEvent).detail.reason}`))
  await userEvent.type(input("Topics"), "CSS,")
  await settle()
  expect(chips(topics())).toEqual(["React", "Design systems", "CSS"])
  await userEvent.type(input("Topics"), "Testing{Enter}")
  await settle()
  expect(topics().value).toEqual(["React", "Design systems", "CSS", "Testing"])
  expect(changes).toEqual(["React|Design systems|CSS add", "React|Design systems|CSS|Testing add"])
  expect(screen.getByText("4 of 5")).toBeTruthy()
})

test("a pasted list splits, and what's refused stays typed with the reason", async () => {
  await open()
  await userEvent.click(input("Invitees"))
  await userEvent.paste("Grace@Example.com, nope\nADA@example.com")
  await settle()
  expect(chips(emails())).toEqual(["ada@example.com", "grace@example.com"])
  expect(error(emails())).toBe("Already added: ada@example.com. Not an email address: nope")
  expect(input("Invitees").value).toBe("nope, ada@example.com")
})

test("leaving the field adds what's typed", async () => {
  await open()
  await userEvent.type(input("Topics"), "Performance")
  await userEvent.click(document.body)
  input("Topics").blur()
  await settle()
  expect(chips(topics())).toContain("Performance")
})

test("Enter on a tag edits it in place, and Escape keeps the old one", async () => {
  await open()
  await userEvent.click(input("Topics"))
  await userEvent.keyboard("{ArrowLeft}")
  expect(document.activeElement?.textContent?.trim()).toBe("Design systems")
  await userEvent.keyboard("{Enter}")
  await settle()
  expect(input("Topics").value).toBe("Design systems")
  expect(topics().querySelector("ui-combobox-chip[data-editing]")?.textContent?.trim()).toBe("Design systems")
  await userEvent.keyboard("Design tokens{Enter}")
  await settle()
  expect(chips(topics())).toEqual(["React", "Design tokens"])
  fireEvent.dblClick(within(topics()).getByText("React"))
  await settle()
  expect(input("Topics").value).toBe("React")
  await userEvent.keyboard("Vue{Escape}")
  await settle()
  expect(chips(topics())).toEqual(["React", "Design tokens"])
})

test("Backspace in an emptied edit doesn't remove other tags", async () => {
  await open()
  fireEvent.dblClick(within(topics()).getByText("Design systems"))
  await settle()
  await userEvent.keyboard("{Backspace}{Backspace}{Backspace}")
  await settle()
  expect(topics().value).toEqual(["React", "Design systems"])
})

test("a tag's remove button is named for it", async () => {
  await open()
  await userEvent.click(screen.getByRole("button", { name: "Remove React" }))
  await settle()
  expect(topics().value).toEqual(["Design systems"])
})

test("suggestions filter as you type and leave out what's in", async () => {
  await open()
  await userEvent.type(input("Topics"), "s")
  await settle()
  const options = screen.getAllByRole("option").map((option) => option.textContent?.trim())
  expect(options).toContain("Accessibility")
  expect(options).not.toContain("Design systems")
  await userEvent.click(screen.getByRole("option", { name: "TypeScript" }))
  await settle()
  expect(topics().value).toEqual(["React", "Design systems", "TypeScript"])
})

test("an agent adds, removes and sets tags through the same rules, and hears why it's refused", async () => {
  const bridge = await open()
  expect(bridge.entry("Topics")).toMatchObject({ component: "tag-input", value: ["React", "Design systems"] })
  expect((await bridge.run("Topics", "add", "Testing")).ok).toBe(true)
  expect(topics().value).toEqual(["React", "Design systems", "Testing"])
  expect(await bridge.run("Topics", "add", "react")).toMatchObject({ ok: false, error: { message: expect.stringContaining("Already added: react") } })
  expect(await bridge.run("Topics", "setValue", ["a", "b", "c", "d", "e", "f"])).toMatchObject({ ok: false, error: { message: expect.stringContaining("Up to 5 tags") } })
  expect((await bridge.run("Topics", "remove", "design systems")).ok).toBe(true)
  expect(topics().value).toEqual(["React", "Testing"])
  expect(await bridge.run("Invitees", "add", "not an address")).toMatchObject({ ok: false, error: { message: expect.stringContaining("Not an email address") } })
})
