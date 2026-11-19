// The confirm button: a person's first press arms it and the second acts; an agent's press needs
// the person's approval first, and then acts at once.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { afterEach, expect, test, vi } from "vitest"
import { ConfirmButton } from "@/registry/uiset/ui/button"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

function Delete({ onConfirm = vi.fn(), timeout }: { onConfirm?: () => void; timeout?: number }) {
  return (
    <ConfirmButton confirmLabel="Press again to delete" confirm="Deletes the Atlas project" onConfirm={onConfirm} timeout={timeout}>
      Delete project
    </ConfirmButton>
  )
}

test("a person's first press arms it, a quick second press doesn't act, a later one does", async () => {
  const onConfirm = vi.fn()
  let now = 1_000
  vi.spyOn(Date, "now").mockImplementation(() => now)
  render(<Delete onConfirm={onConfirm} />)
  await userEvent.click(screen.getByRole("button", { name: "Delete project" }))
  const armed = screen.getByRole("button", { name: "Press again to delete" })
  expect(armed.getAttribute("data-armed")).toBe("")
  expect(armed.getAttribute("data-variant")).toBe("destructive")
  // A double-click's second press lands at once: it isn't a decision.
  now += 100
  await userEvent.click(armed)
  expect(onConfirm).not.toHaveBeenCalled()
  now += 1_000
  await userEvent.click(armed)
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Delete project" }).hasAttribute("data-armed")).toBe(false)
})

test("Escape, leaving it, or waiting disarms it", async () => {
  vi.useFakeTimers()
  const onConfirm = vi.fn()
  render(<Delete onConfirm={onConfirm} timeout={4000} />)
  const button = screen.getByRole("button", { name: "Delete project" })
  fireEvent.click(button)
  expect(button.textContent).toBe("Press again to delete")
  fireEvent.keyDown(button, { key: "Escape" })
  expect(button.textContent).toBe("Delete project")
  fireEvent.click(button)
  fireEvent.blur(button)
  expect(button.textContent).toBe("Delete project")
  fireEvent.click(button)
  act(() => vi.advanceTimersByTime(4000))
  expect(button.textContent).toBe("Delete project")
  expect(onConfirm).not.toHaveBeenCalled()
})

test("an agent's press asks the person with its sentence, and once approved acts at once", async () => {
  const asked: (string | undefined)[] = []
  const agent = createAgent({ allow: (step) => (asked.push(step.confirm), true) })
  const onConfirm = vi.fn()
  render(<Delete onConfirm={onConfirm} />)
  await tick()
  const result = await agent.act({ steps: [{ ref: "Delete project", action: "press" }] })
  expect(result.ok).toBe(true)
  expect(asked).toEqual(["Deletes the Atlas project"])
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Delete project" }).hasAttribute("data-armed")).toBe(false)
})

test("with no one to approve, an agent's press is refused and nothing happens", async () => {
  const agent = createAgent()
  const onConfirm = vi.fn()
  render(<Delete onConfirm={onConfirm} />)
  await tick()
  const result = await agent.act({ steps: [{ ref: "Delete project", action: "press" }] })
  expect(result.ok).toBe(false)
  expect(onConfirm).not.toHaveBeenCalled()
  expect(screen.getByRole("button", { name: "Delete project" }).hasAttribute("data-armed")).toBe(false)
})
