// Inline edit in Solid, with React's assertions (tests/unit/inline-edit.test.tsx). The server
// check is the shared primitive's, in React's file.
import { render, screen } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/solid/agent"
import { createSignal } from "solid-js"
import { expect, test, vi } from "vitest"
import { InlineEdit } from "@/solid/src/inline-edit"
import { settle } from "./solid-bridge"

const agent = createAgent()
const tick = () => settle(0)

const preview = () => screen.getByRole("button", { name: "Edit Project name: Atlas" })
const field = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Project name" })

test("a press edits, Enter saves, and focus returns to the value", async () => {
  const onValueChange = vi.fn()
  render(() => <InlineEdit label="Project name" defaultValue="Atlas" onValueChange={onValueChange} />)
  expect(screen.getByRole("group", { name: "Project name" })).toBeTruthy()
  await userEvent.click(preview())
  await tick()
  expect(field().value).toBe("Atlas")
  expect(document.activeElement).toBe(field())
  // Typing keeps the same input: Solid doesn't rebuild it as the value changes.
  const input = field()
  await userEvent.clear(field())
  await userEvent.type(field(), "Orion")
  expect(field()).toBe(input)
  await userEvent.keyboard("{Enter}")
  await tick()
  expect(onValueChange).toHaveBeenCalledTimes(1)
  expect(onValueChange.mock.calls[0]![0]).toBe("Orion")
  expect(onValueChange.mock.calls[0]![1]).toMatchObject({ reason: "enter-key" })
  expect(screen.queryByRole("textbox")).toBeNull()
  const value = screen.getByRole("button", { name: "Edit Project name: Orion" })
  expect(document.activeElement).toBe(value)
})

test("Enter, Space and F2 on the value start editing", async () => {
  render(() => <InlineEdit label="Project name" defaultValue="Atlas" />)
  for (const key of ["{Enter}", " ", "{F2}"]) {
    preview().focus()
    await userEvent.keyboard(key)
    await tick()
    expect(document.activeElement, key).toBe(field())
    await userEvent.keyboard("{Escape}")
    await tick()
  }
})

test("Escape puts the text back and saves nothing", async () => {
  const onValueChange = vi.fn()
  render(() => <InlineEdit label="Project name" defaultValue="Atlas" onValueChange={onValueChange} />)
  await userEvent.click(preview())
  await tick()
  await userEvent.type(field(), " two{Escape}")
  await tick()
  expect(onValueChange).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(preview())
})

test("leaving the field saves", async () => {
  const onValueChange = vi.fn()
  render(() => (
    <>
      <InlineEdit label="Project name" defaultValue="Atlas" onValueChange={onValueChange} />
      <button>Elsewhere</button>
    </>
  ))
  await userEvent.click(preview())
  await tick()
  await userEvent.type(field(), " two")
  await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }))
  await tick()
  expect(onValueChange.mock.calls.at(-1)![0]).toBe("Atlas two")
  expect(onValueChange.mock.calls.at(-1)![1]).toMatchObject({ reason: "focus-out" })
  expect(screen.queryByRole("textbox")).toBeNull()
})

test("text that fails validation stays open, marked and described, until it is fixed", async () => {
  const onValueChange = vi.fn()
  render(() => (
    <InlineEdit
      label="Project name"
      defaultValue="Atlas"
      onValueChange={onValueChange}
      validate={(text) => (text.trim() ? null : "A project needs a name.")}
    />
  ))
  await userEvent.click(preview())
  await tick()
  await userEvent.clear(field())
  await userEvent.keyboard("{Enter}")
  await tick()
  expect(onValueChange).not.toHaveBeenCalled()
  expect(field().getAttribute("aria-invalid")).toBe("true")
  const message = screen.getByText("A project needs a name.")
  expect(field().getAttribute("aria-describedby")).toBe(message.id)
  const input = field()
  await userEvent.type(field(), "O")
  await tick()
  expect(field().getAttribute("aria-invalid")).toBeNull()
  // The problem going doesn't rebuild the input: it keeps its element and focus.
  expect(field()).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(screen.queryByText("A project needs a name.")).toBeNull()
  await userEvent.type(field(), "rion{Enter}")
  await tick()
  expect(onValueChange.mock.calls.at(-1)![0]).toBe("Orion")
})

