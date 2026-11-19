import { act, render, screen } from "@testing-library/react"
import { startTransition, Suspense, use } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { createTerminalController, Terminal } from "@/registry/uiset/ui/terminal"

afterEach(() => vi.restoreAllMocks())

// On a page that is already up, a terminal can be rendered and then held back before it's
// committed (here a transition waits on a sibling that suspends). A frame that fires in
// between must not update it: React warns "Can't perform a React state update on a
// component that hasn't mounted yet". It was seen on the site's kits page.
test("a terminal that hasn't mounted yet schedules no updates", async () => {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  const errors = vi.spyOn(console, "error").mockImplementation(() => {})
  const pending = new Promise<void>(() => {})
  function Slow() {
    use(pending)
    return null
  }
  function Page({ show }: { show: boolean }) {
    return (
      <Suspense fallback={<p>Loading</p>}>
        <p>Page</p>
        {show && (
          <>
            <Terminal label="Shell" welcome="Hello there" />
            <Slow />
          </>
        )}
      </Suspense>
    )
  }

  const { rerender } = render(<Page show={false} />)
  await act(async () => startTransition(() => rerender(<Page show />)))
  expect(screen.queryByText("Hello there")).toBeNull()
  // The terminal rendered but isn't on the page; any frame it asked for runs now.
  await act(async () => frames.splice(0).forEach((frame) => frame(0)))
  expect(errors.mock.calls.flat().join(" ")).not.toMatch(/hasn't mounted/)
})

test("the welcome shows once the terminal mounts", () => {
  render(<Terminal label="Shell" welcome={"Hello there\nType help"} />)
  expect(screen.getByText("Hello there")).toBeTruthy()
  expect(screen.getByText("Type help")).toBeTruthy()
})

// Past scrollback the oldest lines go, whether or not you're scrolled up: the trim doesn't wait
// for the view. Scrolled up, the view stays put and New output below shows; jsdom can't scroll,
// so the e2e suite checks that part (web/terminal.spec.ts, terminal.spec.ts).
test("past scrollback, old lines go", async () => {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  const flush = () => act(async () => frames.splice(0).forEach((frame) => frame(0)))
  const controller = createTerminalController()
  render(<Terminal label="Shell" scrollback={20} controller={controller} />)
  expect(screen.getByRole("log", { name: "Output" })).toBeTruthy()
  for (let i = 1; i <= 15; i++) controller.print(`line ${i}\n`)
  await flush()
  for (let i = 1; i <= 15; i++) controller.print(`more ${i}\n`)
  await flush()
  expect(screen.queryByText("line 1")).toBeNull()
  expect(screen.getByText("line 15")).toBeTruthy()
  expect(screen.getByText("more 15")).toBeTruthy()
})
