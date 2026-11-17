// Checks pages for agent readiness from the command line, in Chromium through Playwright:
//
//   npx tsx components/ui/agent-check/cli.ts http://localhost:3000 /settings /billing
//
// Paths after the first URL are read against it. On a UI SDK page the check reaches the bridge
// through the tools the app registers for the browser's agent (`registerTools`), or a global
// named with --agent; on any other page it reads the page itself (--mode page forces that,
// --mode bridge requires a bridge). Exits 1 when a page scores under --min-score (100 by
// default). --channel chrome uses installed Chrome instead of Playwright's own Chromium.
import { chromium } from "@playwright/test"
import { formatAgentReadiness, type AgentReadinessReport } from "./check"
import type { PageReadinessReport } from "./page"
import { captureAgentTools, checkPage, waitForAgent } from "./playwright"

// Typed here rather than from @types/node: the file sits in an app's components, which are
// checked with the browser's types.
const { argv, exit } = (globalThis as unknown as { process: { argv: string[]; exit(code: number): never } }).process

const usage = `Usage: agent-check <url> [more urls or paths] [--mode auto|bridge|page] [--min-score 100] [--agent <global>] [--root <selector>] [--channel chrome] [--json]`

function parse(argv: string[]) {
  const urls: string[] = []
  const options = {
    mode: "auto" as "auto" | "bridge" | "page",
    minScore: 100,
    agent: undefined as string | undefined,
    root: undefined as string | undefined,
    channel: undefined as string | undefined,
    json: false,
  }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]!
    if (arg === "--min-score") options.minScore = Number(argv[++index])
    else if (arg === "--mode") options.mode = argv[++index] as typeof options.mode
    else if (arg === "--agent") options.agent = argv[++index]
    else if (arg === "--root") options.root = argv[++index]
    else if (arg === "--channel") options.channel = argv[++index]
    else if (arg === "--json") options.json = true
    else if (arg === "--help" || arg === "-h") return null
    else urls.push(urls.length ? new URL(arg, urls[0]).href : arg)
  }
  if (!urls.length || Number.isNaN(options.minScore) || !["auto", "bridge", "page"].includes(options.mode)) return null
  return { urls, ...options }
}

async function main() {
  const args = parse(argv.slice(2))
  if (!args) {
    console.error(usage)
    return exit(2)
  }
  const browser = await chromium.launch({ channel: args.channel }).catch((error: Error) => {
    console.error(`${error.message.split("\n")[0]}\nInstall Playwright's Chromium (npx playwright install chromium), or pass --channel chrome to use installed Chrome.`)
    return exit(2)
  })
  const results: { url: string; report?: AgentReadinessReport | PageReadinessReport; error?: string }[] = []
  try {
    for (const url of args.urls) {
      const page = await browser.newPage()
      try {
        await captureAgentTools(page)
        await page.goto(url, { waitUntil: "load" })
        // A bridge is required with --mode bridge or a named --agent, and looked for briefly
        // otherwise: most sites have none, and the page itself is read instead.
        const required = args.mode === "bridge" || !!args.agent
        if (args.mode !== "page") {
          await waitForAgent(page, { agent: args.agent, timeout: required ? 15_000 : 4_000 }).catch((error: Error) => {
            if (required) throw error
          })
        }
        // Components join the bridge, and pages draw, as they mount: let the first frames settle.
        await page.waitForTimeout(500)
        results.push({ url, report: await checkPage(page, { mode: args.mode, agent: args.agent, root: args.root }) })
      } catch (error) {
        results.push({ url, error: error instanceof Error ? error.message.split("\n")[0] : String(error) })
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
  if (args.json) console.log(JSON.stringify(results, null, 2))
  else for (const { url, report, error } of results) console.log(report ? formatAgentReadiness(report, url) : `${url}: couldn't check: ${error}`, "\n")
  const failed = results.filter(({ report }) => !report || report.score < args.minScore)
  if (failed.length) {
    console.error(`${failed.length} of ${results.length} pages under ${args.minScore}.`)
    exit(1)
  }
}

void main()
