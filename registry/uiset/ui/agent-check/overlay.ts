// The check's report drawn on the page it checked: a panel with the score and each problem,
// and an outline on a problem's elements when you choose it. Framework-free, in a shadow root
// so the page's styles don't reach it and neither check counts it. The uiset.dev bookmarklet
// is this, run on whatever page you're on.
import { checkAgentReadiness, type AgentBridge, type ReadinessSummary } from "./check"
import { checkPageReadiness } from "./page"

type Shown = ReadinessSummary & { problems: (ReadinessSummary["problems"][number] & { elements?: Element[] })[] }

const HOST = "uiset-agent-check"

const css = `
:host { all: initial; }
.panel {
  --bg: #ffffff; --fg: #18181b; --muted: #52525b; --line: #d4d4d8; --soft: #f4f4f5;
  --error: #b42318; --error-bg: #fef3f2; --warn: #8a4b08; --warn-bg: #fff7e6; --accent: #1d4ed8;
  position: fixed; top: 16px; right: 16px; z-index: 2147483647;
  box-sizing: border-box; width: min(400px, calc(100vw - 32px)); max-height: calc(100vh - 32px);
  display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden;
  border: 1px solid var(--line); border-radius: 12px; background: var(--bg); color: var(--fg);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.18);
  font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
}
@media (prefers-color-scheme: dark) {
  .panel {
    --bg: #18181b; --fg: #f4f4f5; --muted: #a1a1aa; --line: #3f3f46; --soft: #27272a;
    --error: #fda29b; --error-bg: #3a1714; --warn: #fdc77b; --warn-bg: #3a2a10; --accent: #93b4fd;
  }
}
.head { display: grid; gap: 4px; padding: 16px 16px 12px; border-bottom: 1px solid var(--line); }
.top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
h2 { margin: 0; font-size: 14px; font-weight: 600; }
.score { display: flex; align-items: baseline; gap: 4px; margin: 4px 0 0; color: var(--muted); }
.number { color: var(--fg); font-size: 32px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
p { margin: 0; }
.muted { color: var(--muted); font-size: 13px; }
.actions { display: flex; gap: 6px; }
button {
  font: inherit; font-size: 13px; color: var(--fg); background: var(--bg); cursor: pointer;
  border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px;
}
button:hover { background: var(--soft); }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
ul { list-style: none; margin: 0; padding: 8px; overflow: auto; display: grid; gap: 4px; }
.problem {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; align-items: start;
  width: 100%; text-align: start; border-color: transparent; padding: 8px; overflow-wrap: anywhere;
}
.problem[aria-pressed="true"] { border-color: var(--accent); }
.tag { border-radius: 999px; padding: 0 8px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.tag.error { color: var(--error); background: var(--error-bg); }
.tag.warning { color: var(--warn); background: var(--warn-bg); }
.empty { padding: 16px; }
.outline {
  position: fixed; z-index: 2147483646; pointer-events: none; box-sizing: border-box;
  border: 2px solid #e11d48; border-radius: 4px; box-shadow: 0 0 0 2px rgb(255 255 255 / 0.9);
}
`

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]) => {
  const el = document.createElement(tag)
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  el.append(...children)
  return el
}

/**
 * Checks the page you're on and shows the report over it: through the page's UI SDK bridge
 * when it has one (pass it, or it's found as `window.agent`), else by reading the page. A
 * second call replaces the panel. Escape or Close takes it away.
 */
async function showAgentReadiness(options: { agent?: AgentBridge; root?: ParentNode | string } = {}) {
  document.querySelector(HOST)?.remove()
  const bridge = options.agent ?? (window as unknown as { agent?: AgentBridge }).agent
  const report: Shown = bridge?.snapshot
    ? await checkAgentReadiness(bridge, { root: options.root })
    : checkPageReadiness(options.root, { elements: true })

  const host = h(HOST as "div", { "data-agent-hidden": "" })
  const shadow = host.attachShadow({ mode: "open" })
  const outlines = h("div")
  const errors = report.problems.filter((problem) => problem.severity === "error").length
  const heading = h("h2", { id: "title" }, "Agent readiness")
  const again = h("button", { type: "button" }, "Check again")
  const close = h("button", { type: "button" }, "Close")
  const list = h("ul", { "aria-label": "Problems" })
  const panel = h(
    "section",
    { class: "panel", role: "dialog", "aria-modal": "false", "aria-labelledby": "title" },
    h(
      "div",
      { class: "head" },
      h("div", { class: "top" }, heading, h("div", { class: "actions" }, again, close)),
      h("p", { class: "score" }, h("span", { class: "number" }, String(report.score)), "/100"),
      h("p", {}, `${report.ready} of ${report.controls} controls an agent can find by name. ${errors ? `${errors} ${errors === 1 ? "problem" : "problems"} to fix.` : "Nothing to fix."}`),
      h("p", { class: "muted" }, report.mode === "bridge" ? "Read through the page's UI SDK agent bridge." : "Read from the page's accessibility tree: no UI SDK bridge."),
    ),
    report.problems.length ? list : h("p", { class: "empty muted" }, "Every control has a name of its own."),
  )

  // Outlines follow their elements while the page scrolls or resizes.
  let shown: Element[] = []
  const draw = () => {
    outlines.replaceChildren(
      ...shown.map((el) => {
        const box = el.getBoundingClientRect()
        const outline = h("div", { class: "outline" })
        Object.assign(outline.style, { top: `${box.top - 3}px`, left: `${box.left - 3}px`, width: `${box.width + 6}px`, height: `${box.height + 6}px` })
        return outline
      }),
    )
  }
  for (const problem of report.problems) {
    const parts = [h("span", { class: `tag ${problem.severity}` }, problem.severity === "error" ? "Error" : "Warning"), h("span", {}, problem.message)]
    // Only a problem with elements on this page has something to show: the bridge's don't.
    if (!problem.elements?.length) {
      list.append(h("li", { class: "problem" }, ...parts))
      continue
    }
    const item = h("button", { type: "button", class: "problem", "aria-pressed": "false" }, ...parts)
    item.addEventListener("click", () => {
      const on = item.getAttribute("aria-pressed") !== "true"
      for (const other of Array.from(list.querySelectorAll("button.problem"))) other.setAttribute("aria-pressed", "false")
      item.setAttribute("aria-pressed", String(on))
      shown = on ? (problem.elements ?? []) : []
      shown[0]?.scrollIntoView({ block: "center", behavior: "auto" })
      draw()
    })
    list.append(h("li", {}, item))
  }

  const style = h("style")
  style.textContent = css
  shadow.append(style, outlines, panel)
  document.documentElement.append(host)

  const previous = document.activeElement as HTMLElement | null
  const remove = () => {
    host.remove()
    window.removeEventListener("scroll", draw, true)
    window.removeEventListener("resize", draw)
    document.removeEventListener("keydown", onKey, true)
    previous?.focus?.()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && document.querySelector(HOST) === host) remove()
  }
  window.addEventListener("scroll", draw, true)
  window.addEventListener("resize", draw)
  document.addEventListener("keydown", onKey, true)
  close.addEventListener("click", remove)
  again.addEventListener("click", () => {
    remove()
    void showAgentReadiness(options)
  })
  heading.tabIndex = -1
  heading.focus()
  return report
}

export { showAgentReadiness }
