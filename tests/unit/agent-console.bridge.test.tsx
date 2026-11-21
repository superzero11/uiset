import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import { approvals, history } from "@/src/site/agent"
import { ConsoleDemo } from "@/src/site/console-demo"
import { ProjectSettings } from "@/src/site/project-settings"
import { createBridge, settle } from "./bridge"

// The Agents page's console (src/site/pages/agents.tsx, #agents): the site's agent changes the
// project settings beside it, through the bridge, and the person steers it from the console.
// The console is hidden from agents, so the person's side (writing, Allow, the Activity tab)
// is clicked and typed; what changed is read through the bridge. Moved from the "Agent Console"
// tests of tests/e2e/site.spec.ts.

vi.setConfig({ testTimeout: 30_000 })

const bridge = createBridge()
/** What an agent finds by this name on the page now (earlier tests' parts stay listed as off the page). */
const onPage = (label: string) => bridge.agent.snapshot().find((e) => !e.offPage && e.label === label)
const console_ = () => screen.getByRole("region", { name: "Agent" })
const card = () => console_().querySelector(".agent-approval")
async function ask(text: string) {
  await userEvent.type(within(console_()).getByRole("textbox", { name: "Message" }), `${text}{Enter}`)
}

// jsdom has no media queries; the browser tests ran with reduced motion, as here.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})
beforeEach(async () => {
  history.clear()
  render(
    <UISet>
      <div className="console-stage">
        <UISet skin="base" className="console-target">
          <ProjectSettings />
        </UISet>
        <ConsoleDemo />
      </div>
    </UISet>,
  )
  await settle()
})
afterEach(() => approvals.denyAll())

test("one sentence changes two settings, and Activity lists both", async () => {
  const started = Date.now()
  await ask("Make it public and move it to Europe")
  await waitFor(() => expect(onPage("Visibility")?.value).toBe("public"), { timeout: 5000 })
  await waitFor(() => expect(onPage("Region")?.value).toBe("europe"), { timeout: 5000 })
  expect(Date.now() - started, "two agent steps took too long").toBeLessThan(4000)
  expect(screen.getByRole("combobox", { name: "Visibility" }).textContent).toMatch(/Public/)
  expect(screen.getByRole("combobox", { name: "Region" }).textContent).toMatch(/Europe/)
  await waitFor(() => expect(console_().textContent).toContain("Done: 2 changes."), { timeout: 5000 })

  await userEvent.click(within(console_()).getByRole("tab", { name: "Activity" }))
  expect(within(console_()).getByText("2 changes by the agent")).toBeTruthy()
  expect(within(console_()).getByText("Agent set Region to europe")).toBeTruthy()
})

test("a destructive step waits for approval in the console, even over the agent's dialog", async () => {
  await ask("Delete the project")
  await waitFor(() => expect(card()?.textContent).toContain("Deletes the Apollo project"), { timeout: 5000 })
  expect(screen.getByRole("alertdialog", { name: "Delete Apollo?" })).toBeTruthy()
  expect(console_().getAttribute("data-status")).toBe("waiting")
  await userEvent.click(within(card() as HTMLElement).getByRole("button", { name: "Allow" }))
  await waitFor(() => expect(screen.getByText(/The project was deleted\./)).toBeTruthy())
  expect(card()).toBeNull()
})

test("Don't allow refuses the step and keeps the project", async () => {
  await ask("Delete the project")
  await waitFor(() => expect(card()).toBeTruthy(), { timeout: 5000 })
  await userEvent.click(within(card() as HTMLElement).getByRole("button", { name: /^Don.t allow$/ }))
  await waitFor(() => expect(console_().querySelectorAll('.agent-step[data-status="refused"]')).toHaveLength(1))
  expect(onPage("Project name")?.value).toBe("Apollo")
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
})

test("undo puts the agent's changes back and keeps the person's", async () => {
  await ask("Rename it to Atlas and turn off deploy on push")
  await waitFor(() => expect(onPage("Project name")?.value).toBe("Atlas"), { timeout: 5000 })
  await waitFor(() => expect(onPage("Deploy on push")?.checked).toBe(false), { timeout: 5000 })
  // The person's own change, made by hand: undoing the agent's keeps it.
  await userEvent.click(screen.getByRole("switch", { name: "Weekly digest" }))
  expect(onPage("Weekly digest")?.checked).toBe(true)

  await userEvent.click(within(console_()).getByRole("tab", { name: "Activity" }))
  await userEvent.click(within(console_()).getByRole("button", { name: "Undo agent changes" }))
  await waitFor(() => expect(onPage("Project name")?.value).toBe("Apollo"))
  await waitFor(() => expect(onPage("Deploy on push")?.checked).toBe(true))
  expect(onPage("Weekly digest")?.checked).toBe(true)
  expect(screen.getByRole("switch", { name: "Deploy on push" }).getAttribute("aria-checked")).toBe("true")
})

test("an agent can't see or press anything in the console", async () => {
  const labels = bridge.agent
    .snapshot()
    .filter((entry) => !entry.offPage)
    .map((entry) => entry.label)
  expect(labels).toContain("Project name")
  for (const label of ["Allow", "Undo agent changes", "Agent views", "What it sees"]) {
    expect(labels).not.toContain(label)
  }
  // The console's own message box is hidden from agents too.
  expect(labels).not.toContain("Message")
})
