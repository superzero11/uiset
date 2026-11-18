import type { FileRule, Problem, RepoRule } from "../core.ts"

const ROADMAP = "docs/roadmap.md"
const HISTORY = "HISTORY.md"
const HISTORY_ENTRY = /^- (\d{4}-\d{2}-\d{2}) — /
const UPDATED = /^Updated (\d{4}-\d{2}-\d{2})\./m

const PLAN_NAME = /^(roadmap|plan|todo|backlog|ideas?|brainstorm(?:ing)?)([-_. ][^/]*)?\.(md|mdx|txt)$/i

export const singlePlan: RepoRule = {
  id: "plan/single-plan",
  why: "2026-11-18: plans had spread over an ideas list, a brainstorm, the public roadmap and a gap map. The plan is docs/roadmap.md; research goes in research/ (git-ignored).",
  checkRepo: (ctx) =>
    ctx.paths
      .filter((path) => path !== ROADMAP && PLAN_NAME.test(path.split("/").pop() ?? ""))
      .filter((path) => !/^(research|launch|public|node_modules)\//.test(path))
      .map((path) => ({
        path,
        line: 1,
        rule: "plan/single-plan",
        message: `A second plan. Plans go on ${ROADMAP}; research goes in research/ (git-ignored).`,
      })),
}

const REQUIRED = ["## Now", "## Next, in order", "## Later", "## Following UI SDK", "## Waiting on others"]

export const roadmapShape: FileRule = {
  id: "plan/roadmap-shape",
  why: "2026-11-18: the owner couldn't see from a 1,788-line ROADMAP.md what was happening or planned. The roadmap stays short, in fixed sections.",
  appliesTo: (path) => path === ROADMAP,
  check(text) {
    const out: { line: number; message: string }[] = []
    const lines = text.split("\n")
    if (lines.length > 120) out.push({ line: 121, message: `The roadmap is ${lines.length} lines; keep it under 120. Detail goes in research/ or HISTORY.md.` })
    if (!UPDATED.test(lines.slice(0, 6).join("\n"))) out.push({ line: 1, message: 'Say when it was updated near the top: "Updated YYYY-MM-DD."' })
    let last = -1
    for (const heading of REQUIRED) {
      const at = lines.findIndex((line) => line.trim() === heading)
      if (at < 0) out.push({ line: 1, message: `Missing the "${heading.slice(3)}" section.` })
      else if (at < last) out.push({ line: at + 1, message: `"${heading.slice(3)}" is out of order: ${REQUIRED.map((h) => h.slice(3)).join(", ")}.` })
      else last = at
    }
    // Each item: its first line and at most two more.
    lines.forEach((line, i) => {
      if (!/^(?:- |\d+\. )/.test(line)) return
      let n = 1
      while (lines[i + n] !== undefined && /^ {2,}\S/.test(lines[i + n]!)) n++
      if (n > 3) out.push({ line: i + 1, message: `This item is ${n} lines; keep items to three. Detail goes in research/ or HISTORY.md.` })
    })
    return out
  },
}

const newestDecision = (history: string) =>
  history
    .split("\n")
    .map((line) => HISTORY_ENTRY.exec(line)?.[1])
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1)

export const roadmapFresh: RepoRule = {
  id: "plan/roadmap-fresh",
  why: "2026-11-18: work landed while the plan still listed it. Whenever HISTORY.md records a decision, the roadmap is checked and re-dated.",
  checkRepo(ctx) {
    if (ctx.staged && !ctx.paths.includes(ROADMAP) && !ctx.paths.includes(HISTORY)) return []
    const roadmap = ctx.read(ROADMAP)
    const history = ctx.read(HISTORY)
    if (!roadmap || !history) return []
    const updated = UPDATED.exec(roadmap)?.[1]
    const newest = newestDecision(history)
    if (!updated || !newest || newest <= updated) return []
    const line = roadmap.split("\n").findIndex((l) => UPDATED.test(l)) + 1
    return [
      {
        path: ROADMAP,
        line: Math.max(line, 1),
        rule: "plan/roadmap-fresh",
        message: `HISTORY.md records a decision on ${newest}, after the roadmap's ${updated}. Check the roadmap still says what's true, then set its date.`,
      },
    ]
  },
}

export const landingRecorded: RepoRule = {
  id: "plan/landing-recorded",
  why: "2026-11-18: what shipped and why lives in HISTORY.md. A commit that adds a changelog entry adds its decision-log entry too.",
  checkRepo(ctx) {
    if (!ctx.staged) return []
    const shipped = ctx.added("CHANGELOG.md").some((line) => /^- \*\*/.test(line))
    if (!shipped) return []
    const recorded = ctx.added(HISTORY).some((line) => HISTORY_ENTRY.test(line))
    if (recorded) return []
    const problem: Problem = {
      path: "CHANGELOG.md",
      line: 1,
      rule: "plan/landing-recorded",
      message: "This commit adds a changelog entry; add its decision-log entry to HISTORY.md (what, why, how it was checked), and update docs/roadmap.md.",
    }
    return [problem]
  },
}
