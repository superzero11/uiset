import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { openWebPage } from "./web-page"

// The Terminal as a web element (web/terminal.html), on a page with no React: the gallery's
// commands, run through the web agent bridge. Keys, focus, scrolling and colors stay in the
// browser. Moved from tests/e2e/web/terminal.spec.ts.

const output = () => within(screen.getByRole("group", { name: "Shell" })).getByRole("log", { name: "Output" })
const open = () => openWebPage("terminal.html", "terminal-demo.ts")
type Agent = { query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]> }

// The element modules load once, before the tests' clocks start.
beforeAll(() => import("../../web/src/uiset"), 60_000)
afterEach(() => {
  document.body.innerHTML = ""
})

test("run commands; output keeps its colors and links; errors read in the danger tone", async () => {
  const bridge = await open()
  const run = (line: string) => bridge.run("Shell", "runCommand", line)
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
  const bridge = await open()
  const result = await bridge.run("Shell", "runCommand", "echo from an agent")
  expect(result.ok, result.error?.message).toBe(true)
  await waitFor(() => expect(output().textContent).toContain("from an agent"))
  const found = await (bridge.agent as unknown as Agent).query({ within: "Shell" })
  const items = found.find((c) => c.label === "Shell")?.items?.map((i) => i.label)
  expect(items).toEqual(expect.arrayContaining(["~/greeter $ echo from an agent", "from an agent"]))
})

test("a spinner that erases and rewrites its line leaves one line", async () => {
  const bridge = await open()
  await bridge.run("Shell", "runCommand", "install")
  await waitFor(() => expect(output().textContent).toContain("✓ Installed 5 packages"), { timeout: 10_000 })
  const lines = [...output().querySelectorAll('.terminal-line[data-kind="out"]')].filter((line) => /Install/.test(line.textContent ?? ""))
  expect(lines).toHaveLength(1)
})

test("names on Object's prototype aren't commands", async () => {
  const bridge = await open()
  await bridge.run("Shell", "runCommand", "toString")
  await waitFor(() => expect(output().textContent).toContain("toString: command not found"))
})

test("agents can't fake the echoed line with control characters", async () => {
  const bridge = await open()
  const result = await bridge.run("Shell", "runCommand", "echo rm -rf /tmp/x\rls")
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/one line of plain text/)
})
