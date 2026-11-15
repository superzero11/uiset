// Turns the benchmark's raw runs into the published numbers.
//
//   node bench/summarize.mjs
//
// Reads bench/results/raw/<run>.json (what the harness measured: tool calls, characters
// read, time between the first and last tool call, whether the page passed the task's check)
// and bench/results/agents.json (each run's tokens and wall time, as Claude Code reported
// them for the agent that did it). Writes bench/results/summary.json and
// src/site/benchmark-results.ts, which the site shows.

import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tasks } from "./tasks.mjs"

const MODEL = "Claude Sonnet 5.5"
const raw = readdirSync("bench/results/raw")
  .filter((f) => f.endsWith(".json") && !f.startsWith("dry"))
  .map((f) => JSON.parse(readFileSync(`bench/results/raw/${f}`, "utf8")))
const agents = JSON.parse(readFileSync("bench/results/agents.json", "utf8"))
const usage = new Map(Object.values(agents).map((a) => [a.run, a]))

const median = (values) => {
  const v = [...values].sort((a, b) => a - b)
  if (!v.length) return 0
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

const out = []
for (const task of tasks) {
  const runs = raw.filter((r) => r.task === task.id)
  if (!runs.length) continue
  const entry = { id: task.id, name: task.name, prompt: task.prompt, runs: [], median: {}, completed: {} }
  for (const approach of ["browser", "bridge"]) {
    const mine = runs.filter((r) => r.approach === approach)
    for (const r of mine) {
      const u = usage.get(r.run) ?? {}
      entry.runs.push({ approach, ok: r.ok, metrics: { toolCalls: r.toolCalls, textRead: r.textRead, seconds: u.seconds ?? r.seconds, tokens: u.tokens ?? 0 } })
    }
    const metrics = entry.runs.filter((r) => r.approach === approach).map((r) => r.metrics)
    entry.median[approach] = {
      toolCalls: median(metrics.map((m) => m.toolCalls)),
      textRead: median(metrics.map((m) => m.textRead)),
      seconds: median(metrics.map((m) => m.seconds)),
      tokens: median(metrics.map((m) => m.tokens)),
    }
    entry.completed[approach] = `${mine.filter((r) => r.ok).length} of ${mine.length}`
  }
  out.push(entry)
}

// The headline: each measure's change, as the median across tasks of each task's change.
const change = (key) => median(out.map((t) => (t.median.bridge[key] - t.median.browser[key]) / t.median.browser[key]))
const pct = (x) => `${x < 0 ? "\u2212" : x > 0 ? "+" : ""}${Math.abs(Math.round(x * 100))}%`
// Tokens aren't in the headline: each agent's count includes Claude Code's own instructions
// and tool definitions (about 67,000 tokens, the same for both approaches), so it shows the
// page's share only faintly. The per-task tables still show them.
const summary = [
  { label: "Tool calls", value: pct(change("toolCalls")) },
  { label: "Text read", value: pct(change("textRead")) },
  { label: "Time", value: pct(change("seconds")) },
]
const date = new Date().toISOString().slice(0, 10)
const runsPerCell = Math.max(...out.flatMap((t) => ["browser", "bridge"].map((a) => t.runs.filter((r) => r.approach === a).length)))
const fewer = (key) => Math.abs(Math.round(change(key) * 100))
const allOk = out.every((t) => t.runs.every((r) => r.ok))
const headline = `Across ${out.length} tasks on UISet's kits, agents using the bridge made ${fewer("toolCalls")}% fewer tool calls, read ${fewer("textRead")}% less text and finished ${fewer("seconds")}% sooner than agents using browser tools${allOk ? ", and every run of both finished its task" : ""} (medians of ${runsPerCell} runs each).`

const result = { date, model: MODEL, headline, summary, tasks: out }
writeFileSync("bench/results/summary.json", `${JSON.stringify(result, null, 2)}\n`)
writeFileSync(
  "src/site/benchmark-results.ts",
  `// The agent benchmark's published results, written by bench/summarize.mjs from the raw runs
// in bench/results/. Don't edit by hand: rerun the benchmark (bench/README.md).

type Metrics = { toolCalls: number; textRead: number; seconds: number; tokens: number }
type Approach = "browser" | "bridge"
type BenchmarkTask = {
  id: string
  name: string
  prompt: string
  runs: { approach: Approach; ok: boolean; metrics: Metrics }[]
  median: Record<Approach, Metrics>
  completed: Record<Approach, string>
}
type Benchmark = {
  date: string
  model: string
  headline: string
  summary: { label: string; value: string }[]
  tasks: BenchmarkTask[]
}

const benchmark: Benchmark | null = ${JSON.stringify(result, null, 2)}

export { benchmark }
export type { Benchmark, BenchmarkTask, Metrics }
`,
)
console.log(headline)
for (const t of out) console.log(t.name, JSON.stringify(t.median), t.completed)
