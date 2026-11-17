import { render } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { afterEach, expect, test } from "vitest"
import { cleanup } from "@testing-library/react"
import { checkAgentReadiness, expectAgentReady, formatAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import { Avatar, AvatarFallback } from "@/registry/uiset/ui/avatar"
import { Button } from "@/registry/uiset/ui/button"
import { Field, FieldLabel, Input } from "@/registry/uiset/ui/field"
import { Radio, RadioGroup } from "@/registry/uiset/ui/radio"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/uiset/ui/tooltip"

const agent = createAgent()
afterEach(cleanup)

test("a page whose every control an agent can find by name scores 100", async () => {
  render(
    <form>
      <Field name="project">
        <FieldLabel>Project name</FieldLabel>
        <Input />
      </Field>
      <Button>Save</Button>
    </form>,
  )
  const report = await expectAgentReady(agent)
  expect(report).toMatchObject({ score: 100, controls: 2, ready: 2, problems: [] })
})

test("finds unnamed components, names that find several, and controls agents can't see", async () => {
  render(
    <main>
      <Avatar>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
      {/* A closed tooltip takes its trigger's name (vercel-labs/ui#604). */}
      <Tooltip>
        <TooltipTrigger render={<Button />}>Account</TooltipTrigger>
        <TooltipContent>Your profile and sign out</TooltipContent>
      </Tooltip>
      {/* "Region" finds both: a step's name matches every name holding its words (#612). */}
      <Field name="region">
        <FieldLabel>Region</FieldLabel>
        <Input />
      </Field>
      <Field name="revenue">
        <FieldLabel>Revenue by region</FieldLabel>
        <Input />
      </Field>
      <button type="button">Export</button>
      <label>
        Notes <textarea />
      </label>
      {/* Left out: disabled, hidden from everyone, hidden from agents, a form value, and a
          part a component drives itself (out of the Tab order inside an element UI SDK bound). */}
      <button type="button" disabled>
        Archive
      </button>
      <button type="button" aria-hidden="true" tabIndex={-1}>
        Decoration
      </button>
      <div data-agent-hidden>
        <input aria-label="Recovery code" />
      </div>
      <input type="hidden" name="token" value="x" />
      <div data-slot="data-grid-cell">
        <input type="checkbox" tabIndex={-1} aria-label="Select row" />
      </div>
      <Button>Delete project</Button>
      <Button data-agent-confirm="Deletes the project and its files">Delete forever</Button>
    </main>,
  )
  const report = await checkAgentReadiness(agent)
  const kinds = report.problems.map((problem) => problem.kind)
  expect(kinds.filter((kind) => kind === "unnamed")).toHaveLength(1)
  const unnamed = report.problems.find((problem) => problem.kind === "unnamed")!
  expect(unnamed).toMatchObject({ component: "avatar" })

  const ambiguous = report.problems.filter((problem) => problem.kind === "ambiguous")
  expect(ambiguous.map((problem) => problem.kind === "ambiguous" && [problem.label, problem.components.sort()])).toEqual([
    ["Account", ["button", "tooltip"]],
    ["Region", ["input", "input"]],
  ])
  // The tooltip's own fix, and the plain one for two fields.
  expect(ambiguous[0]!.message).toContain("give a tooltip its own aria-label")
  expect(ambiguous[1]!.message).toContain('"Revenue by region"')

  const unseen = report.problems.filter((problem) => problem.kind === "unseen").map((problem) => problem.kind === "unseen" && problem.control)
  expect(unseen).toEqual(['button "Export"', 'textarea "Notes"'])

  const unconfirmed = report.problems.filter((problem) => problem.kind === "unconfirmed")
  expect(unconfirmed.map((problem) => problem.kind === "unconfirmed" && problem.label)).toEqual(["Delete project"])

  // Listed: avatar, Account button, its tooltip, two fields, two Delete buttons (7); unseen: 2.
  // Ready: Revenue by region and the two Delete buttons.
  expect(report).toMatchObject({ controls: 9, ready: 3, score: 33 })
  const text = formatAgentReadiness(report, "Settings")
  expect(text.split("\n")[0]).toBe("Settings: agent readiness 33/100 (3 of 9 controls an agent can find by name)")
  expect(text).toContain('error unseen: button "Export" isn\'t a UI SDK component')
  await expect(expectAgentReady(agent)).rejects.toThrow("agent readiness 33/100")
})

test("accepted problems can be left out, and the score counts them as fine", async () => {
  render(
    <main>
      <Button>Save</Button>
      <button type="button">Legacy export</button>
    </main>,
  )
  const strict = await checkAgentReadiness(agent)
  expect(strict).toMatchObject({ score: 50, controls: 2 })
  const report = await expectAgentReady(agent, { ignore: (problem) => problem.kind === "unseen" && problem.control.includes("Legacy") })
  expect(report).toMatchObject({ score: 100, controls: 1, problems: [] })
})

// Each with its own bridge: one remembers the components earlier tests removed, and lists them.
test("past the snapshot's 100 components, it finds the rest through query and says agents can't see them all at once", async () => {
  const fresh = createAgent()
  render(
    <main>
      {Array.from({ length: 60 }, (_, index) => (
        <Button key={index}>{`Action ${index + 1}`}</Button>
      ))}
      {Array.from({ length: 45 }, (_, index) => (
        <Field key={index} name={`field-${index}`}>
          <FieldLabel>{`Setting ${index + 1}`}</FieldLabel>
          <Input />
        </Field>
      ))}
      <Avatar>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
    </main>,
  )
  const report = await checkAgentReadiness(fresh)
  expect(report.controls).toBe(106)
  expect(report.problems.map((problem) => problem.kind)).toEqual(["overflow", "unnamed"])
  // `more` is the bridge's count, which takes in components earlier tests removed.
  expect(report.problems[0]).toMatchObject({ shown: 100, more: fresh.snapshot().at(-1)!.more, unchecked: 0 })
})

test("past 100 of one kind, it says how many it couldn't check", async () => {
  const fresh = createAgent()
  render(
    <main>
      {Array.from({ length: 205 }, (_, index) => (
        <Button key={index}>{`Action ${index + 1}`}</Button>
      ))}
    </main>,
  )
  const report = await checkAgentReadiness(fresh)
  // The snapshot's 100 and a query's 100, which may differ: never all 205.
  const overflow = report.problems[0]!
  expect(overflow).toMatchObject({ kind: "overflow", shown: 100 })
  const unchecked = overflow.kind === "overflow" ? overflow.unchecked : 0
  expect(report.controls).toBeLessThan(205)
  expect(unchecked).toBeGreaterThanOrEqual(205 - report.controls)
  expect(overflow.message).toContain(`${unchecked} couldn't be checked`)
})

test("a check limited to a root looks for unseen controls only there", async () => {
  render(
    <main>
      <section id="settings">
        <Button>Save</Button>
      </section>
      <button type="button">Elsewhere</button>
    </main>,
  )
  expect((await checkAgentReadiness(agent, { root: "#settings" })).problems).toEqual([])
  expect((await checkAgentReadiness(agent)).problems.map((problem) => problem.kind)).toEqual(["unseen"])
})

test("components no step targets (no actions) may share a name; a control agents can't see is placed by its heading", async () => {
  render(
    <main>
      {["Ada Lovelace", "Ada Lovelace"].map((name, index) => (
        <Avatar key={index} role="img" aria-label={name}>
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
      ))}
      <section>
        <h2>Plan mix</h2>
        <button type="button">
          <span>Free</span> <span>plan</span>
        </button>
      </section>
      <Button>Warning: Remove the console.log</Button>
    </main>,
  )
  const report = await checkAgentReadiness(agent)
  expect(report.problems).toEqual([expect.objectContaining({ kind: "unseen", control: 'button "Free plan"', near: '"Plan mix"' })])
})

test("a list the bridge finds through one of its items isn't a component a step by that name takes", async () => {
  render(
    <main>
      <Field name="role">
        <FieldLabel>Role</FieldLabel>
        <RadioGroup defaultValue="viewer">
          <label>
            <Radio value="viewer" /> Viewer
          </label>
          <label>
            <Radio value="admin" /> Admin
          </label>
        </RadioGroup>
      </Field>
      <Button>Admin</Button>
    </main>,
  )
  // The bridge's search for "Admin" returns the role group too, by its item.
  const found = await agent.query({ text: "Admin" })
  expect(Array.isArray(found) && found.map((entry) => entry.component).sort()).toEqual(["button", "radio"])
  expect((await checkAgentReadiness(agent)).problems).toEqual([])
})