test("Tab leaves and saves; with text that can't be saved it stays in the field", async () => {
  const onValueChange = vi.fn()
  render(() => (
    <>
      <InlineEdit
        label="Project name"
        defaultValue="Atlas"
        onValueChange={onValueChange}
        validate={(text) => (text.trim() ? null : "A project needs a name.")}
      />
      <button>Next</button>
    </>
  ))
  await userEvent.click(preview())
  await tick()
  await userEvent.clear(field())
  await userEvent.tab()
  await tick()
  expect(document.activeElement).toBe(field())
  expect(field().getAttribute("aria-invalid")).toBe("true")
  expect(onValueChange).not.toHaveBeenCalled()
  await userEvent.type(field(), "Vega")
  await userEvent.tab()
  await tick()
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }))
  expect(onValueChange.mock.calls.at(-1)![0]).toBe("Vega")
  expect(screen.queryByRole("textbox")).toBeNull()
})

test("Save and Cancel do what Enter and Escape do, and aren't tab stops", async () => {
  const onValueChange = vi.fn()
  render(() => <InlineEdit label="Project name" defaultValue="Atlas" onValueChange={onValueChange} actions />)
  await userEvent.click(preview())
  await tick()
  const save = screen.getByRole("button", { name: "Save Project name" })
  const cancel = screen.getByRole("button", { name: "Cancel" })
  expect(save.getAttribute("tabindex")).toBe("-1")
  expect(cancel.getAttribute("tabindex")).toBe("-1")
  await userEvent.type(field(), " two")
  await userEvent.click(cancel)
  await tick()
  expect(onValueChange).not.toHaveBeenCalled()
  expect(screen.queryByRole("textbox")).toBeNull()
  expect(document.activeElement).toBe(preview())

  await userEvent.click(preview())
  await tick()
  await userEvent.type(field(), " two")
  await userEvent.click(screen.getByRole("button", { name: "Save Project name" }))
  await tick()
  expect(onValueChange).toHaveBeenCalledTimes(1)
  expect(onValueChange.mock.calls[0]![0]).toBe("Atlas two")
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Project name: Atlas two" }))
})

test("a disabled value can be read and tabbed to, but not edited", async () => {
  render(() => <InlineEdit label="Project name" defaultValue="Atlas" disabled />)
  const value = preview()
  expect(value.getAttribute("aria-disabled")).toBe("true")
  expect(value.hasAttribute("disabled")).toBe(false)
  await userEvent.click(value)
  await userEvent.keyboard("{F2}")
  await tick()
  expect(screen.queryByRole("textbox")).toBeNull()
})

test("an empty value shows its placeholder, and a controlled one follows its prop", async () => {
  function Controlled() {
    const [value, setValue] = createSignal("")
    return (
      <>
        <InlineEdit label="Description" value={value()} onValueChange={(next) => setValue(next)} placeholder="Add a description" />
        <button onClick={() => setValue("From outside")}>Set</button>
      </>
    )
  }
  render(() => <Controlled />)
  expect(screen.getByRole("button", { name: "Edit Description: Add a description" })).toBeTruthy()
  expect(screen.getByRole("group", { name: "Description" }).hasAttribute("data-empty")).toBe(true)
  await userEvent.click(screen.getByRole("button", { name: "Set" }))
  await tick()
  expect(screen.getByRole("button", { name: "Edit Description: From outside" })).toBeTruthy()
})

test("an agent finds it by its label and sets it, through validation", async () => {
  const onValueChange = vi.fn()
  render(() => (
    <InlineEdit
      label="Project name"
      defaultValue="Atlas"
      onValueChange={onValueChange}
      validate={(text) => (text.trim() ? null : "A project needs a name.")}
    />
  ))
  await tick()
  const entry = agent.snapshot().find((e) => !e.offPage && e.label === "Project name")
  expect(entry, "Project name is missing from the snapshot").toBeTruthy()
  expect(entry!.actions).toEqual(expect.arrayContaining(["setValue", "startEditing"]))
  const result = await agent.act({ steps: [{ ref: "Project name", action: "setValue", args: ["Orion"] }] })
  expect(result.ok, result.error?.message).toBe(true)
  expect(onValueChange.mock.calls.at(-1)![0]).toBe("Orion")
  expect(onValueChange.mock.calls.at(-1)![1]).toMatchObject({ source: "agent" })
  expect(screen.getByRole("button", { name: "Edit Project name: Orion" })).toBeTruthy()
  await agent.act({ steps: [{ ref: "Project name", action: "setValue", args: ["  "] }] })
  expect(onValueChange.mock.calls.at(-1)![0]).toBe("Orion")
})
