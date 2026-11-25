// The terminal kit in Solid, with React's assertions (tests/unit/terminal-mount.test.tsx). The
// screen and the session are shared (terminal/ansi.ts, terminal/session.ts) and tested there
// (terminal.test.ts); these check the Solid part that draws them.
import { fireEvent, render, screen } from "@solidjs/testing-library"
import { onSettled } from "solid-js"
import { afterEach, expect, test, vi } from "vitest"
import { Screen } from "@/registry/uiset/ui/terminal/ansi"
import { createTerminalController, Terminal } from "@/solid/src/terminal"
import { settle } from "./solid-bridge"

afterEach(() => vi.restoreAllMocks())

/** Frames run when the test says, so each write is drawn on a frame of its own. */
function frames() {
  const queue: FrameRequestCallback[] = []
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    queue.push(callback)
    return queue.length
  })
  return async () => {
    while (queue.length) queue.splice(0).forEach((frame) => frame(0))
    await settle()
  }
}

test("the welcome shows once the terminal mounts", async () => {
  render(() => <Terminal label="Shell" welcome={"Hello there\nType help"} />)
  await settle()
  expect(screen.getByText("Hello there")).toBeTruthy()
  expect(screen.getByText("Type help")).toBeTruthy()
})

// Past scrollback the oldest lines go, whether or not you're scrolled up: the trim doesn't wait
// for the view. Scrolled up, the view stays put and New output below shows; jsdom can't scroll,
// so the browser tests check that part (terminal-tests.ts).
test("past scrollback, old lines go", async () => {
  const flush = frames()
  const controller = createTerminalController()
  render(() => <Terminal label="Shell" scrollback={20} controller={controller} />)
  await settle()
  expect(screen.getByRole("log", { name: "Output" })).toBeTruthy()
  for (let i = 1; i <= 15; i++) controller.print(`line ${i}\n`)
  await flush()
  for (let i = 1; i <= 15; i++) controller.print(`more ${i}\n`)
  await flush()
  expect(screen.queryByText("line 1")).toBeNull()
  expect(screen.getByText("line 15")).toBeTruthy()
  expect(screen.getByText("more 15")).toBeTruthy()
})

// The log reads out additions; a progress line redrawn in place must change its text, not
// swap its nodes, or every redraw would be read out as a new line.
test("a line redrawn in place keeps its nodes: only its text changes", async () => {
  const flush = frames()
  const controller = createTerminalController()
  render(() => <Terminal label="Shell" controller={controller} />)
  await settle()
  controller.print("Building…\n10%")
  await flush()
  const log = screen.getByRole("log", { name: "Output" })
  const line = [...log.querySelectorAll(".terminal-line")].at(-1)!
  expect(line.textContent).toBe("10%")
  const added: Node[] = []
  const watch = new MutationObserver((records) => records.forEach((record) => added.push(...record.addedNodes)))
  watch.observe(log, { childList: true, subtree: true })
  for (const percent of [40, 70, 100]) {
    controller.print(`\r${percent}%`)
    await flush()
  }
  watch.disconnect()
  expect([...log.querySelectorAll(".terminal-line")].at(-1)).toBe(line)
  expect(line.textContent).toBe("100%")
  expect(added).toEqual([])
})

test("an unchanged line isn't drawn again when another changes", async () => {
  const flush = frames()
  const controller = createTerminalController()
  render(() => <Terminal label="Shell" controller={controller} />)
  await settle()
  controller.print("\x1b[32mdone\x1b[0m first\nsecond")
  await flush()
  const first = screen.getByText("done")
  const drawn = vi.spyOn(Screen, "runs")
  controller.print(" and more")
  await flush()
  expect(screen.getByText("done")).toBe(first)
  expect(screen.getByText("second and more")).toBeTruthy()
  // Only the line that changed is turned into runs again.
  expect(drawn.mock.calls.map(([line]) => Screen.text(line))).toEqual(["second and more"])
})

// A controller connects once the terminal exists, but a write can still come before the
// terminal is on the page: from a part of the page that settles first, like this one.
test("output written before the terminal is on the page shows once it is", async () => {
  const controller = createTerminalController()
  function Writer() {
    onSettled(() => {
      controller.print("early\n")
    })
    return null
  }
  render(() => (
    <>
      <Writer />
      <Terminal label="Shell" controller={controller} />
    </>
  ))
  await settle()
  expect(screen.getByText("early")).toBeTruthy()
})

test("Ctrl+C with text selected copies: the line stays, and nothing is stopped or echoed", async () => {
  render(() => <Terminal label="Shell" />)
  await settle()
  const input = screen.getByRole("textbox", { name: "Command line" }) as HTMLInputElement
  input.value = "git status"
  input.setSelectionRange(0, 3)
  const kept = fireEvent.keyDown(input, { key: "c", code: "KeyC", ctrlKey: true })
  await settle()
  expect(kept).toBe(true)
  expect(input.value).toBe("git status")
  expect(screen.getByRole("log", { name: "Output" }).textContent).not.toContain("^C")
  input.setSelectionRange(10, 10)
  fireEvent.keyDown(input, { key: "c", code: "KeyC", ctrlKey: true })
  await settle()
  expect(input.value).toBe("")
  expect(screen.getByRole("log", { name: "Output" }).textContent).toContain("git status^C")
})

test("Enter while a command runs says so and runs nothing more", async () => {
  const ran: string[] = []
  render(() => (
    <Terminal
      label="Shell"
      commands={{
        wait: { run: () => new Promise<void>(() => {}) },
        echo: { run: (args) => void ran.push(args.join(" ")) },
      }}
    />
  ))
  await settle()
  const input = screen.getByRole("textbox", { name: "Command line" }) as HTMLInputElement
  input.value = "wait"
  fireEvent.submit(input.form!)
  await settle()
  input.value = "echo hi"
  fireEvent.submit(input.form!)
  await settle()
  expect(ran).toEqual([])
  expect(input.value).toBe("echo hi")
})

test("a click on the output puts the caret in the prompt; a tap doesn't open the keyboard", async () => {
  render(() => <Terminal label="Shell" welcome="Hello there" />)
  await settle()
  const input = screen.getByRole("textbox", { name: "Command line" })
  fireEvent.pointerUp(screen.getByText("Hello there"), { pointerType: "touch" })
  expect(document.activeElement).not.toBe(input)
  fireEvent.pointerUp(screen.getByText("Hello there"), { pointerType: "mouse" })
  expect(document.activeElement).toBe(input)
})
