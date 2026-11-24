import { render, screen } from "@solidjs/testing-library"
import { createSignal, flush } from "solid-js"
import { expect, test } from "vitest"
import { Crossfade } from "@/solid/src/crossfade"
import { NumberTicker } from "@/solid/src/number-ticker"
import { TextReveal } from "@/solid/src/text-reveal"
import { Thinking } from "@/solid/src/thinking"
import { UISet } from "@/solid/src/uiset"
import { settle } from "./solid-bridge"

// The motion pieces in Solid. The moves themselves are shared with React and Web Components
// (motion/*.ts) and checked in a browser (tests/e2e/motion-pieces.spec.ts); here, that the
// Solid views hand them every new value and keep the text in the page.

test("a number ticker reads as its value at once, formatted, and follows a new one", async () => {
  const [value, setValue] = createSignal(12840)
  const { container } = render(() => (
    <UISet>
      <NumberTicker value={value()} format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} locale="en-US" />
    </UISet>
  ))
  await settle()
  const read = () => container.querySelector(".uiset-visually-hidden")?.textContent
  expect(read()).toBe("$12,840")
  setValue(14130)
  flush()
  await settle()
  expect(read()).toBe("$14,130")
})

test("a number ticker takes a formatter of its own", async () => {
  const { container } = render(() => <NumberTicker value={3} format={(n) => `${n} seats`} />)
  await settle()
  expect(container.querySelector(".uiset-visually-hidden")?.textContent).toBe("3 seats")
})

test("revealed text is all in the page, and grows as a streamed answer does", async () => {
  const [text, setText] = createSignal("Abort a fetch")
  const { container } = render(() => <TextReveal>{text()}</TextReveal>)
  await settle()
  expect(container.textContent).toContain("Abort a fetch")
  setText("Abort a fetch with an AbortController")
  flush()
  await settle()
  expect(container.textContent).toContain("Abort a fetch with an AbortController")
})

test("Thinking is a status that says its words once", () => {
  render(() => (
    <>
      <Thinking />
      <Thinking>Searching the docs…</Thinking>
    </>
  ))
  const statuses = screen.getAllByRole("status").filter((el) => el.getAttribute("data-slot") === "thinking")
  expect(statuses.map((el) => el.querySelector(".thinking-label")!.textContent)).toEqual(["Thinking…", "Searching the docs…"])
  expect(statuses[0]!.querySelector(".thinking-mark")!.getAttribute("aria-hidden")).toBe("true")
})

test("a crossfade swaps its content for the new value; the old content leaves as it was, unreachable", async () => {
  const [plan, setPlan] = createSignal<"free" | "team">("free")
  const lines = { free: "One project", team: "Shared workspaces" }
  const { container } = render(() => (
    // A swap that takes time, as a skin's does: jsdom has no stylesheet to give it one.
    <Crossfade value={plan()} style={{ "--uiset-swap-duration": "200ms" }}>
      <p>{lines[plan()]}</p>
    </Crossfade>
  ))
  await settle()
  const root = container.querySelector('[data-slot="crossfade"]')!
  expect(root.textContent).toBe("One project")
  setPlan("team")
  flush()
  await settle(20)
  const leaving = root.querySelector('[data-pane="free"]')!
  expect(leaving.textContent).toBe("One project")
  expect(leaving.hasAttribute("inert")).toBe(true)
  expect(leaving.getAttribute("aria-hidden")).toBe("true")
  expect(root.querySelector('[data-pane="team"]')!.textContent).toBe("Shared workspaces")
  await settle(300)
  expect(root.querySelector('[data-pane="free"]')).toBeNull()
  expect(root.textContent).toBe("Shared workspaces")
})
