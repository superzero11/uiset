import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import { ConsoleKit } from "@/src/site/console-kit"
import { ExamplePreview, useExample } from "@/src/site/docs/component-preview"
import { GridDemo } from "@/src/site/grid-demo"
import { ItemStage } from "@/src/site/item-stage"
import LibraryPage from "@/src/site/pages/library"
import { createBridge, settle } from "./bridge"

// Agent view (src/site/agent-view.tsx): beside a live example, what UI SDK's agent bridge
// reads, its agent-check score, and its actions, run through the bridge. The examples draw as
// on their docs pages (component-preview.tsx) and the kits' in their stage (item-stage.tsx).
// The panel is hidden from agents, so a person's presses drive it here; the bridge checks
// what an agent then sees. Moved from tests/e2e/agent-view.spec.ts.

const bridge = createBridge()

beforeAll(() => {
  // jsdom has no IntersectionObserver: the panel reads only near the screen, and here it is.
  globalThis.IntersectionObserver ??= class {
    constructor(private seen: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.seen([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
  // Nor matchMedia; some examples ask about the screen. A wide one, here.
  window.matchMedia ??= ((media: string) => ({ matches: false, media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia
})

// Agent view is one switch for the whole site; each test starts with it off.
afterEach(async () => {
  const toggle = screen.queryByRole("switch", { name: "Agent view" })
  if (toggle?.getAttribute("aria-checked") === "true") await userEvent.click(toggle)
  cleanup()
  localStorage.clear()
  await settle()
})

/** A component's example as its docs page draws it. */
function Docs({ item, title }: { item: string; title: string }) {
  const example = useExample(item)
  return example ? <ExamplePreview example={example} item={item} title={title} skin="base" theme="light" /> : null
}

async function openDocs(item: string, title: string) {
  render(
    <UISet>
      <Docs item={item} title={title} />
    </UISet>,
  )
  await waitFor(() => expect(document.querySelector(".docs-preview .example[data-ready]")).toBeTruthy(), { timeout: 20_000 })
  await settle()
}

const preview = () => within(document.querySelector<HTMLElement>(".docs-preview")!)
const panel = (name: string | RegExp = /^Agent view of/) => screen.getByRole("region", { name })
const rowOf = (region: HTMLElement, text: string) => within(region).getAllByRole("listitem").find((li) => li.textContent?.includes(text))!
const seen = () =>
  bridge.agent
    .snapshot()
    .filter((e) => !e.offPage)
    .map((e) => `${e.component}:${e.label}`)
    .sort()

async function turnOn() {
  const toggle = screen.getByRole("switch", { name: "Agent view" })
  await userEvent.click(toggle)
  await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("true"))
}

test("on a component's page it lists what the bridge reads, scored, and runs its actions", { timeout: 30_000 }, async () => {
  await openDocs("select", "Select")
  expect(preview().getByRole("combobox", { name: "Role" })).toBeTruthy()
  expect(screen.queryByRole("region", { name: /^Agent view/ })).toBeNull()
  await turnOn()
  const view = panel("Agent view of Select")
  await waitFor(() => expect(view.textContent).toContain("100/100"), { timeout: 10_000 })
  await waitFor(() => expect(rowOf(view, "Role")).toBeTruthy())
  expect(rowOf(view, "Role").textContent).toContain("select")
  expect(rowOf(view, "Role").textContent).toContain("“editor”")
  // A closed select's items aren't in the snapshot: as the bridge tells an agent, setValue
  // takes an item's label and opens the list to find it.
  await userEvent.click(within(rowOf(view, "Role")).getByRole("button", { name: "setValue Role…" }))
  await waitFor(() => expect(rowOf(view, "Role").textContent).toContain("The bridge says:"))
  await userEvent.type(within(rowOf(view, "Role")).getByRole("textbox", { name: "setValue for Role" }), "Admin")
  await userEvent.click(within(rowOf(view, "Role")).getByRole("button", { name: "Run" }))
  await waitFor(() => expect(rowOf(view, "Role").textContent).toContain("“admin”"))
  expect(bridge.entry("Role").value).toBe("admin")
  expect(view.querySelector("output")?.textContent).not.toBe("")
})

test("setValue on a component whose items are in the snapshot is a choice of them", { timeout: 30_000 }, async () => {
  await openDocs("segmented-control", "Segmented control")
  expect(preview().getByRole("radiogroup", { name: "Layout" })).toBeTruthy()
  await turnOn()
  await waitFor(() => expect(rowOf(panel(), "Layout")).toBeTruthy())
  await userEvent.click(within(rowOf(panel(), "Layout")).getByRole("button", { name: "setValue Layout…" }))
  await userEvent.click(within(rowOf(panel(), "Layout")).getByRole("combobox", { name: "setValue for Layout" }))
  await userEvent.click(await screen.findByRole("option", { name: "Calendar" }))
  await waitFor(() => expect(preview().getByRole("radio", { name: "Calendar" }).getAttribute("aria-checked")).toBe("true"))
  await waitFor(() => expect(rowOf(panel(), "Layout").textContent).toContain("“calendar”"))
})

test("Agent view is hidden from agents, so turning it on changes nothing an agent sees", { timeout: 30_000 }, async () => {
  await openDocs("select", "Select")
  const off = seen()
  // Its switch too: on Kits, "Agent view" made a step naming the IDE's "View" menu ambiguous.
  expect(off.filter((e) => /agent view/i.test(e))).toEqual([])
  await turnOn()
  await waitFor(() => expect(panel("Agent view of Select").textContent).toContain("100/100"), { timeout: 10_000 })
  expect(seen()).toEqual(off)
})

test("a kit's page has its own view, and the library's cards stay out of agents' way", { timeout: 60_000 }, async () => {
  const { container } = render(
    <UISet>
      <ItemStage title="Data grid" items={["data-grid"]} stageClass="grid-stage">
        <GridDemo />
      </ItemStage>
    </UISet>,
  )
  await waitFor(() => expect(container.querySelector(".item-frame [role='grid']")).toBeTruthy(), { timeout: 20_000 })
  await turnOn()
  const grid = panel("Agent view of Data grid")
  await waitFor(() => expect(within(grid).getAllByRole("listitem").some((li) => li.textContent?.includes("data-grid"))).toBe(true), { timeout: 10_000 })
  await waitFor(() => expect(grid.textContent).toMatch(/\d+\/100/), { timeout: 10_000 })
  // The Kits tab draws every kit as a picture: none of them is in an agent's snapshot.
  await userEvent.click(screen.getByRole("switch", { name: "Agent view" }))
  cleanup()
  window.history.replaceState(null, "", "/kits")
  try {
    const page = render(
      <UISet>
        <LibraryPage />
      </UISet>,
    )
    await waitFor(() => expect(page.container.querySelector(".lib-card")).toBeTruthy(), { timeout: 20_000 })
    await settle(500)
    expect(seen().some((e) => e.startsWith("data-grid:"))).toBe(false)
  } finally {
    window.history.replaceState(null, "", "/")
  }
})

// The Agent Console's kit page shows the settings the agent works on, beside the console: it
// once showed the console alone, so every step failed with nothing to change.
test("on the Agent Console's page, a prompt changes the settings beside it", { timeout: 30_000 }, async () => {
  const { container } = render(
    <UISet>
      <ItemStage title="Agent Console" items={["agent-console"]}>
        <ConsoleKit />
      </ItemStage>
    </UISet>,
  )
  await settle()
  const stage = container.querySelector<HTMLElement>(".item-stage")!
  // The console is the person's, hidden from agents: the person sends the prompt.
  await userEvent.click(within(stage).getByRole("button", { name: "Make it public and move it to Europe" }))
  await waitFor(() => expect(stage.textContent).toContain("Done: 2 changes"), { timeout: 15_000 })
  expect(within(stage).getByRole("combobox", { name: "Region" }).textContent).toContain("Europe")
})

test("an action that asks a person first waits in its row for Allow, and Don't allow stops it", { timeout: 30_000 }, async () => {
  await openDocs("chat-message-parts", "Chat message parts")
  await turnOn()
  const view = screen.getAllByRole("region", { name: /^Agent view of/ })[0]!
  const row = () => rowOf(view, "Asks a person first: Puts the conversation back to this checkpoint")
  const status = () => document.querySelector(".chat-agent-example [role=status]")!
  const ask = () => within(view).queryByRole("group", { name: "The agent wants to: Puts the conversation back to this checkpoint" })
  await waitFor(() => expect(row()).toBeTruthy(), { timeout: 10_000 })

  await userEvent.click(within(row()).getByRole("button", { name: /^press Restore Checkpoint/ }))
  await waitFor(() => expect(ask()).toBeTruthy())
  expect(view.querySelector("output")?.textContent).toBe("Waiting for you: Puts the conversation back to this checkpoint")
  await userEvent.click(within(ask()!).getByRole("button", { name: "Don’t allow" }))
  await waitFor(() => expect(ask()).toBeNull())
  expect(status().textContent).toBe("")

  await userEvent.click(within(row()).getByRole("button", { name: /^press Restore Checkpoint/ }))
  await waitFor(() => expect(ask()).toBeTruthy())
  await userEvent.click(within(ask()!).getByRole("button", { name: "Allow" }))
  await waitFor(() => expect(ask()).toBeNull())
  await waitFor(() => expect(status().textContent).toBe("Restored to the checkpoint."))
})

// Last: it loads the page's modules anew, as the next page would.
test("a yes-or-no setter is one button that flips it, and the switch's state carries to the next page", { timeout: 30_000 }, async () => {
  await openDocs("switch", "Switch")
  await turnOn()
  await waitFor(() => expect(within(panel()).getAllByRole("listitem").length).toBeGreaterThan(0))
  const row = within(panel()).getAllByRole("listitem")[0]!
  const name = row.querySelector(".agent-view-name")!.textContent!
  const target = preview().getByRole("switch", { name })
  const before = target.getAttribute("aria-checked")
  const flip = before === "true" ? "false" : "true"
  await userEvent.click(within(row).getByRole("button", { name: `setChecked ${flip} for ${name}` }))
  await waitFor(() => expect(target.getAttribute("aria-checked")).toBe(flip))
  await waitFor(() => expect(within(within(panel()).getAllByRole("listitem")[0]!).getByRole("button", { name: `setChecked ${before} for ${name}` })).toBeTruthy())
  // Remembered: the next page opens with it on. A new page reads the switch afresh, from
  // modules loaded anew; this page's switch goes off first, so the tests after start off.
  expect(localStorage.getItem("uiset-agent-view")).toBe("on")
  await userEvent.click(screen.getByRole("switch", { name: "Agent view" }))
  cleanup()
  vi.resetModules()
  localStorage.setItem("uiset-agent-view", "on")
  const next = await import("@/src/site/docs/component-preview")
  const { UISet: NextUISet } = await import("@/registry/uiset/ui/uiset")
  function NextDocs() {
    const example = next.useExample("slider")
    return example ? <next.ExamplePreview example={example} item="slider" title="Slider" skin="base" theme="light" /> : null
  }
  render(
    <NextUISet>
      <NextDocs />
    </NextUISet>,
  )
  await waitFor(() => expect(screen.getByRole("switch", { name: "Agent view" }).getAttribute("aria-checked")).toBe("true"), { timeout: 20_000 })
  await waitFor(() => expect(panel()).toBeTruthy(), { timeout: 20_000 })
})
