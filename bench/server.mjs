// The benchmark harness: holds a browser page per run and serves the two tool sets over
// HTTP, logging every call and the characters it returns.
//
//   node bench/server.mjs            (needs the site's dev server on :5620)
//
// Browser tools (what a browser-using agent has, as Playwright's MCP server gives it): a page
// snapshot (the accessibility tree), click, fill, press and select by role and name. Each
// action returns the page's new snapshot, as Playwright's MCP tools do.
// Bridge tools (UI SDK's agent bridge on the same page): snapshot, act, query.

import { chromium } from "@playwright/test"
import { createServer } from "node:http"
import { mkdirSync, writeFileSync } from "node:fs"
import { tasks } from "./tasks.mjs"

const SITE = process.env.BENCH_SITE ?? "http://localhost:5620"
const PORT = Number(process.env.BENCH_PORT ?? 5697)

const browser = await chromium.launch(process.env.CI ? {} : { channel: "chrome" })
/** @type {Map<string, { page: import("@playwright/test").Page, task: any, approach: string, calls: { command: string, chars: number, at: number }[], openedAt: number }>} */
const runs = new Map()

const browserTools = new Set(["snapshot", "click", "fill", "press", "select", "check-box"])
const bridgeTools = new Set(["snapshot", "act", "query"])

async function ariaSnapshot(page) {
  await page.waitForTimeout(150)
  return page.locator("body").ariaSnapshot()
}

async function handle(runId, command, body) {
  if (command === "open") {
    const task = tasks.find((t) => t.id === body.task)
    if (!task) throw new Error(`No task ${body.task}`)
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(`${SITE}${task.screen}`, { waitUntil: "networkidle" })
    runs.set(runId, { page, task, approach: body.approach, calls: [], openedAt: Date.now() })
    return `Opened ${task.name}.`
  }
  const run = runs.get(runId)
  if (!run) throw new Error(`No run ${runId}; open it first.`)
  if (command === "result") {
    const result = await run.page.evaluate(`(${run.task.check.toString()})()`)
    const chars = run.calls.reduce((n, c) => n + c.chars, 0)
    const last = run.calls.at(-1)?.at ?? run.openedAt
    const first = run.calls[0]?.at ?? run.openedAt
    const summary = { run: runId, task: run.task.id, approach: run.approach, ok: result.ok, detail: result.detail, toolCalls: run.calls.length, textRead: chars, seconds: (last - first) / 1000 }
    mkdirSync("bench/results/raw", { recursive: true })
    writeFileSync(`bench/results/raw/${runId}.json`, `${JSON.stringify({ ...summary, calls: run.calls }, null, 2)}\n`)
    await run.page.close()
    runs.delete(runId)
    return JSON.stringify(summary)
  }
  const allowed = run.approach === "browser" ? browserTools : bridgeTools
  if (!allowed.has(command)) throw new Error(`"${command}" isn't one of this run's tools: ${[...allowed].join(", ")}.`)
  const page = run.page
  let out
  if (run.approach === "browser") {
    const target = () => page.getByRole(body.role, { name: body.name, exact: body.exact ?? true }).first()
    if (command === "snapshot") out = await ariaSnapshot(page)
    else {
      if (command === "click") await target().click({ timeout: 4000 })
      else if (command === "fill") await target().fill(String(body.text ?? ""), { timeout: 4000 })
      else if (command === "press") await page.keyboard.press(String(body.key))
      else if (command === "select") await target().selectOption(String(body.value), { timeout: 4000 })
      else if (command === "check-box") await target().check({ timeout: 4000 })
      out = await ariaSnapshot(page)
    }
  } else {
    if (command === "snapshot") out = JSON.stringify(await page.evaluate(() => window.agent.snapshot()))
    else if (command === "act") out = JSON.stringify(await page.evaluate((input) => window.agent.act(input), body))
    else if (command === "query") out = JSON.stringify(await page.evaluate((input) => window.agent.query(input), body))
  }
  run.calls.push({ command, chars: out.length, at: Date.now() })
  return out
}

createServer(async (req, res) => {
  const [, runId, command] = (req.url ?? "").split("/")
  let raw = ""
  for await (const chunk of req) raw += chunk
  try {
    const out = await handle(runId, command, raw ? JSON.parse(raw) : {})
    res.writeHead(200, { "content-type": "text/plain" }).end(out)
  } catch (error) {
    // A failed call still costs the agent a call and the text of the error.
    const run = runs.get(runId)
    const message = `Error: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`
    if (run && command !== "result") run.calls.push({ command, chars: message.length, at: Date.now(), error: true })
    res.writeHead(200, { "content-type": "text/plain" }).end(message)
  }
}).listen(PORT, () => console.log(`bench harness on :${PORT}, site ${SITE}`))
