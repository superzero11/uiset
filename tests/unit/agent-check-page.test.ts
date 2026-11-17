import { afterEach, expect, test } from "vitest"
import { formatAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import { checkPageReadiness, expectPageReady } from "@/registry/uiset/ui/agent-check/page"

// The any-site check: the page's own controls and names, as an agent reading the
// accessibility tree finds them, with no UI SDK bridge.

const page = (html: string) => {
  document.body.innerHTML = html
}
afterEach(() => {
  document.body.innerHTML = ""
})
const kinds = () => checkPageReadiness().problems.map((problem) => problem.kind)

test("a page whose controls all have names of their own scores 100", () => {
  page(`
    <button>Save</button>
    <a href="/docs">Docs</a>
    <label>Email <input type="email"></label>
    <select aria-label="Region"><option>Europe</option><option>Asia</option></select>`)
  expect(checkPageReadiness()).toEqual({ mode: "page", score: 100, controls: 4, ready: 4, problems: [] })
})

test("names come from aria-labelledby, aria-label, a label, the text inside, then title or placeholder", () => {
  // Each pair has one name only if it's worked out right, so each pair shares a name.
  page(`
    <span id="t">Ship to</span><input aria-labelledby="t"> <input aria-label="Ship to">
    <button aria-label="Settings">⚙</button> <button><img src="x.png" alt="Settings"></button>
    <button><svg><title>Delete</title><desc>A trash can</desc></svg></button> <button>Delete</button>
    <button><span aria-hidden="true">✓</span> Done</button> <button>Done</button>
    <input type="submit"> <button>Submit</button>
    <label for="n">Nickname</label><input id="n"> <input placeholder="Nickname">
    <a href="/x" title="Home page"><svg></svg></a> <a href="/y">Home page</a>
    <a href="/vote?1"><div title="upvote"></div></a> <a href="/vote?2">upvote</a>
    <button>Standup<span>Tomorrow</span></button> <button><div>Standup</div><div>Tomorrow</div></button> <button>Standup Tomorrow</button>`)
  const report = checkPageReadiness()
  expect(report.problems.map((problem) => problem.kind === "ambiguous" && `${problem.role} "${problem.name}" ×${problem.count}`)).toEqual([
    'textbox "Ship to" ×2',
    'button "Settings" ×2',
    'button "Delete" ×2',
    'button "Done" ×2',
    'button "Submit" ×2',
    'textbox "Nickname" ×2',
    'link "Home page" ×2',
    'link "upvote" ×2',
    // Text in inline parts runs together; in blocks it's words apart.
    'button "Standup Tomorrow" ×2',
  ])
  expect(report.controls).toBe(19)
})

test("a control with no name is reported, where it is", () => {
  page(`
    <section><h2>Toolbar</h2>
      <button><svg aria-hidden="true"></svg></button>
      <a href="/profile"><img src="me.png" alt=""></a>
      <input>
    </section>`)
  const report = checkPageReadiness()
  expect(report.problems.map((problem) => problem.kind === "unnamed" && problem.control)).toEqual(["button", "link (a)", "textbox (input)"])
  expect(report.problems[0]!.message).toBe('A button in "Toolbar" has no name, so an agent can\'t tell what it does. Give it visible text, a label, or aria-label.')
  expect(report).toMatchObject({ controls: 3, ready: 0, score: 0 })
})

test("controls of one kind sharing a name are reported once, with how many", () => {
  page(`
    <table><tr><td>Ada</td><td><button>Edit</button></td></tr><tr><td>Grace</td><td><button>Edit</button></td></tr><tr><td>Alan</td><td><button>Edit</button></td></tr></table>
    <a href="/a">Read more</a><a href="/b">Read more</a>
    <a href="/">Home</a><a href="/">Home</a>
    <a href="/edit">Edit</a>`)
  const report = checkPageReadiness()
  expect(report.problems.map((problem) => problem.kind === "ambiguous" && [problem.role, problem.name, problem.count])).toEqual([
    ["button", "Edit", 3],
    ["link", "Read more", 2],
  ])
  expect(report.problems[1]!.message).toContain("but go to different places")
  // Ready: the two Home links (one destination) and the Edit link (another role).
  expect(report).toMatchObject({ controls: 8, ready: 3 })
})

test("radios, tabs and options need a name of their own only within their group", () => {
  page(`
    <fieldset><legend>Email me updates</legend><label><input type="radio" name="updates"> Yes</label><label><input type="radio" name="updates"> No</label></fieldset>
    <fieldset><legend>Share my data</legend><label><input type="radio" name="share"> Yes</label><label><input type="radio" name="share"> No</label></fieldset>
    <div role="tablist" aria-label="Plan"><button role="tab">Monthly</button><button role="tab">Yearly</button></div>
    <div role="tablist" aria-label="Seats"><button role="tab">Monthly</button><button role="tab">Yearly</button></div>
    <div role="radiogroup" aria-label="Size"><span role="radio" tabindex="0">Small</span><span role="radio" tabindex="-1">Small</span></div>`)
  const report = checkPageReadiness()
  expect(report.problems.map((problem) => problem.kind === "ambiguous" && [problem.role, problem.name, problem.count])).toEqual([["radio", "Small", 2]])
})

test("what looks clickable but isn't a control is reported; what sits in or holds a control isn't", () => {
  page(`
    <section><h2>Settings</h2>
      <div style="cursor: pointer">Open billing</div>
      <span onclick="next()">Next step</span>
      <div style="cursor: pointer"><a href="/card">A card with its own link</a></div>
      <label style="cursor: pointer"><input type="checkbox"> Remember me</label>
      <button style="cursor: pointer"><span style="cursor: pointer">Inside a button</span></button>
    </section>`)
  const report = checkPageReadiness()
  expect(report.problems.map((problem) => problem.kind === "unseen" && problem.control)).toEqual(['div "Open billing"', 'span "Next step"'])
  expect(report.problems[0]!.message).toContain('"Open billing" (in "Settings") looks clickable but isn\'t a button or link')
  // Controls: the link, the checkbox and the button, plus the two that only look clickable.
  expect(report).toMatchObject({ controls: 5, ready: 3, score: 60 })
})

// A grid's cells are what agents see there (a calendar's days, a data grid's cells), though a
// data grid's cells repeat each other's text, so they aren't scored as controls of their own.
test("an interactive grid's cells, rows and headers aren't reported as only looking clickable", () => {
  page(`
    <table role="grid" aria-label="November 2026">
      <tr role="row" style="cursor: pointer"><th role="columnheader" style="cursor: pointer">Mo</th></tr>
      <tr role="row"><td role="gridcell" tabindex="0" style="cursor: pointer">16</td><td role="gridcell" tabindex="-1" style="cursor: pointer">17</td></tr>
    </table>
    <table><tr><td style="cursor: pointer">A plain table's cell</td><td role="gridcell" style="cursor: pointer">Outside any grid</td></tr></table>`)
  const report = checkPageReadiness()
  expect(report.problems.map((problem) => problem.kind === "unseen" && problem.control)).toEqual(['td "A plain table\'s cell"', 'td "Outside any grid"'])
  expect(report).toMatchObject({ controls: 2, ready: 0 })
})

test("hidden, disabled and agent-hidden controls aren't counted", () => {
  page(`
    <button hidden>Hidden</button>
    <div aria-hidden="true"><button>Decoration</button></div>
    <div data-agent-hidden><button></button></div>
    <button disabled></button>
    <button aria-disabled="true"></button>
    <button>Save</button>`)
  expect(checkPageReadiness()).toMatchObject({ controls: 1, ready: 1, problems: [] })
})

test("a root limits the check; elements: true hands each problem its elements", () => {
  page(`<main id="app"><button>Edit</button><button>Edit</button></main><button></button>`)
  const report = checkPageReadiness("#app", { elements: true })
  expect(kinds()).toEqual(["unnamed", "ambiguous"])
  expect(report.problems).toHaveLength(1)
  expect(report.problems[0]!.elements).toEqual(Array.from(document.querySelectorAll("#app button")))
  expect(checkPageReadiness("#app").problems[0]!.elements).toBeUndefined()
  expect(checkPageReadiness("#missing")).toMatchObject({ controls: 0, score: 100 })
})

test("accepted problems count as fine; expectPageReady throws the report as text otherwise", () => {
  page(`<button>Save</button><button></button><div style="cursor: pointer">Legacy export</div>`)
  expect(checkPageReadiness()).toMatchObject({ controls: 3, ready: 1, score: 33 })
  expect(() => expectPageReady()).toThrow(
    "agent readiness 33/100 (1 of 3 controls an agent can find by name, read from the page: no UI SDK bridge)",
  )
  const accepted = expectPageReady(null, { ignore: (problem) => problem.kind === "unseen" || problem.kind === "unnamed" })
  expect(accepted).toMatchObject({ controls: 2, ready: 2, score: 100, problems: [] })
  expect(formatAgentReadiness(checkPageReadiness(), "Settings").split("\n")).toEqual([
    "Settings: agent readiness 33/100 (1 of 3 controls an agent can find by name, read from the page: no UI SDK bridge)",
    "  error unnamed: A button has no name, so an agent can't tell what it does. Give it visible text, a label, or aria-label.",
    '  error unseen: "Legacy export" looks clickable but isn\'t a button or link, so an agent reading the page doesn\'t see a control there. Use a <button> or <a href>, or give it role="button" and tabindex="0" with keyboard handling.',
  ])
})

test("the bookmarklet's bundle was built from the check as it is now", async () => {
  const { createHash } = await import("node:crypto")
  const { readFileSync } = await import("node:fs")
  const generated = readFileSync("src/site/generated/agent-check-bookmarklet.ts", "utf8")
  const sources = /^\/\/ Generated by scripts\/bookmarklet\.mjs from (.+)\. Don't edit it\.$/m.exec(generated)![1]!.split(", ")
  const hash = createHash("sha256")
  for (const file of sources) hash.update(readFileSync(file))
  expect(/^\/\/ sources: (\w+)$/m.exec(generated)![1], "the bookmarklet is stale: run node scripts/bookmarklet.mjs").toBe(hash.digest("hex").slice(0, 16))
})
