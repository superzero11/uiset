import { render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import TerminalExample from "@/src/site/examples/terminal"
import { createBridge, settle } from "./bridge"

// The gallery's terminal (src/site/examples/terminal.tsx), driven through the agent bridge:
// commands run by the terminal's name, and what they print. Moved from tests/e2e/terminal.spec.ts.

const bridge = createBridge()
const output = () => within(screen.getByRole("group", { name: "Shell" })).getByRole("log", { name: "Output" })
const run = (line: string) => bridge.run("Shell", "runCommand", line)

beforeEach(async () => {
  render(
    <UISet>
      <TerminalExample />
    </UISet>,
  )
  await settle()
})

test("run commands; output keeps its colors and links; errors read in the danger tone", async () => {
  await run("cat README.md")
  await waitFor(() => expect(within(output()).getByRole("link", { name: "https://example.com/greeter" })).toBeTruthy())
  await run("colors")
  await waitFor(() => expect(output().querySelector('[data-fg="red"]')?.textContent).toBe("red"))
  await run("cat nope")
  await waitFor(() => expect([...output().querySelectorAll('[data-fg="red"]')].at(-1)?.textContent).toBe("cat: nope: no such file"))
  await run("frobnicate")
  await waitFor(() => expect(output().textContent).toContain("frobnicate: command not found. Type help for the list."))
})

test("agents run commands and read the output", async () => {
  const result = await run("echo from an agent")
  expect(result.ok, result.error?.message).toBe(true)
  await waitFor(() => expect(output().textContent).toContain("from an agent"))
  const found = await bridge.agent.query({ within: "Shell" })
  const items = Array.isArray(found) ? found.find((c) => c.label === "Shell")?.items?.map((i) => i.label) : undefined
  expect(items).toEqual(expect.arrayContaining(["~/greeter $ echo from an agent", "from an agent"]))
})

test("a spinner that erases and rewrites its line leaves one line", async () => {
  await run("install")
  await waitFor(() => expect(output().textContent).toContain("✓ Installed 5 packages"), { timeout: 3000 })
  const lines = [...output().querySelectorAll('.terminal-line[data-kind="out"]')].filter((line) => /Install/.test(line.textContent ?? ""))
  expect(lines).toHaveLength(1)
})

test("names on Object's prototype aren't commands", async () => {
  await run("toString")
  await waitFor(() => expect(output().textContent).toContain("toString: command not found"))
})

test("agents can't fake the echoed line with control characters", async () => {
  const result = await run("echo rm -rf /tmp/x\rls")
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/one line of plain text/)
})
