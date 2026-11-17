// The check on a real page, from a Playwright test or the command line. On a UI SDK page it
// reaches the page's own agent bridge as the browser's agent would: through the tools the page
// registers with WebMCP (`registerTools`), or through a global you name, like `window.agent`.
// On any other page it reads the page itself (`checkPageReadiness`).
import { checkAgentReadiness, findUnseenControls, slotNames, type AgentBridge, type AgentReadinessProblem, type AgentReadinessReport, type CheckOptions } from "./check"
import { checkPageReadiness, type PageReadinessProblem, type PageReadinessReport } from "./page"

/** What the check needs of a Playwright `Page`. */
type PageLike = {
  // Playwright's own signatures are generic; `any` lets a Page be passed as it is.
  evaluate(fn: (arg: any) => unknown, arg?: any): Promise<any>
  addInitScript(fn: () => void): Promise<unknown>
  waitForFunction(fn: (arg: any) => unknown, arg?: any, options?: { timeout?: number }): Promise<unknown>
}

type PageCheckOptions = Omit<CheckOptions, "scan" | "root" | "ignore"> & {
  /**
   * `"bridge"` asks the page's UI SDK agent bridge, `"page"` reads the page itself, and
   * `"auto"` (the default) asks the bridge when the page has one.
   */
  mode?: "auto" | "bridge" | "page"
  /** The global the page keeps its bridge in, like `"agent"`. Without it: the tools the page registered (see `captureAgentTools`), then `window.agent`. */
  agent?: string
  /** A CSS selector to look in. The whole page by default; the bridge always lists the whole page. */
  root?: string
  /** Leaves out problems you've decided to accept, and counts them as fine. */
  ignore?: (problem: AgentReadinessProblem | PageReadinessProblem) => boolean
}

/** Problems you've accepted, taken out of a page report with the score worked out again, as in the page. */
function ignorePageProblems(report: PageReadinessReport, ignore?: (problem: PageReadinessProblem) => boolean): PageReadinessReport {
  if (!ignore) return report
  let { controls, ready } = report
  const problems = report.problems.filter((problem) => {
    if (!ignore(problem)) return true
    if (problem.kind === "unseen") controls -= 1
    else ready += problem.kind === "ambiguous" ? problem.count : 1
    return false
  })
  return { ...report, controls, ready, problems, score: controls ? Math.floor((100 * ready) / controls) : 100 }
}

/**
 * Before the page loads: keeps the tools the page registers with the browser's agent
 * (`document.modelContext.registerTool`, which UI SDK's `registerTools` calls), so the check
 * can call them as that agent would. A browser's own WebMCP still gets them.
 */
async function captureAgentTools(page: PageLike) {
  await page.addInitScript(() => {
    const tools: Record<string, unknown> = {}
    const own = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: unknown) => unknown } }).modelContext
    Object.assign(window, { __uisetAgentTools: tools })
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(tool: { name: string }, options?: { signal?: AbortSignal }) {
          tools[tool.name] = tool
          options?.signal?.addEventListener("abort", () => {
            if (tools[tool.name] === tool) delete tools[tool.name]
          })
          return own?.registerTool ? own.registerTool.call(own, tool, options) : Promise.resolve()
        },
      },
    })
  })
}

/** Waits until the page has a bridge the check can reach: registered tools, or the global named. */
async function waitForAgent(page: PageLike, options: { agent?: string; timeout?: number } = {}) {
  const timeout = options.timeout ?? 15_000
  await page.waitForFunction(
    (global: string | null) => {
      const w = window as unknown as Record<string, { snapshot?: unknown } | undefined>
      if (global) return !!w[global]?.snapshot
      return !!(w.__uisetAgentTools as Record<string, unknown> | undefined)?.snapshot || !!w.agent?.snapshot
    },
    options.agent ?? null,
    { timeout },
  ).catch(() => {
    throw new Error(
      options.agent
        ? `No agent bridge at window.${options.agent} after ${timeout / 1000}s.`
        : `No agent bridge after ${timeout / 1000}s: the app calls neither registerTools(agent, …) nor sets window.agent. Name its global with --agent.`,
    )
  })
}

/**
 * Checks the page: through its UI SDK bridge when it has one, else by reading the page. Call
 * `captureAgentTools(page)` before `goto` when the app registers its bridge with WebMCP, or pass
 * `agent` with the global it keeps it in.
 */
function checkPage(page: PageLike, options: PageCheckOptions & { mode: "bridge" }): Promise<AgentReadinessReport>
function checkPage(page: PageLike, options: PageCheckOptions & { mode: "page" }): Promise<PageReadinessReport>
function checkPage(page: PageLike, options?: PageCheckOptions): Promise<AgentReadinessReport | PageReadinessReport>
async function checkPage(page: PageLike, options: PageCheckOptions = {}): Promise<AgentReadinessReport | PageReadinessReport> {
  const global = options.agent ?? null
  // Functions sent into the page are compiled by your test runner, and some (tsx, with
  // esbuild's keepNames) wrap their helpers in a `__name` call the page doesn't have.
  await page.evaluate(() => {
    const w = globalThis as unknown as { __name?: unknown }
    w.__name ??= (fn: unknown) => fn
  })
  const mode = options.mode ?? "auto"
  const hasBridge =
    mode !== "page" &&
    ((await page.evaluate((name: string | null) => {
      const w = window as unknown as Record<string, any>
      return name ? !!w[name]?.snapshot : !!w.__uisetAgentTools?.snapshot || !!w.agent?.snapshot
    }, global)) as boolean)
  if (mode === "bridge" && !hasBridge) {
    throw new Error("No agent bridge on the page: call registerTools(agent, …) in the app and captureAgentTools(page) before goto, or name its global with { agent }.")
  }
  if (!hasBridge) {
    const report = (await page.evaluate(checkPageReadiness, options.root ?? null)) as PageReadinessReport
    return ignorePageProblems(report, options.ignore)
  }
  // Each call resolves the bridge in the page on its own: functions sent to it can't share
  // anything with this module.
  const bridge: AgentBridge = {
    snapshot: () =>
      page.evaluate((name: string | null) => {
        const w = window as unknown as Record<string, any>
        const tools = w.__uisetAgentTools
        if (name) return w[name].snapshot()
        if (tools?.snapshot) return tools.snapshot.execute({})
        if (w.agent?.snapshot) return w.agent.snapshot()
        throw new Error("No agent bridge on the page: call registerTools(agent, …) in the app and captureAgentTools(page) before goto, or name its global with { agent }.")
      }, global),
    query: (input) =>
      page.evaluate(
        ([name, query]: [string | null, { text?: string; kind?: string }]) => {
          const w = window as unknown as Record<string, any>
          const tools = w.__uisetAgentTools
          if (name) return w[name].query(query)
          if (tools?.query) return tools.query.execute(query)
          return w.agent.query(query)
        },
        [global, input],
      ),
  }
  return checkAgentReadiness(bridge, {
    ignore: options.ignore,
    scan: {
      unseen: () => page.evaluate(findUnseenControls, options.root ?? null),
      slots: () => page.evaluate(slotNames, options.root ?? null),
    },
  })
}

export { captureAgentTools, checkPage, ignorePageProblems, waitForAgent }
export type { PageCheckOptions, PageLike }
